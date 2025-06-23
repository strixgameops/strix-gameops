import { Schema, model } from "mongoose";

const segmentSchema = new Schema({
  gameID: String,
  branch: String,
  segmentID: String,
  overrides: [
    {
      variableID: String,
      value: {},
    },
  ],
});

export const BalanceModelSegments = model(
  "BalanceModelSegments",
  segmentSchema,
  "balanceModelSegments"
);
