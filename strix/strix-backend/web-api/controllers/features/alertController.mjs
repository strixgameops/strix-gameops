export class AlertController {
  constructor(alertService) {
    this.alertService = alertService;
  }

  async createAlert(req, res) {
    const { gameID, branch, alertObj } = req.body;
    const result = await this.alertService.createAlert(gameID, branch, alertObj);
    res.status(200).json({ success: true, alert: result });
  }

  async updateAlert(req, res) {
    const { gameID, branch, alertID, alertObj } = req.body;
    const result = await this.alertService.updateAlert(gameID, branch, alertID, alertObj);
    res.status(200).json({ success: true, alert: result });
  }

  async removeAlert(req, res) {
    const { gameID, branch, alertID } = req.body;
    const result = await this.alertService.removeAlert(gameID, branch, alertID);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json({ success: false, error: "Failed to remove alert" });
    }
  }

  async removeAlertsWithChartID(req, res) {
    const { gameID, branch, chartID } = req.body;
    const result = await this.alertService.removeAlertsWithChartID(gameID, branch, chartID);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json({ success: false, error: "Failed to remove alerts" });
    }
  }

  async getAlertsByChartID(req, res) {
    const { gameID, branch, chartID } = req.body;
    const alerts = await this.alertService.getAlertsByChartID(gameID, branch, chartID);
    res.status(200).json({ success: true, alerts });
  }

  async getAllAlerts(req, res) {
    const { gameID, branch } = req.body;
    const alerts = await this.alertService.getAllAlerts(gameID, branch);
    res.status(200).json({ success: true, alerts });
  }
}