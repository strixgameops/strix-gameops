import { Schema, model } from "mongoose";

const alerts = new Schema({
  gameID: String,
  branch: String,
  alertID: String,
  chartID: String, // Chart with which this alert linked to
  thresholdValue: Number,
  thresholdCondition: String, // what do we expect from value to be upon check
  observedMetricFieldName: String,
  timeWindow: Number, // minutes
  alertName: String,
  alertDescription: String,
  thresholdColor: String,
  lastUpdateDate: Date,
});

alerts.index({ gameID: 1, branch: 1 });
alerts.index({ gameID: 1, branch: 1, alertID: 1 });

export const Alerts = model("Alerts", alerts);
