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

export const Segments = model("Segments", segmentsSchema);
