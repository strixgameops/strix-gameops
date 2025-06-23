import { Schema, model } from "mongoose";

const deviceGroupSchema = new Schema({
  gameID: String,
  groupNumber: Number,
  clientID: String,
  token: String,
  expirationDate: Date,
  environment: String,
});

export const fcmDevices = model("fcmDevices", deviceGroupSchema);
