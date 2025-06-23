import { Schema, model } from "mongoose";

const tabSchema = new Schema({
  gameID: String,
  branch: String,
  tabID: String,
  tabName: String,
});

export const BalanceModelTabs = model(
  "BalanceModelTabs",
  tabSchema,
  "balanceModelTabs"
);
