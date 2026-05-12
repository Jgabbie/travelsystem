
const crypto = require('crypto');
const transporter = require('../config/nodemailer')
const dayjs = require('dayjs');
const TokenCheckoutModel = require("../models/tokencheckout");
const TokenCheckoutPassportModel = require("../models/tokencheckoutpassport");
const TokenCheckoutVisaModel = require("../models/tokencheckoutvisa");
const PackageModel = require("../models/package");
const BookingModel = require("../models/booking");
const TransactionModel = require("../models/transactions");
const UserModel = require("../models/user");
const NotificationModel = require("../models/notification");
const PassportModel = require("../models/passport");
const VisaModel = require("../models/visas");
const QuotationModel = require("../models/quotations")
const logAction = require('../utils/logger')
const apiFetch = require('../config/fetchConfig');
const axios = require('axios');


const parseAmount = (value) => {
    if (value == null) return 0;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePaymongoAmount = (grossAmount) => {
    const amount = parseAmount(grossAmount);
    if (!amount) return 0;
    const fee = (amount * 0.035) + 15;
    return Math.max(amount - fee, 0);
};

const updateBookingPaymentStatus = async (bookingId) => {
    const booking = await BookingModel.findById(bookingId);
    if (!booking || ['Cancelled', 'cancellation requested'].includes(booking.status)) {
        return null;
    }

    const totalPrice = parseAmount(booking?.bookingDetails?.totalPrice);
    const rawPaymentType = booking?.bookingDetails?.paymentDetails?.paymentType || null;
    const depositAmount = parseAmount(booking?.bookingDetails?.paymentDetails?.depositAmount);
    const paymentType = rawPaymentType || (depositAmount > 0 ? 'deposit' : null);
    const paidAgg = await TransactionModel.aggregate([
        { $match: { bookingId: booking._id, status: 'Successful' } }, //counts successful transactions
        { $group: { _id: null, totalPaid: { $sum: '$amount' } } }
    ]);
    const totalPaid = paidAgg?.[0]?.totalPaid || 0;

    let nextStatus = totalPrice > 0 && totalPaid >= totalPrice
        ? 'Fully Paid'
        : 'Pending';

    if (paymentType === 'deposit' && totalPaid < totalPrice) {
        nextStatus = 'Pending';
    }

    if (nextStatus !== booking.status) {
        booking.status = nextStatus;
        if (!Array.isArray(booking.statusHistory)) {
            booking.statusHistory = [];
        }
        booking.statusHistory.push({ status: nextStatus, changedAt: new Date() });
        await booking.save();
    }

    return { booking, totalPaid, totalPrice, status: nextStatus };
};


const generateTransactionReference = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TX-${timestamp}${random}`;
};

const generateTransactionInvoiceNumber = async (date = new Date()) => {
    const invoiceDate = dayjs(date);
    const startOfMonth = invoiceDate.startOf('month').toDate();
    const endOfMonth = invoiceDate.endOf('month').toDate();

    const transactionCount = await TransactionModel.countDocuments({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    const sequence = transactionCount + 1;
    const monthKey = invoiceDate.format('MM');

    return {
        invoiceNumber: `${monthKey}${String(sequence).padStart(2, '0')}`,
        sequence,
        month: monthKey
    };
};

const parsePayMongoSignature = (header) => {
    if (!header) return null;

    const parts = header.split(',');

    let timestamp = null;
    let signature = null;

    for (const part of parts) {
        const [key, value] = part.split('=');

        if (key === 't') {
            timestamp = value;
        }

        if (key === 'li') {
            signature = value;
        }
    }

    if (!timestamp || !signature) {
        console.error('Invalid signature header format');
        return null;
    }
    return { timestamp, signature };
};

//MANUAL PAYMENT FOR NORMAL FIXED BOOKINGS
const createManualPayment = async (req, res) => {
    const userId = req.userId;
    try {
        const {
            bookingId,
            packageId,
            amount,
            proofImage,
            proofImageType,
            proofFileName,
        } = req.body;

        const token = crypto.randomUUID();

        const tokenCheckout = await TokenCheckoutModel.create({
            token,
            userId,
            bookingId,
            amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });

        const reference = generateTransactionReference();

        if (!proofImage || !proofImageType) {
            return res.status(400).json({ error: "Proof of payment image is required." });
        }

        const { invoiceNumber } = await generateTransactionInvoiceNumber();
        const transaction = await TransactionModel.create({
            bookingId,
            packageId,
            userId,
            invoiceNumber,
            reference,
            amount,
            method: 'Manual',
            status: 'Pending',
            proofImage,
            proofImageType,
            proofFileName,
        });

        const booking = await BookingModel.findById(bookingId);

        const bookingStart = dayjs(booking.travelDate.startDate).format('YYYY-MM-DD');
        const bookingEnd = dayjs(booking.travelDate.endDate).format('YYYY-MM-DD');

        booking.status = 'Pending'
        booking.statusHistory.push({ status: 'Pending', changedAt: new Date() });


        const packageDoc = await PackageModel.findById(packageId);

        const user = await UserModel.findById(userId).select('email username');

        await NotificationModel.create({
            userId: user._id,
            title: 'Booking Confirmed',
            message: `Your manual payment for booking ${booking.reference} has been received and is currently pending verification by our team. We will notify you once the verification is complete. This will take 1-2 business days. Thank you for your patience!`,
            type: 'booking',
            link: '/user-bookings',
        });


        try {
            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: `Booking ${booking.reference} Confirmed`,
                html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Booking Confirmed!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your manual payment has been received and is currently pending verification by our team. We will notify you once the verification is complete. This will take 1-2 business days. Thank you for your patience!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>Booking Reference:</b> ${booking.reference} <br/>
                                <b>Package:</b> ${packageDoc.packageName} <br/>
                                <b>Travel Dates:</b> ${bookingStart} to ${bookingEnd} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not book this trip, please ignore this email.
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
            });
        } catch (emailError) {
            console.error('Failed to send booking email:', emailError);
        }

        logAction('MANUAL_PAYMENT', userId, { "Manual Payment Submitted": `Transaction Reference: ${transaction.reference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Package Booking` });

        return res.status(200).json({
            redirectUrl: `/booking-payment/success?token=${token}`
        });

    } catch (error) {
        console.error('Manual payment error:', error.message);
        return res.status(500).json({ error: 'Failed to submit manual payment.' });
    }
};


//MANUAL PAYMENT FOR QUOTATION BOOKINGS
const createManualPaymentQuotation = async (req, res) => {
    const userId = req.userId;
    try {
        const {
            bookingId,
            quotationId,
            packageId,
            amount,
            proofImage,
            proofImageType,
            proofFileName,
        } = req.body;

        const token = crypto.randomUUID();

        const tokenCheckout = await TokenCheckoutModel.create({
            token,
            userId,
            bookingId,
            amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });

        const reference = generateTransactionReference();

        if (!proofImage || !proofImageType) {
            return res.status(400).json({ error: "Proof of payment image is required." });
        }

        const { invoiceNumber } = await generateTransactionInvoiceNumber();
        const transaction = await TransactionModel.create({
            bookingId,
            packageId,
            userId,
            invoiceNumber,
            reference,
            amount,
            method: 'Manual',
            status: 'Pending',
            proofImage,
            proofImageType,
            proofFileName,
        });

        const booking = await BookingModel.findById(bookingId);
        const bookingStart = dayjs(booking.travelDate.startDate).format('YYYY-MM-DD');
        const bookingEnd = dayjs(booking.travelDate.endDate).format('YYYY-MM-DD');
        booking.status = 'Pending'
        booking.statusHistory.push({ status: 'Pending', changedAt: new Date() });

        const quotation = await QuotationModel.findById(quotationId);

        quotation.status = 'Booked';
        await quotation.save();


        const packageDoc = await PackageModel.findById(packageId);

        const user = await UserModel.findById(userId).select('email username');


        await NotificationModel.create({
            userId: user._id,
            title: 'Booking Quotation Confirmed',
            message: `Your manual payment for booking ${booking.reference} has been received and is currently pending verification by our team. We will notify you once the verification is complete. This will take 1-2 business days. Thank you for your patience!`,
            type: 'booking',
            link: '/user-bookings',
        });


        try {
            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: `Booking Quotation ${booking.reference} Confirmed`,
                html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Booking Quotation Confirmed!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your manual payment has been received and is currently pending verification by our team. We will notify you once the verification is complete. This will take 1-2 business days. Thank you for your patience!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>Booking Reference:</b> ${booking.reference} <br/>
                                <b>Package:</b> ${packageDoc.packageName} <br/>
                                <b>Travel Dates:</b> ${bookingStart} to ${bookingEnd} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not book this trip, please ignore this email.
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
            });
        } catch (emailError) {
            console.error('Failed to send booking email:', emailError);
        }

        logAction('MANUAL_PAYMENT', userId, { "Manual Payment Submitted": `Transaction Reference: ${transaction.reference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Quotation Booking` });

        return res.status(200).json({
            redirectUrl: `/booking-payment/success?token=${token}`
        });

    } catch (error) {
        console.error('Manual payment error:', error.message);
        return res.status(500).json({ error: 'Failed to submit manual payment.' });
    }
};


//MANUAL PAYMENT FOR DEPOSIT OR INSTALLMENTS
const createManualPaymentDeposit = async (req, res) => {
    const userId = req.userId;
    try {
        const {
            bookingId,
            packageId,
            amount,
            proofImage,
            proofImageType,
            proofFileName,
        } = req.body;

        const token = crypto.randomUUID();

        const tokenCheckout = await TokenCheckoutModel.create({
            token,
            userId,
            bookingId,
            amount: amount.amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });

        const reference = generateTransactionReference();
        const booking = await BookingModel.findById(bookingId);
        const bookingStart = dayjs(booking.travelDate.startDate).format('YYYY-MM-DD');
        const bookingEnd = dayjs(booking.travelDate.endDate).format('YYYY-MM-DD');

        const packageDoc = await PackageModel.findById(packageId);


        if (!proofImage || !proofImageType) {
            return res.status(400).json({ error: "Proof of payment image is required." });
        }

        const { invoiceNumber } = await generateTransactionInvoiceNumber();
        const transaction = await TransactionModel.create({
            bookingId,
            packageId,
            userId,
            invoiceNumber,
            reference,
            amount: Number(amount.amount),
            method: 'Manual',
            status: 'Pending',
            proofImage,
            proofImageType,
            proofFileName,
        });

        const user = await UserModel.findById(userId).select('email username');

        await NotificationModel.create({
            userId: user._id,
            title: 'Installment Payment Successful',
            message: `Your manual installment payment for booking ${booking.reference} has been received and is currently pending verification by our team. We will notify you once the verification is complete. This will take 1-2 business days. Thank you for your patience!`,
            type: 'payment',
            link: '/user-transactions',
        });

        try {
            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: `Installment Payment ${reference} Successful`,
                html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Installment Payment Successful!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                You manual installment payment has been received and is currently pending verification by our team. We will notify you once the verification is complete. This will take 1-2 business days. Thank you for your patience!

                            <p style="color:#555; font-size:15px; line-height:1.6;">

                                <b>Transaction Reference:</b> ${reference} <br/>
                                <b>Package:</b> ${packageDoc.packageName} <br/>
                                <b>Travel Dates:</b> ${bookingStart} to ${bookingEnd} <br/>
                                <b>Total Paid:</b> ₱${amount.amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not make this payment, please ignore this email.
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
            });
        } catch (emailError) {
            console.error('Failed to send booking email:', emailError);
        }

        logAction('MANUAL_PAYMENT', userId, { "Manual Payment Submitted": `Transaction Reference: ${transaction.reference} | Amount: ₱${amount.amount.toFixed(2)} | Payment Purpose: Installment Payment` });

        return res.status(200).json({
            redirectUrl: `/booking-payment/success?token=${token}`
        });


        // Implementation for creating manual payment deposit
    } catch (error) {
        console.error('Manual payment deposit error:', error.message);
        return res.status(500).json({ error: 'Failed to submit manual payment deposit.' });
    }
};


//MANUAL PAYMENT FOR PASSPORT PENALTY FEE
const createManualPaymentPassportPenalty = async (req, res) => {
    const userId = req.userId;

    try {
        const {
            applicationId,
            amount,
            proofImage,
        } = req.body;
        if (!proofImage) {
            return res.status(400).json({ error: "Proof of payment image is required." });
        }

        const token = crypto.randomUUID();

        const tokenCheckout = await TokenCheckoutPassportModel.create({
            token,
            userId,
            applicationId,
            amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });


        const reference = generateTransactionReference();
        const { invoiceNumber } = await generateTransactionInvoiceNumber();
        const transaction = await TransactionModel.create({
            applicationId,
            applicationType: "Passport Penalty Fee",
            userId,
            invoiceNumber,
            reference,
            amount,
            method: 'Manual',
            status: 'Pending',
            proofImage,
        });


        const passportApp = await PassportModel.findById(applicationId);
        const user = await UserModel.findById(userId).select('email username');

        await NotificationModel.create({
            userId,
            title: "Manual Payment Submitted",
            message: `Your manual payment for passport penalty fee ${passportApp.applicationNumber} has been submitted and is pending review.`,
            link: `/user-transactions`,
        });

        try {
            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: `Passport Penalty Fee Payment Submitted`,
                html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Passport Penalty Fee Payment Submitted!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your manual passport penalty fee payment has been received and is currently pending verification by our team. We will notify you once the verification is complete. This will take 1-2 business days. Thank you for your patience!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">

                                <b>Transaction Reference:</b> ${reference} <br/>
                                <b>Application Number:</b> ${applicationNumber} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not make this payment, please ignore this email.
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
            });
        } catch (emailError) {
            console.error('Failed to send passport email:', emailError);
        }

        logAction('MANUAL_PAYMENT', userId, { "Manual Payment Submitted": `Transaction Reference: ${transaction.reference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Passport Penalty Fee` });

        return res.status(200).json({
            redirectUrl: `/user-applications/success/passport?token=${token}`
        });

    } catch (error) {
        console.error('Manual payment for passport penalty fee error:', error.message);
        return res.status(500).json({ error: 'Failed to submit manual payment for passport penalty fee.' });
    }
};


//MANUAL PAYMENT FOR VISA PENALTY FEE
const createManualPaymentVisaPenalty = async (req, res) => {
    const userId = req.userId;

    try {
        const {
            applicationId,
            amount,
            proofImage,
        } = req.body;
        if (!proofImage) {
            return res.status(400).json({ error: "Proof of payment image is required." });
        }

        const token = crypto.randomUUID();

        const tokenCheckout = await TokenCheckoutPassportModel.create({
            token,
            userId,
            applicationId,
            amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });


        const reference = generateTransactionReference();
        const { invoiceNumber } = await generateTransactionInvoiceNumber();
        const transaction = await TransactionModel.create({
            applicationId,
            applicationType: "Visa Penalty Fee",
            userId,
            invoiceNumber,
            reference,
            amount,
            method: 'Manual',
            status: 'Pending',
            proofImage,
        });


        const visaApp = await VisaModel.findById(applicationId);
        const user = await UserModel.findById(userId).select('email username');

        await NotificationModel.create({
            userId,
            title: "Manual Payment Submitted",
            message: `Your manual payment for visa penalty fee ${visaApp.applicationNumber} has been submitted and is pending review.`,
            link: `/user-transactions`,
        });

        try {
            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: `Visa Penalty Fee Payment Submitted`,
                html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Visa Penalty Fee Payment Submitted!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your manual visa penalty fee payment has been received and is currently pending verification by our team. We will notify you once the verification is complete. This will take 1-2 business days. Thank you for your patience!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">

                                <b>Transaction Reference:</b> ${reference} <br/>
                                <b>Application Number:</b> ${applicationNumber} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not make this payment, please ignore this email.
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
            });
        } catch (emailError) {
            console.error('Failed to send visa email:', emailError);
        }

        logAction('MANUAL_PAYMENT', userId, { "Manual Payment Submitted": `Transaction Reference: ${transaction.reference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Visa Penalty Fee` });

        return res.status(200).json({
            redirectUrl: `/user-applications/success/visa?token=${token}`
        });

    } catch (error) {
        console.error('Manual payment for visa penalty fee error:', error.message);
        return res.status(500).json({ error: 'Failed to submit manual payment for visa penalty fee.' });
    }
};






//MANUAL PAYMENT FOR PASSPORT APPLICATIONS
const createManualPaymentPassport = async (req, res) => {
    const userId = req.userId;

    try {
        const {
            applicationId,
            applicationNumber,
            amount,
            proofImage,
        } = req.body;
        if (!proofImage) {
            return res.status(400).json({ error: "Proof of payment image is required." });
        }

        const token = crypto.randomUUID();

        const tokenCheckout = await TokenCheckoutPassportModel.create({
            token,
            userId,
            applicationId,
            amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });


        const reference = generateTransactionReference();
        const { invoiceNumber } = await generateTransactionInvoiceNumber();
        const transaction = await TransactionModel.create({
            applicationId,
            applicationType: "Passport Application",
            userId,
            invoiceNumber,
            reference,
            amount,
            method: 'Manual',
            status: 'Pending',
            proofImage,
        });


        const passportApp = await PassportModel.findById(applicationId);
        const user = await UserModel.findById(userId).select('email username');

        await NotificationModel.create({
            userId,
            title: "Manual Payment Submitted",
            message: `Your manual payment for passport application ${passportApp.applicationNumber} has been submitted and is pending review.`,
            link: `/user-transactions`,
        });

        try {
            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: `Passport Payment Submitted`,
                html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Passport Payment Submitted!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your manual passport payment has been received and is currently pending verification by our team. We will notify you once the verification is complete. This will take 1-2 business days. Thank you for your patience!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">

                                <b>Transaction Reference:</b> ${reference} <br/>
                                <b>Application Number:</b> ${applicationNumber} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not make this payment, please ignore this email.
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
            });
        } catch (emailError) {
            console.error('Failed to send passport email:', emailError);
        }

        logAction('MANUAL_PAYMENT', userId, { "Manual Payment Submitted": `Transaction Reference: ${transaction.reference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Passport Application` });

        return res.status(200).json({
            redirectUrl: `/user-applications/success/passport?token=${token}`
        });

    } catch (error) {
        console.error('Manual payment for passport application error:', error.message);
        return res.status(500).json({ error: 'Failed to submit manual payment for passport application.' });
    }
};


//MANUAL PAYMENT FOR VISA APPLICATIONS
const createManualPaymentVisa = async (req, res) => {
    const userId = req.userId;

    try {
        const {
            applicationId,
            applicationNumber,
            amount,
            proofImage,
        } = req.body;
        if (!proofImage) {
            return res.status(400).json({ error: "Proof of payment image is required." });
        }

        const token = crypto.randomUUID();

        const tokenCheckout = await TokenCheckoutVisaModel.create({
            token,
            userId,
            applicationId,
            amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });


        const reference = generateTransactionReference();
        const { invoiceNumber } = await generateTransactionInvoiceNumber();
        const transaction = await TransactionModel.create({
            applicationId,
            applicationType: "Visa Application",
            userId,
            invoiceNumber,
            reference,
            amount,
            method: 'Manual',
            status: 'Pending',
            proofImage,
        });


        const visaApp = await VisaModel.findById(applicationId);
        const user = await UserModel.findById(userId).select('email username');

        await NotificationModel.create({
            userId,
            title: "Manual Payment Submitted",
            message: `Your manual payment for visa application ${visaApp.applicationNumber} has been submitted and is pending review.`,
            link: `/user-transactions`,
        });

        try {
            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: `Visa Payment Submitted`,
                html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Visa Payment Submitted!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your visa payment has been successfully submitted and is currently pending verification by our team. We will notify you once the verification is complete. This will take 1-2 business days. Thank you for your patience!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">

                                <b>Transaction Reference:</b> ${reference} <br/>
                                <b>Application Number:</b> ${applicationNumber} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not make this payment, please ignore this email.
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
            });
        } catch (emailError) {
            console.error('Failed to send visa email:', emailError);
        }

        logAction('MANUAL_PAYMENT', userId, { "Manual Payment Submitted": `Transaction Reference: ${transaction.reference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Visa Application` });

        return res.status(200).json({
            redirectUrl: `/user-applications/success/visa?token=${token}`
        });
    } catch (error) {
        console.error('Manual payment for visa application error:', error.message);
        return res.status(500).json({ error: 'Failed to submit manual payment for visa application.' });
    }
};


const createCheckoutSessionPassport = async (req, res) => {
    const userId = req.userId;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }

        const { applicationId, applicationNumber, totalPrice } = req.body;

        if (!applicationId || !applicationNumber || !totalPrice) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const token = crypto.randomUUID();

        const tokenCheckoutVisa = await TokenCheckoutVisaModel.create({
            token,
            userId,
            applicationId,
            amount: totalPrice,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });


        const successUrl = `${FRONTEND_URL}/user-applications/success/visa?token=${token}`;
        const cancelUrl = `${FRONTEND_URL}/user-applications?status=cancel`;

        const convenienceFeeCents = Math.round(totalPrice * 0.035 * 100) + 1500; // 3.5% + 15 PHP in cents
        const baseAmountCents = Math.round(totalPrice * 100);
        const finalTotalCents = baseAmountCents + convenienceFeeCents;

        const email = await UserModel.findById(userId).select('email');
        const username = await UserModel.findById(userId).select('username');

        const metadata = {
            userId,
            applicationId,
            applicationNumber,
            applicationType: "Passport Application",
            baseAmountCents,
            convenienceFeeCents,
            totalAmountCents: finalTotalCents,
        };

        const response = await apiFetch.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            {
                data: {
                    attributes: {
                        billing: {
                            name: username.username || "Passport Applicant",
                            email: email.email || "test@example.com",
                        },
                        line_items: [
                            {
                                name: "Passport Assistance",
                                quantity: 1,
                                amount: baseAmountCents,
                                currency: "PHP",
                            },
                            // {
                            //     name: "Convenience Fee",
                            //     description: "Payment processing and service fee",
                            //     quantity: 1,
                            //     amount: convenienceFeeCents,
                            //     currency: "PHP",
                            // }
                        ],
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya", "qrph"], // start with card first
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                        metadata,
                        show_description: true,
                        show_line_items: true,
                    },
                },
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.json(response);

    } catch (error) {
        console.error("Passport Checkout Error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
};


const createCheckoutSessionVisa = async (req, res) => {
    const userId = req.userId;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }

        const { applicationId, applicationNumber, totalPrice } = req.body;

        if (!applicationId || !applicationNumber || !totalPrice) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const token = crypto.randomUUID();

        const tokenCheckoutVisa = await TokenCheckoutVisaModel.create({
            token,
            userId,
            applicationId,
            amount: totalPrice,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });


        const successUrl = `${FRONTEND_URL}/user-applications/success/visa?token=${token}`;
        const cancelUrl = `${FRONTEND_URL}/user-applications?status=cancel`;

        const convenienceFeeCents = Math.round(totalPrice * 0.035 * 100) + 1500; // 3.5% + 15 PHP in cents
        const baseAmountCents = Math.round(totalPrice * 100);
        const finalTotalCents = baseAmountCents + convenienceFeeCents;

        const email = await UserModel.findById(userId).select('email');
        const username = await UserModel.findById(userId).select('username');

        const metadata = {
            userId,
            applicationId,
            applicationNumber,
            applicationType: "Visa Application",
            baseAmountCents,
            convenienceFeeCents,
            totalAmountCents: finalTotalCents,
        };

        const response = await apiFetch.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            {
                data: {
                    attributes: {
                        billing: {
                            name: username.username || "Visa Applicant",
                            email: email.email || "test@example.com",
                        },
                        line_items: [
                            {
                                name: "Visa Application",
                                quantity: 1,
                                amount: baseAmountCents,
                                currency: "PHP",
                            },
                            {
                                name: "Convenience Fee",
                                description: "Payment processing and service fee",
                                quantity: 1,
                                amount: convenienceFeeCents,
                                currency: "PHP",
                            }
                        ],
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya", "qrph"], // start with card first
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                        metadata,
                        show_description: true,
                        show_line_items: true,
                    },
                },
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.json(response);

    } catch (error) {
        console.error("Visa Checkout Error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
};


const createCheckoutSessionPassportPenalty = async (req, res) => {
    const userId = req.userId;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }

        const { applicationId } = req.body;

        if (!applicationId) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const penaltyAmount = 1500; // Fixed penalty amount in PHP
        const token = crypto.randomUUID();

        const tokenCheckoutPassport = await TokenCheckoutPassportModel.create({
            token,
            userId,
            applicationId,
            amount: penaltyAmount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });


        const successUrl = `${FRONTEND_URL}/user-applications/success/passport-penalty?token=${token}`;
        const cancelUrl = `${FRONTEND_URL}/user-applications?status=cancel`;

        const baseAmountCents = Math.round(penaltyAmount * 100);
        const convenienceFeeCents = Math.round(baseAmountCents * 0.035); // 3.5% convenience fee
        const finalTotalCents = baseAmountCents + convenienceFeeCents;

        const email = await UserModel.findById(userId).select('email');
        const username = await UserModel.findById(userId).select('username');

        const metadata = {
            userId,
            applicationId,
            applicationType: "Passport Penalty Fee",
            baseAmountCents,
            convenienceFeeCents,
            totalAmountCents: finalTotalCents,
        };

        const response = await apiFetch.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            {
                data: {
                    attributes: {
                        billing: {
                            name: username.username || "Visa Applicant",
                            email: email.email || "test@example.com",
                        },
                        line_items: [
                            {
                                name: "Passport Application Penalty Fee",
                                quantity: 1,
                                amount: 1,
                                currency: "PHP",
                            },
                            // {
                            //     name: "Convenience Fee",
                            //     description: "Payment processing and service fee",
                            //     quantity: 1,
                            //     amount: convenienceFeeCents,
                            //     currency: "PHP",
                            // }
                        ],
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya", "qrph"], // start with card first
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                        metadata,
                        show_description: true,
                        show_line_items: true,
                    },
                },
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.json(response);

    } catch (error) {
        console.error("Visa Checkout Error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
};



const createCheckoutSessionVisaPenalty = async (req, res) => {
    const userId = req.userId;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }

        const { applicationId } = req.body;

        if (!applicationId) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const penaltyAmount = 1500; // Fixed penalty amount in PHP
        const token = crypto.randomUUID();

        const tokenCheckoutVisa = await TokenCheckoutVisaModel.create({
            token,
            userId,
            applicationId,
            amount: penaltyAmount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });


        const successUrl = `${FRONTEND_URL}/user-applications/success/visa?token=${token}`;
        const cancelUrl = `${FRONTEND_URL}/user-applications?status=cancel`;

        const baseAmountCents = Math.round(penaltyAmount * 100);
        const convenienceFeeCents = Math.round(baseAmountCents * 0.035); // 3.5% convenience fee
        const finalTotalCents = baseAmountCents + convenienceFeeCents;

        const email = await UserModel.findById(userId).select('email');
        const username = await UserModel.findById(userId).select('username');

        const metadata = {
            userId,
            applicationId,
            applicationType: "Visa Penalty Fee",
            baseAmountCents,
            convenienceFeeCents,
            totalAmountCents: finalTotalCents,
        };

        const response = await apiFetch.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            {
                data: {
                    attributes: {
                        billing: {
                            name: username.username || "Visa Applicant",
                            email: email.email || "test@example.com",
                        },
                        line_items: [
                            {
                                name: "Visa Penalty Fee",
                                quantity: 1,
                                amount: 1,
                                currency: "PHP",
                            },
                            // {
                            //     name: "Convenience Fee",
                            //     description: "Payment processing and service fee",
                            //     quantity: 1,
                            //     amount: convenienceFeeCents,
                            //     currency: "PHP",
                            // }
                        ],
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya", "qrph"], // start with card first
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                        metadata,
                        show_description: true,
                        show_line_items: true,
                    },
                },
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.json(response);

    } catch (error) {
        console.error("Visa Checkout Error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
};







const createCheckoutSessionDeposit = async (req, res) => {
    const userId = req.userId;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }
        const { paymentPayload } = req.body;


        const bookingId = paymentPayload.bookingId;
        const totalPrice = paymentPayload.totalPrice
        const token = crypto.randomUUID();

        const tokenCheckout = await TokenCheckoutModel.create({
            token,
            userId,
            bookingId,
            amount: totalPrice,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });

        const bookingReference = paymentPayload.bookingReference;
        const packageId = paymentPayload.packageId;
        const successUrl = `${FRONTEND_URL}/booking-payment/success?token=${token}`;
        const cancelUrl = `${FRONTEND_URL}/booking-payment?status=cancel`;


        const package = await PackageModel.findById(packageId).select('packageName');
        const packageName = package.packageName

        const baseAmountCents = Math.round(totalPrice * 100);
        const convenienceFeeCents = Math.round((baseAmountCents * 0.035) + 1500);
        const finalTotalCents = baseAmountCents + convenienceFeeCents; //total amount with convenience fee

        const username = await UserModel.findById(userId).select('username');
        const email = await UserModel.findById(userId).select('email');


        //currently not being used
        const metadata = {
            userId: req.userId,
            bookingId,
            bookingReference,
            transactionType: "Installment Payment",
            packageId,
            baseAmountCents,
            convenienceFeeCents,
            totalAmountCents: finalTotalCents
        };

        const response = await apiFetch.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            {
                data: {
                    attributes: {
                        billing: {
                            name: username.username || "Test User",
                            email: email.email || "test@example.com",
                        },
                        line_items: [
                            {
                                name: packageName || 'Tour Package',
                                quantity: 1,
                                amount: baseAmountCents,
                                currency: "PHP",
                            },
                            {
                                name: "Convenience Fee",
                                description: "Payment processing and service fee",
                                quantity: 1,
                                amount: convenienceFeeCents,
                                currency: "PHP",
                            }
                        ],
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya", "qrph"],
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                        metadata,
                        show_description: true,
                        show_line_items: true,
                    },
                },
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
                    "Content-Type": "application/json",
                },
            }
        );


        res.json(response);
    } catch (error) {
        console.error("PayMongo error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
}

//CHECKOUT FOR NORMAL FIXED BOOKINGS
const createCheckoutSession = async (req, res) => {
    const userId = req.userId;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

    const paymentType = "qr_ph"

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }

        const { paymentToken } = req.body;

        const successUrl = `${FRONTEND_URL}/booking-payment/success?token=${paymentToken}`;
        const cancelUrl = `${FRONTEND_URL}/booking-payment?status=cancel`;

        if (!paymentToken) {
            return res.status(400).json({ error: "Missing payment token" });
        }

        const tokenDoc = await TokenCheckoutModel.findOne({ token: paymentToken });
        if (!tokenDoc) return res.status(404).json({ error: "Invalid payment token" });


        if (dayjs().isAfter(dayjs(tokenDoc.expiresAt))) {
            return res.status(400).json({ error: "Payment token expired" });
        }

        const booking = await BookingModel.findById(tokenDoc.bookingId).populate('packageId');
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        if (dayjs().isAfter(dayjs(booking.expiresAt))) {
            return res.status(400).json({ error: "Booking expired" });
        }

        const packageName = booking.packageId.packageName;
        const totalPrice = tokenDoc.amount;


        const baseAmountCents = Math.round(totalPrice * 100);
        const convenienceFeeCents = Math.round(baseAmountCents * 0.035 + 1500);
        const finalTotalCents = baseAmountCents + convenienceFeeCents;

        const metadata = {
            userId: tokenDoc.userId,
            bookingId: booking._id,
            bookingReference: booking.reference,
            transactionType: "Booking Payment",
            baseAmountCents,
            convenienceFeeCents,
            totalAmountCents: finalTotalCents,
        };


        const response = await apiFetch.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            {
                data: {
                    attributes: {
                        billing: {
                            name: "Test User",
                            email: "test@example.com",
                        },
                        line_items: [
                            {
                                name: packageName || 'Tour Package',
                                quantity: 1,
                                amount: baseAmountCents,
                                currency: "PHP",
                            },
                            {
                                name: "Convenience Fee",
                                description: "Payment processing and service fee",
                                quantity: 1,
                                amount: convenienceFeeCents,
                                currency: "PHP",
                            }
                        ],
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya", "qrph"],
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                        metadata,
                        show_description: true,
                        show_line_items: true,
                    },
                },
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
                    "Content-Type": "application/json",
                },
            }
        );


        res.json(response);
    } catch (error) {
        console.error("PayMongo error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
};

//CHECKOUT FOR QUOTATION BOOKINGS
const createCheckoutSessionQuotation = async (req, res) => {
    const userId = req.userId;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

    const paymentType = "qr_ph"

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }

        const { quotationId, paymentToken } = req.body;

        const successUrl = `${FRONTEND_URL}/quotation-payment-process/success?token=${paymentToken}`;
        const cancelUrl = `${FRONTEND_URL}/quotation-payment-process?status=cancel`;

        if (!paymentToken) {
            return res.status(400).json({ error: "Missing payment token" });
        }

        const tokenDoc = await TokenCheckoutModel.findOne({ token: paymentToken });
        if (!tokenDoc) return res.status(404).json({ error: "Invalid payment token" });


        if (dayjs().isAfter(dayjs(tokenDoc.expiresAt))) {
            return res.status(400).json({ error: "Payment token expired" });
        }

        const booking = await BookingModel.findById(tokenDoc.bookingId).populate('packageId');
        if (!booking) return res.status(404).json({ error: "Booking not found" });

        if (dayjs().isAfter(dayjs(booking.expiresAt))) {
            return res.status(400).json({ error: "Booking expired" });
        }

        const packageName = booking.packageId.packageName;
        const totalPrice = tokenDoc.amount;


        const baseAmountCents = Math.round(totalPrice * 100);
        const convenienceFeeCents = Math.round(baseAmountCents * 0.035 + 1500);
        const finalTotalCents = baseAmountCents + convenienceFeeCents;

        const metadata = {
            userId: tokenDoc.userId,
            bookingId: booking._id,
            quotationId,
            bookingReference: booking.reference,
            transactionType: "Quotation Payment",
            baseAmountCents,
            convenienceFeeCents,
            totalAmountCents: finalTotalCents,
        };


        const response = await apiFetch.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            {
                data: {
                    attributes: {
                        billing: {
                            name: "Test User",
                            email: "test@example.com",
                        },
                        line_items: [
                            {
                                name: packageName || 'Tour Package',
                                quantity: 1,
                                amount: baseAmountCents,
                                currency: "PHP",
                            },
                            {
                                name: "Convenience Fee",
                                description: "Payment processing and service fee",
                                quantity: 1,
                                amount: convenienceFeeCents,
                                currency: "PHP",
                            }
                        ],
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya", "qrph"],
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                        metadata,
                        show_description: true,
                        show_line_items: true,
                    },
                },
            },
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
                    "Content-Type": "application/json",
                },
            }
        );

        res.json(response);
    } catch (error) {
        console.error("PayMongo error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
};


//paymongo webhook handler
const handlePayMongoWebhook = async (req, res) => {
    console.log('🚀 Webhook HIT!');
    res.status(200).send('OK'); // respond instantly
    console.log('✅ RESPONSE SENT');


    //check if secret key exists
    if (!process.env.PAYMONGO_WEBHOOK_SECRET) {
        console.log('Webhook secret not configured');
        return
    }

    //if the request body is a buffer, convert it to string for signature verification
    // const rawBody = Buffer.isBuffer(req.body)
    //     ? req.body.toString('utf8')
    //     : JSON.stringify(req.body || {});

    if (!req.rawBody) {
        console.log('Raw body not captured. Check middleware.');
        return
    }

    try {
        const rawBodyString = req.rawBody.toString('utf8');

        //webhooks of paymongo will have a signature in the header that we need to parse and verify to ensure the request is really from paymongo
        const signatureHeader = req.headers['paymongo-signature'];
        const parsedSignature = parsePayMongoSignature(signatureHeader);

        if (!parsedSignature) {
            console.log('Invalid signature header format');
            return
        }

        console.log('STEP 2: SIGNATURE OK');

        const signedPayload = `${parsedSignature.timestamp}.${rawBodyString}`; //time paymongo sent the webhook and the payload (rawBody)
        const expectedSignature = crypto //create a hash using the webhook secret and the signed payload, then compare it to the signature sent by paymongo to verify authenticity
            .createHmac('sha256', process.env.PAYMONGO_WEBHOOK_SECRET)
            .update(signedPayload)
            .digest('hex');

        //compares two buffers in constant time to prevent timing attacks. If the signatures don't match, we reject the request
        if (
            !crypto.timingSafeEqual(
                Buffer.from(expectedSignature, 'utf8'),
                Buffer.from(parsedSignature.signature, 'utf8')
            )
        ) {
            console.log('Invalid signature');
            return
        }

        // At this point, we have verified that the webhook is legitimately from PayMongo. Now we can safely parse the payload and handle the event.

        console.log('STEP 3: RESPONSE SENT');

        //const payload = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;
        const payload = JSON.parse(rawBodyString);
        const eventType = payload?.data?.attributes?.type;
        if (!eventType) {
            console.log('Invalid webhook payload');
            return res.status(400).send('Invalid payload');
        }

        console.log('📦 Parsed Payload:', JSON.stringify(payload, null, 2));
        console.log('STEP 4: PROCESSING EVENT');

        //paymongo can send different types of events, but we're mainly interested in the checkout_session.payment.paid event which indicates a successful payment. We will extract the metadata from the event to know which user and booking this payment is for, then we can update our database accordingly.
        const sessionId =
            payload?.data?.attributes?.data?.id ||
            payload?.data?.attributes?.data?.attributes?.checkout_session_id ||
            payload?.data?.attributes?.id ||
            null;

        let sessionAttributes = null;
        let metadata = {};

        // If we have a session ID, we can make an API call to PayMongo to retrieve the full session details, which should include the metadata we set when creating the checkout session. This is important because sometimes the metadata in the webhook event might be incomplete or missing, so fetching the session details ensures we have all the information we need to process the payment correctly.
        if (sessionId) {
            try {
                const sessionResponse = await apiFetch.get(
                    `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
                    {
                        headers: {
                            Authorization: `Basic ${Buffer.from(
                                process.env.PAYMONGO_SECRET_KEY + ':'
                            ).toString('base64')}`,
                        },
                    }
                );
                sessionAttributes = sessionResponse?.data?.attributes;
                metadata = sessionAttributes?.metadata || {};
                console.log('✅ Session metadata:', metadata);
            } catch (err) {
                console.log('❌ Failed to fetch session:', err.data || err.message);
            }
        }

        // checks if the metadata contains the necessary identifiers to link this payment to a user and a booking/application. If not, we log a warning and exit gracefully since we can't process this payment without that information. This is a safeguard against processing incomplete or malformed webhook events.
        if (!metadata.userId && !metadata.applicationId && !metadata.packageId) {
            console.warn('Missing metadata; cannot process');
            return console.log('missing metadata:', metadata);
        }

        const user = await UserModel.findById(metadata.userId);
        if (!user) return console.log('user not found for metadata userId:', metadata.userId);

        console.log('metadata:', metadata);

        if (metadata.applicationId && metadata.applicationType === "Visa Application") {
            console.log('🛂 Visa payment detected');
            const grossAmount =
                Number(metadata.totalAmountCents || 0) / 100 ||
                Number(sessionAttributes?.amount_total || 0) / 100;
            const net = grossAmount - ((grossAmount * 0.035) + 15);
            const amount = Math.round(net / 100) * 100;

            const transactionReference = generateTransactionReference();

            const { invoiceNumber: invoiceNumberVisa } = await generateTransactionInvoiceNumber();
            await TransactionModel.create({
                userId: user._id,
                applicationId: metadata.applicationId,
                applicationType: "Visa Application",
                invoiceNumber: invoiceNumberVisa,
                reference: transactionReference,
                amount: Math.round(metadata.baseAmountCents / 100),
                method: 'Paymongo',
                status: 'Successful',
            });

            logAction('PAYMONGO_PAYMENT', user._id, { "Visa Application Paid": `Transaction Reference: ${transactionReference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Visa Application` });

            console.log('Created transaction for visa application:', metadata.applicationId);

            const updatedVisa = await VisaModel.findOneAndUpdate(
                { _id: metadata.applicationId }, // filter object
                {
                    $set: { status: ["Payment Completed"], currentStepIndex: 1 } // replace array & update progress
                },
                { new: true } // return the updated document
            );

            if (!updatedVisa) {
                console.warn(`No visa application found with applicationId ${metadata.applicationId}`);
            } else {
                console.log("Visa payment status updated:", updatedVisa.status);
            }

            await NotificationModel.create({
                userId: user._id,
                title: 'Visa Payment Successful',
                message: `Your visa application ${metadata.applicationNumber} was successful.`,
                type: 'visa',
                link: '/user-transactions',
            });

            try {
                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: `Visa Payment Successful`,
                    html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Visa Payment Successful!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your visa payment has been successfully processed!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">

                                <b>Transaction Reference:</b> ${transactionReference} <br/>
                                <b>Application Number:</b> ${metadata.applicationNumber} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not make this payment, please ignore this email.
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
                });
            } catch (emailError) {
                console.error('Failed to send visa email:', emailError);
            }

            console.log('Visa payment processed successfully');
            return
        }

        // if applicationId exists in metadata, we know this payment is for a passport application, so we create a transaction record linked to that application and send a notification to the user. We also send a confirmation email to the user about their passport payment. After handling the passport payment, we return early since we don't want to accidentally process it as a booking payment as well.
        if (metadata.applicationId && metadata.applicationType === "Passport Application") {
            console.log('🛂 Passport payment detected');
            const grossAmount =
                Number(metadata.totalAmountCents || 0) / 100 ||
                Number(sessionAttributes?.amount_total || 0) / 100;
            const net = grossAmount - ((grossAmount * 0.035) + 15);
            const amount = Math.round(net / 100) * 100;

            const transactionReference = generateTransactionReference();

            const { invoiceNumber: invoiceNumberPassport } = await generateTransactionInvoiceNumber();
            const transaction = await TransactionModel.create({
                userId: user._id,
                applicationId: metadata.applicationId,
                applicationType: "Passport Application",
                invoiceNumber: invoiceNumberPassport,
                reference: transactionReference,
                amount: Math.round(metadata.baseAmountCents / 100),
                method: 'Paymongo',
                status: 'Successful',
            });

            console.log('Created transaction for passport application:', metadata.applicationId);

            const updatedApp = await PassportModel.findOneAndUpdate(
                { _id: metadata.applicationId },
                { status: "Payment Completed" },
                { new: true }
            );

            if (!updatedApp) {
                console.warn(`No passport application found with applicationId ${metadata.applicationId}`);
            } else {
                console.log("Updated status:", updatedApp.status);
            }
            console.log("Updated status:", updatedApp.status);

            await NotificationModel.create({
                userId: user._id,
                title: 'Passport Payment Successful',
                message: `Your passport application ${metadata.applicationNumber} was successful.`,
                type: 'passport',
                link: '/user-transactions',
            });

            try {
                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: `Passport Payment Successful`,
                    html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Passport Payment Successful!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your passport payment has been successfully processed!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">

                                <b>Transaction Reference:</b> ${transactionReference} <br/>
                                <b>Application Number:</b> ${metadata.applicationNumber} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not make this payment, please ignore this email.
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
                });
            } catch (emailError) {
                console.error('Failed to send passport email:', emailError);
            }

            logAction('PAYMONGO_PAYMENT', user._id, { "Passport Application Paid": `Transaction Reference: ${transactionReference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Passport Application` });

            console.log('Passport payment processed successfully');
            return
        }


        //visa penalty fee
        if (metadata.applicationId && metadata.applicationType === "Visa Penalty Fee") {
            console.log('🛂 Visa payment detected');
            const grossAmount =
                Number(metadata.totalAmountCents || 0) / 100 ||
                Number(sessionAttributes?.amount_total || 0) / 100;
            const net = grossAmount - ((grossAmount * 0.035) + 15);
            const amount = Math.round(net / 100) * 100;

            const transactionReference = generateTransactionReference();

            const { invoiceNumber: invoiceNumberVisa } = await generateTransactionInvoiceNumber();
            await TransactionModel.create({
                userId: user._id,
                applicationId: metadata.applicationId,
                applicationType: "Visa Penalty Fee",
                invoiceNumber: invoiceNumberVisa,
                reference: transactionReference,
                amount: Math.round(metadata.baseAmountCents / 100),
                method: 'Paymongo',
                status: 'Successful',
            });

            logAction('PAYMONGO_PAYMENT', user._id, { "Visa Penalty Fee Paid": `Transaction Reference: ${transactionReference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Visa Penalty Fee` });

            console.log('Created transaction for visa penalty fee:', metadata.applicationId);

            const updatedVisa = await VisaModel.findOneAndUpdate(
                { _id: metadata.applicationId }, // filter object
                {
                    $set: { status: ["Payment Completed"], currentStepIndex: 1 } // replace array & update progress
                },
                { new: true } // return the updated document
            );

            if (!updatedVisa) {
                console.warn(`No visa application found with applicationId ${metadata.applicationId}`);
            } else {
                console.log("Visa payment status updated:", updatedVisa.status);
            }

            await NotificationModel.create({
                userId: user._id,
                title: 'Visa Payment Successful',
                message: `Your visa application ${metadata.applicationNumber} was successful.`,
                type: 'visa',
                link: '/user-transactions',
            });

            try {
                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: `Visa Payment Successful`,
                    html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Visa Penalty Fee Payment Successful!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your visa penalty fee payment has been successfully processed!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">

                                <b>Transaction Reference:</b> ${transactionReference} <br/>
                                <b>Application Number:</b> ${metadata.applicationNumber} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not make this payment, please ignore this email.
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
                });
            } catch (emailError) {
                console.error('Failed to send visa email:', emailError);
            }

            console.log('Visa payment processed successfully');
            return
        }



        //penalty fee passport
        if (metadata.applicationId && metadata.applicationType === "Passport Penalty Fee") {
            console.log('🛂 Passport payment detected');
            const grossAmount =
                Number(metadata.totalAmountCents || 0) / 100 ||
                Number(sessionAttributes?.amount_total || 0) / 100;
            const net = grossAmount - ((grossAmount * 0.035) + 15);
            const amount = Math.round(net / 100) * 100;

            const transactionReference = generateTransactionReference();

            const { invoiceNumber: invoiceNumberPassport } = await generateTransactionInvoiceNumber();
            const transaction = await TransactionModel.create({
                userId: user._id,
                applicationId: metadata.applicationId,
                applicationType: "Passport Penalty Fee",
                invoiceNumber: invoiceNumberPassport,
                reference: transactionReference,
                amount: Math.round(metadata.baseAmountCents / 100),
                method: 'Paymongo',
                status: 'Successful',
            });

            console.log('Created transaction for passport application:', metadata.applicationId);

            const updatedApp = await PassportModel.findOneAndUpdate(
                { _id: metadata.applicationId },
                { status: "Payment Completed" },
                { new: true }
            );

            if (!updatedApp) {
                console.warn(`No passport application found with applicationId ${metadata.applicationId}`);
            } else {
                console.log("Updated status:", updatedApp.status);
            }
            console.log("Updated status:", updatedApp.status);

            await NotificationModel.create({
                userId: user._id,
                title: 'Passport Payment Successful',
                message: `Your passport application ${metadata.applicationNumber} was successful.`,
                type: 'passport',
                link: '/user-transactions',
            });

            try {
                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: `Passport Penalty Fee Payment Successful`,
                    html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Passport Penalty Fee Payment Successful!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your passport penalty fee payment has been successfully processed!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">

                                <b>Transaction Reference:</b> ${transactionReference} <br/>
                                <b>Application Number:</b> ${metadata.applicationNumber} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not make this payment, please ignore this email.
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
                });
            } catch (emailError) {
                console.error('Failed to send passport email:', emailError);
            }

            logAction('PAYMONGO_PAYMENT', user._id, { "Passport Application Paid": `Transaction Reference: ${transactionReference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Passport Application` });

            console.log('Passport payment processed successfully');
            return
        }










        //INSTALLMENT PAYMENT --------------------------------------------------------------------------
        if (metadata.transactionType === "Installment Payment") {
            console.log('💰 Installment payment detected');

            console.log('Installment payment metadata:', metadata);

            const booking = await BookingModel.findById(metadata.bookingId)
            const packageDoc = await PackageModel.findById(metadata.packageId);

            const bookingStart = dayjs(booking.travelDate.startDate).format('YYYY-MM-DD');
            const bookingEnd = dayjs(booking.travelDate.endDate).format('YYYY-MM-DD');

            const amount = metadata.baseAmountCents
                ? Number(metadata.baseAmountCents || 0) / 100
                : normalizePaymongoAmount(
                    Number(metadata.totalAmountCents || 0) / 100 ||
                    Number(sessionAttributes?.amount_total || 0) / 100
                );

            const transactionReference = generateTransactionReference();

            const { invoiceNumber: invoiceNumberInstallment } = await generateTransactionInvoiceNumber();
            await TransactionModel.create({
                bookingId: metadata.bookingId,
                packageId: metadata.packageId,
                userId: user._id,
                invoiceNumber: invoiceNumberInstallment,
                reference: transactionReference,
                amount,
                method: 'Paymongo',
                status: 'Successful',
            });

            await updateBookingPaymentStatus(metadata.bookingId);

            await NotificationModel.create({
                userId: user._id,
                title: 'Installment Payment Successful',
                message: `Your installment payment for booking ${metadata.bookingReference} was successful.`,
                type: 'payment',
                link: '/user-transactions',
            });

            try {
                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: `Installment Payment ${transactionReference} Successful`,
                    html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Installment Payment Successful!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your installment payment has been successfully processed!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">

                                <b>Transaction Reference:</b> ${transactionReference} <br/>
                                <b>Package:</b> ${packageDoc.packageName} <br/>
                                <b>Travel Dates:</b> ${bookingStart} to ${bookingEnd} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not make this payment, please ignore this email.
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
                });
            } catch (emailError) {
                console.error('Failed to send booking email:', emailError);
            }

            logAction('PAYMONGO_PAYMENT', user._id, { "Installment Payment": `Transaction Reference: ${transactionReference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Installment Payment` });

            console.log('Installment payment processed successfully');
            return
        }

        //BOOKING PAYMENT ----------------------------------------------------------------------------------------
        // if packageId exists in metadata, we know this payment is for a tour package booking, so we either update an existing booking to "Successful" status or create a new booking if it doesn't exist. We also create a transaction record for this booking payment and send a notification to the user about their confirmed booking. Finally, we send a confirmation email to the user with the booking reference. After handling the booking payment, we return early since we've completed all necessary processing for this event.
        if (metadata.bookingId && metadata.transactionType === "Booking Payment") {
            console.log('🛫 Booking payment detected');
            console.log('PackageId in metadata:', metadata.packageId);
            let booking = await BookingModel.findById(metadata.bookingId);

            if (!booking) {
                console.warn('Booking not found for ID:', metadata.bookingId);
                return console.log('Booking not found for ID:', metadata.bookingId);
            }

            const bookingStart = dayjs(booking.travelDate.startDate).format('YYYY-MM-DD');
            const bookingEnd = dayjs(booking.travelDate.endDate).format('YYYY-MM-DD');
            const packageId = booking.packageId.toString();


            const packageDoc = await PackageModel.findById(packageId);

            const updateResult = await PackageModel.updateOne(
                {
                    _id: packageDoc._id,
                    packageSpecificDate: {
                        $elemMatch: {
                            startdaterange: bookingStart,
                            enddaterange: bookingEnd,
                            slots: { $gt: 0 }
                        }
                    }
                },
                {
                    $inc: { 'packageSpecificDate.$.slots': -1 }
                }
            );

            if (updateResult.matchedCount === 0) {
                console.log('No matching date range found or no slots remaining.');
            } else if (updateResult.modifiedCount === 1) {
                console.log('Slot successfully decremented.');
                if (!booking.slotDecremented) {
                    booking.slotDecremented = true;
                    await booking.save();
                }
            }

            const amount = metadata.baseAmountCents
                ? Number(metadata.baseAmountCents || 0) / 100
                : normalizePaymongoAmount(
                    Number(metadata.totalAmountCents || 0) / 100 ||
                    Number(sessionAttributes?.amount_total || 0) / 100
                );

            const { invoiceNumber: invoiceNumberBooking } = await generateTransactionInvoiceNumber();
            await TransactionModel.create({
                bookingId: booking._id,
                packageId: booking.packageId,
                userId: user._id,
                invoiceNumber: invoiceNumberBooking,
                reference: generateTransactionReference(),
                amount,
                method: 'Paymongo',
                status: 'Successful',
            });

            const paymentType = booking?.bookingDetails?.paymentDetails?.paymentType || null;
            if (paymentType === 'deposit') {
                if (booking.status !== 'Pending') {
                    booking.status = 'Pending';
                    if (!Array.isArray(booking.statusHistory)) {
                        booking.statusHistory = [];
                    }
                    booking.statusHistory.push({ status: 'Pending', changedAt: new Date() });
                    await booking.save();
                }
            } else {
                await updateBookingPaymentStatus(booking._id);
            }

            await NotificationModel.create({
                userId: user._id,
                title: 'Booking Confirmed',
                message: `Your booking ${booking.reference} has been confirmed.`,
                type: 'booking',
                link: '/user-bookings',
                metadata: { bookingId: booking._id },
            });

            // Send booking confirmation email
            try {
                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: `Booking ${booking.reference} Confirmed`,
                    html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Booking Confirmed!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your booking has been successfully confirmed!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>Booking Reference:</b> ${booking.reference} <br/>
                                <b>Package:</b> ${packageDoc.packageName} <br/>
                                <b>Travel Dates:</b> ${bookingStart} to ${bookingEnd} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not book this trip, please ignore this email.
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
                });
            } catch (emailError) {
                console.error('Failed to send booking email:', emailError);
            }

            logAction('PAYMONGO_PAYMENT', user._id, { "Booking Payment": `Transaction Reference: ${metadata.bookingReference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Booking Payment` });

            console.log('Booking payment processed successfully');
            return
        }


        //QUOTATION PAYMENT -----------------------------------------------------------------------------
        if (metadata.bookingId && metadata.transactionType === "Quotation Payment") {
            console.log('Quotation Booking payment detected');
            console.log('PackageId in metadata:', metadata.packageId);
            let booking = await BookingModel.findById(metadata.bookingId);

            if (!booking) {
                console.warn('Booking not found for ID:', metadata.bookingId);
                return console.log('Booking not found for ID:', metadata.bookingId);
            }

            const bookingStart = dayjs(booking.travelDate.startDate).format('YYYY-MM-DD');
            const bookingEnd = dayjs(booking.travelDate.endDate).format('YYYY-MM-DD');
            const packageId = booking.packageId.toString();


            const packageDoc = await PackageModel.findById(packageId);


            const updateResult = await PackageModel.updateOne(
                {
                    _id: booking.packageId,
                    packageSpecificDate: {
                        $elemMatch: {
                            startdaterange: bookingStart,
                            enddaterange: bookingEnd,
                            slots: { $gt: 0 }
                        }
                    }
                },
                {
                    $inc: { 'packageSpecificDate.$.slots': -1 }
                }
            )

            if (updateResult.matchedCount === 0) {
                console.log('No matching date range found or no slots remaining.');
            } else if (updateResult.modifiedCount === 1) {
                console.log('Slot successfully decremented.');
                if (!booking.slotDecremented) {
                    booking.slotDecremented = true;
                    await booking.save();
                }
            }

            const amount = metadata.baseAmountCents
                ? Number(metadata.baseAmountCents || 0) / 100
                : normalizePaymongoAmount(
                    Number(metadata.totalAmountCents || 0) / 100 ||
                    Number(sessionAttributes?.amount_total || 0) / 100
                );

            const { invoiceNumber: invoiceNumberQuotation } = await generateTransactionInvoiceNumber();
            await TransactionModel.create({
                bookingId: booking._id,
                packageId: booking.packageId,
                userId: user._id,
                invoiceNumber: invoiceNumberQuotation,
                reference: generateTransactionReference(),
                amount,
                method: 'Paymongo',
                status: 'Successful',
            });

            console.log('Created transaction for Quotation:', metadata.quotationId);

            const quotation = await QuotationModel.findById(metadata.quotationId);
            console.log("Quotation found:", quotation);
            quotation.status = 'Booked';
            await quotation.save();

            const paymentType = booking?.bookingDetails?.paymentDetails?.paymentType || null;
            if (paymentType === 'deposit') {
                if (booking.status !== 'Pending') {
                    booking.status = 'Pending';
                    if (!Array.isArray(booking.statusHistory)) {
                        booking.statusHistory = [];
                    }
                    booking.statusHistory.push({ status: 'Pending', changedAt: new Date() });
                    await booking.save();
                }
            } else {
                await updateBookingPaymentStatus(booking._id);
            }

            await NotificationModel.create({
                userId: user._id,
                title: 'Booking Quotation Confirmed',
                message: `Your booking Quotation ${booking.reference} has been confirmed.`,
                type: 'booking',
                link: '/user-bookings',
                metadata: { bookingId: booking._id },
            });

            // Send booking confirmation email
            try {
                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: `Booking Quotation ${booking.reference} Confirmed`,
                    html: `
                        <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">

                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">
                                Booking Quotation Confirmed!
                            </h2>

                            <p style="color:#555; font-size:16px;">
                                Hello <b>${user.username}</b>,
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your booking for your quotation has been successfully confirmed!
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>Booking Reference:</b> ${booking.reference} <br/>
                                <b>Package:</b> ${packageDoc.packageName} <br/>
                                <b>Travel Dates:</b> ${bookingStart} to ${bookingEnd} <br/>
                                <b>Total Paid:</b> ₱${amount.toFixed(2)}

                                <p> Enjoy your trip and thank you for choosing M&RC Travel and Tours! </p>
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not book this trip, please ignore this email.
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
                });
            } catch (emailError) {
                console.error('Failed to send booking email:', emailError);
            }

            logAction('PAYMONGO_PAYMENT', user._id, { "Quotation Booking Payment": `Transaction Reference: ${metadata.bookingReference} | Amount: ₱${amount.toFixed(2)} | Payment Purpose: Quotation Booking Payment` });

            console.log('Booking payment processed successfully');
            return
        }

        // if we reach this point, it means we received a valid webhook with correct signature and metadata, but it doesn't match our expected structure for either passport or booking payments. We log this as a warning for further investigation but still return a 200 response to acknowledge receipt of the webhook. This way we avoid unnecessary retries from PayMongo while we investigate the unexpected payload structure.
        console.warn('Received unhandled webhook event with valid signature but missing expected metadata:', metadata);
    } catch (error) {
        console.log('Webhook Error:', error);
    }
};

const createCheckoutToken = async (req, res) => {
    const userId = req.userId;
    const { totalPrice } = req.body


    const token = crypto.randomUUID();

    await TokenCheckoutModel.create({
        token,
        userId,
        totalPrice: totalPrice || 29000,
        createdAt: new Date(),
    });

    res.status(201).json({ token });
};


module.exports = { createCheckoutSession, createCheckoutSessionQuotation, createCheckoutSessionPassport, createCheckoutSessionVisa, createCheckoutSessionVisaPenalty, createCheckoutSessionPassportPenalty, createCheckoutSessionDeposit, createCheckoutToken, handlePayMongoWebhook, createManualPayment, createManualPaymentQuotation, createManualPaymentDeposit, createManualPaymentVisa, createManualPaymentPassport, createManualPaymentVisaPenalty, createManualPaymentPassportPenalty };
