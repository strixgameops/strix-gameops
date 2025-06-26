import { Segments } from "../../../models/segmentsModel.js";
import { PWplayers } from "../../../models/PWplayers.js";
import mongoose from "mongoose";
import { customAlphabet } from "nanoid";
import axios from "axios";

const nanoid = customAlphabet("1234567890qwertyuiopasdfghjklzxcvbnm", 25);

export class SegmentService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async getAllSegmentsForAnalyticsFilter(gameID, branch) {
    const utilityService = this.moduleContainer.get("utility");
    const abTestsService = this.moduleContainer.get("abtest");
    const flowsService = this.moduleContainer.get("flow");

    let segments = await Segments.find(
      {
        gameID: gameID,
        branch: branch,
      },
      {
        segmentID: 1,
        segmentName: 1,
        _id: 0,
      }
    ).lean();

    const abTests = await abTestsService.getABTestsShort(gameID, branch);
    if (abTests.abTests && abTests.abTests.length > 0) {
      for (let segment of segments) {
        if (segment.segmentID.startsWith("abtest_")) {
          const testId = segment.segmentID.slice(7);
          segment.segmentName = abTests.abTests.find(
            (t) => t.id === testId
          ).name;
        }
      }
    }

    if (flowsService) {
      const flows = await flowsService.getFlowsShort(gameID, branch);
      if (flows && flows.length > 0) {
        for (let segment of segments) {
          if (
            segment.segmentID.startsWith("flow_") &&
            !segment.segmentID.includes("_splitTest_")
          ) {
            const flowSid = segment.segmentID.split("_")[1];
  
            let flowName = "";
            flows.map((f) => {
              if (f.sid === flowSid) {
                const name = flows.find((f) => f.sid === flowSid)?.name;
                if (name) {
                  flowName = `Flow | ${name}`;
                }
                return;
              }
            });
  
            if (!flowName) {
              flowName = "Flow | Unknown segment name";
            }
  
            segment.segmentName = flowName;
          }
        }
      }
    }

