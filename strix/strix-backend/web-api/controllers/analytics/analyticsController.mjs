export class AnalyticsQueriesController {
  constructor(
    utilityService,
    abtestAnalytics,
    behaviorAnalytics,
    coreAnalytics,
    customAnalytics,
    economyAnalytics,
    overviewAnalytics,
    paymentsAnalytics,
    usersAnalytics
  ) {
    this.utilityService = utilityService;
    this.abtestAnalytics = abtestAnalytics;
    this.behaviorAnalytics = behaviorAnalytics;
    this.coreAnalytics = coreAnalytics;
    this.customAnalytics = customAnalytics;
    this.economyAnalytics = economyAnalytics;
    this.overviewAnalytics = overviewAnalytics;
    this.paymentsAnalytics = paymentsAnalytics;
    this.usersAnalytics = usersAnalytics;
  }

  async getOverviewStatistics(req, res) {
    const { gameIDs } = req.body;

    const result = await this.overviewAnalytics.getFullOverviewStatistics_Games(
      gameIDs
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getOverviewStatisticsForPublisher(req, res) {
    const { studioIDs } = req.body;

    const result =
      await this.overviewAnalytics.getFullOverviewStatistics_Studios(studioIDs);

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getCombinedMetricsByCountry(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.usersAnalytics.getCombinedMetricsByCountry(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getNewUsersByCountry(req, res) {
    const { gameID, branch, filterDate, filterSegments } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.usersAnalytics.getNewUsersByCountry(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      filterDate,
      filterSegments
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getRetentionByCountry(req, res) {
    const { gameID, branch, filterDate, filterSegments } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.usersAnalytics.getRetentionByCountry(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      filterDate,
      filterSegments
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getNewUsers(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.usersAnalytics.getNewUsers(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getRetentionBig(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      filterDateSecondary,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.usersAnalytics.getRetentionBig(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      filterDateSecondary,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getRetention(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      filterDateSecondary,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.usersAnalytics.getRetention(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      filterDateSecondary,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getARPPU(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.paymentsAnalytics.getARPPU(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getARPU(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.paymentsAnalytics.getARPU(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getCumulativeARPU(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.paymentsAnalytics.getCumulativeARPU(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getDAU(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.usersAnalytics.getDAU(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryPaymentsConversion(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.paymentsAnalytics.getPaymentConversion(
      studioID,
      this.utilityService.getDemoGameID(gameID),
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryBehaviorAnalysis(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      minSessionLength,
      isEconomy,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    let results;
    if (isEconomy) {
      results = await this.behaviorAnalytics.queryEconomyAnalysis(
        this.utilityService.getDemoGameID(gameID),
        studioID,
        branch,
        environment,
        filterDate,
        filterSegments,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics
      );
    } else {
      results = await this.behaviorAnalytics.queryBehaviorAnalysis(
        this.utilityService.getDemoGameID(gameID),
        studioID,
        branch,
        environment,
        filterDate,
        filterSegments,
        minSessionLength,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics
      );
    }

    if (results) {
      res.status(200).json({
        success: true,
        message: results,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryOfferAnalytics(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      offerID,
      includeBranchInAnalytics = false,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const results = await this.paymentsAnalytics.getOfferAnalytics(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      offerID,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (results) {
      res.status(200).json({
        success: true,
        message: results,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryDaysToConvertToPayment(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.paymentsAnalytics.getDaysToConvertToPayment(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryPaymentsConversionFunnel(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.paymentsAnalytics.getPaymentConversionFunnel(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryTopRealProducts(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.paymentsAnalytics.realMoneyTopProducts(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getAvgCustomerProfile(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const [result1, result2, profileData] = await Promise.all([
      this.paymentsAnalytics.getARPU(
        this.utilityService.getDemoGameID(gameID),
        studioID,
        branch,
        environment,
        filterDate,
        filterSegments,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics
      ),
      this.paymentsAnalytics.getARPPU(
        this.utilityService.getDemoGameID(gameID),
        studioID,
        branch,
        environment,
        filterDate,
        filterSegments,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics
      ),
      this.paymentsAnalytics.queryAvgCustomerProfile_Profile(
        this.utilityService.getDemoGameID(gameID),
        branch,
        environment,
        filterDate,
        filterSegments,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics
      ),
    ]);

    const { profile, totalPlayers } = profileData;

    const result = {
      arpu: result1,
      arppu: result2,
      avgProfile: profile,
      totalPlayers: totalPlayers,
    };

    if (result) {
      res.status(200).json({
        success: true,
        message: {
          arpu: result1,
          arppu: result2,
          avgProfile: profile,
          totalPlayers: totalPlayers,
        },
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getRevenue(req, res) {
    try {
      const {
        gameID,
        branch,
        environment,
        filterDate,
        filterSegments,
        includeBranchInAnalytics,
        includeEnvironmentInAnalytics,
      } = req.body;

      const studioID = await this.utilityService.getStudioIDByGameID(
        this.utilityService.getDemoGameID(gameID)
      );

      const pastInterval = this.coreAnalytics.getPastInterval(filterDate);

      const [resultPast, resultCurrent] = await Promise.all([
        this.paymentsAnalytics.querySalesAndRevenue(
          this.utilityService.getDemoGameID(gameID),
          studioID,
          branch,
          environment,
          pastInterval,
          filterSegments,
          includeBranchInAnalytics,
          includeEnvironmentInAnalytics
        ),
        this.paymentsAnalytics.querySalesAndRevenue(
          this.utilityService.getDemoGameID(gameID),
          studioID,
          branch,
          environment,
          filterDate,
          filterSegments,
          includeBranchInAnalytics,
          includeEnvironmentInAnalytics
        ),
      ]);

      function sumRevenue(data) {
        return data.reduce(
          (total, entry) => total + parseFloat(entry.revenue),
          0
        );
      }
      const totalPastRevenue = sumRevenue(resultPast);
      const totalCurrentRevenue = sumRevenue(resultCurrent);

      const revenueDifference = parseFloat(
        (totalCurrentRevenue - totalPastRevenue).toFixed(2)
      );

      res.status(200).json({
        success: true,
        message: {
          data: resultCurrent || 0,
          deltaValue: revenueDifference || 0,
          absoluteSumm: totalCurrentRevenue || 0,
        },
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async getSalesAndRevenueByCountry(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.paymentsAnalytics.querySalesAndRevenueByCountry(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({
        success: true,
        message: result,
      });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryTopSourcesAndSinks(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.economyAnalytics.inGameEconomyTopSourcesAndSinks(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({ success: true, message: result });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryTopProductsDiscountAndSpend(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.economyAnalytics.topProductsDiscountAndSpend(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({ success: true, message: result });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryTopCurrencyProducts(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.economyAnalytics.inGameEconomyTopProducts(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({ success: true, message: result });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryInGameBalance(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      viewType,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const result = await this.economyAnalytics.inGameEconomyCurrencyBalance(
      this.utilityService.getDemoGameID(gameID),
      studioID,
      branch,
      environment,
      filterDate,
      filterSegments,
      viewType,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    if (result) {
      res.status(200).json({ success: true, message: result });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryUniversalAnalytics(req, res) {
    const {
      gameID,
      branch,
      environment,
      filterDate,
      filterSegments,
      metrics,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics,
      specificTimeframe = false,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );

    const metricsData = await Promise.all(
      metrics.map((metric) =>
        this.customAnalytics.universalAnalyticsRequest({
          gameID: this.utilityService.getDemoGameID(gameID),
          studioID,
          branch,
          environment,
          categoryField: metric.categoryField,
          filterDate,
          filterSegments,
          metric,
          viewType: metric.dimension,
          includeBranchInAnalytics,
          includeEnvironmentInAnalytics,
          specificTimeframe,
        })
      )
    );

    if (metricsData) {
      res.status(200).json({ success: true, message: metricsData });
    } else {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  async queryABTestData(req, res) {
    const {
      gameID,
      branch,
      environment,
      testID,
      metricObj,
      cupedMetricObj,
      startDate,
      endDate,
      includeBranchInAnalytics = false,
      includeEnvironmentInAnalytics = false,
    } = req.body;

    const studioID = await this.utilityService.getStudioIDByGameID(
      this.utilityService.getDemoGameID(gameID)
    );
    const result = await this.abtestAnalytics.getABTestData(
      this.utilityService.getDemoGameID(gameID),
      testID,
      studioID,
      branch,
      environment,
      metricObj,
      cupedMetricObj,
      startDate,
      endDate,
      includeBranchInAnalytics,
      includeEnvironmentInAnalytics
    );

    res.status(200).json({ success: true, message: result });
  }

    async getPlayersProfileByClientIDs(req, res) {
    const { gameID, branch, clientIDs } = req.body;
    const result = await this.behaviorAnalytics.getPlayersProfileByClientIDs(
      gameID,
      branch,
      clientIDs
    );
    res.status(200).json({ success: true, players: result });
  }
}
