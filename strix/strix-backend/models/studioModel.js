import { Schema, model } from "mongoose";
const studiosSchema = new Schema({
  studioID: String,
  studioName: String,
  studioIcon: String,
  apiKey: String,
  gpcServiceAccountKey: String,
  expirationDate: Date, // Date without the grace period when the scheduled task will disable studio's functionality
  gracePeriod: {
    type: Number, // Hours
    default: 168,
  },
  scheduledDeletionDate: Date,
  games: [
    {
      gameID: String,
    },
  ],
  users: [
    {
      userID: String,
      userPermissions: [{ permission: String }],
    },
  ],
  alertSlackWebhook: String,
  alertDiscordWebhook: String,
  alertEmail: String,
});

export const Studio = model("Studio", studiosSchema);
