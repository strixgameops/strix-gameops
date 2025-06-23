import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import http from "http";

dotenv.config();

import { createModuleContainer } from "./core/moduleContainer.mjs";
import { createRouterManager } from "./core/routerManager.mjs";
import { setupErrorHandling } from "./core/errorHandler.mjs";
import { setupMetrics } from "./core/metricsSetup.mjs";
import {
  initializeProbes,
  startHealthChecks,
} from "./services/kubernetes/probes.mjs";
import * as crashlytics from "./services/logging/crashlyticsHandler.mjs";
class StrixServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.container = null;
    this.routerManager = null;
  }

  async initialize() {
    try {
      // Initialize module container with role-based loading
      this.container = await createModuleContainer(process.env.SERVER_ROLE);

      // Initialize Kubernetes probes with database service
      const databaseService = this.container.get("database");
      initializeProbes(databaseService);
      startHealthChecks();

      // Setup metrics (now using controller-based approach)
      const { metricsMiddleware, metricsEndpoint } = setupMetrics(
        this.container
      );

      // Configure Express
      this.setupExpress(metricsMiddleware, metricsEndpoint);

      // Setup routers based on server role
      this.routerManager = createRouterManager(this.container);
      this.setupRoutes();

      // Setup error handling
      setupErrorHandling(this.app);

      return this;
    } catch (error) {
      console.error("Failed to initialize server:", error);
      throw error;
    }
  }

  setupExpress(metricsMiddleware, metricsEndpoint) {
    // Apply metrics middleware to all requests for monitoring
    this.app.use(metricsMiddleware);

    // Expose main metrics endpoint at root level for Prometheus scraping
    this.app.get("/metrics", metricsEndpoint);

    // Body parsing
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ limit: "50mb", extended: true }));

    // CORS
    this.setupCORS();
  }

  setupCORS() {
    const whitelist = process.env.CORS_WHITELIST?.split(",") || [];

    const corsOptions = {
      origin: (origin, callback) => {
        // If whitelist is empty, allow all
        if (whitelist.length === 0) return callback(null, true);

        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);

        // Check whitelist
        if (whitelist.includes(origin)) return callback(null, true);

        // Allow localhost in development
        if (
          process.env.ENVIRONMENT === "staging" &&
          origin.match(/https?:\/\/localhost:?[0-9]*$/)
        ) {
          return callback(null, true);
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      optionsSuccessStatus: 200,
    };
    this.app.use(cors(corsOptions));
  }

  setupRoutes() {
    const role = process.env.SERVER_ROLE;

    // Mount routers using the enhanced RouterManager
    const routerConfig = {
      webPath: "/",
      kubePath: "/kube",
      otherPath: "/other",
      healthPath: "/",
      featureBasePath: "/api/v1",
      enableRootMetrics: true, // Ensures /metrics is available at root for Prometheus
    };

    // Use the RouterManager's mount method for consistent routing
    this.routerManager.mountRouters(this.app, routerConfig);

    // Role-specific additional setup
    switch (role) {
      case "webBackend":
        console.log("Web backend routes mounted");
        break;
      case "demoGeneration":
        console.log("Demo generation service routes mounted (minimal)");
        break;
      case "alertsManager":
        console.log("Alerts manager service routes mounted (minimal)");
        break;
      default:
        console.warn(`Unknown server role: ${role}`);
    }

    // Log router statistics
    const stats = this.routerManager.getRouterStats();
    console.log(`Router setup complete:`, stats);
  }

  async start() {
    const port = process.env.PORT || 3001;
    const host = process.env.HOST || "0.0.0.0";

    this.server = http.createServer(this.app);

    // Performance optimizations
    this.server.keepAliveTimeout = 60 * 1000 + 1000;
    this.server.headersTimeout = 60 * 1000 + 2000;

    return new Promise((resolve) => {
      this.server.listen(port, host, () => {
        console.log(
          `Server running on http://${host}:${port} (role: ${process.env.SERVER_ROLE})`
        );
        console.log(`Metrics available at http://${host}:${port}/metrics`);
        console.log(`Health check at http://${host}:${port}/health`);
        console.log(`Kubernetes probes ready`);
        resolve(this);
      });
    });
  }

  async shutdown() {
    console.log("Shutting down server...");

    if (this.container) {
      await this.container.shutdown();
    }

    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log("Server shutdown complete");
          resolve();
        });
      });
    }
  }

  // Health check method for external monitoring
  async getHealthStatus() {
    if (!this.container?.initialized) {
      return { status: "unhealthy", reason: "Container not initialized" };
    }

    try {
      const routerHealth = await this.routerManager.getRoutersHealth();
      const containerStats = this.routerManager.getRouterStats();

      // Get database health status
      // const databaseService = this.container.get('database');
      // const databaseHealth = await databaseService.getHealthStatus();

      return {
        status: databaseHealth.healthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        role: process.env.SERVER_ROLE,
        container: {
          services: containerStats.containerServices,
          controllers: containerStats.containerControllers,
          hasMetrics: containerStats.hasMetrics,
        },
        // database: databaseHealth,
        routers: routerHealth,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        reason: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Initialize and start server
const server = new StrixServer();

server
  .initialize()
  .then((s) => s.start())
  .catch((error) => {
    console.error("Server startup failed:", error);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await server.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  await server.shutdown();
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("Uncaught Exception:", error);
  await server.shutdown();
  process.exit(1);
});

process.on("unhandledRejection", async (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  await server.shutdown();
  process.exit(1);
});

export default server;
