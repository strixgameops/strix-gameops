import { Schema, model } from "mongoose";

const gameEventsNotesSchema = new Schema({
  gameID: String,
  branch: String,
  id: String,
  date: Date,
  note: String,
});

gameEventsNotesSchema.index({ gameID: 1, branch: 1 });
gameEventsNotesSchema.index({ gameID: 1, branch: 1, id: 1 });

export const GameEventsNotes = model("GameEventsNotes", gameEventsNotesSchema);