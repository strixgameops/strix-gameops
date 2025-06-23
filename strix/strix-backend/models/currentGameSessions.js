import { Schema, model } from "mongoose";

const analyticsEventSchema = new Schema({
  timestamp: String,
  type: String,
  actions: Array,
});

const sessionsSchema = new Schema({
  clientID: String,
  events: [analyticsEventSchema],
  lastModifyTime: Date,
  clientIP: String,
  
  gameID: String,
  branch: String,
  sessionID: String,
  language: String,
  platform: String,
  gameVersion: String,
  engineVersion: String,
});

export const CurrentGameSessions = model("currentGameSessions", sessionsSchema);
