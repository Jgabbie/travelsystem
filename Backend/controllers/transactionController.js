import TransactionModel from '../models/transactions.js'
import ArchivedTransactionModel from '../models/archivedtransactions.js'
import BookingModel from '../models/booking.js'
import PackageModel from '../models/package.js'
import VisaModel from '../models/visas.js'
import PassportModel from '../models/passport.js'
import NotificationModel from '../models/notification.js'
import UserModel from '../models/user.js'
import { setVisaSecondChance } from './visaController.js'
import { setPassportSecondChance } from './passportController.js'
import baseTransporter from '../config/nodemailer.js'
import { buildBrandedEmail } from '../utils/emailTemplate.js'
import logAction from '../utils/logger.js'
import dayjs from 'dayjs'


//custom transporter that uses the baseTransporter but modifies the subject and html to include branding
const transporter = {
    ...baseTransporter,
    sendMail: (mailOptions = {}) => {
        const subjectText = String(mailOptions.subject || '').trim()
        const derivedTitle = subjectText
            ? subjectText.replace(/^M&RC Travel and Tours\s*-\s*/i, '')
            : 'M&RC Travel and Tours'

        return baseTransporter.sendMail({
            ...mailOptions,
            html: buildBrandedEmail({
                title: derivedTitle || 'M&RC Travel and Tours',
                bodyHtml: typeof mailOptions.html === 'string' ? mailOptions.html : '',
            }),
        })
    },
}


//parse amount from string or number, removing any non-numeric characters
const parseAmount = (value) => {
    if (value == null) return 0
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
}


//generate transaction reference with timestamp and random number
const generateTransactionReference = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(1000 + Math.random() * 9000)
    return `TX-${timestamp}${random}`
}


//generate transaction invoice number based on current month and count of transactions in that month
const generateTransactionInvoiceNumber = async (date = new Date()) => {
    const invoiceDate = dayjs(date)
    const startOfMonth = invoiceDate.startOf('month').toDate()
    const endOfMonth = invoiceDate.endOf('month').toDate()

    const transactionCount = await TransactionModel.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    })

    const sequence = transactionCount + 1
    const monthKey = invoiceDate.format('MM')

    return {
        invoiceNumber: `${monthKey}${String(sequence).padStart(2, '0')}`,
        sequence,
        month: monthKey
    }
}


//get traveler count from booking
const getTravelerCount = (booking) => {
    const rawTravelers = booking?.travelers

    if (Array.isArray(rawTravelers)) {
        return Math.max(1, rawTravelers.length)
    }

    const parsed = Number(rawTravelers)
    if (Number.isFinite(parsed) && parsed > 0) {
        return parsed
    }

    const fallback = Number(booking?.bookingDetails?.travelersCount?.total)
    if (Number.isFinite(fallback) && fallback > 0) {
        return fallback
    }

    return 1
}


//decrement package slots for booking
const decrementPackageSlotsForBooking = async (booking) => {
    if (!booking?.packageId || !booking?.travelDate) return false

    const packageDoc = await PackageModel.findById(booking.packageId).select('packageSpecificDate')

    const travelerCount = getTravelerCount(booking)

    const normalizedStart = dayjs(booking.travelDate.startDate).format('YYYY-MM-DD')
    const normalizedEnd = dayjs(booking.travelDate.endDate).format('YYYY-MM-DD')

    const updateResult = await PackageModel.updateOne(
        {
            _id: booking.packageId,
            packageSpecificDate: {
                $elemMatch: {
                    startdaterange: normalizedStart,
                    enddaterange: normalizedEnd,
                    slots: { $gte: travelerCount }
                }
            }
        },
        {
            $inc: { 'packageSpecificDate.$.slots': -travelerCount }
        }
    )

    if (updateResult.modifiedCount === 1) {
        booking.slotDecremented = true
        await booking.save()
        return true
    }

    return false
}


