import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import http from "http";
import morgan from "morgan";

import { createModuleContainer } from "./core/moduleContainer.mjs";
import { RouteManager } from "./core/routeManager.mjs";

dotenv.config();

class GameServer {
  constructor() {
    this.app = express();
    this.host = "0.0.0.0";
    this.port = process.env.PORT || 3005;
    this.serverRole = process.env.SERVER_ROLE || "development";
    this.moduleContainer = null;
    this.routeManager = null;
    this.server = null;
  }

  async initialize() {
    try {
      console.log(`Initializing server with role: ${this.serverRole}`);
      
      // Initialize module container
      this.moduleContainer = await createModuleContainer(this.serverRole);
      
      // Setup middleware
      this.setupMiddleware();
      
      // Initialize route manager
      this.routeManager = new RouteManager(this.moduleContainer);
      await this.routeManager.initialize(this.app, this.serverRole);
      
      // Setup health endpoints
      this.setupHealthEndpoints();
      
      console.log("Server initialization completed");
    } catch (error) {
      console.error("Server initialization failed:", error);
      throw error;
    }
  }

  setupMiddleware() {
    // Logging
    switch (process.env.ENVIRONMENT) {
      case "staging":
        this.app.use(morgan("tiny"));
        break;
      case "production":
        this.app.use(
          morgan("combined", {
            skip: function (req, res) {
              return res.statusCode < 400;
            },
          })
        );
        break;
    }

    // Metrics middleware
    if (this.moduleContainer.has("metrics")) {
      const metricsService = this.moduleContainer.get("metrics");
      this.app.use(metricsService.middleware);
      this.app.get("/metrics", metricsService.endpoint);
    }

    // Body parsers
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ limit: "50mb" }));
    this.app.use(bodyParser.json());

    // Real IP middleware
    this.app.use(this.getRealIP);
  }

  getRealIP = (req, res, next) => {
    const ip =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection.socket ? req.connection.socket.remoteAddress : null);
    req.clientIp = ip;
    next();
  };

  setupHealthEndpoints() {
    this.app.get("/pod/isReady", async (req, res) => {
      const isReady = this.moduleContainer.has("database") 
        ? await this.moduleContainer.get("database").isReady() 
        : true;
      res.status(isReady ? 200 : 500).json({ success: isReady });
    });

    this.app.get("/pod/isAlive", async (req, res) => {
      res.status(200).json({ success: true });
    });

    this.app.get("/sdk/api/health", async (req, res) => {
      res.json({
        health: "OK.",
        message: `Current Version is ${process.env.CURRENT_VERSION}`,
        role: this.serverRole,
      });
    });
  }

  async start() {
    await this.initialize();
    
    this.server = http.createServer(this.app);
    this.server.listen(this.port, this.host, () => {
      console.log(`Server running on http://${this.host}:${this.port} with role: ${this.serverRole}`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => this.shutdown());
    process.on("SIGINT", () => this.shutdown());
  }

  async shutdown() {
    console.log("Shutting down server...");
    
    if (this.server) {
      this.server.close();
    }
    
    if (this.moduleContainer) {
      await this.moduleContainer.shutdown();
    }
    
    process.exit(0);
  }
}

// Start server
const server = new GameServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

export { server as default };
export const getApp = () => server.app;