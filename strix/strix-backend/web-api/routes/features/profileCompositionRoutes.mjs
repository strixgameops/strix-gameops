import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createProfileCompositionRoutes(container, authMiddleware) {
  const router = express.Router();
  const profileCompositionController = container.getController('profileComposition');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/getProfileCompositionPreset",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(profileCompositionController.getProfileCompositionPreset.bind(profileCompositionController))
  );

  router.post("/api/setProfileCompositionPreset",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(profileCompositionController.setProfileCompositionPreset.bind(profileCompositionController))
  );

  router.post("/api/getProfileComposition",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(profileCompositionController.getProfileComposition.bind(profileCompositionController))
  );

  router.post("/api/buildStaticSegmentFromComposition",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(profileCompositionController.buildStaticSegmentFromComposition.bind(profileCompositionController))
  );

  return router;
}