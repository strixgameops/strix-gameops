
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
export class OverviewAnalyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }
  async getOverviewStatistics_DAU(
    gameID,
    studioID,
    filterDate,
    isStudioScope,
    forceRecache = false
  ) {
    const db = this.moduleContainer.get("database");
    const utilityService = this.moduleContainer.get("utility");
    const contentCacher = this.moduleContainer.get("contentCacher");
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    utilityService.log(
      "QUERY getOverviewStatistics_DAU:",
      gameID,
      studioID,
      filterDate,
      isStudioScope
    );

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getOverviewStatisticsQuery_DAU(
        studioID,
        gameID,
        interval,
        isStudioScope
      );

      const cachedResult = await contentCacher.getCachedAnalyticsResponse(
        query
      );
      if (cachedResult !== null && !forceRecache) return cachedResult;

      let formattedResult = []; // Define that and change to result later
      let data = await db.PGquery(query);
      if (!data) {
        data = [];
      }

      formattedResult = data.sort(
        (a, b) =>
          dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
      );

      // utilityService.log("Pre-formatted data length:", data.length);
      // utilityService.log("Post-formatted data length:", formattedResult.length);

      // utilityService.log("Cached result 2:", formattedResult);
      contentCacher.setAnalyticsQueryCache(query, formattedResult);

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getOverviewStatisticsQuery_DAU(
      studioID,
      gameID,
      interval,
      isStudioScope
    ) {
      let parsedSQL = "";
      // Query for continious aggregate
      parsedSQL = `
    SELECT 
      "time" AS "timestamp",
      "dau",
      "newusers"
    FROM "mv-dau-${studioID}" AS e
    WHERE e."time" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
      ${isStudioScope ? "" : `AND "gameID" = '${gameID}'`}
    ORDER BY e."time" DESC;
    `;

      // Regular query
      // parsedSQL = `
      //   SELECT
      //    DATE_TRUNC('${interval.granularity}', timestamp) AS "timestamp",
      //     COUNT(DISTINCT "clientID") AS dau,
      //     COUNT(DISTINCT CASE WHEN "field1" = 'true' THEN "clientID" ELSE NULL END) AS newUsers
      //   FROM "events-${studioID}" e
      //   WHERE "timestamp" BETWEEN '${interval.interval[0]}' AND '${
      //   interval.interval[1]
      // }'
      //     ${isStudioScope ? "" : `AND "gameID" = '${gameID}'`}
      //   GROUP BY DATE_TRUNC('${interval.granularity}', timestamp)
      //   ORDER BY "timestamp" DESC
      // `;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }
  async getOverviewStatistics_Retention(
    gameID,
    studioID,
    filterDate,
    isStudioScope,
    forceRecache = false // Internal parameter used in scheduledTasks
  ) {
    const db = this.moduleContainer.get("database");
    const utilityService = this.moduleContainer.get("utility");
    const contentCacher = this.moduleContainer.get("contentCacher");
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    utilityService.log(
      "QUERY getOverviewStatistics_Retention:",
      gameID,
      studioID,
      filterDate,
      isStudioScope
    );

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(filterDate);

      const promises = iterateAndShrinkInterval(
        interval.interval[0],
        interval.interval[1]
      );

      function iterateAndShrinkInterval(startDate, endDate) {
        let currentStartDate = dayjs.utc(startDate);
        const finalEndDate = dayjs.utc(endDate);
        const promises = [];

        while (
          currentStartDate.isBefore(finalEndDate) ||
          currentStartDate.isSame(finalEndDate)
        ) {
          let retentionInterval = coreAnalytics.constructIntervalFromDateFilter([
            currentStartDate.format("YYYY-MM-DD"),
            finalEndDate.format("YYYY-MM-DD"),
          ]);
          utilityService.log("Retention interval:", retentionInterval);
          promises.push(makeRequest(retentionInterval));

          // Shift interval as we iterate
          currentStartDate = currentStartDate.add(1, "day");
        }
        return promises;
      }

      async function makeRequest(interval) {
        let query = getOverviewStatisticsQuery_Retention(
          studioID,
          gameID,
          interval,
          isStudioScope
        );

        const cachedResult = await contentCacher.getCachedAnalyticsResponse(
          query
        );
        if (cachedResult !== null && !forceRecache) return cachedResult;

        let formattedResult = []; // Define that and change to result later
        const data = await db.PGquery(query);

        if (!data) {
          data = [];
        }

        formattedResult = data[0];

        // utilityService.log("Pre-formatted data length:", data.length);
        // utilityService.log("Post-formatted data length:", formattedResult.length);

        contentCacher.setAnalyticsQueryCache(query, formattedResult);

        return formattedResult;
      }

      function sumObjectsArray(objectsArray) {
        return objectsArray.reduce((acc, obj) => {
          for (let key in obj) {
            acc[key] = (acc[key] || 0) + parseInt(obj[key], 10);
          }
          return acc;
        }, {});
      }

      const retentionResults = sumObjectsArray(await Promise.all(promises));

      let formattedResult = coreAnalytics.generateTimestamps(
        dayjs.utc(interval.interval[0]),
        dayjs.utc(interval.interval[1])
      )
        .sort(
          (a, b) =>
            dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
        )
        .map((date, index) => {
          const key = `d${index}`;
          return {
            timestamp: date.timestamp,
            retention: retentionResults[key] || 0,
          };
        });

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getOverviewStatisticsQuery_Retention(
      studioID,
      gameID,
      interval,
      isStudioScope
    ) {
      let parsedSQL = "";

      const startDay = [
        dayjs
          .utc(interval.interval[0])
          .subtract(1, "day")
          .startOf("day")
          .toISOString(),
        dayjs
          .utc(interval.interval[0])
          .subtract(1, "day")
          .endOf("day")
          .toISOString(),
      ];

      const numDays =
        interval.granularity === "day"
          ? interval.diff
          : Math.round(interval.diff / 24);

      let NdayRetentionStatements = ``;
      for (let i = 0; i < numDays; i++) {
        const formattedDay = dayjs
          .utc(startDay[0])
          .add(i + 1, "day")
          .format("YYYY-MM-DD");
        NdayRetentionStatements += `\nCOUNT(DISTINCT CASE WHEN r.event_day = '${formattedDay}' THEN r."clientID" END) AS d${i}`;
        if (i + 1 !== numDays) {
          NdayRetentionStatements += `,`;
        }
      }

      parsedSQL = `
    WITH cohort AS (
      SELECT DISTINCT e."clientID"
      FROM "events-${studioID}" AS e
      JOIN "sessions-${studioID}" AS s
        ON e."clientID" = s."clientID" 
       AND e."sessionID" = s."sessionID"
      WHERE e."timestamp" BETWEEN '${startDay[0]}' AND '${startDay[1]}'
      AND e."type" = 'newSession'
      AND e."field1" = 'true'
        ${isStudioScope ? "" : `AND e."gameID" = '${gameID}'`}
    ),

    retention AS (
      SELECT DISTINCT(e."clientID"), e."event_day", e."gameID"
      FROM "mv-retention-${studioID}" AS e
      WHERE e."event_day" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
        ${isStudioScope ? "" : `AND e."gameID" = '${gameID}'`}
    )

    SELECT
      ${NdayRetentionStatements}
    FROM cohort AS c
    LEFT JOIN retention AS r
      ON c."clientID" = r."clientID";
`;

      //   parsedSQL = `
      //   WITH unique_clients AS (
      //   SELECT DISTINCT e."clientID"
      //   FROM "events-${studioID}" AS e
      //   WHERE "timestamp" BETWEEN '${startDay[0]}' AND '${startDay[1]}'
      //     ${isStudioScope ? "" : `AND "gameID" = '${gameID}'`}
      //   ),

      //   events_next_7_days AS (
      //       SELECT e."clientID", "timestamp"
      //       FROM "events-${studioID}" AS e
      //       WHERE "timestamp" BETWEEN '${interval.interval[0]}' AND '${
      //     interval.interval[1]
      //   }'
      //   ),

      //   clients_presence AS (
      //       SELECT u."clientID",
      //              COUNT(DISTINCT e."timestamp") AS active_days
      //       FROM unique_clients AS u
      //       LEFT JOIN events_next_7_days AS e
      //       ON u."clientID" = e."clientID"
      //       GROUP BY u."clientID"
      //   )

      //   SELECT
      //       COUNT(CASE WHEN active_days >= 1 THEN 1 END) AS d1,
      //       COUNT(CASE WHEN active_days >= 2 THEN 1 END) AS d2,
      //       COUNT(CASE WHEN active_days >= 3 THEN 1 END) AS d3,
      //       COUNT(CASE WHEN active_days >= 4 THEN 1 END) AS d4,
      //       COUNT(CASE WHEN active_days >= 5 THEN 1 END) AS d5,
      //       COUNT(CASE WHEN active_days >= 6 THEN 1 END) AS d6,
      //       COUNT(CASE WHEN active_days >= 7 THEN 1 END) AS d7
      //   FROM clients_presence
      // `;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }
  async getOverviewStatistics_Revenue(
    gameID,
    studioID,
    filterDate,
    isStudioScope,
    forceRecache = false
  ) {
    const db = this.moduleContainer.get("database");
    const utilityService = this.moduleContainer.get("utility");
    const contentCacher = this.moduleContainer.get("contentCacher");
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    utilityService.log(
      "QUERY getOverviewStatistics_Revenue:",
      gameID,
      studioID,
      filterDate,
      isStudioScope
    );

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getOverviewStatisticsQuery_Revenue(
        studioID,
        gameID,
        interval,
        isStudioScope
      );

      const cachedResult = await contentCacher.getCachedAnalyticsResponse(
        query
      );
      if (cachedResult !== null && !forceRecache) return cachedResult;

      let formattedResult = []; // Define that and change to result later
      let data = await db.PGquery(query);
      if (!data) {
        data = [];
      }

      formattedResult = data.map((dataItem) => {
        dataItem.timestamp = dataItem.x;
        delete dataItem.x;
        return dataItem;
      });

      formattedResult = formattedResult.sort(
        (a, b) =>
          dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
      );

      // utilityService.log("Pre-formatted data length:", data.length);
      // utilityService.log("Post-formatted data length:", formattedResult.length);

      contentCacher.setAnalyticsQueryCache(query, formattedResult);

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getOverviewStatisticsQuery_Revenue(studioID, gameID, interval) {
      let parsedSQL = "";
      parsedSQL =
        `WITH filteredEvents AS (
        SELECT
          e."clientID",
          CAST(e."field2" AS NUMERIC) AS price,
         DATE_TRUNC('${interval.granularity}', e."timestamp") AS x
        FROM "events-${studioID}" e

        WHERE e."timestamp" BETWEEN '${interval.interval[0]}' AND '${
          interval.interval[1]
        }'
          ${isStudioScope ? "" : `AND e."gameID" = '${gameID}'`}
          AND e."type" = 'offerEvent'
          AND e."field4" IS NOT NULL
      )` +
        `SELECT
            x,
            SUM(price) AS revenue
        FROM filteredEvents
        GROUP BY x
        ORDER BY x DESC`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async getFullOverviewStatistics_Games(gameIDs, forceRecache) {
        const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    // Define the date filter: from the start of 6 days ago to the end of today
    const filterDate = [
      dayjs.utc().subtract(6, "days").startOf("day").toISOString(),
      dayjs.utc().endOf("day").toISOString(),
    ];
    const pastInterval = coreAnalytics.getPastInterval(filterDate);
    const utilityService = this.moduleContainer.get("utility");
    utilityService.log(
      "filterDate_Current",
      filterDate,
      "filterDate_Past",
      pastInterval
    );

    // Generate the base array of timestamps
    const overallTimestamps = coreAnalytics.generateTimestamps(
      dayjs.utc(filterDate[0]).toDate(),
      dayjs.utc(filterDate[1]).toDate()
    ).sort(
      (a, b) =>
        dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
    );

    // Initialize the result structure
    let result = {
      overall: overallTimestamps.map((ts) => ({
        ...ts,
        dau: 0,
        newUsers: 0,
        revenue: 0,
        retention: 0,
      })),
      games: [],
    };

    // Process each game in parallel
    await Promise.all(
      gameIDs.map(async (gameID) => {
        const demoGameID = utilityService.getDemoGameID(gameID);
        const studioID = await utilityService.getStudioIDByGameID(demoGameID);

        // Fetch statistics: DAU, Revenue, and Retention for current and past intervals
        const [
          gameDAU_Past,
          gameDAU_Current,
          gameRevenue_Past,
          gameRevenue_Current,
          gameRetention_Current,
        ] = await Promise.all([
          this.getOverviewStatistics_DAU(
            demoGameID,
            studioID,
            pastInterval,
            forceRecache
          ),
          this.getOverviewStatistics_DAU(
            demoGameID,
            studioID,
            filterDate,
            forceRecache
          ),
          this.getOverviewStatistics_Revenue(
            demoGameID,
            studioID,
            pastInterval,
            forceRecache
          ),
          this.getOverviewStatistics_Revenue(
            demoGameID,
            studioID,
            filterDate,
            forceRecache
          ),
          this.getOverviewStatistics_Retention(
            demoGameID,
            studioID,
            filterDate,
            forceRecache
          ),
        ]);

        // Calculate user and new user delta
        const { deltaDau, deltaNewUsers } = calculateTotalDeltaUsers(
          gameDAU_Current,
          gameDAU_Past
        );
        // Calculate revenue delta
        const { deltaRevenue } = calculateTotalDeltaRevenue(
          gameRevenue_Current,
          gameRevenue_Past
        );

        // Build a time series based on the filtered dates, summing up values per day
        const gameTimeSeries = overallTimestamps.map((timePoint) => {
          // Filter all records that match the current day
          const dauRecords = gameDAU_Current.filter((item) =>
            dayjs.utc(item.timestamp).isSame(timePoint.timestamp, "day")
          );
          const revenueRecords = gameRevenue_Current.filter((item) =>
            dayjs.utc(item.timestamp).isSame(timePoint.timestamp, "day")
          );
          const retentionRecords = gameRetention_Current.filter((item) =>
            dayjs.utc(item.timestamp).isSame(timePoint.timestamp, "day")
          );

          // Sum the values from all matching records
          const totalDau = dauRecords.reduce(
            (sum, record) => sum + Number(record.dau),
            0
          );
          const totalNewUsers = dauRecords.reduce(
            (sum, record) => sum + Number(record.newusers),
            0
          );
          const totalRevenue = revenueRecords.reduce(
            (sum, record) => sum + Number(record.revenue),
            0
          );
          const totalRetention = retentionRecords.reduce(
            (sum, record) => sum + Number(record.retention),
            0
          );

          return {
            dau: {
              timestamp: timePoint.timestamp,
              value: totalDau,
            },
            newUsers: {
              timestamp: timePoint.timestamp,
              value: totalNewUsers,
            },
            retention: {
              timestamp: timePoint.timestamp,
              value: totalRetention,
            },
            revenue: {
              timestamp: timePoint.timestamp,
              value: totalRevenue,
            },
          };
        });

        // Add game data to the final result
        result.games.push({
          gameID,
          deltaDau,
          deltaNewUsers,
          deltaRevenue,
          data: gameTimeSeries,
        });

        // Aggregate game data into the overall dataset
        gameTimeSeries.forEach((dataItem) => {
          const overallItem = result.overall.find((item) =>
            dayjs.utc(item.timestamp).isSame(dataItem.dau.timestamp, "day")
          );
          if (overallItem) {
            overallItem.dau += dataItem.dau.value;
            overallItem.newUsers += dataItem.newUsers.value;
            overallItem.revenue += dataItem.revenue.value;
            overallItem.retention += dataItem.retention.value;
          }
        });
      })
    );

    // Calculate the overall delta across all games
    result.overallDelta = {
      deltaDau: result.games.reduce(
        (acc, game) => acc + Number(game.deltaDau),
        0
      ),
      deltaNewUsers: result.games.reduce(
        (acc, game) => acc + Number(game.deltaNewUsers),
        0
      ),
      deltaRevenue: result.games.reduce(
        (acc, game) => acc + Number(game.deltaRevenue),
        0
      ),
    };

    return result;

    // Helper functions

    function calculateTotalDeltaRevenue(currentData, pastData) {
      const sumRevenue = (data) =>
        data.reduce((total, item) => total + Number(item.revenue), 0);
      return { deltaRevenue: sumRevenue(currentData) - sumRevenue(pastData) };
    }

    function calculateTotalDeltaUsers(currentData, pastData) {
      const sumStats = (data) =>
        data.reduce(
          (totals, item) => {
            totals.dau += Number(item.dau);
            totals.newUsers += Number(item.newusers);
            return totals;
          },
          { dau: 0, newUsers: 0 }
        );
      const currentTotals = sumStats(currentData);
      const pastTotals = sumStats(pastData);
      return {
        deltaDau: currentTotals.dau - pastTotals.dau,
        deltaNewUsers: currentTotals.newUsers - pastTotals.newUsers,
      };
    }
  }

  async getFullOverviewStatistics_Studios(studioIDs) {
    const utilityService = this.moduleContainer.get("utility");
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    const filterDate = [
      dayjs.utc().subtract(6, "days").startOf("day").toISOString(),
      dayjs.utc().endOf("day").toISOString(),
    ];

    const pastInterval = coreAnalytics.getPastInterval(filterDate);
    utilityService.log(
      "filterDate_Current",
      filterDate,
      "filterDate_Past",
      pastInterval
    );

    let result = {
      overall: coreAnalytics.generateTimestamps(
        dayjs.utc(filterDate[0]).toDate(),
        dayjs.utc(filterDate[1]).toDate()
      ).sort(
        (a, b) =>
          dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
      ),
      studios: [],
    };

    const promises = studioIDs.map((studio) => {
      let studioID = studio;
      if (studio.startsWith("demo_") && process.env.DEMO_STUDIO_ID) {
        studioID = process.env.DEMO_STUDIO_ID;
      }
      // new users and DAU combined
      const gameDAU_PastPromise = this.getOverviewStatistics_DAU(
        studioID,
        studioID,
        pastInterval,
        true
      );
      const gameDAU_CurrentPromise = this.getOverviewStatistics_DAU(
        studioID,
        studioID,
        filterDate,
        true
      );

      // revenue of the game
      const gameRevenue_PastPromise = this.getOverviewStatistics_Revenue(
        studioID,
        studioID,
        pastInterval,
        true
      );
      const gameRevenue_CurrentPromise = this.getOverviewStatistics_Revenue(
        studioID,
        studioID,
        filterDate,
        true
      );

      // retention of the game
      let gameRetention_CurrentPromise = this.getOverviewStatistics_Retention(
        studioID,
        studioID,
        filterDate,
        true
      );

      return Promise.all([
        gameDAU_PastPromise,
        gameDAU_CurrentPromise,
        gameRevenue_PastPromise,
        gameRevenue_CurrentPromise,
        gameRetention_CurrentPromise,
      ]).then(
        ([
          gameDAU_Past,
          gameDAU_Current,
          gameRevenue_Past,
          gameRevenue_Current,
          gameRetention_Current,
        ]) => {
          const { deltaDau, deltaNewUsers } = calculateTotalDeltaUsers(
            gameDAU_Current,
            gameDAU_Past
          );
          const { deltaRevenue } = calculateTotalDeltaRevenue(
            gameRevenue_Current,
            gameRevenue_Past
          );

          const localData = coreAnalytics.generateTimestamps(
            dayjs.utc(filterDate[0]).toDate(),
            dayjs.utc(filterDate[1]).toDate()
          )
            .sort(
              (a, b) =>
                dayjs.utc(a.timestamp).valueOf() -
                dayjs.utc(b.timestamp).valueOf()
            )
            .map((dataItem) => {
              const dauData = gameDAU_Current.find((item) =>
                dayjs.utc(item.timestamp).isSame(dataItem.timestamp)
              );

              const revenueData = gameRevenue_Current.find((item) =>
                dayjs.utc(item.timestamp).isSame(dataItem.timestamp)
              );

              const retentionData = gameRetention_Current.find((item) =>
                dayjs.utc(item.timestamp).isSame(dataItem.timestamp)
              );

              return {
                dau: {
                  timestamp: dataItem.timestamp,
                  value: dauData ? dauData.dau : 0,
                },
                newUsers: {
                  timestamp: dataItem.timestamp,
                  value: dauData ? dauData.newusers : 0,
                },
                retention: {
                  timestamp: dataItem.timestamp,
                  value: retentionData ? retentionData.retention : 0,
                },
                revenue: {
                  timestamp: dataItem.timestamp,
                  value: revenueData ? revenueData.revenue : 0,
                },
              };
            });

          result.studios.push({
            studioID: studioID,
            deltaDau: deltaDau,
            deltaNewUsers: deltaNewUsers,
            deltaRevenue: deltaRevenue,
            data: localData,
          });

          result.overall = result.overall.map((dataItem) => {
            const localDataItem = localData.find(
              (item) => item.dau.timestamp === dataItem.timestamp
            );

            if (localDataItem) {
              dataItem.dau =
                (parseFloat(dataItem.dau) || 0) +
                parseFloat(localDataItem.dau.value);
              dataItem.revenue =
                (parseFloat(dataItem.revenue) || 0) +
                parseFloat(localDataItem.revenue.value);
              dataItem.newUsers =
                (parseFloat(dataItem.newUsers) || 0) +
                parseFloat(localDataItem.newUsers.value);
              dataItem.retention =
                (parseFloat(dataItem.retention) || 0) +
                parseFloat(localDataItem.retention.value);
            } else {
              dataItem.dau = parseFloat(dataItem.dau) || 0;
              dataItem.revenue = parseFloat(dataItem.revenue) || 0;
              dataItem.newUsers = parseFloat(dataItem.newUsers) || 0;
              dataItem.retention = parseFloat(dataItem.retention) || 0;
            }

            return dataItem;
          });
          result.overallDelta = {
            deltaDau: result.studios.reduce(
              (acc, studio) => acc + parseFloat(studio.deltaDau),
              0
            ),
            deltaNewUsers: result.studios.reduce(
              (acc, studio) => acc + parseFloat(studio.deltaNewUsers),
              0
            ),
            deltaRevenue: result.studios.reduce(
              (acc, studio) => acc + parseFloat(studio.deltaRevenue),
              0
            ),
          };
        }
      );
    });
    return Promise.all(promises).then(() => result);

    function calculateTotalDeltaRevenue(currentData, pastData) {
      function sumStats(data) {
        return data.reduce(
          (totals, item) => {
            totals.revenue += parseFloat(item.revenue);
            return totals;
          },
          { revenue: 0 }
        );
      }

      const currentTotals = sumStats(currentData);
      const pastTotals = sumStats(pastData);

      const delta = {
        deltaRevenue: currentTotals.revenue - pastTotals.revenue,
      };
      if (delta === null) {
        return 0;
      }

      return delta;
    }
    function calculateTotalDeltaUsers(currentData, pastData) {
      function sumStats(data) {
        return data.reduce(
          (totals, item) => {
            totals.dau += parseFloat(item.dau);
            totals.newUsers += parseFloat(item.newUsers);
            return totals;
          },
          { dau: 0, newUsers: 0 }
        );
      }

      const currentTotals = sumStats(currentData);
      const pastTotals = sumStats(pastData);

      const delta = {
        deltaDau: currentTotals.dau - pastTotals.dau,
        deltaNewUsers: currentTotals.newUsers - pastTotals.newUsers,
      };
      if (delta === null) {
        return 0;
      }

      return delta;
    }
  }
}
