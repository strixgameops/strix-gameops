import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createPushCampaignRoutes(container, authMiddleware) {
  const router = express.Router();
  const pushCampaignController =
    container.getOptionalController("pushCampaign");
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  if (
    pushCampaignController &&
    pushCampaignController.getPushCampaigns &&
    pushCampaignController.createPushCampaign &&
    pushCampaignController.removePushCampaign &&
    pushCampaignController.updatePushCampaign &&
    pushCampaignController.testPushNotification
  ) {
    router.post(
      "/api/getPushCampaigns",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        pushCampaignController.getPushCampaigns.bind(pushCampaignController)
      )
    );

    router.post(
      "/api/createPushCampaign",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        pushCampaignController.createPushCampaign.bind(pushCampaignController)
      )
    );

    router.post(
      "/api/removePushCampaign",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        pushCampaignController.removePushCampaign.bind(pushCampaignController)
      )
    );

    router.post(
      "/api/updatePushCampaign",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        pushCampaignController.updatePushCampaign.bind(pushCampaignController)
      )
    );

    router.post(
      "/api/testPushNotification",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        pushCampaignController.testPushNotification.bind(pushCampaignController)
      )
    );
  }

  return router;
}
