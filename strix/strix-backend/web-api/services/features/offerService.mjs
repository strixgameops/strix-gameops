import { LocalizationItem } from "../../../models/localizationModel.js";
import { OffersModel as Offers } from "../../../models/offersModel.js";
import { regions } from "../../utils/shared/regions.js";
import { ASKUModel } from "../../../models/AskuAssociations.js";
import { OffersPositionsModel } from "../../../models/offerPositions.js";
import { PricingTemplates } from "../../../models/pricingTemplates.js";

export class OfferService {
  constructor(moduleContainer) {
    this.moduleContainer = moduleContainer;
  }
  async updatePositionedOffers(
    gameID,
    branch,
    positionID,
    position,
    clientUID
  ) {
    try {
      const loggingService = this.moduleContainer.get("logging");

      const result = await OffersPositionsModel.updateOne(
        { gameID, branch, positionID },
        { $set: { ...position } },
        { upsert: true }
      );

      loggingService.logAction(
        gameID,
        "offers",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: changed positioned offers`
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  async removePositionedOffer(gameID, branch, positionID, clientUID) {
    try {
      const loggingService = this.moduleContainer.get("logging");

      const result = await OffersPositionsModel.deleteOne({
        gameID,
        branch,
        positionID,
      });

      loggingService.logAction(
        gameID,
        "offers",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: removed positioned offer`
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getOffers(gameID, branch, getRemoved = false, getIcons = true) {
    try {
      const utilityService = this.moduleContainer.get("utility");

      let offers = await Offers.find({ gameID, branch }).lean();
      if (!offers) return [];

      if (!getRemoved) {
        offers = offers.filter((o) => !o.removed);
      }

      if (getIcons) {
        offers = await Promise.all(
          offers.map(async (o) => {
            if (utilityService.isHttpsUrl(o.offerIcon)) {
              o.offerIcon = await utilityService.downloadFileFromBucketAsBase64(
                `${utilityService.getDemoGameID(gameID)}`,
                utilityService.getFileNameFromUrl(o.offerIcon)
              );
            }
            return o;
          })
        );
      }
      return offers;
    } catch (error) {
      throw error;
    }
  }

  async getAssociatedSKUs(gameID, branch) {
    try {
      const doc = await ASKUModel.findOne(
        { gameID, branch },
        { _id: 0, associations: 1 }
      ).lean();
      return doc && doc.associations ? doc.associations : [];
    } catch (error) {
      throw error;
    }
  }

  async getPositionedOffers(gameID, branch) {
    try {
      const positions = await OffersPositionsModel.find({
        gameID,
        branch,
      }).lean();
      return positions;
    } catch (error) {
      throw error;
    }
  }

  async getOffersByContentNodeID(gameID, branch, nodeID) {
    try {
      const utilityService = this.moduleContainer.get("utility");

      let offers = await Offers.aggregate([
        { $match: { gameID, branch, content: { $elemMatch: { nodeID } } } },
        {
          $project: {
            _id: 0,
            offerID: 1,
            offerName: 1,
            offerIcon: 1,
            content: 1,
          },
        },
      ]);

      if (offers.length > 0) {
        offers = await Promise.all(
          offers.map(async (o) => {
            if (utilityService.isHttpsUrl(o.offerIcon)) {
              o.offerIcon = await utilityService.downloadFileFromBucketAsBase64(
                `${utilityService.getDemoGameID(gameID)}`,
                utilityService.getFileNameFromUrl(o.offerIcon)
              );
            }
            return o;
          })
        );
      }
      return offers;
    } catch (error) {
      throw error;
    }
  }

  async getOfferByCodeName(gameID, branch, offerCodeName) {
    try {
      const offer = await Offers.findOne({
        gameID,
        branch,
        offerCodeName,
      }).lean();
      return offer;
    } catch (error) {
      throw error;
    }
  }

  async updateOfferAndPositions(gameID, branch, offerID) {
    try {
      // Mark offer as removed.
      await Offers.findOneAndUpdate(
        { gameID, branch, offerID },
        { $set: { removed: true } },
        { new: true }
      );

      // Remove the offerID from all segments in positions.
      await OffersPositionsModel.updateMany(
        { gameID, branch },
        { $pull: { "segments.$[].offers": offerID } }
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  async removeOfferLocalization(gameID, branch, offerID, clientUID) {
    try {
      const result = await LocalizationItem.deleteMany({
        gameID,
        branch,
        type: "offers",
        sid: { $in: [`${offerID}|name`, `${offerID}|desc`] },
      }).exec();
      return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
      throw error;
    }
  }

  async getOffersNames(gameID, branch) {
    try {
      const offers = await Offers.find(
        { gameID, branch },
        { _id: 0, offerID: 1, offerName: 1 }
      ).lean();
      return offers;
    } catch (error) {
      throw error;
    }
  }

  async updateOffer(gameID, branch, offerObj, clientUID) {
    try {
      const utilityService = this.moduleContainer.get("utility");
      const loggingService = this.moduleContainer.get("logging");

      offerObj.offerIcon = await utilityService.uploadFileToStudioCloud(
        gameID,
        offerObj.offerIcon
      );

      const result = await Offers.findOneAndUpdate(
        { gameID, branch, offerID: offerObj.offerID },
        { $set: { ...offerObj } },
        { new: true }
      ).exec();

      loggingService.logAction(
        gameID,
        "offers",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: updated offer | SUBJECT: ${offerObj.offerID}`
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  async updateCertainOfferField(gameID, branch, offerID, field, value) {
    try {
      await Offers.updateOne(
        { gameID, branch, offerID },
        { $set: { [field]: value } }
      );
    } catch (error) {
      console.error(error);
    }
  }

  async internal_updatePricingTableItem(gameID, branch, currencyItem) {
    try {
      function getCurrencyCountries(code) {
        let array = [];
        for (const r of Object.keys(regions)) {
          if (regions[r].currency === code) {
            array.push({ code: r, ...regions[r] });
          }
        }
        return array;
      }
      const currencyRegions = getCurrencyCountries(currencyItem.code);
      console.log("Currency regions: ", currencyRegions);

      const pricingDoc = await PricingTemplates.findOne({
        gameID,
        branch,
      }).lean();
      if (!pricingDoc) throw new Error("Pricing template not found");

      const pricingTable = pricingDoc.pricing;

      // Update or add the currency in currencies.
      const currencyIndex = pricingTable.currencies.findIndex(
        (c) => c.code === currencyItem.code
      );
      if (currencyIndex !== -1) {
        pricingTable.currencies[currencyIndex].base = currencyItem.base;
      } else {
        pricingTable.currencies.push({
          code: currencyItem.code,
          base: currencyItem.base,
        });
      }

      // Ensure regions include those for the currency.
      currencyRegions.forEach((r) => {
        if (!pricingTable.regions.some((reg) => reg.code === r.code)) {
          pricingTable.regions.push({ code: r.code, base: currencyItem.base });
        }
      });

      console.log("pricingTable.regions", pricingTable.regions);

      const updateResult = await PricingTemplates.updateOne(
        { gameID, branch },
        { $set: { pricing: pricingTable } },
        { new: true }
      );
      console.log(
        "Internally updated currency item in pricing table of game",
        gameID,
        branch,
        updateResult,
        currencyItem
      );
    } catch (error) {
      throw error;
    }
  }

  async getPricing(gameID, branch) {
    try {
      const pricingDocs = await PricingTemplates.find({
        gameID,
      }).lean();
      if (!pricingDocs) return [];
      return pricingDocs;
    } catch (error) {
      throw error;
    }
  }

  async autoFillPricing(gameID, branch, baseCurrencyCode, baseCurrencyAmount) {
    try {
      const contentCacher = this.moduleContainer.get("contentCacher");

      const result = await contentCacher.getCachedRegionPrices(
        baseCurrencyCode,
        baseCurrencyAmount
      );
      if (!result) return [];
      return result;
    } catch (error) {
      throw error;
    }
  }

  async createNewOffer(gameID, branch, offerObj, clientUID) {
    try {
      const loggingService = this.moduleContainer.get("logging");

      const result = await Offers.create({ gameID, branch, ...offerObj });

      const translationObjects = [
        {
          sid: offerObj.offerInGameName,
          key: offerObj.offerInGameName,
          translations: {
            en: "Localized name",
          },
        },
        {
          sid: offerObj.offerInGameDescription,
          key: offerObj.offerInGameDescription,
          translations: {
            en: "Localized description",
          },
        },
      ];
      const localizationService = this.moduleContainer.get("localization");

      await localizationService.updateLocalization(
        gameID,
        branch,
        "offers",
        translationObjects
      );

      loggingService.logAction(
        gameID,
        "offers",
        `CLIENT: ${clientUID} | BRANCH: ${branch} | ACTION: created new offer | SUBJECT: ${offerObj.offerID}`
      );

      return result;
    } catch (error) {
      throw error;
    }
  }
}
export default OfferService;
