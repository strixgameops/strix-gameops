import { Charts as CustomCharts } from "../../../models/charts.js";
import { PWplayers } from "../../../models/PWplayers.js";
import { PWtemplates } from "../../../models/PWtemplates.js";
import { customAlphabet } from "nanoid";
import dayjs from "dayjs";

const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);

export class ProfileCompositionService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async setProfileCompositionPreset(gameID, branch, presets = []) {
    try {
      const result = await CustomCharts.findOneAndUpdate(
        { gameID, branch: branch },
        {
          $set: {
            profileCompositionPresets: JSON.stringify(presets),
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
      return result;
    } catch (error) {
      console.error(error);
      throw new Error("Internal Server Error or No Data");
    }
  }

  async getProfileCompositionPreset(gameID, branch) {
    try {
      const charts = await CustomCharts.findOne(
        {
          gameID,
          branch: branch,
        },
        { profileCompositionPresets: 1 }
      );
      if (!charts) {
        return { success: true, presets: [] };
      }
      let presets = [];
      if (
        charts.profileCompositionPresets !== undefined &&
        charts.profileCompositionPresets !== ""
      ) {
        presets = JSON.parse(charts.profileCompositionPresets);
        return { success: true, presets: presets };
      } else {
        return { success: true, presets: [] };
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getProfileComposition(
    gameID,
    branch,
    environment,
    baseSegment,
    filters,
    element1,
    element2,
    element3
  ) {
    try {
      if (baseSegment.length === 0) {
        baseSegment = ["everyone"];
      }
      const cutoutDate = dayjs.utc().subtract(30, "days").toDate(); // The date to cut players by lastJoinDate

      let segmentCount = 0;
      let baseSegmentsCount = undefined;
      const result = await PWplayers.count({
        gameID: gameID,
        environment: environment,
        segments: { $in: baseSegment },
        lastJoinDate: {
          $gte: cutoutDate,
        },
      });
      baseSegmentsCount = result;
      segmentCount = result;

      if (segmentCount == undefined) {
        segmentCount = 0;
      }

      const utilityService = this.moduleContainer.get("utility");

      let sampleSize = 0;
      if (element1 !== "" || element2 !== "" || element3 !== "") {
        sampleSize = utilityService.getSampleSize(segmentCount, 0.99);
      }

      let warehouseTemplates = await PWtemplates.find({
        gameID,
        branch: utilityService.getBranchWithWorkingSuffix(branch),
      }).lean();

      let queries = [];

      if (filters.some((f) => Boolean(f.filters))) {
        // For many categories to filter
        queries = await Promise.all(
          filters.map(async (filterGroup) => {
            const query = await this.makeCompositionQuery(
              gameID,
              environment,
              filterGroup.filters,
              baseSegment,
              warehouseTemplates,
              cutoutDate
            );
            const result = await PWplayers.aggregate([
              { $match: query },
              {
                $project: {
                  clientID: 1,
                  segments: 1,
                },
              },
              {
                $facet: {
                  totalCount: [{ $count: "count" }],
                },
              },
            ]);

            const totalCount = result[0].totalCount[0]
              ? result[0].totalCount[0].count
              : 0;

            return {
              composition: totalCount,
              categoryIndex: filterGroup.index,
            };
          })
        );
      } else {
        // Regular query
        const query = await this.makeCompositionQuery(
          gameID,
          environment,
          filters,
          baseSegment,
          warehouseTemplates,
          cutoutDate
        );
        const result = await PWplayers.aggregate([
          { $match: query },
          {
            $project: {
              elements: 1,
              clientID: 1,
              segments: 1,
            },
          },
          {
            $facet: {
              totalCount: [{ $count: "count" }],
              ...(sampleSize > 0 && { players: [{ $limit: sampleSize }] }),
            },
          },
        ]);

        const totalCount = result[0].totalCount[0]
          ? result[0].totalCount[0].count
          : 0;
        let players = result[0].players || [];

        if (players.length > 0) {
          players = players.map((p) => ({
            ...p,
            elements: [
              ...(p.elements.analytics || []),
              ...(p.elements.statistics || []),
            ],
          }));
        }

        queries = [{ composition: totalCount, sample: players }];
      }

      return {
        success: true,
        results: queries,
        baseSegmentsCount,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async createSegmentFromComposition(
    gameID,
    branch,
    environment,
    baseSegment,
    filters,
    segmentName,
    segmentComment
  ) {
    try {
      if (baseSegment.length === 0) {
        baseSegment = ["everyone"];
      }
      const cutoutDate = dayjs.utc().subtract(30, "days").toDate(); // The date to cut players by lastJoinDate

      let segmentCount = 0;
      let baseSegmentsCount = undefined;
      const utilityService = this.moduleContainer.get("utility");
      const result = await PWplayers.count({
        gameID: utilityService.getDemoGameID(gameID),
        environment: environment,
        segments: { $in: baseSegment },
        lastJoinDate: {
          $gte: cutoutDate,
        },
      });
      baseSegmentsCount = result;
      segmentCount = result;

      const newSegmentID = nanoid();

      const segmentsService = this.moduleContainer.get("segments");
      await segmentsService.internalCreateSegment(
        gameID,
        branch,
        segmentName,
        newSegmentID,
        segmentComment,
        true
      );

      if (segmentCount == undefined) {
        segmentCount = 0;
      }

      let warehouseTemplates = await PWtemplates.find({
        gameID,
        branch: utilityService.getBranchWithWorkingSuffix(branch),
      }).lean();

      // Regular query
      const query = await this.makeCompositionQuery(
        utilityService.getDemoGameID(gameID),
        environment,
        filters,
        baseSegment,
        warehouseTemplates,
        cutoutDate
      );

      let processedPlayerCount = 0;

      const cursor = PWplayers.find(query, { _id: 1 }).cursor();
      const processBatch = async (batch) => {
        const sendPromises = batch.map(async (player) => {
          await PWplayers.updateOne(
            { _id: player._id },
            { $addToSet: { segments: newSegmentID } }
          );
          processedPlayerCount++;
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
          console.log(`${count} players processed`);

          // Wait for 3 seconds
          await pause(3000);
        }
      });

      // Process any remaining players
      if (batch.length > 0) {
        await processBatch(batch);
        count += batch.length;
        console.log(`${count} players processed`);
      }

      await segmentsService.internalSetSegmentPlayerCount(
        gameID,
        branch,
        newSegmentID,
        processedPlayerCount
      );

      return {
        success: true,
        baseSegmentsCount,
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  makeCompositionQuery(
    gameID,
    environment,
    filters,
    baseSegment,
    warehouseTemplates,
    cutoutDate
  ) {
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
    function getIsEntity(filter) {
      return filter.isEntity;
    }
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
            if (getIsEntity(filter)) {
              condition = {
                $expr: {
                  $anyElementTrue: {
                    $map: {
                      input: "$inventory",
                      as: "item",
                      in: {
                        $and: [
                          { $eq: ["$$item.nodeID", filter.templateID] },
                          {
                            $gt: [
                              { $toDouble: "$$item.quantity" },
                              formattedValue,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              };
            } else {
              condition = {
                [`elements.${getTemplateType(filter.templateID)}`]: {
                  $elemMatch: {
                    elementID: filter.templateID,
                    elementValue: { $gt: formattedValue },
                  },
                },
              };
            }
            break;
          case "<":
            formattedValue = parseFloat(filter.filterValue);
            if (getIsEntity(filter)) {
              condition = {
                $expr: {
                  $anyElementTrue: {
                    $map: {
                      input: "$inventory",
                      as: "item",
                      in: {
                        $and: [
                          { $eq: ["$$item.nodeID", filter.templateID] },
                          {
                            $lt: [
                              { $toDouble: "$$item.quantity" },
                              formattedValue,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              };
            } else {
              condition = {
                [`elements.${getTemplateType(filter.templateID)}`]: {
                  $elemMatch: {
                    elementID: filter.templateID,
                    elementValue: { $lt: formattedValue },
                  },
                },
              };
            }
            break;
          case ">=":
            formattedValue = parseFloat(filter.filterValue);
            if (getIsEntity(filter)) {
              condition = {
                $expr: {
                  $anyElementTrue: {
                    $map: {
                      input: "$inventory",
                      as: "item",
                      in: {
                        $and: [
                          { $eq: ["$$item.nodeID", filter.templateID] },
                          {
                            $gte: [
                              { $toDouble: "$$item.quantity" },
                              formattedValue,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              };
            } else {
              condition = {
                [`elements.${getTemplateType(filter.templateID)}`]: {
                  $elemMatch: {
                    elementID: filter.templateID,
                    elementValue: { $gte: formattedValue },
                  },
                },
              };
            }
            break;
          case "<=":
            formattedValue = parseFloat(filter.filterValue);
            if (getIsEntity(filter)) {
              condition = {
                $expr: {
                  $anyElementTrue: {
                    $map: {
                      input: "$inventory",
                      as: "item",
                      in: {
                        $and: [
                          { $eq: ["$$item.nodeID", filter.templateID] },
                          {
                            $lte: [
                              { $toDouble: "$$item.quantity" },
                              formattedValue,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              };
            } else {
              condition = {
                [`elements.${getTemplateType(filter.templateID)}`]: {
                  $elemMatch: {
                    elementID: filter.templateID,
                    elementValue: { $lte: formattedValue },
                  },
                },
              };
            }
            break;
          case "=":
            formattedValue = parseFloat(filter.filterValue);
            if (getIsEntity(filter)) {
              condition = {
                $expr: {
                  $anyElementTrue: {
                    $map: {
                      input: "$inventory",
                      as: "item",
                      in: {
                        $and: [
                          { $eq: ["$$item.nodeID", filter.templateID] },
                          {
                            $eq: [
                              { $toDouble: "$$item.quantity" },
                              formattedValue,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              };
            } else {
              condition = {
                [`elements.${getTemplateType(filter.templateID)}`]: {
                  $elemMatch: {
                    elementID: filter.templateID,
                    elementValue: formattedValue,
                  },
                },
              };
            }
            break;
          case "!=":
            formattedValue = parseFloat(filter.filterValue);
            if (getIsEntity(filter)) {
              condition = {
                $expr: {
                  $anyElementTrue: {
                    $map: {
                      input: "$inventory",
                      as: "item",
                      in: {
                        $and: [
                          { $eq: ["$$item.nodeID", filter.templateID] },
                          {
                            $ne: [
                              { $toDouble: "$$item.quantity" },
                              formattedValue,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              };
            } else {
              condition = {
                [`elements.${getTemplateType(filter.templateID)}`]: {
                  $elemMatch: {
                    elementID: filter.templateID,
                    elementValue: { $ne: formattedValue },
                  },
                },
              };
            }
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

    const baseSegmentFilter = {
      ["segments"]: { $in: baseSegment },
    };
    const utilityService = this.moduleContainer.get("utility");
    const defaultQuery = {
      gameID: utilityService.getDemoGameID(gameID),
      environment: environment,
      lastJoinDate: {
        $gte: cutoutDate,
      },
    };

    return { $and: [defaultQuery, baseSegmentFilter, ...queryConditions] };
  }
}

export default ProfileCompositionService;
