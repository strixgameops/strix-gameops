import { Schema, model } from "mongoose";

const schemaCatalog = new Schema({
  gameID: String,
  branch: String,
  timestamp: Date,
  sourceBranch: String,
  releaseNotes: String,
  deployer: String,
  tags: [String]
});

schemaCatalog.index({ gameID: 1, branch: 1 });

export const DeploymentHistory = model("DeploymentHistory", schemaCatalog);