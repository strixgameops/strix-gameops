import { PlanningTreeModel } from "../../../models/planningTreeModel.js";
import { User } from "../../../models/userModel.js";
import { NodeModel } from "../../../models/nodeModel.js";
import { Game } from "../../../models/gameModel.js";
import { Studio } from "../../../models/studioModel.js";
import { Publisher } from "../../../models/publisherModel.js";
import { Segments } from "../../../models/segmentsModel.js";
import { PWtemplates } from "../../../models/PWtemplates.js";
import { CookChecksums } from "../../../models/cookChecksums.js";
import { CookedContent } from "../../../models/cookedContent.js";
import { Collab } from "../../../models/collab.js";
import { BalanceModelSegments } from "../../../models/balanceModelSegments.js";
import { BalanceModelTabs } from "../../../models/balanceModelTabs.js";
import { DeploymentHistory } from "../../../models/deploymentHistory.js";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import dayjs from "dayjs";

import { CurrentGameSessions } from "../../../models/currentGameSessions.js";
import { PaymentTransactions } from "../../../models/paymentTransactions.js";
import { DeploymentCatalog } from "../../../models/deploymentCatalog.js";
import bcrypt from "bcrypt";

export class OrganizationService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async initialize() {
    if (process.env.EDITION === "community") {
      // Seed initial user
      const name = process.env.INITIAL_USER_NAME;
      const pwd = process.env.INITIAL_USER_PWD;
      const hashedPassword = await bcrypt.hash(pwd, 10);
      await User.updateOne(
        { email: name },
        {
          password: hashedPassword,
          username: name,
        },
        {
          upsert: true,
        }
      );
    }
  }

  async scheduleRemoveStudio(studioID) {
    try {
      if (!studioID) {
        throw new Error("Studio ID is required");
      }

      const currentDate = new Date();
      const deletionDate = new Date(currentDate);
      deletionDate.setHours(currentDate.getHours() + 72);

      await Studio.findOneAndUpdate(
        { studioID: studioID },
        { $set: { scheduledDeletionDate: deletionDate } },
        { new: true, upsert: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async updateGameDetails(
    gameID,
    gameName,
    gameEngine,
    gameIcon,
    apiKeys,
    gameSecretKey,
    realtimeDeploy,
    clientUID
  ) {
    try {
      if (!gameID) {
        throw new Error("Game ID is required");
      }

      let game = await Game.findOne({ gameID: gameID });
      const oldGame = { ...game.toObject() };

      if (gameName) game.gameName = gameName;
      if (gameEngine) game.gameEngine = gameEngine;
      if (gameIcon) {
        const utilityService = this.moduleContainer.get("utility");

        game.gameIcon = await utilityService.uploadFileToStudioCloud(
          gameID,
          gameIcon,
          true
        );
      }
      if (gameSecretKey) game.gameSecretKey = gameSecretKey;
      if (realtimeDeploy !== undefined) game.realtimeDeploy = realtimeDeploy;

      game.apiKeys = apiKeys.map((key) => {
        let existingObj = game.apiKeys.find(
          (obj) => obj.service === key.service
        );
        if (existingObj) {
          return { ...existingObj, ...key };
        } else {
          return { ...key };
        }
      });

      await game.save();
      this.handleDefaultCurrencyChange(oldGame, game);

      if (!game) {
        throw new Error("Game not found");
      }
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "organization",
        `CLIENT: ${clientUID} | ACTION: updated game details | SUBJECT: ${game.gameID}`
      );
    } catch (error) {
      throw error;
    }
  }

  async handleDefaultCurrencyChange(oldGameObj, newGameObj) {
    console.error(
      "DEFAULT CURRENCY WAS CHANGED BUT THE CODE IS NOT PRESENT! WORK!!!!!!"
    );
  }

  async getGameDetails(gameID) {
    try {
      if (!gameID) {
        throw new Error("Game ID is required");
      }

      const game = await Game.findOne({ gameID: gameID });

      if (!game) {
        throw new Error("Game not found");
      }

      const cleanedApiKeys = game.apiKeys.map((key) => {
        return {
          ...key,
          key: "*********************************",
        };
      });

      return {
        success: true,
        gameName: game.gameName,
        gameEngine: game.gameEngine,
        gameIcon: game.gameIcon,
        gameSecretKey: game.gameSecretKey,
        gameScheduledDeletionDate: game.scheduledDeletionDate,
        realtimeDeploy: game.realtimeDeploy,
        apiKeys: cleanedApiKeys,
      };
    } catch (error) {
      throw error;
    }
  }

  async cancelRemoveStudio(studioID) {
    try {
      if (!studioID) {
        throw new Error("Studio ID is required");
      }

      const studio = await Studio.findOneAndUpdate(
        { studioID: studioID },
        { $unset: { scheduledDeletionDate: "" } },
        { new: true, upsert: true }
      );

      if (!studio) {
        throw new Error("Studio not found");
      }
    } catch (error) {
      throw error;
    }
  }

  async revokeGameKey(gameID, clientUID) {
    try {
      const updatedData = {};
      updatedData.gameSecretKey = uuid();

      const game = await Game.findOneAndUpdate(
        { gameID: gameID },
        updatedData,
        {
          new: true,
        }
      );
      if (!game) {
        return { success: false, message: "Game not found" };
      }
      const loggingService = this.moduleContainer.get("logging");

      loggingService.logAction(
        gameID,
        "organization",
        `CLIENT: ${clientUID} | ACTION: revoked game API key`
      );

      return {
        success: true,
        message: "Game key revoked",
        apiKey: updatedData.gameSecretKey,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateStudioDetails(
    studioID,
    studioName,
    studioIcon,
    alertEmail,
    alertSlackWebhook,
    alertDiscordWebhook
  ) {
    try {
      if (!studioID) {
        throw new Error("Studio ID is required");
      }

      const updatedData = {};
      if (studioName) updatedData.studioName = studioName;
      if (studioIcon) updatedData.studioIcon = studioIcon;
      if (alertEmail) updatedData.alertEmail = alertEmail;
      if (alertSlackWebhook) updatedData.alertSlackWebhook = alertSlackWebhook;
      if (alertDiscordWebhook)
        updatedData.alertDiscordWebhook = alertDiscordWebhook;

      const studio = await Studio.findOneAndUpdate(
        { studioID: studioID },
        updatedData,
        { new: true }
      );
      if (!studio) {
        throw new Error("Studio not found");
      }
    } catch (error) {
      throw error;
    }
  }

  async getStudioDetails(studioID) {
    try {
      if (!studioID) {
        throw new Error("Studio ID is required");
      }

      const studio = await Studio.findOne({ studioID: studioID });
      if (!studio) {
        throw new Error("Studio not found");
      }

      return {
        success: true,
        studioName: studio.studioName,
        studioIcon: studio.studioIcon,
        apiKey: studio.apiKey,
        scheduledDeletionDate: studio.scheduledDeletionDate,
        alertEmail: studio.alertEmail,
        alertSlackWebhook: studio.alertSlackWebhook,
        alertDiscordWebhook: studio.alertDiscordWebhook,
      };
    } catch (error) {
      throw error;
    }
  }

  async cancelRemoveGame(studioID, gameID) {
    try {
      await Game.findOneAndUpdate(
        { gameID },
        { $unset: { scheduledDeletionDate: "" } },
        { new: true, upsert: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async scheduleRemoveGame(studioID, gameID) {
    try {
      const currentDate = new Date();
      const deletionDate = new Date(currentDate);
      deletionDate.setHours(currentDate.getHours() + 72);

      await Game.findOneAndUpdate(
        { gameID },
        { $set: { scheduledDeletionDate: deletionDate } },
        { new: true, upsert: true }
      );
    } catch (error) {
      throw error;
    }
  }

  async createGame(
    studioID,
    gameName,
    gameEngine,
    gameKey,
    gameIcon,
    clientUID
  ) {
    try {
      const baseVersion = "1.0.0.0";
      const newGameID = uuid();
      const newGame = new Game({
        gameID: newGameID,
        gameName: gameName,
        gameEngine: gameEngine,
        gameIcon: gameIcon,
        gameSecretKey: gameKey,
      });

      await newGame.save();

      const updatedStudio = await Studio.findOneAndUpdate(
        { studioID: studioID },
        { $push: { games: { gameID: newGameID } } },
        { new: true }
      );
      const utilityService = this.moduleContainer.get("utility");

      // Creating new game doc in NodeModel
      const newNodeModel = new NodeModel({
        gameID: newGameID,
        branch: `${utilityService.getBranchWithWorkingSuffix(baseVersion)}`,
        nodeID: "Root",
        name: "Root",
        entityCategory: {
          categoryID: "Root",
          mainConfigs: "",
          parentCategory: "",
          inheritedConfigs: "",
        },
      });
      await newNodeModel.save();

      let newPWtemplates = [
        {
          templateID: "firstJoinDate",
          templateName: "First Join Date",
          templateDefaultVariantType: "date",
        },
        {
          templateID: "lastReturnDate",
          templateName: "Last Return Date",
          templateDefaultVariantType: "date",
        },
        {
          templateID: "lastPaymentDate",
          templateName: "Last Payment Date",
          templateDefaultVariantType: "date",
        },
        {
          templateID: "totalPaymentsSumm",
          templateName: "Total Payments Summ",
          templateDefaultVariantType: "float",
        },
        {
          templateID: "totalPaymentsCount",
          templateName: "Total Payments Count",
          templateDefaultVariantType: "integer",
        },
        {
          templateID: "country",
          templateName: "Country",
          templateDefaultVariantType: "string",
        },
        {
          templateID: "platform",
          templateName: "Platform",
          templateDefaultVariantType: "string",
        },
        {
          templateID: "engineVersion",
          templateName: "Engine Version",
          templateDefaultVariantType: "string",
        },
        {
          templateID: "gameVersion",
          templateName: "Game Version",
          templateDefaultVariantType: "string",
        },
        {
          templateID: "language",
          templateName: "Language",
          templateDefaultVariantType: "string",
        },
        {
          templateID: "meanSessionLength",
          templateName: "Mean. Session Length",
          templateDefaultVariantType: "float",
        },
      ];
      newPWtemplates = newPWtemplates.map((t) => ({
        ...t,
        gameID: newGameID,
        branch: `${utilityService.getBranchWithWorkingSuffix(baseVersion)}`,
        templateType: "analytics",
      }));
      await PWtemplates.insertMany(newPWtemplates);

      // Creating new game doc in Segments
      await Segments.insertMany([
        {
          gameID: newGameID,
          branch: `${utilityService.getBranchWithWorkingSuffix(baseVersion)}`,
          segmentID: "everyone",
          segmentName: "Everyone",
          segmentComment: "",
        },
      ]);

      // Creating new game doc in Planning Tree
      await PlanningTreeModel.create({
        gameID: newGameID,
        branch: `${utilityService.getBranchWithWorkingSuffix(baseVersion)}`,
        nodes: [
          {
            nodeID: "Root",
            uniqueID: "root",
            isCategory: true,
            subnodes: [],
          },
        ],
      });

      // Create basic "everyone" segment in balance modeling
      await BalanceModelSegments.insertMany([
        {
          gameID: newGameID,
          branch: `${utilityService.getBranchWithWorkingSuffix(baseVersion)}`,
          segmentID: "everyone",
          overrides: [],
        },
      ]);

      // Create basic tabs in balance modeling
      await BalanceModelTabs.insertMany([
        {
          gameID: newGameID,
          branch: `${utilityService.getBranchWithWorkingSuffix(baseVersion)}`,
          tabID: "default",
          tabName: "Default",
        },
      ]);

      // Make default deployment
      await DeploymentHistory.insertMany([
        {
          gameID: newGameID,
          branch: `${utilityService.getBranchWithoutSuffix(baseVersion)}`,
          timestamp: Date.now(),
          releaseNotes: "Initial version",
          deployer: clientUID,
          tags: [],
          sourceBranch: "No version",
        },
      ]);
      await DeploymentCatalog.insertMany([
        {
          gameID: newGameID,
          environments: [
            { name: "development", deployments: [] },
            { name: "staging", deployments: [] },
            { name: "production", deployments: [] },
          ],
          deployRealtime: false,
        },
      ]);

      const newCookedChecksums1 = new CookChecksums({
        key: `${newGameID}:${baseVersion}`,
        rawDataChecksum: {
          offers: 0,
          analyticsEvents: 0,
          nodes: 0,
          localization: 0,
          planningTree: 0,
          PWtemplates: 0,
          segments: 0,
          abTests: 0,
        },
      });
      await newCookedChecksums1.save();

      const fileStorageService = this.moduleContainer.get("fileStorage");

      fileStorageService.initApp(newGameID);

      return newGameID;
    } catch (error) {
      throw error;
    }
  }

  async getStudioGames(studioIDs) {
    try {
      const studios = await Studio.find({ studioID: { $in: studioIDs } });

      if (!studios) {
        throw new Error("Studio not found");
      }

      const gameIDs = studios.flatMap((s) =>
        s.games.map((game) => game.gameID)
      );
      const games = await Game.find({ gameID: { $in: gameIDs } });

      const studiosAndGames = studios.map((studio) => ({
        studioID: studio.studioID,
        games: games.filter((game) =>
          studio.games.some((sGame) => sGame.gameID === game.gameID)
        ),
      }));

      return studiosAndGames;
    } catch (error) {
      throw error;
    }
  }

  async getPublisherStudios(publisherID) {
    try {
      if (!publisherID)
        return { success: false, message: "Missing required fields!" };

      const publisher = await Publisher.findOne({ publisherID });

      if (!publisher) {
        throw new Error("Publisher not found");
      }

      const studioIDs = publisher.studios.map((studio) => studio.studioID);
      const studios = await Studio.find({
        studioID: { $in: studioIDs },
      }).select("studioID studioName studioIcon scheduledDeletionDate");

      const result = studios.map((studio) => ({
        studioID: studio.studioID,
        studioName: studio.studioName,
        studioIcon: studio.studioIcon,
        scheduledDeletionDate: studio.scheduledDeletionDate,
        publisherID: publisherID,
      }));

      return { success: true, result };
    } catch (error) {
      throw error;
    }
  }

  async addStudio(publisherID, studioName, studioIcon, clientUID) {
    try {
      if (!publisherID || !studioName) {
        throw new Error("Missing required parameters");
      }

      const studioID = uuid();
      const googlePlayService = this.moduleContainer.get("googlePlay");

      let email, key;
      if (googlePlayService) {
        const res = await googlePlayService.setupServiceCredentials(studioID);
        email = res.email;
        key = res.key;
      }

      const studio = new Studio({
        studioID,
        studioName,
        studioIcon,
        apiKey: email || "Not found. Please contact support!",
        gpcServiceAccountKey: key,
        users: [
          {
            userID: clientUID,
            userPermissions: [{ permission: "admin" }],
          },
        ],
      });

      await studio.save();

      const publisher = await Publisher.findOne({ publisherID });

      if (!publisher) {
        throw new Error("Publisher not found");
      }

      publisher.studios.push({ studioID });
      await publisher.save();
      const analytics = this.moduleContainer.get("coreAnalytics");

      await analytics.populateAnalyticsTables(studioID);
    } catch (error) {
      throw error;
    }
  }

  // User management methods
  async confirmUserChangeProfileCode(type, email, code, newData) {
    try {
      let user = await User.findOne({ email }).lean();

      if (!user) {
        return { success: false, error: "User not found" };
      }

      if (type === "email") {
        if (user.tempEmailConfirmCode === code) {
          await User.updateOne(
            { email },
            { $set: { email: newData, tempEmailConfirmCode: null } }
          );
          await Publisher.updateMany(
            { "users.userID": user.email },
            { $set: { "users.$.userID": newData } }
          );
          await Studio.updateMany(
            { "users.userID": user.email },
            { $set: { "users.$.userID": newData } }
          );
          return { success: true, message: "Email changed successfully" };
        } else {
          return { success: false, error: "Wrong code" };
        }
      } else if (type === "password") {
        if (user.tempPasswordConfirmCode === code) {
          const hashedPassword = await bcrypt.hash(newData, 10);
          await User.updateOne(
            { email },
            {
              $set: { password: hashedPassword, tempPasswordConfirmCode: null },
            }
          );
          return { success: true, message: "Password changed successfully" };
        } else {
          return { success: false, error: "Wrong code" };
        }
      }
    } catch (error) {
      throw error;
    }
  }

  async initiateChangeUserProfile(type, email, newData) {
    try {
      if (!type || !email) {
        return { success: false, message: "Wrong type or email" };
      }

      let user = await User.findOne({ email }).lean();
      if (!user) {
        return { success: false, error: "User not found" };
      }

      const verificationCode = this.generateVerificationCode();
      let mail;

      switch (type) {
        case "email":
        case "password":
          if (process.env.EDITION === "community") {
            const hashedPassword = await bcrypt.hash(newData, 10);
            await User.updateOne({ email }, { $set: { password: hashedPassword } });
            return { success: true, message: "Password updated" };
          } else {
            mail = {
              from: "team@strixgameops.com",
              to: email,
              subject: `${
                type === "email" ? "Changing Email" : "Changing Password"
              } - Verification code`,
              text: `Your verification code is ${verificationCode}`,
            };
          }
          break;
        case "avatar":
          await User.updateOne({ email }, { $set: { avatar: newData } });
          return { success: true, message: "Avatar updated" };
        case "username":
          await User.updateOne({ email }, { $set: { username: newData } });
          return { success: true, message: "Username updated" };
        case "role":
          await User.updateOne({ email }, { $set: { role: newData } });
          return { success: true, message: "Role updated" };
        default:
          return { success: false, message: "Wrong type" };
      }

      if (mail) {
        try {
          const utilityService = this.moduleContainer.get("utility");

          const sendEmail = await utilityService.mailService.sendMail(mail);
        } catch (err) {
          return { success: false, message: "Error sending email: " + err };
        }

        if (type === "email") {
          await User.updateOne(
            { email },
            { $set: { tempEmailConfirmCode: verificationCode } }
          );
        } else if (type === "password") {
          await User.updateOne(
            { email },
            { $set: { tempPasswordConfirmCode: verificationCode } }
          );
        }

        return { success: true, message: "Sent email" };
      }
    } catch (error) {
      throw error;
    }
  }

  async finishUserOnboarding({
    publisherName,
    email,
    username,
    jobTitle,
    studioName,
    studioApiKey,
    studioIcon,
  }) {
    if (!email || !publisherName || !studioName) {
      throw new Error("Required fields missing for onboarding");
    }

    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("User not found");
      }

      await User.findByIdAndUpdate(user._id, {
        role: jobTitle,
        username: username,
      });

      const { publisher } = await this.createUserOrganization({
        publisherName,
        email,
        studioName,
        studioApiKey,
        studioIcon,
      });

      return {
        publisherID: publisher.publisherID,
        publisherName: publisher.publisherName,
      };
    } catch (error) {
      throw new Error(`Onboarding failed: ${error.message}`);
    }
  }

  async createUserOrganization({
    publisherName,
    email,
    studioName,
    studioApiKey,
    studioIcon,
  }) {
    const publisherID = uuid();
    const studioID = uuid();
    const adminPermission = { permission: "admin" };

    const studio = await Studio.create({
      studioID,
      studioName,
      apiKey: studioApiKey,
      studioIcon,
      users: [{ userID: email, userPermissions: [adminPermission] }],
    });

    const publisher = await Publisher.create({
      publisherID,
      publisherName,
      users: [{ userID: email, userPermissions: [adminPermission] }],
      studios: [{ studioID }],
    });
    const analytics = this.moduleContainer.get("coreAnalytics");
    const businessUtility = this.moduleContainer.getOptionalService("businessUtility");

    if (process.env.EDITION === "community") {
      await analytics.populateAnalyticsTables(studioID);
    } else {
      await Promise.all([
        analytics.populateAnalyticsTables(studioID),
        businessUtility?.createDemoGame("brawlDemo", studioID),
      ]);
    }

    return { publisher, studio };
  }

  generateVerificationCode() {
    const randomBytes = crypto.randomBytes(4).toString("hex");
    return randomBytes.toUpperCase();
  }

  async getUser(email) {
    try {
      let user = await User.findOne({ email }).lean();
      if (!user) {
        return { success: false, error: "User not found" };
      }

      delete user.password;
      delete user._id;
      delete user.__v;

      let isolatedUser = {
        email: user.email,
        username: user.username,
        isDemo: user.isDemo,
        role: user.role,
        avatar: user.avatar,
        scheduledDeletionDate: user.scheduledDeletionDate,
        tutorialsWatched: user.tutorialsWatched,
      };

      return { success: true, user: isolatedUser };
    } catch (error) {
      return { success: false, error: "Internal Server Error" };
    }
  }

  async addUserToOrganization(studioID, token, targetUserEmail) {
    try {
      const authService = this.moduleContainer.get("auth");
      const decodedToken = await authService.decodeAndVerifyIdToken(token);
      const uid = decodedToken.uid;
      if (!uid) {
        return {
          success: false,
          status: 401,
          message: "Invalid or expired token",
        };
      }

      const checkAuthority = await authService.checkUserOrganizationAuthority(
        studioID,
        uid
      );
      if (!checkAuthority) {
        return { success: false, status: 401, message: "Unauthorized" };
      }

      const update = {
        $push: {
          users: {
            userID: targetUserEmail,
            userPermissions: { permission: "default" },
          },
        },
      };

      const options = { new: true };

      await Publisher.findOneAndUpdate(
        { studios: { $elemMatch: { studioID } } },
        update,
        options
      );
      const studio = await Studio.findOneAndUpdate(
        { studioID },
        update,
        options
      );
      if (!studio) {
        return { success: false, status: 404, message: "Studio not found" };
      }

      return { success: true };
    } catch (error) {
      console.error("Error adding user to organization:", error);
      return { success: false, status: 500, message: "Internal server error" };
    }
  }

  async removeUserFromOrganization(studioID, token, targetUserEmail) {
    try {
      const authService = this.moduleContainer.get("auth");
      const decodedToken = await authService.decodeAndVerifyIdToken(token);
      const uid = decodedToken.uid;

      if (!uid) {
        throw new Error("Invalid or expired token");
      }

      if (uid !== targetUserEmail) {
        const checkAuthority = await authService.checkUserOrganizationAuthority(
          studioID,
          uid
        );
        if (!checkAuthority) {
          throw new Error("Unauthorized");
        }
      }

      const update = {
        $pull: { users: { userID: targetUserEmail } },
      };

      const options = { new: true };

      await Publisher.findOneAndUpdate(
        { "studios.studioID": studioID },
        update,
        options
      );
      const studio = await Studio.findOneAndUpdate(
        { studioID },
        update,
        options
      );

      if (!studio) {
        throw new Error("Studio not found");
      }
    } catch (error) {
      throw error;
    }
  }

  async getOrganizationsInfo(email) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("User not found");
      }

      let publishers = await Publisher.find(
        { "users.userID": email },
        "-_id"
      ).lean();

      publishers = publishers.map((publisher) => {
        let temp = publisher;
        if (
          !temp.users
            .find((u) => u.userID === email)
            .userPermissions.find((p) => p.permission === "admin")
        ) {
          temp.users = [];
        }
        return temp;
      });

      const studioPromises = publishers.map((publisher) => {
        const studioIDs = publisher.studios.map((studio) => studio.studioID);
        return Studio.find({ studioID: { $in: studioIDs } })
          .select("studioID studioName users expirationDate -_id")
          .lean();
      });

      const studioResults = await Promise.all(studioPromises);

      const userEmails = studioResults.flatMap((studio) =>
        studio.flatMap((s) => s.users.map((u) => u.userID))
      );
      const utilityService = this.moduleContainer.get("utility");

      const users = await utilityService.fetchUsersName(userEmails);

      const result = publishers.map((publisher, index) => ({
        ...publisher,
        studios: studioResults[index].map((studio) => {
          const studioUsers = studio.users.map((user) => {
            const matchingUser = users.find((u) => u.email === user.userID);
            return {
              userID: user.userID,
              username: matchingUser ? matchingUser.username : "Unknown name",
              userPermissions: user.userPermissions,
            };
          });
          return {
            studioID: studio.studioID,
            studioName: studio.studioName,
            expirationDate: studio.expirationDate,
            users: studioUsers,
          };
        }),
      }));

      return result;
    } catch (error) {
      throw error;
    }
  }

  async getPublishers(email) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new Error("User not found");
      }

      const publishers = await Publisher.find(
        {
          "users.userID": user.email,
        },
        "publisherID publisherName -_id"
      );

      return publishers;
    } catch (error) {
      throw error;
    }
  }

  async cancelRemoveUser(email, token) {
    if (!email || !token) {
      throw new Error("Email and token are required");
    }

    await User.findOneAndUpdate(
      { email },
      { $unset: { scheduledDeletionDate: null } },
      { new: true, upsert: true }
    );
  }

  async scheduleUserRemoval(email, token) {
    if (!email || !token) {
      throw new Error("Email and token are required");
    }
    const authService = this.moduleContainer.get("auth");
    const decodedToken = await authService.decodeAndVerifyIdToken(token);
    if (!decodedToken) {
      throw new Error("Invalid or expired token");
    }

    const currentDate = new Date();
    const deletionDate = new Date(currentDate);
    deletionDate.setHours(currentDate.getHours() + 72);

    await User.findOneAndUpdate(
      { email },
      { $set: { scheduledDeletionDate: deletionDate } },
      { new: true, upsert: true }
    );

    return deletionDate;
  }

  // Collaboration methods
  async updateCollabUserState(gameID, branch, userID, pageLink, state) {
    try {
      const possibleCollabs = [
        "/entities",
        "/segmentation",
        "/playerwarehouse",
        "/abtesting",
        "/allevents",
        "/offers",
        "/gameevents",
        "/localization",
        "/deployment",
        "/flows",
      ];

      if (!possibleCollabs.includes(pageLink)) return;

      if (state === "dead") {
        await Collab.deleteOne({ gameID, branch, pageLink, userID });
        return;
      }
      const exists = await Collab.exists({ gameID, branch, pageLink, userID });

      if (exists) {
        await Collab.updateOne(
          { gameID, branch, pageLink, userID },
          { $set: { lastUpdate: dayjs.utc(), pageLink: pageLink, state } }
        );
      } else {
        await Collab.updateOne(
          { gameID, branch, pageLink, userID },
          {
            $set: {
              lastUpdate: dayjs.utc(),
              pageLink: pageLink,
              state,
              initialTime: dayjs.utc(),
            },
          },
          { upsert: true }
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  async getCurrentCollabUsers(gameID, branch, pageLink) {
    try {
      const collabs = await Collab.find({ gameID, branch, pageLink }).sort({
        initialTime: -1,
      });

      if (collabs && collabs.length > 0) {
        let users = await User.find(
          {
            email: { $in: collabs.map((u) => u.userID) },
          },
          { avatar: 1, username: 1, email: 1 }
        ).lean();
        users = users.map((user) => {
          if (user.email === collabs[0].userID) {
            user.isOwner = true;
          }
          return user;
        });
        return users;
      } else {
        return [];
      }
    } catch (error) {
      console.error(error);
    }
  }

  async clearExpiredCollabUsers() {
    try {
      const expirationLimit = 30; // seconds
      const expirationTime = dayjs
        .utc()
        .subtract(expirationLimit, "seconds")
        .toDate();

      await Collab.deleteMany({
        lastUpdate: { $lt: expirationTime },
      });
    } catch (error) {
      console.error(error);
    }
  }

  async markUserTutorialState(userID, tutorialPage, newState) {
    try {
      const result = await User.findOneAndUpdate(
        { email: userID, "tutorialsWatched.tutorialPage": tutorialPage },
        { $set: { "tutorialsWatched.$[elem].newState": newState } },
        {
          arrayFilters: [{ "elem.tutorialPage": tutorialPage }],
          new: true,
        }
      );

      if (!result) {
        console.log(result);
        await User.findOneAndUpdate(
          { email: userID },
          { $push: { tutorialsWatched: { tutorialPage, newState } } },
          { new: true }
        );
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Utility methods
  async getServiceAPIObject(studioID, gameID, service) {
    try {
      const studio = await Studio.findOne({
        studioID: studioID,
      }).lean();

      const game = await Game.findOne({ gameID }).lean();
      if (!game) {
        throw new Error("Game not found");
      }
      let packageName = game.apiKeys.find(
        (apiKey) => apiKey.service === service
      ).packageName;
      if (!packageName) {
        throw new Error(
          "Package name not found. Please set package name in game's API information."
        );
      }
      const baseCurrencyCode = game.apiKeys.find(
        (apiKey) => apiKey.service === service
      ).secondary;

      let key = studio.gpcServiceAccountKey;
      if (!key) {
        throw new Error("API key not found. Please contact support.");
      }
      key = decryptString(key);

      return { key, packageName, baseCurrencyCode };
    } catch (error) {
      throw error;
    }
  }

  async getGameDocumentIdAndKey(gameID) {
    const game = await Game.findOne({ gameID }, "_id gameSecretKey").lean();
    return { id: game._id.toString(), secretKey: game.gameSecretKey };
  }

  // Array of game IDs must be passed
  async removeGamesBulk(gameIDs) {
    const deploymentService = this.moduleContainer.get("deployment");
    const gameCollections = deploymentService.gameCollections;
    const gameMetadataCollections = deploymentService.gameMetadataCollections;

    const allCollections = []
      .concat(gameCollections)
      .concat(gameMetadataCollections);
    for (const collection of allCollections) {
      console.log("Removing game collection:", collection.type);

      await collection.model
        .deleteMany({
          gameID: { $in: gameIDs },
        })
        .lean();
    }

    const regexPattern = `^(${gameIDs.join("|")})[^:]*$`;
    const regex = new RegExp(regexPattern);
    await CookedContent.deleteMany({ key: { $regex: regex } });
    await CookChecksums.deleteMany({ key: { $regex: regex } });

    console.log("Removing CurrentGameSessions");
    await CurrentGameSessions.deleteMany({ gameID: { $in: gameIDs } });

    console.log("Removing PaymentTransactions");
    await PaymentTransactions.deleteMany({ gameID: { $in: gameIDs } });

    await Game.deleteMany({ gameID: { $in: gameIDs } });
  }

  async removeStudio(studioID) {
    console.log("Removing studio", studioID + "...");
    const studio = await Studio.findOneAndDelete({ studioID: studioID });
    if (studio && studio.games && studio.games.length > 0) {
      const gameIDs = studio.games.map((g) => g.gameID);
      await this.removeGamesBulk(gameIDs);
    }
    return { success: true };
  }
  async removePublisher(publisherID) {
    console.log("Removing publisher", publisherID + "...");
    const publisher = await Publisher.findOneAndDelete({
      publisherID: publisherID,
    });
    if (publisher && publisher.studios && publisher.studios.length > 0) {
      const studioIDs = publisher.studios.map((s) => s.studioID);
      for (let i = 0; i < studioIDs.length; i++) {
        await this.removeStudio(studioIDs[i]);
      }
    }
    return { success: true };
  }
  async removeUser(userID) {
    console.log("Removing user", userID + "...");
    const user = await User.findOneAndDelete({
      email: userID,
    });
    const pubs = await Publisher.find(
      {
        users: {
          $elemMatch: {
            userID: user.email,
            userPermissions: { $elemMatch: { permission: "admin" } },
          },
        },
      },
      "publisherID publisherName users -_id"
    ).lean();

    for (const pub of pubs) {
      await this.removePublisher(pub.publisherID);
    }

    const studs = await Studio.find(
      {
        users: {
          $elemMatch: {
            userID: user.email,
            userPermissions: { $elemMatch: { permission: "admin" } },
          },
        },
      },
      "studioID studioName users -_id"
    ).lean();
    for (const stud of studs) {
      await this.removeStudio(stud.studioID);
    }
    return { success: true };
  }
}
export default OrganizationService;
