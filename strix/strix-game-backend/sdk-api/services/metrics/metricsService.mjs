import client, { exponentialBuckets } from "prom-client";
import dotenv from "dotenv";
dotenv.config();

export class MetricsService {
  constructor() {
    this.registry = new client.Registry();
    this.registry.setDefaultLabels({
      app: "strix-game-backend",
      environment: process.env.ENVIRONMENT,
    });

    // Collect default metrics
    client.collectDefaultMetrics({ register: this.registry });

    // Initialize all metrics
    this.initializeAnalyticsMetrics();
    this.initializeCacherMetrics();
    this.initializeDatabaseMetrics();
    this.initializeDeploymentMetrics();
    this.initializeFCMMetrics();
    this.initializeLiveServicesMetrics();
    this.initializeNetworkMetrics();
  }

  // =================================================================
  // ANALYTICS METRICS
  // =================================================================
  initializeAnalyticsMetrics() {
    // IAP receipts validated
    this.receiptsValidated = new client.Counter({
      name: "strix_iap_validations_total",
      help: "Number of players initializing SDK",
      labelNames: ["gameID", "validate_result", "timestamp"],
      registers: [this.registry]
    });

    // Events pipeline metrics
    this.eventsAcquired = new client.Counter({
      name: "strix_events_acquired_total",
      help: "Total number of acquired events",
      labelNames: ["gameID", "event_type", "timestamp"],
      registers: [this.registry]
    });

    this.eventsFailed = new client.Counter({
      name: "strix_events_failed_total",
      help: "Total number of events failed to validate or process",
      labelNames: ["gameID", "reason", "event_data", "timestamp"],
      registers: [this.registry]
    });

    this.eventsProcessed = new client.Counter({
      name: "strix_events_processed_total",
      help: "Total number of acquired events",
      labelNames: ["gameID", "event_type", "timestamp"],
      registers: [this.registry]
    });

    this.eventsAcquiredBySize = new client.Counter({
      name: "strix_events_acquired_total_size",
      help: "Total size of acquired events",
      labelNames: ["gameID", "event_type", "timestamp"],
      registers: [this.registry]
    });

    this.ingestedEventsAmount = new client.Counter({
      name: "strix_events_ingestions_total",
      help: "Number of events ingested to analytics DB",
      labelNames: ["gameID", "table_type", "event_type", "timestamp"],
      registers: [this.registry]
    });

    this.ingestedEventsSize = new client.Counter({
      name: "strix_events_ingestions_total_size",
      help: "Size of events ingested to analytics DB",
      labelNames: ["gameID", "table_type", "timestamp"],
      registers: [this.registry]
    });

    this.eventProcessingDuration = new client.Histogram({
      name: "strix_event_processing_duration_seconds",
      help: "Duration of event processing in seconds",
      labelNames: ["gameID", "event_type"],
      buckets: exponentialBuckets(50, 1.3, 15),
      registers: [this.registry]
    });

    this.segmentChangedTotal = new client.Counter({
      name: "strix_player_segment_change_calls_total",
      help: "Number of calls to change player's segment",
      labelNames: ["gameID", "timestamp"],
      registers: [this.registry]
    });
  }

  // =================================================================
  // CACHER METRICS
  // =================================================================
  initializeCacherMetrics() {
    this.segmentRecalculationDur = new client.Histogram({
      name: "strix_segment_recalculation_duration_seconds",
      help: "Duration of full segment recalculation in seconds",
      labelNames: ["gameID", "operation_type"],
      buckets: exponentialBuckets(50, 1.3, 15),
      registers: [this.registry]
    });

    this.massCheckupProcessingDur = new client.Histogram({
      name: "strix_mass_checkup_filling_duration_seconds",
      help: "Duration of filling all batcher of players for mass content checkup in seconds",
      labelNames: ["gameID", "operation_type"],
      buckets: exponentialBuckets(50, 1.3, 15),
      registers: [this.registry]
    });
  }

