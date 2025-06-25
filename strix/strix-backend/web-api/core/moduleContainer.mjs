import { DatabaseService } from "../services/database/databaseService.mjs";
import { AuthService } from "../services/features/authService.mjs";
import { UtilityService } from "../services/utilityService.mjs";
import { SegmentService } from "../services/features/segmentsService.mjs";
import { ContentCacherService } from "../services/contentCacherService.mjs";
import { MetricsService } from "../services/logging/metricsService.mjs";

// Core Feature Services (always loaded)
import { AlertService } from "../services/features/alertService.mjs";
import { AnalyticsService } from "../services/features/analyticsService.mjs";
import { OrganizationService } from "../services/features/organizationService.mjs";
import { LoggingService } from "../services/features/loggingService.mjs";

// Other Core Services
import { SharedFetchService } from "../services/sharedService.mjs";
import { FileStorageService } from "../services/other/fileStorageService.mjs";

export class ModuleContainer {
  constructor() {
    this.services = new Map();
    this.optionalServices = new Map();
    this.controllers = new Map();
    this.optionalControllers = new Map();
    this.initialized = false;
  }

  async initialize(serverRole) {
    if (this.initialized) return this;

    console.log(`Initializing modules for role: ${serverRole}`);

    try {
      // Initialize services in dependency order
      await this.initializeCore();
      await this.initializeRoleBasedServices();
      await this.initializeOptionalServices();
      await this.initializeControllers();
      await this.initializeOptionalControllers();

      this.initialized = true;
      console.log(
        `Successfully initialized ${this.services.size} core services, ${this.optionalServices.size} optional services, ${this.controllers.size} controllers, and ${this.optionalControllers.size} optional controllers`
      );

      return this;
    } catch (error) {
      console.error("Module initialization failed:", error);
      await this.shutdown();
      throw error;
    }
  }

  async initializeCore() {
    // Core services needed by most modules
    this.services.set("database", new DatabaseService(this));
    await this.services.get("database").initialize();
  }

  async initializeRoleBasedServices() {
    const serviceMap = {
      // Core services that are always required
      auth: AuthService,
      segments: SegmentService,
      contentCacher: ContentCacherService,
      metrics: MetricsService,
      alert: AlertService,
      analytics: AnalyticsService,
      organization: OrganizationService,
      logging: LoggingService,
      utility: UtilityService,
      sharedFunctions: SharedFetchService,
      fileStorage: FileStorageService,
    };

    // Initialize required services
    for (const serviceName of Object.keys(serviceMap)) {
      if (!this.services.has(serviceName)) {
        const ServiceClass = serviceMap[serviceName];
        const service = new ServiceClass(this);
        this.services.set(serviceName, service);

        if (service.initialize) {
          await service.initialize();
        }
      }
    }
  }

  async initializeOptionalServices() {
    const optionalServiceConfigs = {
      // Advanced Feature services
      abtest: {
        import: () => import("../services/features/abtestService.mjs"),
      },
      alertManager: {
        import: () => import("../services/features/alertManagerService.mjs"),
      },
      balanceModel: {
        import: () => import("../services/features/balanceModelService.mjs"),
      },
      customDashboard: {
        import: () => import("../services/features/customDashboardService.mjs"),
      },
      deployment: {
        import: () => import("../services/features/deploymentService.mjs"),
      },
      gameEvent: {
        import: () => import("../services/features/gameEventService.mjs"),
      },
      localization: {
        import: () => import("../services/features/localizationService.mjs"),
      },
      node: {
        import: () => import("../services/features/nodeService.mjs"),
      },
      offer: {
        import: () => import("../services/features/offerService.mjs"),
      },
      profileComposition: {
        import: () =>
          import("../services/features/profileCompositionService.mjs"),
      },
      warehouse: {
        import: () => import("../services/features/warehouseService.mjs"),
      },

      // Analytics Services
      abtestAnalytics: {
        import: () =>
          import("../services/analytics/abtestsAnalyticsService.mjs"),
        dependencies: ["abtest"],
      },
      behaviorAnalytics: {
        import: () =>
          import("../services/analytics/behaviorAnalyticsService.mjs"),
      },
      coreAnalytics: {
        import: () => import("../services/analytics/coreAnalyticsService.mjs"),
      },
      customAnalytics: {
        import: () =>
          import("../services/analytics/customAnalyticsService.mjs"),
      },
      economyAnalytics: {
        import: () =>
          import("../services/analytics/economyAnalyticsService.mjs"),
      },
      overviewAnalytics: {
        import: () =>
          import("../services/analytics/overviewAnalyticsService.mjs"),
      },
      paymentsAnalytics: {
        import: () =>
          import("../services/analytics/paymentsAnalyticsService.mjs"),
      },
      usersAnalytics: {
        import: () => import("../services/analytics/usersAnalyticsService.mjs"),
      },

      // Other Services
      contentCooking: {
        import: () => import("../services/other/contentCookingService.mjs"),
      },
      googlePlay: {
        import: () =>
          import("../services/other/enterprise/googlePlayService.mjs"),
      },
      scheduledTasks: {
        import: () => import("../services/other/scheduledTasksService.mjs"),
      },
      demoGeneration: {
        import: () => import("../services/demo/demoGenerationService.mjs"),
      },

      // Enterprise services
      flow: {
        import: () => import("../services/features/enterprise/flowService.mjs"),
      },
      pushCampaign: {
        import: () =>
          import("../services/features/enterprise/pushCampaignService.mjs"),
      },
      balanceModelFull: {
        import: () =>
          import(
            "../services/features/enterprise/balanceModelService_full.mjs"
          ),
      },
      offerFull: {
        import: () =>
          import("../services/features/enterprise/offerService_full.mjs"),
      },
      organizationFull: {
        import: () =>
          import(
            "../services/features/enterprise/organizationsService_full.mjs"
          ),
      },
      clustering: {
        import: () =>
          import("../services/features/enterprise/clusteringService.mjs"),
      },
      businessUtility: {
        import: () => import("../services/enterprise/businessUtilities.mjs"),
      },
      contentCookingFull: {
        import: () => import("../services/other/enterprise/contentCookingService_full.mjs"),
      },
    };

    await this.loadOptionalServices(optionalServiceConfigs);
  }

