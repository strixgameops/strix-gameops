import { Schema, model } from "mongoose";

const flowsSchema = new Schema({
  gameID: String,
  branch: String,
  sid: String,
  name: String,
  enabled: Boolean,
  nodes: Object,
  tags: [String],
  comment: String,
});

flowsSchema.index({ gameID: 1, branch: 1 });
flowsSchema.index({ gameID: 1, branch: 1, sid: 1 });

export const Flows = model("Flows", flowsSchema);