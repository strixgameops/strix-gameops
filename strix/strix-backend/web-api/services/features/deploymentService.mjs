import { DeploymentHistory } from "../../../models/deploymentHistory.js";
import { DeploymentCatalog } from "../../../models/deploymentCatalog.js";
import { PlanningTreeModel } from "../../../models/planningTreeModel.js";
import { NodeModel } from "../../../models/nodeModel.js";
import { AnalyticsEvents } from "../../../models/analyticsevents.js";
import { Segments } from "../../../models/segmentsModel.js";
import {
  LocalizationItem,
  GameLocalizationSettings,
} from "../../../models/localizationModel.js";
import { OffersModel as Offers } from "../../../models/offersModel.js";
import { Charts as CustomCharts } from "../../../models/charts.js";
import { ABTests } from "../../../models/abtests.js";
import { PWtemplates } from "../../../models/PWtemplates.js";
import { CookChecksums } from "../../../models/cookChecksums.js";
import { CookedContent } from "../../../models/cookedContent.js";
import { GameEvents } from "../../../models/gameEvents.js";
import { ASKUModel } from "../../../models/AskuAssociations.js";
import { OffersPositionsModel } from "../../../models/offerPositions.js";
import { PricingTemplates } from "../../../models/pricingTemplates.js";
import { GameEventsNotes } from "../../../models/gameEventsNotes.js";
import { Leaderboards } from "../../../models/leaderboardsModel.js";
import { Flows } from "../../../models/flows.js";
import { Clustering } from "../../../models/audienceClustering.js";
import { ClusteringCache } from "../../../models/audienceClusteringCache.js";
import { Changelogs } from "../../../models/loggingModel.js";
import { PWplayers } from "../../../models/PWplayers.js";
import { Alerts } from "../../../models/alertModel.js";
import { PushCampaigns } from "../../../models/pushCampaigns.js";

import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

