import { Alerts } from "../../../models/alertModel.js";
import shortid from "shortid";

export class AlertService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }
  async createAlert(gameID, branch, alertObj) {
    try {
      const newAlert = new Alerts({
        gameID,
        branch,
        ...alertObj,
        lastUpdateDate: Date.now(),
      });

      const savedAlert = await newAlert.save();
      return savedAlert;
    } catch (error) {
      console.error("Error creating alert:", error);
      throw error;
    }
  }

  async updateAlert(gameID, branch, alertID, alertObj) {
    try {
      const updateData = {};

      // Only update fields that are provided
      Object.keys(alertObj).forEach((key) => {
        if (alertObj[key]) {
          updateData[key] = alertObj[key];
        }
      });

      const updatedAlert = await Alerts.findOneAndUpdate(
        { gameID, branch, alertID },
        { $set: updateData },
        { new: true }
      );

      if (!updatedAlert) {
        throw new Error(`Alert with ID ${alertID} not found`);
      }

      return updatedAlert;
    } catch (error) {
      console.error("Error updating alert:", error);
      throw error;
    }
  }

  async removeAlert(gameID, branch, alertID) {
    try {
      const result = await Alerts.deleteOne({ gameID, branch, alertID });

      if (result.deletedCount === 0) {
        throw new Error(`Alert with ID ${alertID} not found`);
      }

      return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
      console.error("Error removing alert:", error);
      throw error;
    }
  }

  async removeAlertsWithChartID(gameID, branch, chartID) {
    try {
      const result = await Alerts.deleteMany({ gameID, branch, chartID });

      return {
        success: true,
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error("Error removing alerts by chartID:", error);
      throw error;
    }
  }

  async getAlertsByChartID(gameID, branch, chartID) {
    try {
      const alerts = await Alerts.find(
        { gameID, branch, chartID },
        { lastUpdateDate: 0 }
      );
      return alerts;
    } catch (error) {
      console.error("Error fetching alerts by chartID:", error);
      throw error;
    }
  }

  async getAllAlerts(gameID, branch) {
    try {
      const alerts = await Alerts.find({ gameID, branch }, { lastUpdateDate: 0 });
      return alerts;
    } catch (error) {
      console.error("Error fetching all alerts:", error);
      throw error;
    }
  }
}
export default AlertService;