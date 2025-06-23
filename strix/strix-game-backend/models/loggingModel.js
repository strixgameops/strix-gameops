import { Schema, model } from "mongoose";

const loggingSchema = new Schema({
  gameID: String,
  type: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  message: String,
});

export const Changelogs = model("changelogs", loggingSchema);
