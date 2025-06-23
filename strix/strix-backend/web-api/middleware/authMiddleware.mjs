import { asyncHandler, AppError } from "../core/errorHandler.mjs";

export function createAuthMiddleware(container) {
  const auth = container.get("auth");
  const utilityService = container.get("utility");

  const validateAccessToken = asyncHandler(async (req, res, next) => {
    if (process.env.ENVIRONMENT === "staging" && !req.headers["authtoken"]) {
      req.clientUID = "Test User";
      return next();
    }

    const token = req.headers["authtoken"];
    if (!token) {
      throw new AppError("Invalid or expired token", 401);
    }

    const validatedToken = await auth.checkAccessTokenValidity(token);
    if (!validatedToken) {
      throw new AppError("Invalid or expired token", 401);
    }

    req.clientUID = validatedToken.uid;
    next();
  });

  const validateAccessToUser = asyncHandler(async (req, res, next) => {
    const { email } = req.body;
    const uid = req.clientUID;

    if (!uid || !email || email !== uid) {
      throw new AppError("Unauthorized", 401);
    }
    next();
  });

  const validateAccessToGame = asyncHandler(async (req, res, next) => {
    const { gameID, gameIDs } = req.body;
    const uid = req.clientUID;

    const gameIDsToCheck = gameID ? [gameID] : gameIDs || [];

    if (gameIDsToCheck.length === 0) {
      throw new AppError("Unauthorized", 401);
    }

    if (process.env.ENVIRONMENT !== "staging") {
      for (const id of gameIDsToCheck) {
        const hasAccess = await auth.checkUserHasAccessToType(uid, id, "game");
        if (!hasAccess) {
          throw new AppError("Unauthorized", 401);
        }
      }
    }
    next();
  });

  const validateAccessToStudio = asyncHandler(async (req, res, next) => {
    const { studioID, studioIDs, gameID, gameIDs } = req.body;
    const uid = req.clientUID;

    let studioIDsToCheck = studioID ? [studioID] : studioIDs || [];

    if (studioIDsToCheck.length === 0) {
      const gameIDs = gameID ? [gameID] : gameIDs || [];
      if (gameIDs.length === 0) {
        throw new AppError("Unauthorized", 401);
      }
      studioIDsToCheck = await Promise.all(
        gameIDs.map(async () => {
          return await utilityService.getStudioIDByGameID(
            utilityService.getDemoGameID(gameID)
          );
        })
      );

      if (studioIDsToCheck.length === 0) {
        throw new AppError("Unauthorized", 401);
      }
    }

    if (process.env.ENVIRONMENT !== "staging") {
      for (const id of studioIDsToCheck) {
        const hasAccess = await auth.checkUserHasAccessToType(
          uid,
          id,
          "studio"
        );
        if (!hasAccess) {
          throw new AppError("Unauthorized", 401);
        }
      }
    }
    next();
  });

  const validateAccessToPublisher = asyncHandler(async (req, res, next) => {
    const { publisherID } = req.body;
    const uid = req.clientUID;

    if (!uid || !publisherID) {
      throw new AppError("Unauthorized", 401);
    }

    if (process.env.ENVIRONMENT !== "staging") {
      const hasAccess = await auth.checkUserHasAccessToType(
        uid,
        publisherID,
        "publisher"
      );
      if (!hasAccess) {
        throw new AppError("Unauthorized", 401);
      }
    }
    next();
  });

  return {
    validateAccessToken,
    validateAccessToUser,
    validateAccessToGame,
    validateAccessToStudio,
    validateAccessToPublisher,
  };
}