  // =================================================================
  // DATABASE METRICS
  // =================================================================
  initializeDatabaseMetrics() {
    this.PGpoolIntended = new client.Gauge({
      name: "strix_db_connection_pool_total",
      help: "Total number of how many PG connections are intended to be used at maximum",
      registers: [this.registry]
    });

    this.PGpoolSize = new client.Gauge({
      name: "strix_db_connection_pool_size_total",
      help: "Total number of how many PG connections are currently in the pool (both in use and available)",
      registers: [this.registry]
    });

    this.PGpoolAvailable = new client.Gauge({
      name: "strix_db_connection_pool_available_total",
      help: "Total number of how many PG connections are currently available for use in the pool",
      registers: [this.registry]
    });

    this.PGpoolUsing = new client.Gauge({
      name: "strix_db_connection_pool_using_total",
      help: "Total number of how many PG connections are currently in use in the pool",
      registers: [this.registry]
    });

    this.PGpoolWaiting = new client.Gauge({
      name: "strix_db_connection_pool_waiting_total",
      help: "Total number of how many PG requests are currently waiting for a connection to become available",
      registers: [this.registry]
    });

    this.PGconnected = new client.Gauge({
      name: "strix_db_connection_is_connected",
      help: "State of connection",
      labelNames: ["connection_status"],
      registers: [this.registry]
    });

    this.consumersConnected = new client.Gauge({
      name: "strix_pulsar_consumers_connected_total",
      help: "Amount of currently connected consumers from Pulsar",
      registers: [this.registry]
    });

    this.consumersTotal = new client.Gauge({
      name: "strix_pulsar_consumers_total",
      help: "Amount of total consumers pool from Pulsar (should always match the amount of connected consumers)",
      registers: [this.registry]
    });
  }

  // =================================================================
  // DEPLOYMENT METRICS
  // =================================================================
  initializeDeploymentMetrics() {
    this.sdkCheckups = new client.Counter({
      name: "strix_sdk_checkups_total",
      help: "Number of players doing sdk checksum checkups",
      labelNames: ["gameID", "timestamp"],
      registers: [this.registry]
    });

    this.sdkUpdate = new client.Counter({
      name: "strix_client_updates_total",
      help: "Number of players updating content",
      labelNames: ["gameID", "timestamp"],
      registers: [this.registry]
    });

    this.tokenReg = new client.Counter({
      name: "strix_fcm_token_registered_total",
      help: "Number of tokens registered through FCM",
      labelNames: ["gameID", "timestamp"],
      registers: [this.registry]
    });

    this.initializations = new client.Counter({
      name: "strix_sdk_inits_total",
      help: "Number of players initializing SDK",
      labelNames: ["gameID", "timestamp"],
      registers: [this.registry]
    });

    this.deploymentProcessingDur_init = new client.Histogram({
      name: "strix_initSDK_processing_duration_seconds",
      help: "Duration of SDK initialization processing in seconds",
      labelNames: ["gameID"],
      buckets: exponentialBuckets(50, 1.3, 15),
      registers: [this.registry]
    });

    this.deploymentProcessingDur_clientUpdate = new client.Histogram({
      name: "strix_client_update_processing_duration_seconds",
      help: "Duration of client config update processing in seconds",
      labelNames: ["gameID"],
      buckets: exponentialBuckets(50, 1.3, 15),
      registers: [this.registry]
    });

    this.deploymentProcessingDur_checksumCheckup = new client.Histogram({
      name: "strix_client_checksum_checkup_processing_duration_seconds",
      help: "Duration of client checksum checkup processing in seconds",
      labelNames: ["gameID"],
      buckets: exponentialBuckets(50, 1.3, 15),
      registers: [this.registry]
    });
  }

  // =================================================================
  // FCM METRICS
  // =================================================================
  initializeFCMMetrics() {
    this.fcmMsgSentTotal = new client.Counter({
      name: "strix_fcm_messages_sent_total",
      help: "Number of attempts to send FCM messages, and their results",
      labelNames: ["result", "timestamp"],
      registers: [this.registry]
    });
  }

