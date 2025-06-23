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

export const PricingTemplates = model(
  "PricingTemplates",
  templates,
  "pricingtemplates"
);
