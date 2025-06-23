import dotenv from "dotenv";
import { PulsarConsumer } from "./pulsar/classes.mjs";
dotenv.config();

export class ConsumerService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;

    this.consumers = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    this.consumerObserver = this.moduleContainer.get("consumerObserver");
    this.utilityService = this.moduleContainer.get("utility");
    this.metricsService = this.moduleContainer.get("metrics");
    this.analyticsEventService = this.moduleContainer.get("analytics");

    // Only initialize if we should run consumers
    if (!parseInt(process.env.EVENTS_PULSAR_LISTENERS)) {
      console.log(
        "Events Pulsar listeners disabled, skipping consumer initialization"
      );
      return;
    }

    await this.initializeEventConsumers();

    if (this.consumerObserver) {
      this.consumerObserver.registerConsumers("ConsumerService", this.consumers);
    }
    this.initialized = true;
    console.log("ConsumerService initialized");
  }

  async initializeEventConsumers() {
  const totalConsumers = parseInt(process.env.EVENTS_PULSAR_LISTENERS) || 0;
  const topic = process.env.PULSAR_PATH_ANALYTICS + "events";

  if (totalConsumers === 0 || isNaN(totalConsumers)) return;

  console.log(
    `Initializing ${totalConsumers} event consumers for topic: ${topic}`
  );

  // Create all consumers and collect their initialization promises
  const initPromises = [];
  for (let i = 0; i < totalConsumers; i++) {
    const consumer = new PulsarConsumer({
      topic: topic,
      subscriptionName: "events-processing",
      subscriptionType: "KeyShared",
      listenerAction: this.consumeAcquiredEvent.bind(this),
    });

    this.consumers.push(consumer);
    initPromises.push(consumer.init());
  }

  // Wait for all consumers to initialize simultaneously
  await Promise.all(initPromises);
}

  async consumeAcquiredEvent(msg, msgConsumer) {
    try {
      if (process.env.ENVIRONMENT === "staging") {
        console.log("Got event message from Pulsar");
        console.log(msg.getData().toString());
      }

      const parsed = JSON.parse(msg.getData().toString());
      const event = parsed.event;
      const eventHeaders = parsed.eventHeaders;

      // Record processing duration
      await this.metricsService.recordDurationMetric(
        this.metricsService.eventProcessingDuration,
        { event_type: event.type, gameID: eventHeaders.gameID },
        async () => {
          await this.analyticsEventService.processEventStream(
            eventHeaders,
            event
          );
        }
      );

      // Record processed event
      this.metricsService.recordEventProcessed(eventHeaders.gameID, event.type);

      return true;
    } catch (error) {
      console.error("Error while consuming acquired event from Pulsar:", error);
      return false;
    }
  }

  async shutdown() {
    console.log("Shutting down ConsumerService...");
if (this.consumerObserver) {
      this.consumerObserver.unregisterConsumers("ConsumerService");
    }
    for (const c of this.consumers) {
      try {
        await c.consumer.close();
      } catch (error) {
        console.error("Error closing consumer:", error);
      }
    }

    this.consumers = [];
    this.initialized = false;
  }
}