//increment package slots for booking
const incrementPackageSlotsForBooking = async (booking) => {
    if (!booking?.packageId || !booking?.travelDate) return false

    const travelerCount = getTravelerCount(booking)

    const normalizedStart = dayjs(booking.travelDate.startDate).format('YYYY-MM-DD')
    const normalizedEnd = dayjs(booking.travelDate.endDate).format('YYYY-MM-DD')

    const updateResult = await PackageModel.updateOne(
        {
            _id: booking.packageId,
            packageSpecificDate: {
                $elemMatch: {
                    startdaterange: normalizedStart,
                    enddaterange: normalizedEnd
                }
            }
        },
        {
            $inc: { 'packageSpecificDate.$.slots': travelerCount }
        }
    )

    if (updateResult.modifiedCount === 1) {
        booking.slotDecremented = false
        await booking.save()
        return true
    }

    return false
}


//create transaction function
const createTransaction = async (req, res) => {
    const { transactionPayload } = req.body;
    const userId = req.userId;

    try {
        if (!transactionPayload) {
            return res.status(400).json({
                message: "Transaction payload is required",
            });
        }

        const amount = Number(transactionPayload.amount);

        if (
            !Number.isFinite(amount) ||
            amount <= 0 ||
            !transactionPayload.method ||
            !transactionPayload.status
        ) {
            return res.status(400).json({
                message: "Amount, method, and status are required",
            });
        }

        const items = Array.isArray(transactionPayload.items)
            ? transactionPayload.items.map((item) => ({
                quantity: Number(item.quantity),
                description: String(item.description || "").trim(),
                unitPrice: Number(item.unitPrice),
                amount: Number(item.amount),
            }))
            : [];

        const hasInvalidItem =
            items.length === 0 ||
            items.some(
                (item) =>
                    !item.description ||
                    !Number.isFinite(item.quantity) ||
                    item.quantity <= 0 ||
                    !Number.isFinite(item.unitPrice) ||
                    item.unitPrice < 0 ||
                    !Number.isFinite(item.amount) ||
                    item.amount <= 0
            );

        if (hasInvalidItem) {
            return res.status(400).json({
                message: "At least one valid transaction item is required",
            });
        }

        const calculatedAmount = items.reduce(
            (total, item) => total + item.amount,
            0
        );

        if (Math.abs(calculatedAmount - amount) > 0.01) {
            return res.status(400).json({
                message: "Transaction amount does not match the items total",
            });
        }

        const { invoiceNumber } =
            await generateTransactionInvoiceNumber();

        const transactionData = {
            userId,
            invoiceNumber,
            reference: generateTransactionReference(),
            amount,
            method: transactionPayload.method,
            status: transactionPayload.status,
            applicationType:
                transactionPayload.applicationType ||
                items[0]?.description ||
                "Manual Transaction",
            items,
            transactionDate: transactionPayload.transactionDate
                ? new Date(transactionPayload.transactionDate)
                : new Date(),
        };

        // Keep these when the transaction is related to an existing booking.
        if (transactionPayload.bookingId) {
            transactionData.bookingId = transactionPayload.bookingId;
        }

        if (transactionPayload.packageId) {
            transactionData.packageId = transactionPayload.packageId;
        }

        const newTransaction =
            await TransactionModel.create(transactionData);

        logAction("TRANSACTION_CREATED", userId, {
            "Transaction Created":
                `Transaction Reference: ${newTransaction.reference} | ` +
                `Method: ${newTransaction.method} | ` +
                `Amount: ${newTransaction.amount}`,
        });

        const io = req.app.get("io");

        if (io) {
            io.emit("transaction:created", {
                id: newTransaction._id,
                createdAt: newTransaction.createdAt,
            });
        }

        return res.status(201).json(newTransaction);
    } catch (error) {
        console.error("Create transaction error:", error);

        logAction("CREATE_TRANSACTION_ERROR", userId, {
            "Transaction Failed": `Error: ${error.message}`,
        });

        return res.status(500).json({
            message: "Failed to create transaction",
            error: error.message,
        });
    }
};


//get user transactions function
const getUserTransactions = async (req, res) => {
    const userId = req.userId
    try {
        const transactions = await TransactionModel.find({ userId }).sort({ createdAt: -1 })
            .populate('packageId', 'packageName')
        res.status(200).json(transactions)
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch transactions", error: error.message })
    }
}


//get transactions for application function
const getTransactionsForApplication = async (req, res) => {
    const userId = req.userId
    const { applicationId } = req.params
    try {
        const transactions = await TransactionModel.find({ userId, applicationId }).sort({ createdAt: -1 })
        res.status(200).json(transactions)
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch transactions", error: error.message })
    }
}


