import { Schema, model } from "mongoose";

const gameEventsSchema = new Schema({
  gameID: String,
  branch: String,
  id: String,
  name: String,
  //
  startingDate: Date,
  startingTime: String, // Time in 24h format. Determines when the event starts at the day of startingDate
  duration: Number, // Determines how long the event lasts, in minutes.
  isRecurring: Boolean,
  recurEveryType: String,
  recurEveryN: Number,
  recurWeekly_recurOnWeekDay: [String], // Determines the day when the event should occur.
  recurMonthly_ConfigNum: Number,
  recurMonthly_recurOnDayNum: Number, // Determines the day when the event should occur. E.g. if every 2 months, occur on day 15
  recurMonthly_recurOnWeekNum: Number, // Determines the week num. E.g. on the 3rd week day. 3rd would be the number.
  recurMonthly_recurOnWeekDay: String, // Determines the first day of month, e.g. first sunday / first sunday.
  recurYearly_ConfigNum: Number,
  recurYearly_recurOnMonth: String, // Determines the month when the event should occur. E.g. if every 2 years, occur on first april of the 3rd year
  recurYearly_recurOnDayNum: Number, // Determines the day when the event should occur. Require _recurOnMonth. E.g. if every 2 years, occur on day 15 of april on the 3rd year
  recurYearly_recurOnWeekNum: Number, // Determines the week num in alternative config. E.g. on the 3rd week day of X month. 3rd would be the number.
  recurYearly_recurOnWeekDay: String, // Determines the week day in alternative config. E.g. on the N wednesday of X month.
  chipColor: String,
  comment: String,
  isPaused: Boolean,
  selectedEntities: [String], // Just a string array of nodeIDs. All changes are within entity itself
  selectedOffers: Array, // Array of changes offers, with their respective changes.
  segmentsWhitelist: [String],
  segmentsBlacklist: [String],
  removed: Boolean, // Internal property. Do not return game event to frontend if "true". Might be useful in future, just store removed events for now
});

export const GameEvents = model("GameEvents", gameEventsSchema);
