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

segmentSchema.index({ gameID: 1, branch: 1 });
segmentSchema.index({ gameID: 1, branch: 1, segmentID: 1 });

export const BalanceModelSegments = model(
  "BalanceModelSegments",
  segmentSchema,
  "balanceModelSegments"
);