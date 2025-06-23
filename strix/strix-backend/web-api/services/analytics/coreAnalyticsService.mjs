import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import { PWtemplates } from "../../../models/PWtemplates.js";
import axios from "axios";

import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(isSameOrAfter);

export class CoreAnalyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }
  async populateAnalyticsTables(studioID) {
    const utilityService = this.moduleContainer.get("utility");
    try {
      const resp = await axios.post(
        `${process.env.SDK_API_URL}/cacher/populateStudioDB`,
        { studioID: studioID, key: process.env.ENCRYPT_SECRET_KEY }
      );
      utilityService.log(
        "populateAnalyticsTables:",
        studioID,
        "resp.success",
        resp.data.success
      );
    } catch (error) {
      utilityService.log(error);
    }
  }

  handleSqlError(errorMessage) {
    if (errorMessage.includes("Column") && errorMessage.includes("not found")) {
      const err = new Error("No data found");
      throw err;
    } else {
      console.error("SQL Error:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  getPastInterval(filterDate) {
    const start = dayjs.utc(filterDate[0]);
    const end = dayjs.utc(filterDate[1]);

    const diff = end.diff(start, "milliseconds");

    const newEndDate = start.subtract(1, "days");
    const newStartDate = newEndDate.subtract(diff, "milliseconds");

    return [newStartDate.toISOString(), newEndDate.toISOString()];
  }

  generateTimestamps(startDate, endDate) {
    const result = [];
    let currentDate = dayjs.utc(endDate).startOf("day");

    const toUTCDateString = (date) => dayjs.utc(date).toISOString();

    while (currentDate.isSameOrAfter(dayjs.utc(startDate).startOf("day"))) {
      result.push({
        timestamp: toUTCDateString(currentDate),
      });

      currentDate = currentDate.subtract(1, "day").startOf("day");
    }

    return result;
  }
  constructIntervalFromDateFilter(filterDate, specificTimeframe) {
    const startDate = dayjs.utc(filterDate[0]).startOf("day");
    const endDate = dayjs.utc(filterDate[1]).endOf("day");

    let granularity = "day";
    let diff = startDate.diff(endDate, "day");
    if (Math.abs(diff) < 7) {
      diff = startDate.diff(endDate, "hour");
      granularity = "hour";
    }

    let interval = [`${startDate.toISOString()}`, `${endDate.toISOString()}`];
    if (specificTimeframe) {
      interval = [
        `${dayjs.utc(filterDate[0]).toISOString()}`,
        `${dayjs.utc(filterDate[1]).toISOString()}`,
      ];
    }

    return {
      interval: interval,
      diff: Math.abs(diff),
      granularity: granularity,
    };
  }

  async transformEntityIDToNodeID(gameID, branch, entityID) {
    const contentCacher = this.moduleContainer.get("contentCacher");
    let obj = await contentCacher.getCachedCurrencyEntityByID(
      gameID,
      branch,
      entityID,
      false
    );
    if (!obj) return entityID;
    return obj; // nodeID
  }
  async transformOfferCodeNameToOfferID(gameID, branch, offerCodeName) {
    const offerService = this.moduleContainer.get("offer");
    let obj = await offerService.getOfferByCodeName(
      gameID,
      branch,
      offerCodeName
    );
    if (!obj) return offerCodeName;
    return obj.offerID;
  }

  async getAvgProfile({
    gameID,
    branch,
    environment,
    salesCount = 100,
    subject,
    getFullRealMoneyCustomerProfile, // Grabbing all snapshots with orderID not being null
    filterDate,
    filterSegments = [],
    includeBranchInAnalytics,
    includeEnvironmentInAnalytics,
  }) {
    if (!gameID || !branch) {
      return [];
    }
    const utilityService = this.moduleContainer.get("utility");
    const db = this.moduleContainer.get("database");

    let sampleSize = utilityService.clamp(
      utilityService.getSampleSize(salesCount, 0.99),
      100,
      600
    );

    let templates = await PWtemplates.find({ gameID, branch: branch });
    if (templates.length === 0) {
      return [];
    }

    const templateNames = templates.map((template) => ({
      name: template.templateName,
      id: template.templateID,
    }));

    const studioID = await utilityService.getStudioIDByGameID(
      utilityService.getDemoGameID(gameID)
    );
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
    const q = `
        SELECT *
        FROM "snapshots-${studioID}" s
        ${segmentsJoin}
        WHERE 
          s."gameID" = '${utilityService.getDemoGameID(gameID)}'
          ${
            includeBranchInAnalytics
              ? `AND s."branch" = '${utilityService.getBranchWithoutSuffix(
                  branch
                )}'`
              : ""
          }
          ${
            includeEnvironmentInAnalytics
              ? `AND s."environment" = 'environment'`
              : ""
          }
          ${
            filterDate
              ? `AND s."timestamp" >= '${dayjs
                  .utc(filterDate[0])
                  .toISOString()}' AND s."timestamp" <= '${dayjs
                  .utc(filterDate[1])
                  .toISOString()}'`
              : ""
          }
          ${
            getFullRealMoneyCustomerProfile
              ? ""
              : `AND s."subject" = '${subject}'`
          }
          ${
            getFullRealMoneyCustomerProfile
              ? `AND s."realMoneyPurchaseOrderID" IS NOT NULL`
              : ""
          }
          ${segmentsQueryFilters}
        ORDER BY s."timestamp" DESC
        LIMIT ${sampleSize};
        `;
    let snapshots = await db.PGquery(q);
    // await CustomerSnapshots.find({
    //   gameID: getDemoGameID(gameID),
    //   branch: branch,
    //   ...(filterDate
    //     ? {
    //         timestamp: {
    //           $gte: new Date(filterDate[0]),
    //           $lte: new Date(filterDate[1]),
    //         },
    //       }
    //     : {}),

    //   ...(getFullRealMoneyCustomerProfile ? {} : { subject: subject }), // Dont get by subject, if we're searching for all profiles
    //   ...(getFullRealMoneyCustomerProfile
    //     ? { realMoneyPurchaseOrderID: { $ne: null } }
    //     : {}),
    // })
    //   .sort({ timestamp: 1 })
    //   .limit(sampleSize)
    //   .lean();

    if (snapshots.length < sampleSize) {
      sampleSize = snapshots.length;
    }

    return this.buildAvgProfileFromSnapshots(
      snapshots,
      templateNames,
      sampleSize
    );
  }
  buildAvgProfileFromSnapshots(snapshots, templateNames, sampleSize) {
    let elementData = {};

    for (let snapshot of snapshots) {
      let elements = snapshot.snapshot;

      for (let element of elements) {
        let { elementID, elementValue } = element;

        if (!elementData[elementID]) {
          elementData[elementID] = {
            name:
              templateNames.find((t) => t.id === elementID)?.name || elementID,
            templateID: elementID,
            totalPlayers: 0,
            subProfiles: {},
          };
        }

        elementData[elementID].totalPlayers++;

        if (!elementData[elementID].subProfiles[elementValue]) {
          elementData[elementID].subProfiles[elementValue] = {
            value: elementValue,
            players: 0,
          };
        }

        elementData[elementID].subProfiles[elementValue].players++;
      }
    }

    let avgProfile = Object.values(elementData).map((element) => {
      let maxSubProfile = Object.values(element.subProfiles).reduce((a, b) =>
        a.players > b.players ? a : b
      );
      let subProfiles = Object.values(element.subProfiles).filter(
        (subProfile) => subProfile.value !== maxSubProfile.value
      );
      return {
        name: element.name,
        value: maxSubProfile.value,
        templateID: element.templateID,
        players: maxSubProfile.players,
        sampleSize: sampleSize,
        subProfiles: subProfiles,
      };
    });
    return avgProfile || [];
  }

  mean(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  median(numbers) {
    if (numbers.length === 0) return null;
    const sortedNumbers = [...numbers].sort((a, b) => a - b);
    const middleIndex = Math.floor(sortedNumbers.length / 2);
    if (sortedNumbers.length % 2 === 0) {
      return (sortedNumbers[middleIndex - 1] + sortedNumbers[middleIndex]) / 2;
    } else {
      return sortedNumbers[middleIndex];
    }
  }

  variance(arr) {
    const avgX = this.mean(arr);
    return (
      arr.reduce((sum, x) => sum + Math.pow(x - avgX, 2), 0) / (arr.length - 1)
    );
  }

  covariance(x, y) {
    const meanX = this.mean(x);
    const meanY = this.mean(y);

    return (
      x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0) /
      (x.length - 1)
    );
  }

  calculateOptimalTheta(prePeriodData, experimentData) {
    const covXY = this.covariance(prePeriodData, experimentData);
    const varX = this.variance(prePeriodData);

    return isNaN(covXY / varX) ? 0 : covXY / varX;
  }
}
