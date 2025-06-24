import { Schema, model } from "mongoose";

const segmentsSchema = new Schema({
  gameID: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true,
  },
  segmentID: {
    type: String,
    required: true,
  },
  segmentName: String,
  segmentComment: String,
  segmentConditions: Array,
  segmentPlayerCount: Number,
  isStaticSegment: Boolean,
  usedTemplateIDs: [String],
});

segmentsSchema.index({ gameID: 1, branch: 1 });
segmentsSchema.index({ gameID: 1, branch: 1, segmentID: 1 });

export const Segments = model("Segments", segmentsSchema);