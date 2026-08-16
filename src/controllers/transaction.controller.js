const transactionModel = require('../models/transaction.model');
const ledgerModel = require('../models/ledger.model');
const acccountModel = require('../models/account.model');
const mongoose = require('mongoose');

const emailServices = require('../services/email.service');
const accountModel = require('../models/account.model');
/**
 * - CREATE A NEW TRANSACTION  
 */

async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    /**
     * 1. Validate request
    */
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "fromAccount,toAccount,amount and idempotencyKey are required"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount,
    })

    const toUserAccount = await accountModel.findOne({
        _id: toAccount,
    })

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({
            message: "invalid fromAccount or toAccount"
        })
    }


    /**
     * 2. Validate Idempotency Key
     * -To check if the key is valid and what is like its current state
     */

    const isTransactionAlreadyExisting = await transactionModel.findOne({
        idempotencyKey: idempotencyKey,
    })

    if (isTransactionAlreadyExisting === "COMPLETED") {
        return res.status(200).json({
            message: "Transaction already processed",
            transaction: isTransactionAlreadyExisting
        })
    }

    if (isTransactionAlreadyExisting === "PENDING") {
        return res.status(200).json({
            message: "Transaction is still processing",
        })
    }

    if (isTransactionAlreadyExisting === "FAILED") {
        return res.status(500).json({
            message: "Transaction processing failed, please retry",
        })
    }

    if (isTransactionAlreadyExisting === "REVERSED") {
        return res.status(500).json({
            message: "Transaction was reversed, please retry",
        })
    }

    /**
     * 3. Check account status
     * - They both must be in ACTIVE state or else they wont be able to send and recieve any amount
     */

    if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
        return res.status(400).json({
            message: "Both fromAccount and toAccount must be in ACTIVE state"
        })
    }

    /**
     * 4. Derive Sender's balance from ledger
     */
    const balance = await fromUserAccount.getBalance();

    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balace in fromAccount.\n Current balance is ${balance}.Requested amount is ${amount}`
        })
    }

    /**
     * 5. Create session-transaction: Session maintains the atomicity, like if a transation is supposed to be done in 4 steps, lets assume,
     * then session makes sure that all of the steps are done without any step being ignored. i.e if a single step fails, the whole transaction
     * will be rolled back.
     * -initially PENDING
     */

    let transaction;
    try {
        const session = await mongoose.startSession();
        session.startTransaction();

        transaction = await transactionModel.create([{
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            status: "PENDING"
        }], { session })[0];

        /**
         * 6. Create DEBIT ledger entry for the 'fromAccount' as the amount will supposedly be deducted from this user
         */

        const debitLedgerEntry = await ledgerModel.create([{
            account: fromAccount,
            amount: amount,
            transaction: transaction._id,
            type: "DEBIT"
        }], { session });

        /**
         * 7. Create CREDIT ledger entry for the 'toAccount' as the amount will be credit to this user
         */

        const creditLedgerEntry = await ledgerModel.create([{
            account: toAccount,
            amount: amount,
            transaction: transaction._id,
            type: "CREDIT"
        }], { session });

        /**
         * 8. Here the transaction is COMPLETED
         */

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "COMPLETED" },
            { session }
        );

        /**
         * 9. The session is committed. Hence it cant be rolled back now
         */
        await session.commitTransaction();
        session.endSession();
    } catch (error) {
        return res.status(400).json({
            message: "Transaction is PENDING due to an issue., please try after sometime"
        })
    }

    /**
     * 10. Sending the transaction email
     */
    await emailServices.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount);

    return res.status(201).json({
        message: "Transaction completed succesfully",
        transaction: transaction
    })

}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body;

    if (!toAccount || !amount || !idempotencyKey) {
        return res.status(400).json({
            message: "toAccount,amount and idempotencyKey are required"
        })
    }

    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    })

    if (!toUserAccount) {
        return res.status(400).json({
            message: "Invalid Account"
        })
    }

    const fromUserAccount = await accountModel.findOne({
        user: req.user._id
    })

    if (!fromUserAccount) {
        return res.status(400).json({
            message: "System user account not found"
        })
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    const transaction = new transactionModel({
        fromAccount: fromUserAccount._id,
        toAccount,
        amount,
        idempotencyKey,
        status: "PENDING",
    });

    const debitLedgerEntry = await ledgerModel.create([{
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT"
    }], { session });

    const creditLedgerEntry = await ledgerModel.create([{
        account: toUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT"
    }], { session });

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
        message: "Initial funds transaction completed successfully",
        transaction: transaction
    })
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction
}