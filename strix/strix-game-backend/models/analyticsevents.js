import { Schema, model } from 'mongoose';


const valueSchema = new Schema({
  valueID: String,
  valueName: String,
  valueFormat: String,
  uniqueID: String,
  removed: Boolean,
});
const eventSchema = new Schema({
  gameID: String,
  branch: String,
  eventID: String,
  eventName: String,
  eventCodeName: String,
  removed: Boolean,
  values: [valueSchema],
  comment: String,
  tags: [String],
});
eventSchema.index({ gameID: 1, branch: 1 });
eventSchema.index({ gameID: 1, branch: 1, eventCodeName: 1 });

eventSchema.index({ gameID: 1, branch: 1, eventID: 1 });
export const AnalyticsEvents = model('AnalyticsEvents', eventSchema);

