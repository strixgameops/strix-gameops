import { Schema, model } from "mongoose";

const contentSchema = new Schema({
  gameID: String,
  branch: String,
  segmentID: String,
  type: String,
  data: String,
});

contentSchema.index({ gameID: 1, branch: 1 });
contentSchema.index({ gameID: 1, branch: 1, segmentID: 1 });

export const CookedContent = model("cookedcontents", contentSchema);