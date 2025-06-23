import { ABTests } from "../../../models/abtests.js";
import { PWplayers } from "../../../models/PWplayers.js";

export class ABTestService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async initialize() {
    if (this.initialized) return;

    this.utilityService = this.moduleContainer.get("utility");
    this.metricsService = this.moduleContainer.get("metrics");
    this.segmentService = this.moduleContainer.get("segment");
    
    this.initialized = true;
    console.log("ABTestService initialized");
  }

  async getOngoingABTests(gameID, branchName) {
    try {
      const abTests = await ABTests.find({
        gameID: gameID,
        branch: this.utilityService.getBranchWithReferenceSuffix(branchName),
      }).lean();

      if (!abTests) {
        this.utilityService.log("ABTests not found or branch does not exist");
        return {
          success: false,
          message: "ABTests not found or branch does not exist",
        };
      }

      let result = abTests;

      if (!result) {
        return {
          success: false,
          message: "Branch not found or no tests available",
        };
      }

      result = result
        .filter(
          (t) => t.paused == false && t.archived == false && t.startDate !== ""
        )
        .filter(Boolean);

      return { success: true, abTests: result };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal Server Error" };
    }
  }
  async tryToAddPlayerToTest(gameID, branch, environment, playerObj, testObj) {
    // Returns either null or an object with testID and groupType ("test" or "control")
    try {
      // Continue only if player does not participate in this test yet
      if (
        !playerObj.abtests ||
        !playerObj.abtests.some((t) => t.testID === testObj.id)
      ) {
        let testSegments = testObj.segments;
        // Continue only if player has the segment to be tested
        if (playerObj.segments.includes(testSegments.test)) {
          // Generate a random number between 0 and 1 (inclusive)
          let rand = parseFloat(
            this.utilityService.randomNumberInRange(0, 1, true, 1)
          );
          let groupType = "control";
          // If random value falls within the test share, assign to test group
          if (rand >= 0 && rand <= testSegments.testShare) {
            groupType = "test";
            // Update test counter for players in the test group
            await ABTests.updateOne(
              {
                gameID: gameID,
                branch: this.utilityService.getBranchWithWorkingSuffix(branch),
              },
              {
                $inc: {
                  sampleSize: 1,
                },
              }
            );
            // Add player to the test segment
            this.segmentService.addPlayerToSegment(
              gameID,
              branch,
              environment,
              `abtest_${testObj.id}`,
              playerObj.clientID,
              false,
              true
            );
            // Update player doc accordingly
            await PWplayers.updateOne(
              {
                gameID: gameID,
                clientID: playerObj.clientID,
                environment: environment,
              },
              {
                $push: {
                  abtests: { testID: testObj.id, groupType: groupType },
                },
              }
            );
          }
          return { testID: testObj.id, groupType };
        }
      }
      return null;
    } catch (error) {
      console.error(error);
    }
  }

  async clearNonExistingTestsFromPlayer(
    gameID,
    environment,
    playerObj,
    testIDs
  ) {
    // Returns cleaned test list
    try {
      let modifiedTestsList = playerObj.abtests.filter((t) =>
        testIDs.includes(t.testID)
      );

      // Update player doc accordingly
      await PWplayers.updateOne(
        {
          gameID: gameID,
          clientID: playerObj.clientID,
          environment: environment,
        },
        {
          $set: {
            abtests: modifiedTestsList,
          },
        }
      );

      return modifiedTestsList;
    } catch (error) {
      console.error(error);
    }
  }
}
