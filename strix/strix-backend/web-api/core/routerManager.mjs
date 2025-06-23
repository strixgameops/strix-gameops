import express from "express";
import { createWebRoutes } from "../routes/webRoutes.mjs";
import { createMetricsRoutes } from "../routes/metricsRouter.mjs";
import {
  checkReadiness,
  checkLiveness,
} from "../services/kubernetes/probes.mjs";

// Feature route imports
import { createABTestRoutes } from "../routes/features/abtestRoutes.mjs";
import { createAlertRoutes } from "../routes/features/alertRoutes.mjs";
import { createAnalyticsRoutes } from "../routes/features/analyticsRoutes.mjs";
import { createAuthRoutes } from "../routes/features/authRoutes.mjs";
import { createBalanceModelRoutes } from "../routes/features/balanceModelRoutes.mjs";
import { createClusteringRoutes } from "../routes/features/clusteringRoutes.mjs";
import { createCustomDashboardRoutes } from "../routes/features/customDashboardRoutes.mjs";
import { createDeploymentRoutes } from "../routes/features/deploymentRoutes.mjs";
import { createFlowRoutes } from "../routes/features/flowsRoutes.mjs";
import { createGameEventRoutes } from "../routes/features/gameEventsRoutes.mjs";
import { createLocalizationRoutes } from "../routes/features/localizationRoutes.mjs";
import { createNodeRoutes } from "../routes/features/nodeRoutes.mjs";
import { createOfferRoutes } from "../routes/features/offerRoutes.mjs";
import { createOrganizationRoutes } from "../routes/features/organizationRoutes.mjs";
import { createProfileCompositionRoutes } from "../routes/features/profileCompositionRoutes.mjs";
import { createPushCampaignRoutes } from "../routes/features/pushCampaignRoutes.mjs";
import { createSegmentRoutes } from "../routes/features/segmentRoutes.mjs";
import { createUtilityRoutes } from "../routes/features/utilityRoutes.mjs";
import { createWarehouseRoutes } from "../routes/features/warehouseRoutes.mjs";
import { createAnalyticsQueriesRoutes } from "../routes/analytics/analyticsRoutes.mjs";

class HealthChecker {
  constructor(container) {
    this.container = container;
  }

