export class ProbesService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.podIsReady = false;
    this.podIsAlive = false;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    this.consumersService = this.moduleContainer.get("consumer");
    this.consumerObserver = this.moduleContainer.get("consumerObserver");
    this.ingestersService = this.moduleContainer.get("ingester");

    // Start periodic health checks
    this.startHealthChecks();
    this.initialized = true;
    console.log("ProbesService initialized");
  }

  startHealthChecks() {
    this.consumersService.consumers.length;
    // Check consumers amount every 1 second
    setInterval(async () => {
      this.consumerObserver.getConsumerStats().connectedConsumers =
        this.consumersService.consumers.length +
        this.ingestersService.consumers.length;
    }, 1000);

    // Check readiness every 5 seconds
    setInterval(async () => {
      this.podIsReady = await this.checkReadiness();
    }, 5000);

    // Check liveness every 10 seconds
    setInterval(async () => {
      this.podIsAlive = await this.checkLiveness();
    }, 10000);
  }

  async checkReadiness() {
    try {
      const serverRole = process.env.SERVER_ROLE;

      // Check role-specific consumer requirements
      if (!this.checkConsumerRequirements(serverRole)) {
        return false;
      }

      // Check database connections
      if (!(await this.checkDatabaseConnections())) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Readiness check failed:", error);
      return false;
    }
  }

  async checkLiveness() {
    try {
      // Basic liveness checks
      if (!(await this.checkDatabaseConnections())) {
        return false;
      }

      // Check if core services are responsive
      if (!this.checkCoreServices()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Liveness check failed:", error);
      return false;
    }
  }

  checkConsumerRequirements(serverRole) {
    const expectedConsumers = this.getExpectedConsumers(serverRole);

    if (expectedConsumers === null) {
      return true; // No consumer requirements for this role
    }

    if (this.consumerObserver.getConsumerStats().connectedConsumers !== expectedConsumers) {
      console.log(
        `Consumers mismatch. Got ${this.consumerObserver.getConsumerStats().connectedConsumers} instead of ${expectedConsumers}`
      );
      return false;
    }

    return true;
  }

  getExpectedConsumers(serverRole) {
    switch (serverRole) {
      case "analytics":
        return parseInt(process.env.EVENTS_PULSAR_LISTENERS) || 0;
      case "ingester":
        return parseInt(process.env.INGESTER_PULSAR_LISTENERS) || 0;
      case "messenger":
        return 3;
      default:
        return null; // No consumer requirements
    }
  }

  async checkDatabaseConnections() {
    try {
      const databaseService = this.moduleContainer.get("database");

      // Check MongoDB connection
      if (!databaseService.isMongoConnected()) {
        console.log("MongoDB is not connected");
        return false;
      }

      // Check PostgreSQL connection
      if (!databaseService.checkPGConnection()) {
        console.log("PostgreSQL is not connected");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Database connection check failed:", error);
      return false;
    }
  }

  checkCoreServices() {
    try {
      // Check if utility service is available
      const utilityService = this.moduleContainer.get("utility");
      if (!utilityService) {
        return false;
      }

      // Check if metrics service is available
      const metricsService = this.moduleContainer.get("metrics");
      if (!metricsService) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Core services check failed:", error);
      return false;
    }
  }

  getStatus() {
    return {
      ready: this.podIsReady,
      alive: this.podIsAlive,
      consumers: this.consumerObserver.getConsumerStats().connectedConsumers,
      serverRole: process.env.SERVER_ROLE,
    };
  }

  async shutdown() {
    console.log("Shutting down ProbesService...");
    this.initialized = false;
  }
}