//get all transactions function
const getAllTransactions = async (_req, res) => {
    try {
        const transactions = await TransactionModel.find({})
            .populate('userId', 'username firstname lastname')
            .populate('packageId', 'packageName')
            .sort({ createdAt: -1 });

        res.status(200).json(transactions)
    } catch (error) {
        console.error('Error fetching transactions:', error)
        res.status(500).json({ message: "Failed to fetch transactions", error: error.message })
    }
}


//get transaction by ID function
const getInvoiceNumber = async (_req, res) => {
    try {
        const invoiceData = await generateTransactionInvoiceNumber()
        res.status(200).json(invoiceData)
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch invoice number', error: error.message })
    }
}


//get archived transactions function
const getArchivedTransactions = async (_req, res) => {
    try {
        const transactions = await ArchivedTransactionModel.find({})
            .populate('userId', 'username firstname lastname')
            .populate('packageId', 'packageName')
            .sort({ archivedAt: -1 });

        res.status(200).json(transactions)
    } catch (error) {
        console.error('Error fetching archived transactions:', error)
        res.status(500).json({ message: "Failed to fetch archived transactions", error: error.message })
    }
}


//update transaction function
const updateTransaction = async (req, res) => {
    const { id } = req.params
    const { status } = req.body
    try {
        const updateFields = {
            ...(status ? { status } : {}),
        }
        const updatedTransaction = await TransactionModel.findByIdAndUpdate(
            id,
            updateFields,
            { new: true }
        )
        if (!updatedTransaction) {
            return res.status(404).json({ message: "Transaction not found" })
        }

        if (updatedTransaction.method === 'Manual' && status === 'Successful') {
            const booking = updatedTransaction.bookingId
                ? await BookingModel.findById(updatedTransaction.bookingId)
                : null
            const user = await UserModel.findById(updatedTransaction.userId).select('email username')
            const bookingReference = booking?.reference || updatedTransaction.reference


            if (updatedTransaction.applicationType === 'Visa Application' && updatedTransaction.applicationId) {
                await VisaModel.findByIdAndUpdate(
                    updatedTransaction.applicationId,
                    { status: ["Payment Completed"], currentStepIndex: 1 },
                    { new: true }
                )
            }

            if (updatedTransaction.applicationType === 'Passport Application' && updatedTransaction.applicationId) {
                await PassportModel.findByIdAndUpdate(
                    updatedTransaction.applicationId,
                    { status: 'Payment Completed' },
                    { new: true }
                )
            }

            if (updatedTransaction.applicationType === 'Visa Penalty Fee' && updatedTransaction.applicationId) {
                const visaApplication = await VisaModel.findById(updatedTransaction.applicationId)
                if (visaApplication) {
                    visaApplication.onPenalty = true
                    visaApplication.reachedSecondDeadline = false
                    setVisaSecondChance(visaApplication)
                    await visaApplication.save()
                }
            }

            if (updatedTransaction.applicationType === 'Passport Penalty Fee' && updatedTransaction.applicationId) {
                const passportApplication = await PassportModel.findById(updatedTransaction.applicationId)
                if (passportApplication) {
                    passportApplication.onPenalty = true
                    passportApplication.reachedSecondDeadline = false
                    setPassportSecondChance(passportApplication)
                    await passportApplication.save()
                }
            }

            await NotificationModel.create({
                userId: updatedTransaction.userId,
                title: 'Manual Payment Approved',
                message: `Your manual payment for booking ${bookingReference} has been approved.`,
                type: 'payment',
                link: '/user-transactions',
                pushStatus: 'pending'
            })

            if (user?.email) {
                try {
                    await transporter.sendMail({
                        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                        to: user.email,
                        subject: `Manual Payment Approved - ${bookingReference}`,
                        html: `
                        <div style="font-family: Arial, sans-serif; background:#ffffff; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <p style="color:#555; font-size:16px;">Hello <b>${user.username || 'Customer'}</b>,</p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your manual payment has been approved.
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>Booking Reference:</b> ${bookingReference}
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                Thank you for choosing M&RC Travel and Tours.
                            </p>

                        </div>
                    </div>
                    `
                    })
                } catch (emailError) {
                    console.error('Failed to send manual payment approval email:', emailError)
                }
            }
        }

        if (updatedTransaction.bookingId && status === 'Successful') {
            const booking = await BookingModel.findById(updatedTransaction.bookingId)
            if (booking && !['Cancelled', 'cancellation requested'].includes(booking.status)) {
                const totalPrice = parseAmount(booking?.bookingDetails?.totalPrice)
                const paidAgg = await TransactionModel.aggregate([
                    { $match: { bookingId: booking._id, status: 'Successful' } },
                    { $group: { _id: null, totalPaid: { $sum: '$amount' } } }
                ])
                const totalPaid = paidAgg?.[0]?.totalPaid || 0

                const successfulCount = await TransactionModel.countDocuments({
                    bookingId: booking._id,
                    status: 'Successful'
                })

                const isFirstSuccessfulPayment = successfulCount === 1

                if (isFirstSuccessfulPayment && !booking.slotDecremented) {
                    const slotDecremented = await decrementPackageSlotsForBooking(booking)

                    if (!slotDecremented) {
                        console.warn('No matching date range found or no slots remaining for booking:', booking._id)
                    }
                }

                const nextStatus = totalPrice > 0 && totalPaid >= totalPrice
                    ? 'Fully Paid'
                    : 'Pending'

                if (nextStatus && nextStatus !== booking.status) {
                    booking.status = nextStatus
                    if (!Array.isArray(booking.statusHistory)) {
                        booking.statusHistory = []
                    }
                    booking.statusHistory.push({ status: nextStatus, changedAt: new Date() })
                    await booking.save()
                }
            }
        }

        if (updatedTransaction.bookingId && (status === 'Failed' || status === 'Pending')) {
            const booking = await BookingModel.findById(updatedTransaction.bookingId)
            if (booking && booking.slotDecremented) {
                const successfulCount = await TransactionModel.countDocuments({
                    bookingId: booking._id,
                    status: 'Successful'
                })

                if (successfulCount === 0) {
                    const slotIncremented = await incrementPackageSlotsForBooking(booking)
                    if (!slotIncremented) {
                        console.warn('No matching date range found for slot increment:', booking._id)
                    }
                }
            }
        }

        logAction('TRANSACTION_UPDATED', req.userId, { "Transaction Updated": `Transaction Reference: ${updatedTransaction.reference} | Method: ${updatedTransaction.method} | Amount: ${updatedTransaction.amount}` })


        res.status(200).json(updatedTransaction)
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update transaction", error: error.message })
    }
}


