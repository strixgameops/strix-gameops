import { Schema, model } from "mongoose";
const planningTreeSubnodeSchema = new Schema({
  nodeID: {
    type: String,
    required: true,
  },
  isGameplay: Boolean,
  gameplayName: String,
  isCategory: Boolean,
  positionX: String,
  positionY: String,
  uniqueID: String,
  relations: [String],
  subnodes: [],
});

planningTreeSubnodeSchema.add({
  subnodes: [planningTreeSubnodeSchema],
});

const planningTreePlanningTypeSchema = new Schema({
  gameID: {
    type: String,
    required: true,
  },
  branch: String,
  nodes: [planningTreeSubnodeSchema],
});

planningTreePlanningTypeSchema.index({ gameID: 1, branch: 1 });

export const PlanningTreeModel = model("Planning", planningTreePlanningTypeSchema);