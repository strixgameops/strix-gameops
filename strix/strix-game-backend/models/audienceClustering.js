import { Schema, model } from "mongoose";

const clusteringSchema = new Schema({
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

clusteringSchema.index({ gameID: 1, branch: 1 });
clusteringSchema.index({ gameID: 1, branch: 1, clusterUID: 1 });

export const Clustering = model("Clustering", clusteringSchema);