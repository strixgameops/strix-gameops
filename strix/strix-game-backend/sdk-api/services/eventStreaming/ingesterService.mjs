import dotenv from "dotenv";
import { PulsarConsumer } from "./pulsar/classes.mjs";
dotenv.config();

export class IngesterService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;

    this.consumers = [];
    this.tableCache = {};
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    if (process.env.SERVER_ROLE !== "ingester") return;

    this.utilityService = this.moduleContainer.get("utility");
    this.metricsService = this.moduleContainer.get("metrics");
    this.databaseService = this.moduleContainer.get("database");
    this.consumerObserver = this.moduleContainer.get("consumerObserver");
    this.databaseTablesService = this.moduleContainer.get("databaseTables");
    // Only initialize if we should run ingesters
    if (!parseInt(process.env.INGESTER_PULSAR_LISTENERS)) {
      console.log(
        "Ingester Pulsar listeners disabled, skipping ingester initialization"
      );
      return;
    }

    if (this.consumerObserver) {
      this.consumerObserver.registerConsumers(
        "IngesterService",
        this.consumers
      );
    }

    await this.initializeIngestConsumers();
    this.initialized = true;
    console.log("IngesterService initialized");
  }

  async initializeIngestConsumers() {
    const totalConsumers = parseInt(process.env.INGESTER_PULSAR_LISTENERS) || 0;
    const topic = process.env.PULSAR_PATH_ANALYTICS + "ingest";

    if (totalConsumers === 0 || isNaN(totalConsumers)) return;

    console.log(
      `Initializing ${totalConsumers} ingest consumers for topic: ${topic}`
    );

    // Create all consumers and collect their initialization promises
    const initPromises = [];
    for (let i = 0; i < totalConsumers; i++) {
      const consumer = new PulsarConsumer({
        topic: topic,
        subscriptionName: "events-ingesting",
        subscriptionType: "Shared",
        listenerAction: this.ingestMessage.bind(this),
      });

      this.consumers.push(consumer);
      initPromises.push(consumer.init());
    }

    // Wait for all consumers to initialize simultaneously
    await Promise.all(initPromises);
  }

  async getTable(studioID, type) {
    if (this.tableCache[studioID] && this.tableCache[studioID][type]) {
      return this.tableCache[studioID][type];
    }

    if (!this.tableCache[studioID]) {
      this.tableCache[studioID] = {};
    }

    let TargetTable;

    switch (type) {
      case "events":
        TargetTable =
          await this.databaseTablesService.acquireIngestTable_Events(studioID);
        break;
      case "segments":
        TargetTable =
          await this.databaseTablesService.acquireIngestTable_Segments(
            studioID
          );
        break;
      case "payments":
        TargetTable =
          await this.databaseTablesService.acquireIngestTable_Payments(
            studioID
          );
        break;
      case "sessions":
        TargetTable =
          await this.databaseTablesService.acquireIngestTable_Sessions(
            studioID
          );
        break;
      case "snapshots":
        TargetTable =
          await this.databaseTablesService.acquireIngestTable_Snapshots(
            studioID
          );
        break;
      default:
        throw new Error(`Unknown table type: ${type}`);
    }

    this.tableCache[studioID][type] = TargetTable;
    return TargetTable;
  }

  async ingestMessage(msg) {
    try {
      const message = msg.getData().toString();

      const props = msg.getProperties();
      const studioID = props.studioID;
      const type = props.table;

      if (!message) {
        console.warn(`Empty message received for type ${type}`);
        return true;
      }

      let event = {};
      switch (type) {
        case "events":
        case "payments":
        case "sessions":
        case "snapshots":
          event = JSON.parse(message);
          break;
        case "segments":
          event = {
            clientID: props.key,
            segments: JSON.parse(message),
          };
          break;
        default:
          throw new Error(`Unknown event type: ${type}`);
      }

      this.utilityService.log("Got ingest event:", event, props);

      const TargetTable = await this.getTable(studioID, type);

      await this.insertEventWithRetry(event, async () => {
        switch (type) {
          case "events":
          case "payments":
          case "sessions":
          case "snapshots":
            await TargetTable.create({ ...event });
            break;
          case "segments":
            await TargetTable.upsert({ ...event });
            break;
        }
      });

      // Record metrics
      this.recordIngestMetrics(event, type, props);

      return true;
    } catch (error) {
      console.error(
        "Unexpected error in ingesting pool:",
        error,
        "\n Msg props:",
        msg.getProperties(),
        "\n Msg data:",
        msg.getData().toString()
      );
      return false;
    }
  }

  recordIngestMetrics(event, type, props) {
    switch (type) {
      case "segments":
        const gameID = this.getFirstPart(props.key);
        this.metricsService.recordIngestedEventsSize(gameID, type, props);
        this.metricsService.recordIngestedEvents(
          gameID,
          type,
          "segmentation-update"
        );
        break;
      case "snapshots":
        this.metricsService.recordIngestedEventsSize(event.gameID, type, props);
        this.metricsService.recordIngestedEvents(
          event.gameID,
          type,
          "snapshots"
        );
        break;
      default:
        this.metricsService.recordIngestedEventsSize(event.gameID, type, event);
        this.metricsService.recordIngestedEvents(
          event.gameID,
          type,
          event.type
        );
        break;
    }
  }

  getFirstPart(input) {
    const parts = input.split(":");
    return parts[0];
  }

  async insertEventWithRetry(event, insertFn, maxRetries = 3) {
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await insertFn();
        return;
      } catch (error) {
        attempt++;
        console.error(`Insert attempt ${attempt} failed:`, error);

        if (attempt >= maxRetries) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async shutdown() {
    console.log("Shutting down IngesterService...");

    if (this.consumerObserver) {
      this.consumerObserver.unregisterConsumers("IngesterService");
    }

    for (const c of this.consumers) {
      try {
        await c.consumer.close();
      } catch (error) {
        console.error("Error closing consumer:", error);
      }
    }

    this.consumers = [];
    this.tableCache = {};
    this.initialized = false;
  }
}
