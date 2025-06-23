import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createBalanceModelRoutes(container, authMiddleware) {
  const router = express.Router();
  const balanceModelController = container.getController("balanceModel");
  const balanceModelControllerFull =
    container.getOptionalController("balanceModelFull");
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post(
    "/api/getBalanceModel",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      balanceModelController.getBalanceModel.bind(balanceModelController)
    )
  );

  if (
    balanceModelControllerFull &&
    balanceModelControllerFull.gameModelCreateSegment &&
    balanceModelControllerFull.gameModelRemoveSegment
  ) {
    router.post(
      "/api/gameModelCreateSegment",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        balanceModelControllerFull.gameModelCreateSegment.bind(
          balanceModelControllerFull
        )
      )
    );
    router.post(
      "/api/gameModelRemoveSegment",
      validateAccessToken,
      validateAccessToGame,
      asyncHandler(
        balanceModelControllerFull.gameModelRemoveSegment.bind(
          balanceModelControllerFull
        )
      )
    );
  }

  router.post(
    "/api/gameModelUpdateSegmentOverride",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      balanceModelController.gameModelUpdateSegmentOverride.bind(
        balanceModelController
      )
    )
  );

  router.post(
    "/api/gameModelCreateOrUpdateVariable",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      balanceModelController.gameModelCreateOrUpdateVariable.bind(
        balanceModelController
      )
    )
  );

  router.post(
    "/api/gameModelRemoveVariable",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      balanceModelController.gameModelRemoveVariable.bind(
        balanceModelController
      )
    )
  );

  router.post(
    "/api/gameModelCreateOrUpdateFunction",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      balanceModelController.gameModelCreateOrUpdateFunction.bind(
        balanceModelController
      )
    )
  );

  router.post(
    "/api/gameModelRemoveFunction",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      balanceModelController.gameModelRemoveFunction.bind(
        balanceModelController
      )
    )
  );

  router.post(
    "/api/gameModelRemoveAllByCategory",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      balanceModelController.gameModelRemoveAllByCategory.bind(
        balanceModelController
      )
    )
  );

  router.post(
    "/api/gameModelManageFunctionLinkedConfigValue",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      balanceModelController.gameModelManageFunctionLinkedConfigValue.bind(
        balanceModelController
      )
    )
  );

  router.post(
    "/api/gameModelCreateOrUpdateTab",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      balanceModelController.gameModelCreateOrUpdateTab.bind(
        balanceModelController
      )
    )
  );

  router.post(
    "/api/gameModelRemoveTab",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      balanceModelController.gameModelRemoveTab.bind(balanceModelController)
    )
  );

  return router;
}
