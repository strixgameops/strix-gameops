// Core Services
import { DatabaseService } from "../services/database/databaseService.mjs";
import { DatabaseTablesService } from "../services/database/databaseTablesService.mjs";
import { PopulatorService } from "../services/database/populatorService.mjs";

// Event Streaming
import { QueueService } from "../services/eventStreaming/queueService.mjs";
import { ConsumerService } from "../services/eventStreaming/consumerService.mjs";
import { IngesterService } from "../services/eventStreaming/ingesterService.mjs";

// Feature Services
import { ABTestService } from "../services/features/abTestService.mjs";
import { AnalyticsService } from "../services/features/analyticsEventService.mjs";
import { DeploymentService } from "../services/features/deploymentService.mjs";
import { InventoryService } from "../services/features/inventoryService.mjs";
import { SegmentService } from "../services/features/segmentService.mjs";
import { UtilityService } from "../services/features/utilityService.mjs";
import { WarehouseService } from "../services/features/warehouseService.mjs";

// Other Services
import { CacherService } from "../services/contentCacherService.mjs";
import { GeoliteService } from "../services/geolite/geoliteService.mjs";
import { ProbesService } from "../services/kubernetes/probes.mjs";
import { CrashlyticsService } from "../services/logging/crashlyticsHandler.mjs";
import { ConsumerObserver } from "../services/eventStreaming/consumerObserver.mjs";

// Metrics Services
import { MetricsService } from "../services/metrics/metricsService.mjs";

export class ModuleContainer {
  constructor() {
    this.services = new Map();
    this.optionalServices = new Map();
    this.controllers = new Map();
    this.optionalControllers = new Map();
    this.initialized = false;
    this.serverRole = null;
  }

  async initialize(serverRole) {
    if (this.initialized) return this;

    this.serverRole = serverRole;
    console.log(`Initializing modules for role: ${serverRole}`);

    try {
      await this.createCoreServices();
      await this.createRoleBasedServices();
      await this.createOptionalServices();
      await this.initializeAllServices();
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

  async createCoreServices() {
    // Create core services first
    this.services.set("database", new DatabaseService(this));
    this.services.set("databaseTables", new DatabaseTablesService(this));
    this.services.set("metrics", new MetricsService(this));
    this.services.set("probes", new ProbesService(this));
    this.services.set("crashlytics", new CrashlyticsService(this));
    this.services.set("utility", new UtilityService(this));
  }

  async createRoleBasedServices() {
    // Create core services that are always required
    const coreServices = this.getCoreServices();

    for (const { name, service: ServiceClass } of coreServices) {
      if (!this.services.has(name)) {
        try {
          const service = new ServiceClass(this);
          this.services.set(name, service);
          console.log(`Created core service: ${name}`);
        } catch (error) {
          console.error(`Failed to create core service ${name}:`, error);
          throw error;
        }
      }
    }
  }

  async createOptionalServices() {
    // Create optional services with error handling
    const optionalServiceConfigs = {
      fcm: {
        import: () => import("../services/enterprise/fcmBrokerService.mjs"),
      },
      iap: {
        import: () => import("../services/enterprise/iapValidationService.mjs"),
      },
      push: {
        import: () => import("../services/enterprise/pushService.mjs"),
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

        console.log(`Created optional service: ${name}`);
      } catch (error) {
        console.info(
          `Failed to create optional service ${name}: ${error.message}`
        );
      }
    }
  }

  getCoreServices() {
    return [
      { name: "cacher", service: CacherService },
      { name: "warehouse", service: WarehouseService },
      { name: "queue", service: QueueService },
      { name: "analytics", service: AnalyticsService },
      { name: "consumer", service: ConsumerService },
      { name: "segment", service: SegmentService },
      { name: "deployment", service: DeploymentService },
      { name: "populator", service: PopulatorService },
      { name: "abtest", service: ABTestService },
      { name: "inventory", service: InventoryService },
      { name: "ingester", service: IngesterService },
      { name: "geolite", service: GeoliteService },
      { name: "consumerObserver", service: ConsumerObserver },
    ];
  }

  async initializeAllServices() {
    // Initialize all core services
    for (const [name, service] of this.services) {
      if (service.initialize) {
        await service.initialize();
        console.log(`Initialized core service: ${name}`);
      }
    }

    // Initialize all optional services
    for (const [name, service] of this.optionalServices) {
      try {
        if (service.initialize) {
          await service.initialize();
          console.log(`Initialized optional service: ${name}`);
        }
      } catch (error) {
        console.error(`Failed to initialize optional service ${name}:`, error);
        // Remove failed service from optional services
        this.optionalServices.delete(name);
      }
    }
  }

  async initializeControllers() {
    const controllerConfigs = {
      analytics: {
        import: () => import("../controllers/analyticsEventsController.mjs"),
        dependencies: ["utility", "metrics", "analytics"],
        roles: ["analytics", "development"],
      },
      cacher: {
        import: () => import("../controllers/cacherController.mjs"),
        dependencies: [
          "utility",
          "metrics",
          "segment",
          "populator",
          "deployment",
        ],
        roles: ["cacher", "development"],
      },
      deployment: {
        import: () => import("../controllers/deploymentController.mjs"),
        dependencies: ["utility", "metrics", "deployment", "fcm", "warehouse"],
        roles: ["deploy", "development"],
      },
      inventory: {
        import: () => import("../controllers/inventoryController.mjs"),
        dependencies: ["utility", "metrics", "inventory"],
        roles: ["liveops", "development"],
      },
      warehouse: {
        import: () => import("../controllers/warehouseController.mjs"),
        dependencies: ["utility", "metrics", "warehouse"],
        roles: ["analytics", "cacher", "deploy", "liveops", "development"],
      },
      other: {
        import: () => import("../controllers/otherController.mjs"),
        dependencies: [],
        roles: ["analytics", "cacher", "deploy", "liveops", "development"],
      },
      geo: {
        import: () => import("../controllers/geoController.mjs"),
        dependencies: ["utility", "geolite"],
        roles: ["geocoder", "development"],
      },
    };

    await this.loadControllers(controllerConfigs, this.controllers);
  }

  async initializeOptionalControllers() {
    const optionalControllerConfigs = {
      iap: {
        import: () =>
          import("../controllers/enterprise/iapValidationController.mjs"),
        dependencies: ["utility", "metrics", "analytics", "iap"],
        roles: ["analytics", "development"],
      },
      push: {
        import: () => import("../controllers/enterprise/pushController.mjs"),
        dependencies: ["utility", "fcm"],
        roles: ["notificator", "messenger", "development"],
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
      // Skip if not needed for this role
      if (!config.roles.includes(this.serverRole)) {
        continue;
      }

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
              `Service '${dep}' not found for controller '${name}', passing null`
            );
            return null;
          }
          return service;
        });

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

  getServices(...serviceNames) {
    return serviceNames.reduce((acc, name) => {
      acc[name] = this.get(name);
      return acc;
    }, {});
  }

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
