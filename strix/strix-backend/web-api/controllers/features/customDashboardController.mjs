export class CustomDashboardController {
  constructor(customDashboardService) {
    this.customDashboardService = customDashboardService;
  }

  async getDashboards(req, res) {
    try {
      const { gameID, branch } = req.body;
      const result = await this.customDashboardService.getDashboards(gameID, branch);
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in getDashboards controller:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async getCustomDashboardChart(req, res) {
    try {
      const { gameID, branch, chartID } = req.body;
      const result = await this.customDashboardService.getCustomDashboardChart(
        gameID,
        branch,
        chartID
      );
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in getCustomDashboardChart controller:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async updateCustomDashboardChart(req, res) {
    try {
      const { gameID, branch, chartID, newChart } = req.body;
      const result = await this.customDashboardService.updateCustomDashboardChart(
        gameID,
        branch,
        chartID,
        newChart
      );
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in updateCustomDashboardChart controller:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async getDashboardByLink(req, res) {
    try {
      const { gameID, branch, linkName } = req.body;
      const result = await this.customDashboardService.getDashboardByLink(
        gameID,
        branch,
        linkName
      );
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in getDashboardByLink controller:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async addCustomDashboard(req, res) {
    try {
      const { gameID, branch, newDashboard } = req.body;
      const clientUID = req.clientUID;
      const result = await this.customDashboardService.addCustomDashboard(
        gameID,
        branch,
        newDashboard,
        clientUID
      );
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in addCustomDashboard controller:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async removeCustomDashboard(req, res) {
    try {
      const { gameID, branch, dashboardID } = req.body;
      const clientUID = req.clientUID;
      const result = await this.customDashboardService.removeCustomDashboard(
        gameID,
        branch,
        dashboardID,
        clientUID
      );
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in removeCustomDashboard controller:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async addChartToCustomDashboard(req, res) {
    try {
      const { gameID, branch, dashboardID, chartObj } = req.body;
      const clientUID = req.clientUID;
      const result = await this.customDashboardService.addChartToCustomDashboard(
        gameID,
        branch,
        dashboardID,
        chartObj,
        clientUID
      );
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in addChartToCustomDashboard controller:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async removeChartFromCustomDashboard(req, res) {
    try {
      const { gameID, branch, dashboardID, chartObj } = req.body;
      const clientUID = req.clientUID;
      const result = await this.customDashboardService.removeChartFromCustomDashboard(
        gameID,
        branch,
        dashboardID,
        chartObj,
        clientUID
      );
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in removeChartFromCustomDashboard controller:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async updateCustomDashboard(req, res) {
    try {
      const { gameID, branch, dashboardID, newDashboard } = req.body;
      const clientUID = req.clientUID;
      const result = await this.customDashboardService.updateCustomDashboard(
        gameID,
        branch,
        dashboardID,
        newDashboard,
        clientUID
      );
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in updateCustomDashboard controller:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async updateCustomDashboardCharts(req, res) {
    try {
      const { gameID, branch, dashboardID, newCharts } = req.body;
      const clientUID = req.clientUID;
      const result = await this.customDashboardService.updateCustomDashboardCharts(
        gameID,
        branch,
        dashboardID,
        newCharts,
        clientUID
      );
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in updateCustomDashboardCharts controller:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }
}