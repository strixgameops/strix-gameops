import { Schema, model } from "mongoose";

const contentSchema = new Schema({
  key: String,
  rawDataChecksum: Object, // Checksum of data that is used to cook the data
});

export const CookChecksums = model("cookchecksums", contentSchema);
