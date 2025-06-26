export class NodeController {
  constructor(nodeService) {
    this.nodeService = nodeService;
  }

  async getNode(req, res, next) {
    try {
      const { gameID, branch, nodeID } = req.body;

      const foundNode = await this.nodeService.getNode(gameID, branch, nodeID);

      if (foundNode) {
        res.status(200).json(foundNode);
      } else {
        res.status(404).json({ error: "Node not found" });
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async updateNode(req, res, next) {
    const { gameID, branch, nodeID, fieldToUpdate, newField } = req.body;
    const clientUID = req.clientUID;
    try {
      const updateResult = await this.nodeService.updateNode(
        gameID,
        branch,
        nodeID,
        fieldToUpdate,
        newField,
        clientUID
      );

      if (updateResult.success) {
        res
          .status(200)
          .json({ success: true, message: "Node updated successfully" });
      } else {
        res.status(404).json({ success: false, message: updateResult.error });
      }
    } catch (error) {
      console.error("Error updating node:", error);
      next(error);
    }
  }

  async createEntity(req, res, next) {
    try {
      const { gameID, branch, newNodeID, entityObj } = req.body;
      const clientUID = req.clientUID;

      await this.nodeService.createEntity(
        gameID,
        branch,
        newNodeID,
        entityObj,
        clientUID
      );

      res
        .status(201)
        .json({ success: true, message: "Empty node created successfully" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async createEntityBulk(req, res, next) {
    try {
      const { gameID, branch, entityObjArray } = req.body;
      const clientUID = req.clientUID;

      await this.nodeService.createEntityBulk(
        gameID,
        branch,
        entityObjArray,
        clientUID
      );

      res
        .status(201)
        .json({ success: true, message: "Empty node created successfully" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async findNodeById(req, res, next) {
    try {
      const { nodeID, gameID, branch } = req.query;

      if (!nodeID) {
        return res.status(400).json({ message: "nodeID is required" });
      }

      const foundNode = await this.nodeService.findEntityById(
        gameID,
        branch,
        nodeID
      );

      if (!foundNode) {
        return res.status(404).json({ message: "Node not found" });
      }

      const entityCategoryNodeIDs =
        this.nodeService.findEntityCategoryNodeIDs(foundNode);

      res.status(200).json({ entityCategoryNodeIDs });
    } catch (error) {
      console.error("Error finding node by ID:", error);
      next(error);
    }
  }

  async removePlanningNode(req, res, next) {
    try {
      const { gameID, branch, nodeID } = req.body;
      const clientUID = req.clientUID;

      if (!gameID || !branch || !nodeID) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required parameters" });
      }

      const response = await this.nodeService.removePlanningNode(
        gameID,
        branch,
        nodeID,
        clientUID
      );
      res.status(200).json({ success: true, message: response });
    } catch (error) {
      console.error("Error in removePlanningNode:", error);
      next(error);
    }
  }

  async cancelEntityCreation(req, res, next) {
    try {
      const { gameID, branch, nodeID } = req.body;
      const clientUID = req.clientUID;

      if (!gameID || !branch || !nodeID) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required parameters" });
      }

      const response = await this.nodeService.cancelEntityCreation(
        gameID,
        branch,
        nodeID,
        clientUID
      );
      res.status(200).json({ success: true, message: response });
    } catch (error) {
      console.error("Error in cancelEntityCreation:", error);
      next(error);
    }
  }

  async getPlanningNodes(req, res, next) {
    try {
      const { gameID, branch, planningType } = req.body;

      if (!gameID || !branch || !planningType) {
        return res
          .status(400)
          .json({ success: false, error: "Missing required fields" });
      }

      const nodes = await this.nodeService.getPlanningNodes(
        gameID,
        branch,
        planningType
      );

      res.json({ success: true, nodes });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async getNodeTree(req, res, next) {
    try {
      const { gameID, branch, planningType } = req.body;

      if (!gameID || !branch || !planningType) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const nodes = await this.nodeService.getNodeTree(
        gameID,
        branch,
        planningType
      );

      res.json({ nodes });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async addChildNodeInTree(req, res, next) {
    const { gameID, branch, planningType, parentId, newNode } = req.body;
    try {
      const clientUID = req.clientUID;
      const result = await this.nodeService.addChildNodeInPlanningTree(
        gameID,
        branch,
        planningType,
        parentId,
        newNode,
        clientUID
      );
      res.status(result.status).json({ sucess: result.success });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async removeNodeFromTree(req, res, next) {
    try {
      const clientUID = req.clientUID;
      const { gameID, branch, planningType, nodeID } = req.body;
      const response = await this.nodeService.removeNodeFromTree(
        gameID,
        branch,
        planningType,
        nodeID,
        clientUID
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async moveNodeInTree(req, res, next) {
    try {
      const clientUID = req.clientUID;
      const { gameID, branch, planningType, nodeToMove, destinationID } =
        req.body;
      const response = await this.nodeService.moveNodeInPlanningTree(
        gameID,
        branch,
        planningType,
        nodeToMove,
        destinationID,
        clientUID
      );
      res.status(200).json(response);
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async getEntitiesByNodeIDs(req, res, next) {
    try {
      const { gameID, branch, nodeIDs, fetchIcons } = req.body;
      const entities = await this.nodeService.getEntitiesByNodeIDs(
        gameID,
        branch,
        nodeIDs,
        fetchIcons
      );

      if (!entities || entities.length === 0) {
        return res.status(200).json({ success: true, entities: [] });
      }
      res.status(200).json({ success: true, entities });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async getEntitiesIDs(req, res, next) {
    try {
      const { gameID, branch, getRemoved } = req.body;
      const entities = await this.nodeService.getEntitiesIDs(
        gameID,
        branch,
        getRemoved
      );

      if (!entities || entities.length === 0) {
        return res
          .status(200)
          .json({ success: true, entities: [] });
      }
      res.status(200).json({ success: true, entities });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async getEntitiesNames(req, res, next) {
    try {
      const { gameID, branch, getRemoved } = req.body;
      const entities = await this.nodeService.getEntitiesNames(
        gameID,
        branch,
        getRemoved
      );

      if (!entities || entities.length === 0) {
        return res.status(200).json({ success: true, entities: [] });
      }
      res.status(200).json({ success: true, entities });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async getEntityIcon(req, res, next) {
    try {
      const { gameID, branch, nodeID } = req.body;
      const entityIcon = await this.nodeService.getEntityIcon(
        gameID,
        branch,
        nodeID
      );

      if (!entityIcon && entityIcon !== "") {
        return res.status(404).json({ message: "Entity not found" });
      }
      res.status(200).json({ success: true, entityIcon });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async getEntityIcons(req, res, next) {
    try {
      const { gameID, branch, nodeIDs } = req.body;

      let entityIcons = await this.nodeService.fetchEntityIcons(
        gameID,
        branch,
        nodeIDs
      );

      if (!entityIcons) {
        return res.status(404).json({ message: "Entity not found" });
      }
      res.status(200).json({ success: true, entityIcons });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async saveEntityBasicInfo(req, res, next) {
    const { gameID, branch, nodeID, entityID, nodeName, isCategory } = req.body;
    const clientUID = req.clientUID;
    try {
      await this.nodeService.saveEntityBasicInfo(
        gameID,
        branch,
        nodeID,
        entityID,
        nodeName,
        isCategory,
        clientUID
      );
      res
        .status(200)
        .json({ success: true, message: "Entity updated successfully" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async saveEntityRoles(req, res, next) {
    const {
      gameID,
      branch,
      nodeID,
      isCurrency,
      isInAppPurchase,
      realValueBase,
    } = req.body;
    const clientUID = req.clientUID;

    try {
      await this.nodeService.saveEntityRoles(
        gameID,
        branch,
        nodeID,
        isCurrency,
        isInAppPurchase,
        realValueBase,
        clientUID
      );
      res
        .status(200)
        .json({ success: true, message: "Entity updated successfully" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async saveEntityIcon(req, res, next) {
    const { gameID, branch, nodeID, entityIcon } = req.body;

    try {
      const clientUID = req.clientUID;
      await this.nodeService.saveEntityIcon(
        gameID,
        branch,
        nodeID,
        entityIcon,
        clientUID
      );
      res
        .status(200)
        .json({ success: true, message: "Entity updated successfully" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async saveEntityGroupName(req, res, next) {
    const { gameID, branch, nodeID, groupName } = req.body;
    const clientUID = req.clientUID;
    try {
      await this.nodeService.saveEntityGroupName(
        gameID,
        branch,
        nodeID,
        groupName,
        clientUID
      );
      res
        .status(200)
        .json({ success: true, message: "Entity updated successfully" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async saveEntityMainConfigs(req, res, next) {
    const { gameID, branch, nodeID, mainConfigs, isCategory } = req.body;

    try {
      const clientUID = req.clientUID;
      await this.nodeService.saveEntityMainConfigs(
        gameID,
        branch,
        nodeID,
        mainConfigs,
        isCategory,
        clientUID
      );
      res
        .status(200)
        .json({ success: true, message: "Entity updated successfully" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async saveEntityInheritedConfigs(req, res, next) {
    const { gameID, branch, nodeID, inheritedConfigs, isCategory } = req.body;

    const clientUID = req.clientUID;

    try {
      await this.nodeService.saveEntityInheritedConfigs(
        gameID,
        branch,
        nodeID,
        inheritedConfigs,
        isCategory,
        clientUID
      );
      res
        .status(200)
        .json({ success: true, message: "Entity updated successfully" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async checkEntityIDExists(req, res, next) {
    try {
      const { gameID, branch, entityID } = req.body;

      const exists = await this.nodeService.checkEntityIDExists(
        gameID,
        branch,
        entityID
      );

      res.json({ exists });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async getCurrencyEntities(req, res, next) {
    try {
      const { gameID, branch } = req.body;

      const entities = await this.nodeService.getCurrencyEntities(
        gameID,
        branch
      );

      res.status(200).json({ success: true, entities });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
}
