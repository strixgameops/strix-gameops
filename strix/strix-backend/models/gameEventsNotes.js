import { Schema, model } from "mongoose";

const gameEventsNotesSchema = new Schema({
  gameID: String,
  branch: String,
  id: String,
  date: Date,
  note: String,
});

export const GameEventsNotes = model("GameEventsNotes", gameEventsNotesSchema);
