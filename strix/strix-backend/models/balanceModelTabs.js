import { Schema, model } from "mongoose";

const tabSchema = new Schema({
  gameID: String,
  branch: String,
  tabID: String,
  tabName: String,
});

tabSchema.index({ gameID: 1, branch: 1 });
tabSchema.index({ gameID: 1, branch: 1, tabID: 1 });

export const BalanceModelTabs = model(
  "BalanceModelTabs",
  tabSchema,
  "balanceModelTabs"
);