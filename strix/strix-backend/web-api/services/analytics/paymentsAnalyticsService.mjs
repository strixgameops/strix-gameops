import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
import { OffersModel } from "../../../models/offersModel.js";
import { PWtemplates } from "../../../models/PWtemplates.js";
import { PWplayers } from "../../../models/PWplayers.js";

export class PaymentsAnalyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }
  async realMoneyTopProducts(
    gameID,
    studioID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const utilityService = this.moduleContainer.get("utility");
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    const db = this.moduleContainer.get("database");
    utilityService.log(
      "QUERY realMoneyTopProducts:",
      gameID,
      studioID,
      branch,
      filterDate, // Time interval we want to get
      filterSegments // An array of segments that player must meet in order for his events to be included in the result
    );

    try {
      const interval =
        coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let offers = await OffersModel.aggregate([
        {
          $match: {
            gameID,
            branch: branch,
            "offerPrice.targetCurrency": "entity",
            $or: [{ removed: false }, { removed: { $exists: false } }],
          },
        },
        {
          $project: {
            _id: 0,
            offerName: 1,
            offerID: 1,
            offerIcon: 1,
            offerPrice: 1,
          },
        },
      ]);

      if (offers.length > 0) {
        offers = await Promise.all(
          offers.map(async (o) => {
            if (utilityService.isHttpsUrl(o.offerIcon)) {
              o.offerIcon = await utilityService.downloadFileFromBucketAsBase64(
                `${utilityService.getDemoGameID(gameID)}`,
                utilityService.getFileNameFromUrl(o.offerIcon)
              );
            }
            return o;
          })
        );
      }

      let query = getRealMoneyTopProductsQuery(
        studioID,
        gameID,
        branch,
        interval,
        filterSegments,
        offers
      );

      let formattedResult = []; // Define that and change to result later
      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
        // Should throw error if there is error
      }

      const processDataItem = async (dataItem) => {
        const offer = offers.find(
          (offer) => offer.offerID === dataItem.offerid
        );

        if (!offer) {
          return null;
        }

        const avgProfile = await coreAnalytics.getAvgProfile({
          gameID,
          branch,
          environment,
          salesCount: dataItem.totalsales,
          subject: `${dataItem.offerid}`,
          getFullRealMoneyCustomerProfile: false,
          filterDate: undefined,
        });

        return {
          id: offer.offerID,
          offerName: offer.offerName,
          offerIcon: offer.offerIcon,
          revenue: dataItem.totalspend,
          sales: dataItem.totalsales,
          avgProfile: avgProfile,
        };
      };
      formattedResult = await Promise.all(data.map(processDataItem));
      formattedResult = formattedResult.filter(Boolean);

      // utilityService.log("Pre-formatted data length:", data.length);
      // utilityService.log("Post-formatted data length:", formattedResult.length);
      // utilityService.log("Post-formatted data:", formattedResult);

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getRealMoneyTopProductsQuery(
      studioID,
      gameID,
      branch,
      interval,
      filterSegments,
      offers
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

      let offersFilter =
        offers.length > 0
          ? `\nAND e."field1" IN (${offers.map((o) => `'${o.offerID}'`)})`
          : "";

      //
      // Default query. Append everything we made above to this.
      //
      parsedSQL =
        `WITH all_sessions AS (
        SELECT s."clientID",
        s."sessionID",
        s."branch",
        s."environment",
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
         filteredEvents AS (
        SELECT 
          e."clientID",
          s."sessionID",
          e."field1" AS offerID,
          CAST(e."field2" AS NUMERIC) AS amount,
          e."field3" AS currency,
          e."field4"
        FROM "events-${studioID}" e
        JOIN all_sessions s
          ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID"
        ${segmentsJoin}
        WHERE e."timestamp" BETWEEN '${interval.interval[0]}' AND '${
          interval.interval[1]
        }'
          AND e."gameID" = '${gameID}'
          ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = '${environment}'`
              : ""
          }
          AND e."type" = 'offerEvent'` +
        segmentsQueryFilters +
        offersFilter +
        `)` +
        `SELECT
            offerID,
            SUM(amount) AS totalSpend,
            COUNT(offerID) AS totalSales,
            currency
          FROM filteredEvents e
          WHERE e."field4" IS NOT NULL
          GROUP BY offerID, currency`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async querySalesAndRevenue(
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
      "QUERY querySalesAndRevenue:",
      gameID,
      studioID,
      branch,
      filterDate,
      filterSegments,
      gameIDs
    );

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getSalesAndRevenueQuery(
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
        dataItem.timestamp = dataItem.x;
        delete dataItem.x;
        return dataItem;
      });

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }

    function getSalesAndRevenueQuery(
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
    s."gameID"
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
              CAST(e."field2" AS NUMERIC) AS price,
              DATE_TRUNC('${interval.granularity}', e."timestamp") AS x
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
                x,
                SUM(price) AS revenue,
                COUNT(*) AS sales
            FROM filteredEvents
            GROUP BY x
            ORDER BY x DESC`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async queryAvgCustomerProfile_Profile(
    gameID,
    branch,
    environment,
    filterDate,
    filterSegments,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const utilityService = this.moduleContainer.get("utility");
    const db = this.moduleContainer.get("database");
    try {
      const studioID = await utilityService.getStudioIDByGameID(
        utilityService.getDemoGameID(gameID)
      );

      // Count query
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
            )}:' || '${environment}:' || s."clientID" = seg."clientID"`
          : "";
      const query = `
          SELECT COUNT(*)
          FROM "snapshots-${studioID}" s
          ${segmentsJoin}
          WHERE s."gameID" = '${gameID}'
          ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = '${environment}'`
              : ""
          }
            AND s."realMoneyPurchaseOrderID" IS NOT NULL
            AND s."timestamp" BETWEEN '${filterDate[0]}' AND '${filterDate[1]}'
            ${segmentsQueryFilters};
            `;
      const [data] = await db.PGquery(query);

      const count = data.count || 0;
      // await CustomerSnapshots.count({
      //   gameID,
      //   branch: branch,
      //   realMoneyPurchaseOrderID: { $exists: true },
      //   timestamp: {
      //     $gte: dayjs.utc(filterDate[0]).toDate(),
      //     $lte: dayjs.utc(filterDate[1]).toDate(),
      //   },
      // });
      const result = await coreAnalytics.getAvgProfile({
        gameID,
        branch,
        environment,
        salesCount: count,
        subject: "",
        getFullRealMoneyCustomerProfile: true,
        filterDate: filterDate,
        filterSegments: filterSegments,
      });
      return { profile: result, totalPlayers: count };
    } catch (error) {
      utilityService.log(error);
    }
  }

  async getARPPU(
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
      "QUERY getARPPU:",
      gameID,
      studioID,
      branch,
      filterDate,
      filterSegments,
      gameIDs
    );

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getARPPU_query(
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
      formattedResult = data
        .sort(
          (a, b) =>
            dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
        )
        .map((i) => ({ ...i, value: parseFloat(i.value) }));

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }

    function getARPPU_query(
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
  s."gameID"
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
            CAST(e."field2" AS NUMERIC) AS price,
          DATE_TRUNC('${interval.granularity}', e."timestamp") AS x
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
        `),` +
        `dailyRevenue AS (
            SELECT
                x,
                SUM(price) AS totalRevenue
            FROM filteredEvents
            GROUP BY x
        ),
        payingUsers AS (
            SELECT
                x,
                COUNT(DISTINCT "clientID") AS numPayingUsers
            FROM filteredEvents
            GROUP BY x
        )
        SELECT
            d.x AS "timestamp",
            CASE 
                WHEN p.numPayingUsers > 0 THEN d.totalRevenue / p.numPayingUsers
                ELSE 0
            END AS "value"
        FROM dailyRevenue d
        LEFT JOIN payingUsers p ON d.x = p.x`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }
  
  async getARPU(
    gameID,
    studioID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const contentCacher = this.moduleContainer.get("contentCacher");
    const utilityService = this.moduleContainer.get("utility");
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    const db = this.moduleContainer.get("database");
    utilityService.log(
      "QUERY getARPU:",
      gameID,
      studioID,
      branch,
      filterDate, // Time interval we want to get
      filterSegments // An array of segments that player must meet in order for his events to be included in the result
    );

    try {
      const interval =
        coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getARPU_query(
        studioID,
        gameID,
        branch,
        interval,
        filterSegments
      );

      const cachedResult = await contentCacher.getCachedAnalyticsResponse(
        query
      );
      if (cachedResult !== null) return cachedResult;

      let formattedResult = []; // Define that and change to result later
      const data = await db.PGquery(query);
      // utilityService.log("Druid response stringified: ", JSON.stringify(data));

      formattedResult = data
        .sort(
          (a, b) =>
            dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
        )
        .map((i) => ({ ...i, value: parseFloat(i.value) }));

      // utilityService.log("Pre-formatted data length:", data.length);
      // utilityService.log("Post-formatted data length:", formattedResult.length);
      // utilityService.log("Post-formatted data:", formattedResult);

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getARPU_query(studioID, gameID, branch, interval, filterSegments) {
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

      //
      // Default query. Append everything we made above to this.
      //
      parsedSQL =
        `WITH all_sessions AS (
          SELECT s."clientID",
          s."sessionID",
    s."branch",
    s."environment",
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
           filteredEvents AS (
              SELECT 
                e."clientID",
                s."sessionID",
                e."type",
                e."field2",
                e."field4",
               DATE_TRUNC('${interval.granularity}', e."timestamp") AS x
              FROM "events-${studioID}" e
              JOIN all_sessions s
                ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID"
              ${segmentsJoin}
              WHERE e."timestamp" BETWEEN '${interval.interval[0]}' AND '${
          interval.interval[1]
        }'
                AND e."gameID" = '${gameID}'
                ${
                  includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""
                }
                ${
                  includeEnvironmentInAnalytics
                    ? `AND s."environment" = '${environment}'`
                    : ""
                }` +
        segmentsQueryFilters +
        `),` +
        `dailyRevenue AS (
            SELECT
              x,
              SUM(CAST(e."field2" AS NUMERIC)) AS totalRevenue
            FROM filteredEvents e
            WHERE e."type" = 'offerEvent' AND e."field4" IS NOT NULL
            GROUP BY x
          ),
          totalUsers AS (
            SELECT
              x,
              COUNT(DISTINCT "clientID") AS numCommonUsers
            FROM filteredEvents
            GROUP BY x
          )
          SELECT
            d.x AS "timestamp",
            CASE WHEN p.numCommonUsers > 0 THEN d.totalRevenue / p.numCommonUsers ELSE 0 END AS "value"
          FROM dailyRevenue AS d
          LEFT JOIN totalUsers AS p ON d.x = p.x`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async getPaymentConversion(
    studioID,
    gameID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    const utilityService = this.moduleContainer.get("utility");
    const db = this.moduleContainer.get("database");
    utilityService.log(
      "QUERY getPaymentConversion:",
      studioID,
      gameID,
      branch,
      filterDate, // Time interval we want to get
      filterSegments // An array of segments that player must meet in order for his events to be included in the result
    );

    try {
      const interval =
        coreAnalytics.constructIntervalFromDateFilter(filterDate);

      // getting templates names because we're building avgProfile by ourselves
      let templates = await PWtemplates.find({ gameID, branch: branch });
      if (templates.length === 0) {
        return [];
      }

      const templateNames = templates.map((template) => ({
        name: template.templateName,
        id: template.templateID,
      }));

      // Getting customer snapshots for the given timespan
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
        )}:' || '${environment}:' || s."clientID" = seg."clientID"`
          : "";

      let snapshots = await db.PGquery(`
        SELECT *
        FROM "snapshots-${studioID}" s
        ${segmentsJoin}
        WHERE 
          s."gameID" = '${gameID}'
          ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = '${environment}'`
              : ""
          }
          AND s."timestamp" >= '${dayjs.utc(filterDate[0]).toISOString()}'
          AND s."timestamp" <= '${dayjs.utc(filterDate[1]).toISOString()}'
          AND s."realMoneyPurchaseOrderID" IS NOT NULL
          ${segmentsQueryFilters}
        LIMIT 10000;
        `);
      // await CustomerSnapshots.find({
      //   gameID: gameID,
      //   branch: branch,
      //   timestamp: {
      //     $gte: dayjs.utc(filterDate[0]),
      //     $lte: dayjs.utc(filterDate[1]),
      //   },
      //   realMoneyPurchaseOrderID: { $ne: null },
      //   // realMoneyPaymentNumber: {$lte: 2}
      // })
      // .limit(10000)
      // .lean();
      utilityService.log(snapshots.length);

      if (snapshots.length === 0) {
        return [];
      }

      // Arranging snapshots by their number. So its like "{1: [snapshot, snapshot], 2: [...], }"
      let snapshotsPerPaymentNumber = {};
      snapshots
        .sort((a, b) => a.realMoneyPaymentNumber - b.realMoneyPaymentNumber)
        .forEach((s) => {
          if (!snapshotsPerPaymentNumber[s.realMoneyPaymentNumber]) {
            snapshotsPerPaymentNumber[s.realMoneyPaymentNumber] = [];
          }
          snapshotsPerPaymentNumber[s.realMoneyPaymentNumber].push(s);
        });

      // utilityService.log(
      //   "Calculated snapshots per payment number",
      //   snapshotsPerPaymentNumber
      // );

      let meanDaysToConvert = []; // creating array and populate it later
      let firstPaymentClientIDs = snapshotsPerPaymentNumber[
        Object.keys(snapshotsPerPaymentNumber)[0]
      ].map((s) => s.clientID); // getting clients of the first snapshots of an array

      const maxMeanDaysCalculationLimit = 600;

      utilityService.log("Getting first day conversion time");
      if (Object.keys(snapshotsPerPaymentNumber)[0] === "1") {
        // If the first payment number is "1" and not "2" or other number, we can safely use client's firstJoinDate
        // to calculate number of days to convert.
        const firstPaymentClients = await PWplayers.find(
          {
            gameID,
            environment: environment,
            ...(includeBranchInAnalytics ? { branch: branch } : {}),
            clientID: { $in: firstPaymentClientIDs },
          },
          { clientID: 1, firstJoinDate: 1 }
        )
          .limit(maxMeanDaysCalculationLimit)
          .lean();

        utilityService.log("Got players to calc mean converted days");
        meanDaysToConvert = Object.keys(snapshotsPerPaymentNumber).map(
          (key, index) => {
            let resultArr = [];
            const currentSnapshots = snapshotsPerPaymentNumber[key].slice(
              0,
              maxMeanDaysCalculationLimit
            );

            if (index === 0) {
              currentSnapshots.forEach((s) => {
                const client = firstPaymentClients.find(
                  (c) => c.clientID === s.clientID
                );

                if (client) {
                  const diff = Math.abs(
                    dayjs
                      .utc(s.timestamp)
                      .diff(dayjs.utc(client.firstJoinDate), "hour")
                  );
                  if (diff !== 0) {
                    resultArr.push(diff / 24);
                  } else {
                    resultArr.push(0);
                  }
                }
              });
            } else {
              currentSnapshots.forEach((sCurr, i) => {
                if (i < maxMeanDaysCalculationLimit) {
                  const pastSnapshots = snapshotsPerPaymentNumber[
                    Object.keys(snapshotsPerPaymentNumber)[index - 1]
                  ].slice(0, 600);

                  pastSnapshots.forEach((sPast, i2) => {
                    if (i2 < maxMeanDaysCalculationLimit) {
                      const diff = Math.abs(
                        dayjs
                          .utc(sPast.timestamp)
                          .diff(dayjs.utc(sCurr.timestamp), "hour")
                      );
                      if (diff !== 0) {
                        resultArr.push(diff / 24);
                      } else {
                        resultArr.push(0);
                      }
                    }
                  });
                }
              });
            }

            return coreAnalytics.median(resultArr) || 0;
          }
        );
      } else {
        // If there are no snapshots with number "1" in the dataset (e.g. if there are no such snapshots in the timeframe and they are way too in the past),
        // we need to manually grab the last snapshot
        // before the snapshot we have. So, if the first number in the dataset is 2, we must grab snapshots with number 1
        // for clients of snapshots with number 2, and calculate how much time passed from num. 1 to num. 2.
        let snapshotsBeforeFirst = await db.PGquery(`
          SELECT 
            "realMoneyPaymentNumber", 
            "timestamp"
          FROM "snapshots-${studioID}" s
          ${segmentsJoin}
          WHERE 
            s."gameID" = '${gameID}'
            ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
            ${
              includeEnvironmentInAnalytics
                ? `AND s."environment" = '${environment}'`
                : ""
            }
            AND s."clientID" IN (${firstPaymentClientIDs
              .map((id) => `'${id}'`)
              .join(", ")})
            AND s."realMoneyPaymentNumber" = ${
              parseInt(Object.keys(snapshotsPerPaymentNumber)[0]) - 1
            }
            ${segmentsQueryFilters}
          LIMIT ${maxMeanDaysCalculationLimit};
        `);
        // let snapshotsBeforeFirst = await CustomerSnapshots.find(
        //   {
        //     gameID: gameID,
        //     branch: branch,
        //     clientID: { $in: firstPaymentClientIDs },
        //     realMoneyPaymentNumber: {
        //       $eq: parseInt(Object.keys(snapshotsPerPaymentNumber)[0]) - 1,
        //     },
        //   },
        //   { realMoneyPaymentNumber: 1, timestamp: 1 }
        // )
        //   .lean(maxMeanDaysCalculationLimit)
        //   .lean();

        utilityService.log("Got snapshots to calc mean converted days");

        meanDaysToConvert = Object.keys(snapshotsPerPaymentNumber).map(
          (key, index) => {
            let resultArr = [];
            const currentSnapshots = snapshotsPerPaymentNumber[key].slice(
              0,
              maxMeanDaysCalculationLimit
            );

            if (index === 0) {
              currentSnapshots.forEach((sCurr) => {
                const pastSnapshot = snapshotsBeforeFirst.find(
                  (sPast) => sPast.clientID === sCurr.clientID
                );
                if (pastSnapshot) {
                  const diff = Math.abs(
                    dayjs
                      .utc(pastSnapshot.timestamp)
                      .diff(dayjs.utc(sCurr.timestamp), "hour")
                  );
                  if (diff !== 0) {
                    resultArr.push(diff / 24);
                  } else {
                    resultArr.push(0);
                  }
                }
              });
            } else {
              currentSnapshots.forEach((sCurr, i) => {
                if (i < maxMeanDaysCalculationLimit) {
                  const pastSnapshots = snapshotsPerPaymentNumber[
                    Object.keys(snapshotsPerPaymentNumber)[index - 1]
                  ].slice(0, 600);

                  pastSnapshots.forEach((sPast, i2) => {
                    if (i2 < maxMeanDaysCalculationLimit) {
                      const diff = Math.abs(
                        dayjs
                          .utc(sPast.timestamp)
                          .diff(dayjs.utc(sCurr.timestamp), "hour")
                      );
                      if (diff !== 0) {
                        resultArr.push(diff / 24);
                      } else {
                        resultArr.push(0);
                      }
                    }
                  });
                }
              });
            }
            return coreAnalytics.median(resultArr) || 0;
          }
        );
      }

      utilityService.log("About to process batches...");

      const BATCH_SIZE = 10;
      let TSresponses = {};
      async function processInBatches() {
        const keys = Object.keys(snapshotsPerPaymentNumber);

        // Process in batches. Make e.g. 10 promises, do them, then do 10 again and so on so
        // we dont run out of connections
        for (let i = 0; i < keys.length; i += BATCH_SIZE) {
          const batchKeys = keys.slice(i, i + BATCH_SIZE);

          const promises = batchKeys.map(async (key) => {
            const orderIDs = snapshotsPerPaymentNumber[key].map(
              (s) => s.realMoneyPurchaseOrderID
            );
            let query = getPaymentConversionQuery(
              studioID,
              gameID,
              branch,
              interval,
              filterSegments,
              orderIDs
            );

            let formattedResp = await db.PGquery(query);
            if (!formattedResp.meanspend) {
              formattedResp.meanspend = "0.00";
            }
            if (!formattedResp.totalspend) {
              formattedResp.totalspend = "0.00";
            }
            TSresponses[key] = formattedResp[0];
          });
          await Promise.all(promises);
        }
      }

      await processInBatches();

      const avgProfiles = Object.keys(snapshotsPerPaymentNumber).map((key) => {
        return coreAnalytics.buildAvgProfileFromSnapshots(
          snapshotsPerPaymentNumber[key],
          templateNames,
          snapshotsPerPaymentNumber[key].length
        );
      });

      let formattedResult = []; // Define that and change to result later

      formattedResult = Object.keys(snapshotsPerPaymentNumber).map(
        (key, index) => {
          return {
            payment: parseInt(key),
            meanPayment: TSresponses[key].meanspend || 0,
            meanDaysToConvert: meanDaysToConvert[index] || 0,
            revenue: TSresponses[key].totalspend || 0,
            sales: snapshotsPerPaymentNumber[key].length || 0,
            avgProfile: avgProfiles[index] || 0,
          };
        }
      );

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getPaymentConversionQuery(
      studioID,
      gameID,
      branch,
      interval,
      filterSegments,
      orderIDs
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

      //
      // Default query. Append everything we made above to this.
      //
      parsedSQL =
        `WITH all_sessions AS (
        SELECT s."clientID",
        s."sessionID",
        s."branch",
        s."environment",
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
         filteredEvents AS (
        SELECT 
          e."clientID",
          s."sessionID",
          e."field1" AS offerID,
          CAST(e."field2" AS NUMERIC) AS amount,
          e."field3" AS currency,
          e."field4"
        FROM "events-${studioID}" e
        JOIN all_sessions s
          ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID"
        ${segmentsJoin}
        WHERE e."timestamp" BETWEEN '${interval.interval[0]}' AND '${
          interval.interval[1]
        }'
          AND e."field4" = ANY(ARRAY[${orderIDs
            .map((item) => `'${item}'`)
            .join(", ")}])
          AND e."gameID" = '${gameID}'
          ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = '${environment}'`
              : ""
          }
          AND e."type" = 'offerEvent'` +
        segmentsQueryFilters +
        `)` +
        `SELECT
            AVG(amount) AS meanSpend,
            SUM(amount) AS totalSpend
          FROM filteredEvents e
          WHERE e."field4" IS NOT NULL`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async getPaymentConversionFunnel(
    gameID,
    studioID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    const utilityService = this.moduleContainer.get("utility");
    const db = this.moduleContainer.get("database");
    utilityService.log(
      "QUERY getPaymentConversionFunnel:",
      gameID,
      studioID,
      branch,
      filterDate, // Time interval we want to get
      filterSegments // An array of segments that player must meet in order for his events to be included in the result
    );

    try {
      const interval =
        coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getConversionFunnelQuery(
        studioID,
        gameID,
        branch,
        interval,
        filterSegments
      );

      let formattedResult = []; // Define that and change to result later
      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
        // Should throw error if there is error
      }

      function calculatePercentages(data) {
        let result = [];

        for (let i = 1; i < data.length; i++) {
          const currentItem = data[i];
          const previousItem = data[i - 1];

          const percentage = (currentItem.y / previousItem.y) * 100;

          result.push({
            y: currentItem.y,
            x: parseFloat(percentage.toFixed(2)),
          });
        }

        return result;
      }
      formattedResult = calculatePercentages(data);

      // utilityService.log("Pre-formatted data length:", data.length);
      // utilityService.log("Post-formatted data length:", formattedResult.length);

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }

    function getConversionFunnelQuery(
      studioID,
      gameID,
      branch,
      interval,
      filterSegments
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
        ON '${utilityService.getDemoGameID(
          gameID
        )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

      const parsedSQL = `
        WITH paying_users AS (
          SELECT
            e."clientID",
            COUNT(CASE 
              WHEN e."type" = 'offerEvent' AND e."field4" IS NOT NULL 
              THEN 1 
            END) AS event_count
          FROM "events-${studioID}" e
          ${segmentsJoin}
          WHERE
            e."timestamp" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
            AND e."gameID" = '${gameID}'
            ${segmentsQueryFilters}
            AND EXISTS (
              SELECT 1 FROM "sessions-${studioID}" s
              WHERE 
                s."clientID" = e."clientID"
                AND s."sessionID" = e."sessionID"
                AND s."timestamp" BETWEEN '${interval.interval[0]}' AND '${
        interval.interval[1]
      }'
                AND s."gameID" = '${gameID}'
                ${
                  includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""
                }
                ${
                  includeEnvironmentInAnalytics
                    ? `AND s."environment" = '${environment}'`
                    : ""
                }
            )
          GROUP BY e."clientID"
          HAVING COUNT(CASE 
            WHEN e."type" = 'offerEvent' AND e."field4" IS NOT NULL 
            THEN 1 
          END) > 0
        )
        SELECT
          event_count AS x,
          ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS y,
          COUNT(*) AS absolute_count,
          SUM(COUNT(*)) OVER (
            ORDER BY event_count DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS cumulative
        FROM paying_users
        GROUP BY event_count
        ORDER BY x ASC
        LIMIT 6`;

      utilityService.log("Optimized SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async getDaysToConvertToPayment(
    gameID,
    studioID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    const utilityService = this.moduleContainer.get("utility");
    utilityService.log(
      "QUERY getDaysToConvertToPayment:",
      gameID,
      studioID,
      branch,
      filterDate, // Time interval we want to get
      filterSegments // An array of segments that player must meet in order for his events to be included in the result
    );

    try {
      const interval =
        coreAnalytics.constructIntervalFromDateFilter(filterDate);

      const pipeline = [
        {
          $match: {
            firstJoinDate: {
              $gte: dayjs.utc(interval.interval[0]).toDate(),
              $lte: dayjs.utc(interval.interval[1]).toDate(),
            },
            gameID: gameID,
            ...(includeEnvironmentInAnalytics
              ? { environment: environment }
              : {}),
            ...(includeBranchInAnalytics
              ? { branch: utilityService.getBranchWithoutSuffix(branch) }
              : {}),
            ...(filterSegments.length > 0
              ? { segments: { $in: filterSegments } }
              : {}),
          },
        },
        {
          $unwind: "$elements.analytics",
        },
        {
          $match: {
            "elements.analytics.elementID": "meanPaymentRecency",
          },
        },
        {
          $project: {
            clientID: 1,
            firstJoinDate: 1,
            meanPaymentRecency: {
              $arrayElemAt: ["$elements.analytics.elementValues", 0],
            },
          },
        },
        {
          $addFields: {
            meanPaymentRecencyDate: {
              $dateFromString: {
                dateString: { $toString: "$meanPaymentRecency" },
              },
            },
          },
        },
        {
          $project: {
            clientID: 1,
            firstJoinDate: 1,
            daysUntilRecency: {
              $dateDiff: {
                startDate: "$firstJoinDate",
                endDate: "$meanPaymentRecencyDate",
                unit: "day",
              },
            },
          },
        },
        {
          $match: {
            daysUntilRecency: { $gte: 0 },
          },
        },
        {
          $group: {
            _id: "$daysUntilRecency",
            playerCount: { $count: {} },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ];

      const results = await PWplayers.aggregate(pipeline).exec();
      let formattedResult = results.map((r) => ({
        x: r._id,
        y: r.playerCount,
      }));

      if (results.errorMessage) {
        coreAnalytics.handleSqlError(results.errorMessage);
        // Should throw error if there is error
      }

      // utilityService.log("Pre-formatted data length:", results.length);
      // utilityService.log("Post-formatted data length:", formattedResult.length);

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getCumulativeARPU(
    gameID,
    studioID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    const utilityService = this.moduleContainer.get("utility");
    utilityService.log(
      "QUERY Get Cumulative ARPU:",
      gameID,
      studioID,
      branch,
      filterDate, // Time interval we want to get
      filterSegments // An array of segments that player must meet in order for his events to be included in the result
    );

    //  ARPU
    const data = await this.getARPU(
      gameID,
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    function calculateCumulativeARPU(data) {
      let cumulativeValue = 0;
      return data.map((row) => {
        cumulativeValue += row.value;
        return {
          timestamp: row.timestamp,
          cumulativeARPU: cumulativeValue,
        };
      });
    }

    const cumulativeData = calculateCumulativeARPU(data);

    // utilityService.log("Cumulative ARPU data:", cumulativeData);

    return cumulativeData;
  }

  async getOfferAnalytics(
    gameID,
    studioID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    offerID,
    includeBranchInAnalytics = true,
    includeEnvironmentInAnalytics = true
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    const utilityService = this.moduleContainer.get("utility");
    const pastInterval = coreAnalytics.getPastInterval(filterDate);

    const [resultPast, resultCurrent] = await Promise.all([
      this.queryOfferSalesAndRevenue(
        gameID,
        studioID,
        branch,
        environment,
        pastInterval,
        filterSegments,
        offerID,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics
      ),
      this.queryOfferSalesAndRevenue(
        gameID,
        studioID,
        branch,
        environment,
        filterDate,
        filterSegments,
        offerID,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics
      ),
    ]);

    // Revenue delta
    function sumRevenue(data) {
      return data.reduce(
        (total, entry) => total + parseFloat(entry.revenue),
        0
      );
    }
    const totalPastRevenue = sumRevenue(resultPast);
    const totalCurrentRevenue = sumRevenue(resultCurrent);
    const revenueDifference = parseFloat(
      (totalCurrentRevenue - totalPastRevenue).toFixed(2)
    );

    function sumImpressions(data) {
      return data.reduce((total, entry) => total + parseFloat(entry.shows), 0);
    }
    const totalPastShows = sumImpressions(resultPast);
    const totalCurrentShows = sumImpressions(resultCurrent);
    const showsDifference = parseFloat(
      (totalCurrentShows - totalPastShows).toFixed(2)
    );

    function sumSales(data) {
      return data.reduce((total, entry) => total + parseFloat(entry.sales), 0);
    }
    const totalPastSales = sumImpressions(resultPast);
    const totalCurrentSales = sumImpressions(resultCurrent);
    const salesDifference = parseFloat(
      (totalCurrentSales - totalPastSales).toFixed(2)
    );

    let declineRateResult = resultCurrent
      .map((i) => parseFloat(i.declinerate))
      .filter((i) => i !== "Infinity")
      .filter(Boolean);
    declineRateResult =
      declineRateResult.length > 0
        ? coreAnalytics.median(declineRateResult) * 100
        : 0;

    const totalPastDeclineResults = resultPast.reduce(
      (total, entry) => total + parseFloat(entry.declinerate),
      0
    );
    const totalCurrentDeclineResults = resultCurrent.reduce(
      (total, entry) => total + parseFloat(entry.declinerate),
      0
    );

    let result = {
      revenue: sumRevenue(resultCurrent),
      revenuePositive: revenueDifference > 0,
      declinerate: declineRateResult,
      declineratePositive: totalCurrentDeclineResults > totalPastDeclineResults,
      salesTotal: sumSales(resultCurrent),
      salesTotalPositive: salesDifference > 0,
      impressions: sumImpressions(resultCurrent),
      impressionsPositive: showsDifference > 0,
      sales: resultCurrent.map((dataItem) => ({
        timestamp: dataItem.timestamp,
        sales: parseFloat(dataItem.sales),
        revenue: parseFloat(dataItem.revenue),
      })),
    };
    return result;
  }

  async queryOfferSalesAndRevenue(
    gameID,
    studioID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    offerID,
    includeBranchInAnalytics = true,
    includeEnvironmentInAnalytics = true
  ) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");

    const utilityService = this.moduleContainer.get("utility");
    const db = this.moduleContainer.get("database");
    utilityService.log(
      "QUERY queryOfferSalesAndRevenue:",
      gameID,
      studioID,
      branch,
      filterDate, // Time interval we want to get
      filterSegments, // An array of segments that player must meet in order for his events to be included in the result
      offerID
    );

    try {
      const interval =
        coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getOfferSalesAndRevenueQuery(
        studioID,
        gameID,
        branch,
        interval,
        filterSegments,
        offerID
      );

      let formattedResult = []; // Define that and change to result later
      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
        // Should throw error if there is error
      }
      formattedResult = data;

      // utilityService.log("Pre-formatted data length:", data.length);
      // utilityService.log("Post-formatted data length:", formattedResult.length);
      // utilityService.log("Post-formatted data:", formattedResult);

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getOfferSalesAndRevenueQuery(
      studioID,
      gameID,
      branch,
      interval,
      filterSegments,
      offerID
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

      //
      // Default query. Append everything we made above to this.
      //
      parsedSQL =
        `WITH all_sessions AS (
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
         filteredEvents AS (
          SELECT 
            e."clientID",
            s."sessionID",
            e."type",
            e."field1",
            CAST(e."field2" AS NUMERIC) AS price,
            DATE_TRUNC('${interval.granularity}', e."timestamp") AS x
          FROM "events-${studioID}" e
          JOIN all_sessions s
            ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID"
          ${segmentsJoin}
          WHERE e."timestamp" BETWEEN '${interval.interval[0]}' AND '${
          interval.interval[1]
        }'
            AND e."gameID" = '${gameID}'
            AND s."branch" = '${branch}'
            AND (e."type" = 'offerEvent' OR e."type" = 'offerShown')
            AND e."field1" = '${offerID}'` +
        segmentsQueryFilters +
        `),` +
        `offerEvents AS (
        SELECT
            x,
            COUNT(*) AS offerEventCount,
            SUM(f.price) AS revenue
            FROM filteredEvents f
            WHERE f."type" = 'offerEvent'
            GROUP BY x
        ),
        offerShownEvents AS (
            SELECT
                x,
                COUNT(*) AS offerShownCount
            FROM filteredEvents
            WHERE type = 'offerShown'
            GROUP BY x
        ),
        combinedEvents AS (
            SELECT
                f.x,
                COALESCE(s.offerShownCount, 0) AS offerShownCount,
                COALESCE(o.revenue, 0) AS revenue,
                COALESCE(o.offerEventCount, 0) AS sales
            FROM filteredEvents f
            LEFT JOIN offerEvents o
                ON f.x = o.x
            LEFT JOIN offerShownEvents s
                ON f.x = s.x
            GROUP BY f.x, s.offerShownCount, o.offerEventCount, o.revenue
        )
        SELECT
        x AS "timestamp",
        revenue,
        sales,
        offerShownCount AS shows,
        CASE
            WHEN offerShownCount = 0 THEN 0
            ELSE sales * 1.0 / offerShownCount
        END AS declineRate
        FROM combinedEvents
        ORDER BY x DESC`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }
}
