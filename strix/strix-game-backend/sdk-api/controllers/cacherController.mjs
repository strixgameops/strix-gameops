export class CacherController {
  constructor(
    utilityService,
    metricsService,
    segmentService,
    populatorService,
    deploymentService
  ) {
    this.utilityService = utilityService;
    this.metricsService = metricsService;
    this.segmentService = segmentService;
    this.populatorService = populatorService;
    this.deploymentService = deploymentService;
  }
  async recalculateSegment(req, res) {
    const { gameID, branch, environment = "production", segmentID } = req.body;

    await this.metricsService.recordDurationMetric(
      this.metricsService.segmentRecalculationDur,
      { operation_type: "recalculatingSegment", gameID: gameID },
      async () => {
        await this.segmentService.recalculateSegment(
          gameID,
          branch,
          environment,
          segmentID
        );
      }
    );
    res.json({
      success: true,
    });
  }
  async populateStudioDB(req, res) {
    const { studioID, key } = req.body;

    this.utilityService.log("/api/populateStudioDB", studioID);

    if (key === process.env.ENCRYPT_SECRET_KEY) {
      await this.populatorService.populateStudioTables(studioID);
      res.json({
        success: true,
      });
    } else {
      res.json({
        success: false,
      });
    }
  }
  async updateCall(req, res) {
    const { gameID, environment = "production" } = req.body;

    this.deploymentService.processDeploymentUpdate(gameID, environment);

    res.json({
      success: true,
      message: `OK`,
    });
  }
}
