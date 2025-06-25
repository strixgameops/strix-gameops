import { CookChecksums } from "../../../models/cookChecksums.js";
import { GameEvents } from "../../../models/gameEvents.js";
import { regions } from "../../utils/shared/regions.js";
import _ from "lodash";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import { BalanceModelFunctionExecutor } from "../../utils/balanceModelExecutor.mjs";

dayjs.extend(utc);

export class ContentCookingService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async cookBranchContent(gameID, sourceVersion, targetVersion, clientUID) {
    const utilityService = this.moduleContainer.get("utility");
    const loggingService = this.moduleContainer.get("logging");
    const deploymentService = this.moduleContainer.get("deployment");

    try {
      console.log("----------------COOK CONTENT----------------");
      console.log("Game ID: " + gameID);
      console.log("Source: " + sourceVersion);
      console.log("Target: " + targetVersion);

      loggingService.logAction(
        gameID,
        "cooking",
        `CLIENT: ${clientUID} | ACTION: content push is started from branch "${utilityService.getBranchWithoutSuffix(
          sourceVersion
        )}" to "${utilityService.getBranchWithoutSuffix(targetVersion)}"`
      );

      if (!process.env.IS_LOCAL_ENVIRONMENT) {
        if (utilityService.isDemoGameID(gameID)) {
          throw new Error("Demo games cannot be built");
        }
      }

      //
      // Apply everything in the source branch to the target branch
      //
      let checksums = {};
      async function pushChanges() {
        console.log("-------START MOVING DB CONTENT-------");

        const collections = deploymentService.gameCollections;
        for (const collection of collections) {
          console.log("Moving collection:", collection.type);
          let modelItems = await collection.model
            .find({
              gameID: gameID,
              branch: sourceVersion,
            })
            .lean();
          modelItems = utilityService.removeExcessiveField(modelItems);
          checksums[collection.type] =
            utilityService.calculateChecksum(modelItems);

          // Make 2 subversions for reference and working branches of version.
          // Use reference only for reading
          let modelItems_ref = JSON.parse(
            JSON.stringify(
              modelItems.map((e) => {
                e.branch = `${targetVersion}_reference`;
                return e;
              })
            )
          );
          let modelItems_work = JSON.parse(
            JSON.stringify(
              modelItems.map((e) => {
                e.branch = `${targetVersion}_working`;
                return e;
              })
            )
          );
          await collection.model.insertMany(modelItems_ref);
          await collection.model.insertMany(modelItems_work);

          console.log("Done moving collection:", collection.type);
        }
      }
      await pushChanges();
      try {
        console.log("-------START COOKING CONTENT-------");

        console.log("Cooking offers...");
        const cookedOffers = await this.cookOffers(gameID, sourceVersion);
        console.log("Offers cooked");

        console.log("Cooking positioned offers...");
        const cookedPositionedOffers = await this.cookPositionedOffers(
          gameID,
          sourceVersion
        );
        console.log("Positioned offers cooked");

        console.log("Cooking entities...");
        const cookedEntities = await this.cookEntities(gameID, sourceVersion);
        console.log("Entities cooked");

        console.log("Cooking AB tests...");
        const cookedABTests = await this.cookABTests(gameID, sourceVersion);
        console.log("AB tests cooked");

        console.log("Cooking PW templates...");
        const cookedPWTemplates = await this.cookPWTemplates(
          gameID,
          sourceVersion
        );
        console.log("PW templates cooked");

        console.log("Cooking localization...");
        const cookedLocalization = await this.cookLocalization(
          gameID,
          sourceVersion
        );
        console.log("Localization cooked");

        console.log("Cooking flows...");
        const cookedFlows = await this.cookFlows(
          gameID,
          sourceVersion,
          cookedEntities.result
        );
        console.log("Flows cooked");

        console.log("Cooking game events...");
        const cookedEvents = await this.cookEvents(gameID, sourceVersion);
        console.log("Game events cooked");

        // Check if all cooks are successful
        if (
          cookedOffers.success &&
          cookedPositionedOffers.success &&
          cookedEntities.success &&
          cookedABTests.success &&
          cookedPWTemplates.success &&
          cookedLocalization.success &&
          cookedFlows.success &&
          cookedEvents.success
        ) {
          // Make final push
          await this.pushContentToDelivery({
            gameID: gameID,
            targetVersion: targetVersion,
            cookedOffers: cookedOffers.result,
            cookedPositionedOffers: cookedPositionedOffers.result,
            cookedEntities: cookedEntities.result,
            cookedABTests: cookedABTests.result,
            cookedPWTemplates: cookedPWTemplates.result,
            cookedLocalization: cookedLocalization.result,
            cookedFlows: cookedFlows.result,
            cookedEvents: cookedEvents.result,
          });

          console.log("-------SAVING CHECKSUMS OF RAW CONTENT-------");
          await this.saveCookedChecksums(gameID, targetVersion, checksums),
            console.log("-------RAW CONTENT CHECKSUMS SAVING COMPLETE-------");
        } else {
          console.error("Successed cooking content:", cookedOffers.success);
          console.error(
            "Successed cooking positioned offers:",
            cookedPositionedOffers.success
          );
          console.error("Successed cooking entities:", cookedEntities.success);
          console.error("Successed cooking AB tests:", cookedABTests.success);
          console.error(
            "Successed cooking PW templates:",
            cookedPWTemplates.success
          );
          console.error(
            "Successed cooking localization:",
            cookedLocalization.success
          );
          console.error("Successed cooking flows:", cookedFlows.success);
          console.error("Successed cooking events:", cookedEvents.success);
          throw new Error("Failed to cook content.");
        }

        console.log("-------END COOKING CONTENT-------");
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.error("Error cooking content:", error);
      throw error;
    }
  }
  async cookEvents(gameID, branch) {
    const events = await GameEvents.find({
      gameID,
      branch: branch,
      removed: false,
      isPaused: false,
    }).lean();

    console.log("Fetched", events.length, "ongoing events");

    function convertMonthToNumber(month) {
      switch (month) {
        case "January":
          return 0;
        case "February":
          return 1;
        case "March":
          return 2;
        case "April":
          return 3;
        case "May":
          return 4;
        case "June":
          return 5;
        case "July":
          return 6;
        case "August":
          return 7;
        case "September":
          return 8;
        case "October":
          return 9;
        case "November":
          return 10;
        case "December":
          return 11;
      }
    }
    function convertNumberToDay(number) {
      switch (number) {
        case 0:
          return "Sun";
        case 1:
          return "Mon";
        case 2:
          return "Tue";
        case 3:
          return "Wed";
        case 4:
          return "Thu";
        case 5:
          return "Fri";
        case 6:
          return "Sat";
      }
    }
    function convertWeekDayToNumber(number) {
      switch (number) {
        case "Sun":
          return 0;
        case "Mon":
          return 1;
        case "Tue":
          return 2;
        case "Wed":
          return 3;
        case "Thu":
          return 4;
        case "Fri":
          return 5;
        case "Sat":
          return 6;
      }
    }

    function generateDays() {
      const daysArray = [];
      for (let i = 0; i < 30; i++) {
        const day = dayjs.utc().add(i, "day").format("YYYY-MM-DD");
        daysArray.push(day);
      }
      return daysArray;
    }

    // Array of days that we want to calculate events' occasions.
    const allDays = generateDays();
    console.log("Generated", allDays.length, "days");

    let cookedConfig = [];

    events.forEach((event) => {
      console.log("Cooking event", event.name, `(${events.id})`);
      let dates = [];
      const endDate = dayjs.utc(allDays[allDays.length - 1]); // Only account events until this date
      let currentDate = dayjs.utc(event.startingDate);
      switch (event.isRecurring) {
        case true:
          switch (event.recurEveryType) {
            case "days":
              while (currentDate <= endDate) {
                dates.push(currentDate);
                currentDate = currentDate.add(event.recurEveryN, "day");
              }
              break;
            case "weeks":
              //
              while (currentDate <= endDate) {
                // Check if the current day is one of the specified days
                if (
                  event.recurWeekly_recurOnWeekDay.includes(
                    convertNumberToDay(currentDate.day())
                  )
                ) {
                  dates.push(currentDate.clone());
                }

                // Move to the next day
                currentDate = currentDate.add(1, "day");

                // If we've completed a week cycle, jump to the next occurrence based on recurEveryN
                if (currentDate.day() === dayjs.utc(event.startingDate).day()) {
                  currentDate = currentDate.add(event.recurEveryN - 1, "week");
                }
              }
              break;
            case "months":
              while (currentDate <= endDate) {
                if (event.recurMonthly_ConfigNum === 0) {
                  // Config 0: Recur every N months on a certain day (e.g., 15th)
                  if (currentDate.date() === event.recurMonthly_recurOnDayNum) {
                    dates.push(currentDate.clone());
                    // Move to the next month occurrence
                    currentDate = currentDate.add(event.recurEveryN, "month");
                  } else {
                    // Move to the next day
                    currentDate = currentDate.add(1, "day");
                  }
                } else {
                  // Config 1: Recur every N months on the first X week day (e.g., first Monday)
                  const weekNum = event.recurMonthly_recurOnWeekNum;
                  const weekDay = convertWeekDayToNumber(
                    event.recurMonthly_recurOnWeekDay
                  );

                  // Find the first occurrence of the specified weekday in the month
                  let firstOccurrence = currentDate
                    .startOf("month")
                    .day(weekDay);
                  if (firstOccurrence.month() !== currentDate.month()) {
                    firstOccurrence = firstOccurrence.add(1, "week");
                  }

                  // Calculate the target date based on the week number
                  let targetDate = firstOccurrence.add(weekNum - 1, "week");

                  // Check if the target date is within the current month
                  if (targetDate.month() === currentDate.month()) {
                    if (currentDate.isSame(targetDate, "day")) {
                      dates.push(currentDate.clone());
                      // Move to the next month occurrence
                      currentDate = currentDate
                        .add(event.recurEveryN, "month")
                        .startOf("month");
                    } else if (currentDate.isAfter(targetDate)) {
                      // If we've passed the target date, move to the next month
                      currentDate = currentDate
                        .add(event.recurEveryN, "month")
                        .startOf("month");
                    } else {
                      // Move to the next day
                      currentDate = currentDate.add(1, "day");
                    }
                  } else {
                    // If the target date is not in this month, move to the next month
                    currentDate = currentDate.add(1, "month").startOf("month");
                  }
                }
              }
              break;
            case "years":
              while (currentDate <= endDate) {
                if (event.recurYearly_ConfigNum === 0) {
                  // Case 1: Recur every N years on X day of Y month
                  if (
                    currentDate.month() ===
                      convertMonthToNumber(event.recurYearly_recurOnMonth) &&
                    currentDate.date() === event.recurYearly_recurOnDayNum
                  ) {
                    dates.push(currentDate.clone());
                    // Move to the next year occurrence
                    currentDate = currentDate.add(event.recurEveryN, "year");
                  } else {
                    // Move to the next day
                    currentDate = currentDate.add(1, "day");
                  }
                } else {
                  // Case 2: Recur every N years on X week day of Y month
                  const weekNum = event.recurYearly_recurOnWeekNum;
                  const weekDay = convertWeekDayToNumber(
                    event.recurYearly_recurOnWeekDay
                  );
                  const month = convertMonthToNumber(
                    event.recurYearly_recurOnMonth
                  );

                  // Find the first occurrence of the specified weekday in the target month
                  let firstOccurrence = currentDate
                    .month(month)
                    .startOf("month")
                    .day(weekDay);
                  if (firstOccurrence.month() !== month) {
                    firstOccurrence = firstOccurrence.add(1, "week");
                  }

                  // Calculate the target date based on the week number
                  let targetDate = firstOccurrence.add(weekNum - 1, "week");

                  // Check if the target date is within the target month
                  if (targetDate.month() === month) {
                    if (currentDate.isSame(targetDate, "day")) {
                      dates.push(currentDate.clone());
                      // Move to the next year occurrence
                      currentDate = currentDate
                        .add(event.recurEveryN, "year")
                        .month(month)
                        .startOf("month");
                    } else if (currentDate.isAfter(targetDate)) {
                      // If we've passed the target date, move to the next year
                      currentDate = currentDate
                        .add(event.recurEveryN, "year")
                        .month(month)
                        .startOf("month");
                    } else {
                      // Move to the next day
                      currentDate = currentDate.add(1, "day");
                    }
                  } else {
                    // If the target date is not in this month, move to the next month
                    currentDate = currentDate.add(1, "month").startOf("month");
                  }
                }
              }
              break;
          }
          break;
        case false:
          dates.push(event.startingDate);
          break;
      }

      // Populating the result array
      cookedConfig.push({
        id: event.id,
        duration: event.duration,
        occasions: JSON.parse(JSON.stringify(dates)),
        segmentsWhitelist: event.segmentsWhitelist,
        segmentsBlacklist: event.segmentsBlacklist,
      });
    });

    return {
      success: true,
      result: [{ config: cookedConfig, segmentID: "everyone" }],
    };
  }
  async cookFlows(gameID, branch, cookedEntities) {
    const contentCookingServiceFull =
      this.moduleContainer.get("contentCookingFull");

    if (contentCookingServiceFull && contentCookingServiceFull.cookFlows) {
      return await contentCookingServiceFull.cookFlows(
        gameID,
        branch,
        cookedEntities
      );
    } else {
      return {
        success: true,
        result: [
          {
            segmentID: "everyone",
            config: [],
          },
        ],
      };
    }
  }
  async cookPWTemplates(gameID, branch) {
    const warehouseService = this.moduleContainer.get("warehouse");
    const config = await warehouseService.getWarehouseTemplates(gameID, branch);

    let cookedConfig = config.statistics.map((t) => {
      const ranges = {
        rangeMin: t.templateValueRangeMin,
        rangeMax: t.templateValueRangeMax,
      };

      const rangesValid =
        ranges.rangeMin &&
        ranges.rangeMin !== "" &&
        ranges.rangeMax &&
        ranges.rangeMax !== "";

      if (rangesValid) {
        return {
          id: t.templateID,
          codename: t.templateCodeName,
          type: t.templateType,
          defaultValue: t.templateDefaultValue,
          ...ranges,
        };
      } else {
        return {
          id: t.templateID,
          codename: t.templateCodeName,
          type: t.templateType,
          defaultValue: t.templateDefaultValue,
        };
      }
    });

    return {
      success: true,
      result: [{ config: cookedConfig, segmentID: "everyone" }],
    };
  }
  async cookABTests(gameID, branch) {
    const ABTestService = this.moduleContainer.get("abtest");
    const config = await ABTestService.getABTests(gameID, branch);

    if (!config?.abTests?.length || config.abTests.length === 0)
      return { success: true };

    let cookedConfig = config.abTests.map((test, i) => {
      return {
        id: test.id,
        codename: test.codename,
        segments: test.segments,
        observedMetric: test.observedMetric,
        subject: test.subject.map((s) => ({
          type: s.type,
          itemID: s.itemID,
        })),
      };
    });

    return {
      success: true,
      result: [{ config: cookedConfig, segmentID: "everyone" }],
    };
  }
  async cookOffers(gameID, branch) {
    const contentCookingServiceFull =
      this.moduleContainer.get("contentCookingFull");

    if (contentCookingServiceFull && contentCookingServiceFull.cookOffers) {
      return await contentCookingServiceFull.cookOffers(gameID, branch);
    }

    const balanceModelService = this.moduleContainer.get("balanceModel");
    const localizationService = this.moduleContainer.get("localization");
    const offersService = this.moduleContainer.get("offer");
    const ABTestService = this.moduleContainer.get("abtest");
    const nodeService = this.moduleContainer.get("node");
    const gameEventsService = this.moduleContainer.get("gameEvent");
    const utilityService = this.moduleContainer.get("utility");

    const localizationTable = await localizationService.getLocalization(
      gameID,
      branch,
      "offers"
    );
    const pricingTemplates = await offersService.getPricing(gameID, branch);
    const gameEvents = await gameEventsService.getGameEvents(
      gameID,
      branch,
      false
    );
    const entities = await nodeService.getPlanningNodes(
      gameID,
      branch,
      "entity"
    );
    let config = await offersService.getOffers(gameID, branch);
    config = JSON.parse(JSON.stringify(config));

    let abtests = await ABTestService.getABTests(gameID, branch);
    abtests = JSON.parse(JSON.stringify(abtests));

    let gameModelBalance = await balanceModelService.getBalanceModel(
      gameID,
      branch,
      ["links", "segments"]
    );

    // Initialize model functions worker so we can evaluate written code by developers
    const BalanceFunctionWorker = new BalanceModelFunctionExecutor(
      this.moduleContainer,
      {
        gameID: gameID,
        branch: branch,
      }
    );
    await BalanceFunctionWorker.initialize();

    // Before we process any offers, we need to make copies of the ones that are in AB tests
    if (abtests.success && abtests.abTests && abtests.abTests.length > 0) {
      let tests = abtests.abTests;
      tests = tests.filter((t) => {
        if (t.archived === true) return false;
        if (!Boolean(t.startDate)) return false;
        if (t.paused === true) return false;
        return true;
      });

      if (tests.length > 0) {
        const additiveOffers = tests.flatMap((test) => {
          if (!test.subject || !Array.isArray(test.subject)) return [];

          return test.subject
            .map((subject) => {
              const testedOffer = config.find(
                (o) => o.offerID === subject.itemID
              );
              if (!testedOffer) return null;

              const newOffer = { ...testedOffer };

              if (subject.changedFields?.icon) {
                newOffer.offerIcon = subject.changedFields.icon;
              }
              if (subject.changedFields?.content) {
                newOffer.content = subject.changedFields.content;
              }
              if (subject.changedFields?.price) {
                newOffer.offerPrice = subject.changedFields.price;
              }

              newOffer.offerID = testedOffer.offerID + "|" + test.id;
              return newOffer;
            })
            .filter(Boolean);
        });
        if (additiveOffers.length > 0) {
          config.push(...additiveOffers);
        }
      }
    }

    // Before we process any offers, we need to make copies of the ones that are changed by game events
    if (gameEvents.success && gameEvents.events.length > 0) {
      let events = gameEvents.events;

      let additiveOffers = [];
      events.forEach((event) => {
        if (!event.selectedOffers.length !== 0) {
          event.selectedOffers.forEach((offer) => {
            let changedOffer = config.find((o) => o.offerID === offer.offerID);
            if (changedOffer) {
              let newOffer = { ...changedOffer };

              console.log("New offer", newOffer);

              if (offer.offerIcon) {
                newOffer.offerIcon = offer.offerIcon;
              }
              if (offer.content) {
                newOffer.content = offer.content;
              }
              if (offer.offerPrice) {
                newOffer.offerPrice = offer.offerPrice;
              }

              newOffer.offerID = changedOffer.offerID + "|" + event.id;
              additiveOffers.push(newOffer);
            }
          });
        }
      });

      additiveOffers = additiveOffers.filter(Boolean);
      if (additiveOffers.length > 0) {
        config.push(...additiveOffers);
      }
    }

    let cookedConfig = config.map((offer, i) => {
      const linkedEntities = offer.linkedEntities.map((nodeID) => {
        const entity = entities.find((n) => n.nodeID === nodeID);
        if (entity) {
          if (entity.entityBasic) {
            return entity.entityBasic.entityID; // codename of entity
          }
          if (entity.entityCategory) {
            return entity.entityCategory.entityID; // codename of entity
          }
        } else {
          throw new Error(
            `Offer "${offer.offerName}" (${offer.offerCodeName}) has linked entity that does not exist anymore in Strix!`
          );
        }
      });

      // Google states "SKU must be lower case alphanumeric."
      let asku = offer.offerID.toLowerCase().replace(/[^a-zA-Z0-9]/g, "");

      return {
        id: offer.offerID,
        name: offer.offerInGameName,
        desc: offer.offerInGameDescription,
        icon: offer.offerIcon,
        codename: offer.offerCodeName,
        purchaseLimit: offer.offerPurchaseLimit,
        duration: offer.offerDuration,
        segments: offer.offerSegments,
        triggers: offer.offerTriggers,
        content: offer.content,
        pricing: offer.offerPrice,
        linkedEntities: linkedEntities,
        asku: asku,
      };
    });

    cookedConfig = JSON.parse(JSON.stringify(cookedConfig));

    const functionLinks = gameModelBalance.links;
    function tryFindFunctionLinkForValue(offerID, linkedFunctionID) {
      let result = functionLinks.find(
        (link) =>
          link.nodeID === offerID &&
          link.valueSID === `${offerID}|priceAmount` &&
          link.linkedFunctionID === linkedFunctionID
      );

      if (!result?.outputPath || result?.outputPath === "") {
        throw new Error(
          `Derived value for price of offer "${getOfferDisplayName(
            offerID
          )}" isn't configured in Model page and cannot get it's price from a derived function`
        );
      }
      if (result) return result;

      throw new Error(
        `Could not find a model function for price of offer "${getOfferDisplayName(
          offerID
        )}"`
      );
    }

    function getOfferDisplayName(offerID) {
      return config.find((o) => o.offerID === offerID).offerName;
    }

    // Giving each offer pricing
    cookedConfig = cookedConfig.map((offer, i) => {
      // Setting offer pricing
      if (offer.pricing.targetCurrency === "entity") {
        if (offer.pricing.isDerivedAmount === true) {
          const linkOnj = tryFindFunctionLinkForValue(
            offer.id,
            offer.pricing.derivedAmount // functionID
          );
          const calculated = BalanceFunctionWorker.calculateLinkedItem(
            linkOnj,
            "everyone"
          );
          if (Number.isNaN(parseInt(calculated))) {
            throw new Error(
              `Invalid number for price amount for offer "${offer.name}" (${offer.codename}). Got "${calculated}" which was "Not A Number"`
            );
          }
          offer.pricing.amount = parseInt(calculated);
        }
      } else {
        throw new Error(
          `Unrecognized target currency of offer "${offer.name}" (${offer.codename}). Got "${offer.pricing.targetCurrency}"`
        );
      }

      return offer;
    });

    // Upload offer icons to storage, if they are still base64 (should not happen)
    const promises = cookedConfig.map(async (offer, index) => {
      if (offer.icon && offer.icon !== "") {
        const generatedLink = await utilityService.uploadBase64FileToBucket(
          offer.icon,
          `${gameID}`
        );
        offer.icon = generatedLink;
      }
      return offer;
    });
    cookedConfig = await Promise.all(promises);

    // Harvesting offers that are intended to be actual IAPs for a real money purchase
    const realMoneyOffers = cookedConfig
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

        // Setting offer localization
        const oName = localizationTable.find((l) => l.sid === temp.name);
        const oDesc = localizationTable.find((l) => l.sid === temp.desc);
        if (oName) {
          temp.name = oName.translations;
        } else {
          temp.name = [];
        }

        if (oDesc) {
          temp.desc = oDesc.translations;
        } else {
          temp.desc = [];
        }
        return temp;
      });

    // Give 'isValidIAP' bool to all offers that we know are inside Google Play IAPs
    cookedConfig = cookedConfig.map((offer) => {
      offer.isValidIAP = realMoneyOffers.some((o) => o.id === offer.id);
      if (!offer.isValidIAP) {
        delete offer.asku;
      }
      return offer;
    });

    console.log("Cooked", cookedConfig.length, "offers");

    return {
      success: true,
      result: [
        {
          segmentID: "everyone",
          config: cookedConfig,
        },
      ],
    };
  }
  async cookPositionedOffers(gameID, branch) {
    const offersService = this.moduleContainer.get("offer");

    const config = await offersService.getPositionedOffers(gameID, branch);
    let cookedConfig = config.map((pos) => ({
      id: pos.positionID,
      codename: pos.positionCodeName,
      segments: pos.segments.map((s) => ({
        id: s.segmentID,
        offers: s.offers,
      })),
    }));

    return {
      success: true,
      result: [{ config: cookedConfig, segmentID: "everyone" }],
    };
  }
  async cookEntities(gameID, branch) {
    const contentCookingServiceFull =
      this.moduleContainer.get("contentCookingFull");

    if (contentCookingServiceFull && contentCookingServiceFull.cookEntities) {
      return await contentCookingServiceFull.cookEntities(gameID, branch);
    }

    const balanceModelService = this.moduleContainer.get("balanceModel");
    const nodeService = this.moduleContainer.get("node");
    let dataTree = await nodeService.getNodeTree(gameID, branch, "entity");
    dataTree = dataTree[0];
    let config = await nodeService.getPlanningNodes(gameID, branch, "entity");
    let gameModelBalance = await balanceModelService.getBalanceModel(
      gameID,
      branch,
      ["links", "segments"]
    );

    // Initialize model functions worker so we can evaluate written code by developers
    const BalanceFunctionWorker = new BalanceModelFunctionExecutor(
      this.moduleContainer,
      {
        gameID: gameID,
        branch: branch,
      }
    );
    await BalanceFunctionWorker.initialize();

    let cookedConfig = [];
    const functionLinks = gameModelBalance.links;
    function tryFindFunctionLinkForValue(
      valueID,
      nodeID,
      valueSID,
      linkedFunctionID
    ) {
      let result = functionLinks.find(
        (link) =>
          link.nodeID === nodeID &&
          link.valueSID === valueSID &&
          link.linkedFunctionID === linkedFunctionID
      );

      if (!result.outputPath || result.outputPath === "") {
        throw new Error(
          `Derived value with ID "${valueID}" of entity "${
            config.find((n) => n.nodeID === nodeID).name
          }" isn't configured in Model page and cannot get it's value from a derived function`
        );
      }
      if (result) return result;

      throw new Error(
        `Could not find a model function for value with ID "${valueID}" of entity "${
          config.find((n) => n.nodeID === nodeID).name
        }"`
      );
    }

    config.forEach((entity, i) => {
      let result = buildEntityConfig(entity);
      if (result !== null) {
        cookedConfig.push(result);
      }
    });

    function buildEntityConfig(e) {
      if (e.nodeID === "Root") {
        return null;
      }

      function findNodeInTreeByID(node, targetNodeID) {
        if (node.uniqueID === targetNodeID) {
          return node;
        }
        for (const subnode of node.Subnodes) {
          const result = findNodeInTreeByID(subnode, targetNodeID);
          if (result) {
            return result;
          }
        }
        return null;
      }

      // Isolating the values we need, and putting entityCategory/entityBasic as "specifis" fields
      // We will remove it later
      let result = {
        id: e.nodeID,
        specifics: e.entityCategory ? e.entityCategory : e.entityBasic,
      };

      // Continuing to populate values from "specific" field
      result = {
        ...result,
        isCurrency: result.specifics.isCurrency
          ? result.specifics.isCurrency
          : false,
        isInAppPurchase: result.specifics.isInAppPurchase
          ? result.specifics.isInAppPurchase
          : false,
        entityID: result.specifics.entityID
          ? result.specifics.entityID
          : result.specifics.categoryID,
        parent: result.specifics.parentCategory
          ? result.specifics.parentCategory
          : "Root",
      };

      // Merging inherited configs of the given entity with configs of it's parents
      if (Boolean(result.parent) === false || result.parent === "Root") {
        result.config =
          result.specifics.mainConfigs !== ""
            ? JSON.parse(result.specifics.mainConfigs)
            : [];
        result.inheritedCategories = []; // since we dont have any parent therefore cannot inherit
      } else {
        const overrideConfigs =
          result.specifics.inheritedConfigs !== ""
            ? JSON.parse(result.specifics.inheritedConfigs)
            : [];
        const parentCategory = result.parent;

        let inheritedConfigs = [];
        let tempInheritedCategories = [];
        const gatherInheritedConfigs = (uniqueID) => {
          // We do uniqueID search instead of nodeID in case we would want to have same multiple nodes in tree, and
          // their nodeID would be the same, but different uniqueID
          const nodeInTree = findNodeInTreeByID(dataTree, uniqueID);

          // If we couldn't find node in tree, we can't gather inherited configs, therefore we return
          if (nodeInTree === null) return;

          const nodeInData = config.find(
            (node) => node.nodeID === nodeInTree.ID
          );
          tempInheritedCategories.push(nodeInData.nodeID);
          inheritedConfigs.push({
            nodeID: nodeInData.nodeID,
            configs:
              nodeInData.entityCategory.mainConfigs !== ""
                ? JSON.parse(nodeInData.entityCategory.mainConfigs)
                : [],
            inheritedConfigs:
              nodeInData.entityCategory.inheritedConfigs !== ""
                ? JSON.parse(nodeInData.entityCategory.inheritedConfigs)
                : [],
          });

          // If the category we found has another parent category, we need to gather inherited configs from it too.
          // And do it recursively until there is no parent category (should be the root)
          if (
            nodeInData.entityCategory.parentCategory &&
            nodeInData.entityCategory.parentCategory !== ""
          ) {
            gatherInheritedConfigs(nodeInData.entityCategory.parentCategory);
          }
        };
        function findValueInConfig(configs, configSID, sid) {
          let values = configs.find((config) => config.sid === configSID);
          if (values !== undefined) {
            values = values.values;
          } else {
            return undefined;
          }
          // console.log('CONFIG: ', configs, 'Trying to find value with sid', sid, 'in values', values)
          function cycleValues(values) {
            for (let value of values) {
              // console.log('CONFIG: ', configID, 'Iterating value', value, 'to find value with sid', sid);
              if (value.sid === sid) {
                // console.log('CONFIG: ', configID, 'Found value with sid', sid, 'in value', value);
                return value.segments;
              }
              if (value.values !== undefined) {
                let result = cycleValues(value.values);
                if (result !== null) {
                  return result;
                }
              }
            }
            return null;
          }
          const result = cycleValues(values);
          return result;
        }

        function mergeSegmentValues(originalSegments, overrideSegments) {
          let originalSegments_cloned = JSON.parse(
            JSON.stringify(originalSegments)
          );
          let overrideSegments_cloned = JSON.parse(
            JSON.stringify(overrideSegments)
          );

          // Iterating over override values
          for (let segmentedValue of overrideSegments_cloned) {
            const index = originalSegments_cloned.findIndex(
              (s) => s.segmentID === segmentedValue.segmentID
            );
            if (index !== -1) {
              // If we have such segmented value, replace it with override
              originalSegments_cloned[index] = segmentedValue;
            } else {
              originalSegments_cloned.push(segmentedValue);
            }
          }
          return originalSegments_cloned;
        }

        // Here we merge original configs from nodes with their overrides from entities below,
        // so the changed values replace the original ones & we get the final overall config.
        let defConfig = [];
        function resolveInheritance(configs) {
          // Reverse, because we want to go from Root to the most specific category.
          // Going "Non-reversed" way, we would get wrong overrides, so we never want to do that.
          let reversedNodeConfigs = [...configs];
          reversedNodeConfigs.reverse();

          // console.log('Reversed node configs:', JSON.parse(JSON.stringify(reversedNodeConfigs)))

          reversedNodeConfigs.forEach((config) => {
            // Iterating through all current configs
            if (config) {
              // Checking if there is any override configs on this entity
              if (config.inheritedConfigs !== "") {
                // If any override configs are present, do the override to the original configs
                //
                // The logic behind this as we want to override only the values that are present in the original configs.
                // Otherwise we would desync both configs, as inheritedConfig would have already-non-existent values, and
                // they could be appended to the original config, which we never want to happen.
                //
                config.inheritedConfigs.forEach((overrideConfig) => {
                  if (
                    overrideConfig.configs &&
                    overrideConfig.configs.length > 0
                  ) {
                    // Iterating through all configs on this entity
                    let targetConfig = reversedNodeConfigs.find(
                      (item) => item.nodeID === overrideConfig.nodeID
                    );

                    // console.log('Target config', JSON.parse(JSON.stringify(targetConfig), 'override config', JSON.parse(JSON.stringify(overrideConfig))))

                    targetConfig.configs.map((conf) => {
                      // Iterating through all values on this config
                      conf.values = conf.values.map((value) => {
                        // console.log('CONFIG: ', conf.name, 'Iterating through value', value)
                        const overrideValueSegments = findValueInConfig(
                          overrideConfig.configs,
                          conf.sid,
                          value.sid
                        );
                        // console.log('CONFIG: ', conf.name, 'Got value from override:', overrideValueSegments)
                        if (
                          !value.values &&
                          overrideValueSegments !== null &&
                          overrideValueSegments !== undefined &&
                          overrideValueSegments.length > 0
                        ) {
                          // Merge value so that the original untouched values are kept, but the changed ones are overridden
                          value.segments = mergeSegmentValues(
                            value.segments,
                            overrideValueSegments
                          );
                        }
                        if (value.values) {
                          value.values = value.values.map((subVal) => {
                            // console.log('CONFIG: ', conf.name, 'Iterating through subvalue', subVal)
                            const overrideSubValueSegments = findValueInConfig(
                              overrideConfig.configs,
                              conf.sid,
                              subVal.sid
                            );
                            // console.log('CONFIG: ', conf.name, 'Got value from override:', overrideSubValueSegments)
                            if (
                              overrideSubValueSegments !== null &&
                              overrideSubValueSegments !== undefined &&
                              overrideSubValueSegments.length > 0
                            ) {
                              // Merge value so that the original untouched values are kept, but the changed ones are overridden
                              subVal.segments = mergeSegmentValues(
                                subVal.segments,
                                overrideSubValueSegments
                              );
                            }
                            return subVal;
                          });
                        }
                        // console.log('CONFIG: ', conf.name, 'RESULT VALUE AFTER ITERATING:', value)
                        return value;
                      });

                      // console.log('CONFIG: ', conf.name, 'RESULT CONFIG AFTER ITERATING:', conf, 'AT TARGETCONFIG:', targetConfig.configs)

                      return conf;
                    });
                    // console.log('Pre-result', JSON.parse(JSON.stringify(targetConfig.configs)))

                    let targetIndex = reversedNodeConfigs.findIndex(
                      (item) => item.nodeID === overrideConfig.nodeID
                    );
                    reversedNodeConfigs[targetIndex].configs = Object.assign(
                      reversedNodeConfigs[targetIndex].configs,
                      targetConfig.configs
                    );

                    // console.log('Result', reversedNodeConfigs[targetIndex].configs)
                  }
                });
              }
            }
          });
          let tempOverrideConfigs = [...overrideConfigs];
          if (!tempOverrideConfigs) {
            tempOverrideConfigs =
              e.specifics.inheritedConfigs !== ""
                ? JSON.parse(e.specifics.inheritedConfigs)
                : [];
          }

          defConfig = JSON.parse(JSON.stringify(reversedNodeConfigs.reverse()));

          // Now we finally apply the inheritedConfigs of this exact current entity to all parents we can
          if (tempOverrideConfigs !== "") {
            tempOverrideConfigs.forEach((overrideConfig) => {
              if (
                overrideConfig.configs !== "" &&
                overrideConfig.configs.length > 0
              ) {
                // Iterating through all configs on this entity
                let targetConfig = reversedNodeConfigs.find(
                  (item) => item.nodeID === overrideConfig.nodeID
                );

                if (targetConfig === undefined) {
                  console.log(
                    "No target config found for",
                    overrideConfig.nodeID
                  );
                  return;
                }

                targetConfig.configs.map((conf) => {
                  // Iterating through all values on this config
                  conf.values = conf.values.map((value) => {
                    // console.log('CONFIG: ', conf, conf.name, 'Iterating through value', value, overrideConfig.configs, conf.id)
                    const overrideValueSegments = findValueInConfig(
                      overrideConfig.configs,
                      conf.sid,
                      value.sid
                    );
                    // console.log('CONFIG: ', conf.name, 'Got value from override:', overrideValueSegments)
                    if (
                      !value.values &&
                      overrideValueSegments !== null &&
                      overrideValueSegments !== undefined
                    ) {
                      // Merge value so that the original untouched values are kept, but the changed ones are overridden
                      value.segments = mergeSegmentValues(
                        value.segments,
                        overrideValueSegments
                      );
                    }
                    if (value.values) {
                      value.values = value.values.map((subVal) => {
                        // console.log('CONFIG: ', conf.name, 'Iterating through subvalue', subVal)
                        const overrideSubValueSegments = findValueInConfig(
                          overrideConfig.configs,
                          conf.sid,
                          subVal.sid
                        );
                        // console.log('CONFIG: ', conf.name, 'Got value from override:', overrideSubValueSegments)
                        if (
                          overrideSubValueSegments !== null &&
                          overrideSubValueSegments !== undefined
                        ) {
                          // Merge value so that the original untouched values are kept, but the changed ones are overridden
                          subVal.segments = mergeSegmentValues(
                            subVal.segments,
                            overrideSubValueSegments
                          );
                        }
                        return subVal;
                      });
                    }
                    // console.log('CONFIG: ', conf.name, 'RESULT VALUE AFTER ITERATING:', value)
                    return value;
                  });
                  // console.log('CONFIG: ', conf.name, 'RESULT CONFIG AFTER ITERATING:', conf, 'AT TARGETCONFIG:', targetConfig.configs)

                  return conf;
                });
                // console.log('Pre-result', JSON.parse(JSON.stringify(targetConfig.configs)))

                let targetIndex = reversedNodeConfigs.findIndex(
                  (item) => item.nodeID === overrideConfig.nodeID
                );
                reversedNodeConfigs[targetIndex].configs = Object.assign(
                  reversedNodeConfigs[targetIndex].configs,
                  targetConfig.configs
                );

                // console.log('Result', reversedNodeConfigs[targetIndex].configs)
              }
            });
          }

          // console.log('Resolving inheritance:', reversedNodeConfigs)

          return reversedNodeConfigs.reverse();
        }

        gatherInheritedConfigs(parentCategory);

        result.inheritedCategories = tempInheritedCategories;
        result.config =
          result.specifics.mainConfigs !== ""
            ? JSON.parse(result.specifics.mainConfigs)
            : [];

        if (inheritedConfigs.length > 0) {
          inheritedConfigs = resolveInheritance(inheritedConfigs);

          // Making the unified config. It must be plain array containing all configs
          inheritedConfigs.forEach((i) => {
            result.config = [...result.config, ...i.configs];
          });
        }
      }

      // Changing parent ID from uniqueID to nodeID value
      if (
        result.specifics.parentCategory === "root" ||
        result.specifics.parentCategory === ""
      ) {
        // If the category of it's node is a root or empty (for some reason), do nothing
      } else {
        // If we have some meaningful category, set it's nodeID here
        result.parent = findNodeInTreeByID(
          dataTree,
          result.specifics.parentCategory
        ).ID;
      }

      delete result.specifics;
      return result;
    }

    // Checking if all entity configs has unique IDs
    cookedConfig
      .filter((e) => e.nodeID !== "Root")
      .forEach((entity) => {
        entity.config.forEach((conf) => {
          if (entity.config.filter((c) => c.id === conf.id).length > 1) {
            throw new Error(
              `Duplicate ID found for config "${conf.id}" in entity "${entity.entityID}". Make sure that all configs inside entity has unique IDs`
            );
          }
        });
      });

    // Applying balance model functions to derived values
    cookedConfig = cookedConfig.map((entity) => {
      entity.config.forEach((conf) => {
        if (!conf.values || conf.values.length === 0) return conf;
        conf.values = conf.values.map((value) => {
          if (value.values) {
            // Map value
            value.values = value.values.map((val) => {
              if (val.type.endsWith("(derived)") === false) return val;
              val.segments = val.segments.map((segment) => {
                const linkOnj = tryFindFunctionLinkForValue(
                  val.valueID,
                  entity.id,
                  val.sid,
                  segment.value
                );
                segment.value = BalanceFunctionWorker.calculateLinkedItem(
                  linkOnj,
                  "everyone"
                );
                return segment;
              });
              return val;
            });
            return value;
          } else {
            // Default values
            if (value.type.endsWith("(derived)") === false) return value;
            value.segments = value.segments.map((segment) => {
              const linkOnj = tryFindFunctionLinkForValue(
                value.valueID,
                entity.id,
                value.sid,
                segment.value
              );
              segment.value = BalanceFunctionWorker.calculateLinkedItem(
                linkOnj,
                "everyone"
              );
              return segment;
            });
            return value;
          }
        });
        return conf;
      });
      return entity;
    });

    // Making "children" field so we can track which nodes are direct children of each other
    cookedConfig.forEach((entity) => {
      if (entity.parent && entity.parent !== "") {
        const i = cookedConfig.findIndex((e) => e.nodeID === entity.parent);

        if (i !== -1) {
          if (!cookedConfig[i].children) {
            cookedConfig[i].children = [];
          }
          cookedConfig[i].children.push(entity.nodeID);
        }
      }
    });

    return {
      success: true,
      result: [
        {
          segmentID: "everyone",
          config: cookedConfig,
        },
      ],
    };
  }
  async cookLocalization(gameID, branch) {
    const localizationService = this.moduleContainer.get("localization");

    const localizationTable = await localizationService.getLocalizationTable(
      gameID,
      branch
    );
    const configEntities = localizationTable.entities
      .map((item) => {
        return {
          id: item.key,
          type: "entities",
          translations: item.translations.map((t) => ({
            code: t.code,
            value: t.value,
          })),
        };
      })
      .filter(Boolean);

    const configOffers = localizationTable.offers
      .map((item) => {
        return {
          id: item.key,
          type: "offers",
          translations: item.translations.map((t) => ({
            code: t.code,
            value: t.value,
          })),
        };
      })
      .filter(Boolean);

    const configCustom = localizationTable.custom
      .map((item) => {
        return {
          id: item.key,
          type: "custom",
          translations: item.translations.map((t) => ({
            code: t.code,
            value: t.value,
          })),
        };
      })
      .filter(Boolean);

    const cookedConfig = [].concat(configEntities, configOffers, configCustom);

    return {
      success: true,
      result: [{ config: cookedConfig, segmentID: "everyone" }],
    };
  }

  async saveCookedChecksums(gameID, branch, checksum) {
    console.log(
      "GAME ID:",
      gameID,
      " | BRANCH:",
      branch,
      " | Saving checksum",
      checksum,
      "for game"
    );
    const key = `${gameID}:${branch}`;
    await CookChecksums.findOneAndUpdate(
      { key: key },
      { rawDataChecksum: checksum },
      { upsert: true, new: true, useFindAndModify: false }
    );
  }

  async pushContentToDelivery({
    gameID,
    targetVersion,
    cookedOffers,
    cookedPositionedOffers,
    cookedEntities,
    cookedABTests,
    cookedPWTemplates,
    cookedLocalization,
    cookedFlows,
    cookedEvents,
  }) {
    const contentCacher = this.moduleContainer.get("contentCacher");

    console.log("Uploading all content to DB...");
    async function insertConfigs(type, configs) {
      if (!configs) return; // Dont insert undefined or absent config
      await Promise.all(
        configs.map(async (obj) => {
          contentCacher.insertData(
            type,
            obj.config,
            gameID,
            targetVersion,
            obj.segmentID
          );
        })
      );
    }
    insertConfigs("flows", cookedFlows);
    insertConfigs("stattemplates", cookedPWTemplates);
    insertConfigs("abtests", cookedABTests);
    insertConfigs("offers", cookedOffers);
    insertConfigs("localization", cookedLocalization);
    insertConfigs("entities", cookedEntities);
    insertConfigs("events", cookedEvents);
    insertConfigs("positionedOffers", cookedPositionedOffers);
    //
    //
    console.log("Content uploaded!");
  }
}
