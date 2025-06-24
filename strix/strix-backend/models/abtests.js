import { Schema, model } from "mongoose";

const segmentsField = new Schema({
  control: String,
  test: String,
  testShare: Number,
});
const observedMetrics = new Schema({
  expectation: String,
  metric: {
    queryAnalyticEventID: String,
    queryCategoryFilters: Array,
    queryEventTargetValueId: String,
    queryMethod: String,
    queryValueFilters: Array,
  },
  cupedMetric: {
    queryAnalyticEventID: String,
    queryCategoryFilters: Array,
    queryEventTargetValueId: String,
    queryMethod: String,
    queryValueFilters: Array,
  },
  cupedState: Boolean,
  cupedDateStart: String,
  cupedDateEnd: String,
  archivedData: String,

});
const subjects = new Schema({
  changedFields: Object,
  itemID: String,
  type: String,
});
const tests = new Schema({
  gameID: String,
  branch: String,
  id: String,
  codename: String,
  name: String,
  comment: String,
  segments: segmentsField,
  observedMetric: [observedMetrics],
  subject: [subjects],
  sampleSize: Number,
  startDate: Date,
  paused: Boolean,
  archived: Boolean,
  archivedResult: String,
  removed: Boolean,
});
tests.index({ gameID: 1, branch: 1 });
tests.index({ gameID: 1, branch: 1, id: 1 });

export const ABTests = model("ABTests", tests);