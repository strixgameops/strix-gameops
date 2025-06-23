import dotenv from "dotenv";
dotenv.config();

export class QueueService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;

    this.queueServiceName = process.env.QUEUE_SERVICE_NAME;
    this.pulsarManager = null;
    this.initialized = false;
  }

  async initialize() {
    this.utilityService = this.moduleContainer.get("utility");
    this.cacherService = this.moduleContainer.get("cacher");

    if (this.queueServiceName === "pulsar" && !this.initialized) {
      const { PulsarManager } = await import("./pulsar/classes.mjs");
      this.pulsarManager = new PulsarManager();
      this.initialized = true;
    }
  }

  makeStudioTopicName(type, studioID) {
    return `${process.env.PULSAR_PATH_ANALYTICS}ingest`;
  }

  async sendQueueMessage(topic, message, key, additionalProperties) {
    if (this.queueServiceName === "pulsar") {
      await this.sendPulsarMessage(topic, message, key, additionalProperties);
    }
  }

  async sendQueueKeyValueMessage(
    studioID,
    type,
    key,
    value,
    additionalProperties
  ) {
    if (this.queueServiceName === "pulsar") {
      await this.sendPulsarMessage(
        this.makeStudioTopicName(type, studioID),
        value,
        key,
        additionalProperties
      );
    }
  }

  async sendPulsarMessage(topic, data, key, additionalProperties) {
    try {
      await this.initialize();
      const producer = await this.pulsarManager.getProducer(topic);
      const stringified =
        typeof data === "object" ? JSON.stringify(data) : data;

      const trySend = async () => {
        if (producer.initialized) {
          if (!stringified || !key || !additionalProperties) {

            console.log("Sending queue message:", stringified, key, additionalProperties)
          }
          await producer.send(stringified, key, additionalProperties);
        } else {
          setTimeout(() => trySend(), 500);
        }
      };

      await trySend();
    } catch (error) {
      console.error(
        `Error sending message to topic ${topic}: ${error.message}`,
        error
      );
    }
  }

  async streamEvent(event, eventHeaders, reqIP) {
    // Check if we have crucial fields
    if (
      !eventHeaders.clientID ||
      !eventHeaders.sessionID ||
      !eventHeaders.gameID
    ) {
      console.error(
        "streamSessionEvent: No gameID, clientID or sessionID found in eventHeaders:",
        eventHeaders
      );
      return;
    }

    const studioID = await this.utilityService.getStudioIDByGameID(
      eventHeaders.gameID
    );

    this.utilityService.log("Streaming event", event, eventHeaders, reqIP);
    if (event && event.type === "newSession") {
      await this.streamSessionEvent(eventHeaders, reqIP, event.time, studioID);
    }
    await this.streamRegularEvent(event, eventHeaders, studioID);
  }

  async streamSessionEvent(eventHeaders, reqIP, time, studioID) {
    // Check if there are any information
    if (!eventHeaders) {
      console.error("streamSessionEvent: No event headers provided");
      return;
    }
    let country = eventHeaders.country;
    if (!eventHeaders.country) {
      country = await this.cacherService.getClientCountry(reqIP);
      if (!country) {
        country = eventHeaders.country;
      }
    }

    // Check if we've got country
    if (!country) {
      console.error("streamSessionEvent: No country found for", reqIP);
    }

    // Construct event
    let sessionData = {
      clientID: eventHeaders.clientID,
      sessionID: eventHeaders.sessionID,
      gameID: eventHeaders.gameID,
      language: eventHeaders.language,
      country: country ? country : "Unknown",
      platform: eventHeaders.platform,
      engineVersion: eventHeaders.engineVersion,
      gameVersion: eventHeaders.gameVersion,
      branch: eventHeaders.branch,
      timestamp: time,
      environment: eventHeaders.environment,
    };
    if (!studioID) {
      console.error(
        "streamSessionEvent: No studioID found for gameID",
        eventHeaders.gameID
      );
      return;
    }
    // this.utilityService.log("Result session event: ", `sessions-${studioID}`, sessionData);
    await this.sendQueueMessage(
      this.makeStudioTopicName("sessions", studioID),
      sessionData,
      sessionData.clientID,
      {
        studioID,
        table: "sessions",
      }
    );
  }

  async streamRegularEvent(event, eventHeaders, studioID) {
    let eventData = {
      gameID: eventHeaders.gameID,
      clientID: eventHeaders.clientID,
      sessionID: eventHeaders.sessionID,
      type: event.type,
      timestamp: event.time,
      ...(event.customData ? { customData: event.customData } : {}),
    };
    if (event.actions && Object.keys(event.actions).length > 0) {
      switch (event.type) {
        case "offerEvent":
          eventData.field1 = event.actions.offerID;
          eventData.field2 = event.actions.price;
          eventData.field3 = event.actions.currency;
          eventData.field4 = event.actions.discount;
          eventData.field5 = event.actions.orderId;
          break;
        case "offerShown":
          eventData.field1 = event.actions.offerID;
          eventData.field2 = event.actions.price;
          eventData.field3 = event.actions.currency;
          eventData.field4 = event.actions.discount;
          break;
        case "newSession":
          eventData.field1 = event.actions.isNewPlayer;
          break;
        case "endSession":
          eventData.field1 = event.actions.sessionLength;
          break;
        case "adEvent":
          eventData.field1 = event.actions.adNetwork;
          eventData.field2 = event.actions.adType;
          eventData.field3 = event.actions.timeSpent;
          break;
        case "economyEvent":
          eventData.field1 = event.actions.currencyID;
          eventData.field2 = event.actions.amount;
          eventData.field3 = event.actions.type;
          eventData.field4 = event.actions.origin;
          break;
        case "reportEvent":
          eventData.field1 = event.actions.severity;
          eventData.field2 = event.actions.reportID;
          eventData.field3 = event.actions.message;
          break;
        default:
          break;
      }
    }
    if (!studioID) {
      console.error(
        "streamRegularEvent: No studioID found for gameID",
        eventHeaders.gameID
      );
      return;
    }
    // this.utilityService.log("Result regular event: ", `events-${studioID}`, eventData);
    await this.sendQueueMessage(
      this.makeStudioTopicName("events", studioID),
      eventData,
      eventData.clientID,
      {
        studioID,
        table: "events",
      }
    );
  }

  async streamPaymentTransactionEvent(studioID, eventData) {
    // Used to stream validated transactions from app stores
    this.utilityService.log("Result payment transaction event: ", eventData);
    await this.sendQueueMessage(
      this.makeStudioTopicName("payments", studioID),
      eventData,
      eventData.clientID,
      {
        studioID,
        table: "payments",
      }
    );
  }

  async streamSnapshot(studioID, snapshot) {
    await this.sendQueueMessage(
      this.makeStudioTopicName("snapshots", studioID),
      snapshot,
      snapshot.clientID,
      {
        studioID,
        table: "snapshots",
      }
    );
  }
}
