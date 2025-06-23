import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
import axios from "axios";
import moment from "moment";
import dayjs from "dayjs";
import jStat from "jstat";
import abTestResults from "ab-test-result";
import * as d3 from "d3-random";
import crypto from "crypto";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import utc from "dayjs/plugin/utc.js";
import { User } from "../../models/userModel.js";
import { Game } from "../../models/gameModel.js";
import { Studio } from "../../models/studioModel.js";
import { Publisher } from "../../models/publisherModel.js";
import { BugReports } from "../../models/bugReports.js";

dayjs.extend(utc);

export class UtilityService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.DEMO_GAMES = ["brawlDemo"];
    this.DEMO_USER_DELETION_HOURS = 48;
    this.CONFIDENCE_LEVELS = {
      0.9: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    this.DEFAULT_MARGIN_ERROR = 0.05;
    this.DEFAULT_EXPECTED_PROPORTION = 0.5;
    this.MIN_POPULATION_SIZE = 1;
    this.MINIMUM_POPULATION_FALLBACK = 100;

    this.encryptionKey = process.env.ENCRYPT_SECRET_KEY;
    this.encryptionIV = crypto
      .createHash("sha512")
      .update(process.env.ENCRYPT_SECRET_KEY)
      .digest("hex")
      .substring(0, 16);

    this.mailService = process.env.MAIL_ENABLED
      ? nodemailer.createTransport({
          host: process.env.MAIL_HOST,
          port: process.env.MAIL_PORT,
          secure: process.env.MAIL_IS_SECURE,
          auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PWD,
          },
        })
      : null;
  }

  getDemoGameID(gameID) {
    if (!gameID) return gameID;

    for (const demoGameID of this.DEMO_GAMES) {
      if (gameID.startsWith(demoGameID)) {
        return demoGameID;
      }
    }
    return gameID;
  }

  isDemoGameID(gameID) {
    if (!gameID) return false;

    return this.DEMO_GAMES.some((demoGameID) => gameID.startsWith(demoGameID));
  }

  getSampleSize(
    totalPopulation,
    confidenceLevel,
    marginOfError = this.DEFAULT_MARGIN_ERROR,
    expectedProportion = this.DEFAULT_EXPECTED_PROPORTION
  ) {
    const population =
      Math.max(totalPopulation, this.MIN_POPULATION_SIZE) ||
      this.MINIMUM_POPULATION_FALLBACK;

    const z = this.CONFIDENCE_LEVELS[confidenceLevel];
    if (!z) {
      throw new Error("Confidence level must be 0.90, 0.95, or 0.99");
    }

    const n0 = Math.pow(
      (z * Math.sqrt(expectedProportion * (1 - expectedProportion))) /
        marginOfError,
      2
    );

    const adjustedSampleSize = Math.ceil(
      (n0 * population) / (n0 + population - 1)
    );

    return Math.min(population, adjustedSampleSize);
  }

  arraySum(numbers) {
    if (!Array.isArray(numbers)) return 0;
    return numbers.reduce((sum, num) => sum + (Number(num) || 0), 0);
  }

  clamp(number, min, max) {
    return Math.max(min, Math.min(number, max));
  }

  randomNumberInRange = (min, max, isFloat = false, toFixed = 3) => {
    const value = Math.random() * (max - min) + min;
    return isFloat
      ? parseFloat(value.toFixed(toFixed))
      : Math.round(value - min) + min;
  };

  async generateRandomDataByDays(
    startDate,
    endDate,
    minValue,
    maxValue,
    trend,
    deviation,
    toFixedAmount = 2,
    categoryFieldName = "timestamp",
    valueFieldName = "value"
  ) {
    const data = [];
    let currentDate = new Date(startDate);
    let lastValue = this.randomNumberInRange(minValue, maxValue);

    while (currentDate <= endDate) {
      const trendMultiplier =
        1 - this.randomNumberInRange(-deviation, deviation);
      let newValue = lastValue + lastValue * trend * trendMultiplier;
      newValue = parseFloat(newValue.toFixed(toFixedAmount));

      data.push({
        [categoryFieldName]: currentDate.toISOString(),
        [valueFieldName]: newValue,
      });

      lastValue = newValue;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  async generateRandomDataByDaysNonLinear(
    startDate,
    endDate,
    minValue,
    maxValue,
    trend,
    deviation,
    toFixedAmount = 2,
    categoryFieldName = "timestamp",
    valueFieldName = "value"
  ) {
    const data = [];
    let currentDate = new Date(startDate);
    let lastValue = this.randomNumberInRange(minValue, maxValue);
    let iteration = 0;

    const sinFrequencyMultiplier = 0.1;
    const declineIterationPoint = this.randomNumberInRange(7, 17);
    const stopIterationPoint =
      declineIterationPoint + this.randomNumberInRange(4, 10);

    while (currentDate <= endDate) {
      iteration++;

      let currentDeviation = deviation;
      let currentSinMultiplier = sinFrequencyMultiplier;

      if (
        iteration > declineIterationPoint &&
        iteration <= stopIterationPoint
      ) {
        const declineFactor = (stopIterationPoint - iteration) / 3;
        currentDeviation *= declineFactor;
        currentSinMultiplier *= declineFactor;
      } else if (iteration > stopIterationPoint) {
        currentSinMultiplier = 0;
      }

      const trendMultiplier = this.clamp(
        this.randomNumberInRange(-currentDeviation, currentDeviation, true),
        0,
        1
      );
      const trendFactor =
        Math.sin(iteration * trendMultiplier * currentSinMultiplier) + 1;

      let newValue;
      if (currentDeviation === 0 || currentSinMultiplier === 0) {
        newValue = lastValue + lastValue * trend * trendMultiplier;
      } else {
        newValue =
          lastValue + lastValue * trend * trendMultiplier * trendFactor;
      }

      newValue = parseFloat(Math.ceil(newValue).toFixed(toFixedAmount));

      data.push({
        [categoryFieldName]: currentDate.toISOString(),
        [valueFieldName]: newValue,
      });

      lastValue = newValue;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  NonAsyncGenerateRandomDataByDays(
    startDate,
    endDate,
    minValue,
    maxValue,
    trend,
    deviation,
    toFixedAmount = 2,
    categoryFieldName = "timestamp",
    valueFieldName = "value"
  ) {
    const data = [];
    let currentDate = new Date(startDate);
    let lastValue = this.randomNumberInRange(minValue, maxValue);

    while (currentDate <= endDate) {
      const trendMultiplier =
        1 - this.randomNumberInRange(-deviation, deviation);
      let newValue = lastValue + lastValue * trend * trendMultiplier;
      newValue = parseFloat(newValue.toFixed(toFixedAmount));

      data.push({
        [categoryFieldName]: currentDate.toISOString(),
        [valueFieldName]: newValue,
      });

      lastValue = newValue;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return data;
  }

  async fetchUsersName(usersEmails) {
    if (!Array.isArray(usersEmails) || usersEmails.length === 0) {
      return [];
    }

    try {
      const users = await User.find(
        { email: { $in: usersEmails } },
        { email: 1, username: 1, _id: 0 }
      ).lean();

      return users.map((user) => ({
        email: user.email,
        username: user.username,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch user names: ${error.message}`);
    }
  }



  generateASKU() {
    const prefix = "strix_";
    const characters = "0123456789abcdefghijklmnopqrstuvwxyz";
    let result = "";

    for (let i = 0; i < 20; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }

    return prefix + result;
  }

  encryptString(data) {
    if (!data) return "";

    try {
      const toBase64 = Buffer.from(data).toString("base64");
      const cipher = crypto.createCipheriv(
        "aes256",
        this.encryptionKey,
        this.encryptionIV
      );
      return cipher.update(toBase64, "utf8", "hex") + cipher.final("hex");
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decryptString(data) {
    if (!data) return "";

    try {
      const decipher = crypto.createDecipheriv(
        "aes256",
        this.encryptionKey,
        this.encryptionIV
      );
      const decrypted =
        decipher.update(data, "hex", "utf8") + decipher.final("utf8");
      return Buffer.from(decrypted, "base64").toString("utf8");
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  computeHash(input) {
    if (!input) return "";

    const base64WithoutHeaders = input.split(";base64,").pop();
    const hash = crypto.createHash("sha256");
    hash.update(base64WithoutHeaders, "utf8");

    return hash.digest("hex");
  }

  async checkUserIsInPaidStudio(email) {
    if (!email) return false;

    try {
      const user = await User.findOne({ email }).lean();
      if (!user) return false;

      const studios = await Studio.find({
        "users.userID": email,
        expirationDate: { $exists: true },
      }).lean();

      return studios.some((studio) => this.isPaidStudio(studio));
    } catch (error) {
      console.error("Error checking user in paid studios:", error);
      return false;
    }
  }

  async checkGameIsOfPaidStudio(gameID) {
    if (!gameID) return false;

    try {
      const studio = await Studio.findOne({
        "games.gameID": gameID,
      }).lean();

      return this.isPaidStudio(studio);
    } catch (error) {
      console.error("Error checking game is of paid studio:", error);
      return false;
    }
  }

  isPaidStudio(studio) {
    if (!studio?.expirationDate) return false;

    try {
      const gracePeriod = parseInt(studio.gracePeriod) || 0;
      const expirationWithGrace = dayjs
        .utc(studio.expirationDate)
        .add(gracePeriod, "hours");

      return expirationWithGrace.isAfter(new Date());
    } catch (error) {
      console.error("Error checking if studio is paid:", error);
      return false;
    }
  }

  async getStudioIDByGameID(gameID) {
    if (!gameID) return null;

    try {
      const studio = await Studio.findOne(
        { "games.gameID": gameID },
        { studioID: 1 }
      ).lean();

      return studio?.studioID || null;
    } catch (error) {
      console.error("Error getting studio by gameID:", error);
      return null;
    }
  }

  async generateShortHash(input, cleanFormat = false) {
    if (!input) return "";

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const base64Hash = btoa(String.fromCharCode.apply(null, hashArray));

      let result = base64Hash.substring(0, 12);

      if (cleanFormat) {
        result = result
          .replace(/[^a-zA-Z\d-]/g, "")
          .replace(/^-+|-+$/g, "")
          .substring(0, 12);
      }

      return result;
    } catch (error) {
      throw new Error(`Hash generation failed: ${error.message}`);
    }
  }

  async uploadFileToStudioCloud(gameID, fileBase64, extension = false) {
    // Check if "file" in question is not already https link. Otherwise assume it is a base64 and proceed

    console.log("fileBase64", fileBase64);
    if (fileBase64 && !fileBase64.startsWith("https://") && fileBase64 !== "") {
      const fileStorageService = this.moduleContainer.get("fileStorage");

      const generatedLink = await fileStorageService.uploadBase64FileToBucket(
        fileBase64,
        `${gameID}`,
        extension
      );
      console.log("generated link", generatedLink);
      return generatedLink;
    } else {
      return fileBase64; // If link wasnt generated, it means this is already a link, or conversion is impossible
    }
  }

  calculateChecksum(jsonDocument) {
    // We also need to calculate the checksum of the new body so the client can check it before updating
    const jsonString = JSON.stringify(jsonDocument);

    let checksum = 0;
    for (let i = 0; i < jsonString.length; i++) {
      checksum += jsonString.charCodeAt(i);
    }

    return checksum;
  }

  async uploadBase64FileToBucket(base64String, bucketName, extension = false) {
    const fileStorageService = this.moduleContainer.get("fileStorage");
    return await fileStorageService.uploadBase64FileToBucket(
      base64String,
      bucketName,
      extension
    );
  }

  async downloadFileFromBucketAsBase64(bucketName, fileName) {
    const fileStorageService = this.moduleContainer.get("fileStorage");
    return await fileStorageService.downloadFileFromBucketAsBase64(
      bucketName,
      fileName
    );
  }

  async fetchFileFromStudioCloud(gameID, link) {
    if (!gameID || !link) return "";

    try {
      const fileStorageService = this.moduleContainer.get("fileStorage");
      return await fileStorageService.downloadFileFromBucketAsBase64(
        this.getDemoGameID(gameID),
        link
      );
    } catch (error) {
      console.error("Error fetching file from studio cloud:", error);
      return "";
    }
  }

  removeExcessiveField(obj, removeID = true, removeBranches = true) {
    if (!obj) return obj;

    const newObj = JSON.parse(JSON.stringify(obj));

    function traverse(obj) {
      if (typeof obj === "object" && obj !== null) {
        if (removeID && obj.hasOwnProperty("_id")) {
          delete obj._id;
        }
        if (removeBranches && obj.hasOwnProperty("branch")) {
          delete obj.branch;
        }

        Object.values(obj).forEach(traverse);
      }
    }

    traverse(newObj);
    return newObj;
  }

  log(...args) {
    if (process.env.ENVIRONMENT === "staging") {
      console.log(...args);
    }
  }

  isHttpsUrl(str) {
    if (!str || typeof str !== "string") return false;
    return /^https:\/\/[^\s$.?#].[^\s]*$/.test(str);
  }

  getFileNameFromUrl(url) {
    if (!url) return "";
    return url.split("/").pop() || "";
  }

  getBranchWithoutSuffix(branch) {
    if (!branch) return branch;
    return branch.split("_")[0];
  }

  getBranchWithWorkingSuffix(branch) {
    if (!branch) return branch;
    const parts = branch.split("_");
    return parts.length > 1 && parts[1] === "working"
      ? branch
      : `${parts[0]}_working`;
  }

  getBranchWithReferenceSuffix(branch) {
    if (!branch) return branch;
    const parts = branch.split("_");
    return parts.length > 1 && parts[1] === "reference"
      ? branch
      : `${parts[0]}_reference`;
  }
}
