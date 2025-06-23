export class AnalyticsController {
  constructor(analyticsService, clusteringService, utilityService) {
    this.analyticsService = analyticsService;
    this.clusteringService = clusteringService;
    this.utilityService = utilityService;
  }

  async createNewAnalyticsEvent(req, res) {
    const { gameID, branch } = req.body;
    const newEvent = await this.analyticsService.createNewAnalyticsEvent(
      gameID,
      branch,
      req.clientUID
    );
    res.status(200).json({
      success: true,
      message: "New analytics event created",
      newEvent,
    });
  }

  async removeAnalyticsEvent(req, res) {
    const { gameID, branch, eventID } = req.body;
    const result = await this.analyticsService.removeAnalyticsEvent(
      gameID,
      branch,
      eventID,
      req.clientUID
    );

    if (!result) {
      return res.status(404).json({ message: "Analytics event not found" });
    }
    res.status(200).json({ success: true, message: "Analytics event deleted" });
  }

  async updateAnalyticsEvent(req, res) {
    const { gameID, branch, eventID, eventObject } = req.body;
    await this.analyticsService.updateAnalyticsEvent(
      gameID,
      branch,
      eventID,
      eventObject,
      req.clientUID
    );
    res.status(200).json({
      success: true,
      message: "Analytics event updated successfully",
    });
  }

  async getRecentAnalyticsEvents(req, res) {
    const { gameID, branch, eventID } = req.body;
    const result = await this.analyticsService.getRecentAnalyticsEvents(
      gameID,
      branch,
      eventID
    );
    res.status(200).json({ success: true, events: result });
  }

  async getAnalyticsEvents(req, res) {
    const { gameID, branch, eventIDs } = req.body;
    const result = await this.analyticsService.getAnalyticsEvents(
      gameID,
      branch,
      eventIDs
    );
    res.status(200).json({ success: true, events: result });
  }
  async getAnalyticsEvent(req, res) {
    const { gameID, branch, eventID } = req.body;
   const result = await this.analyticsService.getAnalyticsEvent(
        gameID,
        branch,
        eventID
      );
    res.status(200).json({ success: true, events: result });
  }
  async getAllAnalyticsEvents(req, res) {
    const { gameID, branch, eventIDs } = req.body;
    const result = await this.analyticsService.getAllAnalyticsEvents(
      gameID,
      branch,
      eventIDs
    );
    res.status(200).json({ success: true, events: result });
  }

}
