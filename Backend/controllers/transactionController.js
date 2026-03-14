const TransactionModel = require('../models/transactions')
const logAction = require('../utils/logger')

const generateTransactionReference = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(1000 + Math.random() * 9000)
    return `TX-${timestamp}${random}`
}

const createTransaction = async (req, res) => {
    const { transactionPayload } = req.body
    const userId = req.userId

    console.log("Creating transaction with data:", { transactionPayload, userId })

    try {
        if (!transactionPayload.bookingId || !transactionPayload.packageId || !transactionPayload.amount || !transactionPayload.method || !transactionPayload.status) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        const newTransaction = await TransactionModel.create({
            bookingId: transactionPayload.bookingId,
            packageId: transactionPayload.packageId,
            userId,
            reference: generateTransactionReference(),
            amount: transactionPayload.amount,
            method: transactionPayload.method,
            status: transactionPayload.status,
        })

        logAction('TRANSACTION_CREATED', userId, {
            transactionId: newTransaction._id
        })
        res.status(201).json(newTransaction)
    } catch (error) {
        logAction('createTransactionError', userId, { error: error.message })
        res.status(500).json({ message: "Failed to create transaction", error: error.message })
    }
}

const getUserTransactions = async (req, res) => {
    const userId = req.userId
    try {
        const transactions = await TransactionModel.find({ userId }).sort({ createdAt: -1 })
        res.status(200).json(transactions)
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch transactions", error: error.message })
    }
}

const getAllTransactions = async (_req, res) => {
    try {
        const transactions = await TransactionModel.find({})
            .populate('userId', 'username')
            .populate('packageId', 'packageName')
            .sort({ createdAt: -1 });

        res.status(200).json(transactions)
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch transactions", error: error.message })
    }
}

const updateTransaction = async (req, res) => {
    const { id } = req.params
    const { status, method, amount, packageName } = req.body
    try {
        const updateFields = {
            ...(status ? { status } : {}),
            ...(method ? { method } : {}),
            ...(typeof amount === 'number' ? { amount } : {}),
            ...(packageName ? { packageName } : {})
        }
        const updatedTransaction = await TransactionModel.findByIdAndUpdate(
            id,
            updateFields,
            { new: true }
        )
        if (!updatedTransaction) {
            return res.status(404).json({ message: "Transaction not found" })
        }
        logAction('TRANSACTION_UPDATED', req.userId, {
            transactionId: id,
            status,
            method,
            amount,
            packageName
        })
        res.status(200).json(updatedTransaction)
    }
    catch (error) {
        logAction('updateTransactionError', req.userId, { error: error.message })
        res.status(500).json({ message: "Failed to update transaction", error: error.message })
    }
}

const deleteTransaction = async (req, res) => {
    const { id } = req.params

    try {
        const deletedTransaction = await TransactionModel.findByIdAndDelete(id)
        if (!deletedTransaction) {
            return res.status(404).json({ message: "Transaction not found" })
        }

        logAction('TRANSACTION_DELETED', req.userId, { transactionId: id })
        res.status(200).json({ message: "Transaction deleted successfully" })
    } catch (error) {
        logAction('deleteTransactionError', req.userId, { error: error.message })
        res.status(500).json({ message: "Failed to delete transaction", error: error.message })
    }
}

module.exports = { createTransaction, getUserTransactions, getAllTransactions, updateTransaction, deleteTransaction }