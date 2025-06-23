import { Schema, model } from "mongoose";
const dashboardSchema = new Schema({
  id: String,
  name: String,
  linkName: String,
  charts: Array,
});
const gameSchema = new Schema({
  gameID: String,
  branch: String,

  dashboards: [dashboardSchema],
  profileCompositionPresets: String,
});

export const Charts = model("charts", gameSchema);
