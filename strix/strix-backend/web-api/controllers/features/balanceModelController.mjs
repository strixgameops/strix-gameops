export class BalanceModelController {
  constructor(balanceModelService) {
    this.balanceModelService = balanceModelService;
  }

  async getBalanceModel(req, res) {
    try {
      const { gameID, branch, specificTypes } = req.body;
      const result = await this.balanceModelService.getBalanceModel(
        gameID,
        branch,
        specificTypes
      );
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error("Error in getBalanceModel controller:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async gameModelUpdateSegmentOverride(req, res) {
    try {
      const { gameID, branch, segmentID, variableID, value } = req.body;
      const result =
        await this.balanceModelService.gameModelUpdateSegmentOverride(
          gameID,
          branch,
          segmentID,
          variableID,
          value
        );
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error(
        "Error in gameModelUpdateSegmentOverride controller:",
        error
      );
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async gameModelCreateOrUpdateVariable(req, res) {
    try {
      const {
        gameID,
        branch,
        variableID,
        variableName,
        variableComment,
        variableType,
        defaultValue,
        respectiveCategory,
      } = req.body;
      const result =
        await this.balanceModelService.gameModelCreateOrUpdateVariable(
          gameID,
          branch,
          variableID,
          variableName,
          variableComment,
          variableType,
          defaultValue,
          respectiveCategory
        );
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error(
        "Error in gameModelCreateOrUpdateVariable controller:",
        error
      );
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async gameModelRemoveVariable(req, res) {
    try {
      const { gameID, branch, variableID } = req.body;
      const result = await this.balanceModelService.gameModelRemoveVariable(
        gameID,
        branch,
        variableID
      );
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error("Error in gameModelRemoveVariable controller:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async gameModelCreateOrUpdateFunction(req, res) {
    try {
      const { gameID, branch, functionID, changes } = req.body;
      const result =
        await this.balanceModelService.gameModelCreateOrUpdateFunction(
          gameID,
          branch,
          functionID,
          changes
        );
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error(
        "Error in gameModelCreateOrUpdateFunction controller:",
        error
      );
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async gameModelRemoveFunction(req, res) {
    try {
      const { gameID, branch, functionID } = req.body;
      const result = await this.balanceModelService.gameModelRemoveFunction(
        gameID,
        branch,
        functionID
      );
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error("Error in gameModelRemoveFunction controller:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async gameModelRemoveAllByCategory(req, res) {
    try {
      const { gameID, branch, respectiveCategory } = req.body;
      const result =
        await this.balanceModelService.gameModelRemoveAllByCategory(
          gameID,
          branch,
          respectiveCategory
        );
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error("Error in gameModelRemoveAllByCategory controller:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async gameModelManageFunctionLinkedConfigValue(req, res) {
    try {
      const { gameID, branch, valueSID, actionType, changes } = req.body;
      const result =
        await this.balanceModelService.gameModelManageFunctionLinkedConfigValue(
          gameID,
          branch,
          valueSID,
          actionType,
          changes
        );
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error(
        "Error in gameModelManageFunctionLinkedConfigValue controller:",
        error
      );
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async gameModelCreateOrUpdateTab(req, res) {
    try {
      const { gameID, branch, tabID, tabName } = req.body;
      const result = await this.balanceModelService.gameModelCreateOrUpdateTab(
        gameID,
        branch,
        tabID,
        tabName
      );
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error("Error in gameModelCreateOrUpdateTab controller:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async gameModelRemoveTab(req, res) {
    try {
      const { gameID, branch, tabID } = req.body;
      const result = await this.balanceModelService.gameModelRemoveTab(
        gameID,
        branch,
        tabID
      );
      res.status(200).json({ success: true, result });
    } catch (error) {
      console.error("Error in gameModelRemoveTab controller:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
}
