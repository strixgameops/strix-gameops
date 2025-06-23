export class DeploymentController {
  constructor(utilityService, metricsService, deploymentService, fcmService, warehouseService) {
    this.utilityService = utilityService;
    this.metricsService = metricsService;
    this.deploymentService = deploymentService;
    this.fcmService = fcmService;
    this.warehouseService = warehouseService;
  }
  async sdkCheck(req, res) {
    const { platform, engineVersion, sdkVersion } = req.body;

    const currentSDKVersion_Unity = process.env.TARGET_SDK_VERSION;
    if (sdkVersion === currentSDKVersion_Unity) {
      res.json({
        success: true,
        isGood: true,
        message: `You're up to date! Current actual SDK version is ${currentSDKVersion_Unity}`,
      });
    } else {
      res.json({
        success: true,
        isGood: false,
        message: `Your StrixSDK version is behind current releases! Current actual SDK version is ${currentSDKVersion_Unity}, got ${sdkVersion} while checking. Please update your version to prevent any backwards compatibility issues`,
      });
    }
  }
  async checksumCheckup(req, res) {
    const { tableNames, secret, device, environment = "production" } = req.body;

    this.utilityService.log("/api/v1/checksumCheckup", req.body);

    try {
      if (!secret)
        return res
          .status(400)
          .json({ success: false, message: "API key is required" });
      if (!device)
        return res
          .status(400)
          .json({ success: false, message: "Device ID is required" });
      if (!environment)
        return res
          .status(400)
          .json({ success: false, message: "Environment type is required" });
      if (!tableNames)
        return res
          .status(400)
          .json({ success: false, message: "Missing or wrong table name" });

      const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
      if (!gameObj) {
        res.status(400).json({ success: false, message: "Invalid secret" });
        return;
      }

      let updateData;
      await this.metricsService.recordDurationMetric(
        this.metricsService.deploymentProcessingDur_checksumCheckup,
        { gameID: gameObj.gameID },
        async () => {
          updateData = await this.deploymentService.getConfigChecksumForPlayer(
            gameObj.gameID,
            environment,
            device,
            tableNames
          );
        }
      );

      this.metricsService.recordSDKCheckup(gameObj.gameID);

      res.json({
        success: true,
        data: updateData,
      });
    } catch (e) {
      console.error("Error at checksumCheckup:", e);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }
  async clientUpdate(req, res) {
    const {
      tableName,
      secret,
      device,
      environment = "production",
      itemHashes = {},
    } = req.body;

    this.utilityService.log("/api/v1/clientUpdate", req.body);

    try {
      if (!secret)
        return res
          .status(400)
          .json({ success: false, message: "API key is required" });
      if (!device)
        return res
          .status(400)
          .json({ success: false, message: "Device ID is required" });
      if (!environment)
        return res
          .status(400)
          .json({ success: false, message: "Environment type is required" });
      if (!this.utilityService.tablesNamespaces.includes(tableName))
        return res
          .status(400)
          .json({ success: false, message: "Missing or wrong table name" });

      const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
      if (!gameObj) {
        res.status(400).json({ success: false, message: "Invalid secret" });
        return;
      }

      let updatedItems, deletedItemIds, totalChecksum;
      await this.metricsService.recordDurationMetric(
        this.metricsService.deploymentProcessingDur_clientUpdate,
        { gameID: gameObj.gameID },
        async () => {
          ({ updatedItems, deletedItemIds, totalChecksum } =
            await this.deploymentService.getOrAssignConfigForPlayer(
              gameObj.gameID,
              environment,
              device,
              tableName,
              itemHashes
            ));
        }
      );

      this.metricsService.recordSDKUpdate(gameObj.gameID);
      res.json({
        success: true,
        data: {
          items: updatedItems,
          deletedIds: deletedItemIds,
          totalChecksum: totalChecksum,
        },
      });
    } catch (e) {
      console.error("Error at clientUpdate:", e);
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }
  async regToken(req, res) {
    const {
      secret,
      device,
      token,
      build,
      environment = "production",
    } = req.body;

    this.utilityService.log("/api/v1/regToken", req.body);

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
    if (!token || token === "StubToken")
      return res
        .status(400)
        .json({ success: false, message: "Missing or wrong token" });

    const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
    if (!gameObj) {
      res.status(400).json({ success: false, message: "Invalid secret" });
      return;
    }

    await this.fcmService?.registerToken(gameObj.gameID, device, token, build, environment);
    this.metricsService.recordTokenReg(gameObj.gameID);
    res.json({
      success: true,
      message: `OK`,
    });
  }
  async init(req, res) {
    try {
      const { device, secret, session, environment = "production" } = req.body;

      if (!secret)
        return res
          .status(400)
          .json({ success: false, message: "API key is required" });
      if (!device)
        return res
          .status(400)
          .json({ success: false, message: "Device ID is required" });
      if (!session)
        return res
          .status(400)
          .json({ success: false, message: "Session ID is required" });
      const gameObj = await this.utilityService.getCachedGameIdBySecret(secret);
      if (!gameObj) {
        res.status(400).json({ success: false, message: "Invalid secret" });
        return;
      }

      let isNewPlayer, playerWarehouse, playerCurrency;

      await this.metricsService.recordDurationMetric(
        this.metricsService.deploymentProcessingDur_init,
        { gameID: gameObj.gameID },
        async () => {
          ({ isNewPlayer, playerWarehouse, playerCurrency } =
            await this.warehouseService.initializeSdkSession(
              gameObj.gameID,
              environment,
              device,
              req.clientIp
            ));
        }
      );

      this.metricsService.recordSDKInit(gameObj.gameID);
      res.status(200).json({
        success: true,
        message: "OK",
        data: {
          playerData: {
            clientID: playerWarehouse.clientID,
            offers: playerWarehouse.offers,
            abtests: playerWarehouse.abtests,
            segments: playerWarehouse.segments,
            elements: playerWarehouse.elements,
          },
          currency: playerCurrency,
          fcmData: {
            apiKey: `${process.env.FB_FCM_API_KEY}`,
            appId: `${process.env.FB_FCM_APP_ID}`,
            projectId: `${process.env.FB_FCM_PROJECT_ID}`,
            senderId: `${process.env.FB_FCM_SENDER_ID}`,
            storageBucket: `${process.env.FB_FCM_STORAGE_BUCKET}`,
          },
          isNewPlayer: isNewPlayer,
          version: playerWarehouse.branch,
        },
      });
    } catch (e) {
      console.error("Fatal error getting analytics event:", e);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}
