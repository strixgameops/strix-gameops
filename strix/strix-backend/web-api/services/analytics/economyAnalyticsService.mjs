import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
import { OffersModel } from "../../../models/offersModel.js";
export class EconomyAnalyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }
  async inGameEconomyCurrencyBalance(
    gameID,
    studioID,
    branch,
    environment,
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    viewType, // absolute / perPlayer / perSession - used to aggregate the end results and don't do anything or make an average by some dimension
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const utilityService = this.moduleContainer.get("utility");
    utilityService.log(
      "QUERY INGAME ECONOMY BALANCE:",
      gameID,
      studioID,
      branch,
      environment,
      filterDate, // Time interval we want to get
      filterSegments, // An array of segments that player must meet in order for his events to be included in the result
      viewType, // absolute / perPlayer / perSession - used to aggregate the end results and don't do anything or make an average by some dimension
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");
    try {
      const interval =
        coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getEconomyBalanceQuery(
        studioID,
        gameID,
        branch,
        interval,
        viewType,
        filterSegments
      );

      let formattedResult = []; // Define that and change to result later

      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
        // Should throw error if there is error
      }

      async function transformData(inputArray) {
        const result = { data: [] };
        const dataMap = {};

        for (const item of inputArray) {
          if (!item.label) continue;

          const timestamp = item.x;
          const sourceOrSink = item.type;

          if (!dataMap[timestamp]) {
            dataMap[timestamp] = {
              timestamp: timestamp,
              currencies: [],
            };
          }

          let currency = dataMap[timestamp].currencies.find(
            (c) => c.currencyNodeID === item.label
          );
          if (!currency) {
            currency = {
              currencyNodeID: item.label,
              [viewType]: { source: [], sink: [] },
            };
            dataMap[timestamp].currencies.push(currency);
          }
          currency[viewType][sourceOrSink].push({
            id: item.origin,
            value: parseFloat(item.y),
          });
        }

        result.data = Object.values(dataMap);
        result.data = result.data.sort(
          (a, b) =>
            dayjs.utc(a.timestamp).valueOf() - dayjs.utc(b.timestamp).valueOf()
        );

        return result;
      }

      formattedResult = await transformData(data);
      // utilityService.log("formattedResult", formattedResult);

      // utilityService.log("Pre-formatted data length:", data.length);
      // utilityService.log("Post-formatted data length:", formattedResult.data.length);
      // utilityService.log("Post-formatted data:", formattedResult);

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getEconomyBalanceQuery(
      studioID,
      gameID,
      branch,
      interval,
      viewType,
      filterSegments
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

      // Here we define the 2nd part of our query.
      // "absolute" view type will give us just a normal type of aggregation.
      // "player" and "session" will return us an average result for the given dimension (player or session).
      let viewTypeSection =
        viewType === "absolute"
          ? // Default view type
            `
    SELECT 
      x,
      label,
      origin,
      type,
      SUM("amount") AS y
    FROM filteredEvents e
    GROUP BY x, label, type, origin`
          : // Different view types
            `, groupedEventCounts AS (
        SELECT
          x,
          type,
          "amount",
          origin,
          "label",
          ${viewType === "player" ? `"clientID"` : `"sessionID"`},
          SUM("amount") AS summByType
          FROM filteredEvents
          GROUP BY x, "amount", "label", type, origin` +
            (viewType === "player" ? `, "clientID"` : `, "sessionID"`) +
            `)` +
            `SELECT
            x,
            type,
            origin,
            "label",
            AVG(summByType) AS y
          FROM groupedEventCounts
          GROUP BY x, "label", type, origin`;

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
    SELECT e."clientID", 
    s."sessionID", 
    e."field4" AS "origin", 
    e."field3" AS "type", 
    e."field1" AS label, 
    CAST(e."field2" AS NUMERIC) AS amount, 
    DATE_TRUNC('${interval.granularity}', e.timestamp) AS x
    FROM "events-${studioID}" e
    JOIN all_sessions s
      ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID"
    ${segmentsJoin}
    WHERE e.timestamp BETWEEN '${interval.interval[0]}' AND '${
          interval.interval[1]
        }'
      AND e."gameID" = '${gameID}'
      ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
      ${
        includeEnvironmentInAnalytics
          ? `AND s."environment" = '${environment}'`
          : ""
      }
      AND e."type" = 'economyEvent'` +
        segmentsQueryFilters +
        `)` +
        viewTypeSection;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async inGameEconomyTopProducts(
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
    utilityService.log(
      "QUERY inGameEconomyTopProducts:",
      gameID,
      studioID,
      branch,
      filterDate, // Time interval we want to get
      filterSegments // An array of segments that player must meet in order for his events to be included in the result
    );

    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");
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

      let query = getEconomyTopProductsQuery(
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

        // const entityNodeID = await getCachedCurrencyEntityByID(
        //   gameID,
        //   branch,
        //   dataItem.currency
        // );
        // if (!entityNodeID) {
        //   return null;
        // }

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
          entityNodeID: dataItem.currency,
          revenue: dataItem.totalspend,
          sales: dataItem.totalsales,
          shows: dataItem.shows,
          declineRate: dataItem.declinerate,
          meanDiscount: dataItem.mean_discount,
          meanSpend: dataItem.mean_spend,
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
    function getEconomyTopProductsQuery(
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
        e."type",
        CAST(e."field4" as NUMERIC) AS discount
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
        }` +
        segmentsQueryFilters +
        offersFilter +
        `AND e."type" IN ('offerEvent', 'offerShown'))` +
        `SELECT
        offerID,
        AVG(discount) AS mean_discount,
        AVG(CASE WHEN "type" = 'offerEvent' THEN amount END) AS mean_spend,
        SUM(CASE WHEN "type" = 'offerEvent' THEN amount ELSE 0 END) AS totalSpend,
        COUNT(CASE WHEN "type" = 'offerEvent' THEN 1 END) AS totalSales,
        SUM(CASE WHEN "type" = 'offerShown' THEN 1 ELSE 0 END) AS shows,
        CASE 
          WHEN SUM(CASE WHEN "type" = 'offerShown' THEN 1 ELSE 0 END) = 0 THEN 0
          ELSE COUNT(CASE WHEN "type" = 'offerEvent' THEN 1 END) * 1.0 /
              SUM(CASE WHEN "type" = 'offerShown' THEN 1 ELSE 0 END) * 100
        END AS declineRate,
        currency
      FROM filteredEvents
      GROUP BY offerID, currency`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async topProductsDiscountAndSpend(
    gameID,
    studioID,
    branch,
    environment,
    filterDate,
    filterSegments,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const utilityService = this.moduleContainer.get("utility");

    utilityService.log(
      "QUERY inGameEconomyTopProductsDiscountAndSpend:",
      gameID,
      studioID,
      branch,
      filterDate,
      filterSegments
    );

    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");
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
          },
        },
      ]);

      const offerNameMap = {};
      offers.forEach((offer) => {
        offerNameMap[offer.offerID] = offer.offerName;
      });

      let query = getTopProductsDiscountAndSpendQuery(
        studioID,
        gameID,
        branch,
        interval,
        filterSegments,
        offers
      );

      const data = await db.PGquery(query);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
      }

      const formattedResult = data.map((dataItem) => ({
        offerID: dataItem.offerid,
        offerName: offerNameMap[dataItem.offerid] || "Unknown",
        timestamp: dataItem.timestamp,
        meanDiscount: dataItem.mean_discount,
        meanSpend: dataItem.mean_spend,
        totalSales: dataItem.total_sales,
        currency: dataItem.currency,
      }));

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }

    function getTopProductsDiscountAndSpendQuery(
      studioID,
      gameID,
      branch,
      interval,
      filterSegments,
      offers
    ) {
      let parsedSQL = "";

      const segmentsQueryFilters =
        filterSegments.length > 0
          ? `AND seg."segments" @> ARRAY[${filterSegments
              .map((segment) => `'${segment}'`)
              .join(",")}]::text[]\n`
          : "";

      const segmentsJoin =
        segmentsQueryFilters !== ""
          ? `
    JOIN "segments-${studioID}" seg
      ON '${utilityService.getDemoGameID(
        gameID
      )}:' || '${environment}:' || e."clientID" = seg."clientID"`
          : "";

      const offersFilter =
        offers.length > 0
          ? `\nAND e."field1" IN (${offers.map((o) => `'${o.offerID}'`)})`
          : "";

      parsedSQL = `WITH all_sessions AS (
      SELECT s."clientID",
             s."sessionID",
             s."environment",
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
        e."field1" AS offerID,
        CAST(e."field2" AS NUMERIC) AS amount,
        e."field3" AS currency,
        e."type",
        CAST(e."field4" AS NUMERIC) AS discount,
        e."timestamp"
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
        ${segmentsQueryFilters}
        ${offersFilter}
        AND e."type" IN ('offerEvent', 'offerShown')
    )
    SELECT
        offerID,
        date_trunc('day', "timestamp") AS "timestamp",
        AVG(discount) AS mean_discount,
        AVG(CASE WHEN "type" = 'offerEvent' THEN amount END) AS mean_spend,
        COUNT(CASE WHEN "type" = 'offerEvent' THEN 1 END) AS total_sales,
        currency
    FROM filteredEvents
    GROUP BY offerID, date_trunc('day', "timestamp"), currency
    ORDER BY "timestamp", offerID`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }

  async inGameEconomyTopSourcesAndSinks(
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
    utilityService.log(
      "QUERY inGameEconomyTopSourcesAndSinks:",
      gameID,
      studioID,
      branch,
      filterDate, // Time interval we want to get
      filterSegments // An array of segments that player must meet in order for his events to be included in the result
    );

    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const db = this.moduleContainer.get("database");
    const nodeService = this.moduleContainer.get("node");

    try {
      const interval =
        coreAnalytics.constructIntervalFromDateFilter(filterDate);

      let query = getEconomyTopSourcesAndSinks(
        studioID,
        gameID,
        branch,
        interval,
        filterSegments
      );

      let formattedResult = []; // Define that and change to result later
      const data = await db.PGquery(query);

      // utilityService.log("Druid response stringified: ", JSON.stringify(data));

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
        // Should throw error if there is error
      }

      if (data.length === 0) {
        return [];
      }

      async function getSourcesAndSinksResult(data) {
        const nodeIDs = data.map((i) => i.currency);

        const icons = await nodeService.fetchEntityIcons(
          gameID,
          branch,
          nodeIDs.map((n) => n)
        );

        let tempObj = { sinks: [], sources: [] };
        const validData = data.filter((dataItem) => dataItem.currency);
        const results = await Promise.all(
          validData.map(async (dataItem) => {
            const avgProfile = await coreAnalytics.getAvgProfile({
              gameID,
              branch,
              environment,
              salesCount: dataItem.eventcount,
              subject: `${dataItem.currency}|${dataItem.origin}|${dataItem.type}`,
              getFullRealMoneyCustomerProfile: false,
              filterDate: undefined,
            });

            const currencyNodeID = dataItem.currency;
            const entityIcon = icons.find(
              (i) => i.nodeID === currencyNodeID
            )?.icon;

            return {
              avgProfile,
              currencyEntity: currencyNodeID,
              entityIcon,
              mean: dataItem.averageamount,
              total: dataItem.totalamount,
              name: dataItem.origin,
              players: dataItem.eventcount,
              type: dataItem.type,
            };
          })
        );

        for (const item of results) {
          if (item.type === "sink") {
            tempObj.sinks.push(item);
          } else {
            tempObj.sources.push(item);
          }
        }

        return tempObj;
      }

      formattedResult = await getSourcesAndSinksResult(data);

      // utilityService.log("Pre-formatted data length:", data.length);
      // utilityService.log("Post-formatted data length:", formattedResult.length);
      // utilityService.log("Post-formatted data:", formattedResult);

      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    function getEconomyTopSourcesAndSinks(
      studioID,
      gameID,
      branch,
      interval,
      filterSegments
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
            e."field4" AS "origin", 
            e."field3" AS "type", 
            e."field1" AS label, 
            CAST(e."field2" AS NUMERIC) AS amount
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
            AND e."type" = 'economyEvent'` +
        segmentsQueryFilters +
        `)` +
        `SELECT
              label AS currency,
              origin AS origin,
              "type",
              SUM(amount) AS totalAmount,
              AVG(amount) AS averageAmount,
              COUNT(*) AS eventCount
          FROM filteredEvents
          GROUP BY label, type, origin
          ORDER BY label, origin`;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }
}
