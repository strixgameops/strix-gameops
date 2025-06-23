import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createAnalyticsQueriesRoutes(container, authMiddleware) {
  const router = express.Router();
  const analyticsController = container.getController("analyticsQueries");
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post(
    "/api/queryABTestData",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(analyticsController.queryABTestData.bind(analyticsController))
  );

  router.post(
    "/api/queryUniversalAnalytics",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryUniversalAnalytics.bind(analyticsController)
    )
  );

  router.post(
    "/api/queryInGameBalance",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryInGameBalance.bind(analyticsController)
    )
  );

  router.post(
    "/api/queryTopCurrencyProducts",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryTopCurrencyProducts.bind(analyticsController)
    )
  );

  router.post(
    "/api/queryTopProductsDiscountAndSpend",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryTopProductsDiscountAndSpend.bind(
        analyticsController
      )
    )
  );

  router.post(
    "/api/queryTopSourcesAndSinks",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryTopSourcesAndSinks.bind(analyticsController)
    )
  );

  router.post(
    "/api/getAvgCustomerProfile",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getAvgCustomerProfile.bind(analyticsController)
    )
  );

  router.post(
    "/api/getRevenue",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(analyticsController.getRevenue.bind(analyticsController))
  );

  router.post(
    "/api/queryTopRealProducts",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryTopRealProducts.bind(analyticsController)
    )
  );

  router.post(
    "/api/queryPaymentsConversion",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryPaymentsConversion.bind(analyticsController)
    )
  );

  router.post(
    "/api/queryPaymentsConversionFunnel",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryPaymentsConversionFunnel.bind(
        analyticsController
      )
    )
  );

  router.post(
    "/api/queryDaysToConvertToPayment",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryDaysToConvertToPayment.bind(analyticsController)
    )
  );

  router.post(
    "/api/queryOfferAnalytics",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryOfferAnalytics.bind(analyticsController)
    )
  );

  router.post(
    "/api/getPlayersProfileByClientIDs",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getPlayersProfileByClientIDs.bind(analyticsController)
    )
  );
  

  router.post(
    "/api/queryBehaviorAnalysis",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.queryBehaviorAnalysis.bind(analyticsController)
    )
  );

  router.post(
    "/api/getDAU",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(analyticsController.getDAU.bind(analyticsController))
  );

  router.post(
    "/api/getCumulativeARPU",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getCumulativeARPU.bind(analyticsController)
    )
  );

  router.post(
    "/api/getARPU",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(analyticsController.getARPU.bind(analyticsController))
  );

  router.post(
    "/api/getARPPU",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(analyticsController.getARPPU.bind(analyticsController))
  );

  router.post(
    "/api/getRetention",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(analyticsController.getRetention.bind(analyticsController))
  );

  router.post(
    "/api/getRetentionBig",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(analyticsController.getRetentionBig.bind(analyticsController))
  );

  router.post(
    "/api/getNewUsers",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(analyticsController.getNewUsers.bind(analyticsController))
  );

  router.post(
    "/api/getRetentionByCountry",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getRetentionByCountry.bind(analyticsController)
    )
  );

  router.post(
    "/api/getNewUsersByCountry",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getNewUsersByCountry.bind(analyticsController)
    )
  );

  router.post(
    "/api/getSalesAndRevenueByCountry",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getSalesAndRevenueByCountry.bind(analyticsController)
    )
  );

  router.post(
    "/api/getCombinedMetricsByCountry",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getCombinedMetricsByCountry.bind(analyticsController)
    )
  );

  router.post(
    "/api/getOverviewStatistics",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getOverviewStatistics.bind(analyticsController)
    )
  );

  router.post(
    "/api/getOverviewStatisticsForPublisher",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      analyticsController.getOverviewStatisticsForPublisher.bind(
        analyticsController
      )
    )
  );

  return router;
}