  async checkApplicationHealth() {
    try {
      const services = Array.from(this.container.services.keys());
      const controllers = Array.from(this.container.controllers?.keys() || []);

      const databaseService = this.container.get("database");
      const databaseHealth = await databaseService.getHealthStatus();

      return {
        healthy: databaseHealth.healthy && this.container.initialized,
        services,
        controllers,
        database: databaseHealth.details,
        role: process.env.SERVER_ROLE,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async checkReadiness() {
    const health = await this.checkApplicationHealth();
    return health.healthy;
  }

  async checkLiveness() {
    return this.container.initialized;
  }
}

export function createKubeRoutes() {
  const router = express.Router();

  let podIsReady = false;
  let podIsAlive = false;

  const gracePeriod = parseInt(process.env.POD_READINESS_GRACE_PERIOD) || 5000;
  setTimeout(() => {
    podIsReady = true;
    podIsAlive = true;
  }, gracePeriod);

  router.get("/pod/isReady", (req, res) => {
    res.status(podIsReady ? 200 : 500).json({ success: podIsReady });
  });

  router.get("/pod/isAlive", (req, res) => {
    res.status(podIsAlive ? 200 : 500).json({ success: podIsAlive });
  });

  router.use((err, req, res, next) => {
    console.error("Kube router error:", req.originalUrl, err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  return router;
}

export class RouterManager {
  constructor(container) {
    this.container = container;
    this.routers = new Map();
    this.healthChecker = new HealthChecker(container);
  }

  getWebRouter() {
    return this.getOrCreateRouter("web", () => createWebRoutes(this.container));
  }

  getKubernetesRouter() {
    return this.getOrCreateRouter("kubernetes", () => createKubeRoutes());
  }

  getMetricsRouter() {
    return this.getOrCreateRouter("metrics", () => {
      if (!this.container.has("metrics")) {
        return this.createFallbackMetricsRouter();
      }
      return createMetricsRoutes(this.container);
    });
  }

  getHealthRouter() {
    return this.getOrCreateRouter("health", () => this.createHealthRouter());
  }

  getOrCreateRouter(key, factory) {
    if (!this.routers.has(key)) {
      try {
        const router = factory();
        if (router) {
          this.routers.set(key, router);
        }
      } catch (error) {
        console.warn(`Failed to create ${key} router:`, error.message);
        return null;
      }
    }
    return this.routers.get(key);
  }

  createFallbackMetricsRouter() {
    const router = express.Router();
    router.get("/metrics", (req, res) => {
      res.status(503).json({ error: "Metrics service unavailable" });
    });
    return router;
  }

  createHealthRouter() {
    const router = express.Router();

    // Main health endpoint - accessible via /api/health
    router.get("/api/health", async (req, res) => {
      try {
        const health = await this.healthChecker.checkApplicationHealth();
        const response = {
          health: health.healthy ? "OK" : "ERROR",
          status: health.healthy ? "healthy" : "unhealthy",
          message: `Current Version is ${process.env.CURRENT_VERSION || "unknown"}`,
          role: health.role,
          services: health.services?.length || 0,
          controllers: health.controllers?.length || 0,
          database: health.database?.status || "unknown",
          timestamp: health.timestamp,
        };

        if (!health.healthy) {
          response.error = health.error;
        }

        res.status(health.healthy ? 200 : 503).json(response);
      } catch (error) {
        res.status(503).json({
          health: "ERROR",
          status: "unhealthy",
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Detailed health endpoint
    router.get("/api/health/detailed", async (req, res) => {
      const health = await this.healthChecker.checkApplicationHealth();
      res.status(health.healthy ? 200 : 503).json({
        status: health.healthy ? "healthy" : "unhealthy",
        ...health,
      });
    });

    // Kubernetes readiness probe
    router.get("/ready", async (req, res) => {
      try {
        const isReady = await checkReadiness();
        res.status(isReady ? 200 : 503).json({
          ready: isReady,
          timestamp: new Date().toISOString(),
          role: process.env.SERVER_ROLE,
        });
      } catch (error) {
        res.status(503).json({
          ready: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Kubernetes liveness probe
    router.get("/live", async (req, res) => {
      try {
        const isAlive = await checkLiveness();
        res.status(isAlive ? 200 : 503).json({
          alive: isAlive,
          timestamp: new Date().toISOString(),
          role: process.env.SERVER_ROLE,
        });
      } catch (error) {
        res.status(503).json({
          alive: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Comprehensive status endpoint
    router.get("/status", async (req, res) => {
      const health = await this.healthChecker.checkApplicationHealth();
      const status = {
        application: {
          status: this.container.initialized ? "running" : "initializing",
          role: process.env.SERVER_ROLE,
          version: process.env.CURRENT_VERSION || "unknown",
          services: health.services,
          controllers: health.controllers,
        },
        database: health.database,
        kubernetes: {
          ready: await checkReadiness(),
          alive: await checkLiveness(),
        },
        timestamp: health.timestamp,
      };

      res.status(health.healthy ? 200 : 503).json(status);
    });

    // Health endpoint with metrics (if available)
    if (
      this.container.has("metrics") &&
      this.container.hasController("metrics")
    ) {
      router.get("/api/health/metrics", async (req, res) => {
        try {
          const metricsController = this.container.getController("metrics");
          await metricsController.getHealthWithMetrics(req, res);
        } catch (error) {
          res.status(500).json({
            status: "unhealthy",
            service: "metrics",
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    router.use((err, req, res, next) => {
      console.error("Health router error:", req.originalUrl, err);
      res.status(500).json({ 
        health: "ERROR",
        status: "unhealthy",
        error: err.message || "Internal Server Error",
        timestamp: new Date().toISOString(),
      });
    });

    return router;
  }

  createFeatureRouter(featureName) {
    const featureRouteMap = {
      abtest: {
        factory: createABTestRoutes,
        controller: "abtest",
      },
      alert: {
        factory: createAlertRoutes,
        controller: "alert",
      },
      analytics: {
        factory: createAnalyticsRoutes,
        controller: "analytics",
      },
      auth: {
        factory: createAuthRoutes,
        controller: "auth",
      },
      balanceModel: {
        factory: createBalanceModelRoutes,
        controller: "balanceModel",
      },
      clustering: {
        factory: createClusteringRoutes,
        controller: "clustering",
      },
      customDashboard: {
        factory: createCustomDashboardRoutes,
        controller: "customDashboard",
      },
      deployment: {
        factory: createDeploymentRoutes,
        controller: "deployment",
      },
      flow: {
        factory: createFlowRoutes,
        controller: "flow",
      },
      gameEvent: {
        factory: createGameEventRoutes,
        controller: "gameEvent",
      },
      localization: {
        factory: createLocalizationRoutes,
        controller: "localization",
      },
      node: {
        factory: createNodeRoutes,
        controller: "node",
      },
      offer: {
        factory: createOfferRoutes,
        controller: "offer",
      },
      organization: {
        factory: createOrganizationRoutes,
        controller: "organization",
      },
      profileComposition: {
        factory: createProfileCompositionRoutes,
        controller: "profileComposition",
      },
      pushCampaign: {
        factory: createPushCampaignRoutes,
        controller: "pushCampaign",
      },
      segment: {
        factory: createSegmentRoutes,
        controller: "segment",
      },
      utility: {
        factory: createUtilityRoutes,
        controller: null, // Special case - doesn't need controller
      },
      warehouse: {
        factory: createWarehouseRoutes,
        controller: "warehouse",
      },
      analyticsQueries: {
        factory: createAnalyticsQueriesRoutes,
        controller: "analyticsQueries",
      },
    };

    const config = featureRouteMap[featureName];
    if (!config) return null;

    // Check if required controller exists (skip for utility routes)
    if (config.controller && !this.container.hasController(config.controller)) {
      console.warn(
        `Controller '${config.controller}' not found for feature '${featureName}'`
      );
      return null;
    }

    try {
      return config.factory(this.container);
    } catch (error) {
      console.warn(`Failed to create ${featureName} router:`, error.message);
      return null;
    }
  }

  mountRouters(app, config = {}) {
    const {
      webPath = "/",
      kubePath = "/kube", 
      healthPath = "/", // Mount health router at root so /api/health works
      enableRootMetrics = true,
    } = config;

    if (enableRootMetrics) {
      this.mountRootMetrics(app);
    }
    this.mountKubernetesProbes(app);

    const mainRouters = [
      [webPath, this.getWebRouter()],
      [kubePath, this.getKubernetesRouter()],
      [healthPath, this.getHealthRouter()], // This makes /api/health accessible
    ];

    mainRouters.forEach(([path, router]) => {
      if (router) {
        app.use(path, router);
        console.log(`Mounted router at: ${path}`);
      }
    });

    console.log(`Successfully mounted ${this.routers.size} router groups`);
  }

  mountRootMetrics(app) {
    app.get("/metrics", async (req, res) => {
      try {
        if (this.container.hasController("metrics")) {
          const metricsController = this.container.getController("metrics");
          await metricsController.getMetrics(req, res);
        } else {
          res.status(503).json({ error: "Metrics service unavailable" });
        }
      } catch (error) {
        res.status(503).json({ error: "Metrics service unavailable" });
      }
    });
  }

  mountKubernetesProbes(app) {
    // Mount Kubernetes health probes at standard locations
    app.get("/health/ready", async (req, res) => {
      try {
        const isReady = await checkReadiness();
        res.status(isReady ? 200 : 503).json({
          ready: isReady,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(503).json({ ready: false, error: error.message });
      }
    });

    app.get("/health/live", async (req, res) => {
      try {
        const isAlive = await checkLiveness();
        res.status(isAlive ? 200 : 503).json({
          alive: isAlive,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        res.status(503).json({ alive: false, error: error.message });
      }
    });
  }

  getRouterStats() {
    return {
      totalRouters: this.routers.size,
      routerNames: Array.from(this.routers.keys()),
      containerServices: this.container.services.size,
      containerControllers: this.container.controllers?.size || 0,
      hasMetrics: this.container.has("metrics"),
      metricsController: this.container.hasController?.("metrics") || false,
    };
  }

  async getRoutersHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      routers: {},
      overall: "healthy",
    };

    for (const [name] of this.routers.entries()) {
      try {
        health.routers[name] = { status: "available" };
      } catch (error) {
        health.routers[name] = { status: "error", error: error.message };
        health.overall = "degraded";
      }
    }

    return health;
  }
}

export function createRouterManager(container) {
  return new RouterManager(container);
}