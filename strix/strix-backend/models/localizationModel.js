import { Schema, model } from "mongoose";

// Schema for individual translations
const translationSchema = new Schema({
  code: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: false,
  },
});

// Schema for localization items - now normalized with type field
const localizationItemSchema = new Schema({
  gameID: {
    type: String,
    required: true,
    index: true
  },
  branch: {
    type: String,
    required: true,
    index: true
  },
  sid: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ["offers", "entities", "custom"],
    required: true,
    index: true
  },
  key: String,
  inheritedFrom: String,
  tags: [String],
  translations: [translationSchema],
});

// Create indexes for efficient queries
localizationItemSchema.index({ gameID: 1, branch: 1, type: 1 });
localizationItemSchema.index({ gameID: 1, branch: 1, sid: 1 }, { unique: true });

// Export the model
export const LocalizationItem = model(
  "LocalizationItem",
  localizationItemSchema,
  "localizationItems"
);

// Game localization metadata schema (optional - for tracking games with localization)
const gameLocalizationSchema = new Schema({
  gameID: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    required: true
  },
  tags: [String],
  prefixGroups: [String]
});

export const GameLocalizationSettings = model(
  "GameLocalizationSettings",
  gameLocalizationSchema,
  "gameLocalizationsSettings"
);