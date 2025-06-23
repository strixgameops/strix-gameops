import { PlanningTreeModel } from "../../../models/planningTreeModel.js";
import { User } from "../../../models/userModel.js";
import { NodeModel } from "../../../models/nodeModel.js";
import { Game } from "../../../models/gameModel.js";
import { Studio } from "../../../models/studioModel.js";
import { Publisher } from "../../../models/publisherModel.js";
import { AnalyticsEvents } from "../../../models/analyticsevents.js";
import { Segments } from "../../../models/segmentsModel.js";
import { LocalizationItem } from "../../../models/localizationModel.js";
import { OffersModel as Offers } from "../../../models/offersModel.js";
import { Charts as CustomCharts } from "../../../models/charts.js";
import { ABTests } from "../../../models/abtests.js";
import { PWplayers } from "../../../models/PWplayers.js";
import { PWtemplates } from "../../../models/PWtemplates.js";
import { Leaderboards } from "../../../models/leaderboardsModel.js";
import { LeaderboardStates } from "../../../models/leaderboardsStateModel.js";

import mongoose from "mongoose";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

export class WarehouseService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async removeWarehouseTemplate(gameID, branch, templateID, clientUID) {
    if (!gameID || !branch || !templateID) {
      throw new Error("Missing required parameters");
    }

    const result = await PWtemplates.deleteOne(
      { gameID, branch: branch, templateID: templateID },
      { new: true }
    );
    console.log("Result of removing PW template:", result);
    if (result && result.modifiedCount > 0) {
      const segmentsService = this.moduleContainer.get("segments");
      await segmentsService.handleSegmentAfterRemovingTemplate(
        gameID,
        branch,
        templateID
      );
      await this.resolveLeaderboardsAfterTemplateRemove(
        gameID,
        branch,
        templateID
      );
    }

