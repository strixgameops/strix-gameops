import { Schema, model } from "mongoose";

const contentSchema = new Schema({
  gameID: String,
  branch: String,
  segmentID: String,
  type: String,
  data: String,
});

export const CookedContent = model("cookedcontents", contentSchema);
