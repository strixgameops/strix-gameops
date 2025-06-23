import { v4 as uuid } from "uuid";
import mongoose from "mongoose";
import { AnalyticsEvents } from "../../../models/analyticsevents.js";

import dotenv from "dotenv";
dotenv.config();

export class AnalyticsService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }

  async initialize() {
    if (this.initialized) return;

    this.utilityService = this.moduleContainer.get("utility");
    this.metricsService = this.moduleContainer.get("metrics");
    this.queueService = this.moduleContainer.get("queue");
    this.cacherService = this.moduleContainer.get("cacher");
    this.warehouseService = this.moduleContainer.get("warehouse");
    this.databaseTablesService = this.moduleContainer.get("databaseTables");
    this.databaseService = this.moduleContainer.get("database");
    
    this.initialized = true;
    console.log("AnalyticsService initialized");
  }
  async processEvent(eventHeaders, gameID, payload) {

    /// Processing all payload events and only answer to the last one.
    for (let [index, event] of payload.entries()) {
      if (event) {
        this.queueService.sendQueueMessage(
          process.env.PULSAR_PATH_ANALYTICS + "events",
          {
            eventHeaders: eventHeaders,
            event: event,
          },
          eventHeaders.clientID
        );
        this.cacherService.LIFOpushAnalyticsEvent(
          eventHeaders.gameID,
          eventHeaders.build,
          eventHeaders,
          event
        );

        this.metricsService.recordEventAcquired(gameID, event.type);
        this.metricsService.recordEventAcquiredSize(
          gameID,
          event.type,
          {
            eventHeaders: eventHeaders,
            event: event,
          }
        );
      }
    }
    return { success: true, code: 200, message: null };
  }

  async processEventStream(eventHeaders, event) {
    let isCustom = false;
    let entityNodeID = null;
    const uniqueID = uuid();
    event.id = uniqueID;

    this.utilityService.log("Got event", event);
    switch (event.type) {
      case "newSession":
        await this.managePlayerNewSessionPW(
          eventHeaders,
          event.id,
          eventHeaders.environment
        );
        break;

      case "endSession":
        await this.processEndSessionEvent(
          event,
          eventHeaders,
          eventHeaders.environment
        );
        break;

      case "offerEvent":
        entityNodeID = await this.cacherService.getCachedCurrencyEntityByID(
          eventHeaders.gameID,
          eventHeaders.branch,
          event.actions.currency
        );
        if (entityNodeID) {
          event.actions.currency = entityNodeID;
        }

        await this.processBuyOfferEvent(
          eventHeaders.gameID,
          eventHeaders.branch,
          eventHeaders.environment,
          eventHeaders.clientID,
          event
        );
        break;

      case "offerShown":
        entityNodeID = await this.cacherService.getCachedCurrencyEntityByID(
          eventHeaders.gameID,
          eventHeaders.branch,
          event.actions.currency
        );
        if (entityNodeID) {
          event.actions.currency = entityNodeID;
        }
        break;

      case "economyEvent":
        entityNodeID = await this.cacherService.getCachedCurrencyEntityByID(
          eventHeaders.gameID,
          eventHeaders.branch,
          event.actions.currencyID
        );
        if (entityNodeID) {
          event.actions.currencyID = entityNodeID;
        }
        await this.processEconomyEvent(
          eventHeaders.gameID,
          eventHeaders.branch,
          eventHeaders.environment,
          eventHeaders.clientID,
          event
        );
        break;

      default:
        isCustom = true;
        break;
    }

    await this.processEventWithCustomData(
      event,
      eventHeaders.gameID,
      eventHeaders.branch,
      eventHeaders.environment,
      eventHeaders.clientID
    );

    // Put the event into queue
    let cachedEvent = {};
    if (isCustom) {
      cachedEvent = await this.cacherService.getCachedAnalyticEvent(
        eventHeaders.gameID,
        eventHeaders.branch,
        event.type
      );
    }
    await this.queueService.streamEvent(
      { ...event, type: isCustom ? cachedEvent.eventID : event.type },
      eventHeaders,
      eventHeaders.clientIP
    );
  }

  async managePlayerNewSessionPW(eventHeaders, eventUniqueID, environment) {
    try {
      const gameID = eventHeaders.gameID;
      const build = eventHeaders.branch;
      const device = eventHeaders.clientID;
      const country = eventHeaders.country;

      const operationsNum = 5;
      for (let i = 0; i < operationsNum; i++) {
        const alreadyDone = await this.cacherService.getEventProcessedStage(
          gameID,
          build,
          eventUniqueID,
          "newSession_pwPopulation"
        );

        if (parseInt(alreadyDone) > i) {
          continue;
        }

        await this.cacherService.setEventProcessedStage(
          gameID,
          build,
          eventUniqueID,
          "newSession_pwPopulation",
          i
        );
        switch (i) {
          case 0:
            await this.warehouseService.setPlayerLastReturnDate(
              gameID,
              build,
              environment,
              device,
              new Date()
            );
            break;
          case 1:
            if (country && country !== "Unknown") {
              await this.warehouseService.setValueToAnalyticElement(
                gameID,
                build,
                environment,
                device,
                "country",
                country
              );
            }
            break;
          case 2:
            await this.warehouseService.setValueToAnalyticElement(
              gameID,
              build,
              environment,
              device,
              "platform",
              eventHeaders.platform
            );
            break;
          case 3:
            await this.warehouseService.setValueToAnalyticElement(
              gameID,
              build,
              environment,
              device,
              "engineVersion",
              eventHeaders.engineVersion
            );
            break;
          case 4:
            await this.warehouseService.setValueToAnalyticElement(
              gameID,
              build,
              environment,
              device,
              "gameVersion",
              eventHeaders.gameVersion
            );
            break;
          case 5:
            await this.warehouseService.setValueToAnalyticElement(
              gameID,
              build,
              environment,
              device,
              "language",
              eventHeaders.language
            );
            break;
          default:
            break;
        }
      }

      await this.cacherService.setEventProcessedFully(
        gameID,
        build,
        eventUniqueID
      );
    } catch (err) {
      this.metricsService.recordEventFailed(
        "new_session_event_failed",
        {
          ...eventHeaders,
          eventUniqueID: eventUniqueID,
        }
      );
      console.error(err);
    }
  }
  async processEndSessionEvent(event, eventHeaders, environment) {
    try {
      const gameID = eventHeaders.gameID;
      const build = eventHeaders.branch;
      const device = eventHeaders.clientID;
      if (event.actions.sessionLength) {
        const alreadyDone = await this.cacherService.getEventProcessedStage(
          gameID,
          build,
          event.id,
          "endSession"
        );

        if (alreadyDone) {
          return;
        }
        await this.cacherService.setEventProcessedStage(
          gameID,
          build,
          event.id,
          "endSession",
          "1"
        );

        await this.warehouseService.addValueToAnalyticElementValuesArray(
          gameID,
          build,
          environment,
          device,
          "meanSessionLength",
          event.actions.sessionLength,
          "mean"
        );

        await this.cacherService.setEventProcessedFully(
          gameID,
          build,
          event.id
        );
      } else {
        console.error(
          "processEndSessionEvent: End Session event came without sessionLength field! Data:",
          event,
          eventHeaders,
          gameID,
          build
        );
      }
    } catch (error) {
      this.metricsService.recordEventFailed(
        "end_session_event_failed",
        {
          ...eventHeaders,
          ...event,
        }
      );
      console.error("processEndSessionEvent:", error);
    }
  }

  async processBuyOfferEvent(gameID, build, environment, device, event) {
    try {
      if (!event.actions.offerID || !event.actions.price) {
        return;
      }

      const alreadyDone_paymentData =
        await this.cacherService.getEventProcessedStage(
          gameID,
          build,
          event.id,
          "offerEvent_paymentData"
        );
      const alreadyDone_snapshot =
        await this.cacherService.getEventProcessedStage(
          gameID,
          build,
          event.id,
          "offerEvent_snapshot"
        );

      if (alreadyDone_paymentData !== "1") {
        await this.warehouseService.registerOfferPaymentToPlayerData(
          gameID,
          device,
          event.actions.offerID,
          build,
          event.actions.price,
          event.actions.currency,
          environment
        );
        await this.cacherService.setEventProcessedStage(
          gameID,
          build,
          event.id,
          "offerEvent_paymentData",
          "1"
        );
      }
      if (alreadyDone_snapshot !== "1") {
        await this.makeCustomerSnapshot(
          gameID,
          device,
          build,
          environment,
          event.time,
          event.actions.offerID
        );
        await this.cacherService.setEventProcessedStage(
          gameID,
          build,
          event.id,
          "offerEvent_snapshot",
          "1"
        );
      }
      await this.cacherService.setEventProcessedFully(gameID, build, event.id);

      this.utilityService.log("New snapshot made for offer event:", event);
    } catch (error) {
      this.metricsService.recordEventFailed("offer_event_failed", {
        gameID,
        build,
        device,
        ...event,
      });
      console.error(error);
    }
  }

  async processEconomyEvent(gameID, build, environment, device, event) {
    try {
      if (
        !event.actions.currencyID ||
        !event.actions.amount ||
        !event.actions.type ||
        !event.actions.origin
      ) {
        console.error("Economy event came with invalid data:", event);
      }
      const orderID = event.actions.orderId;

      const alreadyDone_snapshot =
        await this.cacherService.getEventProcessedStage(
          gameID,
          build,
          event.id,
          "economyEvent_snapshot"
        );

      if (alreadyDone_snapshot !== "1") {
        await this.makeCustomerSnapshot(
          gameID,
          device,
          build,
          environment,
          event.time,
          `${event.actions.currencyID}|${event.actions.origin}|${event.actions.type}`,
          orderID ? orderID : null
        );
        await this.cacherService.setEventProcessedStage(
          gameID,
          build,
          event.id,
          "economyEvent_snapshot",
          "1"
        );
      }
      await this.cacherService.setEventProcessedFully(gameID, build, event.id);

      this.utilityService.log("New snapshot made for economy event ", event);
    } catch (error) {
      this.metricsService.recordEventFailed("economy_event_failed", {
        gameID,
        build,
        device,
        ...event,
      });
      console.error(error);
    }
  }

  async makeCustomerSnapshot(
    gameID,
    clientID,
    branch,
    environment,
    timestamp,
    subjectID,
    realMoneyPurchaseOrderID = null
  ) {
    this.utilityService.log(
      "Making customer snapshot",
      realMoneyPurchaseOrderID
    );
    let elements = await this.warehouseService.getPlayerElements(
      gameID,
      clientID,
      branch,
      environment
    );
    if (!elements) return;

    let newRealMoneyPaymentNumber = null; // null because we're not sure if we want to set it at all

    const promises = [];
    const table = await this.databaseTablesService.getSnapshotsTable(gameID);

    const query_RealPurchasesCount = `
  SELECT COUNT(*)
  FROM "${table.tableName}"
  WHERE 
    "gameID" = '${gameID}' AND
    "environment" = '${environment}' AND
    "branch" = '${branch}' AND
    "clientID" = '${clientID}' AND
    "realMoneyPurchaseOrderID" IS NOT NULL;
  `;
    const query_AllSnaphotsCount = `
  SELECT COUNT(*)
  FROM "${table.tableName}"
  WHERE 
    "gameID" = '${gameID}' AND
    "environment" = '${environment}' AND
    "branch" = '${branch}' AND
    "clientID" = '${clientID}';
  `;

    if (realMoneyPurchaseOrderID) {
      promises.push(this.databaseService.PGquery(query_RealPurchasesCount));
    }

    promises.push(this.databaseService.PGquery(query_AllSnaphotsCount));

    let currSnapshotsCount = 1;
    let currPaymentsCount = 1;
    if (realMoneyPurchaseOrderID) {
      [[currPaymentsCount], [currSnapshotsCount]] = await Promise.all(promises);
      currSnapshotsCount = currSnapshotsCount.count;
      currPaymentsCount = currPaymentsCount.count;
    } else {
      [[currSnapshotsCount]] = await Promise.all(promises);
      currSnapshotsCount = currSnapshotsCount.count;
    }

    if (realMoneyPurchaseOrderID) {
      if (currPaymentsCount) {
        newRealMoneyPaymentNumber = parseInt(currPaymentsCount) + 1;
      } else {
        newRealMoneyPaymentNumber = 1;
      }
    }

    let newSnapshotNumber = 1; // 1 as a fallback value if it's the first snapshot
    if (currSnapshotsCount) {
      newSnapshotNumber = parseInt(currSnapshotsCount) + 1;
    }

    let snapshot = {
      gameID: gameID,
      branch: branch,
      environment: environment,
      subject: subjectID,
      clientID: clientID,
      snapshot: elements.elements,
      snapshotNumber: newSnapshotNumber,
      realMoneyPaymentNumber: newRealMoneyPaymentNumber,
      realMoneyPurchaseOrderID: realMoneyPurchaseOrderID,
      timestamp: timestamp,
    };

    const studioID = await this.utilityService.getStudioIDByGameID(gameID);
    this.queueService.streamSnapshot(studioID, snapshot);
  }

  async processEventWithCustomData(
    event,
    gameID,
    build,
    environment,
    clientID
  ) {
    let foundEvent = await this.checkEventID(gameID, event.type, build);
    if (!foundEvent || !foundEvent.found) {
      return;
    }

    let sanitizedActions;
    let newValues = [];

    const makeNewEventValue = (value) => {
      let format;
      this.utilityService.log("makeNewEventValue:", value);

      if (
        value.value === true ||
        value.value === false ||
        value.value.toString().toLowerCase() === "true" ||
        value.value.toString().toLowerCase() === "false"
      ) {
        format = "bool";
      } else if (!isNaN(value.value) && parseFloat(value.value)) {
        format = "float";
      } else {
        format = "string";
      }

      newValues.push({
        valueFormat: format,
        valueID: value.id,
        valueName: this.utilityService.convertToTitleCase(value.id),
        uniqueID: uuid(),
      });
      return format;
    };

    try {
      if (
        (event.customData && Object.keys(event.customData).length > 0) ||
        (event.actions && Object.keys(event.actions).length > 0)
      ) {
        sanitizedActions = { ...event.actions, ...event.customData };

        Object.keys(sanitizedActions).forEach((action, i) => {
          let val = foundEvent.eventDetails.values.find(
            (v) => v.valueID === action
          );
          if (!val) {
            val = makeNewEventValue({
              value: sanitizedActions[action],
              id: action,
            });
          }
        });

        if (newValues.length > 0) {
          await this.newCustomValuesAreMet(
            gameID,
            build,
            foundEvent.eventDetails.eventID,
            newValues
          );
          foundEvent = await this.checkEventID(gameID, event.type, build);
        }
        Object.keys(sanitizedActions).forEach((action, i) => {
          let value = foundEvent.eventDetails.values.find(
            (v) => v.valueID === action
          );

          try {
            sanitizedActions[value.uniqueID] = this.transformValue(
              value.valueFormat,
              sanitizedActions[action]
            );
          } catch (err) {
            this.utilityService.log(foundEvent.values);
          }
        });
      }
    } catch (error) {
      this.metricsService.recordEventFailed(
        "custom_event_make_new_values_failed",
        {
          ...event,
          gameID,
          build,
          clientID,
          ...foundEvent,
        }
      );
      console.error(`Error transforming values from event`, event, error);
      return;
    }

    // From now on we just process this event, segmenting the user, sending event to queue and other stuff
    this.checkForTemplatesByDesignEvent(
      gameID,
      build,
      environment,
      foundEvent,
      clientID,
      sanitizedActions,
      event.id
    );
  }
  async newCustomValuesAreMet(gameID, branch, eventID, newValues) {
    try {
      const doc = await AnalyticsEvents.findOne({
        gameID: gameID,
        branch: this.utilityService.getBranchWithReferenceSuffix(branch),
        eventID: eventID,
      }).lean();

      if (!doc) {
        console.error(
          "Event wasnt found for value append:",
          gameID,
          branch,
          eventID
        );
        return;
      }

      const currentValues = doc.values || [];
      const uniqueNewValues = newValues.filter(
        (newValue) =>
          !currentValues.some((value) => value.valueID === newValue.valueID)
      );

      if (uniqueNewValues.length > 0) {
        const updatedValues = currentValues.concat(uniqueNewValues);

        await AnalyticsEvents.updateOne(
          {
            gameID: gameID,
            branch: this.utilityService.getBranchWithReferenceSuffix(branch),
            eventID: eventID,
          },
          { $set: { values: updatedValues } }
        );

        this.utilityService.log(
          "New values appended to event",
          gameID,
          branch,
          eventID
        );

        this.cacherService.removeCachedAnalyticEvent(gameID, branch, doc.eventCodeName);
      }
    } catch (error) {
      console.error(error);
    }
  }
  async checkEventID(gameID, eventCodeName, build) {
    try {
      let matchingEvent = await this.cacherService.getCachedAnalyticEvent(
        gameID,
        build,
        eventCodeName
      );

      if (!matchingEvent) {
        let newEventID = "";
        switch (eventCodeName) {
          case "economyEvent":
          case "offerEvent":
          case "offerShown":
          case "newSession":
          case "endSession":
          case "adEvent":
          case "reportEvent":
            newEventID = eventCodeName;
            break;
          default:
            newEventID = new mongoose.Types.ObjectId().toString();
            break;
        }

        const newEvent = {
          eventID: newEventID,
          eventName: this.utilityService.convertToTitleCase(eventCodeName),
          eventCodeName: eventCodeName,
          values: [],
          comment: "",
          tags: [],
        };
        matchingEvent = await AnalyticsEvents.findOneAndUpdate(
          {
            gameID: gameID,
            branch: this.utilityService.getBranchWithReferenceSuffix(build),
            eventCodeName: eventCodeName,
          },
          { $set: newEvent },
          { new: true, upsert: true }
        );
        this.utilityService.log("New event. Inserting in DB:", matchingEvent);
      }

      if (matchingEvent) {
        let eventDetails = {
          eventID: matchingEvent.eventID,
          eventCodeName: matchingEvent.eventCodeName,

          // Grabbing values
          values:
            matchingEvent.values.length > 0
              ? matchingEvent.values.map((v) => ({
                  valueID: v.valueID,
                  uniqueID: v.uniqueID,
                  format: v.valueFormat,
                }))
              : [],
        };
        return { found: true, eventDetails };
      } else {
        return { found: false, eventDetails: null };
      }
    } catch (error) {
      console.error(
        `Error fetching eventCodeName "${eventCodeName}" for branch "${build}" for game ${gameID}:`,
        error
      );
    }
  }

  // Clean up values and throw errors. Called from designEvent call.
  transformValue(valueFormat, value) {
    switch (valueFormat) {
      case "string":
        return String(value);

      case "float":
        const floatValue = parseFloat(value);
        if (isNaN(floatValue)) {
          console.error(
            `Invalid value. Expected a float, but received '${value}'`
          );
          return String(value);
        }
        return floatValue;

      case "bool":
        if (value === true || value.toLowerCase() === "true") {
          return "true";
        } else if (value === false || value.toLowerCase() === "false") {
          return "false";
        } else {
          console.error(
            `Invalid value. Expected a boolean, but received '${value}'`
          );
          return null;
        }
      default:
        return "";
    }
  }

  // After we got any designEvent, try to find corresponding template
  // in Player Warehouse, and then procceed to change it
  async checkForTemplatesByDesignEvent(
    gameID,
    branch,
    environment,
    event,
    clientID,
    sanitizedActions,
    eventUniqueID
  ) {
    try {
      const foundTemplates = await this.cacherService.getCachedAnalyticsTemplatesByEventID(
        gameID,
        branch,
        event.eventDetails.eventID
      );

      if (foundTemplates && foundTemplates.length > 0) {
        for (const foundTemplate of foundTemplates) {
          // Check if we processed this template already for this event
          const alreadyDone = await this.cacherService.getEventProcessedStage(
            gameID,
            branch,
            eventUniqueID,
            foundTemplate.templateID
          );

          if (alreadyDone === "2") {
            continue;
          }

          // Actual processing
          let correspondingEventValue = event.eventDetails.values.find(
            (v) => v.uniqueID === foundTemplate.templateEventTargetValueId
          );
          if (correspondingEventValue) {
            correspondingEventValue =
              sanitizedActions[correspondingEventValue.uniqueID];
          }
          if (!correspondingEventValue) {
            return;
          }

          await this.cacherService.setEventProcessedStage(
            gameID,
            branch,
            eventUniqueID,
            foundTemplate.templateID,
            "1"
          );

          const conditionsPassed = this.checkTemplateConditions(
            foundTemplate,
            event,
            sanitizedActions
          );

          if (conditionsPassed) {
            // Start processing newcame value if conditions are met
            switch (foundTemplate.templateMethod) {
              // Just set the value to the element
              case "mostRecent":
                this.warehouseService.setValueToAnalyticElement(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  correspondingEventValue
                );
                break;

              // Only set value once
              case "firstReceived":
                this.warehouseService.setValueToAnalyticElementFirstTimeOnly(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  correspondingEventValue
                );
                break;

              // Add the new value to the array of "values" & make up a new "value" field
              case "mostCommon":
                this.warehouseService.addValueToAnalyticElementValuesArray(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  correspondingEventValue,
                  "mostCommon"
                );
                break;

              case "leastCommon":
                this.warehouseService.addValueToAnalyticElementValuesArray(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  correspondingEventValue,
                  "leastCommon"
                );
                break;

              case "mean":
                this.warehouseService.addValueToAnalyticElementValuesArray(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  correspondingEventValue,
                  "mean"
                );
                break;

              case "meanForTime":
                this.warehouseService.addValueToAnalyticElementValuesArray(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  correspondingEventValue,
                  "meanForTime"
                );
                break;

              case "numberOfEvents":
                this.warehouseService.incrementValueInAnalyticElement(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID
                );
                break;

              case "numberOfEventsForTime":
                this.warehouseService.addValueToAnalyticElementValuesArray(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  correspondingEventValue,
                  "numberOfEventsForTime"
                );
                break;

              case "summ":
                this.warehouseService.addValueToAnalyticElement(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  correspondingEventValue
                );
                break;

              case "summForTime":
                this.warehouseService.addValueToAnalyticElementValuesArray(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  correspondingEventValue,
                  "summForTime"
                );
                break;

              case "dateOfFirst":
                this.warehouseService.setValueToAnalyticElement(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  dayjs.utc(event.time).toDate()
                );
                break;
              case "dateOfLast":
                this.warehouseService.setValueToAnalyticElement(
                  gameID,
                  branch,
                  environment,
                  clientID,
                  foundTemplate.templateID,
                  dayjs.utc(event.time).toDate()
                );
                break;

              default:
                console.warn(
                  `Unknown templateMethod: ${foundTemplate.templateMethod}`
                );
                break;
            }
          }
          await this.cacherService.setEventProcessedStage(
            gameID,
            branch,
            eventUniqueID,
            foundTemplate.templateID,
            "2"
          );
        }
        await this.cacherService.setEventProcessedFully(
          gameID,
          branch,
          eventUniqueID
        );
      }
    } catch (error) {
      this.metricsService.recordEventFailed("warehouse_failed", {
        ...event,
        ...sanitizedActions,
        eventUniqueID: eventUniqueID,
      });
      console.error(error);
    }
  }

  // Before trying to operate on player's element, check if his event passes template's conditions
  checkTemplateConditions(templateObject, eventObject, sanitizedActions) {
    let conditionPassed = true;

    templateObject.templateConditions.forEach((condition, index) => {
      if (!conditionPassed) return conditionPassed;

      if (condition.conditionEnabled) {
        let valueToCheck = sanitizedActions[condition.conditionValueID];
        let valueFormat = eventObject.eventDetails.values.find(
          (v) => v.uniqueID === condition.conditionValue
        ).format;

        let conditionalValue = condition.conditionValue;
        let conditionalSecondValue = condition.conditionSecondaryValue;
        let processedValueToCheck;

        switch (valueFormat) {
          case "string":
            stringCheck();
            break;
          case "integer":
            mathCheck();
            break;
          case "float":
            mathCheck();
            break;
          case "percentile":
            mathCheck();
            break;
          case "money":
            mathCheck();
            break;
          case "bool":
            boolCheck();
            break;
          default:
            break;
        }

        const stringCheck = () => {
          switch (condition.condition) {
            case "is":
              processedValueToCheck = valueToCheck.toString();
              conditionalValue = conditionalValue.toString();
              if (processedValueToCheck === conditionalValue) {
              } else {
                conditionPassed = false;
              }
              break;

            case "isNot":
              processedValueToCheck = valueToCheck.toString();
              conditionalValue = conditionalValue.toString();
              if (processedValueToCheck !== conditionalValue) {
              } else {
                conditionPassed = false;
              }
              break;

            default:
              break;
          }
        };

        const boolCheck = () => {
          switch (condition.condition) {
            case "is":
              processedValueToCheck = valueToCheck.toString();
              conditionalValue = conditionalValue.toString();
              if (processedValueToCheck === conditionalValue) {
              } else {
                conditionPassed = false;
              }
              break;

            default:
              break;
          }
        }

        const mathCheck = () => {
          switch (condition.condition) {
            case "=":
              processedValueToCheck = parseFloat(valueToCheck);
              conditionalValue = parseFloat(conditionalValue);
              if (conditionalValue === processedValueToCheck) {
              } else {
                conditionPassed = false;
              }
              break;

            case "!=":
              processedValueToCheck = parseFloat(valueToCheck);
              conditionalValue = parseFloat(conditionalValue);
              if (conditionalValue !== processedValueToCheck) {
              } else {
                conditionPassed = false;
              }
              break;

            case ">":
              processedValueToCheck = parseFloat(valueToCheck);
              conditionalValue = parseFloat(conditionalValue);
              if (processedValueToCheck > conditionalValue) {
              } else {
                conditionPassed = false;
              }
              break;

            case "<":
              processedValueToCheck = parseFloat(valueToCheck);
              conditionalValue = parseFloat(conditionalValue);
              if (processedValueToCheck < conditionalValue) {
              } else {
                conditionPassed = false;
              }
              break;

            case ">=":
              processedValueToCheck = parseFloat(valueToCheck);
              conditionalValue = parseFloat(conditionalValue);
              if (processedValueToCheck >= conditionalValue) {
              } else {
                conditionPassed = false;
              }
              break;

            case "<=":
              processedValueToCheck = parseFloat(valueToCheck);
              conditionalValue = parseFloat(conditionalValue);
              if (processedValueToCheck <= conditionalValue) {
              } else {
                conditionPassed = false;
              }
              break;

            case "range":
              processedValueToCheck = parseFloat(valueToCheck);
              conditionalValue = parseFloat(conditionalValue);
              if (
                processedValueToCheck >= conditionalValue &&
                processedValueToCheck <= conditionalSecondValue
              ) {
              } else {
                conditionPassed = false;
              }
              break;
            default:
              break;
          }
        }
      }
    });

    return conditionPassed;
  }
}
