import { Schema, model } from "mongoose";

const templates = new Schema({
  gameID: String,
  branch: String,
  pricing: {
    currencies: [
      {
        code: String,
        base: Number,
      },
    ],
    regions: [
      {
        code: String,
        base: Number,
      },
    ],
  },
});

export const PricingTemplates = model("PricingTemplates", templates, "pricingtemplates");
