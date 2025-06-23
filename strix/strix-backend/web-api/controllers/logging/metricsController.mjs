export class MetricsController {
  constructor(metricsService) {
    this.metricsService = metricsService;
  }

  // Middleware to record HTTP metrics
  middleware() {
    return (req, res, next) => {
      this.metricsService.recordRequest(req, res);
      next();
    };
  }

  // Main metrics endpoint for Prometheus scraping
  async getMetrics(req, res) {
    try {
      const metrics = await this.metricsService.getAllMetrics();
      
      res.set('Content-Type', this.metricsService.getContentType());
      res.end(metrics);
    } catch (error) {
      console.error('Error collecting metrics:', error);
      res.status(500).json({ 
        error: 'Failed to collect metrics',
        message: error.message 
      });
    }
  }

  // Health check endpoint that includes basic metrics info
  async getHealthWithMetrics(req, res) {
    try {
      const metrics = await this.metricsService.getAllMetrics();
      const metricsCount = metrics.split('\n').filter(line => 
        line.startsWith('strix_') && !line.startsWith('# ')
      ).length;

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metricsCollected: metricsCount,
        service: 'metrics'
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message,
        service: 'metrics'
      });
    }
  }

  // Endpoint to get specific metric categories
  async getNetworkMetrics(req, res) {
    try {
      const metrics = await this.metricsService.registries.network.metrics();
      res.set('Content-Type', this.metricsService.getContentType());
      res.end(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect network metrics' });
    }
  }

  async getDatabaseMetrics(req, res) {
    try {
      const metrics = await this.metricsService.registries.database.metrics();
      res.set('Content-Type', this.metricsService.getContentType());
      res.end(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect database metrics' });
    }
  }

  async getGeneralMetrics(req, res) {
    try {
      const metrics = await this.metricsService.registries.general.metrics();
      res.set('Content-Type', this.metricsService.getContentType());
      res.end(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to collect general metrics' });
    }
  }

  // Endpoint to manually trigger metrics update (useful for debugging)
  async refreshMetrics(req, res) {
    try {
      await this.metricsService.updateGeneralMetrics();
      res.json({ 
        message: 'Metrics refreshed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to refresh metrics',
        message: error.message 
      });
    }
  }
}

export default MetricsController;