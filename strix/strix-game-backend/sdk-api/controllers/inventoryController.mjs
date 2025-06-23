export class InventoryController {
  constructor(utilityService, metricsService, inventoryService) {
    this.utilityService = utilityService;
    this.metricsService = metricsService;
    this.inventoryService = inventoryService;
  }

  async getInventoryItems(req, res) {
    const { secret, build, environment = "production", device } = req.body;

    const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
    if (!gameObj) {
      res.status(400).json({ success: false, message: "Invalid secret" });
      return;
    }

    this.utilityService.log(
      "/api/getInventoryItems",
      gameObj.gameID,
      build,
      environment,
      device
    );

    let result;
    await this.metricsService.recordDurationMetric(
      this.metricsService.inventoryProcessingDur,
      { operation_type: "getInventoryItems", gameID: gameObj.gameID },
      async () => {
        result = await this.inventoryService.getInventoryItems(
          gameObj.gameID,
          build,
          environment,
          device
        );
      }
    );

    this.metricsService.recordInventoryOperation(
      gameObj.gameID,
      "getInventoryItems"
    );
    res.json({
      success: true,
      data: result || [],
    });
  }
  async getInventoryItemAmount(req, res) {
    const {
      secret,
      build,
      environment = "production",
      device,
      nodeID,
      slot,
    } = req.body;

    if (!nodeID) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid nodeID" });
    }

    const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
    if (!gameObj) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid secret" });
    }

    this.utilityService.log(
      "/api/getInventoryItemAmount",
      gameObj.gameID,
      build,
      environment,
      device,
      nodeID
    );

    let result;
    await this.metricsService.recordDurationMetric(
      this.metricsService.inventoryProcessingDur,
      { operation_type: "getInventoryItemAmount", gameID: gameObj.gameID },
      async () => {
        result = await this.inventoryService.getInventoryItemAmount(
          gameObj.gameID,
          build,
          environment,
          device,
          nodeID,
          slot
        );
      }
    );

    this.metricsService.recordInventoryOperation(
      gameObj.gameID,
      "getInventoryItemAmount"
    );

    res.json({
      success: true,
      data: result,
    });
  }
  async removeInventoryItem(req, res) {
    const {
      secret,
      build,
      environment = "production",
      device,
      nodeID,
      amount,
      slot,
    } = req.body;

    if (!nodeID) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid nodeID" });
    }

    if (isNaN(amount) && isNaN(parseInt(amount))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
    if (!gameObj) {
      res.status(400).json({ success: false, message: "Invalid secret" });
      return;
    }

    this.utilityService.log(
      "/api/removeInventoryItem",
      gameObj.gameID,
      build,
      environment,
      device,
      nodeID,
      amount,
      slot
    );

    let result;
    await this.metricsService.recordDurationMetric(
      this.metricsService.inventoryProcessingDur,
      { operation_type: "removeInventoryItem", gameID: gameObj.gameID },
      async () => {
        result = await this.inventoryService.removeInventoryItem(
          gameObj.gameID,
          build,
          environment,
          device,
          nodeID,
          amount,
          slot
        );
      }
    );

    this.metricsService.recordInventoryOperation(
      gameObj.gameID,
      "removeInventoryItem"
    );

    res.json(result);
  }
  async addInventoryItem(req, res) {
    const {
      secret,
      build,
      environment = "production",
      device,
      nodeID,
      amount,
      slot,
    } = req.body;

    if (!nodeID) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid nodeID" });
    }

    if (isNaN(amount) && isNaN(parseInt(amount))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    }

    const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
    if (!gameObj) {
      res.status(400).json({ success: false, message: "Invalid secret" });
      return;
    }

    this.utilityService.log(
      "/api/addInventoryItem",
      gameObj.gameID,
      build,
      environment,
      device,
      nodeID,
      amount,
      slot
    );

    let result;
    await this.metricsService.recordDurationMetric(
      this.metricsService.inventoryProcessingDur,
      { operation_type: "addInventoryItem", gameID: gameObj.gameID },
      async () => {
        result = await this.inventoryService.addInventoryItem(
          gameObj.gameID,
          build,
          environment,
          device,
          nodeID,
          amount,
          slot
        );
      }
    );

    this.metricsService.recordInventoryOperation(
      gameObj.gameID,
      "addInventoryItem"
    );

    res.json(result);
  }
}
