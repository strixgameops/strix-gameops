import { Schema, model } from "mongoose";
const entityBasicSchema = new Schema({
  entityID: String,

  isInAppPurchase: Boolean,
  realValueBase: Number,
  isCurrency: Boolean,

  entityIcon: String,

  mainConfigs: String,
  parentCategory: String,
  inheritedCategories: [String],
  inheritedConfigs: String,
});

const entityCategorySchema = new Schema({
  categoryID: String,

  mainConfigs: String,
  parentCategory: String,
  inheritedCategories: [String],
  inheritedConfigs: String,
});

const resultNodeSchema = new Schema({
  gameID: String,
  branch: String,
  nodeID: {
    type: String,
    required: true,
  },
  name: String,
  entityCategory: entityCategorySchema,
  entityBasic: entityBasicSchema,
  removed: Boolean,
  groupName: String,
});

resultNodeSchema.index({ gameID: 1, branch: 1 });
resultNodeSchema.index({ gameID: 1, branch: 1, nodeID: 1 });

export const NodeModel = model("Node", resultNodeSchema, "nodes");