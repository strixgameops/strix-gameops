import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createCustomDashboardRoutes(container, authMiddleware) {
  const router = express.Router();
  const customDashboardController = container.getController('customDashboard');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/getDashboards", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(customDashboardController.getDashboards.bind(customDashboardController))
  );

  router.post("/api/getCustomDashboardChart", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(customDashboardController.getCustomDashboardChart.bind(customDashboardController))
  );

  router.post("/api/updateCustomDashboardChart", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(customDashboardController.updateCustomDashboardChart.bind(customDashboardController))
  );

  router.post("/api/getDashboardByLink", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(customDashboardController.getDashboardByLink.bind(customDashboardController))
  );

  router.post("/api/addCustomDashboard", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(customDashboardController.addCustomDashboard.bind(customDashboardController))
  );

  router.post("/api/removeCustomDashboard", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(customDashboardController.removeCustomDashboard.bind(customDashboardController))
  );

  router.post("/api/addChartToCustomDashboard", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(customDashboardController.addChartToCustomDashboard.bind(customDashboardController))
  );

  router.post("/api/removeChartFromCustomDashboard", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(customDashboardController.removeChartFromCustomDashboard.bind(customDashboardController))
  );

  router.post("/api/updateCustomDashboard", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(customDashboardController.updateCustomDashboard.bind(customDashboardController))
  );

  router.post("/api/updateCustomDashboardCharts", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(customDashboardController.updateCustomDashboardCharts.bind(customDashboardController))
  );

  return router;
}