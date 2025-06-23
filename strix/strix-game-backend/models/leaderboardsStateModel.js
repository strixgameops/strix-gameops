import { Schema, model } from "mongoose";


const ldbrdsSchema = new Schema({
  gameID: String,
  branch: String,
  timeframeKey: String,
  lastUpdateTime: Date,
  top: Object,
});

export const LeaderboardStates = model("LeaderboardState", ldbrdsSchema);
