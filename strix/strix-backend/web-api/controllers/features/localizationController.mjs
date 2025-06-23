export class LocalizationController {
  constructor(localizationService, loggingService) {
    this.localizationService = localizationService;
    this.loggingService = loggingService;
  }

  async updateLocalization(req, res, next) {
    try {
      const { gameID, branch, type, translationObjects } = req.body;
      const clientUID = req.clientUID;

      await this.localizationService.updateLocalization(
        gameID,
        branch,
        type,
        translationObjects
      );

      this.loggingService.logAction(
        gameID,
        "localization",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: updated localization table`
      );

      res
        .status(200)
        .json({ success: true, message: "Localization updated successfully" });
    } catch (error) {
      next(error);
    }
  }

  async getGameLocalizationSettings(req, res, next) {
    try {
      const { gameID, branch } = req.body;
      const result = await this.localizationService.getGameLocalizationSettings(
        gameID,
        branch
      );
      res.status(200).json({ success: true, result: result });
    } catch (error) {
      next(error);
    }
  }

  async updateGameLocalizationSettingsTag(req, res, next) {
    try {
      const { gameID, branch, tag, operation } = req.body;
      await this.localizationService.updateGameLocalizationSettingsTag(
        gameID,
        branch,
        tag,
        operation
      );
      res
        .status(200)
        .json({ success: true, message: "Localization updated successfully" });
    } catch (error) {
      next(error);
    }
  }

  async updateGameLocalizationSettingsPrefixGroup(req, res, next) {
    try {
      const { gameID, branch, prefixGroup } = req.body;
      await this.localizationService.updateGameLocalizationSettingsPrefixGroup(
        gameID,
        branch,
        prefixGroup
      );
      res
        .status(200)
        .json({ success: true, message: "Localization updated successfully" });
    } catch (error) {
      next(error);
    }
  }

  async getLocalization(req, res, next) {
    try {
      const { gameID, branch, type } = req.body;
      const localizations = await this.localizationService.getLocalization(
        gameID,
        branch,
        type
      );
      res.status(200).json({
        localizations,
        success: true,
        message: "Localization fetched successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async getLocalizationItems(req, res, next) {
    try {
      const { gameID, branch, type, sids } = req.body;
      const localizations = await this.localizationService.getLocalizationItems(
        gameID,
        branch,
        type,
        sids
      );
      res.status(200).json({
        localizations,
        success: true,
        message: "Localization fetched successfully",
      });
    } catch (error) {
      console.error("Error getting localization items:", error);
      next(error);
    }
  }

  async removeLocalizationItem(req, res, next) {
    try {
      const { gameID, branch, type, sid } = req.body;
      const clientUID = req.clientUID;

      const result = await this.localizationService.removeLocalizationItem(
        gameID,
        branch,
        type,
        sid
      );
      this.loggingService.logAction(
        gameID,
        "localization",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: removed localization item | SUBJECT: ${sid}`
      );
      res.status(200).json({
        success: true,
        message: "Localization item removed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async changeLocalizationItemKey(req, res, next) {
    try {
      const { gameID, branch, type, sid, newKey } = req.body;
      const clientUID = req.clientUID;

      await this.localizationService.changeLocalizationItemKey(
        gameID,
        branch,
        type,
        sid,
        newKey
      );
      this.loggingService.logAction(
        gameID,
        "localization",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed localization item | SUBJECT: ${sid}`
      );
      res.status(200).json({
        success: true,
        message: "Localization item changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}