  async loadOptionalServices(serviceConfigs) {
    for (const [name, config] of Object.entries(serviceConfigs)) {
      try {
        const module = await config.import();
        const ServiceClass = module.default || module[Object.keys(module)[0]];

        const service = new ServiceClass(this);
        this.optionalServices.set(name, service);

        if (service.initialize) {
          await service.initialize();
        }

        console.log(`Initialized optional service: ${name}`);
      } catch (error) {
        console.info(
          `Failed to initialize optional service ${name}: ${error.message}`
        );
      }
    }
  }

  async initializeControllers() {
    const controllerConfigs = {
      abtest: {
        import: () => import("../controllers/features/abtestController.mjs"),
        dependencies: ["abtest", "utility", "analytics"],
      },
      alert: {
        import: () => import("../controllers/features/alertController.mjs"),
        dependencies: ["alert"],
      },
      analytics: {
        import: () => import("../controllers/features/analyticsController.mjs"),
        dependencies: ["analytics", "clustering", "utility"],
      },
      auth: {
        import: () => import("../controllers/features/authController.mjs"),
        dependencies: ["auth", "utility", "organization"],
      },
      balanceModel: {
        import: () =>
          import("../controllers/features/balanceModelController.mjs"),
        dependencies: ["balanceModel"],
      },
      customDashboard: {
        import: () =>
          import("../controllers/features/customDashboardController.mjs"),
        dependencies: ["customDashboard"],
      },
      deployment: {
        import: () =>
          import("../controllers/features/deploymentController.mjs"),
        dependencies: ["deployment", "utility", "logging"],
      },
      gameEvent: {
        import: () => import("../controllers/features/gameEventController.mjs"),
        dependencies: ["gameEvent"],
      },
      localization: {
        import: () =>
          import("../controllers/features/localizationController.mjs"),
        dependencies: ["localization", "logging"],
      },
      metrics: {
        import: () => import("../controllers/logging/metricsController.mjs"),
        dependencies: ["metrics"],
      },
      node: {
        import: () => import("../controllers/features/nodeController.mjs"),
        dependencies: ["node"],
      },
      offer: {
        import: () => import("../controllers/features/offerController.mjs"),
        dependencies: ["offer"],
      },
      organization: {
        import: () =>
          import("../controllers/features/organizationController.mjs"),
        dependencies: ["organization", "auth"],
      },
      profileComposition: {
        import: () =>
          import("../controllers/features/profileCompositionController.mjs"),
        dependencies: ["profileComposition"],
      },
      segment: {
        import: () => import("../controllers/features/segmentController.mjs"),
        dependencies: ["segments", "contentCacher"],
      },
      warehouse: {
        import: () => import("../controllers/features/warehouseController.mjs"),
        dependencies: ["warehouse"],
      },
      analyticsQueries: {
        import: () =>
          import("../controllers/analytics/analyticsController.mjs"),
        dependencies: [
          "utility",
          "abtestAnalytics",
          "behaviorAnalytics",
          "coreAnalytics",
          "customAnalytics",
          "economyAnalytics",
          "overviewAnalytics",
          "paymentsAnalytics",
          "usersAnalytics",
        ],
      },
    };

    await this.loadControllers(controllerConfigs, this.controllers);
  }

  // Initialize optional controllers that can be safely missing
  async initializeOptionalControllers() {
    const optionalControllerConfigs = {
      balanceModelFull: {
        import: () =>
          import(
            "../controllers/features/enterprise/balanceModelController_full.mjs"
          ),
        dependencies: ["balanceModelFull"],
      },
      flow: {
        import: () =>
          import("../controllers/features/enterprise/flowController.mjs"),
        dependencies: ["flow"],
      },
      clustering: {
        import: () =>
          import("../controllers/features/enterprise/clusteringController.mjs"),
        dependencies: ["clustering"],
      },
      organizationFull: {
        import: () =>
          import(
            "../controllers/features/enterprise/organizationsController_full.mjs"
          ),
        dependencies: ["organizationFull", "auth"],
      },
      pushCampaign: {
        import: () =>
          import(
            "../controllers/features/enterprise/pushCampaignController.mjs"
          ),
        dependencies: ["pushCampaign"],
      },
      offerFull: {
        import: () =>
          import("../controllers/features/enterprise/offerController_full.mjs"),
        dependencies: ["offerFull"],
      },
      
    };

    await this.loadControllers(
      optionalControllerConfigs,
      this.optionalControllers,
      true
    );
  }

