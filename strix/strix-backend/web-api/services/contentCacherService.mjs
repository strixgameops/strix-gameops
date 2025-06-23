import Redis from "ioredis";
import mongoose from "mongoose";
import { CookedContent } from "../../models/cookedContent.js";
import { AnalyticsEvents } from "../../models/analyticsevents.js";
import { NodeModel } from "../../models/nodeModel.js";
import { DeploymentCatalog } from "../../models/deploymentCatalog.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

export class ContentCacherService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.dbConnection = null;
    this.localCache = {};
    this.localCacheExpirations = {};
    this.localCacheExpirationAttempts = {};
    this.cachedAnalyticsEvents = {};
    this.cachedCurrencyEntity = {};
//
    this.initializeDatabase();
    this.startLocalCacheCleanup();
    this.startCacheResets();
  }

  async initializeDatabase() {
    try {
      await this.connectToDatabase();
      if (!this.dbConnection) {
        throw new Error("Caching DB connection is not established");
      }
    } catch (error) {
      console.error("Error connecting to caching DB:", error);
    }
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

  checkDBConnection() {
    return this.dbConnection;
  }

  async insertData(tableName, body, gameID, branch, segmentID) {
    try {
      const utilityService = this.moduleContainer.get("utility");
      if (!body) return;
      const bodyWithChecksum = body.map((document) => {
        return {
          ...document,
          checksum: utilityService.calculateChecksum(document),
          hash: utilityService.computeHash(JSON.stringify(document)),
        };
      });

      const key = `${gameID}:${branch}:${tableName}:${segmentID}`;

      if (this.dbConnection) {
        try {
          await this.dbConnection.set(key, JSON.stringify(bodyWithChecksum));
          console.log(
            `Successfully cached JSON object in Redis with key: ${key}`
          );
        } catch (err) {
          console.error(`Error caching JSON object in Redis: ${err.message}`);
        }
        await CookedContent.updateOne(
          {
            gameID: gameID,
            branch: branch,
            segmentID: segmentID,
            type: tableName,
          },
          {
            $set: {
              data: JSON.stringify(bodyWithChecksum),
            },
          },
          { upsert: true }
        );
        console.log("Data inserted into:", tableName);
      } else {
        console.error("No database connection available");
      }
    } catch (err) {
      console.error("Error inserting data:", err);
    }
  }

  startLocalCacheCleanup() {
    setInterval(() => {
      this.removeExpiredKeys();
    }, 1000);
  }

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

    if (this.localCacheExpirationAttempts[key] < 100) {
      this.localCacheExpirations[key] = dayjs
        .utc()
        .add(120, "second")
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

  async trySetCache(
    cacheKey,
    object,
    useLocalCache = true,
    expiration = 7200,
    useRedis = true
  ) {
    try {
      if (this.dbConnection && useRedis) {
        await this.dbConnection.set(
          cacheKey,
          JSON.stringify(object),
          "EX",
          expiration
        );
      }
      if (useLocalCache) {
        this.localCache[cacheKey] = JSON.stringify(object);
      }
      this.resetLocalCacheExpirationKey(cacheKey);
    } catch (error) {
      console.error(error);
    }
  }

  async tryDeleteCache(cacheKey) {
    if (this.dbConnection) {
      await this.dbConnection.del(cacheKey);
    }
    delete this.localCache[cacheKey];
    delete this.localCacheExpirations[cacheKey];
  }

  async setCachedDataGlobally(
    key,
    value,
    expiration = 600,
    useLocalCache = false
  ) {
    if (this.dbConnection) {
      try {
        if (expiration) {
          await this.dbConnection.set(
            key,
            JSON.stringify(value),
            "EX",
            expiration
          );
        } else {
          await this.dbConnection.set(key, JSON.stringify(value));
        }

        if (useLocalCache) {
          this.localCache[key] = JSON.stringify(value);
        }
      } catch (err) {
        console.error(`Error caching data object in Redis: ${err.message}`);
      }
    } else {
      console.error("No database connection available");
    }
  }

  async tryGetCache_LIFORange(key, count) {
    if (this.dbConnection) {
      try {
        const data = await this.dbConnection.lrange(key, 0, count - 1);
        return data.map(JSON.parse);
      } catch (err) {
        console.error(
          `Error getting cached data object from Redis: ${err.message}`
        );
      }
    } else {
      console.error("No database connection available");
    }
  }

  async getCachedGameDeploymentCatalog(gameID) {
    const cacheKey = `${gameID}:cachedDeploymentCatalog`;
    let result = await this.tryGetCache(cacheKey, true);
    if (!result) {
      result = await DeploymentCatalog.find({ gameID: gameID }).lean();
      this.trySetCache(cacheKey, result, true);
    }
    return result;
  }

  async getCachedAnalyticEventByEventID(gameID, branch, eventID) {
        const utilityService = this.moduleContainer.get("utility");
    const matchingEvent = await AnalyticsEvents.findOne({
      gameID: gameID,
      branch: utilityService.getBranchWithWorkingSuffix(branch),
      eventID: eventID,
      $or: [{ removed: false }, { removed: { $exists: false } }],
    });

    if (matchingEvent == null) {
      return null;
    }

    return matchingEvent;
  }

  async getCachedCurrencyEntityByID(
    gameID,
    branch,
    entityID,
    returnFullObject
  ) {
    let matchingNode = await NodeModel.findOne(
      {
        gameID,
        branch,
        "entityBasic.entityID": entityID,
        $or: [{ removed: { $exists: false } }, { removed: false }],
      },
      { "entityBasic.entityID": 1, nodeID: 1, removed: 1 }
    ).lean();
    if (matchingNode) {
      return returnFullObject ? matchingNode : matchingNode.nodeID;
    } else {
      return null;
    }
  }

  async setAnalyticsQueryCache(queryString, data) {
    const utilityService = this.moduleContainer.get("utility");
    const hash = await utilityService.generateShortHash(queryString);
    const cacheKey = `webAnalyticsCache:${hash}`;
    await this.trySetCache(cacheKey, JSON.stringify(data));
    return;
  }

  async getCachedAnalyticsResponse(queryString) {
    const utilityService = this.moduleContainer.get("utility");
    const hash = await utilityService.generateShortHash(queryString);
    const cacheKey = `webAnalyticsCache:${hash}`;
    let result = await this.tryGetCache(cacheKey);
    if (result) {
      return JSON.parse(result);
    } else {
      return null;
    }
  }

  async getCachedRegionPrices(baseCurrencyCode, baseCurrencyAmount) {
    const cacheKey = `regionalPricing:${baseCurrencyCode}:${baseCurrencyAmount}`;
    let result = await this.tryGetCache(cacheKey);
    if (result) {
      return result;
    }
    const googlePlayService = this.moduleContainer.get("googlePlay");
    if (!googlePlayService) {
      console.error("getCachedRegionPrices: googlePlay module not found")
      return 0;
    }
    result = await googlePlayService.convertRegionPrices(baseCurrencyCode, baseCurrencyAmount);
    this.trySetCache(cacheKey, result, true, 17200);
    return result;
  }

  startCacheResets() {
    this.resetAnalyticsEventsCache();
    this.resetCachedCurrencyNodesCache();
  }

  async resetAnalyticsEventsCache() {
    setTimeout(() => {
      console.log("Analytics events cache reset");
      this.cachedAnalyticsEvents = {};
      this.resetAnalyticsEventsCache();
    }, 259200000); // 10 hours
  }

  async resetCachedCurrencyNodesCache() {
    setTimeout(() => {
      console.log("Currency entities cache reset");
      this.cachedCurrencyEntity = {};
      this.resetCachedCurrencyNodesCache();
    }, 259200000); // 10 hours
  }
}
