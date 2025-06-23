import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createGameEventRoutes(container, authMiddleware) {
  const router = express.Router();
  const gameEventController = container.getController('gameEvent');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/createGameEvent",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(gameEventController.createGameEvent.bind(gameEventController))
  );

  router.post("/api/removeGameEvent",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(gameEventController.removeGameEvent.bind(gameEventController))
  );

  router.post("/api/updateGameEvent",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(gameEventController.updateGameEvent.bind(gameEventController))
  );

  router.post("/api/getGameEvents",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(gameEventController.getGameEvents.bind(gameEventController))
  );

  router.post("/api/removeEntityFromGameEvent",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(gameEventController.removeEntityFromGameEvent.bind(gameEventController))
  );

  router.post("/api/getGameEventsNotes",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(gameEventController.getGameEventsNotes.bind(gameEventController))
  );

  router.post("/api/updateGameEventsNotes",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(gameEventController.updateGameEventsNotes.bind(gameEventController))
  );

  return router;
}