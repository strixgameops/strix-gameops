import { Schema, model } from "mongoose";

const askuSchema = new Schema({
  gameID: String,
  branch: String,
  associations: [
    {
      offerID: String,
      sku: String,
    },
  ],
});

export const ASKUModel = model("ASKU", askuSchema, "associatedsku");
