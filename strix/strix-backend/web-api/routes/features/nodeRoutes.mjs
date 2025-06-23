import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createNodeRoutes(container, authMiddleware) {
  const router = express.Router();
  const nodeController = container.getController('node');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/getNode", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.getNode.bind(nodeController))
  );

  router.post("/api/updateNode", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.updateNode.bind(nodeController))
  );

  router.post("/api/createEntity", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.createEntity.bind(nodeController))
  );

  router.post("/api/createEntityBulk", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.createEntityBulk.bind(nodeController))
  );

  router.get("/api/findNodeById", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.findNodeById.bind(nodeController))
  );

  router.post("/api/removePlanningNode", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.removePlanningNode.bind(nodeController))
  );

  router.post("/api/cancelEntityCreation", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.cancelEntityCreation.bind(nodeController))
  );

  router.post("/api/getPlanningNodes", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.getPlanningNodes.bind(nodeController))
  );

  router.post("/api/getNodeTree", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.getNodeTree.bind(nodeController))
  );

  router.post("/api/addChildNodeInTree", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.addChildNodeInTree.bind(nodeController))
  );

  router.post("/api/removeNodeFromTree", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.removeNodeFromTree.bind(nodeController))
  );

  router.post("/api/moveNodeInTree", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.moveNodeInTree.bind(nodeController))
  );

  router.post("/api/getEntitiesByNodeIDs", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.getEntitiesByNodeIDs.bind(nodeController))
  );

  router.post("/api/getEntitiesIDs", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.getEntitiesIDs.bind(nodeController))
  );

  router.post("/api/getEntitiesNames", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.getEntitiesNames.bind(nodeController))
  );

  router.post("/api/getEntityIcon", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.getEntityIcon.bind(nodeController))
  );

  router.post("/api/getEntityIcons", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.getEntityIcons.bind(nodeController))
  );

  router.post("/api/saveEntityBasicInfo", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.saveEntityBasicInfo.bind(nodeController))
  );

  router.post("/api/saveEntityRoles", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.saveEntityRoles.bind(nodeController))
  );

  router.post("/api/saveEntityIcon", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.saveEntityIcon.bind(nodeController))
  );

  router.post("/api/saveEntityGroupName", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.saveEntityGroupName.bind(nodeController))
  );

  router.post("/api/saveEntityMainConfigs", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.saveEntityMainConfigs.bind(nodeController))
  );

  router.post("/api/saveEntityInheritedConfigs", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.saveEntityInheritedConfigs.bind(nodeController))
  );

  router.post("/api/checkEntityIDExists", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.checkEntityIDExists.bind(nodeController))
  );

  router.post("/api/getCurrencyEntities", 
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(nodeController.getCurrencyEntities.bind(nodeController))
  );

  return router;
}