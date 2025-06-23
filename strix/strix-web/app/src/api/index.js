// Re-export all API functions for backward compatibility
export * from "./categories/auth.js";
export * from "./categories/user.js";
export * from "./categories/organizations.js";
export * from "./categories/planning.js";
export * from "./categories/entities.js";
export * from "./categories/analytics.js";
export * from "./categories/offers.js";
export * from "./categories/flows.js";
export * from "./categories/remoteConfig.js";
export * from "./categories/dashboards.js";
export * from "./categories/warehouse.js";
export * from "./categories/abTesting.js";
export * from "./categories/gameEvents.js";
export * from "./categories/deployment.js";
export * from "./categories/localization.js";
export * from "./categories/files.js";
export * from "./categories/gameModel.js";
export * from "./categories/push.js";
export * from "./categories/segments.js";
export * from "./categories/clustering.js";
export * from "./categories/analyticsEvents.js";
export * from "./categories/profileComposition.js";

// Export the main client for direct access if needed
export { strixAPI, apiRequest } from "./client.js";