  async loadControllers(controllerConfigs, targetMap, isOptional = false) {
    for (const [name, config] of Object.entries(controllerConfigs)) {
      try {
        const module = await config.import();
        const ControllerClass =
          module.default || module[Object.keys(module)[0]];

        // Get service instances from both core and optional services
        // Pass null for missing dependencies instead of skipping
        const serviceInstances = config.dependencies.map((dep) => {
          let service = this.services.get(dep);
          if (!service) {
            service = this.optionalServices.get(dep);
          }
          if (!service) {
            console.warn(
              `Service '${dep}' not found for controller '${name}' - passing null`
            );
            return null;
          }
          return service;
        });

        // Create controller with proper dependency injection (including nulls)
        const controller = new ControllerClass(...serviceInstances);
        targetMap.set(name, controller);

        const controllerType = isOptional
          ? "optional controller"
          : "controller";
        console.log(`Initialized ${controllerType}: ${name}`);
      } catch (error) {
        const message = `Failed to initialize ${
          isOptional ? "optional " : ""
        }controller ${name}: ${error.message}`;
        if (isOptional) {
          console.info(message);
        } else {
          console.error(message);
        }
      }
    }
  }

  get(serviceName) {
    let service = this.services.get(serviceName);
    if (!service) {
      service = this.optionalServices.get(serviceName);
    }
    if (!service) {
      throw new Error(`Service '${serviceName}' not found or not initialized`);
    }
    return service;
  }

  getController(controllerName) {
    const controller = this.controllers.get(controllerName);
    if (!controller) {
      throw new Error(
        `Controller '${controllerName}' not found or not initialized`
      );
    }
    return controller;
  }

  // Get optional controller with graceful handling
  getOptionalController(controllerName) {
    return this.optionalControllers.get(controllerName) || null;
  }

  // Get optional service with graceful handling
  getOptionalService(serviceName) {
    return this.optionalServices.get(serviceName) || null;
  }

  has(serviceName) {
    return (
      this.services.has(serviceName) || this.optionalServices.has(serviceName)
    );
  }

  hasController(controllerName) {
    return this.controllers.has(controllerName);
  }

  // Check if optional controller is available
  hasOptionalController(controllerName) {
    return this.optionalControllers.has(controllerName);
  }

  // Check if optional service is available
  hasOptionalService(serviceName) {
    return this.optionalServices.has(serviceName);
  }

  async shutdown() {
    console.log("Shutting down module container...");

    // Shutdown optional services first, then core services
    const optionalServiceEntries = Array.from(
      this.optionalServices.entries()
    ).reverse();
    const serviceEntries = Array.from(this.services.entries()).reverse();

    for (const [name, service] of [
      ...optionalServiceEntries,
      ...serviceEntries,
    ]) {
      try {
        if (service.shutdown) {
          await service.shutdown();
        }
      } catch (error) {
        console.error(`Error shutting down service ${name}:`, error);
      }
    }

    this.services.clear();
    this.optionalServices.clear();
    this.controllers.clear();
    this.optionalControllers.clear();
    this.initialized = false;
  }

  // Helper method to get multiple services (from both core and optional)
  getServices(...serviceNames) {
    return serviceNames.reduce((acc, name) => {
      acc[name] = this.get(name);
      return acc;
    }, {});
  }

  // Helper method to get multiple controllers
  getControllers(...controllerNames) {
    return controllerNames.reduce((acc, name) => {
      acc[name] = this.getController(name);
      return acc;
    }, {});
  }

  // Helper method to get multiple optional controllers
  getOptionalControllers(...controllerNames) {
    return controllerNames.reduce((acc, name) => {
      const controller = this.getOptionalController(name);
      if (controller) {
        acc[name] = controller;
      }
      return acc;
    }, {});
  }

  // Helper method to get multiple optional services
  getOptionalServices(...serviceNames) {
    return serviceNames.reduce((acc, name) => {
      const service = this.getOptionalService(name);
      if (service) {
        acc[name] = service;
      }
      return acc;
    }, {});
  }

  // Get all available services (core + optional) for debugging
  getAllServices() {
    return {
      core: Array.from(this.services.keys()),
      optional: Array.from(this.optionalServices.keys()),
    };
  }

  // Get all available controllers (core + optional) for debugging
  getAllControllers() {
    return {
      core: Array.from(this.controllers.keys()),
      optional: Array.from(this.optionalControllers.keys()),
    };
  }
}

export async function createModuleContainer(serverRole) {
  const container = new ModuleContainer();
  await container.initialize(serverRole);
  return container;
}
