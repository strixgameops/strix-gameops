import { Schema, model } from 'mongoose';
export const PaymentTransactions = model('payments', {
    gameID: String,
    studioID: String,
    branch: String,
    offerID: String,
    orderID: String,
    asku: String,
    data: {},
    price: Number,
});