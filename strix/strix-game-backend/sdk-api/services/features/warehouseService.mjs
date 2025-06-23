import { PWplayers } from "../../../models/PWplayers.js";
import { PWtemplates } from "../../../models/PWtemplates.js";
import { regions } from "../../utils/regions.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);

const cacheDimensionSuffix_players = "playerWarehouseRuntimeCache";
const cacheDimensionSuffix_templates = "pwTemplatesRuntimeCache";

export class WarehouseService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
    this.elementProcessor = null;
    this.cacheOperator = null;
  }

  async initialize() {
    if (this.initialized) return;

    this.utilityService = this.moduleContainer.get("utility");
    this.metricsService = this.moduleContainer.get("metrics");
    this.queueService = this.moduleContainer.get("queue");
    this.cacherService = this.moduleContainer.get("cacher");
    this.databaseTablesService = this.moduleContainer.get("databaseTables");
    this.databaseService = this.moduleContainer.get("database");
    this.segmentService = this.moduleContainer.get("segment");
    this.deploymentService = this.moduleContainer.get("deployment");
    this.abtestService = this.moduleContainer.get("abtest");

    this.cacheOperator = new CacheOperations(this.cacherService);
    this.elementProcessor = new ElementProcessor(
      this,
      this.cacherService,
      this.databaseTablesService,
      this.utilityService,
      this.cacheOperator,
      this.segmentService
    );
    
    this.initialized = true;
    console.log("WarehouseService initialized");
  }

  async addValueToStatisticElement(
    gameObj,
    build,
    environment,
    device,
    elementID,
    value
  ) {
    return this.elementProcessor.processStatisticsOperation("add", {
      gameObj,
      build,
      environment,
      device,
      elementID,
      value,
    });
  }

  async subtractValueFromStatisticElement(
    gameObj,
    build,
    environment,
    device,
    elementID,
    value
  ) {
    return this.elementProcessor.processStatisticsOperation("subtract", {
      gameObj,
      build,
      environment,
      device,
      elementID,
      value,
    });
  }

  async setValueToStatisticElement(
    gameID,
    build,
    environment,
    device,
    elementID,
    value
  ) {
    return this.elementProcessor.processStatisticsOperation("set", {
      gameID,
      build,
      environment,
      device,
      elementID,
      value,
    });
  }

  async getElementValue(gameObj, build, environment, device, elementID) {
    return this.elementProcessor.processStatisticsOperation("get", {
      gameObj,
      build,
      environment,
      device,
      elementID,
    });
  }

  async getAllStatisticsTemplates(gameID, branch) {
    try {
      const result = await PWtemplates.find({
        gameID: gameID,
        branch: this.utilityService.getBranchWithReferenceSuffix(branch),
        templateType: { $ne: "analytics" },
      });

      // Get template object
      if (result.length > 0) {
        return result;
      } else {
        return [];
      }
    } catch (error) {
      throw error;
    }
  }

  async getPlayerElements(gameID, clientID, branch, environment) {
    try {
      // Cache key for template and player data
      const templateCacheKey = `${gameID}:${branch}:${cacheDimensionSuffix_templates}:statisticsTemplates`;
      const playerElementsCacheKey = `${gameID}:${environment}:${cacheDimensionSuffix_players}:${clientID}:playerElements`;

      // Try to get from cache first
      let result = await this.cacherService.tryGetCache(playerElementsCacheKey);
      if (result) return result;

      // Get templates
      let queryTemplate = await this.cacherService.tryGetCache(
        templateCacheKey
      );
      if (!queryTemplate) {
        queryTemplate = await this.getAllStatisticsTemplates(gameID, branch);
        await this.cacherService.trySetCache(templateCacheKey, queryTemplate);
      }

      // Search in player's data
      const queryPlayer = await PWplayers.aggregate([
        {
          $match: {
            gameID: gameID,
            clientID: clientID,
            branch: branch,
            environment: environment,
          },
        },
        { $unwind: "$elements" },
        { $project: { _id: 0, elements: 1 } },
      ]);

      result = queryPlayer[0]?.elements;
      if (!result) return null;

      // Fill in default values for missing templates
      queryTemplate.forEach((t) => {
        if (!result.statistics.some((st) => st.elementID === t.templateID)) {
          result.statistics.push({
            elementID: t.templateID,
            elementValue: this.formatTemplateValueAsType(
              t.templateDefaultValue,
              t.templateType
            ),
          });
        }
      });

      // Clean up and format result
      result = []
        .concat(result.statistics)
        .concat(result.analytics)
        .map((e) => {
          delete e._id;
          return e;
        });

      result = {
        clientID: clientID,
        elements: result,
      };

      // Cache the result
      await this.cacherService.trySetCache(playerElementsCacheKey, result);
      return result;
    } catch (error) {
      console.error("warehouseManager:", error);
      return null;
    }
  }
  async setValueToAnalyticElement(
    gameID,
    build,
    environment,
    device,
    elementID,
    value
  ) {
    return this.elementProcessor.processAnalyticsOperation("set", {
      gameID,
      build,
      environment,
      device,
      elementID,
      value,
    });
  }

  async addValueToAnalyticElement(
    gameID,
    build,
    environment,
    device,
    elementID,
    value
  ) {
    return this.elementProcessor.processAnalyticsOperation("add", {
      gameID,
      build,
      environment,
      device,
      elementID,
      value,
    });
  }

  async setValueToAnalyticElementFirstTimeOnly(
    gameID,
    build,
    environment,
    device,
    elementID,
    value
  ) {
    try {
      const doc = await PWplayers.exists({
        clientID: device,
        gameID: gameID,
        environment: environment,
        "elements.analytics.elementID": elementID,
      });

      if (doc) return; // Element exists, do nothing

      const defaultElement = await this.cacheOperator.getTemplate(
        gameID,
        build,
        elementID
      );

      const result = await ElementOperations.createElement(
        PWplayers,
        {
          clientID: device,
          gameID: gameID,
          environment: environment,
        },
        {
          "elements.analytics": {
            elementID: defaultElement.templateID,
            elementValue: value,
          },
        }
      );

      if (result.success) {
        await this.segmentService.recalculateSegments(
          gameID,
          build,
          environment,
          device,
          elementID,
          false,
          false
        );
      }

      return result.success;
    } catch (error) {
      throw error;
    }
  }

  async addValueToAnalyticElementValuesArray(
    gameID,
    build,
    environment,
    device,
    elementID,
    value,
    templateType
  ) {
    return this.elementProcessor.processAnalyticsOperation("array", {
      gameID,
      build,
      environment,
      device,
      elementID,
      value,
      templateType,
    });
  }

  async incrementValueInAnalyticElement(
    gameID,
    build,
    environment,
    device,
    elementID,
    value = 1
  ) {
    return this.elementProcessor.processAnalyticsOperation("increment", {
      gameID,
      build,
      environment,
      device,
      elementID,
      value,
    });
  }

  async initializeSdkSession(gameID, environment, device, clientIP) {
    try {
      // Init new player. Creates new player or returns the existing one
      let { isNewPlayer, playerWarehouse } =
        await this.initializeNewPlayerSession(gameID, device, environment);

      let country = null;
      if (clientIP) {
        country = await this.cacherService.getClientCountry(clientIP);
      }
      if (!country) {
        country = "Unknown";
      }

      // Get player country
      let playerCurrency = Object.values(regions).find(
        (e) => e.name === country
      )?.currency;
      if (!playerCurrency) {
        playerCurrency = "USD";
      }

      return { isNewPlayer, playerWarehouse, playerCurrency };
    } catch (error) {
      console.error(error);
      return {};
    }
  }
  async initializeNewPlayerSession(gameID, clientID, environment) {
    try {
      let isNewPlayer = false;

      const { version, playerExists } =
        await this.deploymentService.getIntendedConfigVersionForPlayer(
          gameID,
          environment,
          clientID
        );

      // Find the PlayerWarehouse document by gameID, branchName, and clientID
      const playerWarehousePromise = PWplayers.findOneAndUpdate(
        {
          gameID: gameID,
          environment: environment,
          clientID,
        },
        {
          $set: {
            lastJoinDate: new Date(),
            ...(playerExists ? { branch: version } : {}),
          },
        },
        {
          new: true,
        }
      ).lean();
      // Also get all AB tests
      const ongoingTestsPromise = this.abtestService.getOngoingABTests(
        gameID,
        version
      );

      let [playerWarehouse, ongoingTests] = await Promise.all([
        playerWarehousePromise,
        ongoingTestsPromise,
      ]);

      // If no player found, create a new one
      if (!playerWarehouse) {
        isNewPlayer = true;

        playerWarehouse = {
          gameID: gameID,
          branch: version,
          clientID: clientID,
          elements: {
            statistics: [],
            analytics: [
              {
                elementID: "firstJoinDate",
                elementValue: new Date(),
              },
            ],
          },
          inventory: [],
          offers: [],
          abtests: [],
          segments: ["everyone"],
          firstJoinDate: new Date(),
          lastJoinDate: new Date(),
          environment: environment,
        };
        await PWplayers.collection.insertOne(playerWarehouse);

        // Increment the segment player count for "everyone" segment
        this.segmentService.incrementSegmentPlayerCount(
          gameID,
          version,
          "everyone",
          1
        );
      }

      // Manage player's AB testing
      if (ongoingTests.success && ongoingTests.abTests.length > 0) {
        // Clear non-existing tests from the player, actualizing tests list in player object
        const cleanedTests =
          await this.abtestService.clearNonExistingTestsFromPlayer(
            gameID,
            environment,
            playerWarehouse,
            ongoingTests.abTests.map((t) => t.id)
          );
        playerWarehouse.abtests = cleanedTests;
        // If any test exist, try to add player to it
        for (const test of ongoingTests.abTests) {
          const newTest = await this.abtestService.tryToAddPlayerToTest(
            gameID,
            version,
            environment,
            playerWarehouse,
            test
          );
          if (newTest) {
            // Since we don't wait for all db calls to complete, we don't have updated player profile
            // with the according abtest & segment in the array, so we optimistically set it by ourselves.
            playerWarehouse.segments.push(`abtest_${newTest.testID}`);
            playerWarehouse.abtests.push(newTest);
          }
        }
      }

      // Remove unnecessary fields
      function removeFields(obj) {
        function traverse(obj) {
          // Check if array
          if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i++) {
              if (typeof obj[i] === "object" && obj[i] !== null) {
                traverse(obj[i]);
              }
            }
            // Check if object
          } else if (typeof obj === "object" && obj !== null) {
            for (const key in obj) {
              if (key === "_id") {
                delete obj[key];
              } else if (typeof obj[key] === "object" && obj[key] !== null) {
                traverse(obj[key]);
              }
            }
          }
        }

        // Remove top-level fields
        delete obj._id;
        delete obj.gameID;

        // Recursively remove _id fields
        traverse(obj);
      }
      removeFields(playerWarehouse);

      playerWarehouse.elements = []
        .concat(playerWarehouse.elements.statistics)
        .concat(playerWarehouse.elements.analytics);

      return { isNewPlayer, playerWarehouse };
    } catch (error) {
      console.error(error);
      return {};
    }
  }

  async makeFullPlayerObject(
    gameID,
    branch,
    environment,
    clientID,
    requiredTemplateIDs
  ) {
    try {
      const playerCacheKey = `${gameID}:${environment}:${cacheDimensionSuffix_players}:${clientID}:player`;

      // Needed to get the full player object with all elements.
      // That means if there are any elements missing, they will be replaced with the intended default values.
      let playerObject = await this.cacherService.tryGetCache(playerCacheKey);
      if (!playerObject) {
        playerObject = await PWplayers.findOne({
          gameID: gameID,
          clientID: clientID,
          environment: environment,
        }).lean();

        if (playerObject) {
          await this.cacherService.trySetCache(playerCacheKey, playerObject);
        }
      }
      // Finding missing elements
      let playerElements = []
        .concat(playerObject.elements.statistics)
        .concat(playerObject.elements.analytics);

      let missingElementsIDs = requiredTemplateIDs.filter(
        (id) => !playerElements.some((e) => e.elementID === id)
      );

      let entityIDs = [];

      let inventoryItems = await Promise.all(
        missingElementsIDs.map(async (id) => {
          const entity = await this.cacherService.getCachedEntityByNodeID(
            gameID,
            branch,
            id
          );
          if (entity) {
            entityIDs.push(entity);
            const item = playerObject.inventory.find(
              (i) => i.nodeID === entity
            );
            return {
              nodeID: entity,
              quantity: item ? item.quantity : "0",
            };
          }
          return null;
        })
      );

      inventoryItems = inventoryItems.filter(Boolean);
      playerObject.inventory = inventoryItems;

      missingElementsIDs = missingElementsIDs.filter(
        (id) => !entityIDs.includes(id)
      );
      const missingElements = await Promise.all(
        missingElementsIDs.map(async (e) => {
          const element = await this.cacherService.getCachedTemplateByID(
            gameID,
            branch,
            e
          );
          return element
            ? {
                elementID: element.templateID,
                elementValue: element.templateDefaultValue,
              }
            : null;
        })
      );

      playerElements = playerElements.concat(missingElements.filter(Boolean));

      // Outputs player object with concatenated elements array
      playerObject.elements = playerElements;

      return playerObject;
    } catch (error) {
      console.error("warehouseManager:", error);
    }
  }

  formatTemplateValueAsType(templateValue, templateType) {
    // Format template value according to it's type.
    // E.g. make 5.00 from "5" if template is a float.
    try {
      if (templateType === "integer") {
        return parseInt(templateValue);
      } else if (templateType === "float") {
        return parseFloat(templateValue);
      } else if (templateType === "string") {
        return templateValue;
      } else if (templateType === "bool") {
        return templateValue === "True";
      }
    } catch (err) {
      console.error("Error at formatTemplateValueAsType: " + err.message);
      return null;
    }
  }

  async changePlayerOfferExpiration(
    gameID,
    clientID,
    build,
    environment,
    offerID,
    expiration
  ) {
    try {
      const cacheKey = `${gameID}:${environment}:${cacheDimensionSuffix_players}:${clientID}:offers`;

      const result = await PWplayers.updateOne(
        {
          gameID,
          clientID,
          environment: environment,
          "offers.offerID": offerID,
        },
        {
          $set: { "offers.$.expiration": expiration },
        }
      );

      if (result.matchedCount === 0) {
        // If no offer, add new
        await PWplayers.updateOne(
          {
            gameID,
            clientID,
            environment: environment,
          },
          {
            $push: {
              offers: {
                offerID,
                expiration,
                purchasedTimes: 0,
                currentAmount: 0,
              },
            },
          },
          { upsert: true }
        );
      }

      // Invalidate cache
      await this.cacherService.tryDeleteCache(cacheKey);

      this.utilityService.log(
        `Offer ${offerID} expiration set to '${expiration}' for player with gameID '${gameID}'.`
      );
    } catch (err) {
      console.error("changePlayerOfferExpiration: ", err);
    }
  }

  async registerOfferPaymentToPlayerData(
    gameID,
    clientID,
    offerID,
    build,
    price,
    currency,
    environment
  ) {
    try {
      // Cache keys
      const offersCacheKey = `${gameID}:${build}:offers:everyone`;
      const playerCacheKey = `${gameID}:${environment}:${cacheDimensionSuffix_players}:${clientID}:player`;

      // Get offers content from cache or fetch
      let offers = await this.cacherService.tryGetCache(offersCacheKey);
      if (!offers) {
        offers = await this.cacherService.getCachedContent(
          gameID,
          "offers",
          build,
          "everyone"
        );
        if (offers) {
          await this.cacherService.trySetCache(offersCacheKey, offers);
        }
      }

      if (!offers) {
        console.error(
          `registerOfferPaymentToPlayerData: No offers found for game ${gameID} in branch ${build} in cache.`
        );
        return;
      }

      const isIAP = offers.find((o) => o.id === offerID)?.isValidIAP;

      // Find the player
      let player = await this.cacherService.tryGetCache(playerCacheKey);
      if (!player) {
        player = await PWplayers.findOne({
          gameID,
          clientID,
          environment: environment,
        }).lean();

        if (player) {
          await this.cacherService.trySetCache(playerCacheKey, player);
        }
      }

      if (!player) {
        throw new Error(
          `registerOfferPaymentToPlayerData: Player ${clientID} in game ${gameID} was not found.`
        );
      }

      // Find the offer
      let offer = undefined;
      if (player?.offers && Array.isArray(player.offers)) {
        offer = player.offers.find((o) => o.offerID === offerID);
      } else {
        player.offers = [];
      }

      // Update or create offer
      let update;
      let useArrayFilter = false;
      if (offer) {
        const updatedPurchasedTimes = offer.purchasedTimes + 1;
        const updatedCurrentAmount = offer.currentAmount + 1;

        update = {
          $set: {
            "offers.$[elem].purchasedTimes": updatedPurchasedTimes,
            "offers.$[elem].currentAmount": updatedCurrentAmount,
          },
        };
        useArrayFilter = true;
      } else {
        offer = {
          offerID,
          expiration: null,
          purchasedTimes: 1,
          currentAmount: 1,
        };

        update = {
          $push: {
            offers: offer,
          },
        };
      }

      // Save the updated player document
      await PWplayers.updateOne(
        {
          gameID,
          clientID,
          environment: environment,
        },
        update,
        {
          ...(useArrayFilter
            ? { arrayFilters: [{ "elem.offerID": offerID }] }
            : {}),
        }
      );

      // Invalidate cache
      await this.cacherService.tryDeleteCache(playerCacheKey);

      // Handle IAP-related updates
      if (isIAP === true) {
        const priceInUSD = await this.cacherService.getCachedExchangeRate(
          currency,
          price
        );
        const now = new Date();

        await Promise.all([
          this.setPlayerLastPaymentDate(
            gameID,
            build,
            environment,
            clientID,
            now
          ),
          this.setPlayerTotalPaymentsSumm(
            gameID,
            build,
            environment,
            clientID,
            priceInUSD
          ),
          this.setPlayerTotalPaymentsCount(
            gameID,
            build,
            environment,
            clientID,
            1
          ),
          this.setPlayerMeanPaymentRecency(
            gameID,
            build,
            environment,
            clientID,
            now
          ),
        ]);
      } else {
        this.utilityService.log(
          `Offer '${offerID}' is not IAP. Skipping IAP-related elements change for player '${clientID}' in game ${gameID}.`
        );
      }

      this.utilityService.log(
        `Successfully registered offer '${offerID}' to player '${clientID}' player with gameID '${gameID}'.`
      );
    } catch (err) {
      console.error(
        `registerOfferPaymentToPlayerData: Game ${gameID} in branch ${build}: `,
        err
      );
    }
  }

  async registerPlayerItemInWarehouse(
    gameID,
    build,
    environment,
    clientID,
    nodeID,
    quantity,
    slot
  ) {
    try {
      const doc = await PWplayers.findOne(
        {
          clientID: clientID,
          gameID: gameID,
          environment: environment,
        },
        { inventory: 1 }
      ).lean();

      if (!doc) {
        console.error(
          "registerPlayerItemInWarehouse: Could not find player to replicate inventory"
        );
      }

      await PWplayers.updateOne(
        {
          clientID: clientID,
          gameID: gameID,
          environment: environment,
          "inventory.nodeID": nodeID,
          "inventory.slot": slot,
        },
        {
          $set: {
            "inventory.$.quantity": quantity,
          },
        }
      );
    } catch (err) {
      console.error("registerPlayerItemInWarehouse:", err);
    }
  }
  async unregisterPlayerItemInWarehouse(
    gameID,
    environment,
    clientID,
    nodeID,
    slot
  ) {
    try {
      const doc = await PWplayers.exists({
        clientID: clientID,
        gameID: gameID,
        environment: environment,
      });
      if (!doc) {
        console.error(
          "registerPlayerItemInWarehouse: Could not find player to replicate inventory"
        );
      }
      const pullQuery =
        slot !== undefined && slot !== null ? { nodeID, slot } : { nodeID };

      await PWplayers.updateOne(
        {
          clientID: clientID,
          gameID: gameID,
          environment: environment,
        },
        {
          $pull: {
            inventory: pullQuery,
          },
        }
      );
    } catch (err) {
      console.error("registerPlayerItemInWarehouse:", err);
    }
  }

  async getPlayerSegmentsArray(gameID, environment, clientID) {
    try {
      const player = await PWplayers.findOne(
        { gameID: gameID, environment: environment, clientID: clientID },
        { segments: 1 }
      ).lean();
      if (!player) {
        return [];
      }
      return player.segments;
    } catch (error) {
      console.error(
        "Could not get player segments",
        error,
        gameID,
        environment,
        clientID
      );
    }
  }

  async setPlayerLastReturnDate(
    gameID,
    branch,
    environment,
    clientID,
    newDate
  ) {
    try {
      this.setValueToAnalyticElement(
        gameID,
        branch,
        environment,
        clientID,
        "lastReturnDate",
        newDate
      );
    } catch (error) {
      console.error(error);
    }
  }
  async setPlayerLastPaymentDate(
    gameID,
    branch,
    environment,
    clientID,
    newDate
  ) {
    try {
      this.setValueToAnalyticElement(
        gameID,
        branch,
        environment,
        clientID,
        "lastPaymentDate",
        newDate
      );
    } catch (error) {
      console.error(error);
    }
  }
  async setPlayerTotalPaymentsSumm(
    gameID,
    branch,
    environment,
    clientID,
    value
  ) {
    try {
      this.addValueToAnalyticElement(
        gameID,
        branch,
        environment,
        clientID,
        "totalPaymentsSumm",
        value
      );
    } catch (error) {
      console.error(error);
    }
  }
  async setPlayerTotalPaymentsCount(
    gameID,
    branch,
    environment,
    clientID,
    value
  ) {
    try {
      this.incrementValueInAnalyticElement(
        gameID,
        branch,
        environment,
        clientID,
        "totalPaymentsCount",
        value
      );
    } catch (error) {
      console.error(error);
    }
  }
  async setPlayerMeanPaymentRecency(
    gameID,
    branch,
    environment,
    clientID,
    newDate
  ) {
    try {
      this.addValueToAnalyticElementValuesArray(
        gameID,
        branch,
        environment,
        clientID,
        "meanPaymentRecency",
        newDate,
        "meanPaymentRecency"
      );
    } catch (error) {
      console.error(error);
    }
  }

  async getLeaderboard(
    gameID,
    branch,
    environment,
    clientID,
    leaderboardID,
    groupByElementID,
    groupByElementValue
  ) {
    try {
      const lb = await this.cacherService.getCachedLeaderboardByCodename(
        gameID,
        branch,
        environment,
        leaderboardID
      );
      if (!lb) {
        return null;
      }
      let tops = await Promise.all(
        lb.timeframes.map(async (t, i) => ({
          index: i,
          top: await this.cacherService.getCachedLeaderboardTop(
            gameID,
            branch,
            environment,
            lb.codename,
            t.key,
            clientID,
            groupByElementID,
            groupByElementValue
          ),
        }))
      );

      tops = JSON.parse(JSON.stringify(tops));

      if (tops && tops.length > 0) {
        tops = await Promise.all(
          tops.map(async (t) => {
            t.top = await Promise.all(
              t.top.map(async (p) => {
                const scoreTemplate =
                  await this.cacherService.getCachedTemplateByID(
                    gameID,
                    branch,
                    p.scoreElement.elementID
                  );
                p.scoreElement.elementID =
                  scoreTemplate?.templateCodeName || p.scoreElement.elementID;

                p.additionalElements = await Promise.all(
                  p.additionalElements.map(async (e) => {
                    const elementTemplate =
                      await this.cacherService.getCachedTemplateByID(
                        gameID,
                        branch,
                        e.elementID
                      );
                    return {
                      ...e,
                      elementID: elementTemplate.templateCodeName,
                    };
                  })
                );

                return p;
              })
            );

            return t;
          })
        );
      }

      return tops;
    } catch (error) {
      console.error(error);
    }
  }
  async backendPlayerAction(
    gameID,
    branch,
    environment,
    clientID,
    action,
    payload
  ) {
    try {
      switch (action) {
        case "segment_remove":
        case "segment_add":
          if (payload.flowSid) {
            let check = true;

            const flowExists = await this.cacherService.getCachedFlow(
              gameID,
              branch,
              payload.flowSid
            );
            if (!flowExists) {
              check = false;
            }
            if (payload.nodeSid) {
              const nodeExists = await this.cacherService.getCachedFlowNodes(
                gameID,
                branch,
                payload.nodeSid
              );
              if (!nodeExists) {
                check = false;
              }
            }

            if (check && payload.segmentID) {
              if (action === "segment_add") {
                this.segmentService.addPlayerToSegment(
                  gameID,
                  branch,
                  environment,
                  payload.segmentID,
                  clientID,
                  false,
                  true
                );
              } else if (action === "segment_remove") {
                this.segmentService.removePlayerFromSegment(
                  gameID,
                  branch,
                  environment,
                  payload.segmentID,
                  clientID,
                  true
                );
              }
            }

            return check;
          }
          return false;
        default:
          return false;
      }
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}

// Database operation abstractions
class ElementOperations {
   static async getElement(model, query, projection = {}) {
    try {
      return await model.findOne(query, projection).lean();
    } catch (error) {
      console.error(`Database query error: ${error}`);
      return null;
    }
  }

   static async updateElement(model, query, update, options = {}) {
    try {
      const result = await model.updateOne(query, update, options);
      return {
        success: result.modifiedCount > 0 || result.upsertedCount > 0,
        result,
      };
    } catch (error) {
      console.error(`Database update error: ${error}`);
      return { success: false, error };
    }
  }

   static async createElement(
    model,
    query,
    element,
    options = { upsert: true }
  ) {
    try {
      const result = await model.updateOne(query, { $push: element }, options);
      return {
        success: result.modifiedCount > 0 || result.upsertedCount > 0,
        result,
      };
    } catch (error) {
      console.error(`Database create error: ${error}`);
      return { success: false, error };
    }
  }
}

// Cache operations
class CacheOperations {
  constructor(cacherService) {
    this.cacherService = cacherService;
  }
   async getTemplate(gameID, build, elementID) {
    const template = await this.cacherService.getCachedTemplateByID(
      gameID,
      build,
      elementID
    );

    return template;
  }
}

// Element processor
class ElementProcessor {
  constructor(
    warehouseService,
    cacherService,
    databaseTablesService,
    utilityService,
    cacheOperator,
    segmentService
  ) {
    this.warehouseService = warehouseService;
    this.cacherService = cacherService;
    this.cacheOperator = cacheOperator;
    this.utilityService = utilityService;
    this.databaseTablesService = databaseTablesService;
    this.segmentService = segmentService;
  }
   async processStatisticsOperation(operation, params) {
    const { gameObj, build, environment, device, elementID, value } = params;
    const gameID = gameObj?.gameID || params.gameID;
    const playerCacheKey = `${gameID}:${environment}:${cacheDimensionSuffix_players}:${device}:player`;
    const playerElementsCacheKey = `${gameID}:${environment}:playersElementsValuesCache:${device}:${elementID}`;

    try {
      let result;
      if (operation === "get") {
        result = await this.cacherService.tryGetCache(playerElementsCacheKey);
        if (result) {
          return result;
        }
      }

      // Get template and existing document
      const defaultElement = await this.cacheOperator.getTemplate(
        gameID,
        build,
        elementID
      );

      const rangeMin = defaultElement.templateValueRangeMin || -Infinity;
      const rangeMax = defaultElement.templateValueRangeMax || Infinity;

      const doc = await ElementOperations.getElement(PWplayers, {
        clientID: device,
        gameID: gameID,
        environment: environment,
        "elements.statistics.elementID": elementID,
      });

      // Process based on operation type
      if (doc) {
        result = await this._updateExistingStatistic(operation, {
          gameID,
          device,
          environment,
          elementID,
          value,
          rangeMin,
          rangeMax,
        });
      } else {
        result = await this._createNewStatistic(operation, {
          gameID,
          device,
          environment,
          elementID,
          value,
          defaultElement,
          rangeMin,
          rangeMax,
        });
      }

      // Process result
      if (result.success) {
        if (operation !== "get") {
          await this.cacherService.tryDeleteCache(playerCacheKey);
          await this.cacherService.trySetCache(playerElementsCacheKey, value);

          await this.segmentService.recalculateSegments(
            gameID,
            build,
            environment,
            device,
            elementID,
            false,
            false
          );

          await this.handleLeaderboardAfterElementChange(
            gameID,
            build,
            device,
            elementID,
            value,
            rangeMin,
            rangeMax,
            operation
          );
        } else {
          // If get, cache player's element
          await this.cacherService.trySetCache(
            playerElementsCacheKey,
            result.value
          );
        }

        return operation === "get" ? result.value : true;
      } else {
        if (operation !== "get") {
          this.utilityService.log(
            `Could not ${operation} value to statistics element. Either the value is the same and wasn't changed, or min-max app-logic limit was hit.`
          );
        }
        return operation === "get" ? null : false;
      }
    } catch (error) {
      console.error(`warehouseManager ${operation}:`, error);
      return operation === "get" ? null : false;
    }
  }

  async handleLeaderboardAfterElementChange(
    gameID,
    branch,
    environment,
    clientID,
    elementID,
    value,
    rangeMin,
    rangeMax,
    operationType // add/subtract/set
  ) {
    try {
      const lbs = await this.cacherService.getCachedLeaderboardsByGame(
        gameID,
        branch
      );
      let table;

      if (lbs && lbs.length > 0) {
        for (let lb of lbs) {
          const check = lb.aggregateElementID === elementID;
          // ||
          // lb.additionalElementIDs.includes(elementID);
          if (check) {
            if (!table) {
              table = await this.databaseTablesService.getLeaderboardTable(
                gameID
              );
            }

            for (const timeframe of lb.timeframes) {
              const currValue =
                await this.cacherService.getCachedPlayerLeaderboardTimeframeValue(
                  table,
                  gameID,
                  branch,
                  environment,
                  timeframe.key,
                  clientID,
                  elementID,

                  // For new doc creation
                  lb.aggregateElementID,
                  lb.additionalElementIDs
                );
              const isAdditionalValue =
                lb.additionalElementIDs.includes(elementID);

              // Perform operation on current value
              let valueToInsert = currValue;
              switch (operationType) {
                case "add":
                  if (rangeMin && rangeMax) {
                    valueToInsert = this.utilityService.clamp(
                      valueToInsert + value,
                      rangeMin,
                      rangeMax
                    );
                  }
                  break;
                case "subtract":
                  if (rangeMin && rangeMax) {
                    valueToInsert = this.utilityService.clamp(
                      valueToInsert - value,
                      rangeMin,
                      rangeMax
                    );
                  }
                  break;
                case "set":
                  valueToInsert = value;
                  break;

                default:
                  break;
              }

              await this.cacherService.saveCachedPlayerLeaderboardTimeframeValue(
                gameID,
                branch,
                environment,
                timeframe.key,
                clientID,
                elementID,
                valueToInsert,
                isAdditionalValue
              );
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

   async _updateExistingStatistic(operation, params) {
    const {
      gameID,
      device,
      environment,
      elementID,
      value,
      rangeMin,
      rangeMax,
    } = params;

    const baseQuery = {
      clientID: device,
      gameID: gameID,
      environment: environment,
      elements: {
        statistics: {
          $elemMatch: {
            elementID: elementID,
          },
        },
      },
    };

    let update,
      query = baseQuery;

    switch (operation) {
      case "add":
        if (rangeMax !== Infinity) {
          query.elements.statistics.$elemMatch.elementValue = {
            $lte: parseFloat(rangeMax) - value,
            $gte: parseFloat(rangeMin),
          };
        }
        update = { $inc: { "elements.statistics.$.elementValue": value } };
        break;

      case "subtract":
        if (rangeMin !== -Infinity) {
          query.elements.statistics.$elemMatch.elementValue = {
            $lte: parseFloat(rangeMax),
            $gte: parseFloat(rangeMin) + value,
          };
        }
        update = { $inc: { "elements.statistics.$.elementValue": value * -1 } };
        break;

      case "set":
        if (rangeMin && rangeMax && (value < rangeMin || value > rangeMax)) {
          throw new Error("Value out of range for set operation");
        }
        update = { $set: { "elements.statistics.$.elementValue": value } };
        break;

      case "get":
        // For get, we already have the doc from the caller function
        return {
          success: true,
          value: params.doc?.elements?.statistics[0]?.elementValue,
        };
    }

    return operation !== "get"
      ? await ElementOperations.updateElement(PWplayers, query, update)
      : { success: false };
  }

   async _createNewStatistic(operation, params) {
    const {
      gameID,
      device,
      environment,
      elementID,
      value,
      defaultElement,
      rangeMin,
      rangeMax,
    } = params;

    const query = {
      clientID: device,
      gameID: gameID,
      environment: environment,
    };

    let transformedDefaultValue = this.warehouseService.formatTemplateValueAsType(
      defaultElement.templateDefaultValue,
      defaultElement.templateType
    );

    let finalValue;
    switch (operation) {
      case "add":
        finalValue = this.utilityService.clamp(
          transformedDefaultValue + value,
          rangeMin,
          rangeMax
        );
        break;
      case "subtract":
        finalValue = this.utilityService.clamp(
          transformedDefaultValue - value,
          rangeMin,
          rangeMax
        );
        break;
      case "set":
        finalValue = this.utilityService.clamp(value, rangeMin, rangeMax);
        break;
      case "get":
        return { success: true, value: transformedDefaultValue };
    }

    const element = {
      "elements.statistics": {
        elementID: defaultElement.templateID,
        elementValue: finalValue,
      },
    };

    return await ElementOperations.createElement(PWplayers, query, element);
  }

  async processAnalyticsOperation(operation, params) {
    const {
      gameID,
      build,
      environment,
      device,
      elementID,
      value,
      templateType,
    } = params;

    const playerCacheKey = `${gameID}:${environment}:${cacheDimensionSuffix_players}:${device}:player`;

    try {
      const defaultElement = await this.cacheOperator.getTemplate(
        gameID,
        build,
        elementID
      );

      if (!defaultElement.templateID) {
        console.error(
          `Got ${defaultElement} when tried to find element with ID "${elementID}!!"`
        );
      }

      const doc = await ElementOperations.getElement(PWplayers, {
        clientID: device,
        gameID: gameID,
        environment: environment,
        "elements.analytics.elementID": elementID,
      });

      let result;

      if (doc) {
        result = await this._updateExistingAnalytic(operation, {
          gameID,
          device,
          environment,
          elementID,
          value,
          doc,
          templateType,
          defaultElement,
        });
      } else {
        result = await this._createNewAnalytic(operation, {
          gameID,
          device,
          environment,
          value,
          defaultElement,
          templateType,
        });
      }

      if (result.success) {
        await this.cacherService.tryDeleteCache(playerCacheKey);

        await this.segmentService.recalculateSegments(
          gameID,
          build,
          environment,
          device,
          elementID,
          false,
          false
        );
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(`warehouseManager ${operation}:`, error);
      throw error;
    }
  }

  async _updateExistingAnalytic(operation, params) {
    const {
      gameID,
      device,
      environment,
      elementID,
      value,
      doc,
      templateType,
      defaultElement,
    } = params;

    const query = {
      clientID: device,
      gameID: gameID,
      environment: environment,
      "elements.analytics": {
        $elemMatch: {
          elementID: elementID,
        },
      },
    };

    let update;

    switch (operation) {
      case "set":
        update = {
          $set: {
            "elements.analytics.$.elementID": defaultElement.templateID,
            "elements.analytics.$.elementValue": value,
          },
        };
        break;

      case "add":
        const currentValue =
          doc.elements.analytics.find((e) => e.elementID === elementID)
            ?.elementValue || 0;
        update = {
          $set: {
            "elements.analytics.$.elementValue": currentValue + value,
          },
        };
        break;

      case "increment":
        const currentIncValue =
          parseInt(
            doc.elements.analytics.find((e) => e.elementID === elementID)
              ?.elementValue
          ) || 0;
        update = {
          $set: {
            "elements.analytics.$.elementValue": isNaN(currentIncValue)
              ? value
              : currentIncValue + value,
          },
        };
        break;

      case "array":
        const values =
          doc?.elements?.analytics?.find((e) => e.elementID === elementID)
            ?.elementValues || [];
        const { newValue, updatedValues } = this._processAnalyticsArray(
          values,
          value,
          templateType,
          defaultElement
        );

        update = {
          $set: {
            "elements.analytics.$.elementValues": updatedValues,
            "elements.analytics.$.elementValue": newValue,
          },
        };
        break;
    }

    return await ElementOperations.updateElement(PWplayers, query, update);
  }

  async _createNewAnalytic(operation, params) {
    const { gameID, device, environment, value, defaultElement, templateType } =
      params;

    const query = {
      clientID: device,
      gameID: gameID,
      environment: environment,
    };

    let element = {
      "elements.analytics": {
        elementID: defaultElement.templateID,
        elementValue: value,
      },
    };

    if (operation === "array") {
      const values = [];
      const { newValue, updatedValues } = this._processAnalyticsArray(
        values,
        value,
        templateType,
        defaultElement
      );

      element = {
        "elements.analytics": {
          elementID: defaultElement.templateID,
          elementValue: newValue,
          elementValues: updatedValues,
        },
      };
    }

    return await ElementOperations.createElement(PWplayers, query, element);
  }

   _processAnalyticsArray(values, value, templateType, defaultElement) {
    const clonedValues = JSON.parse(JSON.stringify(values));
    let newValue;

    switch (templateType) {
      case "mostCommon":
        clonedValues.push(value);
        newValue = getMostFrequentValueInArray(clonedValues);
        break;
      case "leastCommon":
        clonedValues.push(value);
        newValue = getLeastFrequentValueInArray(clonedValues);
        break;
      case "mean":
        clonedValues.push(value);
        newValue = getMedianValueInArray(clonedValues);
        break;
      case "meanForTime":
        clonedValues.push({ v: value, t: new Date() });
        const days1 = parseFloat(defaultElement.templateMethodTime);
        newValue = getMedianValueForTime(clonedValues, days1);
        break;
      case "numberOfEventsForTime":
        clonedValues.push({ v: value, t: new Date() });
        const days2 = parseFloat(defaultElement.templateMethodTime);
        newValue = getNumberOfEventsForTime(clonedValues, days2);
        break;
      case "summForTime":
        clonedValues.push({ v: value, t: new Date() });
        const days3 = parseFloat(defaultElement.templateMethodTime);
        newValue = getSummForTime(clonedValues, days3);
        break;
      case "meanPaymentRecency":
        clonedValues.push(value);
        newValue = getMeanPaymentRecency(clonedValues);
        break;
      default:
        clonedValues.push(value);
        newValue = value;
    }

    return { newValue, updatedValues: clonedValues };
  }
}

function getMostFrequentValueInArray(arr) {
  const frequencyMap = {};

  // Fill frequency map
  for (const value of arr) {
    if (frequencyMap[value]) {
      frequencyMap[value]++;
    } else {
      frequencyMap[value] = 1;
    }
  }

  let maxCount = 0;
  let mostFrequentValue = null;

  // Find the most frequent value
  for (const [value, count] of Object.entries(frequencyMap)) {
    if (count > maxCount) {
      maxCount = count;
      mostFrequentValue = value;
    }
  }

  return mostFrequentValue;
}
function getLeastFrequentValueInArray(arr) {
  const frequencyMap = {};

  // Fill frequency map
  for (const value of arr) {
    if (frequencyMap[value]) {
      frequencyMap[value]++;
    } else {
      frequencyMap[value] = 1;
    }
  }

  let minCount = Infinity;
  let leastFrequentValue = null;

  // Get the least frequent value
  for (const [value, count] of Object.entries(frequencyMap)) {
    if (count < minCount) {
      minCount = count;
      leastFrequentValue = value;
    }
  }

  return leastFrequentValue;
}
function getMedianValueInArray(arr) {
  function parseAndFilter(arr) {
    return arr
      .map((value) => {
        const floatValue = parseFloat(value);
        return isNaN(floatValue) ? null : floatValue;
      })
      .filter((value) => value !== null);
  }
  const parsedArr = parseAndFilter(arr);

  if (parsedArr.length === 0) {
    throw new Error("Array does not contain any valid numbers");
  }

  parsedArr.sort((a, b) => a - b);

  const mid = Math.floor(parsedArr.length / 2);

  if (parsedArr.length % 2 === 0) {
    return (parsedArr[mid - 1] + parsedArr[mid]) / 2;
  } else {
    return parsedArr[mid];
  }
}

function getMedianValueForTime(values, days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const filteredValues = values
    .filter((entry) => entry.t >= cutoffDate)
    .map((entry) => parseFloat(entry.v))
    .filter((value) => !isNaN(value));

  if (filteredValues.length === 0) return null;

  filteredValues.sort((a, b) => a - b);
  const mid = Math.floor(filteredValues.length / 2);

  return filteredValues.length % 2 === 0
    ? (filteredValues[mid - 1] + filteredValues[mid]) / 2
    : filteredValues[mid];
}
function getNumberOfEventsForTime(values, days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return values.filter((entry) => entry.t >= cutoffDate).length;
}
function getSummForTime(values, days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return values
    .filter((entry) => entry.t >= cutoffDate)
    .map((entry) => parseFloat(entry.v))
    .filter((value) => !isNaN(value))
    .reduce((sum, value) => sum + value, 0);
}
function getMeanPaymentRecency(dateStrings) {
  // Convert to objects of Date
  const dates = dateStrings.map((dateStr) => new Date(dateStr));

  if (dates.length === 1) {
    return 0;
  }

  // Sort
  dates.sort((a, b) => a - b);

  // Get differences
  const differences = [];
  for (let i = 1; i < dates.length; i++) {
    const diffInMs = dates[i] - dates[i - 1];
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    differences.push(diffInDays);
  }

  // Get median
  if (differences.length === 0) return 0; // If none, return 0

  differences.sort((a, b) => a - b);
  const mid = Math.floor(differences.length / 2);

  const median =
    differences.length % 2 !== 0
      ? differences[mid]
      : (differences[mid - 1] + differences[mid]) / 2;

  return parseFloat(median.toFixed(2));
}
