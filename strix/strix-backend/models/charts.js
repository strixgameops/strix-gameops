import { Schema, model } from "mongoose";
const chartSchema = new Schema({
  id: String,
  chartID: String,
  name: String,
  metrics: Array,
  chartSettings: Object,
  categoryField: String,
  dimension: String,
  layoutSettings: Object,
});
const dashboardSchema = new Schema({
  id: String,
  name: String,
  linkName: String,
  charts: [chartSchema],
});
const gameSchema = new Schema({
  gameID: String,
  branch: String,

  dashboards: [dashboardSchema],
  profileCompositionPresets: String,
});

export const Charts = model("charts", gameSchema);
