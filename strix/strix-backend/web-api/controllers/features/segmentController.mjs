export class SegmentController {
  constructor(segmentService, contentCacherService) {
    this.segmentService = segmentService;
    this.contentCacherService = contentCacherService;
  }

  getAllSegments = async (req, res, next) => {
    try {
      const { gameID, branch } = req.body;
      const segments = await this.segmentService.getAllSegments(gameID, branch);
      res.status(200).json({ success: true, segments });
    } catch (error) {
      console.error("Error getting all segments:", error);
      next(error);
    }
  };

  getSegmentsByIdArray = async (req, res, next) => {
    try {
      const { gameID, branch, segmentIDs } = req.body;
      const segments = await this.segmentService.getSegmentsByIdArray(
        gameID,
        branch,
        segmentIDs
      );
      res.status(200).json({ success: true, segments });
    } catch (error) {
      console.error("Error fetching segments by IDs:", error);
      next(error);
    }
  };

  createNewSegment = async (req, res, next) => {
    try {
      const clientUID = req.clientUID;
      const { gameID, branch } = req.body;
      const segments = await this.segmentService.createNewSegment(
        gameID,
        branch,
        clientUID
      );
      res.status(200).json({ success: true, segments });
    } catch (error) {
      console.error("Error creating new segment:", error);
      next(error);
    }
  };

  setSegmentName = async (req, res, next) => {
    try {
      const clientUID = req.clientUID;
      const { gameID, branch, segmentID, newName } = req.body;
      const message = await this.segmentService.setSegmentName(
        gameID,
        branch,
        segmentID,
        newName,
        clientUID
      );
      res.status(200).json({ success: true, message });
    } catch (error) {
      console.error("Error updating segmentName:", error);
      next(error);
    }
  };

  setSegmentComment = async (req, res, next) => {
    try {
      const clientUID = req.clientUID;
      const { gameID, branch, segmentID, newComment } = req.body;
      const message = await this.segmentService.setSegmentComment(
        gameID,
        branch,
        segmentID,
        newComment,
        clientUID
      );
      res.status(200).json({ success: true, message });
    } catch (error) {
      console.error("Error updating segmentComment:", error);
      next(error);
    }
  };

  setSegmentConditions = async (req, res, next) => {
    try {
      const { gameID, branch, segmentID, segmentConditions } = req.body;
      const clientUID = req.clientUID;
      const result = await this.segmentService.setSegmentConditions(
        gameID,
        branch,
        segmentID,
        segmentConditions,
        clientUID
      );
      res.status(200).json(result ? result : { success: true });
    } catch (error) {
      console.error("Error setting segment conditions:", error);
      next(error);
    }
  };

  refreshSegmentPlayerCount = async (req, res, next) => {
    try {
      const { gameID, branch, environment, segmentID } = req.body;
      const playerCount = await this.segmentService.refreshSegmentPlayerCount(
        gameID,
        branch,
        environment,
        segmentID
      );
      if (!playerCount) {
        return res.status(500).json({ error: "Internal Server Error" });
      }
      res.status(200).json({ success: true, playerCount: playerCount.length });
    } catch (error) {
      console.error("Error refreshing segmentPlayerCount:", error);
      next(error);
    }
  };

  recalculateSegmentSize = async (req, res, next) => {
    try {
      const { gameID, branch, environment, segmentID } = req.body;
      let alreadyCaching = await this.contentCacherService.tryGetCache(
        `${gameID}:${branch}:${environment}:segmentsRecalculationQueue:${segmentID}`
      );

      if (alreadyCaching && alreadyCaching.recalculating === true) {
        res.status(500).json({
          success: false,
          message: "Segment recalculation is already in progress!",
        });
        return;
      }

      this.segmentService.recalculateSegment(
        gameID,
        branch,
        environment,
        segmentID
      );
      res.status(200).json({
        success: true,
        message:
          "Segment recalculation is now in progress. This may take a long time.",
      });
    } catch (error) {
      console.error("Error at recalculateSegmentSize:", error);
      next(error);
    }
  };

  removeSegmentByID = async (req, res, next) => {
    try {
      const { gameID, branch, segmentID } = req.body;
      const clientUID = req.clientUID;
      const result = await this.segmentService.removeSegmentByID(
        gameID,
        branch,
        segmentID,
        clientUID
      );
      res.status(200).json(result ? result : { success: true });
    } catch (error) {
      console.error("Error removing segment by ID:", error);
      next(error);
    }
  };

  buildStaticSegmentFromClientIDs = async (req, res, next) => {
    try {
      const { gameID, branch, environment, newSegmentName, clientIDs } =
        req.body;
      const result = await this.segmentService.createStaticSegmentFromClientIDs(
        gameID,
        branch,
        environment,
        newSegmentName,
        clientIDs
      );
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getAllSegmentsForAnalyticsFilter = async (req, res, next) => {
    try {
      const { gameID, branch } =
        req.body;
      const result = await this.segmentService.getAllSegmentsForAnalyticsFilter(
        gameID,
        branch,
      );
      res.status(200).json({ success: true, message: result });
    } catch (error) {
      next(error);
    }
  };
}
