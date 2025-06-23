import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createAuthRoutes(container, authMiddleware) {
  const router = express.Router();
  const authController = container.getController('auth');
  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  router.post("/api/register", asyncHandler(authController.register.bind(authController)));
  router.post("/api/login", asyncHandler(authController.login.bind(authController)));
  router.post("/api/logout", asyncHandler(authController.logout.bind(authController)));
  router.post("/api/checkOrganizationAuthority", asyncHandler(authController.checkOrganizationAuthority.bind(authController)));

  return router;
}