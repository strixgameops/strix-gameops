import express from "express";
import { asyncHandler } from "../../core/errorHandler.mjs";

export function createFlowRoutes(container, authMiddleware) {
  const router = express.Router();
  const flowController = container.getOptionalController("flow");

  const { validateAccessToken, validateAccessToGame } = authMiddleware;

  if (
    flowController &&
    flowController.getFlows &&
    flowController.getFlowsShort &&
    flowController.saveFlow &&
    flowController.addFlow &&
    flowController.removeFlow &&
    flowController.handleSplitPathCreation
  ) {
    router.post(
      "/api/getFlows",
      asyncHandler(flowController.getFlows.bind(flowController))
    );

    router.post(
      "/api/getFlowsShort",
      asyncHandler(flowController.getFlowsShort.bind(flowController))
    );

    router.post(
      "/api/saveFlow",
      asyncHandler(flowController.saveFlow.bind(flowController))
    );

    router.post(
      "/api/addFlow",
      asyncHandler(flowController.addFlow.bind(flowController))
    );

    router.post(
      "/api/removeFlow",
      validateAccessToken,
      asyncHandler(flowController.removeFlow.bind(flowController))
    );

    router.post(
      "/api/handleSplitPathCreation",
      asyncHandler(flowController.handleSplitPathCreation.bind(flowController))
    );
  }

  return router;
}
