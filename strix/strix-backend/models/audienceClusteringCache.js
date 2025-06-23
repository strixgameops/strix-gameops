import { Schema, model } from "mongoose";

export const ClusteringCache = model("ClusteringCache", {
  gameID: String,
  branch: String,
  mainClusterUID: String,
  subClusterUID: String,
  clientIDs: [String],
  creationDate: {
    type: Date,
    default: Date.now,
  },
});
