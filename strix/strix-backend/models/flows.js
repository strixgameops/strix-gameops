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

export const Flows = model("Flows", flowsSchema);