  // =================================================================
  // LIVE SERVICES METRICS (Used by WarehouseController)
  // =================================================================
  initializeLiveServicesMetrics() {
    this.inventoryOperations = new client.Counter({
      name: "strix_inventory_operations_total",
      help: "Total number of inventory operations",
      labelNames: ["gameID", "operation_type", "timestamp"],
      registers: [this.registry]
    });

    this.leaderboardOperations = new client.Counter({
      name: "strix_leaderboard_operations_total",
      help: "Total number of leaderboard operations",
      labelNames: ["gameID", "operation_type", "timestamp"],
      registers: [this.registry]
    });

    this.PWOperations = new client.Counter({
      name: "strix_warehouse_operations_total",
      help: "Total number of player warehouse operations",
      labelNames: ["gameID", "operation_type", "timestamp"],
      registers: [this.registry]
    });

    this.backendActions = new client.Counter({
      name: "strix_backend_actions_total",
      help: "Number of backend operations called from SDK",
      labelNames: ["gameID", "operation_type", "timestamp"],
      registers: [this.registry]
    });

    this.warehouseProcessingDur = new client.Histogram({
      name: "strix_warehouse_processing_duration_seconds",
      help: "Duration of warehouse operations processing in seconds",
      labelNames: ["gameID", "operation_type"],
      buckets: exponentialBuckets(50, 1.3, 15),
      registers: [this.registry]
    });

    this.inventoryProcessingDur = new client.Histogram({
      name: "strix_inventory_processing_duration_seconds",
      help: "Duration of inventory operations processing in seconds",
      labelNames: ["gameID", "operation_type"],
      buckets: exponentialBuckets(50, 1.3, 15),
      registers: [this.registry]
    });

    this.leaderboardProcessingDur = new client.Histogram({
      name: "strix_leaderboard_processing_duration_seconds",
      help: "Duration of leaderboard operations processing in seconds",
      labelNames: ["gameID", "operation_type"],
      buckets: exponentialBuckets(50, 1.3, 15),
      registers: [this.registry]
    });

    this.backendActionsProcessingDur = new client.Histogram({
      name: "strix_backend_actions_processing_duration_seconds",
      help: "Duration of SDK backend actions processing in seconds",
      labelNames: ["gameID", "operation_type"],
      buckets: exponentialBuckets(50, 1.3, 15),
      registers: [this.registry]
    });
  }

  // =================================================================
  // NETWORK METRICS
  // =================================================================
  initializeNetworkMetrics() {
    this.httpRequestDuration = new client.Histogram({
      name: "strix_http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code", "latitude", "longitude"],
      registers: [this.registry]
    });

