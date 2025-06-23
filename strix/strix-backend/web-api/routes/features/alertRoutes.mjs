import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createAlertRoutes(container, authMiddleware) {
  const router = express.Router();
  const alertController = container.getController('alert');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/createAlert",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(alertController.createAlert.bind(alertController))
  );

  router.post("/api/updateAlert",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(alertController.updateAlert.bind(alertController))
  );

  router.post("/api/removeAlert",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(alertController.removeAlert.bind(alertController))
  );

  router.post("/api/removeAlertsWithChartID",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(alertController.removeAlertsWithChartID.bind(alertController))
  );

  router.post("/api/getAlertsByChartID",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(alertController.getAlertsByChartID.bind(alertController))
  );

  router.post("/api/getAllAlerts",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(alertController.getAllAlerts.bind(alertController))
  );

  return router;
}