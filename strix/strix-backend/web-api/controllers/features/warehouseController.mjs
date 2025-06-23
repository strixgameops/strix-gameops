export class WarehouseController {
  constructor(warehouseService) {
    this.warehouseService = warehouseService;
  }

  async countPlayersInWarehouse(req, res, next) {
    const { gameID, branch } = req.body;

    try {
      const playerCount = await this.warehouseService.countPlayersInWarehouse(
        gameID,
        branch
      );
      res.status(200).json({ success: true, playerCount });
    } catch (error) {
      console.error("Error counting players in warehouse:", error);
      next(error);
    }
  }

  async getTemplatesForSegments(req, res, next) {
    const { gameID, branch } = req.body;

    try {
      const templates = await this.warehouseService.getTemplatesForSegments(
        gameID,
        branch
      );
      res.status(200).json({ success: true, templates });
    } catch (error) {
      console.error("Error getting templates for segments:", error);
      next(error);
    }
  }

  async addStatisticsTemplate(req, res, next) {
    const { gameID, branch, templateObject } = req.body;
    const clientUID = req.clientUID;

    try {
      const result = await this.warehouseService.addStatisticsTemplate(
        gameID,
        branch,
        templateObject,
        clientUID
      );
      res.status(200).json(result ? result : { success: true });
    } catch (error) {
      console.error("Error adding statistics template:", error);
      next(error);
    }
  }

  async updateStatisticsTemplate(req, res, next) {
    const { gameID, branch, templateID, templateObject } = req.body;
    const clientUID = req.clientUID;

    try {
      const result = await this.warehouseService.updateStatisticsTemplate(
        gameID,
        branch,
        templateID,
        templateObject,
        clientUID
      );
      res.status(200).json(result ? result : { success: true });
    } catch (error) {
      console.error("Error editing statistics template:", error);
      next(error);
    }
  }

  async getWarehouseTemplates(req, res, next) {
    const { gameID, branch } = req.body;

    try {
      const templates = await this.warehouseService.getWarehouseTemplates(
        gameID,
        branch
      );
      res.status(200).json({
        success: true,
        message: "Warehouse templates retrieved successfully",
        templates,
      });
    } catch (error) {
      console.error("Error getting warehouse templates:", error);
      next(error);
    }
  }

  async getWarehousePlayers(req, res, next) {
    const { gameID, branch } = req.body;

    try {
      const playerIDs = await this.warehouseService.getWarehousePlayers(
        gameID,
        branch
      );
      res.status(200).json({ success: true, playerIDs });
    } catch (error) {
      console.error("Error getting warehouse players:", error);
      next(error);
    }
  }

  async getWarehousePlayerData(req, res, next) {
    const { gameID, branch, environment, clientID } = req.body;

    try {
      const playerWarehouse =
        await this.warehouseService.getWarehousePlayerData(
          gameID,
          branch,
          environment,
          clientID
        );
      res.status(200).json({ success: true, player: playerWarehouse });
    } catch (error) {
      console.error("Error getting warehouse player data:", error);
      next(error);
    }
  }

  async addAnalyticsTemplate(req, res, next) {
    const { gameID, branch, templateObject } = req.body;
    const clientUID = req.clientUID;

    try {
      const newTemplate = await this.warehouseService.addAnalyticsTemplate(
        gameID,
        branch,
        templateObject,
        clientUID
      );
      res.status(200).json({
        success: true,
        message: "Analytics template added successfully",
        newTemplate,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }

  async removeWarehouseTemplate(req, res, next) {
    try {
      const clientUID = req.clientUID;
      const { gameID, branch, templateID } = req.body;
      await this.warehouseService.removeWarehouseTemplate(
        gameID,
        branch,
        templateID,
        clientUID
      );
      res
        .status(200)
        .json({ success: true, message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error removing template:", error);
      res.status(500).json({ message: "Internal Server Error" });
      next(error);
    }
  }

  async getLeaderboards(req, res, next) {
    const { gameID, branch } = req.body;

    try {
      const results = await this.warehouseService.getLeaderboards(
        gameID,
        branch
      );
      res.status(200).json({
        success: true,
        message: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async addLeaderboard(req, res, next) {
    const { gameID, branch, leaderboard } = req.body;

    try {
      const results = await this.warehouseService.addLeaderboard(
        gameID,
        branch,
        leaderboard
      );
      res.status(200).json({
        success: true,
        message: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeLeaderboard(req, res, next) {
    const { gameID, branch, leaderboard } = req.body;

    try {
      const results = await this.warehouseService.removeLeaderboard(
        gameID,
        branch,
        leaderboard
      );
      res.status(200).json({
        success: true,
        message: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateLeaderboard(req, res, next) {
    const { gameID, branch, leaderboard } = req.body;

    try {
      const results = await this.warehouseService.updateLeaderboard(
        gameID,
        branch,
        leaderboard
      );
      res.status(200).json({
        success: true,
        message: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async getLeaderboardTop(req, res, next) {
    const { gameID, branch, timeframeKey } = req.body;

    try {
      const results = await this.warehouseService.getLeaderboardTop(
        gameID,
        branch,
        timeframeKey
      );
      res.status(200).json({
        success: true,
        message: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async queryWarehousePlayers(req, res, next) {
    const { gameID, branch, environment, query } = req.body;

    try {
      const results = await this.warehouseService.queryWarehousePlayers(
        gameID,
        branch,
        environment,
        query
      );
      res.status(200).json({
        success: true,
        message: results,
      });
    } catch (error) {
      next(error);
    }
  }

  async forceSetStatisticsElement(req, res, next) {
    const { gameID, branch, clientID, elementID, value } = req.body;

    try {
      await this.warehouseService.forceSetValueToStatisticElement(
        gameID,
        branch,
        clientID,
        elementID,
        value
      );
      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
}