export class DeploymentService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.gameMetadataCollections = [
      // Metadata collections. Used to create demo games, for example.
      { model: DeploymentHistory, type: "deploymentHistory" },
      { model: DeploymentCatalog, type: "deploymentCatalog" },
      { model: CookChecksums, type: "cookChecksums" },
      { model: Clustering, type: "clustering" },
      { model: ClusteringCache, type: "clusteringCache" },
      { model: Changelogs, type: "changelogs" },
      { model: PricingTemplates, type: "pricingTemplates" },
    ];

    this.gameCollections = [
      // Here are all collections that game uses, besides metadata collections
      { model: NodeModel, type: "nodes" },
      {
        model: AnalyticsEvents,
        type: "analyticsEvents",
      },
      {
        model: PushCampaigns,
        type: "pushCampaigns",
      },
      { model: Offers, type: "offers" },
      { model: LocalizationItem, type: "localization" },
      { model: PlanningTreeModel, type: "planningTree" },
      { model: PWtemplates, type: "PWtemplates" },
      { model: Segments, type: "segments" },
      { model: ABTests, type: "abtests" },
      { model: Flows, type: "flows" },
      { model: GameEvents, type: "gameEvents" },
      { model: GameEventsNotes, type: "gameEventsNotes" },
      { model: ASKUModel, type: "asku" },
      { model: OffersPositionsModel, type: "offersPositions" },
      { model: CustomCharts, type: "customCharts" },
      { model: Alerts, type: "alerts" },
      { model: Leaderboards, type: "leaderboards" },
      { model: GameLocalizationSettings, type: "gameLocalizationSettings" },
    ];
  }

  async startCookingProcess(
    gameID,
    sourceBranch,
    tags,
    commitMessage,
    clientUID
  ) {
    const utilityService = this.moduleContainer.get("utility");
    // Calculate next version based on selected tags
    const calculateNextVersion = () => {
      const baseParts = utilityService
        .getBranchWithoutSuffix(sourceBranch)
        .split(".")
        .map(Number);
      const newVersion = [...baseParts];

      if (tags.includes("breaking change")) {
        newVersion[0] += 1;
        newVersion[1] = 0;
        newVersion[2] = 0;
        newVersion[3] = 0;
      } else if (tags.includes("feature")) {
        newVersion[1] += 1;
        newVersion[2] = 0;
        newVersion[3] = 0;
      } else if (tags.includes("balance")) {
        newVersion[2] += 1;
        newVersion[3] = 0;
      } else if (tags.includes("fix")) {
        newVersion[3] += 1;
      }

      return newVersion.join(".");
    };
    const newVersion = calculateNextVersion();

    let alreadyCooked = false;
    for (const collection of this.gameCollections) {
      let exists = await collection.model.exists({
        gameID: gameID,
        branch: { $regex: new RegExp(`^${newVersion}`) },
      });
      if (exists) {
        alreadyCooked = true;
        break;
      }
    }
    if (alreadyCooked) {
      throw new Error(
        "Version already exists. Delete existing version first if you want to rebuild it."
      );
    }

    try {
      const contentCookingService = this.moduleContainer.get("contentCooking");

      await contentCookingService.cookBranchContent(
        gameID,
        utilityService.getBranchWithWorkingSuffix(sourceBranch),
        newVersion,
        clientUID
      );
      return await this.recordCreatedVersion(
        gameID,
        newVersion,
        utilityService.getBranchWithoutSuffix(sourceBranch),
        commitMessage,
        clientUID,
        tags
      );
    } catch (err) {
      await this.removeDeploymentVersion(
        gameID,
        utilityService.getBranchWithoutSuffix(newVersion)
      );
      throw err;
    }
  }

  async recordCreatedVersion(
    gameID,
    branch,
    sourceBranch,
    commitMessage,
    clientUID,
    tags
  ) {
    console.log("Recording new version: " + branch);
    const newEntry = {
      gameID: gameID,
      branch: branch,
      timestamp: new Date(),
      releaseNotes: commitMessage,
      deployer: clientUID,
      sourceBranch: sourceBranch,
      tags: tags,
    };
    const res = await DeploymentHistory.create(newEntry);
    console.log("New version created:", res);
    return newEntry;
  }

  async removeDeploymentVersion(gameID, branch) {
    try {
      const inCatalogue = await DeploymentCatalog.exists({
        gameID,
        "environments.deployments.version": branch,
      });

      if (inCatalogue) {
        throw new Error(
          "Cannot remove deployed version. Change deployment configuration before deleting version."
        );
      }

      for (const collection of this.gameCollections) {
        const res = await collection.model.deleteMany({
          gameID: gameID,
          branch: { $regex: new RegExp(`^${branch}`) },
        });
        console.log("Removing version", branch, "of", collection.type, res);
      }
      await DeploymentHistory.deleteMany({
        gameID: gameID,
        branch: branch,
      });
    } catch (error) {
      throw error;
    }
  }

  async getLatestDeployedBranches(gameID, limit) {
    try {
      const result = await DeploymentHistory.find({ gameID })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
      return result;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getListOfEnvironments(gameID) {
    try {
      const result = await DeploymentCatalog.findOne({ gameID }).lean();
      if (!result) {
        return [];
      } else {
        return result.environments.map((e) => e.name);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getGameDeploymentCatalog(gameID) {
    try {
      const result = await DeploymentCatalog.findOne({ gameID }).lean();
      if (!result) {
        const doc = {
          gameID,
          environments: [
            {
              name: "development",
              deployments: [],
            },
            {
              name: "staging",
              deployments: [],
            },
            {
              name: "production",
              deployments: [],
            },
          ],
        };
        await DeploymentCatalog.create(doc);
        return doc;
      }
      return result;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async updateGameDeploymentCatalog(
    gameID,
    environment,
    updateObj,
    deployRealtime
  ) {
    try {
      let result = await DeploymentCatalog.updateOne(
        { gameID, "environments.name": environment }, // Match the game and the correct environment
        {
          // Update deployments inside the matched environment
          $set: {
            "environments.$.deployments": updateObj,
            deployRealtime: deployRealtime,
          },
        },
        {
          upsert: true, // Create if not exists
        }
      );
      // If no environment was found and updated, push a new one
      if (result.matchedCount === 0) {
        result = await DeploymentCatalog.updateOne(
          { gameID },
          {
            $push: {
              environments: {
                name: environment,
                deployments: updateObj,
              },
            },
            $set: {
              deployRealtime: deployRealtime,
            },
          },
          { upsert: true }
        ).lean();
      }

      try {
        await axios.post(`${process.env.SDK_API_URL}/cacher/updateCall`, {
          gameID: gameID,
          environment: environment,
        });
      } catch (err) {
        if (process.env.ENVIRONMENT !== "staging") {
          console.error("Error asking game backend to refresh cache:", err);
        }
      }

      // Try to deploy IAPs of deployed versions
      const currentDeployments = await DeploymentCatalog.findOne({
        gameID,
      }).lean();
      await this.deployIAPCatalog(gameID, currentDeployments);

      return result;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getDeploymentChecksums(gameID, sourceBranch, targetBranch) {
    try {
      let branches = [sourceBranch, targetBranch];
      let sourceChecksums, targetChecksums;
      let iteration = 0;
      const utilityService = this.moduleContainer.get("utility");

      for (let branch of branches) {
        let checksums = {};

        for (const collection of this.gameCollections) {
          let modelItems = await collection.model
            .find({
              gameID: gameID,
              branch: branch,
            })
            .lean();
          checksums[collection.type] = utilityService.calculateChecksum(
            utilityService.removeExcessiveField(modelItems)
          );
        }

        switch (iteration) {
          case 0:
            sourceChecksums = checksums;
            break;
          case 1:
            targetChecksums = checksums;
            break;
        }
        iteration += 1;
      }

      const key = `${gameID}:${targetBranch}`;
      const res = await CookChecksums.findOne({ key: key }).lean();
      const controlChecksum =
        res && res.rawDataChecksum ? res.rawDataChecksum : 0;

      const result = {
        sourceChecksums: sourceChecksums,
        targetChecksums: targetChecksums,
        deployChecksum: controlChecksum,
      };
      return result;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async deployIAPCatalog(gameID, currentDeployments) {
    try {
      console.log(`---DEPLOYING ALL IAPs TO APP STORES FOR GAME: ${gameID}---`);
      // We get all versions that are currently deployed
      let versions = new Set();
      if (currentDeployments && currentDeployments.environments) {
        currentDeployments.environments.forEach((env) => {
          env.deployments.forEach((dep) => {
            versions.add(dep.version);
          });
        });
      } else {
        console.error("Deployments of game", gameID, "is undefined/null");
      }
      versions = Array.from(versions); // set to array
      console.log(
        `IAP DEPLOYMENT (${gameID}): got versions ${versions.join(", ")}`
      );
      const utilityService = this.moduleContainer.get("utility");

      // Iterate all the versions and try to get every possible unique offer of the IAP catalog
      let uniqueRealMoneyIAPs = [];
      for (let v of versions) {
        const contents = await CookedContent.find({
          gameID: gameID,
          branch: v,
          type: "offers",
        }).lean();
        const localizationService = this.moduleContainer.get("localization");

        const localizationTable = await localizationService.getLocalization(
          gameID,
          utilityService.getBranchWithReferenceSuffix(v),
          "offers"
        );

        const offerService = this.moduleContainer.get("offer");
        // Get pricing templates for default price values
        const pricingTemplates = await offerService.getPricing(
          gameID,
          utilityService.getBranchWithReferenceSuffix(v)
        );

        for (let content of contents) {
          if (content) {
            const data = JSON.parse(content.data);

            // Harvesting offers that are intended to be actual IAPs for a real money purchase
            const realMoneyOffers = data
              .filter((o) =>
                // Keeping only the offers that have money pricing
                {
                  if (o.pricing.targetCurrency === "money") {
                    return true;
                  } else {
                    return false;
                  }
                }
              )
              .map((o) => {
                let temp = { ...o };

                // Setting offer localization. This will be visible in app store when player buys it
                const oName = localizationTable.find(
                  (l) => l.sid === temp.name
                );
                const oDesc = localizationTable.find(
                  (l) => l.sid === temp.desc
                );
                if (oName) {
                  temp.name = oName.translations;
                } else {
                  temp.name = ["No name"];
                }

                if (oDesc) {
                  temp.desc = oDesc.translations;
                } else {
                  temp.desc = ["No description"];
                }

                const basePrice = pricingTemplates.find(
                  (t) => t.asku === o.pricing.pricingTemplateAsku
                )?.baseValue;
                if (basePrice) {
                  temp.pricing.basePrice = basePrice;
                } else {
                  throw new Error(
                    `Could not deploy IAPs to store. Could not find basePrice, got "${basePrice}"`
                  );
                }
                return temp;
              });

            realMoneyOffers.forEach((offer) => {
              if (
                uniqueRealMoneyIAPs.some((o) => o.asku === offer.asku) === false
              ) {
                // If no such asku is present, insert.
                // Ensure the array is unique by checking against asku
                uniqueRealMoneyIAPs.push(offer);
              }
            });
          } else {
            console.error(
              "Could not find any cooked content for the deployed version of game",
              gameID,
              "in branch",
              v
            );
          }
        }
      }
      console.log(
        `IAP DEPLOYMENT (${gameID}): got ${uniqueRealMoneyIAPs.length} real money IAPs`
      );

      // Syncing with Google Play IAPs
      try {
        console.log(
          `IAP DEPLOYMENT (${gameID}): Deploying ${uniqueRealMoneyIAPs.length} real money offers`
        );
        if (uniqueRealMoneyIAPs.length > 0) {
          const googlePlayService = this.moduleContainer.get("googlePlay");
          if (!googlePlayService) {
            console.error("deployIAPCatalog: googlePlay module not found");
          } else {
            await googlePlayService.uploadIapConfig(
              gameID,
              uniqueRealMoneyIAPs
            );
          }
        }
      } catch (error) {
        if (error.message === "Cannot reuse deleted SKU.") {
          // Try to regenerate all SKUs and reupload config
          console.error(
            "Got 'Cannot reuse deleted SKU.' error while uploading IAPs"
          );
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async getCurrentAudienceDeploymentStats(gameID) {
    try {
      const utilityService = this.moduleContainer.get("utility");

      const Ndays = dayjs.utc().subtract(1, "month").toDate();
      const results = await PWplayers.aggregate([
        // Match players who joined for the past N days (month)
        {
          $match: {
            gameID: utilityService.getDemoGameID(gameID),
            firstJoinDate: { $gte: Ndays },
          },
        },
        // Group by environment and branch
        {
          $group: {
            _id: { environment: "$environment", branch: "$branch" },
            count: { $sum: 1 },
          },
        },
      ]);
      const output = {};
      results.forEach((item) => {
        const { environment, branch } = item._id;
        if (!output[environment]) {
          output[environment] = {};
        }
        output[environment][branch] = item.count;
      });
      return output;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}
export default DeploymentService;
