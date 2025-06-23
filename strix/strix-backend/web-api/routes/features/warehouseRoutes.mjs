import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createWarehouseRoutes(container, authMiddleware) {
  const router = express.Router();
  const warehouseController = container.getController('warehouse');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/countPlayersInWarehouse",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.countPlayersInWarehouse.bind(warehouseController))
  );

  router.post("/api/getTemplatesForSegments",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.getTemplatesForSegments.bind(warehouseController))
  );

  router.post("/api/addStatisticsTemplate",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.addStatisticsTemplate.bind(warehouseController))
  );

  router.post("/api/updateStatisticsTemplate",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.updateStatisticsTemplate.bind(warehouseController))
  );

  router.post("/api/getWarehouseTemplates",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.getWarehouseTemplates.bind(warehouseController))
  );

  router.post("/api/getWarehousePlayers",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.getWarehousePlayers.bind(warehouseController))
  );

  router.post("/api/getWarehousePlayerData",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.getWarehousePlayerData.bind(warehouseController))
  );

  router.post("/api/addAnalyticsTemplate",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.addAnalyticsTemplate.bind(warehouseController))
  );

  router.post("/api/removeWarehouseTemplate",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.removeWarehouseTemplate.bind(warehouseController))
  );

  router.post("/api/getLeaderboards",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.getLeaderboards.bind(warehouseController))
  );

  router.post("/api/addLeaderboard",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.addLeaderboard.bind(warehouseController))
  );

  router.post("/api/removeLeaderboard",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.removeLeaderboard.bind(warehouseController))
  );

  router.post("/api/updateLeaderboard",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.updateLeaderboard.bind(warehouseController))
  );

  router.post("/api/getLeaderboardTop",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.getLeaderboardTop.bind(warehouseController))
  );

  router.post("/api/queryWarehousePlayers",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.queryWarehousePlayers.bind(warehouseController))
  );

  router.post("/api/forceSetStatisticsElement",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(warehouseController.forceSetStatisticsElement.bind(warehouseController))
  );

  return router;
}