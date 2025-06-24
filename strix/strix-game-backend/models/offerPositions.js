import { Schema, model } from "mongoose";

const segmentedPositionSchema = new Schema({
  segmentID: String,
  offers: [String],
});

const positionSchema = new Schema({
  gameID: String,
  branch: String,
  positionID: String,
  positionName: String,
  positionCodeName: String,
  comment: String,
  segments: [segmentedPositionSchema],
});

positionSchema.index({ gameID: 1, branch: 1 });
positionSchema.index({ gameID: 1, branch: 1, positionID: 1 });

export const OffersPositionsModel = model("OffersPositionsModel", positionSchema, "offersPositions");