import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import {
  eventValuesMap,
  sessionFieldsNames,
} from "../../utils/analytics/analyticsEventsConstants.js";
dayjs.extend(utc);

export class CustomAnalyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async universalAnalyticsRequest({
    gameID,
    studioID,
    branch,
    environment,
    categoryField, // By what category should we group our players
    filterDate, // Time interval we want to get
    filterSegments, // An array of segments that player must meet in order for his events to be included in the result
    metric, // An object that has eventID we want to get, it's value
    viewType, // absolute / perPlayer / perSession - used to aggregate the end results and don't do anything or make an average by some dimension
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics,
    specificTimeframe = false,
  }) {
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const offerService = this.moduleContainer.get("offer");
    const nodeService = this.moduleContainer.get("node");
    const contentCacher = this.moduleContainer.get("contentCacher");
    const db = this.moduleContainer.get("database");
    const utilityService = this.moduleContainer.get("utility");

    utilityService.log(
      "QUERY ANALYTICS:",
      gameID,
      studioID,
      branch,
      environment,
      categoryField, // By what category should we group our players
      filterDate, // Time interval we want to get
      filterSegments, // An array of segments that player must meet in order for his events to be included in the result
      metric,
      viewType // absolute / perPlayer / perSession - used to aggregate the end results and don't do anything or make an average by some dimension
    );

    if (!viewType || viewType === "") {
      viewType = "absolute";
    }

    let fieldName = "";
    let isDesignEvent = true;
    let temp;

    const cachedAnalyticsEvent =
      await contentCacher.getCachedAnalyticEventByEventID(
        gameID,
        branch,
        metric.queryAnalyticEventID
      );
    if (!cachedAnalyticsEvent) {
      throw new Error("Error fetching analytics data: no such event found");
    }
    function getValueByUniqueID(uniqueID) {
      return cachedAnalyticsEvent.values.find((v) => v.uniqueID === uniqueID);
    }
    async function processConditionValue(fieldName, conditionValue) {
      // If the field is offerID, currency or currencyID, we need to transform entityID/offerCodeName to nodeID/offerID
      switch (fieldName) {
        case "offerID":
          return await coreAnalytics.transformOfferCodeNameToOfferID(
            gameID,
            utilityService.getBranchWithReferenceSuffix(branch),
            conditionValue
          );
        case "currency":
          return await coreAnalytics.transformEntityIDToNodeID(
            gameID,
            utilityService.getBranchWithReferenceSuffix(branch),
            conditionValue
          );
        case "currencyID":
          return await coreAnalytics.transformEntityIDToNodeID(
            gameID,
            utilityService.getBranchWithReferenceSuffix(branch),
            conditionValue
          );
        default:
          return conditionValue;
      }
    }
    if (!getValueByUniqueID(metric.queryEventTargetValueId).valueID) {
      throw new Error(
        "Analytics Event or it's value with a given ID doesn't exist anymore"
      );
    }
    let fieldValueID = getValueByUniqueID(
      metric.queryEventTargetValueId
    ).valueID;
    if (!fieldValueID) {
      throw new Error(
        "Error fetching analytics data: requested event value is not present anymore by the given ID"
      );
    }
    isDesignEvent = Boolean(!eventValuesMap[metric.queryAnalyticEventID]);

    if (eventValuesMap[metric.queryAnalyticEventID]) {
      temp = eventValuesMap[metric.queryAnalyticEventID];
      fieldName = temp.find((v) => v.name === fieldValueID)?.id;
      if (!fieldName) {
        fieldName = fieldValueID;
      }
      utilityService.log("TARGET FIELD:", fieldName);
    } else {
      fieldName = getValueByUniqueID(metric.queryEventTargetValueId)?.valueID;
      utilityService.log(
        "TARGET FIELD:",
        fieldName,
        "Event ID:",
        metric.queryEventTargetValueId,
        "value uniqueID:",
        metric.queryEventTargetValueId
      );
      temp = cachedAnalyticsEvent.values.map((v, i) => ({
        id: v.uniqueID,
        name: v.valueID,
      }));
    }

    try {
      const interval = coreAnalytics.constructIntervalFromDateFilter(
        filterDate,
        specificTimeframe
      );

      let query = await getUniversalSQLQuery(
        metric.queryMethod,
        studioID,
        categoryField === "timestamp" ? "timestamp" : categoryField,
        gameID,
        branch,
        metric.queryAnalyticEventID,
        interval,
        fieldName,
        viewType,
        metric.queryCategoryFilters,
        metric.queryValueFilters,
        temp,
        filterSegments,
        isDesignEvent,
        false,
        metric.queryPercentile
      );

      let formattedResult = []; // Define that and change to result later
      const data = await db.PGquery(query);

      utilityService.log(data);

      if (data.errorMessage) {
        coreAnalytics.handleSqlError(data.errorMessage);
        // Should throw error if there is error
      }

      formattedResult = data;

      if (isDesignEvent === false) {
        // Format some labels
        const offers = await offerService.getOffersNames(gameID, branch);
        const entities = await nodeService.getCurrencyEntities(gameID, branch);

        function tryGetNameForNodeOrOffer(id) {
          let name = offers.find((o) => o.offerID === id)?.offerName;
          if (!name) {
            name = entities.find((o) => o.nodeID === id)?.entityBasic?.entityID;
          }
          if (!name) {
            name = id;
          }
          return name;
        }

        switch (getValueByUniqueID(metric.queryEventTargetValueId).valueID) {
          case "offerID":
          case "currency":
          case "currencyID":
            switch (metric.queryAnalyticEventID) {
              case "offerEvent":
              case "offerShown":
                formattedResult = formattedResult.map((item) => ({
                  ...item,
                  label: offers.find((o) => o.offerID === item.label)
                    ? offers.find((o) => o.offerID === item.label).offerName
                    : item.label,
                  x1: tryGetNameForNodeOrOffer(item.x1),
                }));
                break;
              case "economyEvent":
                formattedResult = formattedResult.map((item) => ({
                  ...item,
                  label: entities.find((o) => o.nodeID === item.label)
                    ? entities.find((o) => o.nodeID === item.label).entityBasic
                        ?.entityID
                    : item.label,
                  x1: tryGetNameForNodeOrOffer(item.x1),
                }));
                break;
            }
            break;
          default:
            break;
        }
        // Format x1 when possible

        switch (metric.queryAnalyticEventID) {
          case "offerEvent":
          case "offerShown":
            formattedResult = formattedResult.map((item) => ({
              ...item,
              x1: tryGetNameForNodeOrOffer(item.x1),
            }));
            break;
          case "economyEvent":
            formattedResult = formattedResult.map((item) => ({
              ...item,
              x1: tryGetNameForNodeOrOffer(item.x1),
            }));
            break;
        }
      }

      // utilityService.log("Pre-formatted data length:", data.length);
      // utilityService.log("Post-formatted data length:", formattedResult.length);
      // utilityService.log("Post-formatted data:", formattedResult);
      return formattedResult;
    } catch (error) {
      console.error(error);
      return [];
    }
    async function getUniversalSQLQuery(
      methodType,
      studioID,
      categoryField,
      gameID,
      branch,
      eventType,
      interval,
      targetField,
      viewType,
      categoryFilters,
      valueFilters,
      eventValuesMap,
      filterSegments,
      isDesignEvent,
      outputLabelWhenPossible = true,
      percentile
    ) {
      let parsedSQL = "";

      if (!eventValuesMap.find((v) => v.id === targetField)) {
        targetField = `"customData"->>` + `'${targetField}'`;
      } else {
        targetField = `"${targetField}"`;
      }

      // Making category filters. Those will check fields in the "sessions" table.
      // E.g. check by platform name, or engineVersion
      let categoryQueryFilters =
        categoryFilters.length > 0
          ? categoryFilters
              .map((obj) => {
                let condition = obj.condition === "is" ? "=" : "!=";
                return `\nAND s."${obj.conditionField}" ${condition} '${obj.conditionValue}'`;
              })
              .join("") + "\n"
          : "";

      // Making value filters. Those will check fields in the "events" table.
      // Given the field name ("field1", "field2" etc), will check if it's value is exactly the provided value
      let valueQueryFilters = ``;
      if (isDesignEvent) {
        valueQueryFilters =
          valueFilters.length > 0
            ? valueFilters
                .map((obj) => {
                  let condition = obj.condition === "is" ? "=" : "!=";
                  let fieldName =
                    `"customData"->>` +
                    `'${getValueByUniqueID(obj.conditionValueID).valueID}'`;
                  return `\nAND e.${fieldName} ${condition} '${obj.conditionValue}'`;
                })
                .join("") + "\n"
            : "";
      } else {
        valueQueryFilters =
          valueFilters.length > 0
            ? (
                await Promise.all(
                  valueFilters.map(async (obj) => {
                    let condition = obj.condition === "is" ? "=" : "!=";

                    // Try to get object from eventValuesMap (if it's a reserved field)
                    let valueFromEventMap = eventValuesMap.find(
                      (v) =>
                        v.name ===
                        getValueByUniqueID(obj.conditionValueID).valueID
                    );

                    let fieldName = valueFromEventMap?.id;
                    let condValue = obj.conditionValue;

                    // If field is reserved, try to convert value from entityID to nodeID (same for offers)
                    if (valueFromEventMap) {
                      condValue = await processConditionValue(
                        valueFromEventMap.name,
                        obj.conditionValue
                      );
                    } else {
                      fieldName =
                        `"customData"->>` +
                        `'${getValueByUniqueID(obj.conditionValueID).valueID}'`;
                    }

                    return `\nAND e.${fieldName} ${condition} '${condValue}'`;
                  })
                )
              ).join("") + "\n"
            : "";
      }

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

      // Make aggregators there depending on what do we do with data
      let aggregation = ``;
      switch (methodType) {
        case "leastCommon": {
          aggregation = `COUNT("label")`;
          break;
        }
        case "mostCommon": {
          aggregation = `COUNT("label")`;
          break;
        }
        case "summ": {
          aggregation = `SUM(CAST("label" AS DECIMAL))`;
          outputLabelWhenPossible = false;
          break;
        }
        case "mean": {
          aggregation = `AVG(CAST("label" AS DECIMAL))`;
          outputLabelWhenPossible = false;
          break;
        }
        case "percentile": {
          aggregation = `CAST("label" AS DECIMAL)`;
          outputLabelWhenPossible = false;
          break;
        }
        case "numberOfEvents": {
          aggregation = `COUNT("label")`;
          outputLabelWhenPossible = true;
          break;
        }
      }

      // Do different row calculation for later sort depending on method
      let sorting = ``;
      switch (methodType) {
        case "leastCommon": {
          sorting = `ROW_NUMBER() OVER (PARTITION BY "x" ORDER BY y ASC) AS rn`;
          break;
        }
        case "numberOfEvents":
          sorting = "";
          break;
        case "percentile":
        case "summ":
        case "mean":
        case "mostCommon": {
          sorting = `ROW_NUMBER() OVER (PARTITION BY "x" ORDER BY y DESC) AS rn`;
          break;
        }
      }

      let categoryQueryFields =
        categoryFilters.length > 0
          ? categoryFilters
              .map((obj) => {
                if (categoryField === obj.conditionField) {
                  return null; // Prevent duplicate field in case we already grab it for additionalCategory
                }
                return `s."${obj.conditionField}",`;
              })
              .filter(Boolean)
              .join("") + "\n"
          : "";

      let percentileQuery = "";
      if (percentile > 0 && percentile < 100) {
        percentileQuery = `
            (
              SELECT PERCENTILE_CONT(${
                percentile / 100
              }) WITHIN GROUP (ORDER BY e2."y")
              FROM ${
                viewType === "absolute" ? "aggregatedEvents" : "avgPerViewType"
              } e2
              WHERE e2.x = rankedEvents.x
            ) 
              AS y`;
      }

      // Here we define the 2nd part of our query.
      // "absolute" view type will give us just a normal type of aggregation.
      // "player" and "session" will return us an average result for the given dimension (player or session).
      let viewTypeSection =
        viewType === "absolute"
          ? // Default view type
            `aggregatedEvents AS (
      SELECT
        x,
        "label",
        ${aggregation} AS y
      FROM filteredEvents
      GROUP BY "label", x
    ),
    rankedEvents AS (
      SELECT
        x,
        "label",
        y${sorting !== "" ? "," : ""}
        ${sorting}
      FROM aggregatedEvents
    )
    SELECT
      x,
      ${outputLabelWhenPossible ? `"label",` : ``}
      ${Boolean(percentileQuery) ? percentileQuery : "y"}
    FROM rankedEvents
    ${methodType === "numberOfEvents" ? "" : "WHERE rn = 1"}
    ORDER BY ${"x"} DESC
    LIMIT ${utilityService.clamp(interval.diff, 1000, interval.diff)}`
          : // Different view types
            `aggregatedEvents AS (
        SELECT
          x,
          "label",
          ${viewType === "player" ? `"clientID"` : `"sessionID"`},
          ${aggregation} AS eventCount
        FROM filteredEvents
        GROUP BY x, "label"` +
            (viewType === "player" ? `, "clientID"` : `, "sessionID"`) +
            `),` +
            `avgPerViewType AS (
        SELECT
          x,
          "label",
          AVG(eventCount) AS y
        FROM aggregatedEvents
        GROUP BY x, "label"
      ),
      rankedEvents AS (
      SELECT
        x,
        "label",
        y${sorting !== "" ? "," : ""}
        ${sorting}
      FROM avgPerViewType
      )
      SELECT
        x,
        ${outputLabelWhenPossible ? `"label",` : ``}
        ${Boolean(percentileQuery) ? percentileQuery : "y"}
      FROM rankedEvents
      ${methodType === "numberOfEvents" ? "" : "WHERE rn = 1"}
      ORDER BY ${methodType === "numberOfEvents" ? "label" : "x"} DESC
      LIMIT ${utilityService.clamp(interval.diff, 1000, interval.diff)}`;

      let sessionCategorization = "";
      let eventsCategorization = "";
      if (sessionFieldsNames.includes(categoryField)) {
        // This means the category field must be in sessions table
        if (categoryField === "timestamp") {
          sessionCategorization = `DATE_TRUNC('${interval.granularity}', s."timestamp")`;
          eventsCategorization = `DATE_TRUNC('${interval.granularity}', e."timestamp")`;
        } else {
          sessionCategorization = `s."${categoryField}"`;
          eventsCategorization = `s."${categoryField}"`;
        }
      } else {
        // If category field is not in sessions table, skip sessionCategorization
        sessionCategorization = "";

        // Check if the category is a default field like field1, field3 etc
        const defaultEventField = isDesignEvent
          ? `"customData"->>` + `'${getValueByUniqueID(categoryField).valueID}'`
          : `"${
              eventValuesMap.find(
                (v) => v.name === getValueByUniqueID(categoryField)?.valueID
              )?.id
            }"`;
        if (defaultEventField) {
          eventsCategorization = `e.${defaultEventField}`;
        } else {
          eventsCategorization = `e."${
            getValueByUniqueID(categoryField)?.valueID
          }"`;
        }
      }

      //
      // Default query. Append everything we made above to this.
      //
      parsedSQL =
        `WITH all_sessions AS (
        SELECT s."clientID",
          ${categoryQueryFields}
          s."sessionID",
          s."branch",
          s."environment",
          s."gameID"
          ${sessionCategorization !== "" ? `, ${sessionCategorization}` : ""}
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
          SELECT e."clientID", s."sessionID", e.${targetField} AS label,
               ${eventsCategorization} AS x
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
            AND e."type" = '${eventType}'` +
        segmentsQueryFilters +
        categoryQueryFilters +
        valueQueryFilters +
        `),` +
        viewTypeSection;

      utilityService.log("Parsed SQL:\n", parsedSQL);
      return parsedSQL;
    }
  }
}
