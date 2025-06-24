import { Schema, model } from "mongoose";


const ldbrdsSchema = new Schema({
  gameID: String,
  branch: String,
  timeframeKey: String,
  lastUpdateTime: Date,
  top: Object,
});

ldbrdsSchema.index({ gameID: 1, branch: 1 });

export const LeaderboardStates = model("LeaderboardState", ldbrdsSchema);