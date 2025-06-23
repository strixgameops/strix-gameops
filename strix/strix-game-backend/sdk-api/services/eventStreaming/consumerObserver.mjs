export class ConsumerObserver {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.registeredConsumers = new Map(); // service -> consumers[]
    this.observerInterval = null;
    this.isObserving = false;
    this.metricsService = null;
  }

  async initialize() {
    this.metricsService = this.moduleContainer.get("metrics");
    console.log("ConsumerObserver initialized");
  }

  // Register consumers from a service
  registerConsumers(serviceName, consumers) {
    this.registeredConsumers.set(serviceName, consumers);
    console.log(`Registered ${consumers.length} consumers from ${serviceName}`);
  }

  // Unregister consumers from a service
  unregisterConsumers(serviceName) {
    if (this.registeredConsumers.has(serviceName)) {
      this.registeredConsumers.delete(serviceName);
      console.log(`Unregistered consumers from ${serviceName}`);
    }
  }

  // Get current consumer statistics
  getConsumerStats() {
    const stats = {
      totalServices: this.registeredConsumers.size,
      totalConsumers: 0,
      connectedConsumers: 0,
      disconnectedConsumers: 0,
      serviceBreakdown: {},
    };

    for (const [serviceName, consumers] of this.registeredConsumers) {
      const serviceStats = {
        total: consumers.length,
        connected: 0,
        disconnected: 0,
      };

      consumers.forEach((consumerWrapper) => {
        const isConnected = this.isConsumerConnected(consumerWrapper);
        if (isConnected) {
          serviceStats.connected++;
          stats.connectedConsumers++;
        } else {
          serviceStats.disconnected++;
          stats.disconnectedConsumers++;
        }
      });

      stats.totalConsumers += serviceStats.total;
      stats.serviceBreakdown[serviceName] = serviceStats;
    }

    return stats;
  }

  // Check if a consumer is connected (handles different consumer types)
  isConsumerConnected(consumerWrapper) {
    if (
      consumerWrapper.consumer &&
      typeof consumerWrapper.consumer.isConnected === "function"
    ) {
      return consumerWrapper.consumer.isConnected();
    }

    // Handle direct consumer objects
    if (typeof consumerWrapper.isConnected === "function") {
      return consumerWrapper.isConnected();
    }

    // Handle objects with connected property
    if (typeof consumerWrapper.connected === "boolean") {
      return consumerWrapper.connected;
    }

    // Default to false if we can't determine status
    return false;
  }

  // Shutdown and cleanup
  async shutdown() {
    this.registeredConsumers.clear();
    console.log("ConsumerObserver shut down");
  }
}
