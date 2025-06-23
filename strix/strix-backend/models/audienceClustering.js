import { Schema, model } from "mongoose";

export const Clustering = model("Clustering", {
  gameID: String,
  branch: String,
  stage: Number,
  clusterUID: String,
  clusters: Array,
  features: Array,
  algorithm: String,
  elbowAnalysis: Array,
  silhouetteScore: Number,
  filterDate_firstJoin: [String],
  filterDate_lastJoin: [String],
  creationDate: {
    type: Date,
    default: Date.now,
  },
});
