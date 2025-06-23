export class WarehouseController {
  constructor(utilityService, metricsService, warehouseService) {
    this.utilityService = utilityService;
    this.metricsService = metricsService;
    this.warehouseService = warehouseService;
  }

  async setOfferExpiration(req, res) {
    const {
      device,
      secret,
      build,
      environment = "production",
      offerID,
      expiration,
    } = req.body;

    this.utilityService.log("/api/v1/setOfferExpiration", req.body);

    if (!secret)
      return res
        .status(400)
        .json({ success: false, message: "API key is required" });
    if (!device)
      return res
        .status(400)
        .json({ success: false, message: "Device ID is required" });
    if (!build)
      return res
        .status(400)
        .json({ success: false, message: "Build type is required" });
    if (!expiration)
      return res
        .status(400)
        .json({ success: false, message: "Expiration time is required" });

    const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
    if (!gameObj) {
      res.status(400).json({ success: false, message: "Invalid secret" });
      return;
    }

    await this.warehouseService.changePlayerOfferExpiration(
      gameObj.gameID,
      device,
      build,
      environment,
      offerID,
      expiration
    );

    res.json({
      success: true,
      message: `OK`,
    });
  }
  async getLeaderboard(req, res) {
    const {
      secret,
      device,
      build,
      environment = "production",
      leaderboardID,
      groupID,
      groupValue,
    } = req.body;

    this.utilityService.log("/api/v1/getLeaderboard", req.body);

    try {
      if (!secret)
        return res
          .status(400)
          .json({ success: false, message: "API key is required" });
      if (!device)
        return res
          .status(400)
          .json({ success: false, message: "Device ID is required" });
      if (!build)
        return res
          .status(400)
          .json({ success: false, message: "Build type is required" });
      if (!leaderboardID)
        return res.status(400).json({
          success: false,
          message: "Target leaderboard ID is required",
        });

      const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
      if (!gameObj) {
        res.status(400).json({ success: false, message: "Invalid secret" });
        return;
      }

      let result;

      await this.metricsService.recordDurationMetric(
        this.metricsService.leaderboardProcessingDur,
        { operation_type: "getLeaderboard", gameID: gameObj.gameID },
        async () => {
          result = await this.warehouseService.getLeaderboard(
            gameObj.gameID,
            build,
            environment,
            device,
            leaderboardID,
            groupID,
            groupValue
          );
        }
      );

      this.metricsService.recordLeaderboardOperation(
        gameObj.gameID,
        "getLeaderboard"
      );

      if (result) {
        return res.status(200).json({ success: true, data: result });
      } else {
        return res
          .status(200)
          .json({ success: false, message: "Leaderboard not found" });
      }
    } catch (error) {
      console.error("Error at getLeaderboard:", error);
      if (error.kind && error.valueType) {
        res.status(500).json({
          message: `Internal Server Error`,
        });
      }
    }
  }
  async getElementValue(req, res) {
    const {
      secret,
      device,
      build,
      environment = "production",
      elementID,
    } = req.body;

    this.utilityService.log("/api/v1/getElementValue", req.body);

    try {
      if (!secret)
        return res
          .status(400)
          .json({ success: false, message: "API key is required" });
      if (!device)
        return res
          .status(400)
          .json({ success: false, message: "Device ID is required" });
      if (!build)
        return res
          .status(400)
          .json({ success: false, message: "Build type is required" });
      if (!elementID)
        return res
          .status(400)
          .json({ success: false, message: "Target element ID is required" });

      const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
      if (!gameObj) {
        res.status(400).json({ success: false, message: "Invalid secret" });
        return;
      }

      let result;
      await this.metricsService.recordDurationMetric(
        this.metricsService.warehouseProcessingDur,
        { operation_type: "getElementValue", gameID: gameObj.gameID },
        async () => {
          result = await this.warehouseService.getElementValue(
            gameObj,
            build,
            environment,
            device,
            elementID
          );
        }
      );
      this.metricsService.recordWarehouseOperation(gameObj.gameID, "getElementValue");

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error("Error at getElementValue:", error);
      if (error.kind && error.valueType) {
        res.status(500).json({
          message: `Internal Server Error`,
        });
      }
    }
  }
  async setValueToStatisticElement(req, res) {
    const {
      secret,
      device,
      build,
      environment = "production",
      elementID,
      value,
    } = req.body;

    this.utilityService.log("/api/v1/setValueToStatisticElement", req.body);

    try {
      if (!secret)
        return res
          .status(400)
          .json({ success: false, message: "API key is required" });
      if (!device)
        return res
          .status(400)
          .json({ success: false, message: "Device ID is required" });
      if (!build)
        return res
          .status(400)
          .json({ success: false, message: "Build type is required" });
      if (!elementID)
        return res
          .status(400)
          .json({ success: false, message: "Target element ID is required" });
      if (value === null || value === undefined)
        return res.status(400).json({
          success: false,
          message: "Target element value is required",
        });

      const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
      if (!gameObj) {
        res.status(400).json({ success: false, message: "Invalid secret" });
        return;
      }

      await this.metricsService.recordDurationMetric(
        this.metricsService.warehouseProcessingDur,
        {
          operation_type: "setValueToStatisticElement",
          gameID: gameObj.gameID,
        },
        async () => {
          await this.warehouseService.setValueToStatisticElement(
            gameObj.gameID,
            build,
            environment,
            device,
            elementID,
            value
          );
        }
      );

      this.metricsService.recordWarehouseOperation(
        gameObj.gameID,
        "setValueToStatisticElement"
      );

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error at setValueToStatisticElement:", error);
      if (error.kind && error.valueType) {
        res.status(500).json({
          message: `Error trying to add value to statistic element. The element is '${error.kind}' type, got '${error.valueType}' instead.`,
        });
      } else {
        res.status(500).json({
          message: `Internal Server Error`,
        });
      }
    }
  }
  async subtractValueFromStatisticElement(req, res) {
    const {
      secret,
      device,
      build,
      environment = "production",
      elementID,
      value,
    } = req.body;

    this.utilityService.log(
      "/api/v1/subtractValueFromStatisticElement",
      req.body
    );

    try {
      if (!secret)
        return res
          .status(400)
          .json({ success: false, message: "API key is required" });
      if (!device)
        return res
          .status(400)
          .json({ success: false, message: "Device ID is required" });
      if (!build)
        return res
          .status(400)
          .json({ success: false, message: "Build type is required" });
      if (!elementID)
        return res
          .status(400)
          .json({ success: false, message: "Target element ID is required" });
      if (value === null || value === undefined)
        return res.status(400).json({
          success: false,
          message: "Target element value is required",
        });

      const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
      if (!gameObj) {
        res.status(400).json({ success: false, message: "Invalid secret" });
        return;
      }

      await this.metricsService.recordDurationMetric(
        this.metricsService.warehouseProcessingDur,
        {
          operation_type: "subtractValueFromStatisticElement",
          gameID: gameObj.gameID,
        },
        async () => {
          await this.warehouseService.subtractValueFromStatisticElement(
            gameObj,
            build,
            environment,
            device,
            elementID,
            value
          );
        }
      );
      this.metricsService.recordWarehouseOperation(
        gameObj.gameID,
        "subtractValueFromStatisticElement"
      );

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error at subtractValueFromStatisticElement:", error);
      if (error.kind && error.valueType) {
        res.status(500).json({
          message: `Error trying to add value to statistic element. The element is '${error.kind}' type, got '${error.valueType}' instead.`,
        });
      } else {
        res.status(500).json({
          message: `Internal Server Error`,
        });
      }
    }
  }
  async addValueToStatisticElement(req, res) {
    const {
      secret,
      device,
      build,
      environment = "production",
      elementID,
      value,
    } = req.body;

    this.utilityService.log("/api/v1/addValueToStatisticElement", req.body);

    try {
      if (!secret)
        return res
          .status(400)
          .json({ success: false, message: "API key is required" });
      if (!device)
        return res
          .status(400)
          .json({ success: false, message: "Device ID is required" });
      if (!elementID)
        return res
          .status(400)
          .json({ success: false, message: "Target element ID is required" });
      if (value === null || value === undefined)
        return res.status(400).json({
          success: false,
          message: "Target element value is required",
        });

      const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
      if (!gameObj) {
        res.status(400).json({ success: false, message: "Invalid secret" });
        return;
      }

      await this.metricsService.recordDurationMetric(
        this.metricsService.warehouseProcessingDur,
        {
          operation_type: "addValueToStatisticElement",
          gameID: gameObj.gameID,
        },
        async () => {
          await this.warehouseService.addValueToStatisticElement(
            gameObj,
            build,
            environment,
            device,
            elementID,
            value
          );
        }
      );

      this.metricsService.recordWarehouseOperation(
        gameObj.gameID,
        "addValueToStatisticElement"
      );

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error at addValueToStatisticElement:", error);
      if (error.kind && error.valueType) {
        res.status(500).json({
          message: `Error trying to add value to statistic element. The element is '${error.kind}' type, got '${error.valueType}' instead.`,
        });
      } else {
        res.status(500).json({
          message: `Internal Server Error`,
        });
      }
    }
  }
  async backendAction(req, res) {
    const {
      secret,
      build,
      device,
      action,
      payload,
      environment = "production",
    } = req.body;

    const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
    if (!gameObj) {
      res.status(400).json({ success: false, message: "Invalid secret" });
      return;
    }

    this.utilityService.log(
      "/api/backendAction",
      gameObj.gameID,
      build,
      device,
      action,
      payload
    );

    let result;

    await this.metricsService.recordDurationMetric(
      this.metricsService.backendActionsProcessingDur,
      { operation_type: action, gameID: gameObj.gameID },
      async () => {
        result = await this.warehouseService.backendPlayerAction(
          gameObj.gameID,
          build,
          environment,
          device,
          action,
          payload
        );
      }
    );
    this.metricsService.recordBackendActions(gameObj.gameID, action);

    res.json({
      success: result,
    });
  }
}
