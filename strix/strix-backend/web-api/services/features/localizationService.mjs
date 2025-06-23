import { PlanningTreeModel } from "../../../models/planningTreeModel.js";
import {
  LocalizationItem,
  GameLocalizationSettings,
} from "../../../models/localizationModel.js";

export class LocalizationService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async getGameLocalizationSettings(gameID, branch) {
    try {
      const doc = await GameLocalizationSettings.findOne(
        { gameID, branch },
      ).lean();
      return doc;
    } catch (error) {
      throw error;
    }
  }

  async updateGameLocalizationSettingsTag(
    gameID,
    branch,
    tag,
    operation
  ) {
    try {
      let updateOperator;
      if (operation === "add") {
        updateOperator = { $addToSet: { tags: tag } };
      } else if (operation === "remove") {
        updateOperator = { $pull: { tags: tag } };
      } else {
        throw new Error("Invalid operation. Use 'add' or 'remove'.");
      }
      const updatedDoc = await GameLocalizationSettings.findOneAndUpdate(
        { gameID, branch },
        updateOperator,
        { new: true, upsert: true }
      );
      return updatedDoc;
    } catch (error) {
      throw error;
    }
  }

  async updateGameLocalizationSettingsPrefixGroup(
    gameID,
    branch,
    prefixGroup,
  ) {
    try {
      let updateOperator = { $set: { prefixGroups: prefixGroup } };
      const updatedDoc = await GameLocalizationSettings.findOneAndUpdate(
        { gameID, branch },
        updateOperator,
        { new: true, upsert: true }
      );
      return updatedDoc;
    } catch (error) {
      throw error;
    }
  }

  async changeLocalizationItemKey(
    gameID,
    branch,
    type,
    sid,
    newKey
  ) {
    try {
      const result = await LocalizationItem.findOneAndUpdate(
        {
          gameID,
          branch,
          type,
          sid,
        },
        {
          $set: { key: newKey },
        },
        { new: true }
      ).exec();

      return result;
    } catch (error) {
      throw error;
    }
  }

  async removeLocalizationItem(gameID, branch, type, sid) {
    try {
      const result = await LocalizationItem.deleteMany({
        gameID,
        branch,
        type,
        sid: { $regex: new RegExp(`^${sid}\\|`) },
      }).exec();

      return { deletedCount: result.deletedCount };
    } catch (error) {
      throw error;
    }
  }

  async getLocalizationItems(gameID, branch, type, sids) {
    try {
      const localizations = await LocalizationItem.find({
        gameID,
        branch,
        type,
        sid: { $in: sids },
      }).exec();

      return localizations;
    } catch (error) {
      throw error;
    }
  }

  async getLocalizationTable(gameID, branch) {
    try {
      // Get all items for this game and branch
      const items = await LocalizationItem.find({
        gameID,
        branch,
      }).exec();

      // Group them by type to maintain backward compatibility with the data structure
      const result = {
        offers: items.filter((item) => item.type === "offers"),
        entities: items.filter((item) => item.type === "entities"),
        custom: items.filter((item) => item.type === "custom"),
      };

      return result.length !== 0 ? result : null;
    } catch (error) {
      throw error;
    }
  }

  async getLocalization(gameID, branch, type) {
    try {
      const items = await LocalizationItem.find({
        gameID,
        branch,
        type,
      }).exec();

      return items;
    } catch (error) {
      throw error;
    }
  }

  async updateLocalization(
    gameID,
    branch,
    type,
    translationObjects,
    categoryNodeID
  ) {
    try {
      // Validate type
      if (!["offers", "entities", "custom"].includes(type)) {
        throw new Error("Invalid localization type");
      }

      // Get existing localization items for this type
      const existingItems = await LocalizationItem.find({
        gameID,
        branch,
        type,
      }).exec();

      // Process each translation object
      for (const translation of translationObjects) {
        const sid = translation.sid;
        const key = translation.key;

        // Format translations
        const values = Object.keys(translation.translations).map((code) => ({
          code,
          value: translation.translations[code],
        }));

        // Check if this item already exists
        const existingItem = existingItems.find((item) => item.sid === sid);

        if (existingItem) {
          // Update existing item
          await LocalizationItem.updateOne(
            { gameID, branch, type, sid },
            {
              $set: {
                key,
                tags: translation.tags,
                translations: values,
              },
            }
          ).exec();
        } else {
          // Create new item
          const newItem = {
            gameID,
            branch,
            type,
            sid,
            key,
            translations: values,
            tags: [],
          };

          // Add inheritedFrom if provided
          if (categoryNodeID) {
            newItem.inheritedFrom = categoryNodeID;
          }

          await LocalizationItem.create(newItem);

          // Handle entity type special case
          if (type === "entities") {
            await this.makeLocalizationForCategoryChildren(
              gameID,
              branch,
              translation.sid.split("|")[1],
              translationObjects
            );
          }
        }
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async insertLocalizationItem(
    gameID,
    branch,
    type,
    translationObject
  ) {
    try {
      // Transform to new model format
      const item = {
        gameID,
        branch,
        type,
        sid: translationObject.sid,
        key: translationObject.key,
        inheritedFrom: translationObject.inheritedFrom,
        tags: translationObject.tags || [],
        translations: translationObject.translations,
      };

      // Create new document
      const result = await LocalizationItem.create(item);

      return result;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async makeLocalizationForCategoryChildren(
    gameID,
    branch,
    categoryNodeID,
    translationObjects
  ) {
    try {
      let planningTree = await PlanningTreeModel.findOne({ gameID, branch });
      if (!planningTree) {
        return { success: false, message: "PlanningTree not found" };
      }

      const categoryNode = this.findNodeByNodeID(planningTree.nodes, categoryNodeID);
      if (!categoryNode) {
        return { success: false, message: "Category node not found" };
      }

      const recursivelyMakeItems = async (node) => {
        if (node.subnodes) {
          for (const subnode of node.subnodes) {
            const modifiedObjects = translationObjects.map((obj) => ({
              ...obj,
              sid: obj.sid.split("|")[0] + "|" + subnode.nodeID,
            }));

            await this.updateLocalization(
              gameID,
              branch,
              "entities",
              modifiedObjects,
              categoryNode.nodeID
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

  async getLocalizationItemsByTags(gameID, branch, tags) {
    try {
      return await LocalizationItem.find({
        gameID,
        branch,
        tags: { $all: tags },
      }).exec();
    } catch (error) {
      throw error;
    }
  }

  async addTagsToLocalizationItem(gameID, branch, sid, tags) {
    try {
      return await LocalizationItem.findOneAndUpdate(
        { gameID, branch, sid },
        { $addToSet: { tags: { $each: tags } } },
        { new: true }
      ).exec();
    } catch (error) {
      throw error;
    }
  }

  async removeTagsFromLocalizationItem(
    gameID,
    branch,
    sid,
    tags
  ) {
    try {
      return await LocalizationItem.findOneAndUpdate(
        { gameID, branch, sid },
        { $pull: { tags: { $in: tags } } },
        { new: true }
      ).exec();
    } catch (error) {
      throw error;
    }
  }

  // Helper function that needs to be imported from other service
  findNodeByNodeID(nodes, nodeID) {
    // This function should be imported from entity/node service
    // For now, keeping a basic implementation
    function searchNode(node) {
      if (node.nodeID === nodeID) {
        return node;
      }
      if (node.subnodes) {
        for (const subnode of node.subnodes) {
          const found = searchNode(subnode);
          if (found) return found;
        }
      }
      return null;
    }

    for (const node of nodes) {
      const found = searchNode(node);
      if (found) return found;
    }
    return null;
  }
}

export default LocalizationService;