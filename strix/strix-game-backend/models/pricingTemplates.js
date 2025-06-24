import { Schema, model } from "mongoose";

const templates = new Schema({
  gameID: String,
  asku: String, // acts as unique ID
  name: String,
  baseValue: Number,
  regions: [
    {
      code: String,
      base: Number,
      changed: Boolean,
    },
  ],
});

templates.index({ gameID: 1 });
templates.index({ gameID: 1, asku: 1 });

export const PricingTemplates = model(
  "PricingTemplates",
  templates,
  "pricingtemplates"
);