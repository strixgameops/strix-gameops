import { Schema, model } from "mongoose";

const contentItems = new Schema({
  nodeID: String,
  amount: Number,
});

const offerSchema = new Schema({
  gameID: String,
  branch: String,
  offerID: String,
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

  offerSegments: [String],
  offerTriggers: Array,

  offerPrice: {
    targetCurrency: String,
    amount: Number,
    nodeID: String,
    moneyCurr: [
      {
        cur: String,
        amount: Number,
      },
    ],
    discount: Number,
  },

  content: [contentItems],
  removed: Boolean,
});

export const OffersModel = model("Offers", offerSchema, "offers");