    return segments;
  }

  async removeSegmentByID(gameID, branch, segmentID, clientUID) {
    const utilityService = this.moduleContainer.get("utility");
    const loggingService = this.moduleContainer.get("logging");
    const warehouseService = this.moduleContainer.get("warehouse");
    const balanceModelFull = this.moduleContainer.get("balanceModelFull");

    try {
      const query = {
        gameID: gameID,
        branch: branch,
        segmentID: segmentID,
      };

      warehouseService.removeSegmentFromAllPlayers(gameID, branch, segmentID);

      if (balanceModelFull?.gameModelRemoveSegment) {
        balanceModelFull.gameModelRemoveSegment(gameID, branch, segmentID);
      }

      const result = await Segments.deleteOne(query);
      if (result.deletedCount > 0) {
        if (clientUID) {
          loggingService.logAction(
            gameID,
            "segments",
            `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: removed segment | SUBJECT: ${segmentID}`
          );
        }
        return { success: true, message: "Segment removed successfully" };
      } else {
        return { success: false, message: "Segment not found" };
      }
    } catch (error) {
      throw error;
    }
  }

  async refreshSegmentPlayerCount(gameID, branch, environment, segmentID) {
    try {
      const utilityService = this.moduleContainer.get("utility");
      const loggingService = this.moduleContainer.get("logging");
      const playersWithSegment = await PWplayers.count({
        gameID: utilityService.getDemoGameID(gameID),
        branch: branch,
        environment: environment,
        segments: { $in: [segmentID] },
      });

      const result = await Segments.updateOne(
        { gameID, branch: branch, segmentID },
        { $set: { segmentPlayerCount: playersWithSegment } }
      );
      return playersWithSegment;
    } catch (error) {
      console.error("Error refreshing segmentPlayerCount:", error);
      return false;
    }
  }

  async setSegmentConditions(
    gameID,
    branch,
    segmentID,
    segmentConditions,
    clientUID
  ) {
    const loggingService = this.moduleContainer.get("logging");
    try {
      if (!gameID || !branch || !segmentID || !segmentConditions) {
        throw new Error("Missing required parameters in the request");
      }

      let involvedTemplates = new Set();

      function recursivelyRemoveIrrelevantFields(conditions) {
        conditions.forEach((conds) => {
          if (conds.conditionElementID) {
            involvedTemplates.add(conds.conditionElementID);
          }
          if (conds.templateName) delete conds.templateName;
          if (conds.templateMethod) delete conds.templateMethod;
          if (conds.valueName) delete conds.valueName;
          if (conds.valueFormat) delete conds.valueFormat;
          if (conds.conditions)
            recursivelyRemoveIrrelevantFields(conds.conditions);
        });
      }

      segmentConditions.forEach((condition) => {
        if (condition.conditions)
          recursivelyRemoveIrrelevantFields(condition.conditions);
      });

      const result = await Segments.updateOne(
        { gameID, branch: branch, segmentID },
        {
          $set: {
            segmentConditions,
            usedTemplateIDs: Array.from(involvedTemplates),
          },
        }
      );

      loggingService.logAction(
        gameID,
        "segments",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed conditions in segment | SUBJECT: ${segmentID}`
      );

      return {
        success: true,
        message: "Segment conditions updated successfully",
      };
    } catch (error) {
      throw error;
    }
  }

  async setSegmentComment(gameID, branch, segmentID, newComment, clientUID) {
    try {
      const loggingService = this.moduleContainer.get("logging");
      const result = await Segments.updateOne(
        { gameID, branch: branch, segmentID },
        { $set: { segmentComment: newComment || "" } }
      );

      loggingService.logAction(
        gameID,
        "segments",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed comment in segment with iD | SUBJECT: ${segmentID}`
      );

      return "SegmentComment updated successfully";
    } catch (error) {
      throw error;
    }
  }

  async setSegmentName(gameID, branch, segmentID, newName, clientUID) {
    try {
      const loggingService = this.moduleContainer.get("logging");

      const result = await Segments.updateOne(
        { gameID, branch: branch, segmentID },
        { $set: { segmentName: newName || "" } }
      );

      loggingService.logAction(
        gameID,
        "segments",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed name in segment with iD | SUBJECT: ${segmentID}`
      );

      return "SegmentName updated successfully";
    } catch (error) {
      throw error;
    }
  }

  async createNewSegment(gameID, branch, clientUID) {
    try {
      const segmentID = new mongoose.Types.ObjectId().toString();
      const loggingService = this.moduleContainer.get("logging");

      const newSegment = new Segments({
        gameID,
        branch: branch,
        segmentID,
        segmentName: "New segment",
        segmentConditions: [],
        usedTemplateIDs: [],
        segmentPlayerCount: 0,
      });

      await newSegment.save();

      loggingService.logAction(
        gameID,
        "segments",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: created new segment with iD | SUBJECT: ${segmentID}`
      );

      return [newSegment];
    } catch (error) {
      throw error;
    }
  }

  async getSegmentsByIdArray(
    gameID,
    branch,
    segmentIDs,
    includePlayersArray = false,
    includePlayersCount = false
  ) {
    try {
      const segmentIDsArray = Array.isArray(segmentIDs)
        ? segmentIDs
        : [segmentIDs];
      const segments = await Segments.find({
        gameID,
        branch: branch,
        segmentID: { $in: segmentIDsArray },
      }).lean();

      return segments.map((segment) => ({
        segmentID: segment.segmentID,
        segmentName: segment.segmentName,
        ...(includePlayersArray && {
          segmentPlayerIDs: segment.segmentPlayerIDs,
        }),
        ...(includePlayersCount && {
          segmentPlayerCount: segment.segmentPlayerCount,
        }),
      }));
    } catch (error) {
      console.error(error);
    }
  }

  async getAllSegments(gameID, branch) {
    try {
      let segments = await Segments.find({ gameID, branch: branch }).lean();

      if (!segments || segments.length === 0) {
        await new Segments({
          gameID,
          branch: branch,
          segmentID: "everyone",
          segmentName: "Everyone",
          segmentComment: "",
        }).save();
        segments = await Segments.find({ gameID, branch: branch }).lean();
      }

      const abTestService = this.moduleContainer.get("abtest");
      const abTests = await abTestService.getABTestsShort(gameID, branch);
      segments.forEach((segment) => {
        if (segment.segmentID.startsWith("abtest_")) {
          const testId = segment.segmentID.slice(7);
          segment.segmentName =
            abTests.abTests.find((t) => t.id === testId)?.name ||
            segment.segmentName;
        }
      });

      return segments;
    } catch (error) {
      throw error;
    }
  }

  async internalCreateSegment(
    gameID,
    branch,
    segmentName,
    segmentID,
    segmentComment,
    isStaticSegment
  ) {
    try {
      await new Segments({
        gameID,
        branch: branch,
        segmentID,
        segmentName,
        segmentComment,
        segmentConditions: [],
        usedTemplateIDs: [],
        isStaticSegment: isStaticSegment,
      }).save();
    } catch (error) {
      throw error;
    }
  }

  async internalSetSegmentPlayerCount(
    gameID,
    branch,
    segmentID,
    newPlayerCount
  ) {
    try {
      await Segments.updateOne(
        { gameID, branch: branch, segmentID },
        {
          $set: {
            segmentPlayerCount: newPlayerCount,
          },
        }
      );
    } catch (error) {
      throw error;
    }
  }

  async createStaticSegmentFromClientIDs(
    gameID,
    branch,
    environment,
    newSegmentName,
    clientIDs
  ) {
    const newSegmentID = nanoid();

    await this.internalCreateSegment(
      gameID,
      branch,
      newSegmentName,
      newSegmentID,
      "",
      true
    );
    const utilityService = this.moduleContainer.get("utility");

    const resp = await PWplayers.updateMany(
      {
        gameID: utilityService.getDemoGameID(gameID),
        branch: utilityService.getBranchWithoutSuffix(branch),
        environment: environment,
        clientID: { $in: clientIDs },
      },
      {
        $push: {
          segments: newSegmentID,
        },
      }
    );

    await this.internalSetSegmentPlayerCount(
      gameID,
      branch,
      newSegmentID,
      clientIDs.length
    );
  }

  async recalculateSegment(gameID, branch, environment, segmentID) {
    try {
      const contentCacherService = this.moduleContainer.get("contentCacher");
      await contentCacherService.trySetCache(
        `${gameID}:${branch}:segmentsRecalculationQueue:${segmentID}`,
        {
          recalculating: true,
        }
      );
      const resp = await axios.post(
        `${process.env.SDK_API_URL}/cacher/recalculateSegment`,
        {
          gameID: gameID,
          branch: branch,
          environment: environment,
          segmentID: segmentID,
        }
      );
    } catch (error) {
      console.error("Error in recalculateSegmentSize:", error.message);
      return {
        status: 200,
        json: { success: false, message: "Internal server error" },
      };
    }
  }

  async handleSegmentAfterRemovingTemplate(gameID, branch, templateID) {
    try {
      function recursivelyRemoveTemplate(conditions, templateID) {
        for (let i = 0; i < conditions.length; i++) {
          const conds = conditions[i];

          if (conds.conditionElementID === templateID) {
            if (i === 0 && conditions[i + 1]?.conditionOperator !== undefined) {
              conditions.splice(i + 1, 1);
            } else if (
              i === conditions.length - 1 &&
              conditions[i - 1]?.conditionOperator !== undefined
            ) {
              conditions.splice(i - 1, 1);
              i--;
            } else if (
              i > 0 &&
              i < conditions.length - 1 &&
              conditions[i + 1]?.conditionOperator !== undefined
            ) {
              conditions.splice(i + 1, 1);
            }
            conditions.splice(i, 1);
            i--;
          }
          if (conds.conditions) {
            recursivelyRemoveTemplate(conds.conditions, templateID);
            if (conds.conditions.length === 0) delete conds.conditions;
          }
        }
      }

      const segments = await Segments.find({
        gameID,
        branch: branch,
        usedTemplateIDs: templateID,
      }).lean();

      for (const segment of segments) {
        const modifiedConditions = segment.segmentConditions.map(
          (condition) => {
            if (condition.conditions) {
              recursivelyRemoveTemplate(condition.conditions, templateID);
              if (condition.conditions.length === 0)
                delete condition.conditions;
            }
            return condition;
          }
        );

        await Segments.updateOne(
          { gameID, branch: branch, segmentID: segment.segmentID },
          {
            $set: { segmentConditions: modifiedConditions },
            $pull: { usedTemplateIDs: templateID },
          }
        );
      }
    } catch (error) {
      console.error("Error removing template ID from segments:", error);
    }
  }
}
export default SegmentService;
