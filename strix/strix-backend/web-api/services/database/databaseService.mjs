import mongoose from "mongoose";
import { asyncExitHook } from "exit-hook";
import { Sequelize, DataTypes, QueryTypes } from "sequelize";
import { DatabaseWorkerPool } from "./workerPool.js";

export class DatabaseService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.sequelize = null;
    this.mongoConnected = false;
    this.shutdownInitiated = false;
    this.ongoingQueries = 0;
    this.metricsInterval = null;
    this.workerPool = null;
  }

  async initialize() {
    console.log(
      `Initializing database service for role: ${process.env.SERVER_ROLE}`
    );

    const promises = [];

    if (process.env.SERVER_ROLE === "webBackend") {
      promises.push(this.initializePostgreSQL());
      // Initialize worker pool for heavy queries
      promises.push(this.initializeWorkerPool());
    }

    promises.push(this.initializeMongoDB());
    await Promise.all(promises);

    this.setupGracefulShutdown();
    this.startMetricsCollection();
    console.log("Database service initialization complete");
  }

  async initializeWorkerPool() {
    this.workerPool = new DatabaseWorkerPool(4); // 4 worker threads
    await this.workerPool.initialize({
      uri: process.env.PTSDB_URI,
      useSsl: process.env.PTSDB_USE_SSL == "true",
    });
    console.log("Database worker pool initialized");
  }

  async initializePostgreSQL() {
    try {
      const dialectOptions = {};

      // Only add SSL configuration if SSL is enabled
      if (process.env.PTSDB_USE_SSL === "true") {
        dialectOptions.ssl = {
          require: true,
          rejectUnauthorized: false,
        };
      }
      this.sequelize = new Sequelize(process.env.PTSDB_URI, {
        dialect: "postgres",
        protocol: "postgres",
        logging: false,
        dialectOptions,
        pool: {
          max: parseInt(process.env.PTSDB_CONNECTION_POOL_SIZE) || 20,
          min: 0,
          acquire: 60000,
          idle: 10000,
        },
      });

      await this.sequelize.authenticate();
      console.log("PostgreSQL connected successfully");
    } catch (error) {
      console.error("PostgreSQL connection failed:", error);
      throw error;
    }
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

  startMetricsCollection() {
    // Only start metrics if we have PostgreSQL (webBackend role)
    if (this.sequelize) {
      this.metricsInterval = setInterval(async () => {
        try {
          const pool = this.sequelize.connectionManager?.pool;

          // Get the MetricsService instance from the container
          const metricsService = this.moduleContainer.get("metrics");
          if (metricsService) {
            metricsService.setDatabasePoolStats({
              poolMaxSize:
                parseInt(process.env.PTSDB_CONNECTION_POOL_SIZE) || 20,
              poolSize: pool?.size || 0,
              poolSizeAvailable: pool?.available || 0,
              poolSizeUsed: pool?.using || 0,
              poolSizeWaiting: pool?.waiting || 0,
              connectionStatus: this.isPostgreSQLConnected()
                ? "connected"
                : "disconnected",
            });
          }
        } catch (error) {
          console.error("Error collecting database metrics:", error);
        }
      }, 5000); // Every 5 seconds
    }
  }

  setupGracefulShutdown() {
    asyncExitHook(
      async (signal) => {
        console.log(`Database service received exit signal: ${signal}`);
        await this.shutdown();
      },
      { wait: 5000 }
    );
  }

  async shutdown() {
    if (this.shutdownInitiated) return;
    this.shutdownInitiated = true;

    console.log("Shutting down database connections...");

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    // Wait for ongoing queries
    let waitTime = 0;
    while (this.ongoingQueries > 0 && waitTime < 10000) {
      console.log(`Waiting for ${this.ongoingQueries} queries to complete...`);
      await new Promise((resolve) => setTimeout(resolve, 100));
      waitTime += 100;
    }

    // Shutdown worker pool
    if (this.workerPool) {
      await this.workerPool.shutdown();
      console.log("Worker pool closed");
    }

    // Close main connections
    if (this.sequelize) {
      try {
        await this.sequelize.close();
        console.log("PostgreSQL connection closed");
      } catch (error) {
        console.error("Error closing PostgreSQL connection:", error);
      }
    }

    if (this.mongoConnected) {
      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
        this.mongoConnected = false;
      } catch (error) {
        console.error("Error closing MongoDB connection:", error);
      }
    }
  }

  // Health check methods
  isPostgreSQLConnected() {
    return this.sequelize && !this.shutdownInitiated;
  }

  isMongoConnected() {
    return this.mongoConnected && !this.shutdownInitiated;
  }

  // Get database instances
  getSequelize() {
    if (!this.sequelize) {
      throw new Error("PostgreSQL not initialized for this server role");
    }
    return this.sequelize;
  }

  getMongoose() {
    if (!this.mongoConnected) {
      throw new Error("MongoDB not connected");
    }
    return mongoose;
  }

  async PGquery(query) {
    if (!this.isPostgreSQLConnected()) {
      throw new Error("PostgreSQL connection not available");
    }

    if (!this.workerPool) {
      throw new Error("Worker pool not initialized");
    }

    this.ongoingQueries++;
    try {
      const result = await this.workerPool.executeQuery(query);
      this.ongoingQueries--;
      return result;
    } catch (error) {
      this.ongoingQueries--;
      throw error;
    }
  }

  // Health status for monitoring
  async getHealthStatus() {
    const status = {
      postgresql: {
        connected: this.isPostgreSQLConnected(),
        required: process.env.SERVER_ROLE === "webBackend",
      },
      mongodb: {
        connected: this.isMongoConnected(),
        required: true,
      },
      ongoingQueries: this.ongoingQueries,
      shutdownInitiated: this.shutdownInitiated,
    };

    const isHealthy =
      (status.postgresql.connected || !status.postgresql.required) &&
      status.mongodb.connected &&
      !status.shutdownInitiated;

    return {
      healthy: isHealthy,
      details: status,
      timestamp: new Date().toISOString(),
    };
  }
}
