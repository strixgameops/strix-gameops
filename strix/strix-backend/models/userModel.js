import { Schema, model } from "mongoose";
const tutorialSchema = new Schema({
  tutorialPage: {
    type: String,
    required: true,
  },
  newState: {
    type: String,
    required: true,
    default: "none",
  },
});
export const User = model("User", {
  username: String,
  email: String,
  password: String,
  role: String,
  isDemo: Boolean,
  avatar: String,
  tempRegistrationConfirmCode: String,
  tempEmailConfirmCode: String,
  tempPasswordConfirmCode: String,
  scheduledDeletionDate: Date,
  tutorialsWatched: [tutorialSchema],
});
