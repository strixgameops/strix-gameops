export class ProfileCompositionController {
  constructor(profileCompositionService) {
    this.profileCompositionService = profileCompositionService;
  }

  async getProfileCompositionPreset(req, res, next) {
    try {
      const { gameID, branch } = req.body;
      const result =
        await this.profileCompositionService.getProfileCompositionPreset(
          gameID,
          branch
        );
      res.status(200).json(result ? result : { success: true });
    } catch (error) {
      next(error);
    }
  }

  async setProfileCompositionPreset(req, res, next) {
    try {
      const { gameID, branch, presets = [] } = req.body;
      const result =
        await this.profileCompositionService.setProfileCompositionPreset(
          gameID,
          branch,
          presets
        );
      if (!result) {
        return res
          .status(404)
          .json({ success: false, message: "Charts not found" });
      }
      res
        .status(200)
        .json({ success: true, message: "Profile composition preset set" });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async getProfileComposition(req, res, next) {
    try {
      const {
        gameID,
        branch,
        environment,
        baseSegment,
        filters,
        element1,
        element2,
        element3,
      } = req.body;

      const result = await this.profileCompositionService.getProfileComposition(
        gameID,
        branch,
        environment,
        baseSegment,
        filters,
        element1,
        element2,
        element3
      );
      res.status(200).json(result ? result : { success: true });
    } catch (error) {
      next(error);
    }
  }

  async buildStaticSegmentFromComposition(req, res, next) {
    try {
      const {
        gameID,
        branch,
        environment,
        baseSegment,
        newSegmentName,
        newSegmentComment,
        filters,
      } = req.body;

      const result =
        await this.profileCompositionService.createSegmentFromComposition(
          gameID,
          branch,
          environment,
          baseSegment,
          filters,
          newSegmentName,
          newSegmentComment
        );
      res.status(200).json(result ? result : { success: true });
    } catch (error) {
      next(error);
    }
  }
}
