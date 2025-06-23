import { PlanningTreeModel } from "../../../models/planningTreeModel.js";
import { NodeModel } from "../../../models/nodeModel.js";
import { LocalizationItem } from "../../../models/localizationModel.js";
import { OffersModel as Offers } from "../../../models/offersModel.js";
import { BalanceModelFunctionsLinks } from "../../../models/balanceModelFunctionsLinks.js";
import { v4 as uuid } from "uuid";

export class NodeService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async checkEntityIDExists(gameID, branch, entityID) {
    try {
      const exists = await NodeModel.exists({
        branch: branch,
        gameID,
        "entityBasic.entityID": entityID,
      });

      return exists;
    } catch (error) {
      throw error;
    }
  }

  //  Search node by nodeID
  findNodeByNodeID(nodes, nodeID) {
    for (const node of nodes) {
      if (node.nodeID.toString() === nodeID) {
        return node;
      }
      const subnodeResult = this.findNodeByNodeID(node.subnodes, nodeID);
      if (subnodeResult) {
        return subnodeResult;
      }
    }
    return null;
  }

  // Search node by uniqueID
  findNodeById(nodes, uniqueID) {
    for (const node of nodes) {
      if (node.uniqueID === uniqueID) {
        return node;
      }
      const subnodeResult = this.findNodeById(node.subnodes, uniqueID);
      if (subnodeResult) {
        return subnodeResult;
      }
    }
    return null;
  }

  // Remove node by uniqueID
  removeNodeById(nodes, uniqueID) {
    const index = nodes.findIndex((node) => node.uniqueID === uniqueID);
    if (index !== -1) {
      return nodes.splice(index, 1)[0];
    }
    for (const node of nodes) {
      const removedNode = this.removeNodeById(node.subnodes, uniqueID);
      if (removedNode) {
        return removedNode;
      }
    }
    return null;
  }

  async saveEntityInheritedConfigs(
    gameID,
    branch,
    nodeID,
    inheritedConfigs,
    isCategory,
    clientUID,
    skipChangelog = false
  ) {
    try {
      const updateFields = {};
      if (inheritedConfigs !== "") {
        inheritedConfigs = JSON.parse(inheritedConfigs);
        inheritedConfigs = await Promise.all(
          inheritedConfigs.map(async (node) => {
            if (node.configs.length > 0) {
              node.configs = await this.uploadEntityFilesInConfigToBuckets(
                gameID,
                branch,
                node.configs
              );
            }
            return node;
          })
        );
        inheritedConfigs = JSON.stringify(inheritedConfigs);
      }

      if (isCategory) {
        updateFields[`entityCategory.inheritedConfigs`] = inheritedConfigs;
      } else {
        updateFields[`entityBasic.inheritedConfigs`] = inheritedConfigs;
      }

      await NodeModel.updateOne(
        {
          gameID,
          branch: branch,
          nodeID: nodeID,
        },
        { $set: updateFields }
      );

      if (!skipChangelog) {
        const loggingService = this.moduleContainer.get("logging");
        loggingService.logAction(
          gameID,
          "entities",
          `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed inherited config | SUBJECT: ${nodeID}`
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async uploadEntityFilesInConfigToBuckets(gameID, branch, configs) {
    // Iterate over configs array
    const utilityService = this.moduleContainer.get("utility");

    const resultConfigs = await Promise.all(
      configs.map(async (conf) => {
        // Iterate over conf.values array
        conf.values = await Promise.all(
          conf.values.map(async (value) => {
            if (value.type === "map") {
              // Skip if empty map
              if (!value.values || value.values.length === 0) {
                return value;
              }
              // If value.type is "map", iterate over value.values array
              value.values = await Promise.all(
                value.values.map(async (val) => {
                  if (
                    val.type === "any file" ||
                    val.type === "sound" ||
                    val.type === "video" ||
                    val.type === "image"
                  ) {
                    // Iterate over val.segments array
                    val.segments = await Promise.all(
                      val.segments.map(async (segment) => {
                        if (!utilityService.isHttpsUrl(segment.value)) {
                          const generatedLink =
                            await utilityService.uploadBase64FileToBucket(
                              segment.value,
                              `${gameID}`
                            );
                          segment.value = generatedLink;
                        }
                        return segment;
                      })
                    );
                  }
                  return val;
                })
              );
            } else {
              // If value.type is not "map", go straight to value.segments array
              if (
                value.type === "any file" ||
                value.type === "sound" ||
                value.type === "video" ||
                value.type === "image"
              ) {
                // Iterate over value.segments array
                value.segments = await Promise.all(
                  value.segments.map(async (segment) => {
                    if (!utilityService.isHttpsUrl(segment.value)) {
                      const generatedLink =
                        await utilityService.uploadBase64FileToBucket(
                          segment.value,
                          `${gameID}`
                        );
                      segment.value = generatedLink;
                    }
                    return segment;
                  })
                );
              }
            }
            return value;
          })
        );
        return conf;
      })
    );
    return resultConfigs;
  }

  async downloadEntityFilesFromBucketsToConfig(gameID, branch, configs) {
    // Iterate over configs array
    const utilityService = this.moduleContainer.get("utility");

    try {
      const resultConfigs = await Promise.all(
        configs.map(async (conf) => {
          // Iterate over conf.values array
          conf.values = await Promise.all(
            conf.values.map(async (value) => {
              if (value.type === "map") {
                // Skip if empty map
                if (!value.values || value.values.length === 0) {
                  return value;
                }
                // If value.type is "map", iterate over value.values array
                value.values = await Promise.all(
                  value.values.map(async (val) => {
                    if (
                      val.type === "sound" ||
                      val.type === "video" ||
                      val.type === "image"
                    ) {
                      // Iterate over val.segments array
                      val.segments = await Promise.all(
                        val.segments.map(async (segment) => {
                          if (utilityService.isHttpsUrl(segment.value)) {
                            const base64FromBucketFile =
                              await utilityService.downloadFileFromBucketAsBase64(
                                `${utilityService.getDemoGameID(gameID)}`,
                                utilityService.getFileNameFromUrl(segment.value)
                              );
                            segment.value = base64FromBucketFile;
                          }
                          return segment;
                        })
                      );
                    }
                    return val;
                  })
                );
              } else {
                // If value.type is not "map", go straight to value.segments array
                if (
                  value.type === "sound" ||
                  value.type === "video" ||
                  value.type === "image"
                ) {
                  // Iterate over value.segments array
                  value.segments = await Promise.all(
                    value.segments.map(async (segment) => {
                      if (utilityService.isHttpsUrl(segment.value)) {
                        const base64FromBucketFile =
                          await utilityService.downloadFileFromBucketAsBase64(
                            `${utilityService.getDemoGameID(gameID)}`,
                            utilityService.getFileNameFromUrl(segment.value)
                          );
                        segment.value = base64FromBucketFile;
                      }
                      return segment;
                    })
                  );
                }
              }
              return value;
            })
          );
          return conf;
        })
      );
      return resultConfigs;
    } catch (err) {
      console.error(err);
      return configs;
    }
  }

  async saveEntityMainConfigs(
    gameID,
    branch,
    nodeID,
    mainConfigs,
    isCategory,
    clientUID,
    skipChangelog = false
  ) {
    try {
      const updateFields = {};

      mainConfigs = await this.uploadEntityFilesInConfigToBuckets(
        gameID,
        branch,
        JSON.parse(mainConfigs)
      );
      mainConfigs = JSON.stringify(mainConfigs);

      if (isCategory) {
        updateFields[`entityCategory.mainConfigs`] = mainConfigs;
      } else {
        updateFields[`entityBasic.mainConfigs`] = mainConfigs;
      }

      await NodeModel.updateOne(
        {
          gameID,
          branch: branch,
          nodeID: nodeID,
        },
        { $set: updateFields }
      );

      if (!skipChangelog) {
        const loggingService = this.moduleContainer.get("logging");
        loggingService.logAction(
          gameID,
          "entities",
          `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed main config | SUBJECT: ${nodeID}`
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async saveEntityIcon(gameID, branch, nodeID, entityIcon, clientUID) {
    try {
      await NodeModel.updateOne(
        { gameID, branch, nodeID },
        { $set: { "entityBasic.entityIcon": entityIcon } },
        { new: true }
      );
      const loggingService = this.moduleContainer.get("logging");
      loggingService.logAction(
        gameID,
        "entities",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed entity icon for | SUBJECT: ${nodeID}`
      );
    } catch (error) {
      throw error;
    }
  }

  async saveEntityRoles(
    gameID,
    branch,
    nodeID,
    isCurrency,
    isInAppPurchase,
    realValueBase,
    clientUID
  ) {
    try {
      const updateFields = {
        "entityBasic.isCurrency": isCurrency,
        "entityBasic.isInAppPurchase": isInAppPurchase,
        "entityBasic.realValueBase": realValueBase,
      };

      await NodeModel.updateOne(
        { gameID, branch, nodeID },
        { $set: updateFields },
        { new: true }
      );
      const loggingService = this.moduleContainer.get("logging");
      loggingService.logAction(
        gameID,
        "entities",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed entity roles for | SUBJECT: ${nodeID}`
      );
    } catch (error) {
      throw error;
    }
  }

  async saveEntityBasicInfo(
    gameID,
    branch,
    nodeID,
    entityID,
    nodeName,
    isCategory,
    clientUID
  ) {
    try {
      const updateFields = {
        name: nodeName,
      };

      if (isCategory) {
        updateFields["entityCategory.categoryID"] = entityID;
      } else {
        updateFields["entityBasic.entityID"] = entityID;
      }

      await NodeModel.updateOne(
        { gameID, branch, nodeID },
        { $set: updateFields },
        { new: true }
      );
      const loggingService = this.moduleContainer.get("logging");
      loggingService.logAction(
        gameID,
        "entities",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed entity ID for | SUBJECT: ${nodeID}`
      );
    } catch (error) {
      throw error;
    }
  }

  async saveEntityGroupName(gameID, branch, nodeID, groupName, clientUID) {
    try {
      await NodeModel.updateOne(
        { gameID, branch, nodeID },
        { $set: { groupName } }
      );
      const loggingService = this.moduleContainer.get("logging");
      loggingService.logAction(
        gameID,
        "entities",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed entity group name for | SUBJECT: ${nodeID}`
      );
    } catch (error) {
      throw error;
    }
  }

  async getEntityIcon(gameID, branch, nodeID) {
    try {
      const node = await NodeModel.findOne(
        { gameID, branch, nodeID },
        { "entityBasic.entityIcon": 1, "entityCategory.entityIcon": 1 }
      );
      if (!node) return null;
      if (node.entityBasic && node.entityBasic.entityIcon) {
        return node.entityBasic.entityIcon;
      } else if (node.entityCategory && node.entityCategory.entityIcon) {
        return node.entityCategory.entityIcon;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async fetchEntityIcons(gameID, branch, nodeIDs) {
    try {
      const nodes = await NodeModel.find(
        { gameID, branch, nodeID: { $in: nodeIDs } },
        { _id: 0, nodeID: 1, entityBasic: 1, entityCategory: 1 }
      );
      const entityIcons = nodes.map((node) => {
        if (node.entityBasic && node.entityBasic.entityIcon) {
          return { nodeID: node.nodeID, icon: node.entityBasic.entityIcon };
        } else if (node.entityCategory && node.entityCategory.entityIcon) {
          return { nodeID: node.nodeID, icon: node.entityCategory.entityIcon };
        }
        return { nodeID: node.nodeID, icon: null };
      });
      return entityIcons;
    } catch (error) {
      throw error;
    }
  }

  async getEntitiesNames(gameID, branch, getRemoved = false) {
    try {
      const query = { gameID, branch };
      if (!getRemoved) {
        query.removed = { $ne: true };
      }
      const entities = await NodeModel.find(query, {
        _id: 0,
        name: 1,
        nodeID: 1,
      });
      return entities;
    } catch (error) {
      throw error;
    }
  }

  async getEntitiesIDs(gameID, branch, getRemoved = false) {
    try {
      // Assuming non-category nodes only have entityBasic defined and entityCategory is undefined.
      const query = { gameID, branch, entityCategory: { $exists: false } };
      if (!getRemoved) {
        query.removed = { $ne: true };
      }
      // Project only the fields you need
      const entities = await NodeModel.find(query, {
        _id: 0,
        nodeID: 1,
        "entityBasic.entityID": 1,
        "entityBasic.entityIcon": 1,
        "entityBasic.isCurrency": 1,
        "entityBasic.isInAppPurchase": 1,
        "entityBasic.realValueBase": 1,
        name: 1,
      });
      return entities || [];
    } catch (error) {
      throw error;
    }
  }

  async getEntitiesByNodeIDs(gameID, branch, nodeIDs, fetchIcons = true) {
    try {
      let projection = { _id: 0 };
      if (!fetchIcons) {
        projection["entityBasic.entityIcon"] = 0;
      }
      const entities = await NodeModel.find(
        { gameID, branch, nodeID: { $in: nodeIDs } },
        projection
      );
      return entities || [];
    } catch (error) {
      throw error;
    }
  }

  async getTree(gameID, branch) {
    const planningTree = await PlanningTreeModel.findOne({
      gameID,
      branch,
    }).lean();

    if (!planningTree) {
      return { success: false, message: "PlanningTree not found" };
    }
    const nodesTree = planningTree.nodes;

    if (!nodesTree) {
      return { success: false, message: "Destination node not found" };
    }
    return { success: true, nodes: nodesTree[0] };
  }

  async resolveEntityObjAfterMoving(gameID, branch, node, newParentID) {
    let planningTree = await this.getTree(gameID, branch);
    if (planningTree.success === false) return;
    planningTree = planningTree.nodes;

    async function getNodes() {
      const nodes = await NodeModel.find({
        gameID: gameID,
        branch: branch,
      }).lean();

      if (!nodes) {
        return { success: false, error: "No document found" };
      }

      return { success: true, nodes: nodes };
    }
    let nodes = await getNodes();
    if (nodes.success === false) return;
    // Losing the unnecessary "success" field
    nodes = nodes.nodes;

    let targetNode = nodes.find((n) => n.nodeID === node.ID);
    let entityConfigField =
      targetNode.entityCategory !== undefined
        ? "entityCategory"
        : "entityBasic";

    const getInheritance = (parentCategoryID) => {
      let tempCategories = [];

      const getInheritanceRecursively = (parentCategoryID) => {
        let inheritedNodeID = this.findNodeById(
          planningTree.subnodes,
          parentCategoryID
        );

        // Check if null. If so, it's Root
        if (inheritedNodeID === null) {
          if (planningTree.uniqueID === parentCategoryID) {
            inheritedNodeID = planningTree;
          }
        }

        let entityConfigField = inheritedNodeID.isCategory
          ? "entityCategory"
          : "entityBasic";

        inheritedNodeID = inheritedNodeID.nodeID;

        let inheritedNodeParentID = nodes.find(
          (n) => n.nodeID === inheritedNodeID
        )[entityConfigField].parentCategory;

        // If this node is nested, go recursive until we hit the root
        tempCategories.push(inheritedNodeID);
        if (inheritedNodeParentID && inheritedNodeParentID !== "") {
          getInheritanceRecursively(inheritedNodeParentID);
        }
      };
      getInheritanceRecursively(parentCategoryID);

      return tempCategories;
    };
    let newInheritedCategories = getInheritance(newParentID);

    const clearInheritedConfigs = () => {
      const inheritedCategoriesSet = new Set(newInheritedCategories);

      if (targetNode[entityConfigField].inheritedConfigs === "") return [];
      let nodeConfigs = JSON.parse(
        targetNode[entityConfigField].inheritedConfigs
      );
      if (nodeConfigs.inheritedConfigs) {
        delete nodeConfigs.inheritedConfigs;
      }

      const filteredInheritedConfigs = nodeConfigs
        .map((config) => {
          return {
            nodeID: config.nodeID,
            configs: config.configs,
          };
        })
        .filter((config) => {
          const { nodeID } = config;
          return inheritedCategoriesSet.has(nodeID);
        });

      return filteredInheritedConfigs;
    };

    let newInheritedConfigs = [];

    const addMissingInheritedConfigs = () => {
      newInheritedCategories.forEach((c) => {
        let category = nodes.find((n) => n.nodeID === c);
        newInheritedConfigs.push({
          nodeID: c,
          configs: category.entityCategory.mainConfigs,
        });
      });
    };
    addMissingInheritedConfigs();
    newInheritedConfigs = JSON.stringify(clearInheritedConfigs());

    targetNode = {
      ...targetNode,
      [entityConfigField]: {
        ...targetNode[entityConfigField],
        parentCategory: newParentID,
        inheritedCategories: newInheritedCategories,
        inheritedConfigs: newInheritedConfigs,
      },
    };

    const updateFields = {};
    updateFields[`${entityConfigField}.parentCategory`] =
      targetNode[entityConfigField].parentCategory;
    updateFields[`${entityConfigField}.inheritedCategories`] =
      targetNode[entityConfigField].inheritedCategories;
    updateFields[`${entityConfigField}.inheritedConfigs`] =
      targetNode[entityConfigField].inheritedConfigs;

    // Saving target node
    try {
      const saveNode = await NodeModel.updateOne(
        {
          gameID,
          branch: branch,
          nodeID: node.ID,
        },
        {
          $set: updateFields,
        },
        {
          new: true,
        }
      );
    } catch (error) {
      console.error("Error saving node while moving in tree:", error);
    }
    let updateLocalNodes = nodes.find((n) => n.nodeID === targetNode.nodeID);
    updateLocalNodes = Object.assign(updateLocalNodes, targetNode);

    // Now we must also resolve all children nodes' inheritedCategories
    const resolveChildren = async () => {
      const parentNode = this.findNodeById(
        planningTree.subnodes,
        node.uniqueID
      );

      if (parentNode.subnodes && parentNode.subnodes.length > 0) {
        parentNode.subnodes.forEach((subnode) => {
          const resolveChildRecursively = async (subnode) => {
            let child = nodes.find((n) => n.nodeID === subnode.nodeID);

            let entityConfigField = child.entityCategory
              ? "entityCategory"
              : "entityBasic";

            let inheritedCategories = getInheritance(
              child[entityConfigField].parentCategory
            );

            const updateFields = {};
            updateFields[`${entityConfigField}.inheritedCategories`] =
              inheritedCategories;

            // Saving child node
            const saveNode = NodeModel.updateOne(
              {
                gameID,
                branch: branch,
                nodeID: child.nodeID,
              },
              {
                $set: updateFields,
              },
              {
                new: true,
              }
            );

            if (subnode.subnodes && subnode.subnodes.length > 0) {
              subnode.subnodes.forEach((subnode) => {
                resolveChildRecursively(subnode);
              });
            }
          };
          resolveChildRecursively(subnode);
        });
      }
    };

    await resolveChildren();

    await Promise.all([
      await this.resolveLocalizationItems(gameID, branch, node.uniqueID),
      await this.resolveBalanceModelFunctionsLinks(
        gameID,
        branch,
        node.uniqueID
      ),
    ]);
    return;
  }

  async resolveLocalizationItems(gameID, branch, nodeUniqueID) {
    // Get the new updated tree
    let newTree = await this.getTree(gameID, branch);
    newTree = newTree.nodes;

    // Get the current node we just moved
    const targetNode = this.findNodeById(newTree.subnodes, nodeUniqueID);

    const resolveExitedItems = async (nodeID) => {
      // Find localization items related to this node with the new model
      let localizationItems = await LocalizationItem.find({
        gameID,
        branch,
        type: "entities",
        sid: { $regex: new RegExp(`^.*\\|${nodeID}$`) },
      });

      if (localizationItems && localizationItems.length > 0) {
        for (const item of localizationItems) {
          if (item.inheritedFrom) {
            // Get the category node that we inherit localized item from
            const parentCategory = this.findNodeByNodeID(
              newTree.subnodes,
              item.inheritedFrom
            );

            // Check if the target node is a child of the parent node
            if (parentCategory) {
              const targetNodeAsChild = this.findNodeByNodeID(
                parentCategory.subnodes,
                nodeID
              );

              if (!targetNodeAsChild) {
                // Delete all localization items that are inherited from the parent category
                // and "sid" contains this nodeID
                await LocalizationItem.deleteMany({
                  gameID,
                  branch,
                  type: "entities",
                  sid: { $regex: new RegExp(`^.*\\|${nodeID}$`) },
                  inheritedFrom: item.inheritedFrom,
                });
              }
            }
          }
        }
      }
    };

    const resolveJoinedItems = async (nodeID) => {
      // Find non-inherited localization items with the new model
      let localizationItems = await LocalizationItem.find({
        gameID,
        branch,
        type: "entities",
        inheritedFrom: { $exists: false },
      });

      if (localizationItems && localizationItems.length > 0) {
        for (const item of localizationItems) {
          const categoryNodeID = item.sid.split("|")[1];
          const parentCategory = this.findNodeByNodeID(
            newTree.subnodes,
            categoryNodeID
          );

          const targetNodeAsChild = parentCategory
            ? this.findNodeByNodeID(parentCategory.subnodes, nodeID)
            : null;

          if (targetNodeAsChild) {
            // Create a new localization item for the child node
            const newItem = {
              gameID,
              branch,
              type: "entities",
              sid: item.sid.split("|")[0] + "|" + nodeID,
              key: item.key,
              translations: item.translations,
              inheritedFrom: categoryNodeID,
              tags: item.tags || [],
            };

            // Insert the new item directly, avoiding the need to modify/copy the original
            const localizationService =
              this.moduleContainer.get("localization");
            await localizationService.insertLocalizationItem(
              gameID,
              branch,
              "entities",
              newItem
            );
          }
        }
      }
    };
    await Promise.all([
      resolveJoinedItems(targetNode.nodeID),
      resolveExitedItems(targetNode.nodeID),
    ]);

    const recursivelyResolveItems = async (node) => {
      if (node.subnodes) {
        for (const subnode of node.subnodes) {
          await resolveJoinedItems(subnode.nodeID);
          await resolveExitedItems(subnode.nodeID);
          await recursivelyResolveItems(subnode);
        }
      }
    };
    await recursivelyResolveItems(targetNode);
  }

  async resolveBalanceModelFunctionsLinks(gameID, branch, nodeUniqueID) {
    // Get the new updated tree
    let newTree = await this.getTree(gameID, branch);
    newTree = newTree.nodes;

    // Get the current node we just moved
    const targetNode = this.findNodeById(newTree.subnodes, nodeUniqueID);

    const resolveExitedItems = async (nodeID) => {
      // Find localization items related to this node with the new model
      let functionLinks = await BalanceModelFunctionsLinks.find({
        gameID,
        branch,
        nodeID,
        inheritedFromNodeID: { $ne: null },
      });

      if (functionLinks && functionLinks.length > 0) {
        for (const item of functionLinks) {
          if (item.inheritedFromNodeID) {
            // Get the category node that we inherit localized item from
            const parentCategory = this.findNodeByNodeID(
              newTree.subnodes,
              item.inheritedFromNodeID
            );

            // Check if the target node is a child of the parent node
            if (parentCategory) {
              const targetNodeAsChild = this.findNodeByNodeID(
                parentCategory.subnodes,
                nodeID
              );

              if (!targetNodeAsChild) {
                // Delete all link items that are inherited from the parent category
                await BalanceModelFunctionsLinks.deleteMany({
                  gameID,
                  branch,
                  nodeID: nodeID,
                  inheritedFromNodeID: item.inheritedFromNodeID,
                });
              }
            }
          }
        }
      }
    };

    const resolveJoinedItems = async (nodeID) => {
      // Find non-inherited links items with the new model
      let functionLinks = await BalanceModelFunctionsLinks.find({
        gameID,
        branch,
        inheritedFromNodeID: { $eq: null },
      });

      if (functionLinks && functionLinks.length > 0) {
        for (const item of functionLinks) {
          const categoryNodeID = item.nodeID;
          const parentCategory = this.findNodeByNodeID(
            newTree.subnodes,
            categoryNodeID
          );

          const targetNodeAsChild = parentCategory
            ? this.findNodeByNodeID(parentCategory.subnodes, nodeID)
            : null;

          if (targetNodeAsChild) {
            // Create a new link item for the child node
            let newItem = {
              ...JSON.parse(JSON.stringify(item)),
              nodeID: nodeID,
              inheritedFromNodeID: categoryNodeID,
            };
            delete newItem._id;
            // Insert the new item directly
            await BalanceModelFunctionsLinks.insertMany([newItem]);
          }
        }
      }
    };

    await Promise.all([
      resolveJoinedItems(targetNode.nodeID),
      resolveExitedItems(targetNode.nodeID),
    ]);

    const recursivelyResolveItems = async (node) => {
      if (node.subnodes) {
        for (const subnode of node.subnodes) {
          await resolveJoinedItems(subnode.nodeID);
          await resolveExitedItems(subnode.nodeID);
          await recursivelyResolveItems(subnode);
        }
      }
    };
    await recursivelyResolveItems(targetNode);
  }

  async removeNodeInheritance(gameID, branch, nodeID, isCategory) {
    console.log(
      "Removing node inheritance for gameID:",
      gameID,
      "branch:",
      branch,
      "nodeID:",
      nodeID,
      "isCategory:",
      isCategory
    );

    try {
      const updateFields = {};

      if (isCategory) {
        updateFields[`entityCategory.parentCategory`] = "";
        updateFields[`entityCategory.inheritedCategories`] = [];
        updateFields[`entityCategory.inheritedConfigs`] = "";
      } else {
        updateFields[`entityBasic.parentCategory`] = "";
        updateFields[`entityBasic.inheritedCategories`] = [];
        updateFields[`entityBasic.inheritedConfigs`] = "";
      }

      // Saving target node
      const resp = await NodeModel.updateOne(
        {
          gameID,
          branch: branch,
          nodeID: nodeID,
        },
        {
          $set: updateFields,
        },
        {
          new: true,
        }
      );
      console.log({ success: true, message: "Entity updated successfully" });
    } catch (error) {
      console.error(error);
    }
  }

  async moveNodeInPlanningTree(
    gameID,
    branch,
    planningType,
    nodeToMove,
    destinationID,
    clientUID
  ) {
    try {
      const planningTree = await PlanningTreeModel.findOne({
        gameID,
        branch: branch,
      });
      const destinationNode = this.findNodeById(
        planningTree.nodes,
        destinationID
      );

      const removedNode = this.removeNodeById(
        planningTree.nodes,
        nodeToMove.uniqueID
      );
      if (!removedNode) return;
      // Move node to the destination
      const findAndUpdateNode = async (nodes) => {
        for (const node of nodes) {
          if (node.uniqueID === destinationID) {
            // Fount children of a given parentId
            node.subnodes.push(removedNode);
            return;
          }

          if (node.subnodes.length > 0) {
            // Recursive find and update
            findAndUpdateNode(node.subnodes);
          }
        }
      };
      // Start searching and updating node
      findAndUpdateNode(planningTree?.nodes || []);

      await planningTree.save();

      if (planningType === "entity") {
        await this.resolveEntityObjAfterMoving(
          gameID,
          branch,
          nodeToMove,
          destinationID
        );
      }

      const loggingService = this.moduleContainer.get("logging");
      loggingService.logAction(
        gameID,
        "entities",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: moved node | SUBJECT: ${nodeToMove.nodeID}`
      );
      return { success: true, message: "Node moved successfully" };
    } catch (error) {
      console.error("Error moving node in tree:", error);
      return { success: false, message: "Node move failed" };
    }
  }

  async removeNodeFromTree(
    gameID,
    branch,
    planningType,
    nodeID,
    clientUID,
    byNodeID = false
  ) {
    try {
      let planningDocument = await PlanningTreeModel.findOne({
        gameID,
        branch: branch,
      });

      let success = false;
      await findAndRemoveNode(planningDocument.nodes);

      async function findAndRemoveNode(nodes) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if ((byNodeID ? node.nodeID : node.uniqueID) === nodeID) {
            nodes.splice(i, 1);
            await removeChildrenInheritance(node);
            await planningDocument.save();
            success = true;
            return;
          }
          if (node.subnodes && node.subnodes.length > 0) {
            await findAndRemoveNode(node.subnodes);
          }
        }
      }

      const removeChildrenInheritance = async (node) => {
        const iterateChildren = async (children) => {
          for (const n of children) {
            await this.removeNodeInheritance(
              gameID,
              branch,
              n.nodeID,
              n.isCategory
            );
            if (n.subnodes && n.subnodes.length > 0) {
              await iterateChildren(n.subnodes);
            }
          }
        };
        await this.removeNodeInheritance(
          gameID,
          branch,
          node.nodeID,
          node.isCategory
        );
        iterateChildren(node.subnodes);
      };

      if (success) {
        if (!byNodeID) {
          // If nodeID is a unique ID from tree
          await this.resolveLocalizationItems(gameID, branch, nodeID);
          await this.resolveBalanceModelFunctionsLinks(gameID, branch, nodeID);
        }

        const loggingService = this.moduleContainer.get("logging");
        loggingService.logAction(
          gameID,
          "entities",
          `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: removed from tree the node | SUBJECT: ${nodeID}`
        );
        return { success: true };
      }
    } catch (error) {
      throw error;
    }
  }

  async cancelEntityCreation(gameID, branch, nodeID) {
    try {
      // We may have created some stuff when user was making a config of an entity and decided to cancel everything
      await LocalizationItem.deleteMany({
        gameID: gameID,
        branch: branch,
        sid: { $regex: new RegExp(`^.*\\|${nodeID}$`) },
      });

      await BalanceModelFunctionsLinks.deleteMany({
        gameID: gameID,
        branch: branch,
        nodeID: nodeID,
      });
    } catch (error) {
      console.error(error);
    }
  }

  async removePlanningNode(gameID, branch, nodeID, clientUID) {
    try {
      // Get the node
      const node = await NodeModel.exists({
        gameID: gameID,
        branch: branch,
        nodeID: nodeID,
      });
      if (!node) {
        throw new Error("Node not found");
      }

      await this.removeNodeFromTree(
        gameID,
        branch,
        "entity",
        nodeID,
        clientUID,
        true
      );

      await LocalizationItem.deleteMany({
        gameID: gameID,
        branch: branch,
        sid: { $regex: new RegExp(`^.*\\|${nodeID}$`) },
      });

      await BalanceModelFunctionsLinks.deleteMany({
        gameID: gameID,
        branch: branch,
        nodeID: nodeID,
      });

      await NodeModel.updateOne(
        { gameID: gameID, branch: branch, nodeID: nodeID },
        {
          $set: { removed: true },
        }
      );

      // Remove a content node from all offers matching the gameID and branch
      await Offers.updateMany(
        { gameID, branch: branch },
        { $pull: { content: { nodeID: nodeID } } }
      );

      // Update the offerPrice fields for offers where the offerPrice.nodeID matches
      await Offers.updateMany(
        {
          gameID,
          branch: branch,
          "offerPrice.nodeID": nodeID,
        },
        {
          $set: {
            "offerPrice.targetCurrency": "money",
            "offerPrice.moneyCurr": [{ amount: 100, cur: "USD" }],
            "offerPrice.nodeID": null,
            "offerPrice.amount": 0,
          },
        }
      );

      return "Node and related data deleted successfully";
    } catch (error) {
      throw error;
    }
  }

  async addChildNodeInPlanningTree(
    gameID,
    branch,
    planningType,
    parentId,
    newNode,
    clientUID
  ) {
    try {
      const planningDocument = await PlanningTreeModel.findOne({
        gameID,
        branch: branch,
      }).exec();

      let success = false;

      const findAndUpdateNode = async (nodes) => {
        for (const node of nodes) {
          if (node.uniqueID === parentId) {
            const newNodeObject = {
              nodeID: newNode.ID,
              subnodes: [],
              isCategory: newNode.isCategory ? newNode.isCategory : false,
              uniqueID: newNode.uniqueID,
            };
            node.subnodes.push(newNodeObject);
            await planningDocument.save();
            success = true;
            return;
          }

          if (node.subnodes.length > 0) {
            await findAndUpdateNode(node.subnodes);
          }
        }
      };

      await findAndUpdateNode(planningDocument.nodes || []);

      if (success) {
        // Now we need to update the node itself with the new parentCategoryID
        let updateFields = {};
        if (newNode.isCategory) {
          updateFields[`entityCategory.parentCategory`] = parentId;
        } else {
          updateFields[`entityBasic.parentCategory`] = parentId;
        }

        // Saving target node
        const resp = await NodeModel.updateOne(
          {
            gameID,
            branch: branch,
            nodeID: newNode.ID,
          },
          {
            $set: updateFields,
          },
          {
            new: true,
          }
        );

        // Resolve localization items and balance model functions links so
        // child gets inheritance from it's parents
        await this.resolveLocalizationItems(gameID, branch, newNode.uniqueID);
        await this.resolveBalanceModelFunctionsLinks(
          gameID,
          branch,
          newNode.uniqueID
        );

        const loggingService = this.moduleContainer.get("logging");
        loggingService.logAction(
          gameID,
          "entities",
          `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: added child in tree to the node | SUBJECT: ${parentId}`
        );

        return { status: 200, success: true };
      } else {
        // If could not find a node with correct parentId
        return {
          status: 404,
          success: false,
          error: "Node with parentId not found",
        };
      }
    } catch (error) {
      console.error(error);
      return { status: 500, success: false, error: "Internal Server Error" };
    }
  }

  async getNodeTree(gameID, branch) {
    try {
      let existingDoc = await PlanningTreeModel.findOne({ gameID, branch });
      if (!existingDoc) {
        // Create a new document with a default root node
        existingDoc = await PlanningTreeModel.create({
          gameID,
          branch,
          nodes: [
            {
              nodeID: "Root",
              subnodes: [],
            },
          ],
        });
      }

      const nodesList = existingDoc.nodes || [];
      // Recursive transformation to return the tree in the desired format
      const transformNodes = (inputNodes) =>
        inputNodes.map(
          ({
            uniqueID,
            nodeID,
            subnodes,
            isGameplay,
            gameplayName,
            isCategory,
          }) => ({
            ID: nodeID,
            Subnodes: transformNodes(subnodes),
            uniqueID,
            isGameplay,
            gameplayName,
            isCategory,
          })
        );

      return transformNodes(nodesList);
    } catch (error) {
      throw error;
    }
  }

  async getPlanningNodes(gameID, branch) {
    try {
      const nodes = await NodeModel.find({ gameID, branch: branch }).lean();

      if (!nodes) {
        throw new Error("No nodes found");
      }

      const nodesList = nodes.filter((n) => !n.removed);
      return nodesList;
    } catch (error) {
      throw error;
    }
  }

  findEntityCategoryNodeIDs(node) {
    const entityCategoryNodeIDs = [];

    function traverse(node, path = []) {
      if (node.isCategory === false) {
        entityCategoryNodeIDs.push(node.nodeID);
      }
      path.push(node.nodeID);
      if (node.subnodes && node.subnodes.length > 0) {
        for (const subnode of node.subnodes) {
          traverse(subnode, [...path]);
        }
      }
    }

    traverse(node);
    return entityCategoryNodeIDs;
  }

  async findEntityById(gameID, branch, nodeID) {
    try {
      const tree = await PlanningTreeModel.findOne({ gameID, branch });
      if (!tree) {
        throw new Error("Planning document not found");
      }
      const nodes = tree.nodes || [];

      // Recursive search function for the node
      function findNode(node) {
        if (node.nodeID === nodeID) {
          return node;
        }
        if (node.subnodes && node.subnodes.length > 0) {
          for (const subnode of node.subnodes) {
            const found = findNode(subnode);
            if (found) {
              return found;
            }
          }
        }
        return null;
      }

      // Search through all top-level nodes
      for (const node of nodes) {
        const found = findNode(node);
        if (found) {
          return found;
        }
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async addEntityToParent(gameID, branch, parentId, newNode, isCategory) {
    try {
      const planningDocument = await PlanningTreeModel.findOne({
        gameID,
        branch,
      }).exec();
      if (!planningDocument) {
        return {
          status: 404,
          success: false,
          error: "Planning document not found",
        };
      }

      let success = false;
      let uniqueID = uuid();
      // Recursive helper function to find the parent node and add the new node
      const findAndUpdateNode = async (nodes) => {
        for (const node of nodes) {
          if (node.uniqueID === parentId) {
            const newNodeObject = {
              nodeID: newNode,
              subnodes: [],
              uniqueID: uniqueID,
              isCategory: isCategory,
            };
            node.subnodes.push(newNodeObject);
            success = true;
            return;
          }
          if (node.subnodes && node.subnodes.length > 0) {
            await findAndUpdateNode(node.subnodes);
          }
        }
      };

      findAndUpdateNode(planningDocument.nodes || []);
      await planningDocument.save();

      if (success) {
        // Resolve localization items and balance model functions links so
        // child gets inheritance from it's parents
        await this.resolveLocalizationItems(gameID, branch, uniqueID);
        await this.resolveBalanceModelFunctionsLinks(gameID, branch, uniqueID);

        return { status: 200, success: true };
      } else {
        return {
          status: 404,
          success: false,
          error: "Node with parentId not found",
        };
      }
    } catch (error) {
      console.error(error);
      return { status: 500, success: false, error: "Internal Server Error" };
    }
  }

  async addBasicEntityToParentInBulk(
    gameID,
    branch,
    parentIds,
    newNodes,
    isCategories
  ) {
    try {
      const planningDocument = await PlanningTreeModel.findOne({
        gameID,
        branch,
      }).exec();
      if (!planningDocument) {
        return {
          status: 404,
          success: false,
          error: "Planning document not found",
        };
      }

      let uniqueIDsToResolve = [];

      let success = false;
      const findAndUpdateNode = async (nodes, index) => {
        for (const node of nodes) {
          if (node.uniqueID === parentIds[index]) {
            let uniqueID = uuid();
            const newNodeObject = {
              nodeID: newNodes[index],
              subnodes: [],
              uniqueID: uniqueID,
              isCategory: isCategories[index],
            };

            uniqueIDsToResolve.push(uniqueID);

            node.subnodes.push(newNodeObject);
            success = true;
            return;
          }
          if (node.subnodes && node.subnodes.length > 0) {
            await findAndUpdateNode(node.subnodes, index);
          }
        }
      };

      await Promise.all(
        parentIds.map(async (parentId, index) => {
          await findAndUpdateNode(planningDocument.nodes || [], index);
        })
      );

      await planningDocument.save();

      for (let uniqueID of uniqueIDsToResolve) {
        // Resolve localization items and balance model functions links so
        // child gets inheritance from it's parents
        await this.resolveLocalizationItems(gameID, branch, uniqueID);
        await this.resolveBalanceModelFunctionsLinks(gameID, branch, uniqueID);
      }

      if (success) {
        return { status: 200, success: true };
      } else {
        return {
          status: 404,
          success: false,
          error: "Node with parentId not found",
        };
      }
    } catch (error) {
      console.error(error);
      return { status: 500, success: false, error: "Internal Server Error" };
    }
  }

  async createEntityBulk(gameID, branch, entityObjArray, clientUID) {
    try {
      // Check for required fields in the request
      if (
        !gameID ||
        !branch ||
        !entityObjArray ||
        entityObjArray.length === 0
      ) {
        throw new Error("Missing required fields");
      }

      // Create new node documents with the new flat schema
      const newNodes = entityObjArray.map((entityObj) => {
        return {
          gameID,
          branch,
          nodeID: entityObj.nodeID,
          name: entityObj.entityName,
          description: entityObj.entityDescription,
          techDescription: entityObj.entityTechDescription,
          entityCategory: entityObj.entityCategory,
          entityBasic: entityObj.entityBasic,
          groupName: entityObj.groupName,
        };
      });

      // Insert new nodes as individual documents
      await NodeModel.insertMany(newNodes);

      // Determine nodes that need to be immediately added under a parent category
      let nodesToPutInParents = [];
      newNodes.forEach((node) => {
        if (
          node.entityBasic &&
          node.entityBasic.entityID &&
          node.entityBasic.entityID !== "" &&
          node.entityBasic.parentCategory &&
          node.entityBasic.parentCategory !== ""
        ) {
          nodesToPutInParents.push(node);
        }
      });

      // If there are nodes to add to parent categories, process them in bulk
      if (nodesToPutInParents.length > 0) {
        await this.addBasicEntityToParentInBulk(
          gameID,
          branch,
          nodesToPutInParents.map((node) => node.entityBasic.parentCategory),
          nodesToPutInParents.map((node) => node.nodeID),
          nodesToPutInParents.map((node) => node.entityBasic.isCategory)
        );
        const loggingService = this.moduleContainer.get("logging");
        loggingService.logAction(
          gameID,
          "entities",
          `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: made bulk entities create | SUBJECT: ${nodesToPutInParents.map(
            (node) => node.nodeID
          )}`
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async createEntity(gameID, branch, newNodeID, entityObj) {
    try {
      if (!gameID || !branch || !entityObj) {
        throw new Error("Missing required fields");
      }
      const newNode = {
        gameID,
        branch,
        nodeID: newNodeID,
        name: entityObj.entityName,
        description: entityObj.entityDescription, // assume these are provided in the proper format
        techDescription: entityObj.entityTechDescription,
        entityCategory: entityObj.entityCategory,
        entityBasic: entityObj.entityBasic,
        groupName: entityObj.groupName,
      };

      // Create the new node document
      await NodeModel.create(newNode);

      // If this is a basic entity with a parent category, add it immediately
      if (entityObj.entityBasic && entityObj.entityBasic.entityID !== "") {
        if (entityObj.entityBasic.parentCategory !== "") {
          await this.addEntityToParent(
            gameID,
            branch,
            entityObj.entityBasic.parentCategory,
            newNodeID,
            false
          );
        }
      } else if (
        entityObj.entityCategory &&
        entityObj.entityCategory.parentCategory !== ""
      ) {
        // Otherwise, if it's a category entity, add it under its parent
        await this.addEntityToParent(
          gameID,
          branch,
          entityObj.entityCategory.parentCategory,
          newNodeID,
          true
        );
      }
    } catch (error) {
      throw error;
    }
  }

  async updateNode(gameID, branch, nodeID, fieldToUpdate, newField) {
    try {
      const node = await NodeModel.findOne({
        gameID,
        branch: branch,
        nodeID,
      });
      if (!node) {
        return { success: false, error: "Node not found" };
      }

      if (fieldToUpdate === "description") {
        node.description.content = newField;
      } else if (fieldToUpdate === "techDescription") {
        node.techDescription.content = newField;
      } else if (fieldToUpdate === "entityProperties") {
        node.entityProperties = newField;
      } else {
        return { success: false, error: "Invalid fieldToUpdate parameter" };
      }

      await node.save();
      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async getNode(gameID, branch, nodeID) {
    try {
      if (!gameID || !branch || !nodeID) {
        throw new Error("Missing required parameters: gameID, branch, nodeID");
      }

      // With the flat schema we can directly find the node
      const node = await NodeModel.findOne({ gameID, branch, nodeID }).lean();
      if (!node) return null;

      // Determine whether to operate on entityBasic or entityCategory
      const targetField = node.entityBasic ? "entityBasic" : "entityCategory";
      if (node[targetField]) {
        if (node[targetField].mainConfigs !== "") {
          node[targetField].mainConfigs =
            await this.downloadEntityFilesFromBucketsToConfig(
              gameID,
              branch,
              JSON.parse(node[targetField].mainConfigs)
            );
          node[targetField].mainConfigs = JSON.stringify(
            node[targetField].mainConfigs
          );
        }

        if (node[targetField].inheritedConfigs !== "") {
          node[targetField].inheritedConfigs = JSON.parse(
            node[targetField].inheritedConfigs
          );

          node[targetField].inheritedConfigs = await Promise.all(
            node[targetField].inheritedConfigs.map(async (cfg) => {
              if (cfg.configs.length > 0) {
                cfg.configs = await this.downloadEntityFilesFromBucketsToConfig(
                  gameID,
                  branch,
                  cfg.configs
                );
              }
              return cfg;
            })
          );

          node[targetField].inheritedConfigs = JSON.stringify(
            node[targetField].inheritedConfigs
          );
        }
      }
      return node;
    } catch (error) {
      throw error;
    }
  }

  async getCurrencyEntities(gameID, branch) {
    try {
      const foundNodes = await NodeModel.find(
        { gameID, branch, "entityBasic.isCurrency": true },
        {
          _id: 0,
          "entityBasic.mainConfigs": 0,
          "entityBasic.inheritedConfigs": 0,
          "entityBasic.entityIcon": 0,
          "entityBasic.parentCategory": 0,
          "entityBasic.inheritedCategories": 0,
        }
      ).lean();
      return foundNodes;
    } catch (error) {
      throw error;
    }
  }

  async clearSegmentValuesInEntityConfig(
    gameID,
    branch,
    nodeID,
    segmentID,
    clientUID
  ) {
    try {
      // Check for required parameters
      if (!gameID || !branch || !nodeID) {
        throw new Error("Missing required parameters: gameID, branch, nodeID");
      }

      let entity = await NodeModel.findOne({
        gameID,
        branch: branch,
        nodeID: nodeID,
      }).lean();

      let targetField = entity.entityBasic ? "entityBasic" : "entityCategory";
      let isCategory;
      if (targetField === "entityBasic") {
        isCategory = false;
      } else {
        isCategory = true;
      }

      let mainConfigs = entity[targetField].mainConfigs;
      let inheritedConfigs = entity[targetField].inheritedConfigs;

      function traverseConfig(config) {
        if (config.values && config.values.length > 0) {
          config.values = config.values.map((value) => {
            if (value.values) {
              value.values = value.values.map((val) => {
                val.segments.filter((s) => s.segmentID !== segmentID);
                return val;
              });
            } else {
              value.segments = value.segments.filter(
                (s) => s.segmentID !== segmentID
              );
            }
            return value;
          });
        }
        return config;
      }

      if (mainConfigs !== "") {
        try {
          console.log("mainConfigs", mainConfigs);

          mainConfigs = JSON.parse(mainConfigs).map((config) => {
            return traverseConfig(config);
          });

          this.saveEntityMainConfigs(
            gameID,
            branch,
            nodeID,
            JSON.stringify(mainConfigs),
            isCategory,
            clientUID,
            true
          );
        } catch (err) {
          // Its okay to get errors here. It may mean that there are nothing in config to parse
          // console.error(err);
        }
      }

      if (inheritedConfigs !== "") {
        try {
          console.log("inheritedConfigs", inheritedConfigs);
          inheritedConfigs = JSON.parse(inheritedConfigs).map((node) => {
            if (node.configs && node.configs.length > 0) {
              node.configs.map((config) => {
                return traverseConfig(config);
              });
            }
            return node;
          });
          this.saveEntityInheritedConfigs(
            gameID,
            branch,
            nodeID,
            JSON.stringify(inheritedConfigs),
            isCategory,
            clientUID,
            true
          );
        } catch (err) {
          // Its okay to get errors here. It may mean that there are nothing in config to parse
          // console.error(err);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async applySegmentValueToEveryoneInEntityConfig(
    gameID,
    branch,
    nodeID,
    segmentID,
    clientUID
  ) {
    try {
      // Check for required parameters
      if (!gameID || !branch || !nodeID || !segmentID) {
        throw new Error(
          "Missing required parameters: gameID, branch, nodeID, segmentID"
        );
      }

      let entity = await NodeModel.findOne({
        gameID,
        branch: branch,
        nodeID: nodeID,
      }).lean();

      let targetField = entity.entityBasic ? "entityBasic" : "entityCategory";
      let isCategory = targetField === "entityCategory";

      let mainConfigs = entity[targetField].mainConfigs;
      let inheritedConfigs = entity[targetField].inheritedConfigs;

      function traverseConfig(config) {
        if (config.values && config.values.length > 0) {
          config.values = config.values.map((value) => {
            if (value.values) {
              // Handle nested values (maps)
              value.values = value.values.map((val) => {
                // Find the segment we want to apply
                const sourceSegment = val.segments.find(
                  (s) => s.segmentID === segmentID
                );
                if (sourceSegment) {
                  // Find the "everyone" segment
                  const everyoneSegment = val.segments.find(
                    (s) => s.segmentID === "everyone"
                  );
                  if (everyoneSegment) {
                    // Apply the value from the specified segment to "everyone"
                    everyoneSegment.value = sourceSegment.value;
                  }
                }
                return val;
              });
            } else {
              // Handle direct values
              const sourceSegment = value.segments.find(
                (s) => s.segmentID === segmentID
              );
              if (sourceSegment) {
                const everyoneSegment = value.segments.find(
                  (s) => s.segmentID === "everyone"
                );
                if (everyoneSegment) {
                  everyoneSegment.value = sourceSegment.value;
                }
              }
            }
            return value;
          });
        }
        return config;
      }

      if (mainConfigs !== "") {
        try {
          console.log("Applying segment values to everyone in mainConfigs");

          let parsedMainConfigs = JSON.parse(mainConfigs);
          parsedMainConfigs = parsedMainConfigs.map((config) => {
            return traverseConfig(config);
          });

          await this.saveEntityMainConfigs(
            gameID,
            branch,
            nodeID,
            JSON.stringify(parsedMainConfigs),
            isCategory,
            clientUID,
            true
          );
        } catch (err) {
          console.error("Error processing mainConfigs:", err);
        }
      }

      if (inheritedConfigs !== "") {
        try {
          console.log(
            "Applying segment values to everyone in inheritedConfigs"
          );

          let parsedInheritedConfigs = JSON.parse(inheritedConfigs);
          parsedInheritedConfigs = parsedInheritedConfigs.map((node) => {
            if (node.configs && node.configs.length > 0) {
              node.configs = node.configs.map((config) => {
                return traverseConfig(config);
              });
            }
            return node;
          });

          await this.saveEntityInheritedConfigs(
            gameID,
            branch,
            nodeID,
            JSON.stringify(parsedInheritedConfigs),
            isCategory,
            clientUID,
            true
          );
        } catch (err) {
          console.error("Error processing inheritedConfigs:", err);
        }
      }

      await this.clearSegmentValuesInEntityConfig(
        gameID,
        branch,
        nodeID,
        `abtest_${testObject.id}`,
        clientUID
      );

      return {
        success: true,
        message: `Successfully applied values from segment "${segmentID}" to "everyone" segment`,
      };
    } catch (error) {
      console.error("Error applying segment values:", error);
      return {
        success: false,
        message: error.message,
      };
    }
  }
}

export default NodeService;
