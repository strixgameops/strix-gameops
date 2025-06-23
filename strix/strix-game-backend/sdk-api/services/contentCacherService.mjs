import Redis from "ioredis";
import { AnalyticsEvents } from "../../models/analyticsevents.js";
import { PWtemplates } from "../../models/PWtemplates.js";
import { PWplayers } from "../../models/PWplayers.js";
import { OffersModel as Offers } from "../../models/offersModel.js";
import { Studio } from "../../models/studioModel.js";
import { NodeModel } from "../../models/nodeModel.js";
import { CookedContent } from "../../models/cookedContent.js";
import { Leaderboards } from "../../models/leaderboardsModel.js";
import { LeaderboardStates } from "../../models/leaderboardsStateModel.js";
import { GameEvents } from "../../models/gameEvents.js";
import { promisify } from "util";
import { fcmDevices } from "../../models/fcm.js";
import axios from "axios";

import mongoose from "mongoose";

import {
  currencyConverter,
  currencyConverterFallback,
} from "../utils/exchangeRates.cjs";
import { Segments } from "../../models/segmentsModel.js";
import { Flows } from "../../models/flows.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import dotenv from "dotenv";
import { ASKUModel } from "../../models/AskuAssociations.js";
import { DeploymentCatalog } from "../../models/deploymentCatalog.js";
import { BalanceModelSegments } from "../../models/balanceModelSegments.js";
dayjs.extend(utc);

dotenv.config();

