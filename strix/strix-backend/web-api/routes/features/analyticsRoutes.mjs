import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createAnalyticsRoutes(container, authMiddleware) {
  const router = express.Router();
  const analyticsController = container.getController("analytics");
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post(
    "/api/createNewAnalyticsEvent",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.createNewAnalyticsEvent.bind(analyticsController)
    )
  );

  router.post(
    "/api/removeAnalyticsEvent",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.removeAnalyticsEvent.bind(analyticsController)
    )
  );

  router.post(
    "/api/updateAnalyticsEvent",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.updateAnalyticsEvent.bind(analyticsController)
    )
  );

  router.post(
    "/api/getRecentAnalyticsEvents",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getRecentAnalyticsEvents.bind(analyticsController)
    )
  );

  router.post(
    "/api/getAnalyticsEvents",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getAnalyticsEvents.bind(analyticsController)
    )
  );
router.post(
    "/api/getAnalyticsEvent",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getAnalyticsEvent.bind(analyticsController)
    )
  );
  router.post(
    "/api/getAllAnalyticsEvents",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getAllAnalyticsEvents.bind(analyticsController)
    )
  );

  return router;
}
