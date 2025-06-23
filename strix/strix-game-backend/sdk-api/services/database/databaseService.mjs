import { Sequelize, DataTypes, QueryTypes } from "sequelize";
import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config();
import { asyncExitHook, gracefulExit } from "exit-hook";

export class DatabaseService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;

    this.sequelize = new Sequelize(process.env.PTSDB_URI, {
      dialect: "postgres",
      protocol: "postgres",
      logging: false,
      ...(process.env.PTSDB_USE_SSL == "true"
        ? {
            dialectOptions: {
              ssl: {
                require: process.env.PTSDB_USE_SSL == "true",
                rejectUnauthorized: false,
              },
            },
          }
        : {}),
      pool: {
        max: parseInt(process.env.PTSDB_CONNECTION_POOL_SIZE),
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      retry: {
        match: [/Deadlock/i],
        max: 3,
        backoffBase: 1000,
        backoffExponent: 1.5,
      },
      logging: (msg) => {
        // this.utilityService.log(msg);
      },
    });

    this.maxConnections = parseInt(process.env.PTSDB_CONNECTION_POOL_SIZE);
    this.connectionStatus = {
      isConnected: false,
      lastConnectAttempt: null,
      lastSuccessfulConnect: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
    };

    this.ongoingQueries = 0;
    this.doOnceDisconnectFromPG = false;

    this.mongoConnected = false;

    this.initializeMetrics();
    this.initializeMongoDB();
    this.setupExitHooks();
  }

  initialize() {
    if (this.initialized) return;
    this.utilityService = this.moduleContainer.get("utility");
    this.metricsService = this.moduleContainer.get("metrics");
    this.initialized = true;
  }

  initializeMetrics() {
    setInterval(async () => {
      // Providing metrics to gauges
      this.metricsService?.setPoolStats({
        poolMaxSize: parseInt(process.env.PTSDB_CONNECTION_POOL_SIZE),
        poolSize: (await this.sequelize?.connectionManager?.pool?.size) || 0,
        poolSizeAvailable:
          (await this.sequelize.connectionManager?.pool?.available) || 0,
        poolSizeUsed:
          (await this.sequelize?.connectionManager?.pool?.using) || 0,
        poolSizeWaiting:
          (await this.sequelize?.connectionManager?.pool?.waiting) || 0,
        connectionStatus: this.checkPGConnection()
          ? "connected"
          : "disconnected",
      });
    }, 1000);
  }

  setupExitHooks() {
    asyncExitHook(
      async (signal) => {
        console.log("Exit signal:", signal);
        await this.closeConnectionPool();
        gracefulExit();
      },
      { wait: 1000 }
    );
  }

  async closeConnectionPool() {
    if (!this.doOnceDisconnectFromPG) {
      this.doOnceDisconnectFromPG = true;
      console.log("Ending PG pool...");
      await this.gracefullyClose();
      console.log("Ended PG pool");
    }
  }

  async gracefullyClose() {
    setTimeout(async () => {
      if (
        (!(await this.sequelize?.connectionManager?.pool?.using) ||
          (await this.sequelize.connectionManager.pool.using) === 0) &&
        this.ongoingQueries === 0
      ) {
        await this.sequelize.close();
      } else {
        await this.gracefullyClose();
      }
    }, 50);
  }

  isMongoConnected() {
    return this.mongoConnected;
  }

  async initializeMongoDB() {
    try {
      const mongoURI = process.env.MONGODB_URI;
      const connectionOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 120000,
      };

      await mongoose.connect(mongoURI, connectionOptions);
      this.mongoConnected = true;
      console.log("MongoDB connected successfully");

      // Set up MongoDB event listeners
      mongoose.connection.on("error", (error) => {
        console.error("MongoDB error:", error);
        this.mongoConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        console.log("MongoDB disconnected");
        this.mongoConnected = false;
      });

      mongoose.connection.on("reconnected", () => {
        console.log("MongoDB reconnected");
        this.mongoConnected = true;
      });
    } catch (error) {
      console.error("MongoDB connection failed:", error);
      throw error;
    }
  }

  async checkPGConnection(forceCheck = false) {
    if (this.connectionStatus.isConnected && !forceCheck) {
      return true;
    }

    this.connectionStatus.lastConnectAttempt = new Date();

    try {
      await this.sequelize.authenticate();

      this.connectionStatus.isConnected = true;
      this.connectionStatus.lastSuccessfulConnect = new Date();
      this.connectionStatus.reconnectAttempts = 0;

      console.log("PostgreSQL connection established successfully");
      return true;
    } catch (error) {
      this.connectionStatus.isConnected = false;
      this.connectionStatus.reconnectAttempts++;

      if (
        this.connectionStatus.reconnectAttempts >
        this.connectionStatus.maxReconnectAttempts
      ) {
        console.error(
          `PostgreSQL connection failed (attempt ${this.connectionStatus.reconnectAttempts}): ${error.message}`
        );
      } else {
        console.error(`PostgreSQL connection attempt failed: ${error.message}`);
      }

      return false;
    }
  }

  async PGquery(query) {
    try {
      if (!this.checkPGConnection()) {
        throw new Error("PG connection is not established");
      }

      let retries = 800;

      while (this.ongoingQueries >= this.maxConnections && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        retries--;
      }

      if (retries === 0) {
        console.warn("PGQuery overload! Query:", query);
      }

      this.ongoingQueries++;
      this.utilityService.log("QUERY:", query);
      const [response] = await this.sequelize.query(query);
      this.ongoingQueries--;

      return response;
    } catch (error) {
      this.ongoingQueries--;
      throw error;
    }
  }

  getSequelize() {
    return this.sequelize;
  }
}
