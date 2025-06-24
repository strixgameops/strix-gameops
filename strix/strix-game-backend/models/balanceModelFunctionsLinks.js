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
entity.index({ gameID: 1, branch: 1 });
entity.index({ gameID: 1, branch: 1, linkedFunctionID: 1 });

export const BalanceModelFunctionsLinks = model(
  "BalanceModelFunctionsLinks",
  entity,
  "balanceModelFunctionsLinks"
);