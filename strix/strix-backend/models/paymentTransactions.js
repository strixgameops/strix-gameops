import { Schema, model } from 'mongoose';

const paymentSchema = new Schema({
    gameID: String,
    studioID: String,
    branch: String,
    offerID: String,
    orderID: String,
    asku: String,
    data: {},
    price: Number,
});

paymentSchema.index({ gameID: 1, branch: 1 });
paymentSchema.index({ gameID: 1, branch: 1, offerID: 1 });

export const PaymentTransactions = model('payments', paymentSchema);