import { Schema, model } from "mongoose";

const entity = new Schema({
  gameID: String,
  branch: String,
  linkedFunctionID: String,
  valueSID: String,
  valueID: String,
  valueType: String,
  nodeID: String,
  outputPath: String,
  inheritedFromNodeID: String,
});
export const BalanceModelFunctionsLinks = model(
  "BalanceModelFunctionsLinks",
  entity,
  "balanceModelFunctionsLinks"
);
