import express from 'express';

export function createMetricsRoutes(container) {
  const router = express.Router();
  const metricsController = container.getController('metrics');

  // Main Prometheus metrics endpoint
  router.get('/metrics', (req, res) => metricsController.getMetrics(req, res));

  // // Health check with metrics info
  // router.get('/metrics/health', (req, res) => metricsController.getHealthWithMetrics(req, res));

  // // Category-specific metrics endpoints (useful for debugging)
  // router.get('/metrics/network', (req, res) => metricsController.getNetworkMetrics(req, res));
  // router.get('/metrics/database', (req, res) => metricsController.getDatabaseMetrics(req, res));
  // router.get('/metrics/general', (req, res) => metricsController.getGeneralMetrics(req, res));

  // // Manual refresh endpoint (for debugging/testing)
  // router.post('/metrics/refresh', (req, res) => metricsController.refreshMetrics(req, res));

  return router;
}

export default createMetricsRoutes;