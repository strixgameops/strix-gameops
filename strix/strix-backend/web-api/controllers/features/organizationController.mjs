
export class OrganizationController {
  constructor(organizationService, authService) {
    this.organizationService = organizationService;
    this.authService = authService;
  }

  // User management
  getUser = async (req, res, next) => {
    try {
      const { email } = req.body;
      const result = await this.organizationService.getUser(email);
      res.json(result);
    } catch (error) {
      console.error("Error fetching user details:", error);
      next(error);
    }
  };



  finishInitialOnboarding = async (req, res, next) => {
    try {
      const {
        publisherName,
        email,
        username,
        jobTitle,
        studioName,
        studioApiKey,
        studioIcon,
      } = req.body;
      const result = await this.organizationService.finishUserOnboarding({
        publisherName,
        email,
        username,
        jobTitle,
        studioName,
        studioApiKey,
        studioIcon,
      });
      res.status(200).json({
        success: true,
        message: "User onboarded successfully",
        ...result,
      });
    } catch (error) {
      console.error("Error finishing registration process:", error);
      next(error);
    }
  };



  initiateChangeUserProfile = async (req, res, next) => {
    try {
      const { type, email, newData } = req.body;
      const result = await this.organizationService.initiateChangeUserProfile(
        type,
        email,
        newData
      );
      res.json(result);
    } catch (error) {
      console.error("Error initiating user profile change:", error);
      next(error);
    }
  };

  confirmUserChangeProfileCode = async (req, res, next) => {
    try {
      const { type, email, code, newData } = req.body;
      const result =
        await this.organizationService.confirmUserChangeProfileCode(
          type,
          email,
          code,
          newData
        );
      res.json(result);
    } catch (error) {
      console.error("Error confirming user change profile code:", error);
      next(error);
    }
  };

  removeUser = async (req, res, next) => {
    try {
      const { email, token } = req.body;
      const result = await this.organizationService.scheduleUserRemoval(
        email,
        token
      );
      res.status(200).json({
        success: true,
        message: "User scheduled for removal successfully",
        date: result,
      });
    } catch (error) {
      console.error("Error scheduling user removal:", error);
      next(error);
    }
  };

  cancelRemoveUser = async (req, res, next) => {
    try {
      const { email, token } = req.body;
      await this.organizationService.cancelRemoveUser(email, token);
      res
        .status(200)
        .json({ success: true, message: "Deletion canceled successfully!" });
    } catch (error) {
      console.error("Error canceling user removal:", error);
      next(error);
    }
  };

