export class HealthChecker {
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
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkReadiness() {
    const health = await this.checkApplicationHealth();
    return health.healthy;
  }

  async checkLiveness() {
    // Basic liveness check - container is alive if it can respond
    return this.container.initialized;
  }
}