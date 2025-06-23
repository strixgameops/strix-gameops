import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createClusteringRoutes(container, authMiddleware) {
  const router = express.Router();
  const clusteringController = container.getOptionalController("clustering");
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  if (
    clusteringController &&
    clusteringController.requestAudienceCluster &&
    clusteringController.getAudienceClustersList &&
    clusteringController.getAudienceCluster &&
    clusteringController.stopClusterBuilding &&
    clusteringController.getClusteredPlayers
  ) {
    router.post(
      "/api/requestAudienceCluster",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        clusteringController.requestAudienceCluster.bind(clusteringController)
      )
    );

    router.post(
      "/api/getAudienceClustersList",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        clusteringController.getAudienceClustersList.bind(clusteringController)
      )
    );

    router.post(
      "/api/getAudienceCluster",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        clusteringController.getAudienceCluster.bind(clusteringController)
      )
    );

    router.post(
      "/api/stopClusterBuilding",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        clusteringController.stopClusterBuilding.bind(clusteringController)
      )
    );

    router.post(
      "/api/getClusteredPlayers",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        clusteringController.getClusteredPlayers.bind(clusteringController)
      )
    );
  }

  return router;
}
