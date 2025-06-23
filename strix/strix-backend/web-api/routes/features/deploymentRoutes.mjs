import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createDeploymentRoutes(container, authMiddleware) {
  const router = express.Router();
  const deploymentController = container.getController('deployment');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/getLatestDeployedBranches",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(deploymentController.getLatestDeployedBranches.bind(deploymentController))
  );

  router.post("/api/getListOfEnvironments",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(deploymentController.getListOfEnvironments.bind(deploymentController))
  );

  router.post("/api/getGameDeploymentCatalog",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(deploymentController.getGameDeploymentCatalog.bind(deploymentController))
  );

  router.post("/api/updateGameDeploymentCatalog",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(deploymentController.updateGameDeploymentCatalog.bind(deploymentController))
  );

  router.post("/api/removeDeploymentVersion",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(deploymentController.removeDeploymentVersion.bind(deploymentController))
  );

  router.post("/api/cookBranchContent",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(deploymentController.cookBranchContent.bind(deploymentController))
  );

  router.post("/api/getDeploymentChecksums",
    asyncHandler(deploymentController.getDeploymentChecksums.bind(deploymentController))
  );

  router.post("/api/getCurrentAudienceDeploymentStats",
    asyncHandler(deploymentController.getCurrentAudienceDeploymentStats.bind(deploymentController))
  );

  return router;
}