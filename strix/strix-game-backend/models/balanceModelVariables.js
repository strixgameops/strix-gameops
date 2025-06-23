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

export const BalanceModelVariables = model(
  "BalanceModelVariables",
  variableSchema,
  "balanceModelVariables"
);
