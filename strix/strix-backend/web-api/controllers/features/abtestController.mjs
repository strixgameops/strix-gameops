export class ABTestController {
  constructor(abtestService, utilityService, analyticsService) {
    this.abtestService = abtestService;
    this.utilityService = utilityService;
    this.analyticsService = analyticsService;
  }

  async getABTests(req, res) {
    const { gameID, branch } = req.body;
    const result = await this.abtestService.getABTests(gameID, branch);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }

  async createABTest(req, res) {
    const { gameID, branch, testObject } = req.body;
    const result = await this.abtestService.createABTest(
      gameID,
      branch,
      testObject,
      req.clientUID
    );

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  }

  async removeABTest(req, res) {
    const {
      gameID,
      branch,
      testObject,
      shouldArchive,
      archiveResult,
      shouldRollout,
    } = req.body;
    const result = await this.abtestService.removeABTest(
      gameID,
      branch,
      testObject,
      shouldArchive,
      archiveResult,
      shouldRollout,
      req.clientUID
    );

    if (result.success) {
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  }

  async updateABTest(req, res) {
    const { gameID, branch, testObject } = req.body;
    const result = await this.abtestService.updateABTest(
      gameID,
      branch,
      testObject,
      req.clientUID
    );
    res.status(200).json(result || { success: true });
  }

  async getABTestsShort(req, res) {
    const { gameID, branch } = req.body;
    const result = await this.abtestService.getABTestsShort(gameID, branch);
    res.status(200).json(result || { success: true });
  }
}
