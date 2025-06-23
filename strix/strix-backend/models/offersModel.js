import { Schema, model } from "mongoose";

const contentItems = new Schema({
  nodeID: String,
  amount: Number,
});

const offerSchema = new Schema({
  gameID: String,
  branch: String,
  offerID: {
    type: String,
    required: true
  },
  offerName: String,
  offerCodeName: String,
  offerIcon: String,

  offerInGameName: String,
  offerInGameDescription: String,

  offerTags: [String],

  offerPurchaseLimit: Number,
  offerDuration: {
    value: Number,
    timeUnit: String,
  },

  offerPrice: {
    targetCurrency: String,
    isDerivedAmount: Boolean,
    derivedAmount: String,
    amount: Number,
    nodeID: String,
    pricingTemplateAsku: String,
  },
  linkedEntities: [String],

  content: [contentItems],
  removed: Boolean,
});

export const OffersModel = model("Offers", offerSchema, "offers");
