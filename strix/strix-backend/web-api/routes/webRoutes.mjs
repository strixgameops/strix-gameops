import express from "express";
import { createAuthMiddleware } from "../middleware/authMiddleware.mjs";

// Import all route creators
import { createABTestRoutes } from "./features/abtestRoutes.mjs";
import { createAlertRoutes } from "./features/alertRoutes.mjs";
import { createAnalyticsRoutes } from "./features/analyticsRoutes.mjs";
import { createAuthRoutes } from "./features/authRoutes.mjs";
import { createBalanceModelRoutes } from "./features/balanceModelRoutes.mjs";
import { createClusteringRoutes } from "./features/clusteringRoutes.mjs";
import { createCustomDashboardRoutes } from "./features/customDashboardRoutes.mjs";
import { createDeploymentRoutes } from "./features/deploymentRoutes.mjs";
import { createFlowRoutes } from "./features/flowsRoutes.mjs";
import { createGameEventRoutes } from "./features/gameEventsRoutes.mjs";
import { createLocalizationRoutes } from "./features/localizationRoutes.mjs";
import { createNodeRoutes } from "./features/nodeRoutes.mjs";
import { createOfferRoutes } from "./features/offerRoutes.mjs";
import { createOrganizationRoutes } from "./features/organizationRoutes.mjs";
import { createProfileCompositionRoutes } from "./features/profileCompositionRoutes.mjs";
import { createPushCampaignRoutes } from "./features/pushCampaignRoutes.mjs";
import { createSegmentRoutes } from "./features/segmentRoutes.mjs";
import { createUtilityRoutes } from "./features/utilityRoutes.mjs";
import { createWarehouseRoutes } from "./features/warehouseRoutes.mjs";
import { createMetricsRoutes } from "./metricsRouter.mjs";
import { createAnalyticsQueriesRoutes } from "./analytics/analyticsRoutes.mjs";

export function createWebRoutes(container) {
  const router = express.Router();
  const authMiddleware = createAuthMiddleware(container);

  // Define route configurations for cleaner mounting
  const routeConfigs = [
    { creator: createAuthRoutes, name: "auth" },
    { creator: createOrganizationRoutes, name: "organization" },
    { creator: createNodeRoutes, name: "node" },
    { creator: createLocalizationRoutes, name: "localization" },
    { creator: createOfferRoutes, name: "offer" },
    { creator: createSegmentRoutes, name: "segment" },
    { creator: createAnalyticsRoutes, name: "analytics" },
    { creator: createABTestRoutes, name: "abtest" },
    { creator: createDeploymentRoutes, name: "deployment" },
    { creator: createCustomDashboardRoutes, name: "customDashboard" },
    { creator: createFlowRoutes, name: "flow" },
    { creator: createGameEventRoutes, name: "gameEvent" },
    { creator: createAlertRoutes, name: "alert" },
    { creator: createBalanceModelRoutes, name: "balanceModel" },
    { creator: createPushCampaignRoutes, name: "pushCampaign" },
    { creator: createWarehouseRoutes, name: "warehouse" },
    { creator: createUtilityRoutes, name: "utility" },
    { creator: createClusteringRoutes, name: "clustering" },
    { creator: createProfileCompositionRoutes, name: "profileComposition" },
    { creator: createAnalyticsQueriesRoutes, name: "analyticsQueries" },
  ];

  // Mount all routes
  routeConfigs.forEach(({ creator, name }) => {
    try {
      const routes = creator(container, authMiddleware);
      if (routes) {
        router.use(routes);
        console.log(`Successfully mounted ${name} routes`);
      } else {
        console.warn(`${name} route creator returned null/undefined`);
      }
    } catch (error) {
      console.warn(`Failed to mount ${name} routes:`, error.message);
      console.error(`Full error for ${name}:`, error);
    }
  });

  // Mount metrics routes if available
  if (container.hasController("metrics")) {
    try {
      const metricsRoutes = createMetricsRoutes(container);
      router.use("/api/metrics", metricsRoutes);
    } catch (error) {
      console.warn("Failed to mount metrics routes:", error.message);
    }
  }

  return router;
}