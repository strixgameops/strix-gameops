import { Schema, model } from "mongoose";
const campaigns = new Schema({
  gameID: String,
  branch: String,
  id: String,
  name: String,
  status: String,
  segments: [String],
  deliveryRule: String,
  recurrence: Number,
  created: Date,
  messageTemplate: String,

  media: Object,
  collapseKey: String,
  highPriority: Boolean,
  actions: Array,
  testDevices: [String],

  lastRun: Date,

  // Stats
  messagesSent: Number,
});

export const PushCampaigns = model("pushCampaigns", campaigns);