export class CacherService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;

    this.localCache = {};
    this.localCacheExpirations = {};
    this.localCacheExpirationAttempts = {};
    this.dbConnection = null;

    this.cachedFlows = {};
    this.cachedFlowNodes = {};
  }

  async initialize() {
    this.utilityService = this.moduleContainer.get("utility");
    this.metricsService = this.moduleContainer.get("metrics");
    this.databaseTablesService = this.moduleContainer.get("databaseTables");
    this.databaseService = this.moduleContainer.get("database");

    try {
      await this.connectToDatabase();
      if (!this.dbConnection)
        throw new Error("Caching DB connection is not established");
    } catch (error) {
      console.error("Error connecting to caching DB:", error);
    }

    // Start cleanup intervals
    this.startCleanupInterval();

    // Start sync processes if this is the cacher role
    if (
      process.env.SERVER_ROLE === "cacher" ||
      process.env.SERVER_ROLE === "development"
    ) {
      this.startSyncProcess();
    }
  }

  checkDBConnection() {
    return this.dbConnection;
  }

  async connectToDatabase() {
    try {
      if (process.env.REDIS_ENABLED === "true") {
        let redisClient;
        if (process.env.REDIS_SENTINEL_MODE === "true") {
          redisClient = new Redis({
            sentinels: [
              {
                host: process.env.REDIS_SENTINELS_SERVICE,
                port: process.env.REDIS_SENTINELS_SERVICE_PORT,
              },
            ],
            name: process.env.REDIS_MASTER_NAME,
            password: process.env.REDIS_PASSWORD,
            keyPrefix: `${process.env.REDIS_APPLICATION_GUID}:`,
          });
        } else {
          redisClient = new Redis({
            port: process.env.REDIS_PORT,
            host: process.env.REDIS_HOST,
            password: process.env.REDIS_PASSWORD,
            keyPrefix: `${process.env.REDIS_APPLICATION_GUID}:`,
          });
        }
        await redisClient.ping();
        console.log("Connected to Redis");
        this.dbConnection = redisClient;
      } else {
        throw new Error("Redis is disabled");
      }
    } catch (err) {
      console.error("Error connecting to Redis:", err);
      console.log("Switching to MongoDB...");

      try {
        await mongoose.connect(process.env.MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        console.log("Connected to MongoDB");
        this.dbConnection = mongoose.connection;
      } catch (mongoErr) {
        console.error("Error connecting to MongoDB:", mongoErr);
        this.dbConnection = null;
      }
    }

    return this.dbConnection;
  }

  startCleanupInterval() {
    setInterval(() => {
      this.removeExpiredKeys();
    }, 1000);
  }

  startSyncProcess() {
    const intervalMs =
      parseInt(process.env.CACHER_SAVE_CYCLE_INTERVAL, 10) * 1000;
    setInterval(async () => {
      try {
        const isConnected = await this.databaseService.checkPGConnection();
        if (isConnected) {
          await this.saveCachedInventoriesToPersistent();
          await this.saveCachedLeaderboardsToPersistent();
          await this.massLeaderboardRecalculation();
        }
      } catch (err) {
        console.error("Error in sync process:", err);
      }
    }, intervalMs);
  }

  // Local cache manager methods
  removeExpiredKeys() {
    const now = dayjs.utc();
    for (const key in this.localCacheExpirations) {
      if (dayjs.utc(this.localCacheExpirations[key]).isBefore(now)) {
        delete this.localCacheExpirations[key];
        delete this.localCache[key];
      }
    }
  }

  resetLocalCacheExpirationKey(key) {
    if (!this.localCacheExpirationAttempts[key]) {
      this.localCacheExpirationAttempts[key] = 0;
    } else {
      this.localCacheExpirationAttempts[key] =
        this.localCacheExpirationAttempts[key] + 1;
    }

    // Prevent backend from caching values forever.
    // Hard clear local cache here.
    if (this.localCacheExpirationAttempts[key] < 100) {
      this.localCacheExpirations[key] = dayjs
        .utc()
        .add(60, "second")
        .toISOString();
    } else {
      delete this.localCache[key];
      delete this.localCacheExpirations[key];
    }
  }

  async tryGetCache(cacheKey, useLocalCache = true) {
    try {
      let result = null;
      if (useLocalCache) {
        result = JSON.parse(this.localCache[cacheKey]);
      }
      if (!result) {
        if (this.dbConnection) {
          result = await this.dbConnection.get(cacheKey);
          result = JSON.parse(result);
        }
      }
      this.resetLocalCacheExpirationKey(cacheKey);
      return result;
    } catch (error) {
      return null;
    }
  }

  async trySetCache(cacheKey, object, useLocalCache = true, expiration = 7200) {
    try {
      if (this.dbConnection) {
        if (expiration === 0) {
          await this.dbConnection.set(cacheKey, JSON.stringify(object));
        } else {
          await this.dbConnection.set(
            cacheKey,
            JSON.stringify(object),
            "EX",
            expiration
          );
        }
      }
      if (useLocalCache) {
        this.localCache[cacheKey] = JSON.stringify(object);
      }
      this.resetLocalCacheExpirationKey(cacheKey);
    } catch (error) {
      console.error(error);
    }
  }

  async setKeyIsDirty(table, key, isDirty) {
    try {
      if (this.dbConnection) {
        if (isDirty) {
          await this.dbConnection.sadd(`dirty:${table}`, key);
        } else {
          await this.dbConnection.srem(`dirty:${table}`, key);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  async tryDeleteCache(cacheKey) {
    if (this.dbConnection && this.dbConnection.del) {
      await this.dbConnection.del(cacheKey);
    }
    delete this.localCache[cacheKey];
    delete this.localCacheExpirations[cacheKey];
  }

  async LIFOpushAnalyticsEvent(gameID, build, headers, eventObj) {
    try {
      // LIFO implementation to store last N analytics events.
      // We later use it from web-backend to display recent incoming events.
      if (this.dbConnection) {
        const cacheKey = `${gameID}:${build}:recentAnalyticsEvents:${eventObj.type}`;

        await this.dbConnection.lpush(
          cacheKey,
          JSON.stringify({ headers, event: eventObj })
        );
        await this.dbConnection.ltrim(cacheKey, 0, 99);
        await this.dbConnection.expire(cacheKey, 72000);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async cacheContentTable(gameID, tableName, build, segmentID) {
    try {
      const cacheKey = `${gameID}:${build}:contentCache:${tableName}:${segmentID}`;
      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        let doc = await CookedContent.findOne({
          gameID: gameID,
          type: tableName,
          branch: build,
          segmentID: segmentID,
        }).lean();
        if (!doc) {
          // should only be null when we're recaching all cooked contents
          // and when we just iterate through every possible segmentID.

          // Just in case, fetch "everyone" config as a fallback
          doc = await CookedContent.findOne({
            gameID: gameID,
            type: tableName,
            branch: build,
            segmentID: "everyone",
          }).lean();
        }
        if (!doc) {
          // No content
          doc = {};
          doc.data = "[]";
        }
        result = JSON.parse(doc.data);
        await this.trySetCache(cacheKey, result);
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error("Error getting table to contentCache:", error);
      return {};
    }
  }

  async getCurrentDeploymentVersions(gameID, environment) {
    const cacheKey = `${gameID}:${environment}:deploymentCatalog`;

    try {
      let result = await this.tryGetCache(cacheKey);
      if (!result) {
        result = await DeploymentCatalog.findOne({ gameID }).lean();
        if (result) {
          result.environments.forEach((env) => {
            this.trySetCache(
              `${gameID}:${env.name}:deploymentCatalog`,
              env.deployments,
              false,
              10
            );
          });
          result = result.environments.find(
            (env) => env.name === environment
          ).deployments;
        } else {
          result = null;
        }
      }

      return result;
    } catch (error) {
      console.error("Error getting cached deployment versions:", error);
      return {};
    }
  }

  async getCachedContent(gameID, tableName, build, segmentID) {
    const cacheKey = `${gameID}:${build}:contentCache:${tableName}:${segmentID}`;

    try {
      let content = await this.tryGetCache(cacheKey);
      if (!content) {
        content = await this.cacheContentTable(
          gameID,
          tableName,
          build,
          segmentID
        );
        await this.trySetCache(cacheKey, content);
      }
      return content;
    } catch (error) {
      console.error("Error getting cached content:", error);
      return {};
    }
  }

  async getCachedBalanceModelSegments(gameID, build) {
    const cacheKey = `${gameID}:${build}:balanceModelSegments`;

    try {
      let result = await this.tryGetCache(cacheKey);
      if (!result) {
        result = await BalanceModelSegments.find({
          gameID: gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(build),
        }).lean();
        if (result) {
          await this.trySetCache(cacheKey, result);
        }
      }
      return result;
    } catch (error) {
      console.error("Error getting cached balance model segments:", error);
      return {};
    }
  }

  async getClientCoordinates(clientIP) {
    const cacheKey = `geoCache:city:${clientIP}`;
    try {
      let result = await this.tryGetCache(cacheKey);
      if (!result) {
        const response = await axios.post(process.env.GEOCODER_API_URL, {
          secret: process.env.ENCRYPT_SECRET_KEY,
          ip: clientIP,
          type: "city",
        });
        if (response.success) {
          result = response.data;
        } else {
          // console.warn("Could not get client coords from GeoCoder");
          return { latitude: 0, longitude: 0 };
        }
      }
      const { latitude, longitude } = result.location;
      return { latitude, longitude };
    } catch (err) {
      console.error(err);
      return { latitude: 0, longitude: 0 };
    }
  }

  async getClientCountry(clientIP) {
    const cacheKey = `geoCache:country:${clientIP}`;
    try {
      let result = await this.tryGetCache(cacheKey);
      if (!result) {
        const response = await axios.post(process.env.GEOCODER_API_URL, {
          secret: process.env.ENCRYPT_SECRET_KEY,
          ip: clientIP,
          type: "country",
        });
        if (response.success) {
          result = response.data;
        }
      }
      if (
        result &&
        result.country &&
        result.country.names &&
        result.country.names.en
      ) {
        result = result.country.names.en;
      } else {
        console.warn(
          "getClientCountry: Error fetching client country. Result is:",
          result
        );
        result = "Unknown";
      }
      return result;
    } catch (error) {
      console.error("Error getting client country:", error);
      return null;
    }
  }

  async removeCachedAnalyticEvent(gameID, branch, eventCodeName) {
    const cacheKey = `${gameID}:${branch}:cachedAnalyticsEvents:${eventCodeName}`;
    await this.tryDeleteCache(cacheKey);
  }

  async getCachedAnalyticEvent(gameID, branch, eventCodeName) {
    try {
      const cacheKey = `${gameID}:${branch}:cachedAnalyticsEvents:${eventCodeName}`;
      let result = await this.tryGetCache(cacheKey);
      if (!result) {
        result = await AnalyticsEvents.findOne({
          gameID: gameID,
          eventCodeName: eventCodeName,
          $or: [{ removed: false }, { removed: { $exists: false } }],
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
        });
        if (!result) {
          return null;
        }
        await this.trySetCache(cacheKey, result);
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getCachedAnalyticsTemplatesByEventID(gameID, branch, eventID) {
    try {
      const cacheKey = `${gameID}:${branch}:cachedAnalyticsTemplatesForEvents:${eventID}`;
      let result = await this.tryGetCache(cacheKey);
      if (!result) {
        const foundTemplates = await PWtemplates.findOne({
          gameID: gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
          templateAnalyticEventID: eventID,
        }).lean();

        result = foundTemplates;

        await this.trySetCache(cacheKey, result);
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error("Error finding analytics templates:", error);
      return [];
    }
  }

  async getCachedTemplateByID(gameID, branch, templateID) {
    try {
      const cacheKey = `${gameID}:${branch}:cachedTemplates:${templateID}`;
      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        result = await PWtemplates.findOne({
          gameID: gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
          templateID: templateID,
        }).lean();

        if (result) {
          await this.trySetCache(cacheKey, result);
          return result;
        } else {
          return null;
        }
      } else {
        return result;
      }
    } catch (error) {
      throw error;
    }
  }

  async getCachedExchangeRate(currency, amount) {
    try {
      const cacheKey = `cachedExchangeRate:${currency}`;
      let rate1 = await this.tryGetCache(cacheKey);
      if (!rate1) {
        rate1 = await currencyConverter
          .from("USD")
          .to(currency)
          .amount(1)
          .convert();
      }
      let rate2 = await this.tryGetCache(cacheKey);
      if (!rate2) {
        rate2 = await currencyConverterFallback
          .from("USD")
          .to(currency)
          .amount(1)
          .convert();
      }

      let resultRate = rate1;
      function getRate() {
        function isInt(n) {
          return Number(n) === n && n % 1 === 0;
        }
        if (rate1 !== rate2) {
          if (!isInt(rate1)) {
            resultRate = rate1;
            return;
          }
          if (!isInt(rate2)) {
            resultRate = rate2;
            return;
          }
        }
      }
      getRate();

      const amountInUSD = amount / resultRate;

      return amountInUSD;
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      return null;
    }
  }

  async getCachedOfferIDByASKU(gameID, branch, asku) {
    try {
      const cacheKey = `${gameID}:${branch}:cachedOffersByAsku:${asku}`;
      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        result = await ASKUModel.findOne({
          gameID: gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
          associations: { $elemMatch: { sku: asku } },
        });
        result = result.associations.find((a) => a.sku === asku).offerID;
        await this.trySetCache(cacheKey, result);
        return result;
      } else {
        return result;
      }
    } catch (err) {
      console.error("Error fetching offer ID by ASKU:", err);
      return null;
    }
  }

  async getCachedStudioIDByGameID(gameID) {
    try {
      const cacheKey = `cachedStudioIDByGameID:${gameID}`;
      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        const studio = await Studio.findOne(
          {
            games: { $elemMatch: { gameID: gameID } },
          },
          { studioID: 1 }
        ).lean();
        if (!studio) {
          return null;
        }
        result = studio.studioID;
        await this.trySetCache(cacheKey, result);
        return result;
      } else {
        return result;
      }
    } catch (err) {
      console.error("Error fetching studio ID by game ID:", err);
      return null;
    }
  }

  async getCachedEntityByNodeID(gameID, branch, nodeID, returnFullObject) {
    let suffix = returnFullObject ? "fullObject" : "shortObject";
    const cacheKey = `${gameID}:${branch}:cachedEntityNode:${suffix}:${nodeID}`;
    let result = await this.tryGetCache(cacheKey);

    if (!result) {
      let matchingNode = await NodeModel.findOne(
        {
          gameID: gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
          nodeID: nodeID,
        },
        {
          "entityBasic.entityID": 1,
          name: 1,
          nodeID: 1,
        }
      ).lean();

      if (!matchingNode) {
        return null;
      }
      result = matchingNode;
      await this.trySetCache(cacheKey, result);
      return returnFullObject ? result : result.nodeID;
    } else {
      return returnFullObject ? result : result.nodeID;
    }
  }

  async getCachedCurrencyEntityByID(
    gameID,
    branch,
    entityID,
    returnFullObject
  ) {
    let suffix = returnFullObject ? "fullObject" : "shortObject";
    const cacheKey = `${gameID}:${branch}:cachedCurrencyEntity:${suffix}:${entityID}`;
    let result = await this.tryGetCache(cacheKey);

    if (!result) {
      let matchingNode = await NodeModel.findOne(
        {
          gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
          "entityBasic.entityID": entityID,
          $or: [{ removed: false }, { removed: { $exists: false } }],
        },
        { "entityBasic.entityID": 1, nodeID: 1, removed: 1 }
      );

      if (matchingNode) {
        matchingNode = {
          nodeID: matchingNode.nodeID,
          entityID: matchingNode.entityBasic.entityID,
        };
      } else {
        return null;
      }
      result = matchingNode;
      await this.trySetCache(cacheKey, result);
      return returnFullObject ? result : result.nodeID;
    } else {
      return returnFullObject ? result : result.nodeID;
    }
  }

  async getCachedLeaderboardByCodename(gameID, branch, environment, codename) {
    try {
      const cacheKey = `${gameID}:${branch}:${environment}:cachedLeaderboardByCodename:${codename}`;
      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        result = await Leaderboards.findOne({
          gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
          codename,
        }).lean();
        if (!result) {
          return null;
        }
        await this.trySetCache(cacheKey, result);
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getCachedLeaderboardByTimeframeKey(gameID, branch, timeframeKey) {
    try {
      const cacheKey = `${gameID}:${branch}:getCachedLeaderboardByTimeframeKey:${timeframeKey}`;
      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        result = await Leaderboards.findOne({
          gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
          timeframes: { $elemMatch: { key: timeframeKey } },
        }).lean();
        if (!result) {
          return null;
        }
        await this.trySetCache(cacheKey, result);
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getCachedLeaderboardsByGame(gameID, branch) {
    try {
      const cacheKey = `${gameID}:${branch}:cachedLeaderboards`;
      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        result = await Leaderboards.find({
          gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
        }).lean();
        if (!result) {
          return null;
        }
        await this.trySetCache(cacheKey, result);
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getCachedPlayerLeaderboardTimeframeValue(
    tableModel,
    gameID,
    branch,
    environment,
    timeframeKey,
    clientID,
    elementID,
    // Params for new doc creation
    targetValue,
    additionalValues
  ) {
    try {
      const cacheKey = `${gameID}:${branch}:${environment}:cachedLeaderboardTimeframes:${timeframeKey}:${clientID}:${elementID}`;
      let result = await this.tryGetCache(cacheKey, false);

      if (!result) {
        const [doc, created] = await tableModel.findOrCreate({
          where: {
            gameID: gameID,
            environment: environment,
            timeframeKey: timeframeKey,
            clientID: clientID,
          },
          defaults: {
            targetValue: { elementID: targetValue, elementValue: 0 },
            additionalValues: additionalValues.map((v) => ({
              elementID: v,
              elementValue: "",
            })),
          },
        });

        result = targetValue === elementID ? 0 : "";

        await this.trySetCache(cacheKey, result, false);
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async saveCachedPlayerLeaderboardTimeframeValue(
    gameID,
    branch,
    environment,
    timeframeKey,
    clientID,
    elementID,
    newElementValue
  ) {
    try {
      const cacheKey = `${gameID}:${branch}:${environment}:cachedLeaderboardTimeframes:${timeframeKey}:${clientID}:${elementID}`;
      await this.trySetCache(cacheKey, newElementValue, false);
      await this.setKeyIsDirty("cachedLeaderboardTimeframes", cacheKey, true);
    } catch (error) {
      console.error(error);
    }
  }

  async getCachedLeaderboardTop(
    gameID,
    branch,
    environment,
    leaderboardCodename,
    timeframeKey,
    clientID,
    groupByElementID,
    groupByElementValue
  ) {
    try {
      const cacheKey = `${gameID}:${branch}:${environment}:cachedLeaderboardTop:${timeframeKey}`;
      const cacheKey_TopFull = `${gameID}:${branch}:${environment}:cachedLeaderboardTopFull:${timeframeKey}`;
      const cacheKey_currentClient = `${gameID}:${branch}:${environment}:cachedLeaderboardTopClient:${timeframeKey}:${clientID}`;

      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        const lb = await this.getCachedLeaderboardByCodename(
          gameID,
          branch,
          environment,
          leaderboardCodename
        );

        let state;

        if (lb.alternativeCalculation) {
          state = await LeaderboardStates.findOne({
            gameID,
            branch,
            timeframeKey,
          }).lean();
        } else {
          const t = await this.databaseTablesService.getLeaderboardTable(
            gameID
          );
          state = await this.databaseService.PGquery(`
            SELECT 
              "clientID",
              "targetValue",
              "additionalValues"
            FROM 
              "${t.tableName}"
            WHERE 
              "gameID" = '${gameID}' AND 
              "branch" = '${branch}' AND 
              "environment" = '${environment}' AND 
              "timeframeKey" = '${timeframeKey}'
              ${
                groupByElementID && groupByElementValue
                  ? `
                AND EXISTS (
                  SELECT 1 
                  FROM unnest("additionalValues") AS av
                  WHERE av->>'elementID' = '${groupByElementID}' 
                    AND av->>'elementValue' = '${groupByElementValue}'
                )
              `
                  : ""
              }
            ORDER BY 
              "targetValue"->>'elementValue' DESC
            LIMIT ${lb.topLength};
          `);
        }

        if (!state) {
          return null;
        }

        if (lb.alternativeCalculation) {
          // Full state
          state = state.top;
        }
        await this.trySetCache(cacheKey_TopFull, state);

        function trimObject(obj, limit) {
          return Object.fromEntries(Object.entries(obj).slice(0, limit));
        }
        state = trimObject(state, lb.topLength);

        state = Object.entries(state).map(([key, value], index) => {
          return {
            number: index,
            scoreElement: value.targetValue,
            additionalElements: value.additionalValues,
          };
        });

        await this.trySetCache(cacheKey, state);
        let topFull = await this.tryGetCache(cacheKey_TopFull);
        let currentClient = await this.makeCurrentClient(
          topFull,
          lb,
          gameID,
          branch,
          environment,
          timeframeKey,
          clientID,
          cacheKey_currentClient
        );

        state.push(currentClient);
        return state;
      } else {
        let state = [...result];

        const lb = await this.getCachedLeaderboardByCodename(
          gameID,
          branch,
          environment,
          leaderboardCodename
        );

        let topFull = await this.tryGetCache(cacheKey_TopFull);
        let currentClient = await this.makeCurrentClient(
          topFull,
          lb,
          gameID,
          branch,
          environment,
          timeframeKey,
          clientID,
          cacheKey_currentClient
        );

        state.push(currentClient);
        return state;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async makeCurrentClient(
    data,
    lb,
    gameID,
    branch,
    environment,
    timeframeKey,
    clientID,
    cacheKey_currentClient
  ) {
    let currentClient = undefined;
    if (lb.alternativeCalculation) {
      currentClient = {
        ...data[clientID],
      };
    } else {
      const t = await this.databaseTablesService.getLeaderboardTable(gameID);
      currentClient = await this.tryGetCache(cacheKey_currentClient);
      if (!currentClient) {
        currentClient = await this.databaseService.PGquery(`
          SELECT 
          "targetValue",
          "additionalValues"
          FROM 
          "${t.tableName}"
          WHERE 
          "gameID" = '${gameID}' AND 
          "branch" = '${branch}' AND
          "environment" = '${environment}' AND 
          "timeframeKey" = '${timeframeKey}' AND
          "clientID" = '${clientID}';
          `);
        await this.trySetCache(cacheKey_currentClient, currentClient);
      }
      if (currentClient) {
        currentClient = currentClient[0];
      }
      if (!currentClient) {
        // If client doesnt exist at all, make a blank obj and code will figure it out
        currentClient = {};
      }
    }

    let elementIDs = [];

    elementIDs = [...lb.additionalElementIDs];
    if (lb.alternativeCalculation) {
      elementIDs.push(lb.aggregateElementID);
    }

    // Try to find values for the current player to show in leaderboard
    let values = await Promise.all(
      elementIDs.map(async (id) => ({
        elementID: id,
        elementValue: await this.getElementValue(
          { gameID: gameID },
          branch,
          environment,
          clientID,
          id
        ),
      }))
    );

    // If appended player has no values for leaderboard's elements,
    // return default values if any, and if alternative calculation is enabled.
    //
    values = await Promise.all(
      values.map(async (v) => {
        if (!v.elementValue) {
          if (lb.alternativeCalculation) {
            const queryTemplate = await this.getCachedTemplateByID(
              gameID,
              branch,
              v.elementID
            );
            const defValue = this.formatTemplateValueAsType(
              queryTemplate.templateDefaultValue,
              queryTemplate.templateType
            );

            v.elementValue = defValue;
          } else {
            if (lb.aggregateElementID === v.elementID) {
              v.elementValue = 0;
            } else {
              v.elementValue = "";
            }
          }
        }
        return v;
      })
    );

    if (Object.keys(currentClient).length == 0) {
      currentClient = {
        number: -1,
        additionalElements: values.filter(
          (e) => e.elementID !== lb.aggregateElementID
        ),
      };

      if (lb.alternativeCalculation) {
        currentClient.scoreElement = {
          elementID: values.find((e) => e.elementID === lb.aggregateElementID)
            .elementID,
          elementValue: values.find(
            (e) => e.elementID === lb.aggregateElementID
          ).elementValue,
        };
      } else {
        currentClient.scoreElement = {
          elementID: lb.aggregateElementID,
          elementValue: 0,
        };
      }
    } else {
      currentClient.scoreElement = currentClient.targetValue;
      currentClient.additionalElements = values.filter(
        (e) => e.elementID !== lb.aggregateElementID
      );
      delete currentClient.additionalValues;
      delete currentClient.targetValue;
    }

    currentClient.number = Object.keys(data).findIndex(
      (key) => key === clientID
    );
    return currentClient;
  }

  async getCachedInventory(gameID, branch, environment, clientID) {
    try {
      const inventoryTable = await this.databaseTablesService.getInventoryTable(
        gameID
      );
      if (!inventoryTable) {
        console.error(
          `getCachedInventory: Inventory table not found for game ${gameID}`
        );
        return null;
      }
      let inv;
      const redisKey = `${gameID}:${branch}:${environment}:inventory:${clientID}`;
      if (this.dbConnection) {
        inv = await this.dbConnection.get(redisKey);
        if (inv) {
          return JSON.parse(inv);
        }
      }

      // If we've got null from redis cache
      if (!inv) {
        inv = await inventoryTable.findOne({
          where: {
            gameID: gameID,
            branch: branch,
            environment: environment,
            clientID: clientID,
          },
        });
        if (inv) {
          await this.trySetCache(redisKey, inv, false, 0);
        }
        return inv;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async saveInventory(gameID, branch, environment, clientID, inventory) {
    try {
      const inventoryTable = await this.databaseTablesService.getInventoryTable(
        gameID
      );
      if (!inventoryTable) {
        console.error(
          `saveInventory: Inventory table not found for game ${gameID}`
        );
        return null;
      }
      const redisKey_inventory = `${gameID}:${branch}:${environment}:inventory:${clientID}`;
      if (this.dbConnection) {
        await this.trySetCache(redisKey_inventory, inventory, false, 0);
        await this.setKeyIsDirty("inventory", redisKey_inventory, true);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async createNewInventory(gameID, newInventory) {
    try {
      const inventory = await this.databaseTablesService.getInventoryTable(
        gameID
      );
      await inventory.create(newInventory);
    } catch (error) {
      console.error(error);
    }
  }

  async getCachedSegment(gameID, branch, segmentID) {
    try {
      const cacheKey = `${gameID}:${branch}:cachedSegments:${segmentID}`;
      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        let matchingSegment = await Segments.findOne({
          gameID: gameID,
          branch: this.utilityService.getBranchWithWorkingSuffix(branch),
          segmentID: segmentID,
        }).lean();
        await this.trySetCache(cacheKey, matchingSegment);
        return matchingSegment;
      } else {
        return result;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getCachedSegmentsByTemplateID(gameID, branch, templateID) {
    try {
      const cacheKey = `${gameID}:${branch}:cachedSegmentsByUsedTemplateID:${templateID}`;
      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        const segments = await Segments.find({
          gameID: this.utilityService.getDemoGameID(gameID),
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
          usedTemplateIDs: templateID,
        }).lean();
        if (segments) {
          await this.trySetCache(cacheKey, segments);
          return segments;
        } else {
          return [];
        }
      } else {
        return result;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getCachedFlow(gameID, branch, flowSid) {
    try {
      const cacheKey = `${gameID}:${branch}:cachedFlows:${flowSid}`;
      let result = await this.tryGetCache(cacheKey);

      if (!result) {
        let matchingFlows = await Flows.findOne({
          gameID: gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
        });
        if (!matchingFlows) {
          return null;
        }

        let flows = [];
        matchingFlows.folders.forEach((folder) => {
          folder.flows.forEach((flow) => {
            if (flow.nodes) {
              this.populateCachedFlowNodes(gameID, branch, flow.nodes);
              flows.push(flow);
            }
          });
        });

        await this.trySetCache(cacheKey, flows);
        return result;
      } else {
        return result;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getCachedFlowNodes(gameID, branch, nodeSid) {
    const cacheKey = `${gameID}:${branch}:cachedFlowNodes`;
    let result = await this.tryGetCache(cacheKey);
    if (result) {
      return result.find((e) => e.sid === nodeSid);
    } else {
      return undefined;
    }
  }

  populateCachedFlowNodes(gameID, branch, rootNode) {
    const cacheKey = `${gameID}:${branch}:cachedFlowNodes`;

    let arr = [];
    function traverseFlowNodes(node) {
      arr.push({ ...node, subnodes: undefined });

      if (node.subnodes && node.subnodes.length > 0) {
        node.subnodes.forEach((subnode) => {
          traverseFlowNodes(subnode);
        });
      }
    }
    traverseFlowNodes(rootNode);
    this.trySetCache(cacheKey, arr);
  }

  async getContentChecksum(gameID, branch, tableName, segmentID) {
    const cacheKey = `${gameID}:${branch}:cachedContentChecksums:${tableName}:${segmentID}`;
    let result = await this.tryGetCache(cacheKey);

    if (!result) {
      const content = await this.getCachedContent(
        gameID,
        tableName,
        branch,
        segmentID
      );
      let totalChecksum = 0;
      if (Array.isArray(content)) {
        content.forEach((item) => {
          totalChecksum += item.checksum;
        });
      }
      result = totalChecksum;
      await this.trySetCache(cacheKey, totalChecksum);
      return result;
    } else {
      return result;
    }
  }

  async getCachedClientFCMToken(gameID, branch, environment, clientID) {
    const cacheKey = `${gameID}:${branch}:${environment}:deviceCache:${clientID}`;
    let result = await this.tryGetCache(cacheKey);

    if (!result) {
      const userObj = await fcmDevices.findOne(
        {
          gameID,
          environment,
          clientID,
        },
        { token: 1 }
      );
      if (userObj) {
        result = userObj.token;
        await this.trySetCache(cacheKey, result);
      }
      return result;
    } else {
      return result;
    }
  }

  async setCachedClientFCMToken(
    gameID,
    branch,
    environment,
    clientID,
    token,
    lastUpdate
  ) {
    const cacheKey = `${gameID}:${branch}:${environment}:deviceCache:${clientID}`;
    await this.trySetCache(cacheKey, { token, lastUpdate });
  }

  async assignNamesToAnalyticsEvents(gameID, branchName, analyticsTemplates) {
    try {
      // Iterate through analyticsTemplates and update templateVisualEventName and templateVisualValueName
      if (analyticsTemplates && analyticsTemplates.length > 0) {
        const updatedTemplates = await Promise.all(
          analyticsTemplates.map(async (template) => {
            const event = await AnalyticsEvents.findOne({
              gameID: gameID,
              branch:
                this.utilityService.getBranchWithReferenceSuffix(branchName),
              eventID: template.templateAnalyticEventID,
            }).lean();

            if (event) {
              const targetEvent = event;
              const targetEventValue = targetEvent.values.find(
                (value) =>
                  value.uniqueID === template.templateEventTargetValueId
              );

              // Create a new object with updated fields
              const updatedTemplate = {
                ...template.toJSON(),
                templateVisualEventName:
                  targetEvent?.eventName || "Event not found",
                templateVisualValueName:
                  targetEventValue?.valueName || "Value not found",
              };

              return updatedTemplate;
            } else {
              // If the document is not found, return the original template
              return template;
            }
          })
        );

        return updatedTemplates;
      }
    } catch (error) {
      throw error;
    }
  }

  async getCachedAllWarehouseTemplates(gameID, branch) {
    try {
      const cacheKey = `${gameID}:${branch}:cachedAllWarehouseTemplates`;
      let result = await this.tryGetCache(cacheKey);
      if (!result) {
        const templates = await PWtemplates.find({
          gameID,
          branch: this.utilityService.getBranchWithReferenceSuffix(branch),
        });

        // Assign names to analytics events
        const updatedAnalyticsTemplates =
          await this.assignNamesToAnalyticsEvents(
            gameID,
            branch,
            templates.filter((t) => t.templateType === "analytics")
          );

        // Update the templates object with updated analytics templates
        const updatedTemplates = {
          analytics: updatedAnalyticsTemplates,
          statistics: templates.filter((t) => t.templateType !== "analytics"),
        };

        await this.trySetCache(cacheKey, updatedTemplates);
        return updatedTemplates;
      } else {
        return result;
      }
    } catch (error) {
      console.error(error);
    }
  }

  async resetAllContentCaches(gameID, environment) {
    //
    // ONLY ROLE "CACHER" CAN CALL THIS!
    //
    const client = this.dbConnection;
    const scanAsync = promisify(client.scan).bind(client);
    const delAsync = promisify(client.del).bind(client);

    try {
      const pattern = `${process.env.REDIS_APPLICATION_GUID}:${gameID}*`;
      let cursor = "0";

      do {
        const [nextCursor, keys] = await scanAsync(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          for (const key of keys) {
            // Removing "public:" or "local:" from the start of key names since Redis
            // is already configured with that in mind
            const rg = new RegExp(`^${process.env.REDIS_APPLICATION_GUID}:`);
            let tK = key.replace(rg, "");

            const result = await delAsync(tK);
            if (result === 1) {
              this.utilityService.log(`Deleted key: ${tK}`);
            } else {
              console.warn(`Failed to delete key: ${tK}`);
            }
          }
        }
      } while (cursor !== "0");

      // console.log("All Redis keys deleted.");
    } catch (error) {
      console.error("Error while deleting keys:", error);
    }
  }

  async getEventProcessedStage(gameID, branch, eventUniqueID, stageID) {
    const cacheKey = `eventsProcessingStages:${gameID}:${branch}:${eventUniqueID}:${stageID}`;
    let result = await this.tryGetCache(cacheKey, false);

    if (!result) {
      return false;
    } else {
      return result?.stage;
    }
  }

  async setEventProcessedStage(
    gameID,
    branch,
    eventUniqueID,
    stageID, // templateID, the custom name of stage, or other ID of a thing that must be processed with that event
    stage
  ) {
    const cacheKey = `eventsProcessingStages:${gameID}:${branch}:${eventUniqueID}:${stageID}`;
    await this.trySetCache(cacheKey, { stage: stage }, false);
  }

  async setEventProcessedFully(gameID, branch, eventUniqueID) {
    const cacheKey = `eventsProcessingStages:${gameID}:${branch}:${eventUniqueID}`;
    await this.tryDeleteCache(cacheKey);
  }

  // Helper methods that might be used by warehouse service
  getElementValue(gameObj, build, environment, device, elementID) {
    // This would delegate to warehouse service's getElementValue method
    const warehouseService = this.moduleContainer.get("warehouse");
    return warehouseService.getElementValue(
      gameObj,
      build,
      environment,
      device,
      elementID
    );
  }

  formatTemplateValueAsType(templateValue, templateType) {
    // This would delegate to warehouse service's formatTemplateValueAsType method
    const warehouseService = this.moduleContainer.get("warehouse");
    return warehouseService.formatTemplateValueAsType(
      templateValue,
      templateType
    );
  }

  // Persistent save methods
  async persistentSaveInventory(
    gameID,
    branch,
    environment,
    clientID,
    newInventory
  ) {
    const inventoryTable = await this.databaseTablesService.getInventoryTable(
      gameID
    );
    // Use findOrCreate to get existing row (or create if not present)
    const [inventory, created] = await inventoryTable.findOrCreate({
      where: { gameID, branch, environment, clientID },
      defaults: { items: newInventory.items },
    });

    if (!created) {
      // Compare current items to new ones to avoid duplicate writes
      const current = JSON.stringify(inventory.items);
      const updated = JSON.stringify(newInventory.items);
      if (current !== updated) {
        await inventoryTable.update(
          { items: newInventory.items },
          { where: { gameID, branch, environment, clientID } }
        );
      }
    }
  }

  async saveCachedInventoriesToPersistent() {
    const client = this.dbConnection;
    try {
      // Get all keys that are marked as dirty
      const redisKey_dirtyInventories = `dirty:inventory`;
      const dirtyKeys = await client.smembers(redisKey_dirtyInventories);
      for (const key of dirtyKeys) {
        try {
          // Assume key is in format "gameID:environment:inventory:clientID"
          const parts = key.split(":");
          if (parts.length < 5) continue;
          const [gameID, branch, environment, , clientID] = parts;
          // Retrieve the payload from Redis
          const inv = await this.getCachedInventory(
            gameID,
            branch,
            environment,
            clientID
          );
          if (inv) {
            // Process only if the payload is dirty
            await this.persistentSaveInventory(
              gameID,
              branch,
              environment,
              clientID,
              inv
            );
            // Remove the key from the dirty set to avoid reprocessing
            await this.setKeyIsDirty("inventory", key, false);
          }
        } catch (keyError) {
          console.error("Error processing inventory key:", key, keyError);
        }
      }
    } catch (error) {
      console.error("Error while retrieving dirty inventory keys:", error);
    }
  }

  async persistentSavePlayerLeaderboard(
    gameID,
    branch,
    environment,
    timeframeKey,
    clientID,
    elementID,
    value
  ) {
    try {
      const table = await this.databaseTablesService.getLeaderboardTable(
        gameID
      );
      const lb = await this.getCachedLeaderboardByTimeframeKey(
        gameID,
        branch,
        timeframeKey
      );
      if (!lb) return;

      const t = table.tableName;
      let sqlQuery;
      if (lb.aggregateElementID !== elementID) {
        // Update additional values only if the new value is distinct.
        sqlQuery = `
          UPDATE "${t}"
          SET "additionalValues" = (
            SELECT ARRAY(
              SELECT CASE
                WHEN value->>'elementID' = '${elementID}'
                THEN jsonb_set(value, '{elementValue}', '"${value}"'::jsonb, true)
                ELSE value
              END
              FROM unnest("additionalValues") AS value
            )
          )
          WHERE "gameID" = '${gameID}' 
            AND "environment" = '${environment}' 
            AND "clientID" = '${clientID}' 
            AND "timeframeKey" = '${timeframeKey}'
            AND EXISTS (
              SELECT 1 FROM unnest("additionalValues") AS value
              WHERE value->>'elementID' = '${elementID}' 
                AND value->>'elementValue' IS DISTINCT FROM '${value}'
            );
        `;
      } else {
        // Update target value only if it has changed.
        sqlQuery = `
          UPDATE "${t}"
          SET "targetValue" = jsonb_set(
            COALESCE("targetValue"::jsonb, '{"elementID": "${elementID}", "elementValue": "${value}"}'::jsonb),
            '{elementValue}',
            '"${value}"'::jsonb,
            true
          )
          WHERE "gameID" = '${gameID}' 
            AND "environment" = '${environment}' 
            AND "clientID" = '${clientID}' 
            AND "timeframeKey" = '${timeframeKey}'
            AND ("targetValue" IS NULL OR "targetValue"->>'elementValue' IS DISTINCT FROM '${value}');
        `;
      }
      await this.databaseService.PGquery(sqlQuery);
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  }

  async saveCachedLeaderboardsToPersistent() {
    const client = this.dbConnection;
    try {
      const redisKey_dirtyLeaderboards = `dirty:cachedLeaderboardTimeframes`;
      let dirtyKeys = await client.smembers(redisKey_dirtyLeaderboards);
      for (const key of dirtyKeys) {
        try {
          // Expected key format: "gameID:branch:cachedLeaderboardTimeframes:timeframeKey:clientID:elementID"
          const parts = key.split(":");
          if (parts.length < 6) continue;
          const [gameID, branch, environment, , tfKey, clientID, elementID] =
            parts;

          const cachedValue = await this.tryGetCache(key, false);
          if (cachedValue !== null && cachedValue !== undefined) {
            await this.persistentSavePlayerLeaderboard(
              gameID,
              branch,
              environment,
              tfKey,
              clientID,
              elementID,
              cachedValue
            );
          }
          // Remove the key from the dirty set to avoid reprocessing
          await this.setKeyIsDirty("cachedLeaderboardTimeframes", key, false);
        } catch (keyError) {
          console.error("Error processing leaderboard key:", key, keyError);
        }
      }
    } catch (error) {
      console.error("Error while processing leaderboard keys:", error);
    }
  }

  async removeCachedLeaderboardTimeframes(timeframeKey) {
    const client = this.dbConnection;
    const scanAsync = promisify(client.scan).bind(client);

    try {
      const pattern = timeframeKey
        ? `${process.env.REDIS_APPLICATION_GUID}:*:*:cachedLeaderboardTimeframes:${timeframeKey}:*`
        : `${process.env.REDIS_APPLICATION_GUID}:*:*:cachedLeaderboardTimeframes:*`;
      let cursor = "0";

      do {
        const [nextCursor, keys] = await scanAsync(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          // Start a pipeline for bulk deletion
          const pipeline = client.pipeline();

          keys.forEach((key) => {
            pipeline.del(key);
          });

          // Execute all delete commands in the pipeline
          const results = await pipeline.exec();

          results.forEach(([err, result], index) => {
            const resultKey = keys[index];
            // if (err) {
            //   console.warn(`Failed to delete key: ${resultKey}`, err);
            // } else if (result === 1) {
            //   this.utilityService.log(`Deleted key: ${resultKey}`);
            // } else {
            //   console.warn(`Key not found or already deleted: ${resultKey}, ${result}, ${err}`);
            // }
          });
        }
      } while (cursor !== "0");
    } catch (error) {
      console.error("Error while deleting keys:", error);
    }
  }

  async recalculateLeaderboards(branch, environment) {
    try {
      const leaderboards = await Leaderboards.find({ branch }, { tops: 0 });

      let gamesTemplates = {};

      let processedTopIDs = [];
      for (let lb of leaderboards) {
        if (!lb.aggregateElementID || lb.aggregateElementID == false) {
          continue;
        }

        if (!lb.timeframes || lb.timeframes.length === 0) {
          continue;
        }

        function getCurrentDateRange(startDate, periodUnitsCount, periodType) {
          const now = dayjs.utc();
          const start = dayjs.utc(startDate).startOf("day");

          // Calculate whole number of periods from the startDate to the current
          const diffUnits = now.diff(start, periodType);
          const periodsPassed = Math.floor(diffUnits / periodUnitsCount);

          // console.log("Start date:", start.toISOString());
          // Get the current timeframe we need to grab data from
          const rangeStart = start.add(
            periodsPassed * periodUnitsCount,
            periodType
          );
          let rangeEnd = undefined;
          switch (periodType) {
            case "hour":
              rangeEnd = rangeStart.endOf("hour");
              break;
            case "day":
              rangeEnd = rangeStart
                .add(periodUnitsCount, periodType)
                .endOf("day");
              break;
            case "month":
              rangeEnd = rangeStart
                .add(periodUnitsCount, periodType)
                .endOf("day");
              break;
            case "week":
              rangeEnd = rangeStart
                .add(periodUnitsCount, periodType)
                .endOf("day");
              break;
          }

          return {
            rangeStart: rangeStart.toISOString(),
            rangeEnd: rangeEnd.toISOString(),
          };
        }

        let templates = undefined;
        if (gamesTemplates[lb.gameID] && gamesTemplates[lb.gameID][lb.branch]) {
          templates = gamesTemplates[lb.gameID][lb.branch];
        } else {
          if (!gamesTemplates[lb.gameID]) {
            gamesTemplates[lb.gameID] = {};
          }
          if (!gamesTemplates[lb.gameID][lb.branch]) {
            gamesTemplates[lb.gameID][lb.branch] =
              await this.getCachedAllWarehouseTemplates(lb.gameID, lb.branch);
          }
          templates = gamesTemplates[lb.gameID][lb.branch];
        }

        if (
          !templates.statistics.some(
            (t) => t.templateID === lb.aggregateElementID
          ) &&
          !templates.analytics.some(
            (t) => t.templateID === lb.aggregateElementID
          )
        ) {
          console.error(
            `Element ${lb.aggregateElementID} wasn't found in any elements of game ${lb.gameID} while recalculating leaderboard! Elements:`,
            JSON.stringify(templates)
          );
          return;
        }

        for (let timeframe of lb.timeframes) {
          const timeframeRange = getCurrentDateRange(
            lb.startDate,
            timeframe.relativeUnitCount,
            timeframe.relativeMode
          );

          const currentState = await LeaderboardStates.findOne(
            { timeframeKey: timeframe.key },
            { lastUpdateTime: 1 }
          );

          if (currentState && currentState.lastUpdateTime) {
            const lastUpdateTimeDiff = Math.abs(
              dayjs
                .utc(currentState.lastUpdateTime)
                .diff(dayjs.utc(), "minutes")
            );
            if (timeframe.relativeMode === "hour") {
              // For hour, we want to update top every 5 mins
              if (lastUpdateTimeDiff >= 5) {
                await this.updateTop(
                  lb.gameID,
                  branch,
                  environment,
                  timeframe.key,
                  timeframeRange
                );
              }
            } else {
              // For other modes, we want to update top every 1 hour
              if (lastUpdateTimeDiff >= 60) {
                await this.updateTop(
                  lb.gameID,
                  branch,
                  environment,
                  timeframe.key,
                  timeframeRange
                );
              }
            }
          } else {
            await this.updateTop(
              lb.gameID,
              branch,
              environment,
              timeframe.key,
              timeframeRange
            );
          }

          processedTopIDs.push(timeframe.key);
        }
      }

      // Remove leaderboard states we don't have timeframe for.
      // (e.g. timeframe/leaderboard got removed)
      await LeaderboardStates.deleteMany({
        timeframeKey: { $nin: processedTopIDs },
      });
      // this.utilityService.log("Recalculated", processedTopIDs.length, "leaderboard timeframes.");
    } catch (error) {
      console.error("Error getting leaderboards:", error);
    }
  }

  async updateTop(gameID, branch, environment, key, timeframeRange) {
    const table = await this.databaseTablesService.getLeaderboardTable(gameID);
    await this.databaseService.PGquery(`
      DELETE FROM "${table.tableName}"
      WHERE
        "gameID" = '${gameID}'
        AND "environment" = '${environment}'
        AND "timeframeKey" = '${key}'
        AND "createdAt" < '${timeframeRange.rangeStart}';
    `);

    // Clear cache
    await this.removeCachedLeaderboardTimeframes(key);

    // Grab all remaining players and make their additionalValues
    let timeframePlayers = await this.databaseService.PGquery(`
      SELECT 
        "clientID"
      FROM 
        "${table.tableName}"
      WHERE 
        "gameID" = '${gameID}' AND 
        "environment" = '${environment}' AND
        "timeframeKey" = '${key}'
      ORDER BY 
        "targetValue"->>'elementValue' DESC;
    `);
    timeframePlayers = new Map(timeframePlayers.map((p) => [p.clientID, null]));

    const cursor = PWplayers.find(
      {
        gameID: gameID,
        environment: environment,
        lastJoinDate: {
          $gte: new Date(new Date().setDate(new Date().getDate() - 3)),
        },
      },
      { clientID: 1, "elements.statistics": 1, _id: 0 }
    ).cursor();

    // Make additionalValues from the PW directly.
    // This way the main leaderboard value is always accumulating,
    // and additionalValues have absolute values disregarding the timeframe.
    await cursor.eachAsync(async (player) => {
      if (timeframePlayers.has(player.clientID)) {
        const lb = await this.getCachedLeaderboardByTimeframeKey(
          gameID,
          branch,
          key
        );
        const elements = await Promise.all(
          lb.additionalElementIDs.map(async (id) => {
            const found = player.elements.statistics.find(
              (e) => e.elementID === id
            );
            if (found) {
              return {
                elementID: id,
                elementValue: found.elementValue,
              };
            }
            return {
              elementID: id,
              elementValue: await this.getElementValue(
                { gameID: gameID },
                branch,
                environment,
                player.clientID,
                id
              ),
            };
          })
        );
        await Promise.all(
          elements.map((e) =>
            this.saveCachedPlayerLeaderboardTimeframeValue(
              gameID,
              branch,
              environment,
              key,
              player.clientID,
              e.elementID,
              e.elementValue
            )
          )
        );
      }
    });
  }

  async massLeaderboardRecalculation() {
    const games = await Leaderboards.distinct("gameID").lean();
    if (games.length > 0) {
      for (const g of games) {
        const catalogs = await DeploymentCatalog.find({ gameID: g }).lean();
        if (catalogs && catalogs.length > 0) {
          for (const catalog of catalogs) {
            for (const environment of catalog.environments) {
              for (const v of environment.deployments) {
                await this.recalculateLeaderboards(v.version, environment.name);
              }
            }
          }
        }
      }
    }
  }
}
