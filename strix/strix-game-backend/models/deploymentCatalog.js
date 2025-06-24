import { Schema, model } from "mongoose";

const deploymentSchema = new Schema({
  version: String,
  audienceShare: Number,
});
const envSchema = new Schema({
  name: String,
  deployments: [deploymentSchema],
});
const schemaCatalog = new Schema({
  gameID: String,
  environments: [envSchema],
  deployRealtime: Boolean,
});

schemaCatalog.index({ gameID: 1 });

export const DeploymentCatalog = model("DeploymentCatalog", schemaCatalog);