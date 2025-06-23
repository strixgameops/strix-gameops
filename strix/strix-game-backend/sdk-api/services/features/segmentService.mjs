import { Segments } from "../../../models/segmentsModel.js";
import { PWplayers } from "../../../models/PWplayers.js";

export class SegmentService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async initialize() {
    if (this.initialized) return;

    this.utilityService = this.moduleContainer.get("utility");
    this.metricsService = this.moduleContainer.get("metrics");
    this.fcmService = this.moduleContainer.getOptionalService("fcm");
    this.cacherService = this.moduleContainer.get("cacher");
    this.warehouseService = this.moduleContainer.get("warehouse");
    this.queueService = this.moduleContainer.get("queue");
    
    this.initialized = true;
    console.log("SegmentService initialized");
  }
  async getAllSegments(gameID, branch) {
    try {
      const segments = await Segments.find({
        gameID: gameID,
        branch: this.utilityService.getBranchWithReferenceSuffix(branch),
      }).lean();
      if (!segments) {
        return [];
      } else {
        return segments;
      }
    } catch (err) {
      console.error("Error getting all segments:", err, gameID, branch);
    }
  }
  async incrementSegmentPlayerCount(
    gameID,
    branch,
    segmentID,
    incrementNumber = 1
  ) {
    // Should only be used to increment "everyone" segment manually. Other increments should occur as player is added to segment
    try {
      await Segments.updateOne(
        {
          gameID: gameID,
          branch: this.utilityService.getBranchWithWorkingSuffix(branch),
          segmentID: segmentID,
        },
        {
          $inc: {
            segmentPlayerCount: incrementNumber,
          },
        }
      );
    } catch (err) {
      console.error("Error incrementing segment player count:", err);
    }
  }

  async addPlayerToSegment(
    gameID,
    branch,
    environment,
    segmentID,
    clientID,
    skipWarehouse = false,
    skipFCMnotify = false
  ) {
    try {
      const hasSegment = await PWplayers.exists({
        gameID: gameID,
        environment: environment,
        clientID: clientID,
        segments: segmentID,
      });
      if (hasSegment) {
        return;
      }

      const res1 = await Segments.updateOne(
        {
          gameID: gameID,
          branch: this.utilityService.getBranchWithWorkingSuffix(branch),
          segmentID: segmentID,
        },
        {
          $inc: {
            segmentPlayerCount: 1,
          },
        }
      );

      if (skipWarehouse === false) {
        const result = await PWplayers.findOneAndUpdate(
          {
            gameID: gameID,
            environment: environment,
            clientID: clientID,
          },
          {
            $addToSet: {
              segments: segmentID,
            },
          },
          {
            new: true,
            fields: { segments: 1 },
          }
        );
        this.notifyAnalyticsAboutSegmentChange(
          gameID,
          branch,
          environment,
          clientID,
          result.segments
        );
      }

      if (skipFCMnotify === false) {
        this.fcmService?.notifySegmentChanged(
          gameID,
          branch,
          environment,
          clientID,
          segmentID,
          "onEnter"
        );
      }
    } catch (err) {
      console.error("Error adding player to segment:", err);
    }
  }
  async removePlayerFromSegment(
    gameID,
    branch,
    environment,
    segmentID,
    clientID,
    skipFCMnotify = false
  ) {
    try {
      const hasSegment = await PWplayers.exists({
        gameID: gameID,
        environment: environment,
        clientID: clientID,
        segments: segmentID,
      });
      if (!hasSegment) {
        return;
      }

      await Segments.updateOne(
        {
          gameID: gameID,
          branch: this.utilityService.getBranchWithWorkingSuffix(branch),
          segmentID: segmentID,
        },
        {
          $inc: {
            segmentPlayerCount: -1,
          },
        }
      );
      const result = await PWplayers.findOneAndUpdate(
        {
          gameID: gameID,
          environment: environment,
          clientID: clientID,
        },
        {
          $pull: {
            segments: segmentID,
          },
        },
        {
          new: true,
          fields: { segments: 1 },
        }
      );
      if (skipFCMnotify === false) {
        this.fcmService?.notifySegmentChanged(
          gameID,
          branch,
          environment,
          clientID,
          segmentID,
          "onExit"
        );
      }

      this.notifyAnalyticsAboutSegmentChange(
        gameID,
        branch,
        environment,
        clientID,
        result.segments
      );
    } catch (err) {
      console.error("Error removing player from segment:", err);
    }
  }

  // Here we calculate all conditions and return true or false if player should be in a given segment
  calculatePlayerSegment(playerObject, segment) {
    let segmentConditions = segment.segmentConditions;

    function recursivelyRemoveEmptyConditions(condition) {
      if (condition.conditions && condition.conditions.length > 0) {
        // Process conditions in reverse order to avoid index shifting issues when removing elements
        for (let i = condition.conditions.length - 1; i >= 0; i--) {
          const condi = condition.conditions[i];

          // If there are nested conditions, check if they are empty
          if (condi.conditions) {
            // If nested conditions exist, recursively process them
            recursivelyRemoveEmptyConditions(condi);

            // Remove the element if its nested conditions are empty
            if (condi.conditions.length === 0) {
              // Remove the current element and an adjacent one
              if (i === 0 && condition.conditions.length > 1) {
                // If it's the first element, remove it and the next one
                condition.conditions.splice(i + 1, 1); // Remove the next element
              } else if (
                i === condition.conditions.length - 1 &&
                condition.conditions.length > 1
              ) {
                // If it's the last element, remove it and the previous one
                condition.conditions.splice(i - 1, 1); // Remove the previous element
              } else if (i > 0 && i < condition.conditions.length - 1) {
                // If the element is neither the first nor the last, remove one element before it
                condition.conditions.splice(i - 1, 1); // Remove the previous element
              }
              // Remove the current element
              condition.conditions.splice(i, 1);
            }
          }
        }
      }

      return condition;
    }

    // Recursively filter all conditions
    segmentConditions = segmentConditions.map((cond) =>
      recursivelyRemoveEmptyConditions(cond)
    );

    // this.utilityService.log("playerObject", playerObject);
    let allElements = playerObject.elements;

    // To simplify the calculation, format inventory data as elements
    const itemMap = new Map();

    playerObject.inventory.forEach((item) => {
      if (itemMap.has(item.itemID)) {
        itemMap.set(
          item.itemID,
          itemMap.get(item.itemID) + Number(item.quantity)
        );
      } else {
        itemMap.set(item.itemID, Number(item.quantity));
      }
    });

    allElements = allElements.concat(
      Array.from(itemMap, ([elementID, elementValue]) => ({
        elementID,
        elementValue,
      }))
    );

    let resultToCalculate = "";
    const getBlockExpression= (conditionBlock) => {
      // this.utilityService.log("Iterating", conditionBlock, conditionBlock.conditions);
      // Iterate over each condition in the condition block
      // If there are nested conditions, call this function recursively.
      if (conditionBlock.conditions && conditionBlock.conditions.length > 0) {
        resultToCalculate += "(";
        conditionBlock.conditions.forEach((condition) => {
          getBlockExpression(condition);
        });
        resultToCalculate += ")";
      }

      // If the item is a condition block, start making up the expression
      if (conditionBlock.conditionElementID) {
        let localExpression = "";

        let playerElement = allElements.find(
          (element) => element.elementID === conditionBlock.conditionElementID
        );
        const isSegmentCondition =
          conditionBlock.conditionElementID === "inSegment" ||
          conditionBlock.conditionElementID === "notInSegment";
        // this.utilityService.log("playerElement: ", playerElement, playerObject);
        if (
          // If we could not find element to check for condition, skip
          Boolean(playerElement) === false &&
          // Don't skip if we're checking against the player segments
          !isSegmentCondition
        ) {
          localExpression += "0";
          resultToCalculate += localExpression;
          return;
        }

        // Get "value" or "values" depending on what kind of value it is.
        // For reliability we store them in different arrays to explicitly separate possible array values from non-array
        let playerElementValue;
        if (!isSegmentCondition) {
          // Try get element, but dont if we check against the segments
          playerElementValue = playerElement.elementValue;
        }
        if (!playerElementValue) {
          // Handle a scenario where:
          // 1. A segment with multiple conditions exists
          // 2. A player is just created and given initial analytics values and segment recalc is triggered
          // 3. Segment is trying to recalc this player but not all fields were initialized yet
          playerElementValue = "undefined";
        }

        let playerElementValues;
        if (!isSegmentCondition) {
          // Try get element, but dont if we check against the segments
          playerElementValues = playerElement.elementValues;
        }

        let conditionalValue = conditionBlock.conditionValue;
        let conditionalSecondaryValue = conditionBlock.conditionSecondaryValue;

        function checkCondition(condition) {
          switch (condition.condition) {
            // Int/floats only
            case "=":
              playerElementValue = parseFloat(playerElementValue);
              conditionalValue = parseFloat(conditionalValue);
              if (conditionalValue === playerElementValue) {
                return true;
              } else {
                return false;
              }
              break;

            case "!=":
              playerElementValue = parseFloat(playerElementValue);
              conditionalValue = parseFloat(conditionalValue);
              if (conditionalValue !== playerElementValue) {
                return true;
              } else {
                return false;
              }
              break;

            case ">":
              playerElementValue = parseFloat(playerElementValue);
              conditionalValue = parseFloat(conditionalValue);
              if (playerElementValue > conditionalValue) {
                return true;
              } else {
                return false;
              }
              break;

            case "<":
              playerElementValue = parseFloat(playerElementValue);
              conditionalValue = parseFloat(conditionalValue);
              if (playerElementValue < conditionalValue) {
                return true;
              } else {
                return false;
              }
              break;

            case ">=":
              playerElementValue = parseFloat(playerElementValue);
              conditionalValue = parseFloat(conditionalValue);
              if (playerElementValue >= conditionalValue) {
                return true;
              } else {
                return false;
              }
              break;

            case "<=":
              playerElementValue = parseFloat(playerElementValue);
              conditionalValue = parseFloat(conditionalValue);
              if (playerElementValue <= conditionalValue) {
                return true;
              } else {
                return false;
              }
              break;

            case "range":
              playerElementValue = parseFloat(playerElementValue);
              conditionalValue = parseFloat(conditionalValue);
              if (
                playerElementValue >= conditionalValue &&
                playerElementValue <= conditionalSecondaryValue
              ) {
                return true;
              } else {
                return false;
              }
              break;

            // String only
            case "is":
              playerElementValue = playerElementValue.toString();
              conditionalValue = conditionalValue.toString();
              if (playerElementValue === conditionalValue) {
                return true;
              } else {
                return false;
              }
              break;

            case "isNot":
              playerElementValue = playerElementValue.toString();
              conditionalValue = conditionalValue.toString();
              if (playerElementValue !== conditionalValue) {
                return true;
              } else {
                return false;
              }
              break;

            // Array only (least/mostCommon template method values)
            case "includes":
              if (playerElementValues.includes(conditionalValue)) {
                return true;
              } else {
                return false;
              }
              break;

            case "notIncludes":
              if (!playerElementValues.includes(conditionalValue)) {
                return true;
              } else {
                return false;
              }
              break;

            case "date":
              if (
                new Date(playerElementValue) >= new Date(conditionalValue) &&
                new Date(playerElementValue) <=
                  new Date(conditionalSecondaryValue)
              ) {
                return true;
              } else {
                return false;
              }
              break;

            case "inSegment":
              if (
                conditionalValue &&
                Array.isArray(conditionalValue) &&
                conditionalValue.length > 0 &&
                playerObject.segments &&
                conditionalValue.every(
                  (segmentID) =>
                    playerObject.segments.includes(segmentID) === true // Every segment is in player's segments
                )
              ) {
                return true;
              } else {
                return false;
              }
              break;

            case "notInSegment":
              if (
                conditionalValue &&
                Array.isArray(conditionalValue) &&
                conditionalValue.length > 0 &&
                playerObject.segments &&
                conditionalValue.every(
                  (segmentID) =>
                    playerObject.segments.includes(segmentID) === false // No match must be found
                )
              ) {
                return true;
              } else {
                return false;
              }
              break;

            default:
              break;
          }
        }
        let checkResult = checkCondition(conditionBlock);
        this.utilityService.log(
          "Check result:",
          checkResult,
          "Condition:",
          conditionBlock.condition
        );
        if (checkResult === true) {
          localExpression += "1";
        } else {
          localExpression += "0";
        }

        // Encapsulate every block in the expression
        // localExpression = "(" + localExpression + ")";
        resultToCalculate += localExpression;
      }

      // If operator, just make + or *
      if (conditionBlock.conditionOperator) {
        if (conditionBlock.conditionOperator === "and") {
          resultToCalculate += "*";
        } else if (conditionBlock.conditionOperator === "or") {
          resultToCalculate += "+";
        }
      }
    }

    segmentConditions.forEach((condition) => {
      getBlockExpression(condition);
    });

    this.utilityService.log("Result evaluation: ", resultToCalculate);

    // Actual calculating. Given the expression i.e. "( (1+1) + (0*1) * (0) )" we can calculate if player should join segment
    let result = 0;
    if (result !== "" && result !== "()") {
      result = eval(resultToCalculate);
    }

    if (result >= 1) {
      return true;
    } else if (result === 0) {
      return false;
    }
  }

  // Recalculate player segments if his elementValue was changed
  async recalculateSegments(
    gameID,
    branchName,
    environment,
    clientID,
    changedTemplateID,
    skipPWUpdate,
    skipFCMnotify
  ) {
    try {
      // this.utilityService.log(
      //   "Recalculating segments for player ",
      //   clientID,
      //   " in game ",
      //   gameID + ":" + branchName
      // );
      const segments = await this.cacherService.getCachedSegmentsByTemplateID(
        gameID,
        branchName,
        changedTemplateID
      );
      // this.utilityService.log(
      //   "Segments found for template",
      //   changedTemplateID,
      //   ":",
      //   segments.length
      // );

      for (const segment of segments) {
        const requiredTemplateIDs = segment.usedTemplateIDs;
        const playerObject = await this.warehouseService.makeFullPlayerObject(
          gameID,
          branchName,
          environment,
          clientID,
          requiredTemplateIDs
        );

        if (!playerObject) continue;

        const check = this.calculatePlayerSegment(playerObject, segment);

        if (check) {
          // this.utilityService.log(
          //   "Adding segment",
          //   segment.segmentID,
          //   "to player ",
          //   clientID,
          //   " in game ",
          //   gameID + ":" + branchName
          // );
          await this.addPlayerToSegment(
            gameID,
            branchName,
            environment,
            segment.segmentID,
            clientID,
            skipPWUpdate, // Update user's segment in Player Warehouse
            skipFCMnotify // Notify him about segment change
          );
        } else {
          // this.utilityService.log(
          //   "Removing segment",
          //   segment.segmentID,
          //   "from player ",
          //   clientID,
          //   " in game ",
          //   gameID + ":" + branchName
          // );
          await this.removePlayerFromSegment(
            gameID,
            branchName,
            environment,
            segment.segmentID,
            clientID,
            skipFCMnotify // Notify him about segment change
          );
        }
      }

      return segments;
    } catch (error) {
      console.error("recalculateSegments: Error retrieving segments:", error);
    }
  }

  async notifyAnalyticsAboutSegmentChange(
    gameID,
    branch,
    environment,
    clientID,
    segments
  ) {
    const studioID = await this.utilityService.getStudioIDByGameID(gameID);
    if (segments && segments.length > 1) {
      await this.queueService.sendQueueKeyValueMessage(
        studioID,
        "segments",
        `${gameID}:${environment}:${clientID}`,
        segments.filter((s) => s !== "everyone"),
        {
          studioID,
          table: "segments",
        }
      );
    } else {
      await this.queueService.sendQueueKeyValueMessage(
        studioID,
        "segments",
        `${gameID}:${environment}:${clientID}`,
        null,
        {
          studioID,
          table: "segments",
        }
      );
    }
  }

  async recalculateSegment(gameID, branch, environment, segmentID) {
    // Called from the web backend when a developer presses "recalculate segment" button
    try {
      this.utilityService.log(
        `Force recalculating segment for`,
        gameID,
        branch,
        `segment:`,
        segmentID,
        `Getting segment...`
      );
      let segment = await Segments.findOne({
        gameID: this.utilityService.getDemoGameID(gameID),
        branch: branch,
        segmentID: segmentID,
      }).lean();

      if (!segment || segment.length === 0) {
        this.utilityService.log(
          `Could not find segment with ID ${segmentID} in game ${this.utilityService.getDemoGameID(
            gameID
          )} in branch ${this.utilityService.getBranchWithReferenceSuffix(
            branch
          )}`
        );
        return;
      }

      this.utilityService.log(`Getting players...`);
      const cursor = PWplayers.find(
        {
          gameID: this.utilityService.getDemoGameID(gameID),
          environment: environment,
          $or: [
            { segments: segmentID },
            {
              lastJoinDate: {
                $gte: new Date(new Date().setDate(new Date().getDate() - 30)),
              },
            },
          ],
        },
        { clientID: 1, _id: 0 }
      ).cursor();

      this.utilityService.log(
        "Edge date: ",
        new Date(new Date().setDate(new Date().getDate() - 30))
      );

      const skipFCMnotify = true;
      const skipPWUpdate = false;

      const requiredTemplateIDs = segment.usedTemplateIDs;

      const processBatch = async (batch) => {
        const sendPromises = batch.map(async (player) => {
          const playerObject = await this.warehouseService.makeFullPlayerObject(
            gameID,
            branch,
            environment,
            player.clientID,
            requiredTemplateIDs
          );
          if (!playerObject) return;

          let check = false;
          if (segmentID === "everyone") {
            check = true;
          } else {
            check = this.calculatePlayerSegment(playerObject, segment);
          }

          if (check) {
            this.utilityService.log(
              "Adding segment",
              segment.segmentID,
              "to player ",
              player.clientID,
              " in game ",
              gameID + ":" + branch
            );
            await this.addPlayerToSegment(
              gameID,
              branch,
              environment,
              segment.segmentID,
              player.clientID,
              skipPWUpdate, // Update user's segment in Player Warehouse
              skipFCMnotify // Notify him about segment change
            );
          } else {
            this.utilityService.log(
              "Removing segment",
              segment.segmentID,
              "from player ",
              player.clientID,
              " in game ",
              gameID + ":" + branch
            );
            await this.removePlayerFromSegment(
              gameID,
              branch,
              environment,
              segment.segmentID,
              player.clientID,
              skipFCMnotify // Notify him about segment change
            );
          }
        });

        await Promise.all(sendPromises);
      };

      const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      let count = 0;
      let batch = [];

      await cursor.eachAsync(async (player) => {
        batch.push(player);

        if (batch.length >= 10000) {
          // Process batch of 1000 players
          await processBatch(batch);
          batch = []; // Clear the batch
          count += 10000;
          this.utilityService.log(`${count} players processed`);

          // Wait for 3 seconds
          await pause(3000);
        }
      });

      // Process any remaining players
      if (batch.length > 0) {
        await processBatch(batch);
        count += batch.length;
        this.utilityService.log(`${count} players processed`);
      }

      await this.cacherService.tryDeleteCache(
        `${gameID}:${branch}:segmentsRecalculationQueue:${segmentID}`
      );

      return;
    } catch (error) {
      console.error(error);
    }
  }
}
