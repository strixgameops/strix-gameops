import { ABTests } from "../../../models/abtests.js";
import dayjs from "dayjs";
import jStat from "jstat";
import abTestResults from "ab-test-result";
import utc from "dayjs/plugin/utc.js";
import {
  eventValuesMap,
  sessionFieldsNames,
} from "../../utils/analytics/analyticsEventsConstants.js";
dayjs.extend(utc);
export class ABTestAnalyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  // CUPED application function
  applyCUPED(experimentData, preExperimentData, sampleSizes) {
    // Check for the presence of pre-experiment data
    const utilityService = this.moduleContainer.get("utility");
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    if (!preExperimentData) {
      console.error("No pre-experiment data available for CUPED");
      return experimentData;
    }

    // Calculate the mean of pre-experiment data if lengths differ
    const controlPreMean =
      preExperimentData.controlPre.length > 0
        ? coreAnalytics.mean(preExperimentData.controlPre)
        : 0;

    utilityService.log("Pre-experiment control data means:", controlPreMean);

    const thetaControl = coreAnalytics.calculateOptimalTheta(
      preExperimentData.controlPre.length > 0
        ? preExperimentData.controlPre
        : [controlPreMean],
      experimentData.map((r) => r.control / sampleSizes.control)
    );

    const thetaTest = coreAnalytics.calculateOptimalTheta(
      preExperimentData.controlPre.length > 0
        ? preExperimentData.controlPre
        : [controlPreMean],
      experimentData.map((r) => r.test / sampleSizes.test)
    );

    utilityService.log("Optimal θ:", thetaControl, thetaTest);

    const adjustedResults = experimentData.map((result, index) => {
      const controlValue = result.control / sampleSizes.control;
      const testValue = result.test / sampleSizes.test;

      const adjustedControlValue = controlValue - thetaControl * controlPreMean;
      const adjustedTestValue = testValue - thetaTest * controlPreMean;

      // utilityService.log(
      //   "controlValue",
      //   controlValue,
      //   "adjustedControlValue",
      //   adjustedControlValue,
      //   "adjustedControlValue * sampleSizes.control",
      //   adjustedControlValue * sampleSizes.control
      //   // "thetaControl\n",
      //   // thetaControl,
      //   // "thetaTest\n",
      //   // thetaTest
      // );

      return {
        ...result,
        control: adjustedControlValue * sampleSizes.control,
        test: adjustedTestValue * sampleSizes.test,
        cupedTheta: {
          control: thetaControl,
          test: thetaControl,
        },
      };
    });

    return adjustedResults;
  }

  async getPreExperimentData(
    gameID,
    testID,
    studioID,
    branch,
    environment,
    metricObj,
    cupedMetricObj,
    startDate,
    endDate,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    try {
      const utilityService = this.moduleContainer.get("utility");
      const coreAnalytics = this.moduleContainer.get("coreAnalytics");
      const contentCacher = this.moduleContainer.get("contentCacher");
      const db = this.moduleContainer.get("database");
      utilityService.log("Getting CUPED pre-exp data:");

      if (!cupedMetricObj) {
        utilityService.log(
          "No CUPED metric object provided, skipping CUPED application"
        );
        return null;
      }

      let targetTest = await ABTests.findOne({
        gameID: gameID,
        branch: utilityService.getBranchWithReferenceSuffix(branch),
        id: testID,
      }).lean();

      if (!targetTest) {
        console.error(
          `No test found with ID ${testID} for game ${gameID} in branch ${branch}`
        );
        return null;
      }

      if (!targetTest.startDate) {
        console.error(
          "Tried to get data for a test that has no start date (not yet started)"
        );
        return null;
      }

      const testStartDate = targetTest.startDate;

      // Making an interval of startDate minus month
      const preExperimentStartDate =
        startDate ||
        dayjs
          .utc(targetTest.startDate)
          .subtract(1, "month")
          .startOf("day")
          .toISOString();

      const preExperimentEndDate =
        endDate || dayjs.utc(targetTest.startDate).startOf("day").toISOString();

      let interval = coreAnalytics.constructIntervalFromDateFilter([
        preExperimentStartDate,
        preExperimentEndDate,
      ]);
      interval.granularity = "day";

      let fieldName = "";
      let isDesignEvent = true;
      let temp;

      let controlSegment = targetTest.segments.control;
      const metric = cupedMetricObj;
      const cachedAnalyticsEvent =
        await contentCacher.getCachedAnalyticEventByEventID(
          gameID,
          utilityService.getBranchWithReferenceSuffix(branch),
          metric.queryAnalyticEventID
        );

      function getValueByUniqueID(uniqueID) {
        return cachedAnalyticsEvent.values.find((v) => v.uniqueID === uniqueID);
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
      } else {
        temp = cachedAnalyticsEvent.values.map((v, i) => ({
          id: v.uniqueID,
          name: v.valueID,
        }));
      }

      async function processConditionValue(fieldName, conditionValue) {
        switch (fieldName) {
          case "offerID":
            return await coreAnalytics.transformOfferCodeNameToOfferID(
              gameID,
              utilityService.getBranchWithReferenceSuffix(branch),
              conditionValue
            );
          case "currency":
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

      const query = await getModifiedUniversalQuery(
        metric.queryMethod,
        studioID,
        "timestamp",
        gameID,
        branch,
        metric.queryAnalyticEventID,
        interval,
        fieldName,
        metric.queryCategoryFilters,
        metric.queryValueFilters,
        temp,
        isDesignEvent,
        controlSegment
      );

      utilityService.log("Parsed query:", query);

      const preData = await db.PGquery(query);

      // utilityService.log('Got data for CUPED (raw):', preData);

      const processedPreData = {
        controlPre: preData.map((item) => {
          // If no samples, count as sample=1 (individual data)
          const controlSamples =
            item.controlSamples !== undefined
              ? parseFloat(item.controlSamples)
              : 1;

          const controlValue = parseFloat(item.control);

          if (isNaN(controlValue)) {
            console.error(
              "Incorrect data for control group in CUPED:",
              item.control
            );
            return 0;
          }

          return controlValue / Math.max(controlSamples, 1); // Prevent division by zero
        }),
      };

      // utilityService.log('Data for CUPED:', processedPreData);

      return processedPreData;

      // Same as in getABTestData but without the test segment
      async function getModifiedUniversalQuery(
        methodType,
        studioID,
        categoryField,
        gameID,
        branch,
        eventType,
        interval,
        targetField,
        categoryFilters,
        valueFilters,
        eventValuesMap,
        isDesignEvent,
        controlSegment
      ) {
        let parsedSQL = "";

        if (!eventValuesMap.find((v) => v.id === targetField)) {
          targetField = `"customData"->>` + `'${targetField}'`;
        } else {
          targetField = `"${targetField}"`;
        }

        // Making category filters
        let categoryQueryFilters =
          categoryFilters.length > 0
            ? categoryFilters
                .map((obj) => {
                  let condition = obj.condition === "is" ? "=" : "!=";
                  return `\nAND s."${obj.conditionField}" ${condition} '${obj.conditionValue}'`;
                })
                .join("") + "\n"
            : "";

        let categoryQueryFields =
          categoryFilters.length > 0
            ? categoryFilters
                .map((obj) => {
                  return `\nAND s."${obj.conditionField}",`;
                })
                .join("") + "\n"
            : "";

        // Making value filters
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

                      let valueFromEventMap = eventValuesMap.find(
                        (v) =>
                          v.name ===
                          getValueByUniqueID(obj.conditionValueID).valueID
                      );

                      let fieldName = valueFromEventMap?.id;
                      let condValue = obj.conditionValue;

                      if (valueFromEventMap) {
                        condValue = await processConditionValue(
                          valueFromEventMap.name,
                          obj.conditionValue
                        );
                      } else {
                        fieldName =
                          `"customData"->>` +
                          `'${
                            getValueByUniqueID(obj.conditionValueID).valueID
                          }'`;
                      }

                      return `\nAND e.${fieldName} ${condition} '${condValue}'`;
                    })
                  )
                ).join("") + "\n"
              : "";
        }

        let controlSegmentFilter =
          controlSegment === "everyone"
            ? ``
            : `WHERE seg."segments" @> ARRAY['${controlSegment}']::text[]`;

        let segmentsJoin =
          controlSegment === "everyone"
            ? ""
            : `
      JOIN "segments-${studioID}" seg
        ON '${utilityService.getDemoGameID(
          gameID
        )}:' || '${environment}:' || e."clientID" = seg."clientID"`;

        let aggregation = ``;
        switch (methodType) {
          case "summ": {
            aggregation = `
            SUM(
              CAST(e."value" AS DECIMAL)
            )
          `;
            break;
          }
          case "mean": {
            aggregation = `
            AVG(
              CAST(e."value" AS DECIMAL)
            )
          `;
            break;
          }
          case "numberOfEvents": {
            aggregation = `COUNT(e."value")`;
            break;
          }
        }

        parsedSQL =
          `WITH all_sessions AS (
        SELECT s."clientID",
          ${categoryQueryFields}
          s."timestamp",
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
          SELECT e."clientID", s."sessionID", 
          e.${methodType !== "numberOfEvents" ? targetField : "type"} AS value, 
          e."type",
          e."timestamp" AS x
          FROM "events-${studioID}" AS e
          JOIN all_sessions s
            ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID"
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
          AND (e."type" = '${eventType}')` +
          categoryQueryFilters +
          valueQueryFilters +
          `)` +
          `
              SELECT
                DATE_TRUNC('${interval.granularity}', e."x") AS x,
                COUNT(DISTINCT e."clientID") AS controlSamples,
                ${aggregation} AS "control"
              FROM filteredEvents AS e
              ${segmentsJoin}
              ${controlSegmentFilter}
              GROUP BY DATE_TRUNC('day', e."x")
            
            ORDER BY DATE_TRUNC('day', e."x") DESC
            `;

        return parsedSQL;
      }
    } catch (error) {
      console.error("Couldnt get pre-experiment data for CUPED:", error);
      return null;
    }
  }

  async getPlayersSampleCountForABTest(
    gameID,
    studioID,
    branch,
    environment,
    testID,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    try {
      const coreAnalytics = this.moduleContainer.get("coreAnalytics");
      const utilityService = this.moduleContainer.get("utility");
      const db = this.moduleContainer.get("database");
      let targetTest = await ABTests.findOne({
        gameID: gameID,
        branch: utilityService.getBranchWithReferenceSuffix(branch),
        id: testID,
      }).lean();

      if (!targetTest) {
        utilityService.log(
          `No test found with ID ${testID} for game ${gameID} in branch ${branch}`
        );
        return { control: 0, test: 0 };
      }

      if (!targetTest.startDate) {
        return { control: 0, test: 0 };
      }

      let testSegment = targetTest.segments.test;
      let controlSegment = targetTest.segments.control;

      let participantsSegment = `abtest_${testID}`;

      const experimentStartDate = dayjs.utc(targetTest.startDate).toISOString();
      const currentDate = dayjs.utc().toISOString();

      let interval = coreAnalytics.constructIntervalFromDateFilter([
        experimentStartDate,
        currentDate,
      ]);
      interval.granularity = "day";

      let testSegmentFilter =
        testSegment === "everyone"
          ? `
              WHERE seg."segments" @> ARRAY['${participantsSegment}']::text[]
              `
          : `
              WHERE seg."segments" @> ARRAY['${testSegment}']::text[]
              AND seg."segments" @> ARRAY['${participantsSegment}']::text[]
              `;

      let controlSegmentFilter =
        controlSegment === "everyone"
          ? `
              WHERE NOT (seg."segments" @> ARRAY['${participantsSegment}']::text[])
              `
          : `
              WHERE seg."segments" @> ARRAY['${controlSegment}']::text[]
              AND NOT (seg."segments" @> ARRAY['${participantsSegment}']::text[])
              `;

      let segmentsJoin = `
      JOIN "segments-${studioID}" seg
        ON '${utilityService.getDemoGameID(
          gameID
        )}:' || '${environment}:' || s."clientID" = seg."clientID"`;

      const query = `
      WITH all_sessions AS (
        SELECT DISTINCT(s."clientID")
        FROM "sessions-${studioID}" AS s
        WHERE s."timestamp" BETWEEN '2024-02-25T00:00:00.000Z' AND '2025-03-25T23:59:59.999Z'
        AND s."gameID" = '${utilityService.getDemoGameID(gameID)}'
        ${includeBranchInAnalytics ? `AND s."branch" = '${branch}'` : ""}
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = '${environment}'`
              : ""
          }
      ),
      controlSamples AS (
        SELECT COUNT(DISTINCT(s."clientID")) AS "control"
        FROM all_sessions AS s
        ${segmentsJoin}
        ${controlSegmentFilter}
      ),
      testSamples AS (
        SELECT COUNT(DISTINCT(s."clientID")) AS "test"
        FROM all_sessions AS s
        ${segmentsJoin}
        ${testSegmentFilter}
      )
        SELECT c.control, t.test
        FROM controlSamples AS c
        CROSS JOIN testSamples AS t;
      `;
      utilityService.log("Parsed query:", query);
      const [data] = await db.PGquery(query);
      if (data && data.control && data.test) {
        return { control: parseInt(data.control), test: parseInt(data.test) };
      } else {
        return { control: 0, test: 0 };
      }
    } catch (error) {
      console.error("getPlayersSampleCountForABTest", error);
    }
  }
  async getABTestData(
    gameID,
    testID,
    studioID,
    branch,
    environment,
    metricObj,
    cupedMetricObj,
    startDate,
    endDate,
    includeBranchInAnalytics = false,
    includeEnvironmentInAnalytics = false
  ) {
    const utilityService = this.moduleContainer.get("utility");

    let [testSampleSizes, preExperimentData, results] = await Promise.all([
      // Get {controlSize, testSize} audience samples
      this.getPlayersSampleCountForABTest(
        gameID,
        studioID,
        branch,
        environment,
        testID,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics
      ),
      // Retrieve pre-experiment data
      this.getPreExperimentData(
        gameID,
        testID,
        studioID,
        branch,
        environment,
        metricObj,
        cupedMetricObj,
        startDate,
        endDate,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics
      ),
      // Main query to fetch A/B test data
      this.queryABTestData(
        gameID,
        testID,
        studioID,
        branch,
        environment,
        metricObj,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics
      ),
    ]);

    // Apply CUPED post-processing if applicable
    if (preExperimentData) {
      utilityService.log("Applying CUPED with provided metric data");
      results = this.applyCUPED(results, preExperimentData, testSampleSizes);
    } else {
      utilityService.log(
        "No CUPED pre-experiment data available, skipping CUPED application"
      );
    }

    const cumulativeResults = [];
    let cumulativeControl = 0;
    let cumulativeTest = 0;

    // Sort results by timestamp in ascending order to ensure proper cumulative calculation
    results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Calculate cumulative values
    for (let i = 0; i < results.length; i++) {
      cumulativeControl += results[i].control;
      cumulativeTest += results[i].test;

      cumulativeResults.push({
        ...results[i],
        cumulativeControl: cumulativeControl,
        cumulativeTest: cumulativeTest,
      });
    }

    // obj = {
    //   indicators: {
    //     pvalue: 1
    //   },
    //   data: [
    //     {timestamp...}
    //   ]
    // }

    function calculateMetrics(
      controlSuccesses,
      controlTrials,
      testSuccesses,
      testTrials,
      confidenceLevel = 0.95
    ) {
      // utilityService.log(
      //   "Processing metrics for: ",
      //   controlSuccesses,
      //   controlTrials,
      //   testSuccesses,
      //   testTrials
      // );

      const p1 = testSuccesses / testTrials; // test group mean
      const p2 = controlSuccesses / controlTrials; // control group mean

      // Assume sales follow a Poisson distribution => variance ≈ mean
      const var1 = p1;
      const var2 = p2;

      // Standard error of the difference between means
      const SE = Math.sqrt(var1 / testTrials + var2 / controlTrials);

      // Compute t-statistic
      const z = (p1 - p2) / SE;

      // Approximate degrees of freedom using Welch’s formula
      const numerator = Math.pow(var1 / testTrials + var2 / controlTrials, 2);
      const denominator =
        Math.pow(var1 / testTrials, 2) / (testTrials - 1) +
        Math.pow(var2 / controlTrials, 2) / (controlTrials - 1);
      const df = numerator / denominator;

      // Compute two-tailed p-value using the cumulative distribution function of t-distribution
      const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(z), df));

      // Pool probability
      const totalSuccesses = controlSuccesses + testSuccesses;
      const totalTrials = controlTrials + testTrials;
      const p = totalSuccesses / totalTrials;

      // Effect size:
      // 1. Lift – ratio of proportions
      const lift = p1 !== 0 ? p2 / p1 : NaN;

      // Get Z-value for the confidence level
      const z_alpha = jStat.normal.inv(1 - (1 - confidenceLevel) / 2, 0, 1);

      // Confidence interval for the difference in proportions using configurable confidence level
      const diff = p2 - p1;
      const ciLower = diff - z_alpha * SE;
      const ciUpper = diff + z_alpha * SE;
      const confidenceInterval = [ciLower, ciUpper];

      // Estimate test power with improved calculation
      const alpha = 0.05;
      const za = jStat.normal.inv(1 - alpha / 2, 0, 1);

      //   (  ) diff   (, p2 - p1)
      const effectSize = Math.abs(diff) / SE;

      //   (power)
      const powerEstimate = jStat.normal.cdf(effectSize - za, 0, 1);

      //   ,  B  A
      const probabilityBBetterThanA = jStat.normal.cdf(0, diff, SE);

      // Minimal detectable effect
      const minDetectableEffect = 0.05; // 5% improvement considered significant
      const isPracticallySignificant = Math.abs(lift - 1) > minDetectableEffect;

      // Check for small sample warnings
      const smallSampleWarning =
        controlTrials < 30 ||
        testTrials < 30 ||
        p * totalTrials < 5 ||
        (1 - p) * totalTrials < 5;

      // Return default values if calculations result in non-numeric values
      if (isNaN(pValue) && isNaN(z)) {
        return {
          pValue: 1,
          zScore: 0,
          standardError: SE,
          lift: lift,
          confidenceInterval: confidenceInterval,
          power: powerEstimate,
          probBBetterA: probabilityBBetterThanA,
          isPracticallySignificant: isPracticallySignificant,
          smallSampleWarning: smallSampleWarning,
        };
      }

      return {
        pValue: pValue,
        zScore: z,
        standardError: SE,
        lift: lift,
        confidenceInterval: confidenceInterval,
        power: powerEstimate,
        probBBetterA: probabilityBBetterThanA,
        isPracticallySignificant: isPracticallySignificant,
        smallSampleWarning: smallSampleWarning,
      };
    }

    // Apply metrics calculation to each result item
    for (let i = 0; i < results.length; i++) {
      // Use cumulative values for metrics calculation
      const currentControl = cumulativeResults[i].cumulativeControl;
      const currentTest = cumulativeResults[i].cumulativeTest;

      // Compute metrics for the current dataset with normalized values
      const res = calculateMetrics(
        currentControl,
        testSampleSizes.control,
        currentTest,
        testSampleSizes.test
      );

      // Update the result object with additional computed metrics
      results[i].pValue = res.pValue;
      results[i].zScore = res.zScore;
      results[i].standardError = res.standardError;
      results[i].lift = res.lift;
      results[i].confidenceInterval = res.confidenceInterval;
      results[i].power = res.power;

      // Add new metrics
      results[i].probBBetterA = res.probBBetterA;
      results[i].isPracticallySignificant = res.isPracticallySignificant;
      results[i].smallSampleWarning = res.smallSampleWarning;

      // Keep the original daily values but also add cumulative values
      results[i].dailyControl = results[i].control;
      results[i].dailyTest = results[i].test;
      results[i].cumulativeControl = parseFloat(currentControl.toFixed(4));
      results[i].cumulativeTest = parseFloat(currentTest.toFixed(4));

      // Keep daily values but round them
      results[i].test = parseFloat(results[i].test.toFixed(4));
      results[i].control = parseFloat(results[i].control.toFixed(4));
    }

    return results;
  }

  async queryABTestData(
    gameID,
    testID,
    studioID,
    branch,
    environment,
    metricObj,
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics
  ) {
    const db = this.moduleContainer.get("database");
    const utilityService = this.moduleContainer.get("utility");
    const coreAnalytics = this.moduleContainer.get("coreAnalytics");
    const contentCacher = this.moduleContainer.get("contentCacher");
    utilityService.log(
      "QUERY queryABTestData:",
      gameID,
      studioID,
      branch,
      metricObj
    );

    try {
      let targetTest = await ABTests.findOne({
        gameID: gameID,
        branch: utilityService.getBranchWithReferenceSuffix(branch),
        id: testID,
      }).lean();

      if (!targetTest) {
        utilityService.log(
          `No test found with ID ${testID} for game ${gameID} in branch ${branch}`
        );
        return [];
      }

      if (!targetTest.startDate) {
        return [];
      }

      const testStartDate = targetTest.startDate;

      let interval = coreAnalytics.constructIntervalFromDateFilter([
        targetTest.startDate,
        dayjs.utc().toISOString(),
      ]);
      // always set to "day"
      interval.granularity = "day";

      let controlSegment = targetTest.segments.control;
      let testSegment = targetTest.segments.test;
      let participantsSegment = `abtest_${targetTest.id}`;

      const metric = metricObj;
      const cachedAnalyticsEvent =
        await contentCacher.getCachedAnalyticEventByEventID(
          gameID,
          utilityService.getBranchWithReferenceSuffix(branch),
          metric.queryAnalyticEventID
        );
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

      // Processing regular events. This code is taken from UniversalQuery
      let query = "";

      let fieldName = "";
      let isDesignEvent = true;
      let temp;

      if (!cachedAnalyticsEvent) {
        console.error(metric);
        throw new Error("Error fetching analytics data: no such event found");
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
      } else {
        temp = cachedAnalyticsEvent.values.map((v, i) => ({
          id: v.uniqueID,
          name: v.valueID,
        }));
      }
      query = await getModifiedUniversalQuery(
        metric.queryMethod,
        studioID,
        "timestamp",
        gameID,
        branch,
        metric.queryAnalyticEventID,
        interval,
        fieldName,
        metric.queryCategoryFilters,
        metric.queryValueFilters,
        temp,
        isDesignEvent,
        controlSegment,
        testSegment,
        participantsSegment
      );

      const cachedResult = await contentCacher.getCachedAnalyticsResponse(
        query
      );
      if (cachedResult !== null) return cachedResult;

      let formattedResult = []; // Define that and change to result later
      const data = await db.PGquery(query);
      // utilityService.log(data);

      if (data.errorMessage) {
        handleSqlError(data.errorMessage);
        // Should throw error if there is error
      }
      formattedResult = data.map((item) => ({
        timestamp: item.timestamp,
        test: parseFloat(item.test),
        control: parseFloat(item.control),
        testSamples: parseInt(item.testsamples, 10),
        controlSamples: parseInt(item.controlsamples, 10),
        // testStartDate: testStartDate,
      }));

      // formattedResult = [formattedResult[0]]

      // utilityService.log("Pre-formatted data length:", data.length);
      // utilityService.log("Post-formatted data length:", formattedResult.length);
      // utilityService.log("Post-formatted data:", formattedResult);
      // utilityService.log("Formatted result after mapping:", formattedResult);
      contentCacher.setAnalyticsQueryCache(query, formattedResult);
      return JSON.parse(JSON.stringify(formattedResult));
      async function getModifiedUniversalQuery(
        methodType,
        studioID,
        categoryField,
        gameID,
        branch,
        eventType,
        interval,
        targetField,
        categoryFilters,
        valueFilters,
        eventValuesMap,
        isDesignEvent,
        controlSegment,
        testSegment,
        participantsSegment
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

        let categoryQueryFields =
          categoryFilters.length > 0
            ? categoryFilters
                .map((obj) => {
                  return `\nAND s."${obj.conditionField}",`;
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
                          `'${
                            getValueByUniqueID(obj.conditionValueID).valueID
                          }'`;
                      }

                      return `\nAND e.${fieldName} ${condition} '${condValue}'`;
                    })
                  )
                ).join("") + "\n"
              : "";
        }

        let testSegmentFilter =
          testSegment === "everyone"
            ? `
                WHERE seg."segments" @> ARRAY['${participantsSegment}']::text[]
                `
            : `
                WHERE seg."segments" @> ARRAY['${testSegment}']::text[]
                AND seg."segments" @> ARRAY['${participantsSegment}']::text[]
                `;

        let controlSegmentFilter =
          controlSegment === "everyone"
            ? `
                WHERE NOT (seg."segments" @> ARRAY['${participantsSegment}']::text[])
                `
            : `
                WHERE seg."segments" @> ARRAY['${controlSegment}']::text[]
                AND NOT (seg."segments" @> ARRAY['${participantsSegment}']::text[])
                `;

        let segmentsJoin = `
        JOIN "segments-${studioID}" seg
          ON '${utilityService.getDemoGameID(
            gameID
          )}:' || '${environment}:' || e."clientID" = seg."clientID"`;

        // Make aggregators there depending on what do we do with data
        let aggregation = ``;
        switch (methodType) {
          case "summ": {
            aggregation = `
              SUM(
                CAST(e."value" AS DECIMAL)
              )
            `;
            break;
          }
          case "mean": {
            aggregation = `
              AVG(
                CAST(e."value" AS DECIMAL)
              )
            `;
            // `
            //   AVG(
            //     CASE
            //       WHEN e."value" ~ '^[0-9]+(\.[0-9]+)?$' THEN CAST(e."value" AS DECIMAL)
            //       ELSE NULL
            //     END
            //   )
            // `;
            break;
          }
          case "numberOfEvents": {
            aggregation = `COUNT(e."value")`;
            break;
          }
        }

        //
        // Default query. Append everything we made above to this.
        //
        parsedSQL =
          `WITH all_sessions AS (
          SELECT s."clientID",
            ${categoryQueryFields}
            s."timestamp",
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
            SELECT e."clientID", s."sessionID", 
            e.${
              methodType !== "numberOfEvents" ? targetField : "type"
            } AS value, 
            e."type",
            e."timestamp" AS x
            FROM "events-${studioID}" AS e
            JOIN all_sessions s
              ON e."clientID" = s."clientID" AND e."sessionID" = s."sessionID"
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
            AND (e."type" = '${eventType}')` +
          categoryQueryFilters +
          valueQueryFilters +
          `),` +
          `
              testSegmentEvents AS (
                SELECT
                  DATE_TRUNC('${interval.granularity}', e."x") AS x,
                  ${aggregation} AS y
                FROM filteredEvents AS e
                ${segmentsJoin}
                ${testSegmentFilter}
                GROUP BY DATE_TRUNC('${interval.granularity}', e."x")
              ),
              controlSegmentEvents AS (
                SELECT
                  DATE_TRUNC('${interval.granularity}', e."x") AS x,
                  ${aggregation} AS y
                FROM filteredEvents AS e
                ${segmentsJoin}
                ${controlSegmentFilter}
                GROUP BY DATE_TRUNC('${interval.granularity}', e."x")
              )
              SELECT
                  COALESCE(c.x, t.x) AS "timestamp",
                  COALESCE(t.y, 0) AS test,
                  COALESCE(c.y, 0) AS control
              FROM testSegmentEvents AS t
              FULL OUTER JOIN  controlSegmentEvents AS c
                  ON t.x = c.x
              ORDER BY "timestamp" DESC
              `;
        // `aggregatedEvents AS (
        //   SELECT
        //     x,
        //     "type",
        //     ${aggregation} AS y
        //   FROM filteredEvents
        //   ${segmentsJoin}
        //   GROUP BY "type", x
        // ),
        // rankedEvents AS (
        //   SELECT
        //     x,
        //     "type",
        //     y,
        //     ${sorting}
        //   FROM aggregatedEvents
        // )
        // SELECT
        //   x,
        //   ${outputLabelWhenPossible ? `"type",` : ``}
        //   y
        // FROM rankedEvents
        // WHERE rn = 1
        // ORDER BY ${methodType === "numberOfEvents" ? "type" : "x"} DESC
        // LIMIT ${clamp(interval.diff, 1000, interval.diff)}`

        utilityService.log("Parsed SQL:\n", parsedSQL);
        return parsedSQL;
      }
    } catch (error) {
      console.error(error);
      return [];
    }
  }
}
