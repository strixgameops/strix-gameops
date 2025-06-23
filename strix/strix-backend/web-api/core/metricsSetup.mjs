export function setupMetrics(container) {
  // Check if metrics service is available
  if (!container.has('metrics')) {
    console.warn('Metrics service not available, using fallback');
    return {
      metricsMiddleware: (req, res, next) => next(),
      metricsEndpoint: (req, res) => res.status(503).json({ error: 'Metrics service unavailable' })
    };
  }

  // Return middleware and endpoint functions using the service directly
  const metricsService = container.get('metrics');
  
  const metricsMiddleware = (req, res, next) => {
    // Basic middleware that tracks requests
    if (metricsService.trackRequest) {
      metricsService.trackRequest(req, res);
    }
    next();
  };

  const metricsEndpoint = async (req, res) => {
    try {
      // Check if controller exists before using it
      if (container.hasController && container.hasController('metrics')) {
        const metricsController = container.getController('metrics');
        await metricsController.getMetrics(req, res);
      } else {
        // Fallback to service method if controller not available
        const metrics = await metricsService.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
      }
    } catch (error) {
      console.error('Error in metrics endpoint:', error);
      res.status(500).json({ 
        error: 'Failed to collect metrics',
        message: error.message 
      });
    }
  };

  return { metricsMiddleware, metricsEndpoint };
}