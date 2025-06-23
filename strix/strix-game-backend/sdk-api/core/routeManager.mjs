export class RouteManager {
  constructor(moduleContainer) {
    this.container = moduleContainer;
    this.controllers = {};
  }

  async initialize(app, serverRole) {
    console.log(`Setting up routes for role: ${serverRole}`);

    // Initialize controllers based on role
    await this.initializeControllers(serverRole);

    const rolesToLoad =
      serverRole === "development"
        ? Object.keys(this.getRouteConfigs())
        : [serverRole];

    for (const role of rolesToLoad) {
      await this.setupRoleRoutes(app, role);
      console.log(`Loaded routes for role: ${role}`);
    }

    // Always add health and probe endpoints
    this.setupProbeRoutes(app);
  }

  async initializeControllers(serverRole) {
    const controllerMap = {
      analytics: ["analytics", "iap"],
      cacher: ["cacher"],
      deploy: ["deployment"],
      liveops: ["warehouse", "inventory"],
      geocoder: ["geo"],
      notificator: ["push"],
      messenger: ["push"],
      development: [
        "analytics",
        "cacher",
        "deployment",
        "warehouse",
        "inventory",
        "push",
        "geo",
        "iap",
        "other",
      ],
    };

    const controllersToLoad =
      serverRole === "development"
        ? controllerMap.development
        : controllerMap[serverRole] || [];

    for (const controllerName of controllersToLoad) {
      // Check core controllers first
      if (this.container.hasController(controllerName)) {
        this.controllers[controllerName] =
          this.container.getController(controllerName);
        console.log(`Loaded core controller: ${controllerName}`);
      }
      // Check optional controllers
      else if (this.container.hasOptionalController(controllerName)) {
        this.controllers[controllerName] =
          this.container.getOptionalController(controllerName);
        console.log(`Loaded optional controller: ${controllerName}`);
      } else {
        console.warn(
          `Controller '${controllerName}' not available for role '${serverRole}'`
        );
      }
    }
  }

  getRouteConfigs() {
    return {
      analytics: [
        {
          method: "post",
          path: "/sdk/api/analytics/v1/sendEvent",
          handler: () =>
            this.controllers.analytics?.sendEvent?.bind(
              this.controllers.analytics
            ),
          controller: "analytics",
        },
        {
          method: "post",
          path: "/sdk/api/analytics/validateReceipt",
          handler: () =>
            this.controllers.iap?.validateReceipt?.bind(this.controllers.iap),
          controller: "iap",
        },
      ],
      cacher: [
        {
          method: "post",
          path: "/sdk/api/cacher/recalculateSegment",
          handler: () =>
            this.controllers.cacher?.recalculateSegment?.bind(
              this.controllers.cacher
            ),
          controller: "cacher",
        },
        {
          method: "post",
          path: "/sdk/api/cacher/updateCall",
          handler: () =>
            this.controllers.cacher?.updateCall?.bind(this.controllers.cacher),
          controller: "cacher",
        },
        {
          method: "post",
          path: "/sdk/api/cacher/populateStudioDB",
          handler: () =>
            this.controllers.cacher?.populateStudioDB?.bind(
              this.controllers.cacher
            ),
          controller: "cacher",
        },
      ],
      deploy: [
        {
          method: "post",
          path: "/sdk/api/deployment/sdkCheck",
          handler: () =>
            this.controllers.deployment?.sdkCheck?.bind(
              this.controllers.deployment
            ),
          controller: "deployment",
        },
        {
          method: "post",
          path: "/sdk/api/deployment/v1/checksumCheckup",
          handler: () =>
            this.controllers.deployment?.checksumCheckup?.bind(
              this.controllers.deployment
            ),
          controller: "deployment",
        },
        {
          method: "post",
          path: "/sdk/api/deployment/v1/clientUpdate",
          handler: () =>
            this.controllers.deployment?.clientUpdate?.bind(
              this.controllers.deployment
            ),
          controller: "deployment",
        },
        {
          method: "post",
          path: "/sdk/api/deployment/v1/regToken",
          handler: () =>
            this.controllers.deployment?.regToken?.bind(
              this.controllers.deployment
            ),
          controller: "deployment",
        },
        {
          method: "post",
          path: "/sdk/api/deployment/v1/init",
          handler: () =>
            this.controllers.deployment?.init?.bind(
              this.controllers.deployment
            ),
          controller: "deployment",
        },
      ],
      liveops: [
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/backendAction",
          handler: () =>
            this.controllers.warehouse?.backendAction?.bind(
              this.controllers.warehouse
            ),
          controller: "warehouse",
        },
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/addValueToStatisticElement",
          handler: () =>
            this.controllers.warehouse?.addValueToStatisticElement?.bind(
              this.controllers.warehouse
            ),
          controller: "warehouse",
        },
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/subtractValueFromStatisticElement",
          handler: () =>
            this.controllers.warehouse?.subtractValueFromStatisticElement?.bind(
              this.controllers.warehouse
            ),
          controller: "warehouse",
        },
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/setValueToStatisticElement",
          handler: () =>
            this.controllers.warehouse?.setValueToStatisticElement?.bind(
              this.controllers.warehouse
            ),
          controller: "warehouse",
        },
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/getElementValue",
          handler: () =>
            this.controllers.warehouse?.getElementValue?.bind(
              this.controllers.warehouse
            ),
          controller: "warehouse",
        },
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/getLeaderboard",
          handler: () =>
            this.controllers.warehouse?.getLeaderboard?.bind(
              this.controllers.warehouse
            ),
          controller: "warehouse",
        },
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/setOfferExpiration",
          handler: () =>
            this.controllers.warehouse?.setOfferExpiration?.bind(
              this.controllers.warehouse
            ),
          controller: "warehouse",
        },
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/getInventoryItems",
          handler: () =>
            this.controllers.inventory?.getInventoryItems?.bind(
              this.controllers.inventory
            ),
          controller: "inventory",
        },
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/getInventoryItemAmount",
          handler: () =>
            this.controllers.inventory?.getInventoryItemAmount?.bind(
              this.controllers.inventory
            ),
          controller: "inventory",
        },
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/addInventoryItem",
          handler: () =>
            this.controllers.inventory?.addInventoryItem?.bind(
              this.controllers.inventory
            ),
          controller: "inventory",
        },
        {
          method: "post",
          path: "/sdk/api/liveservices/v1/removeInventoryItem",
          handler: () =>
            this.controllers.inventory?.removeInventoryItem?.bind(
              this.controllers.inventory
            ),
          controller: "inventory",
        },
        {
          method: "get",
          path: "/sdk/api/liveservices/health",
          handler: () => this.healthHandler.bind(this),
          controller: null, // Built-in handler
        },
      ],
      geocoder: [
        {
          method: "post",
          path: "/sdk/api/geocoder/getGeoData",
          handler: () =>
            this.controllers.geo?.getGeoData?.bind(this.controllers.geo),
          controller: "geo",
        },
      ],
      notificator: [
        {
          method: "post",
          path: "/sdk/api/notificator/testSendPushNotification",
          handler: () =>
            this.controllers.push?.testSendPushNotification?.bind(
              this.controllers.push
            ),
          controller: "push",
        },
      ],
      messenger: [
        // No routes defined yet for messenger
      ],
    };
  }

  async setupRoleRoutes(app, role) {
    const routeConfigs = this.getRouteConfigs();
    const routes = routeConfigs[role];
    if (!routes) return;

    for (const route of routes) {
      try {
        const handler = route.handler();
        if (!handler) {
          const controllerInfo = route.controller
            ? ` (controller: ${route.controller})`
            : "";
          console.warn(
            `Handler not available for ${route.method.toUpperCase()} ${
              route.path
            }${controllerInfo}`
          );
          continue;
        }

        app[route.method](route.path, handler);
        console.log(`Registered ${route.method.toUpperCase()} ${route.path}`);
      } catch (error) {
        console.error(
          `Failed to register route ${route.method} ${route.path}:`,
          error.message
        );
      }
    }
  }

  setupProbeRoutes(app) {
    // Kubernetes probe endpoints
    app.get("/kube/pod/isReady", this.readinessHandler.bind(this));
    app.get("/kube/pod/isAlive", this.livenessHandler.bind(this));
    app.get("/api/health", this.healthHandler.bind(this));

    console.log(
      "Registered probe endpoints: /kube/pod/isReady, /kube/pod/isAlive, /api/health"
    );
  }

  // Built-in handlers
  healthHandler = async (req, res) => {
    res.json({
      health: "OK.",
      message: `Current Version is ${process.env.CURRENT_VERSION}`,
    });
  };

  readinessHandler = async (req, res) => {
    try {
      const probesService = this.container.get("probes");
      const isReady = await probesService.checkReadiness();

      if (isReady) {
        res.status(200).json({ status: "ready" });
      } else {
        res.status(503).json({ status: "not ready" });
      }
    } catch (error) {
      console.error("Readiness check failed:", error);
      res.status(503).json({ status: "error", message: error.message });
    }
  };

  livenessHandler = async (req, res) => {
    try {
      const probesService = this.container.get("probes");
      const isAlive = await probesService.checkLiveness();

      if (isAlive) {
        res.status(200).json({ status: "alive" });
      } else {
        res.status(503).json({ status: "not alive" });
      }
    } catch (error) {
      console.error("Liveness check failed:", error);
      res.status(503).json({ status: "error", message: error.message });
    }
  };
}
