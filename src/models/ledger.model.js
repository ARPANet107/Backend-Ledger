const mongoose = require('mongoose');

const ledgderSchema = new mongoose.Schema({
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: ["true", "Ledger must be associated with an account"],
        index: true,
        immutable: true
    },

    amount: {
        type: Number,
        required: [true, "Amount is required for ledger entry"],
        immutable: true
    },

    transaction: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "transaction",
        required: [true, "Ledger must be associated with a transaction"],
        index: true,
        immutable: true
    },

    type: {
        type: String,
        enum: {
            values: ["CREDIT", "DEBIT"],
            message: "Type can either be CREDIT or DEBIT"
        },
        required: true,
        immutable: true
    }

})

function preventLedgerModification(){
    throw new Error("Ledger entries are immutable and cannot be modified or deleted");
}

ledgderSchema.pre('findOneAndUpdate',preventLedgerModification);
ledgderSchema.pre('findOneAndReplace',preventLedgerModification);
ledgderSchema.pre('findOneAndDelete',preventLedgerModification);
ledgderSchema.pre('updateMany',preventLedgerModification);
ledgderSchema.pre('updateOne',preventLedgerModification);
ledgderSchema.pre('deleteOne',preventLedgerModification);
ledgderSchema.pre('remove',preventLedgerModification);
ledgderSchema.pre('deleteMany',preventLedgerModification);

const ledgerModel = mongoose.model('ledger',ledgderSchema);

module.exports = ledgerModel;