import client from "prom-client";
import dotenv from "dotenv";
dotenv.config();

export class MetricsService {
  constructor(container) {
    this.container = container;
    this.initialized = false;
    
    // Create separate registries for different metric types
    this.registries = {
      main: new client.Registry(),
      network: new client.Registry(),
      general: new client.Registry(),
      database: new client.Registry()
    };
    
    // Set default labels for all registries
    const defaultLabels = {
      app: "strix-backend",
      environment: process.env.ENVIRONMENT,
    };
    
    Object.values(this.registries).forEach(registry => {
      registry.setDefaultLabels(defaultLabels);
    });
    
    // Initialize metrics objects
    this.metrics = {
      network: {},
      general: {},
      database: {}
    };
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Setup default metrics collection
      client.collectDefaultMetrics({ register: this.registries.main });
      
      // Initialize metric categories
      this.initializeNetworkMetrics();
      this.initializeDatabaseMetrics();
      this.initializeGeneralMetrics();
      
      // Start periodic collection for general metrics
      this.startPeriodicCollection();
      
      this.initialized = true;
      console.log("MetricsService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize MetricsService:", error);
      throw error;
    }
  }

  initializeNetworkMetrics() {
    // HTTP request duration histogram
    this.metrics.network.httpRequestDuration = new client.Histogram({
      name: "strix_http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registries.network]
    });

    // HTTP requests total counter
    this.metrics.network.httpRequestsTotal = new client.Counter({
      name: "strix_http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registries.network]
    });

    // Request size counter
    this.metrics.network.requestSizeMetric = new client.Counter({
      name: "strix_http_request_size_bytes_total",
      help: "Total size of HTTP requests in bytes",
      labelNames: ["method", "endpoint"],
      registers: [this.registries.network]
    });

    // Response size counter
    this.metrics.network.responseSizeMetric = new client.Counter({
      name: "strix_http_response_size_bytes_total",
      help: "Total size of HTTP responses in bytes",
      labelNames: ["method", "endpoint"],
      registers: [this.registries.network]
    });
  }

  initializeDatabaseMetrics() {
    // PostgreSQL connection pool metrics
    this.metrics.database.poolIntended = new client.Gauge({
      name: "strix_db_connection_pool_total",
      help: "Total number of how many PG connections are intended to be used at maximum",
      registers: [this.registries.database]
    });

    this.metrics.database.poolSize = new client.Gauge({
      name: "strix_db_connection_pool_size_total",
      help: "Total number of how many PG connections are currently in the pool (both in use and available)",
      registers: [this.registries.database]
    });

    this.metrics.database.poolAvailable = new client.Gauge({
      name: "strix_db_connection_pool_available_total",
      help: "Total number of how many PG connections are currently available for use in the pool",
      registers: [this.registries.database]
    });

    this.metrics.database.poolUsing = new client.Gauge({
      name: "strix_db_connection_pool_using_total",
      help: "Total number of how many PG connections are currently in use in the pool",
      registers: [this.registries.database]
    });

    this.metrics.database.poolWaiting = new client.Gauge({
      name: "strix_db_connection_pool_waiting_total",
      help: "Total number of how many PG requests are currently waiting for a connection to become available",
      registers: [this.registries.database]
    });

    this.metrics.database.connected = new client.Gauge({
      name: "strix_db_connection_is_connected",
      help: "State of connection",
      labelNames: ["connection_status"],
      registers: [this.registries.database]
    });
  }

  initializeGeneralMetrics() {
    // User metrics
    this.metrics.general.usersGauge = new client.Gauge({
      name: "strix_users_total",
      help: "Current number of all non-demo registered users",
      registers: [this.registries.general]
    });

    this.metrics.general.demoUsersGauge = new client.Gauge({
      name: "strix_demo_users_total",
      help: "Current number of all demo users",
      registers: [this.registries.general]
    });

    this.metrics.general.studios = new client.Gauge({
      name: "strix_studios_total",
      help: "Current number of all non-demo studios",
      registers: [this.registries.general]
    });

    this.metrics.general.games = new client.Gauge({
      name: "strix_games_total",
      help: "Current number of all non-demo games",
      registers: [this.registries.general]
    });
  }

  startPeriodicCollection() {
    // Only start if we have database service available for queries
    if (!this.container.has('database')) {
      console.warn("Database service not available, skipping general metrics collection");
      return;
    }

    this.generalMetricsInterval = setInterval(async () => {
      try {
        await this.updateGeneralMetrics();
      } catch (error) {
        console.error("Error updating general metrics:", error);
      }
    }, 10000); // Update every 10 seconds
  }

  async updateGeneralMetrics() {
    try {
      // Import models dynamically to avoid circular dependencies
      const { User } = await import("../../../models/userModel.js");
      const { Studio } = await import("../../../models/studioModel.js");
      const { Game } = await import("../../../models/gameModel.js");

      // Get counts
      const userCount = await User.count({ isDemo: { $ne: true } });
      const demoUserCount = await User.count({ isDemo: true });
      
      const studioExpr = new RegExp("^demo_");
      const studioCount = await Studio.count({ studioID: { $not: studioExpr } });
      
      const gameExpr = new RegExp("^brawlDemo_");
      const gameCount = await Game.count({ gameID: { $not: gameExpr } });

      // Update metrics
      this.metrics.general.usersGauge.set(userCount);
      this.metrics.general.demoUsersGauge.set(demoUserCount);
      this.metrics.general.studios.set(studioCount);
      this.metrics.general.games.set(gameCount);
    } catch (error) {
      console.error("Failed to update general metrics:", error);
    }
  }

  // Network metrics methods
  recordRequest(req, res) {
    const end = this.metrics.network.httpRequestDuration.startTimer();
    let requestBodySize = 0;

    // Track request body size
    req.on("data", (chunk) => {
      requestBodySize += chunk.length;
    });

    // Override res.send to track response size
    const originalSend = res.send;
    res.send = (body) => {
      const responseBodySize = this.getByteSize(body);
      
      this.metrics.network.requestSizeMetric.inc(
        { method: req.method, endpoint: req.originalUrl },
        requestBodySize
      );
      
      this.metrics.network.responseSizeMetric.inc(
        { method: req.method, endpoint: req.originalUrl },
        responseBodySize
      );
      
      return originalSend.call(res, body);
    };

    // Record metrics on response finish
    res.on("finish", () => {
      const labels = {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode,
      };

      end(labels);
      this.metrics.network.httpRequestsTotal.inc(labels);
    });
  }

  // Database metrics methods
  setDatabasePoolStats(stats) {
    this.metrics.database.poolIntended.set(stats.poolMaxSize);
    this.metrics.database.poolSize.set(stats.poolSize);
    this.metrics.database.poolAvailable.set(stats.poolSizeAvailable);
    this.metrics.database.poolUsing.set(stats.poolSizeUsed);
    this.metrics.database.poolWaiting.set(stats.poolSizeWaiting);
    this.metrics.database.connected.labels(stats.connectionStatus).set(1);
  }

  // Utility methods
  getByteSize(str) {
    return Buffer.byteLength(str, "utf8");
  }

  async recordDurationMetric(metricObj, additionalData, callback) {
    const end = metricObj.startTimer(additionalData);
    try {
      await callback();
    } finally {
      end();
    }
  }

  // Get all metrics in Prometheus format
  async getAllMetrics() {
    const metrics = await Promise.all([
      this.registries.main.metrics(),
      this.registries.network.metrics(),
      this.registries.general.metrics(),
      this.registries.database.metrics(),
    ]);
    
    return metrics.join("\n");
  }

  // Get content type for Prometheus
  getContentType() {
    return this.registries.main.contentType;
  }

  // Shutdown method
  async shutdown() {
    if (this.generalMetricsInterval) {
      clearInterval(this.generalMetricsInterval);
      this.generalMetricsInterval = null;
    }
    
    // Clear all registries
    Object.values(this.registries).forEach(registry => {
      registry.clear();
    });
    
    console.log("MetricsService shut down");
  }
}