//delete transaction function
const deleteTransaction = async (req, res) => {
    const { id } = req.params

    try {
        const transaction = await TransactionModel.findById(id)
        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" })
        }

        await ArchivedTransactionModel.create({
            originalTransactionId: transaction._id,
            bookingId: transaction.bookingId,
            applicationId: transaction.applicationId,
            applicationType: transaction.applicationType,
            packageId: transaction.packageId,
            userId: transaction.userId,
            invoiceNumber: transaction.invoiceNumber,
            reference: transaction.reference,
            amount: transaction.amount,
            method: transaction.method,
            status: transaction.status,
            proofImage: transaction.proofImage,
            proofImageType: transaction.proofImageType,
            proofFileName: transaction.proofFileName,
            paymentType: transaction.paymentType,
            createdAt: transaction.createdAt
        })

        await TransactionModel.findByIdAndDelete(id)

        logAction('TRANSACTION_ARCHIVED', req.userId, { "Transaction Archived": `Transaction Reference: ${transaction.reference} | Method: ${transaction.method} | Amount: ${transaction.amount}` })
        res.status(200).json({ message: "Transaction archived successfully" })
    } catch (error) {
        res.status(500).json({ message: "Failed to archive transaction", error: error.message })
    }
}


//restore transaction function
const restoreArchivedTransaction = async (req, res) => {
    const { id } = req.params

    try {
        const archivedTransaction = await ArchivedTransactionModel.findById(id)
        if (!archivedTransaction) {
            return res.status(404).json({ message: 'Archived transaction not found' })
        }

        const existingTransaction = await TransactionModel.findOne({ reference: archivedTransaction.reference })
        if (existingTransaction) {
            return res.status(409).json({ message: 'Transaction with this reference already exists' })
        }

        const restoredTransaction = await TransactionModel.create({
            _id: archivedTransaction.originalTransactionId,
            bookingId: archivedTransaction.bookingId,
            applicationId: archivedTransaction.applicationId,
            applicationType: archivedTransaction.applicationType,
            packageId: archivedTransaction.packageId,
            userId: archivedTransaction.userId,
            invoiceNumber: archivedTransaction.invoiceNumber || (await generateTransactionInvoiceNumber(archivedTransaction.createdAt || new Date())).invoiceNumber,
            reference: archivedTransaction.reference,
            amount: archivedTransaction.amount,
            method: archivedTransaction.method,
            status: archivedTransaction.status,
            proofImage: archivedTransaction.proofImage,
            proofImageType: archivedTransaction.proofImageType,
            proofFileName: archivedTransaction.proofFileName,
            paymentType: archivedTransaction.paymentType,
            createdAt: archivedTransaction.createdAt
        })

        await ArchivedTransactionModel.findByIdAndDelete(id)

        logAction('TRANSACTION_RESTORED', req.userId, { "Transaction Restored": `Transaction Reference: ${restoredTransaction.reference}` })
        res.status(200).json({ message: 'Transaction restored', transaction: restoredTransaction })
    } catch (error) {
        res.status(500).json({ message: 'Failed to restore transaction', error: error.message })
    }
}


