import { AnalyticsEvents } from "../../../models/analyticsevents.js";
import mongoose from "mongoose";

export class AnalyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async removeAnalyticsEvent(gameID, branch, eventID, clientUID) {
    try {
      if (!gameID || !branch || !eventID) {
        throw new Error("Missing required parameters");
      }

      // Set analytics event field "removed" to true
      const result = await AnalyticsEvents.findOneAndUpdate(
        { gameID, branch: branch, eventID: eventID },
        { $set: { removed: true } }
      );
      const warehouseService = this.moduleContainer.get("warehouse");

      warehouseService.removeAnalyticsTemplatesByEventID(gameID, branch, [
        eventID,
      ]);
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "events",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: removed analytics event | SUBJECT: ${eventID}`
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  async updateAnalyticsEvent(gameID, branch, eventID, eventObject, clientUID) {
    try {
      if (!gameID || !branch || !eventID || !eventObject) {
        throw new Error("Missing required parameters");
      }

      // Find the existing event to compare values before update
      const existingEvent = await AnalyticsEvents.findOne({
        gameID: gameID,
        branch: branch,
        eventID: eventID,
      }).lean();

      if (!existingEvent) {
        throw new Error("Analytics event not found");
      }

      // Extract the current values for comparison
      const currentValues = existingEvent.values;

      // Find value IDs that have been changed or removed
      const changedValueIDs = [];
      const newValueMap = new Map(
        eventObject.values.map((v) => [v.uniqueID, v])
      );

      currentValues.forEach((value) => {
        const newValue = newValueMap.get(value.uniqueID);
        if (!newValue || newValue.valueFormat !== value.valueFormat) {
          changedValueIDs.push(value.uniqueID);
        }
      });

      //
      const mergedValues = [];

      //   currentValues
      currentValues.forEach((currentValue) => {
        const newValue = newValueMap.get(currentValue.uniqueID);
        if (newValue) {
          //     ,
          mergedValues.push(newValue);
          //    Map,
          newValueMap.delete(currentValue.uniqueID);
        } else {
          //    eventObject.values,   removed
          mergedValues.push({ ...currentValue, removed: true });
        }
      });

      //     eventObject.values ( )
      for (const newValue of newValueMap.values()) {
        mergedValues.push(newValue);
      }

      // Find and update the event in the AnalyticsEvents collection
      const updatedAnalyticsEvent = await AnalyticsEvents.updateOne(
        {
          gameID: gameID,
          branch: branch,
          eventID: eventID,
        },
        {
          $set: {
            eventName: eventObject.eventName,
            eventCodeName: eventObject.eventCodeName,
            values: mergedValues,
            comment: eventObject.comment,
            tags: eventObject.tags,
          },
        }
      );

      if (!updatedAnalyticsEvent) {
        throw new Error("Analytics event not found");
      }

      // If there are changed or removed value IDs, call the remove function
      if (changedValueIDs.length > 0) {
        const warehouseService = this.moduleContainer.get("warehouse");

        await warehouseService.removeAnalyticsTemplatesByEventValueID(
          gameID,
          branch,
          changedValueIDs
        );
      }
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "events",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: updated analytics event | SUBJECT: ${eventID}`
      );

      return;
    } catch (error) {
      throw error;
    }
  }

  async createNewAnalyticsEvent(gameID, branch, clientUID) {
    try {
      if (!gameID || !branch) {
        throw new Error("Missing required parameters");
      }

      const eventID = new mongoose.Types.ObjectId().toString();
      const newEvent = {
        eventID,
        eventName: "New Event",
        eventCodeName: "",
        values: [],
        comment: "",
        tags: [],
      };

      // Add the new event to the AnalyticsEvents collection
      await AnalyticsEvents.insertMany([
        { gameID, branch: branch, ...newEvent },
      ]);
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "events",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: created new analytics event  | SUBJECT: ${newEvent.eventID}`
      );

      return newEvent;
    } catch (error) {
      throw error;
    }
  }

async getAllAnalyticsEvents(gameID, branch, getRemoved) {
    // Check for required parameters
    if (!gameID || !branch) {
      const error = new Error("Missing required parameters");
      error.statusCode = 400;
      throw error;
    }

    // Retrieve events from the database
    let events = await AnalyticsEvents.find({
      gameID: gameID,
      branch: branch,
    }).lean();

    // defaultAnalyticsEvents.map(def => {
    //   if (!events.some(e => e.eventID === def.eventID)) {
    //     events.push(def)
    //   }
    // })

    // Process the events
    if (events && events.length > 0 && !getRemoved) {
      events = events
        .filter((event) => !event.removed)
        .map((e) => {
          e.values = e.values.filter((v) => !v.removed);
          return e;
        });
    }

    return events;
  }
  async getAnalyticsEvent(gameID, branch, eventID) {
  // Check for required parameters
  if (!gameID || !branch || !eventID) {
    throw new Error("Missing required parameters");
  }

  // Find the necessary event in the database
  const event = await AnalyticsEvents.findOne({
    gameID: gameID,
    branch: branch,
    eventID: eventID,
  });

  if (!event) {
    throw new Error("Event not found");
  }

  return event;
}

  async getAnalyticsEvents(gameID, branch, eventIDs) {
    // Check for required parameters
    if (!gameID || !branch || !eventIDs || eventIDs.length === 0) {
      throw new Error("Missing required parameters");
    }

    // Find the necessary events in the database
    let events = await AnalyticsEvents.find({
      gameID: gameID,
      branch: branch,
      eventID: { $in: eventIDs },
    });

    console.log("GOT EVENTS:", events)

    if (!events) {
      return [];
    }

    return events;
  }

  async getAnalyticsEventsConfig(gameID, branch, eventIDs) {
    try {
      if (!gameID || !branch || !eventIDs || !eventIDs.length) {
        throw new Error("Missing required parameters");
      }

      const analyticsData = await AnalyticsEvents.findOne({
        gameID,
        branch: branch,
      });

      if (!analyticsData) {
        throw new Error("Data not found");
      }

      const branch = analyticsData.branches.find((b) => b.branch === branch);
      const filteredEvents = branch.events.filter((event) =>
        eventIDs.includes(event.eventID)
      );

      return filteredEvents;
    } catch (error) {
      throw error;
    }
  }

  async getRecentAnalyticsEvents(gameID, branch, eventID) {
    try {
      const count = 100;
      const cacheKey = `${gameID}:${branch}:recentAnalyticsEvents:${eventID}`;
      const contentCacher = this.moduleContainer.get("contentCacher");
      const resp = await contentCacher.tryGetCache_LIFORange(cacheKey, count);
      if (!resp) {
        return [];
      } else {
        return resp;
      }
    } catch (error) {
      console.error(error);
    }
    return [];
  }
}
export default AnalyticsService;
