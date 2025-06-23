import { Game } from "../../../models/gameModel.js";
import { Studio } from "../../../models/studioModel.js";
import { User } from "../../../models/userModel.js";
import { PWplayers } from "../../../models/PWplayers.js";
import { Clustering } from "../../../models/audienceClustering.js";
import { ClusteringCache } from "../../../models/audienceClusteringCache.js";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export class ScheduledTasksService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.scheduledTasks = new Map();
    this.isRunning = false;

    if (process.env.SERVER_ROLE === "webBackend") {
      this.initializeScheduledTasks();
    }
  }

  initializeScheduledTasks() {
    this.scheduleLongTasks(6000000); // 60 minutes
    this.scheduleRegularTasks(600000); // 10 minutes
    this.scheduleShortTasks(30000); // 30 seconds
  }

  scheduleRegularTasks(interval) {
    const intervalId = setInterval(async () => {
      try {
        await this.executeRegularTasks();
      } catch (error) {
        console.error("Error in regular scheduled tasks:", error);
      }
    }, interval);

    this.scheduledTasks.set("regular", intervalId);
    return () => this.clearTask("regular");
  }

  scheduleShortTasks(interval) {
    const intervalId = setInterval(async () => {
      try {
        await this.executeShortTasks();
      } catch (error) {
        console.error("Error in short scheduled tasks:", error);
      }
    }, interval);

    this.scheduledTasks.set("short", intervalId);
    return () => this.clearTask("short");
  }

  scheduleLongTasks(interval) {
    const intervalId = setInterval(async () => {
      try {
        await this.executeLongTasks();
      } catch (error) {
        console.error("Error in long scheduled tasks:", error);
      }
    }, interval);

    this.scheduledTasks.set("long", intervalId);
    return () => this.clearTask("long");
  }

  clearTask(taskName) {
    if (this.scheduledTasks.has(taskName)) {
      clearInterval(this.scheduledTasks.get(taskName));
      this.scheduledTasks.delete(taskName);
    }
  }

  clearAllTasks() {
    for (const [taskName, intervalId] of this.scheduledTasks) {
      clearInterval(intervalId);
    }
    this.scheduledTasks.clear();
  }

  async executeRegularTasks() {
    console.log("Regular scheduled tasks fired");

    await Promise.all([
      this.removeScheduledGames(),
      this.removeScheduledStudios(),
      this.removeScheduledUsers(),
    ]);
  }

  async executeShortTasks() {
    const organizationService = this.moduleContainer.get("organization");

    await organizationService.clearExpiredCollabUsers();
  }

  async executeLongTasks() {
    await this.deleteOldClusters();
  }

  async deleteOldClusters() {
    const NdaysAgo = new Date();
    NdaysAgo.setDate(NdaysAgo.getDate() - 30);

    try {
      const [cacheResult, clusteringResult] = await Promise.all([
        ClusteringCache.deleteMany({
          creationDate: { $lt: NdaysAgo },
        }),
        Clustering.deleteMany({
          creationDate: { $lt: NdaysAgo },
        }),
      ]);

      console.log(
        `Deleted ${cacheResult.deletedCount} documents from ClusteringCache`
      );
      console.log(
        `Deleted ${clusteringResult.deletedCount} documents from Clustering`
      );
    } catch (error) {
      console.error("Error deleting old clusters:", error);
      throw error;
    }
  }

  async removeScheduledGames() {
    const currentDate = new Date();

    try {
      const result = await Game.find({
        scheduledDeletionDate: { $lt: currentDate },
      }).lean();

      if (result.length > 0) {
        const gameIDs = result.map((g) => g.gameID);
        await this.removeGamesBulk(gameIDs);
        console.log(`${gameIDs.length} games were deleted.`);
      }
    } catch (error) {
      console.error("Error deleting games with past deletion dates:", error);
      throw error;
    }
  }

  async removeScheduledStudios() {
    const currentDate = new Date();

    try {
      const result = await Studio.find({
        scheduledDeletionDate: { $lt: currentDate },
      }).lean();

      if (result.length > 0) {
        const studioIDs = result.map((s) => s.studioID);

        for (const studioID of studioIDs) {
          await this.removeStudio(studioID);
        }

        console.log(`${studioIDs.length} studios were deleted.`);
      }
    } catch (error) {
      console.error("Error deleting studios with past deletion dates:", error);
      throw error;
    }
  }

  async removeScheduledUsers() {
    const currentDate = new Date();

    try {
      const result = await User.find({
        scheduledDeletionDate: { $lt: currentDate },
      }).lean();

      if (result.length > 0) {
        const userIDs = result.map((u) => u.email);

        for (const userID of userIDs) {
          await this.removeUser(userID);
        }

        console.log(`${userIDs.length} users were deleted.`);
      }
    } catch (error) {
      console.error("Error deleting users with past deletion dates:", error);
      throw error;
    }
  }

  // Methods that would need to be implemented or imported from other services
  async removeGamesBulk(gameIDs) {
    try {
      console.log(`Removing games bulk: ${gameIDs.join(", ")}`);
      const organizationService = this.moduleContainer.get("organization");
      await organizationService.removeGamesBulk(gameIDs);
    } catch (error) {
      console.error("Error in bulk game removal:", error);
      throw error;
    }
  }

  async removeStudio(studioID) {
    try {
      console.log(`Removing studio: ${studioID}`);
      const organizationService = this.moduleContainer.get("organization");
      await organizationService.removeStudio(studioID);
    } catch (error) {
      console.error(`Error removing studio ${studioID}:`, error);
      throw error;
    }
  }

  async removeUser(userID) {
    try {
      console.log(`Removing user: ${userID}`);
      const organizationService = this.moduleContainer.get("organization");
      await organizationService.removeUser(userID);
    } catch (error) {
      console.error(`Error removing user ${userID}:`, error);
      throw error;
    }
  }

  // Task management methods
  getActiveTasksCount() {
    return this.scheduledTasks.size;
  }

  getTaskNames() {
    return Array.from(this.scheduledTasks.keys());
  }

  isTaskActive(taskName) {
    return this.scheduledTasks.has(taskName);
  }

  // Cleanup method to be called on service shutdown
  shutdown() {
    console.log("Shutting down scheduled tasks service...");
    this.clearAllTasks();
    this.isRunning = false;
  }
}
