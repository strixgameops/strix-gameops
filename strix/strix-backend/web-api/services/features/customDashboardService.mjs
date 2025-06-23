import { Charts as CustomCharts } from "../../../models/charts.js";

export class CustomDashboardService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async removeChartFromCustomDashboard(
    gameID,
    branch,
    dashboardID,
    chartObj,
    clientUID
  ) {
    if (!gameID || !branch || !dashboardID || !chartObj) {
      return { success: false, message: "Missing required parameters" };
    }

    try {
      await CustomCharts.updateOne(
        {
          gameID: gameID,
          branch: branch,
        },
        {
          $pull: {
            [`dashboards.$[dashboard].charts`]: chartObj,
          },
        },
        {
          arrayFilters: [{ "dashboard.id": dashboardID }],
        }
      );
      const alertService = this.moduleContainer.get("alert");

      await alertService.removeAlertsWithChartID(
        gameID,
        branch,
        chartObj.chartID
      );
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "customdashboards",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: updated custom dashboard  | SUBJECT: ${dashboardID}`
      );

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal Server Error" };
    }
  }

  async addChartToCustomDashboard(
    gameID,
    branch,
    dashboardID,
    chartObj,
    clientUID
  ) {
    if (!gameID || !branch || !dashboardID || !chartObj) {
      return { success: false, message: "Missing required parameters" };
    }

    try {
      await CustomCharts.findOneAndUpdate(
        {
          gameID: gameID,
          branch: branch,
          "dashboards.id": dashboardID,
        },
        {
          $push: {
            [`dashboards.$[dashboard].charts`]: chartObj,
          },
        },
        {
          arrayFilters: [{ "dashboard.id": dashboardID }],
        }
      );
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "customdashboards",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: updated custom dashboard  | SUBJECT: ${dashboardID}`
      );

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal Server Error" };
    }
  }

  async updateCustomDashboard(
    gameID,
    branch,
    dashboardID,
    newDashboard,
    clientUID
  ) {
    if (!gameID || !branch || !dashboardID || !newDashboard) {
      return { success: false, message: "Missing required parameters" };
    }

    try {
      await CustomCharts.findOneAndUpdate(
        {
          gameID: gameID,
          branch: branch,
          "dashboards.id": dashboardID,
        },
        {
          $set: {
            [`dashboards.$[dashboard].name`]: newDashboard.name,
            [`dashboards.$[dashboard].linkName`]: newDashboard.linkName,
          },
        },
        {
          arrayFilters: [{ "dashboard.id": dashboardID }],
        }
      );
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "customdashboards",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: updated custom dashboard  | SUBJECT: ${dashboardID}`
      );

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal Server Error" };
    }
  }

  async updateCustomDashboardCharts(
    gameID,
    branch,
    dashboardID,
    newCharts,
    clientUID
  ) {
    if (!gameID || !branch || !dashboardID || !newCharts) {
      return { success: false, message: "Missing required parameters" };
    }

    try {
      const dashboardData = await CustomCharts.findOne(
        {
          gameID: gameID,
          branch: branch,
          "dashboards.id": dashboardID,
        },
        { "dashboards.$": 1 }
      ).lean();

      let removedCharts = [];
      if (
        dashboardData &&
        dashboardData.dashboards &&
        dashboardData.dashboards.length > 0
      ) {
        const oldCharts = dashboardData.dashboards[0].charts || [];
        removedCharts = oldCharts.filter(
          (oldChart) =>
            !newCharts.some((newChart) => newChart.chartID === oldChart.chartID)
        );
      }

      for (const chart of removedCharts) {
        const alertService = this.moduleContainer.get("alert");

        await alertService.removeAlertsWithChartID(
          gameID,
          branch,
          chart.chartID
        );
      }

      await CustomCharts.findOneAndUpdate(
        {
          gameID: gameID,
          branch: branch,
          "dashboards.id": dashboardID,
        },
        {
          $set: {
            [`dashboards.$[dashboard].charts`]: newCharts,
          },
        },
        {
          arrayFilters: [{ "dashboard.id": dashboardID }],
        }
      );
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "customdashboards",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: updated custom dashboard  | SUBJECT: ${dashboardID}`
      );

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal Server Error" };
    }
  }

  async removeCustomDashboard(gameID, branch, dashboardID, clientUID) {
    if (!gameID || !branch || !dashboardID) {
      return { success: false, message: "Missing required parameters" };
    }

    try {
      await CustomCharts.findOneAndUpdate(
        { gameID: gameID, branch: branch },
        { $pull: { dashboards: { id: dashboardID } } }
      );
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "customdashboards",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: removed custom dashboard  | SUBJECT: ${dashboardID}`
      );

      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal Server Error" };
    }
  }

  async addCustomDashboard(gameID, branch, newDashboard, clientUID) {
    if (!gameID || !branch || !newDashboard) {
      return { success: false, message: "Missing required parameters" };
    }

    try {
      const dashboards = await CustomCharts.findOneAndUpdate(
        { gameID: gameID, branch: branch },
        { $push: { dashboards: newDashboard } },
        { new: true }
      );
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "customdashboards",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: added custom dashboard | SUBJECT: ${newDashboard.id}`
      );

      return { success: true, dashboards: dashboards };
    } catch (error) {
      console.error(error);
      return { success: false, message: "Internal Server Error" };
    }
  }

  async getDashboardByLink(gameID, branch, linkName) {
    if (!gameID || !branch) {
      return { success: false, message: "Missing required parameters" };
    }

    try {
      let charts = await CustomCharts.findOne({
        gameID: gameID,
        branch: branch,
      }).lean();

      if (!charts) {
        console.log("Game not found or branch does not exist");
      }
      const dashboards = charts.dashboards;
      let targetDashboard = dashboards.find((d) => d.linkName === linkName);

      return { success: true, dashboard: targetDashboard };
    } catch (error) {
      console.error(error);
      throw new Error("Internal Server Error");
    }
  }

  async getDashboards(gameID, branch) {
    if (!gameID || !branch) {
      return { success: false, message: "Missing required parameters" };
    }

    try {
      let charts = await CustomCharts.findOne({
        gameID: gameID,
        branch: branch,
      }).lean();

      if (!charts || !charts.dashboards) {
        return { success: true, dashboards: [] };
      }
      const dashboards = charts.dashboards.map((d) => {
        let t = d;
        delete t.charts;
        return t;
      });

      return { success: true, dashboards: dashboards };
    } catch (error) {
      console.error(error);
      throw new Error("Internal Server Error");
    }
  }

  async getCustomDashboardChart(gameID, branch, chartID) {
    let document = await CustomCharts.findOne({
      gameID: gameID,
      branch: branch,
      "dashboards.charts.chartID": chartID,
    }).lean();

    if (!document) {
      return { success: false, chart: null };
    }

    // Find the specific chart
    let chart = null;
    for (const dashboard of document.dashboards) {
      const foundChart = dashboard.charts.find((c) => c.chartID === chartID);
      if (foundChart) {
        chart = foundChart;
        break;
      }
    }

    if (chart) {
      return { success: true, chart: chart };
    } else {
      return { success: false, chart: null };
    }
  }

  async updateCustomDashboardChart(gameID, branch, chartID, newChart) {
    await CustomCharts.updateOne(
      {
        gameID: gameID,
        branch: branch,
        "dashboards.charts.chartID": chartID,
      },
      {
        $set: {
          "dashboards.$[dashboard].charts.$[chart]": newChart,
        },
      },
      {
        arrayFilters: [
          { "dashboard.charts.chartID": chartID },
          { "chart.chartID": chartID },
        ],
      }
    ).lean();
    return { success: true };
  }
}
export default CustomDashboardService;
