import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createOrganizationRoutes(container, authMiddleware) {
  const router = express.Router();
  const organizationController = container.getController("organization");
  const organizationControllerFull =
    container.getOptionalController("organizationFull");
  const {
    validateAccessToken,
    validateAccessToUser,
    validateAccessToStudio,
    validateAccessToPublisher,
    validateAccessToGame,
  } = authMiddleware;

  // User management routes
  router.post(
    "/api/getUser",
    validateAccessToken,
    validateAccessToUser,
    asyncHandler(organizationController.getUser.bind(organizationController))
  );

  router.post(
    "/api/initiateChangeUserProfile",
    validateAccessToken,
    validateAccessToUser,
    asyncHandler(
      organizationController.initiateChangeUserProfile.bind(
        organizationController
      )
    )
  );

  router.post(
    "/api/finishInitialOnboarding",
    validateAccessToken,
    validateAccessToUser,
    asyncHandler(
      organizationController.finishInitialOnboarding.bind(
        organizationController
      )
    )
  );

  router.post(
    "/api/confirmUserChangeProfileCode",
    validateAccessToken,
    validateAccessToUser,
    asyncHandler(
      organizationController.confirmUserChangeProfileCode.bind(
        organizationController
      )
    )
  );

  router.post(
    "/api/removeUser",
    validateAccessToken,
    validateAccessToUser,
    asyncHandler(organizationController.removeUser.bind(organizationController))
  );

  router.post(
    "/api/cancelRemoveUser",
    validateAccessToken,
    validateAccessToUser,
    asyncHandler(
      organizationController.cancelRemoveUser.bind(organizationController)
    )
  );

  router.post(
    "/api/markUserTutorialState",
    validateAccessToken,
    asyncHandler(
      organizationController.markUserTutorialState.bind(organizationController)
    )
  );

  // Publisher management routes
  router.post(
    "/api/getPublishers",
    validateAccessToken,
    validateAccessToUser,
    asyncHandler(
      organizationController.getPublishers.bind(organizationController)
    )
  );

  router.post(
    "/api/getOrganizationsInfo",
    validateAccessToken,
    validateAccessToUser,
    asyncHandler(
      organizationController.getOrganizationsInfo.bind(organizationController)
    )
  );

  router.post(
    "/api/addUserToOrganization",
    validateAccessToken,
    validateAccessToStudio,
    asyncHandler(
      organizationController.addUserToOrganization.bind(organizationController)
    )
  );

  router.post(
    "/api/removeUserFromOrganization",
    validateAccessToken,
    validateAccessToStudio,
    asyncHandler(
      organizationController.removeUserFromOrganization.bind(
        organizationController
      )
    )
  );

  router.post(
    "/api/getPublisherStudios",
    validateAccessToken,
    validateAccessToPublisher,
    asyncHandler(
      organizationController.getPublisherStudios.bind(organizationController)
    )
  );

  router.post(
    "/api/getStudioGames",
    validateAccessToken,
    validateAccessToStudio,
    asyncHandler(
      organizationController.getStudioGames.bind(organizationController)
    )
  );

  router.post(
    "/api/getStudioDetails",
    validateAccessToken,
    validateAccessToStudio,
    asyncHandler(
      organizationController.getStudioDetails.bind(organizationController)
    )
  );

  router.post(
    "/api/updateStudioDetails",
    validateAccessToken,
    validateAccessToStudio,
    asyncHandler(
      organizationController.updateStudioDetails.bind(organizationController)
    )
  );

  // Game management routes
  router.post(
    "/api/createGame",
    validateAccessToken,
    validateAccessToStudio,
    asyncHandler(organizationController.createGame.bind(organizationController))
  );

  router.post(
    "/api/getGameDetails",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      organizationController.getGameDetails.bind(organizationController)
    )
  );

  router.post(
    "/api/updateGameDetails",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      organizationController.updateGameDetails.bind(organizationController)
    )
  );

  router.post(
    "/api/removeGame",
    validateAccessToken,
    validateAccessToStudio,
    asyncHandler(organizationController.removeGame.bind(organizationController))
  );

  router.post(
    "/api/cancelRemoveGame",
    validateAccessToken,
    validateAccessToStudio,
    asyncHandler(
      organizationController.cancelRemoveGame.bind(organizationController)
    )
  );

  router.post(
    "/api/revokeGameKey",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      organizationController.revokeGameKey.bind(organizationController)
    )
  );

  // Collaboration routes
  router.post(
    "/api/updateCollabUserState",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      organizationController.updateCollabUserState.bind(organizationController)
    )
  );

  router.post(
    "/api/getCurrentCollabUsers",
    validateAccessToken,
    validateAccessToGame,
    asyncHandler(
      organizationController.getCurrentCollabUsers.bind(organizationController)
    )
  );

  if (
    organizationControllerFull &&
    organizationControllerFull.startRegistrationProcess &&
    organizationControllerFull.finishRegistrationProcess &&
    organizationControllerFull.addStudio &&
    organizationControllerFull.removeStudio &&
    organizationControllerFull.cancelRemoveStudio
  ) {
    router.post(
      "/api/startRegistrationProcess",
      asyncHandler(
        organizationControllerFull.startRegistrationProcess.bind(
          organizationControllerFull
        )
      )
    );

    router.post(
      "/api/finishRegistrationProcess",
      asyncHandler(
        organizationControllerFull.finishRegistrationProcess.bind(
          organizationControllerFull
        )
      )
    );

    // Studio management routes
    router.post(
      "/api/addStudio",
      validateAccessToken,
      validateAccessToPublisher,
      asyncHandler(
        organizationControllerFull.addStudio.bind(organizationControllerFull)
      )
    );
    router.post(
      "/api/removeStudio",
      validateAccessToken,
      validateAccessToStudio,
      asyncHandler(
        organizationControllerFull.removeStudio.bind(organizationControllerFull)
      )
    );

    router.post(
      "/api/cancelRemoveStudio",
      validateAccessToken,
      validateAccessToStudio,
      asyncHandler(
        organizationControllerFull.cancelRemoveStudio.bind(
          organizationControllerFull
        )
      )
    );
  }

  return router;
}
