import { ABTests } from "../../../models/abtests.js";

export class ABTestService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async updateABTest(gameID, branch, testObject, clientUID) {
    try {
      // Get current version of this test to determine if it was started now.
      // If the test is started now, create new segment for it's participants
      if (Boolean(testObject.startDate)) {
        const currentTest = await ABTests.findOne({
          gameID: gameID,
          branch: branch,
          id: testObject.id,
        }).lean();

        if (!currentTest || !currentTest.startDate) {
          const segmentsService = this.moduleContainer.get("segments");

          await segmentsService.internalCreateSegment(
            gameID,
            branch,
            `abtest_${testObject.id}`,
            `abtest_${testObject.id}`,
            "Automatically created segment which contains all players from the test group participating in specified A/B test."
          );
        }
      }

      // Update
      let formattedTestObject = { ...testObject };
      // Check if subject is an array and has at least one item
      if (
        formattedTestObject.subject &&
        Array.isArray(formattedTestObject.subject) &&
        formattedTestObject.subject.length > 0
      ) {
        formattedTestObject.subject = await Promise.all(
          formattedTestObject.subject.map(async (s) => {
            if (s.type === "offer" && s.changedFields?.icon !== undefined) {
              const utilityService = this.moduleContainer.get("utility");

              s.changedFields.icon =
                await utilityService.uploadFileToStudioCloud(
                  gameID,
                  s.changedFields.icon
                );
            }
            return s;
          })
        );
      }

      await ABTests.updateOne(
        {
          gameID: gameID,
          branch: branch,
          id: testObject.id,
        },
        { $set: formattedTestObject }
      );
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "abtests",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed AB test | SUBJECT: ${testObject.id}`
      );

      return { success: true };
    } catch (error) {
      console.log(error);
      throw new Error("Internal Server Error");
    }
  }

  async removeABTest(
    gameID,
    branch,
    testObject,
    archive,
    archiveResult,
    shouldRollout,
    clientUID
  ) {
    try {
      if (archive) {
        const studioID = await getStudioIDByGameID(getDemoGameID(gameID));

        let formattedTestObject = JSON.parse(JSON.stringify(testObject));

        formattedTestObject.observedMetric = await Promise.all(
          formattedTestObject.observedMetric.map(async (m) => {
            let lastData = await getABTestData(
              getDemoGameID(gameID),
              testObject.id,
              studioID,
              branch,
              m.metric
            );
            if (lastData && lastData.length > 0) {
              lastData = JSON.stringify(lastData);
            } else {
              lastData = JSON.stringify([]);
            }
            m.archivedData = lastData;
            return m;
          })
        );
        formattedTestObject.archived = true;
        formattedTestObject.archivedResult = archiveResult;
        formattedTestObject.codename = "";
        formattedTestObject.removed = false;

        await ABTests.findOneAndUpdate(
          {
            gameID: gameID,
            branch: branch,
            id: testObject.id,
          },
          formattedTestObject,
          { new: true }
        );
      } else {
        await ABTests.findOneAndUpdate(
          {
            gameID: gameID,
            branch: branch,
            id: testObject.id,
          },
          { removed: true },
          { new: true }
        );
      }

      // Clear corresponding segment
      try {
        removeSegmentByID(gameID, branch, `abtest_${testObject.id}`);
      } catch (err) {
        console.error("Error removing segment by ID:", err);
      }

      if (
        testObject.subject &&
        Array.isArray(testObject.subject) &&
        testObject.subject.length > 0
      ) {
        if (shouldRollout) {
          await Promise.all(
            testObject.subject.map(async (sub) => {
              switch (sub.type) {
                // If tested item was entity, apply changed value to "everyone" segment
                case "entity":
                  await applySegmentValueToEveryoneInEntityConfig(
                    gameID,
                    branch,
                    sub.itemID,
                    `abtest_${testObject.id}`,
                    clientUID
                  );
                  break;
                // If tested item was offer, replace it's values with ones that were changed
                case "offer":
                  await Promise.all(
                    Object.entries(sub.changedFields).map(
                      async ([key, value]) => {
                        switch (key) {
                          case "icon":
                            await updateCertainOfferField(
                              gameID,
                              branch,
                              sub.itemID,
                              "offerIcon",
                              value
                            );
                            break;
                          case "price":
                            await updateCertainOfferField(
                              gameID,
                              branch,
                              sub.itemID,
                              "offerPrice",
                              value
                            );
                            break;
                          case "content":
                            await updateCertainOfferField(
                              gameID,
                              branch,
                              sub.itemID,
                              "content",
                              value
                            );
                            break;
                          default:
                            break;
                        }
                      }
                    )
                  );
                  break;
              }
            })
          );
        } else {
          await Promise.all(
            testObject.subject.map(async (sub) => {
              switch (sub.type) {
                // If tested item was entity, clear abtest values from its config
                case "entity":
                  await clearSegmentValuesInEntityConfig(
                    gameID,
                    branch,
                    sub.itemID,
                    `abtest_${testObject.id}`,
                    clientUID
                  );
                  break;
                // If tested item was offer, don't do anything
                case "offer":
                  break;
                default:
                  break;
              }
            })
          );
        }
      }
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "abtests",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: removed AB test | SUBJECT: ${testObject.id}`
      );

      return { success: true };
    } catch (error) {
      console.log(error);
      return { success: false, message: "Internal Server Error" };
    }
  }

  async createABTest(gameID, branch, testObject, clientUID) {
    try {
      // Ensure testObject has both gameID and branch fields
      const newTest = {
        ...testObject,
        gameID: gameID,
        branch: branch,
      };

      await ABTests.create(newTest);
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "abtests",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: created AB test | SUBJECT: ${testObject.id}`
      );

      return { success: true };
    } catch (error) {
      console.log(error);
      return { success: false, message: "Internal Server Error" };
    }
  }

  async getABTests(gameID, branch) {
    try {
      const abTests = await ABTests.find({
        gameID: gameID,
        branch: branch,
        removed: { $ne: true },
      }).lean();

      if (!abTests || abTests.length === 0) {
        console.log("ABTests not found for this branch");
        return {
          success: true,
          message: "ABTests not found for this branch",
          abTests: [],
        };
      }

      return { success: true, abTests: abTests };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal Server Error" };
    }
  }

  async getABTestsShort(gameID, branch) {
    //
    // Used to get only the tests IDs and names
    //
    try {
      const abTests = await ABTests.find(
        {
          gameID: gameID,
          branch: branch,
          removed: { $ne: true },
        },
        { id: 1, name: 1, codename: 1, _id: 0 }
      ).lean();

      if (!abTests || abTests.length === 0) {
        return {
          success: false,
          message: "ABTests not found for this branch",
          abTests: [],
        };
      }

      return { success: true, abTests: abTests };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal Server Error" };
    }
  }
}
export default ABTestService;
