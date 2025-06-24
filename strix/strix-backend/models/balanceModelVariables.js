import { Schema, model } from "mongoose";

const variableSchema = new Schema({
  gameID: String,
  branch: String,
  variableID: String,
  variableName: String,
  variableComment: String,
  variableType: String,
  respectiveCategory: String,
});

variableSchema.index({ gameID: 1, branch: 1 });
variableSchema.index({ gameID: 1, branch: 1, variableID: 1 });

export const BalanceModelVariables = model(
  "BalanceModelVariables",
  variableSchema,
  "balanceModelVariables"
);
