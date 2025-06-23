import dotenv from "dotenv";
import Pulsar from "pulsar-client";
import { v4 as uuid } from "uuid";
dotenv.config();
import { asyncExitHook, gracefulExit } from "exit-hook";

let pulsar = new Pulsar.Client({
  serviceUrl: process.env.PULSAR_BROKER_URL,
  operationTimeoutSeconds: 30000,
  ioThreads: process.env.PULSAR_CLIENT_ioThreads,
  messageListenerThreads: process.env.PULSAR_CLIENT_messageListenerThreads,
  log: (level, file, line, message) => {
    if (level === 3) {
      console.error(message);
    } else {
      // console.log(message);
    }
  },
});
let consumers = [];

export class PulsarConsumer {
  constructor({ topic, subscriptionName, subscriptionType, listenerAction }) {
    this.topic = topic;
    this.client = pulsar;
    this.consumer = null;
    this.subscriptionName = subscriptionName;
    this.subscriptionType = subscriptionType;
    this.listenerAction = listenerAction;
    this.connected = false;
    this.errorAttemptsCount = 0;
  }

  setupConnectionObserver() {
    const interval = setInterval(() => {
      if (this.consumer.isConnected()) {
        this.connected = false;
      } else {
        this.connected = true;
      }
    }, 1000);
  }

  async init() {
    // console.log(
    //   "Setting up Pulsar consumer for topic",
    //   this.topic,
    //   "\n Subscription Name:",
    //   this.subscriptionName,
    //   "\n Subscription Type:",
    //   this.subscriptionType
    // );
    while (!this.connected) {
      try {
        this.consumer = await pulsar.subscribe({
          topic: this.topic,
          subscription: this.subscriptionName,
          subscriptionType: this.subscriptionType,
          // Queue settings
          batchIndexAckEnabled:
            process.env.PULSAR_CONSUMER_CONFIG_batchIndexAckEnabled,
          receiverQueueSize:
            process.env.PULSAR_CONSUMER_CONFIG_receiverQueueSize,
          receiverQueueSizeAcrossPartitions:
            process.env
              .PULSAR_CONSUMER_CONFIG_receiverQueueSizeAcrossPartitions,
          //
          listener: async (msg, msgConsumer) => {
            const ack = await this.listenerAction(msg, msgConsumer);
            if (ack) {
              msgConsumer.acknowledge(msg);
            } else {
              msgConsumer.negativeAcknowledge(msg);
            }
          },
        });
        this.connected = this.consumer.isConnected();
      } catch (error) {
        this.errorAttemptsCount++;
        if (
          this.errorAttemptsCount % 10 === 0 ||
          this.errorAttemptsCount === 0
        ) {
          console.error("Error initializing Pulsar consumer:", error);
        }
      }

      await this.sleep(3000);
    }

    if (this.connected) {
      consumers.push(this.consumer);
      setupCleanupHandlers();
      this.setupConnectionObserver();
      console.log("Consumer is up on topic", this.topic);
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class PulsarProducer {
  constructor(topic, client) {
    this.topic = topic;
    this.client = client;
    this.producer = null;
    this.messageQueue = 0;
    this.timer = null;
    this.initialized = false;
  }

  async init() {
    try {
      this.producer = await this.client.createProducer({
        topic: this.topic,

        sendTimeoutMs: process.env.PULSAR_PRODUCER_CONFIG_sendTimeoutMs,
        // Queue settings
        batchingEnabled: process.env.PULSAR_PRODUCER_CONFIG_batchingEnabled,
        batchingMaxPublishDelayMs:
          process.env.PULSAR_PRODUCER_CONFIG_batchingMaxPublishDelayMs,
        batchingMaxMessages:
          process.env.PULSAR_PRODUCER_CONFIG_batchingMaxMessages,
        //
      });
      this.initialized = true;
    } catch (error) {
      console.error(
        `Failed to initialize producer for topic ${this.topic}:`,
        error
      );
      throw error;
    }
  }

  async send(message, key, additionalProperties) {
    try {
      this.messageQueue += 1;
      const props = {
        ...(key ? { key: key } : {}),
        ...(additionalProperties ? additionalProperties : {}),
      };
      await this.producer.send({
        data: Buffer.from(message),
        properties: props,
        orderingKey: key ? key : undefined,
      });
      if (this.messageQueue >= 10) {
        await this.flush();
      } else if (!this.timer) {
        this.startFlushTimer();
      }
    } catch (error) {
      console.error(
        `Error while queuing message for topic ${this.topic}:`,
        error
      );
    }
  }

  startFlushTimer() {
    this.timer = setTimeout(async () => {
      await this.flush();
    }, 5000);
  }

  async flush() {
    if (this.messageQueue === 0) return;

    try {
      this.producer.flush();
      console.log(`Flushed ${this.messageQueue} messages to topic ${this.topic}`);
      this.messageQueue = 0;
    } catch (error) {
      console.error(`Error flushing messages for topic ${this.topic}:`, error);
    } finally {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async close() {
    await this.flush();
    if (this.producer) {
      await this.producer.close();
    }
  }
}

export class PulsarManager {
  constructor() {
    this.producers = {};
    this.setupCleanupHandlers();
  }

  async getProducer(topic) {
    if (!this.producers[topic]) {
      this.producers[topic] = new PulsarProducer(topic, pulsar);
      await this.producers[topic].init();
    }
    return this.producers[topic];
  }

  async closeAll() {
    for (const topic in this.producers) {
      await this.producers[topic].close();
    }
    await pulsar.close();
    console.log("Closed all Pulsar producers.");
  }

  setupCleanupHandlers() {
    let doOnce = false;
    const cleanup = async () => {
      if (!doOnce) {
        doOnce = true;
        try {
          await this.closeAll();
        } catch (error) {
          console.error(error);
        }
      }
    };

    asyncExitHook(
      async (signal) => {
        await cleanup();
      },
      { wait: 1000 }
    );
  }
}

let cleanupIsSetup = false;
async function setupCleanupHandlers() {
  let doOnce = false;
  if (cleanupIsSetup) return;
  const cleanup = async () => {
    if (!doOnce) {
      doOnce = true;

      try {
        for (const consumer of consumers) {
          await consumer.close();
        }
        await pulsar.close();
        console.log("Closed all Pulsar clients.");
      } catch (error) {
        console.error(error);
      }
    }
    gracefulExit(0);
  };

  asyncExitHook(
    async (signal) => {
      await cleanup();
    },
    { wait: 1000 }
  );
  cleanupIsSetup = true;
}


