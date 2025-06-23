import shortid from "shortid";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { PWplayers } from "../../../models/PWplayers.js";

dayjs.extend(utc);
export class BehaviorAnalyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async getPlayersProfileByClientIDs(gameID, branch, clientIDs) {
    const utilityService = this.moduleContainer.get("utility");

    try {
      let players = await PWplayers.find({
        gameID,
        branch: utilityService.getBranchWithoutSuffix(branch),
        clientID: { $in: clientIDs },
      })
        .limit(10000)
        .lean();

      if (players.length === 0) {
        return [];
      } else {
        const result = players.map((p) => {
          return {
            clientID: p.clientID,
            elements: []
              .concat(p.elements.statistics)
              .concat(p.elements.analytics),
          };
        });
        return result;
      }
    } catch (error) {
      throw error;
    }
  }
  
  async queryBehaviorAnalysis(
    gameID,
    studioID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    minSessionLength,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const db = this.moduleContainer.get("database");
    const utilityService = this.moduleContainer.get("utility");
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const analyticsEventsService = this.moduleContainer.get("analytics");

    utilityService.log(
      "QUERY queryBehaviorAnalysis:",
      gameID,
      studioID,
      branch,
      filterDate, // Time interval we want to get
      filterSegments, // An array of segments that player must meet in order for his events to be included in the result
      minSessionLength
    );

    try {
      const interval =
        coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getBehaviourAnalysisQuery(
        studioID,
        gameID,
        branch,
        interval,
        filterSegments,
        minSessionLength
      );

      const allEvents = await analyticsEventsService.getAllAnalyticsEvents(
        gameID,
        branch,
        true
      );

      let formattedResult = []; // Define that and change to result later
      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
        // Should throw error if there is error
      }
      function groupEventsBySession(events) {
        const sessions = {};
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const sessionID = event.sessionID;

          (sessions[sessionID] ||= []).push(event);
        }

        return Object.values(sessions);
      }

      function cleanSessions(sessions) {
        // Calculate time elapsed between events in session
        function getTimeElapsed(events, currentIndex) {
          if (currentIndex > 0) {
            const difference = dayjs
              .utc(events[currentIndex].timestamp)
              .diff(dayjs.utc(events[currentIndex - 1].timestamp), "seconds");
            return [difference];
          }
          return undefined;
        }

        return sessions
          .map((events) => {
            //     newSession
            if (!events.some((e) => e.type === "newSession")) return null;

            events.sort(
              (a, b) =>
                dayjs.utc(a.timestamp).valueOf() -
                dayjs.utc(b.timestamp).valueOf()
            );

            function cleanUpSessions(events) {
              // Get the earliest newSession
              const newSessionEvents = events.filter(
                (event) => event.type === "newSession"
              );
              if (newSessionEvents.length > 1) {
                const earliestNewSession = newSessionEvents.reduce(
                  (earliest, current) =>
                    dayjs
                      .utc(current.timestamp)
                      .isBefore(dayjs.utc(earliest.timestamp))
                      ? current
                      : earliest
                );
                // Filter other newSessions
                events = events.filter(
                  (event) =>
                    event.type !== "newSession" || event === earliestNewSession
                );
              }
              return events;
            }

            events = cleanUpSessions(events);

            // Assume allEvents isnt changing
            const eventCache = {};
            events = events.map((event, index) => {
              let formattedEvent;

              // Cache to allEvents
              if (!eventCache[event.type]) {
                eventCache[event.type] = allEvents.find(
                  (e) => e.eventID === event.type
                );
              }

              const foundEvent = eventCache[event.type];
              if (foundEvent) {
                foundEvent.values.forEach((v) => {
                  if (v.removed) {
                    if (event.customDate) {
                      delete event.customData[v.valueID];
                    }
                  }
                });
              }

              const baseEvent = {
                sid: shortid.generate(),
                id: event.type,
                time: index === 0 ? undefined : getTimeElapsed(events, index),
                timestamp: event.timestamp,
                clientID: event.clientID,
                ...event.customData,
              };

              switch (event.type) {
                case "newSession":
                  formattedEvent = {
                    ...baseEvent,
                    sessionID: event.sessionID,
                  };
                  break;
                case "endSession":
                  formattedEvent = {
                    ...baseEvent,
                  };
                  break;
                case "reportEvent":
                  formattedEvent = {
                    ...baseEvent,
                    id:
                      index === events.length - 1
                        ? "endSessionCrash"
                        : event.type,
                    reportID: event.field1,
                    message: event.field2,
                  };
                  break;
                case "economyEvent":
                  formattedEvent = {
                    ...baseEvent,
                    currencyID: event.field1,
                    amount: event.field2,
                    type: event.field3,
                    origin: event.field4,
                  };
                  break;
                case "offerEvent":
                case "offerShown":
                  formattedEvent = {
                    ...baseEvent,
                    offerID: event.field1,
                    price: event.field2,
                  };
                  break;
                case "adEvent":
                  formattedEvent = {
                    ...baseEvent,
                    adNetwork: event.field1,
                    adType: event.field2,
                    timeSpent: event.field3,
                  };
                  break;
                default:
                  formattedEvent = {
                    ...baseEvent,
                  };
                  break;
              }
              return formattedEvent;
            });

            return events;
          })
          .filter(Boolean); //  null
      }

      // utilityService.log("Pre-formatted data length:", data.length);
      formattedResult = cleanSessions(groupEventsBySession(data));
      // utilityService.log("Post-formatted data length:", formattedResult.length);

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getBehaviourAnalysisQuery(
      studioID,
      gameID,
      branch,
      interval,
      filterSegments,
      minSessionLength
    ) {
      let parsedSQL = "";

      let segmentsQueryFilters =
        filterSegments.length > 0
          ? `AND seg."segments" @> ARRAY[${filterSegments
              .map((segment) => `'${segment}'`)
              .join(",")}]::text[]\n`
          : "";

      let segmentsJoin =
        segmentsQueryFilters !== ""
          ? `
    JOIN "segments-${studioID}" seg
      ON '${getDemoGameID(
        gameID
      )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

      //
      // Default query. Append everything we made above to this.
      //
      parsedSQL = `
    WITH all_sessions AS (
    	SELECT s."clientID",
      s."sessionID",
s."branch",
s."gameID"
    	FROM "sessions-${studioID}" AS s
    	WHERE s."timestamp" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
      AND s."gameID" = '${gameID}'
    	${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = '${environment}'`
              : ""
          }
    ),
    session_subset AS (
      SELECT DISTINCT e."sessionID"
      FROM "events-${studioID}" AS e
      JOIN all_sessions s
        ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID"
      ${segmentsJoin}
      WHERE e."timestamp" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
      AND (
          (e."type" = 'endSession'
            AND e."field1" IS NOT NULL
            AND CAST(e."field1" AS NUMERIC) > ${minSessionLength}
          )
          OR
          (e."type" = 'reportEvent'
            AND e."field1" = 'fatal'
          )
      )
      ${segmentsQueryFilters}
      LIMIT 1000
    )
    SELECT e."timestamp", e."clientID", e."sessionID", e."type", e."field1", e."field2", e."field3", e."field4", e."field5", e."customData"
      FROM "events-${studioID}" AS e
      JOIN session_subset AS ss
      ON e."sessionID" = ss."sessionID"
    `;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }
  async queryEconomyAnalysis(
    gameID,
    studioID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for their events to be included
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const db = this.moduleContainer.get("database");
    const utilityService = this.moduleContainer.get("utility");
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const analyticsEventsService = this.moduleContainer.get("analytics");

    utilityService.log(
      "QUERY queryEconomyAnalysis:",
      gameID,
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments
    );

    try {
      const interval =
        coreAnalytics.constructIntervalFromDateFilter(filterDate);

      const targetPlayers = await PWplayers.find(
        {
          gameID: gameID,
          environment,
          firstJoinDate: {
            // Take only the players who joined in the current interval
            $gte: interval.interval[0],
            $lte: interval.interval[1],
          },
        },
        { clientID: 1, _id: 0 }
      ).limit(5000);
      const targetPlayerIDs = new Set(
        targetPlayers.map((player) => player.clientID)
      );
      let query = getEconomyAnalysisQuery(
        studioID,
        gameID,
        branch,
        interval,
        filterSegments,
        Array.from(targetPlayerIDs)
      );

      const allEvents = await analyticsEventsService.getAllAnalyticsEvents(
        gameID,
        branch,
        true
      );

      let formattedResult = [];
      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
        // Should throw error if there is error
      }

      function groupEventsByPlayer(events) {
        const players = {};
        for (let i = 0; i < events.length; i++) {
          const event = events[i];
          const clientID = event.clientID;

          // Only add event if clientID exists in targetPlayerIDs
          if (!targetPlayerIDs.has(clientID)) continue;

          (players[clientID] ||= []).push(event);
        }
        return Object.values(players);
      }

      function cleanEconomyEvents(playerEvents) {
        // Optimize calculation of time between events
        function getTimeElapsed(events, currentIndex) {
          if (currentIndex > 0) {
            const difference = dayjs
              .utc(events[currentIndex].timestamp)
              .diff(dayjs.utc(events[currentIndex - 1].timestamp), "seconds");
            return [difference];
          }
          return undefined;
        }

        return playerEvents
          .map((events) => {
            // Sort events by timestamp
            events.sort(
              (a, b) =>
                dayjs.utc(a.timestamp).valueOf() -
                dayjs.utc(b.timestamp).valueOf()
            );

            events = [
              {
                type: "newSession",
                clientID: events[0].clientID,
                sessionID: events[0].sessionID,
                sid: shortid.generate(),
                timestamp: events[0].timestamp,
              },
              ...events,
            ];

            // Cache event types for better performance
            const eventCache = {};
            events = events
              .map((event, index) => {
                let formattedEvent;

                // Cache search results in allEvents
                if (!eventCache[event.type]) {
                  eventCache[event.type] = allEvents.find(
                    (e) => e.eventID === event.type
                  );
                }

                const foundEvent = eventCache[event.type];
                if (foundEvent) {
                  foundEvent.values.forEach((v) => {
                    if (v.removed) {
                      if (event.customData) {
                        delete event.customData[v.valueID];
                      }
                    }
                  });
                }

                const baseEvent = {
                  sid: shortid.generate(),
                  id: event.type,
                  time: index === 0 ? undefined : getTimeElapsed(events, index),
                  timestamp: event.timestamp,
                  clientID: event.clientID,
                  sessionID: event.sessionID,
                  ...event.customData,
                };

                switch (event.type) {
                  case "newSession":
                    formattedEvent = {
                      ...baseEvent,
                      sessionID: event.sessionID,
                    };
                    break;
                  case "economyEvent":
                    formattedEvent = {
                      ...baseEvent,
                      currencyID: event.field1,
                      amount: event.field2,
                      type: event.field3,
                      origin: event.field4,
                    };
                    break;
                }
                return formattedEvent;
              })
              .filter(Boolean); // Remove null events

            return events.length > 0 ? events : null;
          })
          .filter(Boolean); // Remove empty player arrays
      }

      formattedResult = cleanEconomyEvents(groupEventsByPlayer(data));

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getEconomyAnalysisQuery(
      studioID,
      gameID,
      branch,
      interval,
      filterSegments,
      targetPlayers
    ) {
      let segmentsQueryFilters =
        filterSegments.length > 0
          ? `AND seg."segments" @> ARRAY[${filterSegments
              .map((segment) => `'${segment}'`)
              .join(",")}]::text[]\n`
          : "";

      let segmentsJoin =
        segmentsQueryFilters !== ""
          ? `
    JOIN "segments-${studioID}" seg
      ON '${getDemoGameID(
        gameID
      )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

      const newPlayersFilter =
        targetPlayers.length > 0
          ? `\nAND s."clientID" IN (${targetPlayers.map((id) => `'${id}'`)})`
          : "";

      // Query to get economy-related events for players
      let parsedSQL = `
    WITH all_sessions AS (
    	SELECT s."clientID",
        s."sessionID",
        s."branch",
        s."gameID"
    	FROM "sessions-${studioID}" AS s
    	WHERE s."timestamp" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
      AND s."gameID" = '${gameID}'
    	${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = '${environment}'`
              : ""
          }
      ${newPlayersFilter}
    ),
    player_events AS (
      SELECT DISTINCT e."clientID"
      FROM "events-${studioID}" AS e
      JOIN all_sessions s
        ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID"
      ${segmentsJoin}
      WHERE e."timestamp" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
      AND e."type" = 'economyEvent'
      
      ${segmentsQueryFilters}
      LIMIT 1000
    )
    SELECT e."timestamp", e."clientID", e."sessionID", e."type", e."field1", e."field2", e."field3", e."field4", e."field5", e."customData"
      FROM "events-${studioID}" AS e
      JOIN player_events AS pe
      ON e."clientID" = pe."clientID"
      WHERE e."timestamp" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
      AND e."type" = 'economyEvent'
      ORDER BY e."clientID", e."timestamp"
    `;

      utilityService.log("Parsed SQL for Economy Analysis:\n", parsedSQL);
      return parsedSQL;
    }
  }
}
