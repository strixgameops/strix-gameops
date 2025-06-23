import { AnalyticsEvents } from "../../models/analyticsevents.js";
import { Segments } from "../../models/segmentsModel.js";

import { PWplayers } from "../../models/PWplayers.js";

export class SharedFetchService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }
  async getAllSegmentsForAnalyticsFilter(gameID, branch) {
    const utilityService = this.moduleContainer.get("utility");

    let segments = await Segments.find(
      {
        gameID: gameID,
        branch: branch,
      },
      {
        segmentID: 1,
        segmentName: 1,
        _id: 0,
      }
    ).lean();

    const abTests = await getABTestsShort(gameID, branch);
    if (abTests.abTests && abTests.abTests.length > 0) {
      for (let segment of segments) {
        if (segment.segmentID.startsWith("abtest_")) {
          const testId = segment.segmentID.slice(7);
          segment.segmentName = abTests.abTests.find(
            (t) => t.id === testId
          ).name;
        }
      }
    }

    const flows = await getFlowsShort(gameID, branch);
    if (flows && flows.length > 0) {
      for (let segment of segments) {
        if (
          segment.segmentID.startsWith("flow_") &&
          !segment.segmentID.includes("_splitTest_")
        ) {
          const flowSid = segment.segmentID.split("_")[1];

          let flowName = "";
          flows.map((f) => {
            if (f.sid === flowSid) {
              const name = flows.find((f) => f.sid === flowSid)?.name;
              if (name) {
                flowName = `Flow | ${name}`;
              }
              return;
            }
          });

          if (!flowName) {
            flowName = "Flow | Unknown segment name";
          }

          segment.segmentName = flowName;
        }
      }
    }

    return segments;
  }

  async getAnalyticsEvents(gameID, branch, eventIDs) {
    const utilityService = this.moduleContainer.get("utility");

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

    // if (events.length < eventIDs.length) {
    //   defaultAnalyticsEvents.map(def => {
    //     if (!events.some(e => e.eventID === def.eventID)) {
    //       events.push(def)
    //     }
    //   })
    // }

    if (!events) {
      return [];
    }

    return events;
  }

  async getAnalyticsEvent(gameID, branch, eventID) {
    const utilityService = this.moduleContainer.get("utility");

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

  
}
