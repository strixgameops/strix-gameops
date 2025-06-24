import { Schema, model } from "mongoose";

const analyticsElementSchema = new Schema({
  elementID: String,
  elementValue: {},
  elementValues: {},
});

const statisticsElementSchema = new Schema({
  elementID: String,
  elementValue: {
    type: Schema.Types.Mixed,
    cast: false,
  },
});

const offerSchema = new Schema({
  offerID: String,
  purchasedTimes: Number,
  currentAmount: Number, // Inventory-like amount of this offer in user's possession. May be lowered by consuming, if IAP
  expiration: String, // Date of expiration of this offer for this user
});
const abTestsSchema = new Schema({
  testID: String,
  groupType: String,
});
const pushCampaign = new Schema({
  campaignID: String,
  lastSend: Date,
});

const playerSchema = new Schema({
  gameID: {
    type: String,
    required: true,
  },
  clientID: String,
  branch: String,
  elements: {
    analytics: [analyticsElementSchema],
    statistics: [statisticsElementSchema],
  },
  inventory: Array,
  offers: [offerSchema],
  abtests: [abTestsSchema],
  segments: [String],
  pushCampaigns: [pushCampaign],
  firstJoinDate: {
    type: Date,
    default: Date.now,
  },
  lastJoinDate: {
    type: Date,
    default: Date.now,
  },
  environment: String,
});

playerSchema.index({ gameID: 1, branch: 1 });
playerSchema.index({ gameID: 1, clientID: 1, branch: 1 });
playerSchema.index({ gameID: 1, clientID: 1 });
playerSchema.index({ "elements.analytics.elementID": 1 });
playerSchema.index({ "elements.statistics.elementID": 1 });
playerSchema.index({ firstJoinDate: 1 });
playerSchema.index({ lastJoinDate: 1 });

export const PWplayers = model("pwplayers", playerSchema);