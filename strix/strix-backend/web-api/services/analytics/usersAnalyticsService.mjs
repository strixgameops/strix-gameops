import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

export class UsersAnalyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async getNewUsers(
    gameID,
    studioID,
    branch,
    environment,
    filterDate,
    filterSegments,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics,
    gameIDs = null // Optional parameter for multiple gameIDs
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");

    const utilityService = this.moduleContainer.get("utility");
    utilityService.log(
      "QUERY getNewUsers:",
      gameID,
      studioID,
      filterDate,
      filterSegments,
      gameIDs
    );

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getNewUsersQuery(
        studioID,
        gameID,
        interval,
        filterSegments,
        branch,
        gameIDs // Pass gameIDs to query function
      );

      let formattedResult = [];
      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
      }
      formattedResult = data.sort(
        (a, b) =>
          dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
      );

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }

    function getNewUsersQuery(
      studioID,
      gameID,
      interval,
      filterSegments,
      branch,
      gameIDs
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
        ON '${utilityService.getDemoGameID(
          gameID
        )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

      // Logic for gameID filtering - support multiple gameIDs
      const gameIDCondition = gameIDs && gameIDs.length > 0 
        ? `IN (${gameIDs.map(id => `'${id}'`).join(',')})`
        : `= '${gameID}'`;

      parsedSQL = `
        WITH all_sessions AS (
        SELECT s."clientID",
        s."sessionID",
        s."branch",
        s."environment",
        s."gameID"
        FROM "sessions-${studioID}" AS s
        WHERE s."timestamp" BETWEEN '${interval.interval[0]}' AND '${interval.interval[1]}'
        AND s."gameID" ${gameIDCondition}
        ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
        ${
          includeEnvironmentInAnalytics
            ? `AND s."environment" = '${environment}'`
            : ""
        }
      )
        SELECT
        DATE_TRUNC('${interval.granularity}', timestamp) AS "timestamp",
          COUNT(DISTINCT s."clientID") AS "value"
        FROM "events-${studioID}" e
        JOIN all_sessions s
          ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID" 
        ${segmentsJoin}
        WHERE "timestamp" BETWEEN '${interval.interval[0]}' AND '${interval.interval[1]}'
        AND s."gameID" ${gameIDCondition}
        AND e."type" = 'newSession'
        AND e."field1" = 'true'
        ${segmentsQueryFilters}
        GROUP BY DATE_TRUNC('${interval.granularity}', timestamp)
        ORDER BY "timestamp" DESC
      `;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async getRetention(
    gameID,
    studioID,
    branch,
    environment,
    filterDate,
    filterSegments,
    filterDateSecondary,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics,
    gameIDs = null // Optional parameter for multiple gameIDs
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");

    const utilityService = this.moduleContainer.get("utility");
    utilityService.log(
      "QUERY getRetention:",
      gameID,
      studioID,
      branch,
      filterDate,
      filterSegments,
      gameIDs
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

        let eventsCount = 0;
        while (
          currentStartDate.isBefore(finalEndDate) ||
          (currentStartDate.isSame(finalEndDate) && eventsCount < 30)
        ) {
          let retentionInterval = coreAnalytics.constructIntervalFromDateFilter(
            [
              currentStartDate.format("YYYY-MM-DD"),
              finalEndDate.format("YYYY-MM-DD"),
            ]
          );
          promises.push(makeRequest(retentionInterval));

          eventsCount++;
          currentStartDate = currentStartDate.add(1, "day");
        }
        return promises;
      }

      async function makeRequest(interval) {
        let query = getQuery_Retention(
          gameID,
          studioID,
          branch,
          interval,
          filterSegments,
          gameIDs // Pass gameIDs to query function
        );

        let formattedResult = [];
        const data = await db.PGquery(query);

        if (data.errorMessage) {
          coreAnalytics.handleSqlError(data.errorMessage);
        }
        formattedResult = data[0];

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

      let formattedResult = coreAnalytics
        .generateTimestamps(
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

    function getQuery_Retention(
      gameID,
      studioID,
      branch,
      interval,
      filterSegments,
      gameIDs
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
      ON '${utilityService.getDemoGameID(
        gameID
      )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

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

      // Logic for gameID filtering - support multiple gameIDs
      const gameIDCondition = (gameIDs && Array.isArray(gameIDs) && gameIDs.length > 0) 
        ? `IN (${gameIDs.map(id => `'${id}'`).join(',')})`
        : `= '${gameID}'`;

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
      FROM "events-${studioID}" e
      JOIN "sessions-${studioID}" s
        ON e."clientID" = s."clientID" 
      AND e."sessionID" = s."sessionID"
      ${segmentsJoin}
      WHERE e."timestamp" BETWEEN '${startDay[0]}' AND '${startDay[1]}'
        AND e."gameID" ${gameIDCondition}
        ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
        ${
          includeEnvironmentInAnalytics
            ? `AND s."environment" = '${environment}'`
            : ""
        }
        ${segmentsQueryFilters}
    ),

    retention AS (
      SELECT DISTINCT "clientID",DATE_TRUNC('${
        interval.granularity
      }', "event_day") AS event_day
      FROM "mv-retention-${studioID}"
      WHERE "event_day" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
        AND "gameID" ${gameIDCondition}
    )

    SELECT
      ${NdayRetentionStatements}
    FROM cohort c
    LEFT JOIN retention r 
      ON c."clientID" = r."clientID";
    `;

      // utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async getDAU(
    gameID,
    studioID,
    branch,
    environment,
    filterDate,
    filterSegments,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics,
    gameIDs = null // Optional parameter for multiple gameIDs
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");

    const utilityService = this.moduleContainer.get("utility");
    utilityService.log(
      "QUERY getDAU:",
      gameID,
      studioID,
      filterDate,
      filterSegments,
      gameIDs
    );

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getDAUQuery(
        studioID,
        gameID,
        interval,
        filterSegments,
        branch,
        gameIDs // Pass gameIDs to query function
      );

      let formattedResult = [];
      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
      }
      formattedResult = data.sort(
        (a, b) =>
          dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
      );

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }

    function getDAUQuery(studioID, gameID, interval, filterSegments, branch, gameIDs) {
      const segmentsCondition =
        filterSegments.length > 0
          ? `AND seg."segments" @> ARRAY[${filterSegments
              .map((s) => `'${s}'`)
              .join(",")}]::text[]`
          : "";

      const segmentsJoin =
        filterSegments.length > 0
          ? `JOIN "segments-${studioID}" seg
      ON '${utilityService.getDemoGameID(
        gameID
      )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

      // Logic for gameID filtering - support multiple gameIDs
      const gameIDCondition = gameIDs && gameIDs.length > 0 
        ? `IN (${gameIDs.map(id => `'${id}'`).join(',')})`
        : `= '${gameID}'`;

      const parsedSQL = `
      WITH all_sessions AS (
        SELECT
          s."clientID",
          s."sessionID",
          s."branch",
          s."gameID"
        FROM "sessions-${studioID}" AS s
        WHERE s."timestamp" BETWEEN '${interval.interval[0]}' AND '${interval.interval[1]}'
          AND s."gameID" ${gameIDCondition}
          ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = '${environment}'`
              : ""
          }
      )
      SELECT
      DATE_TRUNC('${interval.granularity}', e."timestamp") AS "timestamp",
        COUNT(DISTINCT s."clientID") AS "value"
      FROM "events-${studioID}" e
      JOIN all_sessions s
        ON e."clientID" = s."clientID"
        AND e."sessionID" = s."sessionID"
      ${segmentsJoin}
      WHERE e."timestamp" BETWEEN '${interval.interval[0]}' AND '${interval.interval[1]}'
      ${segmentsCondition}
      GROUP BY DATE_TRUNC('${interval.granularity}', e."timestamp")
      ORDER BY "timestamp" DESC
    `;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async getRetentionBig(
    gameID,
    studioID,
    branch,
    environment,
    filterDate,
    filterSegments,
    filterDateSecondary,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");

    const utilityService = this.moduleContainer.get("utility");
    utilityService.log(
      "QUERY getRetention:",
      gameID,
      studioID,
      branch,
      filterDate,
      filterSegments,
      filterDateSecondary
    );

    try {
      const segments = Array.isArray(filterSegments)
        ? filterSegments.length > 0
          ? ["everyone", ...filterSegments]
          : ["everyone"]
        : ["everyone"];

      // ,
      const useSecondaryDateMode =
        filterDateSecondary &&
        Array.isArray(filterDateSecondary) &&
        filterDateSecondary.length === 2;

      //
      const segmentResults = [];

      //
      for (const segment of segments) {
        //
        //   "everyone",    (  )
        const currentSegmentFilter = segment === "everyone" ? [] : [segment];

        //
        let segmentData;

        if (useSecondaryDateMode) {
          //
          const secondaryInterval =
            coreAnalytics.constructIntervalFromDateFilter(filterDateSecondary);

          const query = getQuery_SingleRetention(
            gameID,
            studioID,
            branch,
            environment,
            secondaryInterval,
            currentSegmentFilter,
            includeBranchInAnalytics,
            includeEnvironmentInAnalytics
          );

          const data = await db.PGquery(query);

          if (data.errorMessage) {
            coreAnalytics.handleSqlError(data.errorMessage);
          }

          //
          segmentData = coreAnalytics
            .generateTimestamps(
              dayjs.utc(secondaryInterval.interval[0]),
              dayjs.utc(secondaryInterval.interval[1])
            )
            .sort(
              (a, b) =>
                dayjs.utc(a.timestamp).valueOf() -
                dayjs.utc(b.timestamp).valueOf()
            )
            .map((date, index) => {
              const key = `Day ${index}`;
              return {
                timestamp: date.timestamp,
                retention:
                  data[0] && data[0][key] ? parseInt(data[0][key], 10) : 0,
                day: key,
                segmentId: segment, //
              };
            });
        } else {
          //
          const interval =
            coreAnalytics.constructIntervalFromDateFilter(filterDate);
          //   environment  getAverageRetention
          segmentData = await getAverageRetention(
            interval,
            currentSegmentFilter,
            environment
          );

          //
          segmentData = segmentData.map((item) => ({
            ...item,
            segmentId: segment,
          }));
        }

        //
        segmentResults.push({
          segmentId: segment,
          data: segmentData,
        });
      }

      return segmentResults;
    } catch (error) {
      console.error(error);
      return [];
    }

    //         (     )
    //  environment
    async function getAverageRetention(
      interval,
      currentSegmentFilter,
      environment
    ) {
      const promises = iterateAndShrinkInterval(
        interval.interval[0],
        interval.interval[1]
      );

      function iterateAndShrinkInterval(startDate, endDate) {
        let currentStartDate = dayjs.utc(startDate);
        const finalEndDate = dayjs.utc(endDate);
        const promises = [];

        let eventsCount = 0;
        while (
          currentStartDate.isBefore(finalEndDate) ||
          (currentStartDate.isSame(finalEndDate) && eventsCount < 90)
        ) {
          let retentionInterval = coreAnalytics.constructIntervalFromDateFilter(
            [
              currentStartDate.format("YYYY-MM-DD"),
              finalEndDate.format("YYYY-MM-DD"),
            ]
          );
          //  environment  makeRequest
          promises.push(
            makeRequest(retentionInterval, currentSegmentFilter, environment)
          );

          eventsCount++;

          // Shift interval as we iterate
          currentStartDate = currentStartDate.add(1, "day");
        }
        return promises;
      }

      //  environment
      async function makeRequest(interval, currentSegmentFilter, environment) {
        let query = getQuery_Retention(
          gameID,
          studioID,
          branch,
          environment, //  environment
          interval,
          currentSegmentFilter,
          includeBranchInAnalytics,
          includeEnvironmentInAnalytics
        );

        let formattedResult = [];
        const data = await db.PGquery(query);

        if (data.errorMessage) {
          coreAnalytics.handleSqlError(data.errorMessage);
        }
        formattedResult = data[0];

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

      return coreAnalytics
        .generateTimestamps(
          dayjs.utc(interval.interval[0]),
          dayjs.utc(interval.interval[1])
        )
        .sort(
          (a, b) =>
            dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
        )
        .map((date, index) => {
          const key = `Day ${index + 1}`;
          return {
            timestamp: date.timestamp,
            retention: retentionResults[key] || 0,
            day: key,
          };
        });
    }

    //   ,
    function getQuery_SingleRetention(
      gameID,
      studioID,
      branch,
      environment,
      interval,
      currentSegmentFilter,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    ) {
      let parsedSQL = "";

      const startDay = [
        dayjs.utc(interval.interval[0]).startOf("day").toISOString(),
        dayjs.utc(interval.interval[0]).endOf("day").toISOString(),
      ];

      let segmentsQueryFilters =
        currentSegmentFilter.length > 0
          ? `AND seg."segments" @> ARRAY[${currentSegmentFilter
              .map((segment) => `'${segment}'`)
              .join(",")}]::text[]\n`
          : "";

      let segmentsJoin =
        segmentsQueryFilters !== ""
          ? `
    JOIN "segments-${studioID}" seg
      ON '${utilityService.getDemoGameID(
        gameID
      )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

      //
      const numDays =
        dayjs
          .utc(interval.interval[1])
          .diff(dayjs.utc(interval.interval[0]), "day") + 1;

      let NdayRetentionStatements = ``;
      for (let i = 0; i < numDays; i++) {
        const formattedDay = dayjs
          .utc(interval.interval[0])
          .add(i, "day")
          .format("YYYY-MM-DD");
        NdayRetentionStatements += `\nCOUNT(DISTINCT CASE WHEN r.event_day = '${formattedDay}' THEN r."clientID" END) AS "Day ${i}"`;
        if (i + 1 !== numDays) {
          NdayRetentionStatements += `,`;
        }
      }

      parsedSQL = `
    WITH cohort AS (
      SELECT DISTINCT e."clientID"
      FROM "events-${studioID}" e
      JOIN "sessions-${studioID}" s
        ON e."clientID" = s."clientID" 
       AND e."sessionID" = s."sessionID"
      ${segmentsJoin}
      WHERE e."timestamp" BETWEEN '${startDay[0]}' AND '${startDay[1]}' 
      AND e."gameID" = '${gameID}'
      AND e."type" = 'newSession'
      AND e."field1" = 'true'
        ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
        ${
          includeEnvironmentInAnalytics
            ? `AND s."environment" = '${environment}'`
            : ""
        }
        ${segmentsQueryFilters}
    ),

    retention AS (
      SELECT DISTINCT "clientID", DATE_TRUNC('day', "event_day") AS event_day
      FROM "mv-retention-${studioID}"
      WHERE "event_day" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
        AND "gameID" = '${gameID}'
    )

    SELECT
      ${NdayRetentionStatements}
    FROM cohort c
    LEFT JOIN retention r 
      ON c."clientID" = r."clientID";
    `;

      utilityService.log("Parsed SQL Single Retention: ", parsedSQL);
      return parsedSQL;
    }

    function getQuery_Retention(
      gameID,
      studioID,
      branch,
      environment,
      interval,
      currentSegmentFilter,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    ) {
      let parsedSQL = "";

      let segmentsQueryFilters =
        currentSegmentFilter.length > 0
          ? `AND seg."segments" @> ARRAY[${currentSegmentFilter
              .map((segment) => `'${segment}'`)
              .join(",")}]::text[]\n`
          : "";

      let segmentsJoin =
        segmentsQueryFilters !== ""
          ? `
    JOIN "segments-${studioID}" seg
      ON '${utilityService.getDemoGameID(
        gameID
      )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

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
        NdayRetentionStatements += `\nCOUNT(DISTINCT CASE WHEN r.event_day = '${formattedDay}' THEN r."clientID" END) AS "Day ${
          i + 1
        }"`;
        if (i + 1 !== numDays) {
          NdayRetentionStatements += `,`;
        }
      }

      parsedSQL = `
    WITH cohort AS (
      SELECT DISTINCT e."clientID"
      FROM "events-${studioID}" e
      JOIN "sessions-${studioID}" s
        ON e."clientID" = s."clientID" 
       AND e."sessionID" = s."sessionID"
      ${segmentsJoin}
      WHERE e."timestamp" BETWEEN '${startDay[0]}' AND '${startDay[1]}'
        AND e."gameID" = '${gameID}'
        AND e."type" = 'newSession'
        AND e."field1" = 'true'
        ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
        ${
          includeEnvironmentInAnalytics
            ? `AND s."environment" = '${environment}'`
            : ""
        }
        ${segmentsQueryFilters}
    ),

    retention AS (
      SELECT DISTINCT "clientID",DATE_TRUNC('${
        interval.granularity
      }', "event_day") AS event_day
      FROM "mv-retention-${studioID}"
      WHERE "event_day" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
        AND "gameID" = '${gameID}'
    )

    SELECT
      ${NdayRetentionStatements}
    FROM cohort c
    LEFT JOIN retention r 
      ON c."clientID" = r."clientID";
    `;

      // utilityService.log("Parsed SQL: ", parsedSQL);
      return parsedSQL;
    }
  }

  async getRetentionByCountry(
    gameID,
    studioID,
    branch,
    environment,
    filterDate,
    filterSegments,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics,
    gameIDs = null // Optional parameter for multiple gameIDs
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");

    const utilityService = this.moduleContainer.get("utility");
    utilityService.log(
      "QUERY getRetentionByCountry:",
      gameID,
      studioID,
      branch,
      filterDate,
      filterSegments,
      gameIDs
    );

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(filterDate);

      // Get the start and end of the day for retention calculation
      const startDay = dayjs
        .utc(interval.interval[0])
        .startOf("day")
        .toISOString();
      const endDay = dayjs.utc(interval.interval[0]).endOf("day").toISOString();

      const query = getQuery_RetentionByCountry(
        gameID,
        studioID,
        branch,
        { startDay, endDay },
        filterSegments,
        gameIDs // Pass gameIDs parameter
      );

      const data = await db.PGquery(query);
      if (data.errorMessage) {
        throw new Error(data.errorMessage);
      }

      // Group results by country
      const countryMap = data.reduce((acc, row) => {
        const country = row.country || "unknown";

        if (!acc.has(country)) {
          acc.set(country, {
            country,
            d0: 0,
            d1: 0,
            d3: 0,
            d7: 0,
            d30: 0,
          });
        }

        const countryEntry = acc.get(country);

        // Sum up retention values
        countryEntry.d0 += parseInt(row.d0) || 0;
        countryEntry.d1 += parseInt(row.d1) || 0;
        countryEntry.d3 += parseInt(row.d3) || 0;
        countryEntry.d7 += parseInt(row.d7) || 0;
        countryEntry.d30 += parseInt(row.d30) || 0;

        return acc;
      }, new Map());

      // Sort results by d0 (initial cohort size)
      const sortedResults = Array.from(countryMap.values()).sort(
        (a, b) => b.d0 - a.d0
      );

      return sortedResults;
    } catch (error) {
      console.error(error);
      return [];
    }

    function getQuery_RetentionByCountry(
      gameID,
      studioID,
      branch,
      interval,
      filterSegments,
      gameIDs
    ) {
      const { startDay, endDay } = interval;

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
      ON '${utilityService.getDemoGameID(
        gameID
      )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

      // Logic for gameID filtering - support multiple gameIDs
      const gameIDCondition = gameIDs && gameIDs.length > 0 
        ? `IN (${gameIDs.map(id => `'${id}'`).join(',')})`
        : `= '${gameID}'`;

      const parsedSQL = `
      WITH cohort AS (
        SELECT DISTINCT e."clientID", s."country"
        FROM "events-${studioID}" e
        JOIN "sessions-${studioID}" s
          ON e."clientID" = s."clientID"
        AND e."sessionID" = s."sessionID"
        ${segmentsJoin}
        WHERE e."timestamp" BETWEEN '${startDay}' AND '${endDay}'
          AND e."gameID" ${gameIDCondition}
          ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = '${environment}'`
              : ""
          }
          AND e."type" = 'newSession'
          AND e."field1" = 'true'
          ${segmentsQueryFilters}
      ),

      retention_1day AS (
        SELECT DISTINCT "clientID"
        FROM "events-${studioID}"
        WHERE "timestamp" BETWEEN '${startDay}'::timestamp + INTERVAL '1 days'
                              AND '${endDay}'::timestamp + INTERVAL '1 days'
          AND "gameID" ${gameIDCondition}
      ),

      retention_3day AS (
        SELECT DISTINCT "clientID"
        FROM "events-${studioID}"
        WHERE "timestamp" BETWEEN '${startDay}'::timestamp + INTERVAL '3 days'
                              AND '${endDay}'::timestamp + INTERVAL '3 days'
          AND "gameID" ${gameIDCondition}
      ),

      retention_7day AS (
        SELECT DISTINCT "clientID"
        FROM "events-${studioID}"
        WHERE "timestamp" BETWEEN '${startDay}'::timestamp + INTERVAL '7 days'
                              AND '${endDay}'::timestamp + INTERVAL '7 days'
          AND "gameID" ${gameIDCondition}
      ),

      retention_30day AS (
      SELECT DISTINCT "clientID"
      FROM "events-${studioID}"
      WHERE "timestamp" BETWEEN '${startDay}'::timestamp + INTERVAL '30 days'
                            AND '${endDay}'::timestamp + INTERVAL '30 days'
        AND "gameID" ${gameIDCondition}
      )

      SELECT
        c."country",
        COUNT(DISTINCT c."clientID") AS d0,
        COUNT(DISTINCT r1."clientID") AS d1,
        COUNT(DISTINCT r3."clientID") AS d3,
        COUNT(DISTINCT r7."clientID") AS d7,
        COUNT(DISTINCT r30."clientID") AS d30
      FROM cohort c
      LEFT JOIN retention_1day r1
        ON c."clientID" = r1."clientID"
      LEFT JOIN retention_3day r3
        ON c."clientID" = r3."clientID"
      LEFT JOIN retention_7day r7
        ON c."clientID" = r7."clientID"
      LEFT JOIN retention_30day r30
        ON c."clientID" = r30."clientID"
      GROUP BY c."country";
    `;

      return parsedSQL;
    }
  }

  async getNewUsersByCountry(
    gameID,
    studioID,
    branch,
    environment,
    filterDate,
    filterSegments,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics,
    gameIDs = null // Optional parameter for multiple gameIDs
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");

    const utilityService = this.moduleContainer.get("utility");
    utilityService.log(
      "QUERY getNewUsersByCountry:",
      gameID,
      studioID,
      filterDate,
      filterSegments,
      gameIDs
    );

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getNewUsersByCountryQuery(
        studioID,
        gameID,
        interval,
        filterSegments,
        branch,
        gameIDs // Pass gameIDs parameter
      );

      let formattedResult = [];
      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
      }
      formattedResult = data.sort(
        (a, b) =>
          dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
      );

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }

    function getNewUsersByCountryQuery(
      studioID,
      gameID,
      interval,
      filterSegments,
      branch,
      gameIDs
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
      ON '${utilityService.getDemoGameID(
        gameID
      )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

      // Logic for gameID filtering - support multiple gameIDs
      const gameIDCondition = gameIDs && gameIDs.length > 0 
        ? `IN (${gameIDs.map(id => `'${id}'`).join(',')})`
        : `= '${gameID}'`;

      parsedSQL = `
      WITH all_sessions AS (
      SELECT s."clientID",
      s."sessionID",
      s."branch",
      s."environment",
      s."gameID",
      s."country"
      FROM "sessions-${studioID}" AS s
      WHERE s."timestamp" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
      AND s."gameID" ${gameIDCondition}
      ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
      ${
        includeEnvironmentInAnalytics
          ? `AND s."environment" = '${environment}'`
          : ""
      }
    )
      SELECT
        s."country",
        COUNT(DISTINCT s."clientID") AS "value"
      FROM "events-${studioID}" AS e
      JOIN all_sessions s
        ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID" 
      ${segmentsJoin}
      WHERE "timestamp" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
      AND s."gameID" ${gameIDCondition}
      ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
      ${
        includeEnvironmentInAnalytics
          ? `AND s."environment" = '${environment}'`
          : ""
      }
      AND e."type" = 'newSession'
      AND e."field1" = 'true'
      ${segmentsQueryFilters}
      GROUP BY s."country"
      ORDER BY "value" DESC
    `;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async querySalesAndRevenueByCountry(
    gameID,
    studioID,
    branch,
    environment,
    filterDate,
    filterSegments,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics,
    gameIDs = null // Optional parameter for multiple gameIDs
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const utilityService = this.moduleContainer.get("utility");
    const db = this.moduleContainer.get("database");
    utilityService.log(
      "QUERY querySalesAndRevenueByCountry:",
      gameID,
      studioID,
      branch,
      filterDate,
      filterSegments,
      gameIDs
    );

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getSalesAndRevenueByCountryQuery(
        studioID,
        gameID,
        branch,
        interval,
        filterSegments,
        gameIDs // Pass gameIDs parameter
      );

      let formattedResult = [];
      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
      }
      
      formattedResult = data.map((dataItem) => {
        return {
          country: dataItem.country,
          revenue: dataItem.revenue,
          sales: dataItem.sales
        };
      });

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }

    function getSalesAndRevenueByCountryQuery(
      studioID,
      gameID,
      branch,
      interval,
      filterSegments,
      gameIDs
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
          ON '${utilityService.getDemoGameID(
            gameID
          )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

      // Logic for gameID filtering - support multiple gameIDs
      const gameIDCondition = gameIDs && gameIDs.length > 0 
        ? `IN (${gameIDs.map(id => `'${id}'`).join(',')})`
        : `= '${gameID}'`;

      // Default query with multiple gameIDs support
      parsedSQL =
        `WITH all_sessions AS (
          SELECT s."clientID",
          s."sessionID",
          s."environment",
          s."branch",
          s."gameID",
          s."country"
          FROM "sessions-${studioID}" AS s
          WHERE s."timestamp" BETWEEN '${interval.interval[0]}' AND '${
          interval.interval[1]
        }'
          AND s."gameID" ${gameIDCondition}
          ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = '${environment}'`
              : ""
          }
        ),
          filteredEvents AS (
            SELECT 
              e."clientID",
              s."sessionID",
              s."country",
              CAST(e."field2" AS NUMERIC) AS price
            FROM "events-${studioID}" e
            JOIN all_sessions s
              ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID"
            ${segmentsJoin}
            WHERE e."timestamp" BETWEEN '${interval.interval[0]}' AND '${
          interval.interval[1]
        }'
              AND e."gameID" ${gameIDCondition}
              ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
              ${
                includeEnvironmentInAnalytics
                  ? `AND s."environment" = '${environment}'`
                  : ""
              }
              AND e."type" = 'offerEvent'
              AND e."field4" IS NOT NULL ` +
        segmentsQueryFilters +
        `)` +
        `SELECT
                country,
                SUM(price) AS revenue,
                COUNT(*) AS sales
            FROM filteredEvents
            GROUP BY country
            ORDER BY revenue DESC`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async getCombinedMetricsByCountry(
    gameID,
    studioID,
    branch,
    environment,
    filterDate,
    filterSegments,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics,
    gameIDs = null // Optional parameter for multiple gameIDs
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");

    const utilityService = this.moduleContainer.get("utility");
    try {
      const [retentionData, newUsersData, salesRevenueData] = await Promise.all([
        this.getRetentionByCountry(
          gameID,
          studioID,
          branch,
          environment,
          filterDate,
          filterSegments,
          includeBranchInAnalytics,
          includeEnvironmentInAnalytics,
          gameIDs // Pass gameIDs parameter
        ),
        this.getNewUsersByCountry(
          gameID,
          studioID,
          branch,
          environment,
          filterDate,
          filterSegments,
          includeBranchInAnalytics,
          includeEnvironmentInAnalytics,
          gameIDs // Pass gameIDs parameter
        ),
        this.querySalesAndRevenueByCountry(
          gameID,
          studioID,
          branch,
          environment,
          filterDate,
          filterSegments,
          includeBranchInAnalytics,
          includeEnvironmentInAnalytics,
          gameIDs // Pass gameIDs parameter
        ),
      ]);

      const retentionMap = new Map();
      const newUsersMap = new Map();
      const salesRevenueMap = new Map();

      retentionData.forEach((entry) => {
        retentionMap.set(entry.country, {
          d0: entry.d0 || 0,
          d1: entry.d1 || 0,
          d3: entry.d3 || 0,
          d7: entry.d7 || 0,
          d30: entry.d30 || 0,
        });
      });

      newUsersData.forEach((entry) => {
        newUsersMap.set(entry.country, entry.value);
      });

      salesRevenueData.forEach((entry) => {
        salesRevenueMap.set(entry.country, {
          revenue: entry.revenue || 0,
          sales: entry.sales || 0,
        });
      });

      const allCountries = [
        ...new Set([
          ...retentionData.map((item) => item.country),
          ...newUsersData.map((item) => item.country),
          ...salesRevenueData.map((item) => item.country),
        ]),
      ];

      const result = allCountries.map((country) => {
        const retention = retentionMap.get(country) || {
          d0: 0,
          d1: 0,
          d3: 0,
          d7: 0,
          d30: 0,
        };
        const installs = newUsersMap.get(country) || 0;
        const salesRevenue = salesRevenueMap.get(country) || {
          revenue: 0,
          sales: 0,
        };

        const formatPercentage = (value) => {
          if (!retention.d0) return "0%";
          const percentage = (value / retention.d0) * 100;
          return `${percentage.toFixed(1)}%`;
        };

        return {
          countryName: country,
          installs: Number(installs),
          revenue: Number(salesRevenue.revenue),
          sales: Number(salesRevenue.sales),
          retention: {
            d1: formatPercentage(retention.d1),
            d3: formatPercentage(retention.d3),
            d7: formatPercentage(retention.d7),
            d30: formatPercentage(retention.d30),
          },
        };
      });

      const sortedResult = result.sort((a, b) => b.installs - a.installs);

      return sortedResult;
    } catch (error) {
      console.error("Error in getCombinedMetricsByCountry:", error);
      return [];
    }
  }

  
}