    this.httpRequestsTotal = new client.Counter({
      name: "strix_http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code", "latitude", "longitude"],
      registers: [this.registry]
    });

    this.requestSizeMetric = new client.Counter({
      name: "strix_http_request_size_bytes_total",
      help: "Total size of HTTP requests in bytes",
      labelNames: ["method", "endpoint", "latitude", "longitude"],
      registers: [this.registry]
    });

    this.responseSizeMetric = new client.Counter({
      name: "strix_http_response_size_bytes_total",
      help: "Total size of HTTP responses in bytes",
      labelNames: ["method", "endpoint", "latitude", "longitude"],
      registers: [this.registry]
    });
  }

  // =================================================================
  // UTILITY METHODS
  // =================================================================
  getByteSize(str) {
    return Buffer.byteLength(str, "utf8");
  }

  async recordDurationMetric(metricObj, additionalData, callback) {
    const end = metricObj.startTimer(additionalData);
    await callback();
    end();
  }

  // =================================================================
  // ANALYTICS RECORDING METHODS
  // =================================================================
  recordReceiptValidated(gameID, result) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.receiptsValidated.inc(
      { validate_result: result, gameID: gameID, timestamp },
      1
    );
  }

  recordEventAcquired(gameID, eventType) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.eventsAcquired.inc({ event_type: eventType, gameID: gameID, timestamp }, 1);
  }

  recordEventFailed(reason, event_data) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.eventsFailed.inc({ reason, event_data, timestamp }, 1);
  }

  recordEventProcessed(gameID, eventType) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.eventsProcessed.inc({ event_type: eventType, gameID: gameID, timestamp }, 1);
  }

  recordEventAcquiredSize(gameID, eventType, event) {
    const size = this.getByteSize(JSON.stringify(event));
    const timestamp = new Date().toISOString().split("T")[0];
    this.eventsAcquiredBySize.inc(
      { event_type: eventType, gameID: gameID, timestamp },
      size
    );
  }

  recordIngestedEvents(gameID, table, type) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.ingestedEventsAmount.inc(
      { table_type: table, gameID: gameID, event_type: type, timestamp },
      1
    );
  }

  recordIngestedEventsSize(gameID, table, event) {
    const size = this.getByteSize(JSON.stringify(event));
    const timestamp = new Date().toISOString().split("T")[0];
    this.ingestedEventsSize.inc(
      { table_type: table, gameID: gameID, timestamp },
      size
    );
  }

  recordPlayerSegmentChangeCall(gameID) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.segmentChangedTotal.inc({ gameID: gameID, timestamp }, 1);
  }

  // =================================================================
  // DATABASE RECORDING METHODS
  // =================================================================
  setPoolStats(stats) {
    this.PGpoolIntended.set(stats.poolMaxSize);
    this.PGpoolSize.set(stats.poolSize);
    this.PGpoolAvailable.set(stats.poolSizeAvailable);
    this.PGpoolUsing.set(stats.poolSizeUsed);
    this.PGpoolWaiting.set(stats.poolSizeWaiting);
    this.PGconnected.labels(stats.connectionStatus).set(1);
  }

  setConsumersStats(stats) {
    this.consumersConnected.set(stats.consumersConnected);
    this.consumersTotal.set(stats.consumersTotal);
  }

  // =================================================================
  // DEPLOYMENT RECORDING METHODS
  // =================================================================
  recordSDKCheckup(gameID) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.sdkCheckups.inc({ gameID, timestamp }, 1);
  }

  recordSDKUpdate(gameID) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.sdkUpdate.inc({ gameID, timestamp }, 1);
  }

  recordTokenReg(gameID) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.tokenReg.inc({ gameID, timestamp }, 1);
  }

  recordSDKInit(gameID) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.initializations.inc({ gameID, timestamp }, 1);
  }

  // =================================================================
  // FCM RECORDING METHODS
  // =================================================================
  recordFCMMessageSent(result) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.fcmMsgSentTotal.inc({ result: result, timestamp }, 1);
  }

  // =================================================================
  // LIVE SERVICES RECORDING METHODS
  // =================================================================
  recordInventoryOperation(gameID, operationType) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.inventoryOperations.inc(
      { operation_type: operationType, gameID, timestamp },
      1
    );
  }

  recordLeaderboardOperation(gameID, operationType) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.leaderboardOperations.inc(
      { operation_type: operationType, gameID, timestamp },
      1
    );
  }

  recordWarehouseOperation(gameID, operationType) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.PWOperations.inc(
      { operation_type: operationType, gameID: gameID, timestamp },
      1
    );
  }

  recordBackendActions(gameID, operationType) {
    const timestamp = new Date().toISOString().split("T")[0];
    this.backendActions.inc(
      { operation_type: operationType, gameID: gameID, timestamp },
      1
    );
  }

  // =================================================================
  // MIDDLEWARE AND ENDPOINT
  // =================================================================
  middleware = async (req, res, next) => {
    try {
      const end = this.httpRequestDuration.startTimer();

      let grabCoordinates = false;
      if (
        process.env.SERVER_ROLE === "analytics" ||
        process.env.SERVER_ROLE === "liveops" ||
        process.env.SERVER_ROLE === "deploy" ||
        process.env.SERVER_ROLE === "development"
      ) {
        // grabCoordinates = true;
      }

      const clientIP = grabCoordinates
        ? req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
          req.connection.remoteAddress ||
          req.socket.remoteAddress ||
          (req.connection.socket ? req.connection.socket.remoteAddress : null)
        : null;
      let coordinates = grabCoordinates ? { latitude: 0, longitude: 0 } : {};

      if (grabCoordinates) {
        try {
          // coordinates = await getClientCoordinates(clientIP);
        } catch (error) {
          console.error("Failed to get client coordinates:", error);
        }
      }

      let requestBodySize = 0;
      req.on("data", (chunk) => {
        requestBodySize += chunk.length;
      });

      const originalSend = res.send;
      res.send = (body) => {
        const responseBodySize = Buffer.byteLength(body, "utf8");
        this.requestSizeMetric.inc(
          {
            method: req.method,
            endpoint: req.originalUrl,
            ...coordinates,
          },
          requestBodySize
        );
        this.responseSizeMetric.inc(
          {
            method: req.method,
            endpoint: req.originalUrl,
            ...coordinates,
          },
          responseBodySize
        );
        originalSend.call(res, body);
      };

      res.on("finish", () => {
        end({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode,
          ...coordinates,
        });
        this.httpRequestsTotal.inc({
          method: req.method,
          route: req.route?.path || req.path,
          status_code: res.statusCode,
          ...coordinates,
        });
      });
      next();
    } catch (error) {
      console.log("metricsMiddleware", error);
      next();
    }
  };

  endpoint = async (req, res) => {
    res.set("Content-Type", this.registry.contentType);
    const metrics = await this.registry.metrics();
    res.end(metrics);
  };

  async initialize() {
    console.log("MetricsService initialized");
  }

  async shutdown() {
    console.log("MetricsService shutting down");
  }
}