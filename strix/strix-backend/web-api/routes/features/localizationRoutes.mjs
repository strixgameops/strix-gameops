import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createLocalizationRoutes(container, authMiddleware) {
  const router = express.Router();
  const localizationController = container.getController('localization');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/updateLocalization",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(localizationController.updateLocalization.bind(localizationController))
  );

  router.post("/api/getGameLocalizationSettings",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(localizationController.getGameLocalizationSettings.bind(localizationController))
  );

  router.post("/api/updateGameLocalizationSettingsTag",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(localizationController.updateGameLocalizationSettingsTag.bind(localizationController))
  );

  router.post("/api/updateGameLocalizationSettingsPrefixGroup",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(localizationController.updateGameLocalizationSettingsPrefixGroup.bind(localizationController))
  );

  router.post("/api/getLocalization",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(localizationController.getLocalization.bind(localizationController))
  );

  router.post("/api/getLocalizationItems",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(localizationController.getLocalizationItems.bind(localizationController))
  );

  router.post("/api/removeLocalizationItem",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(localizationController.removeLocalizationItem.bind(localizationController))
  );

  router.post("/api/changeLocalizationItemKey",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(localizationController.changeLocalizationItemKey.bind(localizationController))
  );

  return router;
}