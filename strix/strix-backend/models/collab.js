import { Schema, model } from "mongoose";

const collabSchema = new Schema({
  gameID: String,
  userID: String,
  branch: String,
  initialTime: Date,
  lastUpdate: Date,
  pageLink: String,
  state: String,
});

export const Collab = model("Collab", collabSchema);