    if (clientUID) {
      const loggingService = this.moduleContainer.get("logging");
      loggingService.logAction(
        gameID,
        "playerwarehouse",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: removed warehouse template | SUBJECT: ${templateID}`
      );
    }

    if (!result) {
      throw new Error("Template not found or not deleted");
    }
  }

  async addAnalyticsTemplate(gameID, branch, templateObject, clientUID) {
    // Generate a unique ObjectID for templateID
    const templateID = new mongoose.Types.ObjectId();

    // Add the generated templateID to the template object
    templateObject.templateID = templateID;

    function convertToUnderscore(phrase) {
      // Convert to lowercase and replace spaces with underscores
      return phrase.toLowerCase().replace(/\s+/g, "_");
    }

    // Find or create template object
    await PWtemplates.create({
      gameID,
      branch: branch,
      ...templateObject,
      templateType: "analytics",
      templateCodeName: convertToUnderscore(templateObject.templateName),
    });

    // // Set initial element values for all players based on existing data
    // this.calculateInitialElementValue(gameID, branch, templateObject);

    const loggingService = this.moduleContainer.get("logging");
    loggingService.logAction(
      gameID,
      "playerwarehouse",
      `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: created warehouse analytics template | SUBJECT: ${templateID}`
    );

    return templateObject;
  }

  async getWarehousePlayerData(gameID, branch, environment, clientID) {
    try {
      const utilityService = this.moduleContainer.get("utility");
      // Find the PlayerWarehouse document by gameID, branch, and clientID
      const playerWarehouse = await PWplayers.findOne({
        gameID: utilityService.getDemoGameID(gameID),
        environment: environment,
        clientID,
      });

      if (!playerWarehouse) {
        const error = new Error("PlayerWarehouse not found");
        error.statusCode = 404;
        throw error;
      }

      return playerWarehouse;
    } catch (error) {
      throw error;
    }
  }

  async getWarehousePlayers(gameID, branch) {
    try {
      const utilityService = this.moduleContainer.get("utility");
      // Find the PlayerWarehouse documents by gameID and branch
      const playerWarehouse = await PWplayers.find(
        {
          gameID: utilityService.getDemoGameID(gameID),
          branch: utilityService.getBranchWithoutSuffix(branch),
        },
        {
          elements: 0,
          inventory: 0,
          offers: 0,
          abtests: 0,
          segments: 0,
          branch: 0,
          _id: 0,
          gameID: 0,
        }
      );

      if (!playerWarehouse) {
        const error = new Error("PlayerWarehouse not found");
        error.statusCode = 404;
        throw error;
      }

      // Extract an array of clientID from players
      const playerIDs = playerWarehouse.map((player) => player.clientID);
      return playerIDs;
    } catch (error) {
      throw error;
    }
  }

  async assignNamesToAnalyticsEvents(gameID, branch, analyticsTemplates) {
    try {
      // Iterate through analyticsTemplates and update templateVisualEventName and templateVisualValueName
      if (analyticsTemplates && analyticsTemplates.length > 0) {
        const updatedTemplates = await Promise.all(
          analyticsTemplates.map(async (template) => {
            const event = await AnalyticsEvents.findOne({
              gameID: gameID,
              branch: branch,
              eventID: template.templateAnalyticEventID,
            }).lean();

            if (event) {
              const targetEvent = event;
              const targetEventValue = targetEvent.values.find(
                (value) =>
                  value.uniqueID === template.templateEventTargetValueId
              );

              // Create a new object with updated fields
              const updatedTemplate = {
                ...template.toJSON(),
                templateVisualEventName:
                  targetEvent?.eventName || "Event not found",
                templateVisualValueName:
                  targetEventValue?.valueName || "Value not found",
              };

              return updatedTemplate;
            } else {
              // If the document is not found, return the original template
              return template;
            }
          })
        );

        return updatedTemplates;
      }
    } catch (error) {
      throw error;
    }
  }

  async getWarehouseTemplates(gameID, branch) {
    // Find the PlayerWarehouse document by gameID and branch
    let templates = await PWtemplates.find({
      gameID,
      branch: branch,
    });
    console.log(templates)
    // Assign names to analytics events
    const updatedAnalyticsTemplates = await this.assignNamesToAnalyticsEvents(
      gameID,
      branch,
      templates.filter((t) => t.templateType === "analytics")
    );
    console.log(updatedAnalyticsTemplates)

    // Update the templates object with updated analytics templates
    const updatedTemplates = {
      uniqueID: templates.uniqueID,
      analytics: updatedAnalyticsTemplates,
      statistics: templates.filter((t) => t.templateType !== "analytics"),
    };

    return updatedTemplates;
  }

  async updateStatisticsTemplate(
    gameID,
    branch,
    templateID,
    templateObject,
    clientUID
  ) {
    try {
      // Update the statistics template in the database
      await PWtemplates.findOneAndUpdate(
        {
          gameID: gameID,
          branch: branch,
          templateID: templateID,
        },
        {
          $set: {
            templateName: templateObject.templateName,
            templateCodeName: templateObject.templateCodeName,
            templateDefaultValue: templateObject.templateDefaultValue,
            templateValueRangeMin: templateObject.templateValueRangeMin,
            templateValueRangeMax: templateObject.templateValueRangeMax,
          },
        },
        { new: true }
      );

      const loggingService = this.moduleContainer.get("logging");
      loggingService.logAction(
        gameID,
        "playerwarehouse",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed warehouse statistics template | SUBJECT: ${templateID}`
      );

      return {
        success: true,
        message: "Statistics template edited successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  async addStatisticsTemplate(gameID, branch, templateObject, clientUID) {
    try {
      // Generate a new templateID
      const newTemplateID = new mongoose.Types.ObjectId();
      // Create a new template object
      const newTemplate = { ...templateObject, templateID: newTemplateID };

      await PWtemplates.create(newTemplate);

      const loggingService = this.moduleContainer.get("logging");
      loggingService.logAction(
        gameID,
        "playerwarehouse",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: created warehouse statistics template | SUBJECT: ${newTemplateID}`
      );

      return {
        success: true,
        message: "Statistics template added successfully",
        newTemplate,
      };
    } catch (error) {
      throw error;
    }
  }

  async getTemplatesForSegments(gameID, branch) {
    try {
      if (!gameID || !branch) {
        throw new Error("Missing gameID or branch in the request");
      }

      // Retrieve the player warehouse template branch from PWtemplates (assumed to remain in its original structure)
      let templates = await PWtemplates.find({
        gameID,
        branch: branch,
      });
      // Find nodes that have an entityBasic field (i.e. entity templates) using the flat schema.
      // We exclude unwanted nested fields via projection.
      let entities = await NodeModel.find(
        { gameID, branch: branch, entityBasic: { $exists: true } },
        {
          "entityBasic.mainConfigs": 0,
          "entityBasic.inheritedConfigs": 0,
          "entityBasic.entityIcon": 0,
          analyticsEvents: 0,
          "entityCategory.parentCategory": 0,
        }
      ).lean();

      // Filter out the root node and map each entity into the template format
      entities = entities
        .filter((n) => n.nodeID !== "Root")
        .map((n) => ({
          templateID: n.nodeID,
          templateName: n.name,
          templateType: "integer",
          groupName: n.groupName,
        }));

      // Build the result object combining analytics, statistics, and the transformed entities
      const result = {
        analytics:
          templates.filter((t) => t.templateType === "analytics") || [],
        statistics:
          templates.filter((t) => t.templateType !== "analytics") || [],
        inventory: entities,
      };

      return result;
    } catch (error) {
      throw error;
    }
  }

  async countPlayersInWarehouse(gameID, branch) {
    try {
      // Check for missing gameID or branch
      if (!gameID || !branch) {
        throw new Error("Missing gameID or branch in the request");
      }

      // Just get the 'everyone' segment and return the amount of players in it
      const segmentsService = this.moduleContainer.get("segments");
      const segment = await segmentsService.getSegmentsByIdArray(
        gameID,
        branch,
        ["everyone"],
        false,
        true
      );

      // Return the number of players
      return segment[0].segmentPlayerCount;
    } catch (error) {
      throw error;
    }
  }

  // Remove all PW analytics templates by given eventIDs
  async removeAnalyticsTemplatesByEventID(gameID, branch, eventIDs) {
    try {
      await PWtemplates.deleteMany({
        gameID,
        branch: branch,
        templateAnalyticEventID: {
          $in: eventIDs,
        },
      });
    } catch (error) {
      console.error("Error removing analytics templates:", error);
    }
  }

  async removeAnalyticsTemplatesByEventValueID(gameID, branch, valueIDs) {
    try {
      await PWtemplates.deleteMany({
        gameID,
        branch: branch,
        templateEventTargetValueId: {
          $in: valueIDs,
        },
      });
    } catch (error) {
      console.error("Error removing analytics templates:", error);
    }
  }

  async removeSegmentFromAllPlayers(gameID, branch, segmentID) {
    try {
      const utilityService = this.moduleContainer.get("utility");
      await PWplayers.updateMany(
        {
          gameID: gameID,
          segments: segmentID,
          branch: utilityService.getBranchWithoutSuffix(branch),
        },
        {
          $pull: {
            segments: segmentID,
          },
        }
      );
      // console.log("Removed segments from N players:", result.modifiedCount);
    } catch (error) {
      console.error("Error removing segments from all players:", error);
    }
  }

  async getLeaderboards(gameID, branch) {
    try {
      const result = await Leaderboards.find({ gameID, branch }, { tops: 0 });

      if (!result) {
        return [];
      } else {
        return result;
      }
    } catch (error) {
      console.error("Error getting leaderboards:", error);
    }
  }

  async addLeaderboard(gameID, branch, newLeaderboard) {
    try {
      await Leaderboards.insertMany([
        {
          gameID,
          branch,
          ...newLeaderboard,
        },
      ]);
    } catch (error) {
      console.error("Error getting leaderboards:", error);
    }
  }

  async removeLeaderboard(gameID, branch, leaderboardID) {
    try {
      await Leaderboards.deleteOne({
        gameID,
        branch,
        id: leaderboardID,
      });
    } catch (error) {
      console.error("Error getting leaderboards:", error);
    }
  }

  async updateLeaderboard(gameID, branch, modifiedLeaderboard) {
    try {
      await Leaderboards.updateOne(
        {
          gameID,
          branch,
          id: modifiedLeaderboard.id,
        },
        {
          $set: {
            ...modifiedLeaderboard,
          },
        }
      );
    } catch (error) {
      console.error("Error getting leaderboards:", error);
    }
  }

  async getLeaderboardTop(gameID, branch, timeframeKey) {
    try {
      const state = await LeaderboardStates.findOne({
        gameID,
        branch,
        timeframeKey,
      }).lean();
      if (state) {
        return state.top.slice(0, 20000);
      } else {
        return {};
      }
    } catch (error) {
      console.error("Error getting leaderboard top:", error);
      return {};
    }
  }

  async resolveLeaderboardsAfterTemplateRemove(gameID, branch, templateID) {
    try {
      await Leaderboards.updateMany(
        {
          gameID,
          branch,
          aggregateElementID: templateID,
        },
        {
          $set: {
            aggregateElementID: "",
          },
        }
      );

      await Leaderboards.updateMany(
        {
          gameID,
          branch,
          additionalElementIDs: templateID,
        },
        {
          $pull: {
            additionalElementIDs: templateID,
          },
        }
      );
    } catch (error) {
      console.error(
        "Error resolving leaderboards after template remove:",
        error
      );
    }
  }

  async queryWarehousePlayers(gameID, branch, environment, filters) {
    try {
      let warehouseTemplates = await PWtemplates.find({
        gameID,
        branch: branch,
      });

      function getTemplateType(templateID) {
        if (
          warehouseTemplates.find((t) => t.templateID === templateID)
            .templateType === "analytics"
        ) {
          return "analytics";
        } else {
          return "statistics";
        }
      }

      const buildQuery = async () => {
        let queryConditions = [];
        if (filters.length !== 0) {
          queryConditions[0] = { $and: [] };
        }
        filters = filters.filter((c) => !c.condition);
        for (const filter of filters) {
          if (filter.condition) {
            if (filter.condition === "and") {
              queryConditions.push({ $and: [] });
            } else if (filter.condition === "or") {
              queryConditions.push({ $or: [] });
            }
          } else {
            const targetElementPath = `elements.${getTemplateType(
              filter.templateID
            )}.elementID`;
            const targetValuePath = `elements.${getTemplateType(
              filter.templateID
            )}.elementValue`;

            let condition = {};
            let formattedValue = filter.filterValue;
            switch (filter.filterCondition) {
              case "not in segment":
                condition = {
                  [`segments`]: { $nin: [filter.segmentID] },
                };
                break;
              case "in segment":
                condition = {
                  [`segments`]: { $in: [filter.segmentID] },
                };
                break;
              case "has item":
                condition = {
                  [`inventory.nodeID`]: formattedValue,
                };
                break;
              case "has no item":
                condition = {
                  [`inventory.nodeID`]: formattedValue,
                };
                break;
              case "is":
                formattedValue = filter.filterValue.toString();
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: formattedValue,
                    },
                  },
                };
                break;
              case "is not":
                formattedValue = filter.filterValue.toString();
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: { $ne: formattedValue },
                    },
                  },
                };
                break;
              case "contains":
                formattedValue = filter.filterValue.toString();
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: { $regex: formattedValue, $options: "i" },
                    },
                  },
                };
                break;
              case "starts with":
                formattedValue = filter.filterValue.toString();
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: {
                        $regex: `^${formattedValue}`,
                        $options: "i",
                      },
                    },
                  },
                };
                break;
              case "ends with":
                formattedValue = filter.filterValue.toString();
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: {
                        $regex: `${formattedValue}$`,
                        $options: "i",
                      },
                    },
                  },
                };
                break;
              case ">":
                formattedValue = parseFloat(filter.filterValue);
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: { $gt: formattedValue },
                    },
                  },
                };
                break;
              case "<":
                formattedValue = parseFloat(filter.filterValue);
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: { $lt: formattedValue },
                    },
                  },
                };
                break;
              case ">=":
                formattedValue = parseFloat(filter.filterValue);
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: { $gte: formattedValue },
                    },
                  },
                };
                break;
              case "<=":
                formattedValue = parseFloat(filter.filterValue);
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: { $lte: formattedValue },
                    },
                  },
                };
                break;
              case "=":
                formattedValue = parseFloat(filter.filterValue);
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: formattedValue,
                    },
                  },
                };
                break;
              case "!=":
                formattedValue = parseFloat(filter.filterValue);
                condition = {
                  [`elements.${getTemplateType(filter.templateID)}`]: {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: { $ne: formattedValue },
                    },
                  },
                };
                break;
              case "dateRange":
                const [startDate, endDate] = filter.filterValue.map((date) =>
                  dayjs.utc(date).toDate()
                );
                condition = {
                  "elements.analytics": {
                    $elemMatch: {
                      elementID: filter.templateID,
                      elementValue: { $gte: startDate, $lte: endDate },
                    },
                  },
                };
                break;
              default:
                continue;
            }

            if (
              queryConditions.length > 0 &&
              queryConditions[queryConditions.length - 1].$and
            ) {
              queryConditions[queryConditions.length - 1].$and.push(condition);
            } else if (
              queryConditions.length > 0 &&
              queryConditions[queryConditions.length - 1].$or
            ) {
              queryConditions[queryConditions.length - 1].$or.push(condition);
            } else {
              queryConditions.push(condition);
            }
          }
        }

        const utilityService = this.moduleContainer.get("utility");
        const defaultQuery = {
          gameID: utilityService.getDemoGameID(gameID),
          environment: environment,
        };

        // console.log(JSON.stringify(queryConditions));
        return { $and: [defaultQuery, ...queryConditions] };
      };
      const query = await buildQuery();

      const result = await PWplayers.aggregate([
        { $match: query },
        {
          $project: {
            clientID: 1,
          },
        },
        {
          $facet: {
            players: [{ $limit: 1000 }],
          },
        },
      ]);

      let players = result[0].players === undefined ? [] : result[0].players;
      if (players) {
        return players.map((c) => c.clientID);
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error searching PW players:", error);
    }
  }

  async forceSetValueToStatisticElement(
    gameID,
    branch,
    clientID,
    elementID,
    value
  ) {
    try {
      const utilityService = this.moduleContainer.get("utility");
      const doc = await PWplayers.findOne({
        clientID: clientID,
        gameID: gameID,
        branch: utilityService.getBranchWithoutSuffix(branch),
        "elements.statistics.elementID": elementID,
      }).lean();

      const defaultElement = await PWtemplates.find({
        gameID,
        branch: branch,
        templateID: elementID,
      }).lean();

      if (!defaultElement) {
        console.error(
          "forceSetValueToStatisticElement: Default element not found"
        );
      }

      let result;
      if (doc) {
        result = await PWplayers.updateOne(
          {
            clientID: clientID,
            gameID: gameID,
            branch: branch,
            "elements.statistics": {
              $elemMatch: {
                elementID: elementID,
              },
            },
          },
          {
            $set: {
              "elements.statistics.$.elementValue": value,
            },
          }
        );
      } else {
        // Element does not exist, create it.
        // Get default values from PWtemplates, modify them and insert
        let transformedValue = this.formatTemplateValueAsType(
          value,
          defaultElement.templateType
        );

        result = await PWplayers.updateOne(
          {
            clientID: clientID,
            gameID: gameID,
            branch: branch,
          },
          {
            $push: {
              "elements.statistics": {
                elementID: defaultElement.templateID,
                elementValue: transformedValue,
              },
            },
          }
        );
        if (result.modifiedCount > 0) {
          return;
        } else {
          throw new Error("Could not add value to statistics element");
        }
      }

      if (result.modifiedCount > 0) {
        return;
      } else {
        throw new Error(
          "Could not add value to statistics element. Probably hit max value threshold"
        );
      }
    } catch (error) {
      console.error("warehouseManager:", error);
    }
  }

  formatTemplateValueAsType(templateValue, templateType) {
    // Format template value according to it's type.
    // E.g. make 5.00 from "5" if template is a float.
    try {
      if (templateType === "integer") {
        return parseInt(templateValue);
      } else if (templateType === "float") {
        return parseFloat(templateValue);
      } else if (templateType === "string") {
        return templateValue;
      } else if (templateType === "bool") {
        return templateValue === "True";
      }
    } catch (err) {
      console.error("Error at formatTemplateValueAsType: " + err.message);
      return null;
    }
  }
}

export default WarehouseService;
