import { Schema, model } from "mongoose";

const conditionSchema = new Schema({
  conditionEnabled: Boolean,
  condition: String,
  conditionValue: String,
  conditionSecondaryValue: String,
  conditionValueID: String,
});
const playerWarehouseSchema = new Schema({
  gameID: {
    type: String,
    required: true,
  },
  branch: String,

  // Statistics Templates
  templateID: String,
  templateName: String,
  templateCodeName: String,
  templateType: String, // if analytics template, the type is "analytics"
  templateDefaultValue: String,
  templateValueRangeMin: String,
  templateValueRangeMax: String,

  // Analytics Templates
  templateMethod: String,
  templateMethodTime: String,
  templateConditions: [conditionSchema],
  templateAnalyticEventID: String,
  templateEventTargetValueId: String,
  // Only for default templates
  templateDefaultVariantType: String,
});

export const PWtemplates = model("pwtemplates", playerWarehouseSchema);
