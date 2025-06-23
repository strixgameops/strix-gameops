import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createSegmentRoutes(container, authMiddleware) {
  const router = express.Router();
  const segmentController = container.getController('segment');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/getAllSegments", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.getAllSegments.bind(segmentController))
  );

  router.post("/api/getSegmentsByIdArray", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.getSegmentsByIdArray.bind(segmentController))
  );

  router.post("/api/createNewSegment", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.createNewSegment.bind(segmentController))
  );

  router.post("/api/setSegmentName", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.setSegmentName.bind(segmentController))
  );

  router.post("/api/setSegmentComment", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.setSegmentComment.bind(segmentController))
  );

  router.post("/api/setSegmentConditions", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.setSegmentConditions.bind(segmentController))
  );

  router.post("/api/refreshSegmentPlayerCount", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.refreshSegmentPlayerCount.bind(segmentController))
  );

  router.post("/api/recalculateSegmentSize", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.recalculateSegmentSize.bind(segmentController))
  );

  router.post("/api/removeSegmentByID", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.removeSegmentByID.bind(segmentController))
  );

  router.post("/api/buildStaticSegmentFromClientIDs", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.buildStaticSegmentFromClientIDs.bind(segmentController))
  );

  router.post("/api/getAllSegmentsForAnalyticsFilter", 
    validateAccessToken, 
    validateAccessToGame, 
    asyncHandler(segmentController.getAllSegmentsForAnalyticsFilter.bind(segmentController))
  );

  

  return router;
}