import { Schema, model } from "mongoose";

const clusteringCacheSchema = new Schema({
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
clusteringCacheSchema.index({ gameID: 1, branch: 1 });
clusteringCacheSchema.index({ gameID: 1, clientIDs: 1, branch: 1 });
clusteringCacheSchema.index({ gameID: 1, clientIDs: 1 });
clusteringCacheSchema.index({ gameID: 1, branch: 1, mainClusterUID: 1 });
clusteringCacheSchema.index({ gameID: 1, branch: 1, subClusterUID: 1 });
export const ClusteringCache = model("ClusteringCache", clusteringCacheSchema);
