import { Game } from "../../../models/gameModel.js";
import { Studio } from "../../../models/studioModel.js";
import { DeploymentCatalog } from "../../../models/deploymentCatalog.js";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();
export class UtilityService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.tablesNamespaces = [
      "events",
      "offers",
      "entities",
      "abtests",
      "localization",
      "stattemplates",
      "positionedOffers",
      "flows",
    ];
    this.gameIds = {};
    this.demoGames = ["brawlDemo"];

    // Generate secret hash with crypto to use for encryption
    this.key = process.env.ENCRYPT_SECRET_KEY;
    this.encryptionIV = crypto
      .createHash("sha512")
      .update(process.env.ENCRYPT_SECRET_KEY)
      .digest("hex")
      .substring(0, 16);
  }

  async getCachedGameIdBySecret(secret) {
    let result = this.gameIds[secret];
    if (!result) {
      result = await this.getGameBySecret(secret);
      this.gameIds[secret] = result;
      return result;
    } else {
      return result;
    }
  }
  async getGameBySecret(secret) {
    const game = await Game.findOne(
      { gameSecretKey: secret },
      "_id gameID"
    ).lean();
    if (game) {
      return game;
    } else {
      return null;
    }
  }

  async getStudioIDByGameID(gameID) {
    const studio = await Studio.findOne(
      { games: { $elemMatch: { gameID: gameID } } },
      "_id studioID"
    ).lean();
    if (studio) {
      return studio.studioID;
    } else {
      return null;
    }
  }

  async getAllStudiosIDs() {
    const studios = await Studio.find({}, "_id studioID").lean();
    if (studios) {
      return studios.map((s) => s.studioID);
    } else {
      return null;
    }
  }

  randomNumberInRange = (min, max, isFloat, toFixed = 3) => {
    if (isFloat) {
      return parseFloat(Math.random() * (max - min) + min).toFixed(toFixed);
    } else {
      return Math.round(Math.random() * (max - min)) + min;
    }
  };

  clamp(value, min, max) {
    min = min === -Infinity ? Number.MIN_SAFE_INTEGER : min;
    max = max === Infinity ? Number.MAX_SAFE_INTEGER : max;
    return Math.min(Math.max(value, min), max);
  }
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  convertToTitleCase(str) {
    // Split the string into words using a pattern that includes breaks before capital letters or underscores
    const words = str
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Splits words separated by CamelCase
      .replace(/_/g, " ") // Replaces underscores with spaces
      .toLowerCase() // Converts everything to lowercase for consistent processing
      .split(" "); // Splits the string into an array of words by spaces

    // Converts each word to Title Case
    const titleCaseWords = words.map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    );

    // Joins the words with spaces
    return titleCaseWords.join(" ");
  }

  getDemoGameID(gameID) {
    // Checking if gameID contains demo gameID at the start. If so, return the original demo game ID
    for (const demoGameID of this.demoGames) {
      if (gameID.startsWith(demoGameID)) {
        return demoGameID;
      }
    }
    return gameID;
  }
  isDemoGameID(gameID) {
    for (const demoGameID of this.demoGames) {
      if (gameID.startsWith(demoGameID)) {
        return true;
      }
    }
    return false;
  }

  log(...args) {
    if (process.env.ENVIRONMENT === "staging") {
      console.log(...args);
    }
  }

  encryptString(data) {
    const toBase64 = Buffer.from(data).toString("base64");
    const cipher = crypto.createCipheriv("aes256", this.key, this.encryptionIV);
    const encrypted =
      cipher.update(toBase64, "utf8", "hex") + cipher.final("hex");
    return encrypted;
  }
  decryptString(data) {
    const decipher = crypto.createDecipheriv("aes256", this.key, this.encryptionIV);
    const decrypted =
      decipher.update(data, "hex", "utf8") + decipher.final("utf8");
    const fromBase64 = Buffer.from(decrypted, "base64").toString("utf8");
    return fromBase64;
  }
 async getServiceAPIObject(studioID, gameID, service) {
    //
    // FOR INTERNAL USE ONLY
    //
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

      let key = studio.gpcServiceAccountKey;
      if (!key) {
        throw new Error("API key not found. Please contact support.");
      }
      key = this.decryptString(key);

      return { key, packageName };
    } catch (error) {
      throw error;
    }
  }
  async insertEventWithRetry(event, ingestFunction) {
    const maxRetries = 100;
    let retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        await ingestFunction();

        // this.log(`Successfully ingested event`, event);
        break; // Success
      } catch (error) {
        console.error("Error while ingesting event:", error);
        try {
          await ingestFunction();
          retryCount++;
          if (retryCount >= maxRetries) {
            console.error(
              "Max retries reached. Failed to insert event:",
              error
            );
            throw error; // Retry overflow
          }
        } catch (error) {
          console.error(
            "Error while retrying ingesting data:",
            error,
            "Event:",
            event
          );
        }
      }
    }
  }
  async getAllGamesDeploymentVersions() {
    try {
      // We get all game:env:versions that are currently deployed
      let games = {};
      const catalogs = await DeploymentCatalog.find({}).lean();
      if (catalogs) {
        catalogs.map((c) => {
          games[c.gameID] = {};

          c.environments.forEach((env) => {
            games[c.gameID][env.name] = new Set();

            env.deployments.forEach((dep) => {
              games[c.gameID][env.name].add(dep.version);
            });
          });
        });
      }

      Object.keys(games).forEach((gameID) => {
        Object.keys(games[gameID]).forEach((env) => {
          games[gameID][env] = Array.from(games[gameID][env]);
        });
      });
      return games;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  getBranchWithoutSuffix(branch) {
    if (!Boolean(branch)) return branch; // probably the branch is empty, so we don't need to do anything

    // Process the branch name and remove suffixes (_working or _reference)
    const parts = branch.split("_");
    if (parts.length > 1) {
      return parts[0];
    }
    return branch;
  }
  getBranchWithWorkingSuffix(branch) {
    if (!Boolean(branch)) return branch; // probably the branch is empty, so we don't need to do anything

    // Process the branch name and add suffixes (_working)
    const parts = branch.split("_");
    if (parts.length > 1 && parts[1] === "working") {
      return branch;
    } else {
      return parts[0] + "_working";
    }
  }
  getBranchWithReferenceSuffix(branch) {
    if (!Boolean(branch)) return branch; // probably the branch is empty, so we don't need to do anything

    // Process the branch name and add suffixes (_reference)
    const parts = branch.split("_");
    if (parts.length > 1 && parts[1] === "reference") {
      return branch;
    } else {
      return parts[0] + "_reference";
    }
  }
}
