const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must be associated from an account"],
        index: true
    },

    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Transaction must be associated to an account"],
        index: true
    },

    status : {
        type : String,
        enum : {
            values : ["PENDING", "COMPLETED" , "FAILED" , "REVERSED"],
            message : "Status can either be PENDING , COMPLETED , FAILED OR REVERSED"
        },
        default : "PENDING"
    },

    amount : {
        type : Number,
        required : [true, "Amount is required to complete a transaction"],
        min : [0,"Transaction can not be below 0"]
    },

    idempotencyKey : {
        type : String,
        required : [true,"Idempotency Key is required for a transaction"],
        index : true,
        unique : true
    }
},{
    timestamps : true
})

const transactionModel = mongoose.model("transaction",transactionSchema);

module.exports = transactionModel;