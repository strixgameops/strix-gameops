import { Changelogs } from "../../../models/loggingModel.js";

export class LoggingService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  // Post logs
  async logAction(gameID, type, message) {
    try {
      const newLog = new Changelogs({
        gameID,
        type,
        message,
      });
      await newLog.save();
      // console.log("Log entry added successfully");
    } catch (error) {
      console.error("Error adding log entry: ", error);
    }
  }

  async getActionLogsByType(gameID, type) {
    try {
      const messages = await Changelogs.find({
        gameID,
        type,
      })
        .sort({ timestamp: -1 })
        .limit(500);

      return messages;
    } catch (error) {
      console.error("Error getting log messages: ", error);
      return [];
    }
  }

  async getAllActionLogs(gameID) {
    try {
      const messages = await Changelogs.find({
        gameID,
        type: {$ne: "cooking"}
      })
        .sort({ timestamp: -1 })
        .limit(500);

      return messages;
    } catch (error) {
      console.error("Error getting log messages: ", error);
      return [];
    }
  }
}

export default LoggingService;