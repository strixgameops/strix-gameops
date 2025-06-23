import { BalanceModelFunctions } from "../../../models/balanceModelFunctions.js";
import { BalanceModelVariables } from "../../../models/balanceModelVariables.js";
import { BalanceModelSegments } from "../../../models/balanceModelSegments.js";
import { BalanceModelTabs } from "../../../models/balanceModelTabs.js";
import { BalanceModelFunctionsLinks } from "../../../models/balanceModelFunctionsLinks.js";
import { PlanningTreeModel } from "../../../models/planningTreeModel.js";

export class BalanceModelService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async getBalanceModel(gameID, branch, specificTypes) {
    let functions;
    let segments;
    let variables;
    let tabs;
    let links;
    if (specificTypes && specificTypes.length > 0) {
      await Promise.all(
        specificTypes.map(async (type) => {
          switch (type) {
            case "functions":
              functions = await BalanceModelFunctions.find({
                gameID,
                branch,
              }).lean();
              break;
            case "segments":
              segments = await BalanceModelSegments.find({
                gameID,
                branch,
              }).lean();
              break;
            case "variables":
              variables = await BalanceModelVariables.find({
                gameID,
                branch,
              }).lean();
              break;
            case "tabs":
              tabs = await BalanceModelTabs.find({ gameID, branch }).lean();
              break;
            case "links":
              links = await BalanceModelFunctionsLinks.find({
                gameID,
                branch,
              }).lean();
              break;
          }
        })
      );
    } else {
      functions = await BalanceModelFunctions.find({ gameID, branch }).lean();
      segments = await BalanceModelSegments.find({ gameID, branch }).lean();
      variables = await BalanceModelVariables.find({ gameID, branch }).lean();
      tabs = await BalanceModelTabs.find({ gameID, branch }).lean();
      links = await BalanceModelFunctionsLinks.find({ gameID, branch }).lean();
    }
    return { functions, segments, variables, tabs, links };
  }

  async gameModelCreateOrUpdateTab(gameID, branch, tabID, tabName) {
    try {
      const filter = { gameID, branch, tabID };
      const update = {
        gameID,
        branch,
        tabID,
        tabName,
      };
      // upsert option creates a new doc if none matches
      return await BalanceModelTabs.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
      });
    } catch (error) {
      console.error("Error in gameModelCreateOrUpdateVariable:", error);
      throw error;
    }
  }

  async gameModelRemoveTab(gameID, branch, tabID) {
    try {
      await BalanceModelTabs.deleteOne({
        gameID,
        branch,
        tabID,
      });
      await this.gameModelRemoveAllByCategory(gameID, branch, tabID);
      return;
    } catch (error) {
      console.error("Error in gameModelRemoveVariable:", error);
      throw error;
    }
  }

 

  async gameModelUpdateSegmentOverride(gameID, branch, segmentID, variableID, value) {
    try {
      // Find the segment document
      let segment = await BalanceModelSegments.findOne({
        gameID,
        branch,
        segmentID,
      });

      if (!segment) {
        segment = new BalanceModelSegments({
          gameID,
          branch,
          segmentID,
          overrides: [],
        });
      }

      // Look for an existing override with the provided variableID
      const overrideIndex = segment.overrides.findIndex(
        (override) => override.variableID === variableID
      );

      if (overrideIndex !== -1) {
        if (value === null) {
          // If no value provided (null), remove it
          segment.overrides.splice(overrideIndex, 1);
        } else {
          // Update the value of the existing override
          segment.overrides[overrideIndex].value = value;
        }
      } else {
        if (value === null) {
          // Do not do anything if the value is null
        } else {
          // Add a new override object to the array
          segment.overrides.push({ variableID, value });
        }
      }

      return await segment.save();
    } catch (error) {
      console.error("Error in gameModelUpdateSegmentOverride:", error);
      throw error;
    }
  }

  

  async gameModelCreateOrUpdateVariable(gameID, branch, variableID, variableName, variableComment, variableType, defaultValue, respectiveCategory) {
    try {
      const filter = { gameID, branch, variableID };
      const update = {
        gameID,
        branch,
        variableID,
        variableName,
        variableComment,
        variableType,
        defaultValue,
        respectiveCategory,
      };
      // upsert option creates a new doc if none matches
      return await BalanceModelVariables.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
      });
    } catch (error) {
      console.error("Error in gameModelCreateOrUpdateVariable:", error);
      throw error;
    }
  }

  async gameModelRemoveVariable(gameID, branch, variableID) {
    try {
      await BalanceModelVariables.deleteOne({
        gameID,
        branch,
        variableID,
      });
      let segments = await BalanceModelSegments.find({
        gameID,
        branch,
        overrides: { $elemMatch: { variableID } },
      });
      await Promise.all(
        segments.map(async (segment) => {
          segment.overrides = segment.overrides.filter(
            (override) => override.variableID !== variableID
          );
          segment.save();
        })
      );
      return;
    } catch (error) {
      console.error("Error in gameModelRemoveVariable:", error);
      throw error;
    }
  }

  async gameModelCreateOrUpdateFunction(gameID, branch, functionID, changes) {
    try {
      const filter = { gameID, branch, functionID };
      const update = {
        gameID,
        branch,
        ...changes,
      };
      return await BalanceModelFunctions.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
      });
    } catch (error) {
      console.error("Error in gameModelCreateOrUpdateFunction:", error);
      throw error;
    }
  }

  async gameModelRemoveFunction(gameID, branch, functionID) {
    try {
      return await BalanceModelFunctions.deleteOne({
        gameID,
        branch,
        functionID,
      });
    } catch (error) {
      console.error("Error in gameModelRemoveFunction:", error);
      throw error;
    }
  }

  async gameModelRemoveAllByCategory(gameID, branch, respectiveCategory) {
    try {
      const functionsResult = await BalanceModelFunctions.deleteMany({
        gameID,
        branch,
        respectiveCategory,
      });
      const variablesResult = await BalanceModelVariables.deleteMany({
        gameID,
        branch,
        respectiveCategory,
      });
      return {
        functionsDeleted: functionsResult.deletedCount,
        variablesDeleted: variablesResult.deletedCount,
      };
    } catch (error) {
      console.error("Error in gameModelRemoveAllByCategory:", error);
      throw error;
    }
  }

  async gameModelManageFunctionLinkedConfigValue(gameID, branch, valueSID, actionType, changes) {
    try {
      switch (actionType) {
        case "set":
          await this.setOrChangeLinkedItemInFunction(gameID, branch, changes);
          break;
        case "setPath":
          await this.setLinkedItemOutputPath(gameID, branch, changes);
          break;
        case "remove":
          await this.removeLinkedItemFromFunctions(gameID, branch, valueSID);
          break;
      }
    } catch (error) {
      console.error("Error in addLinkedEntityToFunction:", error);
      throw error;
    }
  }

  async setLinkedItemOutputPath(gameID, branch, { nodeID, valueSID, outputPath, inheritedFromNodeID }) {
    try {
      await BalanceModelFunctionsLinks.updateOne(
        {
          gameID,
          branch,
          valueSID,
          nodeID,
          inheritedFromNodeID,
        },
        {
          $set: {
            outputPath: outputPath,
          },
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  async setOrChangeLinkedItemInFunction(gameID, branch, { valueSID, valueID, valueType, nodeID, linkedFunctionID }) {
    try {
      await BalanceModelFunctionsLinks.updateOne(
        {
          gameID,
          branch,
          valueSID: valueSID,
          nodeID: nodeID,
          inheritedFromNodeID: null, // means that this node is the main parent
        },
        {
          $set: {
            valueSID,
            valueID,
            valueType,
            nodeID,
            inheritedFromNodeID: null, // means that this node is the main parent
            linkedFunctionID,
          },
        },
        { upsert: true }
      );

      await this.makeLinksForChildren(gameID, branch, nodeID);
    } catch (error) {
      console.error(error);
    }
  }

  async makeLinksForChildren(gameID, branch,categoryNodeID) {
    try {
      let planningTree = await PlanningTreeModel.findOne({ gameID, branch });
      if (!planningTree) {
        return { success: false, message: "PlanningTree not found" };
      }

      const categoryNode = this.findNodeByNodeID(
        planningTree.nodes,
        categoryNodeID
      );
      if (!categoryNode) {
        return { success: false, message: "Category node not found" };
      }

      const recursivelyMakeItems = async (node) => {
        if (node.subnodes) {
          for (const subnode of node.subnodes) {
            await BalanceModelFunctionsLinks.updateOne(
              {
                gameID,
                branch,
                valueSID: valueSID,
                nodeID: subnode.nodeID,
                inheritedFromNodeID: nodeID,
              },
              {
                $set: {
                  valueSID,
                  valueID,
                  valueType,
                  nodeID: subnode.nodeID,
                  inheritedFromNodeID: categoryNodeID,
                  linkedFunctionID,
                },
              },
              { upsert: true }
            );

            await recursivelyMakeItems(subnode);
          }
        }
      };

      await recursivelyMakeItems(categoryNode);
      return { success: true };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async removeLinkedItemFromFunctions(gameID, branch, valueSID) {
    try {
      return await BalanceModelFunctionsLinks.deleteMany({
        gameID,
        branch,
        valueSID,
      });
    } catch (error) {
      console.error(error);
    }
  }

  findNodeByNodeID(nodes, nodeID) {
    // Helper function to find node by ID recursively
    for (const node of nodes) {
      if (node.nodeID === nodeID) {
        return node;
      }
      if (node.subnodes) {
        const found = this.findNodeByNodeID(node.subnodes, nodeID);
        if (found) return found;
      }
    }
    return null;
  }
}
export default BalanceModelService;