import { Schema, model } from "mongoose";

const bugsSchema = new Schema({
  clientEmail: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
  message: String,
});

export const BugReports = model("bugreports", bugsSchema);