//reject transaction function
const rejectTransaction = async (req, res) => {
    const { id } = req.params
    try {
        const updatedTransaction = await TransactionModel.findByIdAndUpdate(
            id,
            { status: 'Failed' },
            { new: true }
        )
        if (!updatedTransaction) {
            return res.status(404).json({ message: "Transaction not found" })
        }

        if (updatedTransaction.method === 'Manual') {
            const booking = updatedTransaction.bookingId
                ? await BookingModel.findById(updatedTransaction.bookingId)
                : null
            const user = await UserModel.findById(updatedTransaction.userId).select('email username')
            const bookingReference = booking?.reference || updatedTransaction.reference

            await NotificationModel.create({
                userId: updatedTransaction.userId,
                title: 'Manual Payment Rejected',
                message: `Your manual payment for booking ${bookingReference} was rejected.`,
                type: 'payment',
                link: '/user-transactions',
                pushStatus: 'pending'
            })

            if (user?.email) {
                try {
                    await transporter.sendMail({
                        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                        to: user.email,
                        subject: `Manual Payment Rejected - ${bookingReference}`,
                        html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#b91c1c; margin-bottom:10px;">Manual Payment Rejected</h2>

                            <p style="color:#555; font-size:16px;">Hello <b>${user.username || 'Customer'}</b>,</p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your manual payment has been rejected. Please contact support or submit a new proof of payment.
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>Booking Reference:</b> ${bookingReference}
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you have questions, please contact support.
                            </p>

                            <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                            <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                                <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                                <p>M&RC Travel and Tours</p>
                                <p>info1@mrctravels.com</p>
                                <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                            </div>

                        </div>
                    </div>
                    `
                    })
                } catch (emailError) {
                    console.error('Failed to send manual payment rejection email:', emailError)
                }
            }
        }

        if (updatedTransaction.bookingId) {
            const booking = await BookingModel.findById(updatedTransaction.bookingId)
            if (booking && booking.slotDecremented) {
                const successfulCount = await TransactionModel.countDocuments({
                    bookingId: booking._id,
                    status: 'Successful'
                })

                if (successfulCount === 0) {
                    const slotIncremented = await incrementPackageSlotsForBooking(booking)
                    if (!slotIncremented) {
                        console.warn('No matching date range found for slot increment:', booking._id)
                    }
                }
            }
        }

        logAction('TRANSACTION_UPDATED', req.userId, { "Transaction Updated": `Transaction Reference: ${updatedTransaction.reference} | Method: ${updatedTransaction.method} | Amount: ${updatedTransaction.amount}` })
        res.status(200).json(updatedTransaction)
    } catch (error) {
        res.status(500).json({ message: "Failed to reject transaction", error: error.message })
    }
}

export {
    createTransaction,
    getUserTransactions,
    getTransactionsForApplication,
    getAllTransactions,
    getInvoiceNumber,
    getArchivedTransactions,
    updateTransaction,
    deleteTransaction,
    restoreArchivedTransaction,
    rejectTransaction
};
