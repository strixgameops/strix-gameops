import winston from "winston";
import { SeqTransport } from "@datalust/winston-seq";
import { gracefulExit } from "exit-hook";
import os from "os";

export class CrashlyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.logger = null;
    this.originalConsoleError = null;
    this.initialized = false;
    this.uncaughtExceptionHandler = null;
    this.unhandledRejectionHandler = null;
  }

  async initialize() {
    if (this.initialized) return;

    // Skip initialization in local environment
    if (process.env.IS_LOCAL_ENVIRONMENT === "true") {
      console.log(
        "CrashlyticsService: Skipping initialization in local environment"
      );
      this.initialized = true;
      return;
    }

    try {
      this.setupLogger();
      this.setupErrorHandlers();
      this.overrideConsoleError();

      this.initialized = true;
      console.log("CrashlyticsService initialized");
    } catch (error) {
      console.error("Failed to initialize CrashlyticsService:", error);
      throw error;
    }
  }

  setupLogger() {
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        application: "strix-game-backend",
        role: process.env.SERVER_ROLE,
        environment: process.env.ENVIRONMENT,
        podName: process.env.HOSTNAME || "Unknown Pod",
        address: this.getLocalIP(),
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
        ...(process.env.SEQ_SERVER_URL && process.env.SEQ_INGEST_API_KEY
          ? [
              new SeqTransport({
                serverUrl: process.env.SEQ_SERVER_URL,
                apiKey: process.env.SEQ_INGEST_API_KEY,
                handleExceptions: true,
                handleRejections: true,
              }),
            ]
          : []),
      ],
    });
  }

  setupErrorHandlers() {
    this.uncaughtExceptionHandler = (err) => {
      this.logger.error(`Uncaught Exception: ${err.message}`, {
        message: err.message,
        stack: err.stack,
      });
      gracefulExit(1);
    };

    this.unhandledRejectionHandler = (reason, promise) => {
      this.logger.error(`Unhandled Rejection: ${reason}`, { reason, promise });
    };

    process.on("uncaughtException", this.uncaughtExceptionHandler);
    process.on("unhandledRejection", this.unhandledRejectionHandler);
  }

  overrideConsoleError() {
    this.originalConsoleError = console.error;
    console.error = (...args) => {
      if (this.logger) {
        this.logger.error(typeof args === "string" ? args : args.toString(), {
          args,
        });
      }
      this.originalConsoleError.apply(console, args);
    };
  }

  getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
    return "127.0.0.1";
  }

  // Public methods for logging
  logError(message, meta = {}) {
    if (this.logger) {
      this.logger.error(message, meta);
    } else {
      console.error(message, meta);
    }
  }

  logInfo(message, meta = {}) {
    if (this.logger) {
      this.logger.info(message, meta);
    } else {
      console.log(message, meta);
    }
  }

  logWarning(message, meta = {}) {
    if (this.logger) {
      this.logger.warn(message, meta);
    } else {
      console.warn(message, meta);
    }
  }

  async shutdown() {
    console.log("Shutting down CrashlyticsService...");

    // Restore original console.error
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
      this.originalConsoleError = null;
    }

    // Remove error handlers
    if (this.uncaughtExceptionHandler) {
      process.removeListener(
        "uncaughtException",
        this.uncaughtExceptionHandler
      );
      this.uncaughtExceptionHandler = null;
    }

    if (this.unhandledRejectionHandler) {
      process.removeListener(
        "unhandledRejection",
        this.unhandledRejectionHandler
      );
      this.unhandledRejectionHandler = null;
    }

    // Close logger
    if (this.logger) {
      await new Promise((resolve) => {
        this.logger.end(() => resolve());
      });
      this.logger = null;
    }

    this.initialized = false;
  }
}
