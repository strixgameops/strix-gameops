import winston from "winston";
import { SeqTransport } from "@datalust/winston-seq";

import { gracefulExit } from "exit-hook";

import os from "os";

const getLocalIP = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
};

if (process.env.IS_LOCAL_ENVIRONMENT !== "true") {
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      application: "strix-backend",
      environment: process.env.ENVIRONMENT,
      podName: process.env.HOSTNAME || "Unknown Pod",
      address: getLocalIP(),
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

  process.on("uncaughtException", (err) => {
    logger.error(`Uncaught Exception: ${err.message}`, {
      message: err.message,
      stack: err.stack,
    });
    gracefulExit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error(`Unhandled Rejection: ${reason}`, { reason, promise });
  });

  const originalConsoleError = console.error;
  console.error = (...args) => {
    logger.error(typeof args === "string" ? args : args.toString(), { args });
    originalConsoleError.apply(console, args);
  };
}
