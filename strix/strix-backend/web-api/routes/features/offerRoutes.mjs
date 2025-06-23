import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createOfferRoutes(container, authMiddleware) {
  const router = express.Router();
  const offerController = container.getController("offer");
  const offerControllerFull = container.getOptionalController("offerFull");
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post(
    "/api/createNewOffer",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.createNewOffer.bind(offerController))
  );

  router.post(
    "/api/getPricing",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.getPricing.bind(offerController))
  );

  if (
    offerControllerFull &&
    offerControllerFull.getPricingAutoFilledRegions &&
    offerControllerFull.updatePricingTemplate &&
    offerControllerFull.createPricingTemplate &&
    offerControllerFull.removePricingTemplate
  ) {
    router.post(
      "/api/getPricingAutoFilledRegions",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        offerControllerFull.getPricingAutoFilledRegions.bind(
          offerControllerFull
        )
      )
    );

    router.post(
      "/api/updatePricingTemplate",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        offerControllerFull.updatePricingTemplate.bind(offerControllerFull)
      )
    );

    router.post(
      "/api/createPricingTemplate",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        offerControllerFull.createPricingTemplate.bind(offerControllerFull)
      )
    );

    router.post(
      "/api/removePricingTemplate",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        offerControllerFull.removePricingTemplate.bind(offerControllerFull)
      )
    );
  }

  router.post(
    "/api/updateOffer",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.updateOffer.bind(offerController))
  );

  router.post(
    "/api/getOffersNames",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.getOffersNames.bind(offerController))
  );

  router.post(
    "/api/removeOffer",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.removeOffer.bind(offerController))
  );

  router.post(
    "/api/getOffersByContentNodeID",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.getOffersByContentNodeID.bind(offerController))
  );

  router.post(
    "/api/getCurrencyEntities",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.getCurrencyEntities.bind(offerController))
  );

  router.post(
    "/api/getPositionedOffers",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.getPositionedOffers.bind(offerController))
  );

  router.post(
    "/api/updatePositionedOffers",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.updatePositionedOffers.bind(offerController))
  );

  router.post(
    "/api/removePositionedOffer",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.removePositionedOffer.bind(offerController))
  );

  router.post(
    "/api/getOffers",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(offerController.getOffers.bind(offerController))
  );

  return router;
}
