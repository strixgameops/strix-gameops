import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createABTestRoutes(container, authMiddleware) {
  const router = express.Router();
  const abtestController = container.getController('abtest');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/getABTests",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(abtestController.getABTests.bind(abtestController))
  );

  router.post("/api/createABTest",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(abtestController.createABTest.bind(abtestController))
  );

  router.post("/api/removeABTest",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(abtestController.removeABTest.bind(abtestController))
  );

  router.post("/api/updateABTest",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(abtestController.updateABTest.bind(abtestController))
  );

  router.post("/api/getABTestsShort",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(abtestController.getABTestsShort.bind(abtestController))
  );

  return router;
}