  markUserTutorialState = async (req, res, next) => {
    try {
      const { tutorialPage, newState } = req.body;
      const uid = req.clientUID;
      await this.organizationService.markUserTutorialState(
        uid,
        tutorialPage,
        newState
      );
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  // Publisher management
  getPublishers = async (req, res, next) => {
    try {
      const { email } = req.body;
      const publishers = await this.organizationService.getPublishers(email);
      res.json({ success: true, publishers });
    } catch (error) {
      console.error("Error getting publishers:", error);
      next(error);
    }
  };

  getOrganizationsInfo = async (req, res, next) => {
    try {
      const { email } = req.body;
      const result = await this.organizationService.getOrganizationsInfo(email);
      res.json({ success: true, publishers: result });
    } catch (error) {
      console.error("Error getting organizations info:", error);
      next(error);
    }
  };

  addUserToOrganization = async (req, res, next) => {
    try {
      const { studioID, token, targetUserEmail } = req.body;
      const result = await this.organizationService.addUserToOrganization(
        studioID,
        token,
        targetUserEmail
      );

      if (result.success) {
        res.json({ success: true });
      } else {
        res.status(result.status).send(result.message);
      }
    } catch (error) {
      console.error("Error adding user to organization:", error);
      next(error);
    }
  };

  removeUserFromOrganization = async (req, res, next) => {
    try {
      const { studioID, token, targetUserEmail } = req.body;
      await this.organizationService.removeUserFromOrganization(
        studioID,
        token,
        targetUserEmail
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing user from organization:", error);
      next(error);
    }
  };

  

  getPublisherStudios = async (req, res, next) => {
    try {
      const { publisherID } = req.body;
      const publisherStudios =
        await this.organizationService.getPublisherStudios(publisherID);
      res.json(publisherStudios);
    } catch (error) {
      console.error("Error fetching publisher studios:", error);
      next(error);
    }
  };

  getStudioGames = async (req, res, next) => {
    try {
      const { studioIDs } = req.body;
      const studiosAndGames = await this.organizationService.getStudioGames(
        studioIDs
      );
      res.json(studiosAndGames);
    } catch (error) {
      console.error("Error fetching studio games:", error);
      next(error);
    }
  };

  getStudioDetails = async (req, res, next) => {
    try {
      const { studioID } = req.body;
      const studioDetails = await this.organizationService.getStudioDetails(
        studioID
      );
      res.json(studioDetails);
    } catch (error) {
      console.error("Error fetching studio details:", error.message);
      next(error);
    }
  };

  updateStudioDetails = async (req, res, next) => {
    try {
      const {
        studioID,
        studioName,
        studioIcon,
        alertEmail,
        alertSlackWebhook,
        alertDiscordWebhook,
      } = req.body;
      await this.organizationService.updateStudioDetails(
        studioID,
        studioName,
        studioIcon,
        alertEmail,
        alertSlackWebhook,
        alertDiscordWebhook
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating studio details:", error.message);
      next(error);
    }
  };


  // Game management
  createGame = async (req, res, next) => {
    try {
      const { studioID, gameName, gameEngine, gameKey, gameIcon } = req.body;
      const clientUID = req.clientUID;
      const result = await this.organizationService.createGame(
        studioID,
        gameName,
        gameEngine,
        gameKey,
        gameIcon,
        clientUID
      );
      res.json({ success: true, gameID: result });
    } catch (error) {
      console.error(error);
      res.status(200).json({ success: false, error: "Internal server error" });
    }
  };

  getGameDetails = async (req, res, next) => {
    try {
      const { gameID } = req.body;
      const gameDetails = await this.organizationService.getGameDetails(gameID);
      res.json(gameDetails);
    } catch (error) {
      console.error("Error fetching game details:", error.message);
      next(error);
    }
  };

  updateGameDetails = async (req, res, next) => {
    try {
      const {
        gameID,
        gameName,
        gameEngine,
        gameIcon,
        apiKeys,
        gameSecretKey,
        realtimeDeploy,
      } = req.body;
      const clientUID = req.clientUID;
      await this.organizationService.updateGameDetails(
        gameID,
        gameName,
        gameEngine,
        gameIcon,
        apiKeys,
        gameSecretKey,
        realtimeDeploy,
        clientUID
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating game details:", error.message);
      next(error);
    }
  };

  removeGame = async (req, res, next) => {
    try {
      const { studioID, gameID } = req.body;
      await this.organizationService.scheduleRemoveGame(studioID, gameID);
      res.status(200).json({
        success: true,
        message: "Game scheduled for removal successfully",
      });
    } catch (error) {
      console.error("Error removing game:", error);
      next(error);
    }
  };

  cancelRemoveGame = async (req, res, next) => {
    try {
      const { studioID, gameID } = req.body;
      await this.organizationService.cancelRemoveGame(studioID, gameID);
      res
        .status(200)
        .json({ success: true, message: "Game unscheduled successfully" });
    } catch (error) {
      console.error("Error canceling game removal:", error);
      next(error);
    }
  };

  revokeGameKey = async (req, res, next) => {
    try {
      const { gameID } = req.body;
      const clientUID = req.clientUID;
      const { success, message, apiKey } =
        await this.organizationService.revokeGameKey(gameID, clientUID);

      if (!success) {
        return res.status(404).send(message);
      }

      res.json({ success: true, message: "Game key revoked", apiKey });
    } catch (error) {
      console.error("Error revoking game key:", error.message);
      next(error);
    }
  };

  // Collaboration
  updateCollabUserState = async (req, res, next) => {
    try {
      const { gameID, branch, pageLink, state } = req.body;
      await this.organizationService.updateCollabUserState(
        gameID,
        branch,
        req.clientUID,
        pageLink,
        state
      );
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };

  getCurrentCollabUsers = async (req, res, next) => {
    try {
      const { gameID, branch, pageLink } = req.body;
      const users = await this.organizationService.getCurrentCollabUsers(
        gameID,
        branch,
        pageLink
      );
      res.status(200).json({ success: true, users: users });
    } catch (error) {
      next(error);
    }
  };
}
