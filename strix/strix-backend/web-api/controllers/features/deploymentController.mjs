export class DeploymentController {
  constructor(deploymentService, utilityService, loggingService) {
    this.deploymentService = deploymentService;
    this.utilityService = utilityService;
    this.loggingService = loggingService;
  }

  async getLatestDeployedBranches(req, res, next) {
    try {
      const { gameID, limit } = req.body;
      const result = await this.deploymentService.getLatestDeployedBranches(
        this.utilityService.getDemoGameID(gameID),
        limit
      );
      res.status(200).json({ success: true, result: result });
    } catch (error) {
      next(error);
    }
  }

  async getListOfEnvironments(req, res, next) {
    try {
      const { gameID } = req.body;
      const result = await this.deploymentService.getListOfEnvironments(
        this.utilityService.getDemoGameID(gameID)
      );
      res.status(200).json({ success: true, result: result });
    } catch (error) {
      next(error);
    }
  }

  async getGameDeploymentCatalog(req, res, next) {
    try {
      const { gameID } = req.body;
      const result = await this.deploymentService.getGameDeploymentCatalog(gameID);
      res.status(200).json({ success: true, result: result });
    } catch (error) {
      next(error);
    }
  }

  async updateGameDeploymentCatalog(req, res, next) {
    try {
      const { gameID, environment, updateObj, deployRealtime } = req.body;
      const result = await this.deploymentService.updateGameDeploymentCatalog(
        gameID,
        environment,
        updateObj,
        deployRealtime
      );
      res.status(200).json({ success: true, result: result });
    } catch (error) {
      next(error);
    }
  }

  async removeDeploymentVersion(req, res, next) {
    try {
      const { gameID, version } = req.body;
      const result = await this.deploymentService.removeDeploymentVersion(
        gameID,
        version
      );
      res.status(200).json({ success: true, result: result });
    } catch (error) {
      next(error);
    }
  }

  async cookBranchContent(req, res, next) {
    try {
      const { gameID, sourceBranch, tags, commitMessage } = req.body;
      const clientUID = req.clientUID;

      const result = await this.deploymentService.startCookingProcess(
        gameID,
        sourceBranch,
        tags,
        commitMessage,
        clientUID
      );

      res.status(200).json({ success: true, result: result });
    } catch (error) {
      const { gameID } = req.body;
      const clientUID = req.clientUID;

      this.loggingService.logAction(
        gameID,
        "cooking",
        `CLIENT: ${clientUID} | ACTION: content push failed with error: ${error.toString()}`
      );
      next(error);
    }
  }

  async getDeploymentChecksums(req, res, next) {
    try {
      const { gameID, sourceBranch, targetBranch } = req.body;
      const { sourceChecksums, targetChecksums, deployChecksum } =
        await this.deploymentService.getDeploymentChecksums(
          gameID,
          sourceBranch,
          targetBranch
        );

      res.status(200).json({
        success: true,
        sourceChecksums,
        targetChecksums,
        deployChecksum: deployChecksum,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentAudienceDeploymentStats(req, res, next) {
    try {
      const { gameID } = req.body;
      const result = await this.deploymentService.getCurrentAudienceDeploymentStats(
        gameID
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}