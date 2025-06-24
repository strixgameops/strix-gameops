import { Schema, model } from "mongoose";

const timeframeSchema = new Schema({
  key: String,
  type: String,
  relativeMode: String,
  relativeUnitCount: Number,
});

const ldbrdsSchema = new Schema({
  gameID: String,
  branch: String,
  id: String,
  name: String,
  codename: String,
  timeframes: [timeframeSchema], // Actual current state of leaderboard's players
  topLength: Number,
  segments: [String],

  startDate: String,

  alternativeCalculation: Boolean,

  aggregateElementID: String,
  additionalElementIDs: [String],
  comment: String,
});

ldbrdsSchema.index({ gameID: 1, branch: 1 });
ldbrdsSchema.index({ gameID: 1, branch: 1, id: 1 });

export const Leaderboards = model("Leaderboard", ldbrdsSchema);