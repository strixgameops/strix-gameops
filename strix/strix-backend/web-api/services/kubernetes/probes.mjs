import dotenv from "dotenv";
dotenv.config();

// Global health status - should be set by the main application
let podIsReady = false;
let podIsAlive = false;
let databaseService = null;

// Initialize with database service reference
export function initializeProbes(dbService) {
  databaseService = dbService;
  console.log("Kubernetes probes initialized with database service");
}

export async function checkReadiness() {
  try {
    if (!databaseService) {
      console.log("Database service not initialized");
      return false;
    }

    let isReady = true;
    
    // Check MongoDB connection
    if (!databaseService.isMongoConnected()) {
      console.log("MongoDB is not connected");
      isReady = false;
    }
    
    // Check PostgreSQL connection (only if role requires it)
    if (process.env.SERVER_ROLE === "webBackend" && !databaseService.isPostgreSQLConnected()) {
      console.log("PostgreSQL is not connected");
      isReady = false;
    }
    
    return isReady;
  } catch (error) {
    console.error("Readiness check failed:", error);
    return false;
  }
}

export async function checkLiveness() {
  try {
    if (!databaseService) {
      return false;
    }
    
    // Basic liveness check - ensure database service exists and isn't shut down
    return !databaseService.shutdownInitiated;
  } catch (error) {
    console.error("Liveness check failed:", error);
    return false;
  }
}

// Periodic readiness check
async function readinessLoop() {
  const isReady = await checkReadiness();
  podIsReady = isReady;
  
  // Continue checking every 5 seconds
  setTimeout(readinessLoop, 5000);
}

// Periodic liveness check  
async function livenessLoop() {
  const isAlive = await checkLiveness();
  podIsAlive = isAlive;
  
  // Continue checking every 5 seconds
  setTimeout(livenessLoop, 5000);
}

// Start the health check loops (will be started when database service is ready)
export function startHealthChecks() {
  readinessLoop();
  livenessLoop();
}

// Getters for current status
export function getPodReadiness() {
  return podIsReady;
}

export function getPodLiveness() {
  return podIsAlive;
}