import { Schema, model } from "mongoose";

const entity = new Schema({
  valueSID: String,
  valueID: String,
  valueType: String,
  nodeID: String,
  inheritedFromNodeID: String,
});

const functionSchema = new Schema({
  gameID: String,
  branch: String,
  functionID: String,
  name: String,
  comment: String,
  code: String,
  linkedEntities: [entity],
  respectiveCategory: String,
});

functionSchema.index({ gameID: 1, branch: 1 });
functionSchema.index({ gameID: 1, branch: 1, functionID: 1 });

export const BalanceModelFunctions = model(
  "BalanceModelFunctions",
  functionSchema,
  "balanceModelFunctions"
);