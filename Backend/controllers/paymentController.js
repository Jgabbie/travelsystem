const axios = require("axios");
const crypto = require('crypto');
const transporter = require('../config/nodemailer')
const { v4: uuidv4 } = require("uuid");
const dayjs = require('dayjs');
const TokenCheckoutModel = require("../models/tokencheckout");
const PackageModel = require("../models/package");
const BookingModel = require("../models/booking");
const TransactionModel = require("../models/transactions");
const UserModel = require("../models/user");
const NotificationModel = require("../models/notification");
const PassportModel = require("../models/passport");
const VisaModel = require("../models/visas");

const generateBookingReference = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `BK-${timestamp}${random}`;
};

const generateTransactionReference = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(1000 + Math.random() * 9000);
    return `TX-${timestamp}${random}`;
};

const parsePayMongoSignature = (signatureHeader) => {
    if (!signatureHeader) return null;
    const parts = signatureHeader.split(',').map((part) => part.trim());
    const signatureMap = parts.reduce((acc, part) => {
        const [key, value] = part.split('=');
        if (key && value) acc[key] = value;
        return acc;
    }, {});
    const signature = signatureMap.v1 || signatureMap.te;
    if (!signatureMap.t || !signature) return null;
    return { timestamp: signatureMap.t, signature };
};

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

        console.log("Manual payment request body:", req.body);

        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
        const token = uuidv4();

        const tokenCheckout = await TokenCheckoutModel.create({
            token,
            userId,
            bookingId,
            amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });

        console.log("Token checkout created for manual deposit:", tokenCheckout);

        const reference = generateTransactionReference();

        if (!proofImage || !proofImageType) {
            return res.status(400).json({ error: "Proof of payment image is required." });
        }

        const transaction = await TransactionModel.create({
            bookingId,
            packageId,
            userId,
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

        console.log("Start Date:", bookingStart);
        console.log("End Date:", bookingEnd);

        const packageDoc = await PackageModel.findById(packageId);
        console.log("packageSpecificDate array:", packageDoc.packageSpecificDate);

        const updateResult = await PackageModel.updateOne(
            {
                _id: packageId,
                packageSpecificDate: {
                    $elemMatch: {
                        startdaterange: { $lte: booking.travelDate.startDate },
                        enddaterange: { $gte: booking.travelDate.endDate },
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
        }

        console.log('Manual payment deposit created:', transaction);

        return res.status(200).json({
            redirectUrl: `/booking-payment/success?token=${token}`
        });

    } catch (error) {
        console.error('Manual payment error:', error.message);
        return res.status(500).json({ error: 'Failed to submit manual payment.' });
    }
};

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

        const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
        const token = uuidv4();

        const tokenCheckout = await TokenCheckoutModel.create({
            token,
            userId,
            bookingId,
            amount: amount.amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });

        console.log("Token checkout created for manual deposit:", tokenCheckout);

        const reference = generateTransactionReference();

        if (!proofImage || !proofImageType) {
            return res.status(400).json({ error: "Proof of payment image is required." });
        }

        const transaction = await TransactionModel.create({
            bookingId,
            packageId,
            userId,
            reference,
            amount: Number(amount.amount),
            method: 'Manual',
            status: 'Pending',
            proofImage,
            proofImageType,
            proofFileName,
        });


        console.log('Manual payment deposit created:', transaction);

        return res.status(200).json({
            redirectUrl: `/booking-payment/success?token=${token}`
        });


        // Implementation for creating manual payment deposit
    } catch (error) {
        console.error('Manual payment deposit error:', error.message);
        return res.status(500).json({ error: 'Failed to submit manual payment deposit.' });
    }
};

const createCheckoutSessionPassport = async (req, res) => {
    const userId = req.userId;

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }

        const { applicationId, applicationNumber, totalPrice, successUrl, cancelUrl, email } = req.body;

        if (!applicationId || !applicationNumber || !totalPrice || !successUrl || !cancelUrl) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const convenienceFeeCents = Math.round(totalPrice * 0.035 * 100) + 1500; // 3.5% + 15 PHP in cents
        const baseAmountCents = Math.round(totalPrice * 100);
        const finalTotalCents = baseAmountCents + convenienceFeeCents;

        const metadata = {
            userId,
            applicationId,
            applicationNumber,
            applicationType: "Passport Application",
            email,
            baseAmountCents,
            convenienceFeeCents,
            totalAmountCents: finalTotalCents,
        };

        const response = await axios.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            {
                data: {
                    attributes: {
                        billing: {
                            name: "Passport Applicant",
                            email: email || "test@example.com",
                        },
                        line_items: [
                            {
                                name: "Passport Assistance",
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
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya"], // start with card first
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

        // Then safely extract checkout URL
        if (response.status !== 200) {
            console.error("PayMongo API Error:", response.data);
            return res.status(500).json({ error: "Failed to create checkout session" });
        }

        res.json(response.data);

    } catch (error) {
        console.error("Passport Checkout Error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
};

const createCheckoutSessionVisa = async (req, res) => {
    const userId = req.userId;

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }

        const { applicationId, applicationNumber, totalPrice, successUrl, cancelUrl, email } = req.body;

        if (!applicationId || !applicationNumber || !totalPrice || !successUrl || !cancelUrl) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const convenienceFeeCents = Math.round(totalPrice * 0.035 * 100) + 1500; // 3.5% + 15 PHP in cents
        const baseAmountCents = Math.round(totalPrice * 100);
        const finalTotalCents = baseAmountCents + convenienceFeeCents;

        const metadata = {
            userId,
            applicationId,
            applicationNumber,
            applicationType: "Visa Application",
            email,
            baseAmountCents,
            convenienceFeeCents,
            totalAmountCents: finalTotalCents,
        };

        const response = await axios.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            {
                data: {
                    attributes: {
                        billing: {
                            name: "Visa Applicant",
                            email: email || "test@example.com",
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
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya"], // start with card first
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

        // Then safely extract checkout URL
        if (response.status !== 200) {
            console.error("PayMongo API Error:", response.data);
            return res.status(500).json({ error: "Failed to create checkout session" });
        }

        res.json(response.data);

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

        console.log("Received payment payload for deposit:", paymentPayload);

        const bookingId = paymentPayload.bookingId;
        const totalPrice = paymentPayload.totalPrice
        const token = uuidv4();

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

        console.log("Deposit payment payload:", paymentPayload);

        const package = await PackageModel.findById(packageId).select('packageName');
        const packageName = package.packageName

        const baseAmountCents = Math.round(totalPrice * 100);
        const convenienceFeeCents = Math.round((baseAmountCents * 0.035) + 1500);
        const finalTotalCents = baseAmountCents + convenienceFeeCents; //total amount with convenience fee

        const username = await UserModel.findById(userId).select('username');
        const email = await UserModel.findById(userId).select('email');

        console.log("Token checkout created:", tokenCheckout)

        console.log("Namespace variables:", { username, email });

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

        const response = await axios.post(
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
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya"],
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


        if (response.status !== 200) {
            console.error("PayMongo API Error:", response.data);
            return res.status(500).json({ error: "Failed to create checkout session" });
        }

        res.json(response.data);
    } catch (error) {
        console.error("PayMongo error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
}

//paymongo
const createCheckoutSession = async (req, res) => {
    const userId = req.userId;
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

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

        console.log("Found token document:", tokenDoc);

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

        console.log("Booking details:", { packageName, totalPrice });

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

        console.log("Creating PayMongo checkout session with metadata:", metadata);

        const response = await axios.post(
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
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya"],
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


        if (response.status !== 200) {
            console.error("PayMongo API Error:", response.data);
            return res.status(500).json({ error: "Failed to create checkout session" });
        }

        res.json(response.data);
    } catch (error) {
        console.error("PayMongo error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
};


//paymongo webhook handler
const handlePayMongoWebhook = async (req, res) => {
    console.log('🚀 Webhook HIT!');
    try {

        //check if secret key exists
        if (!process.env.PAYMONGO_WEBHOOK_SECRET) {
            return res.status(500).send('Webhook secret not configured');
        }

        //if the request body is a buffer, convert it to string for signature verification
        const rawBody = Buffer.isBuffer(req.body)
            ? req.body.toString('utf8')
            : JSON.stringify(req.body || {});

        //webhooks of paymongo will have a signature in the header that we need to parse and verify to ensure the request is really from paymongo
        const signatureHeader = req.headers['paymongo-signature'];
        const parsedSignature = parsePayMongoSignature(signatureHeader);

        if (!parsedSignature) {
            return res.status(400).send('Missing or invalid PayMongo signature');
        }

        const signedPayload = `${parsedSignature.timestamp}.${rawBody}`; //time paymongo sent the webhook and the payload (rawBody)
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
            return res.status(400).send('Invalid PayMongo signature');
        }

        // At this point, we have verified that the webhook is legitimately from PayMongo. Now we can safely parse the payload and handle the event.
        const payload = Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;
        const eventType = payload?.data?.attributes?.type;
        if (!eventType) {
            console.error('Invalid webhook payload');
            return res.status(400).send('Invalid payload');
        }

        console.log('📦 Parsed Payload:', JSON.stringify(payload, null, 2));

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
                const sessionResponse = await axios.get(
                    `https://api.paymongo.com/v1/checkout_sessions/${sessionId}`,
                    {
                        headers: {
                            Authorization: `Basic ${Buffer.from(
                                process.env.PAYMONGO_SECRET_KEY + ':'
                            ).toString('base64')}`,
                        },
                    }
                );
                sessionAttributes = sessionResponse.data?.data?.attributes;
                metadata = sessionAttributes?.metadata || {};
                console.log('✅ Session metadata:', metadata);
            } catch (err) {
                console.error('❌ Failed to fetch session:', err.response?.data || err.message);
            }
        }

        // checks if the metadata contains the necessary identifiers to link this payment to a user and a booking/application. If not, we log a warning and exit gracefully since we can't process this payment without that information. This is a safeguard against processing incomplete or malformed webhook events.
        if (!metadata.userId && !metadata.applicationId && !metadata.packageId) {
            console.warn('Missing metadata; cannot process');
            return res.status(200).send('Event received');
        }

        const user = await UserModel.findById(metadata.userId);
        if (!user) return res.status(200).send('User not found');

        console.log('metadata:', metadata);

        if (metadata.applicationId && metadata.applicationType === "Visa Application") {
            console.log('🛂 Visa payment detected');
            const amount =
                Number(metadata.totalAmountCents || 0) / 100 ||
                Number(sessionAttributes?.amount_total || 0) / 100;

            await TransactionModel.create({
                userId: user._id,
                applicationId: metadata.applicationId,
                applicationType: "Visa Application",
                reference: generateTransactionReference(),
                amount,
                method: 'Paymongo',
                status: 'Successful',
            });

            console.log('Created transaction for visa application:', metadata.applicationId);

            const updatedVisa = await VisaModel.findOneAndUpdate(
                { _id: metadata.applicationId }, // filter object
                {
                    $set: { status: ["Payment Complete"], currentStepIndex: 1 } // replace array & update progress
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
                message: `Your visa application (${metadata.applicationNumber}) was successful.`,
                type: 'visa',
                link: '/user-transactions',
            });

            return res.status(200).send('Visa handled');
        }

        // if applicationId exists in metadata, we know this payment is for a passport application, so we create a transaction record linked to that application and send a notification to the user. We also send a confirmation email to the user about their passport payment. After handling the passport payment, we return early since we don't want to accidentally process it as a booking payment as well.
        if (metadata.applicationId && metadata.applicationType === "Passport Application") {
            console.log('🛂 Passport payment detected');
            const amount =
                Number(metadata.totalAmountCents || 0) / 100 ||
                Number(sessionAttributes?.amount_total || 0) / 100;

            await TransactionModel.create({
                userId: user._id,
                applicationId: metadata.applicationId,
                applicationType: "Passport Application",
                reference: generateTransactionReference(),
                amount,
                method: 'Paymongo',
                status: 'Successful',
            });

            console.log('Created transaction for passport application:', metadata.applicationId);

            const updatedApp = await PassportModel.findOneAndUpdate(
                { _id: metadata.applicationId },
                { status: "Payment complete" },
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
                message: `Your passport application (${metadata.applicationNumber}) was successful.`,
                type: 'passport',
                link: '/user-transactions',
            });

            return res.status(200).send('Passport handled');
        }

        if (metadata.transactionType === "Installment Payment") {
            console.log('💰 Installment payment detected');

            console.log('Installment payment metadata:', metadata);

            const amount =
                Number(metadata.totalAmountCents || 0) / 100 ||
                Number(sessionAttributes?.amount_total || 0) / 100;

            await TransactionModel.create({
                bookingId: metadata.bookingId,
                packageId: metadata.packageId,
                userId: user._id,
                reference: generateTransactionReference(),
                amount,
                method: 'Paymongo',
                status: 'Successful',
            });

            await NotificationModel.create({
                userId: user._id,
                title: 'Installment Payment Successful',
                message: `Your installment payment for booking ${metadata.bookingReference} was successful.`,
                type: 'payment',
                link: '/user-transactions',
            });

            return res.status(200).send('Installment handled');
        }

        // if packageId exists in metadata, we know this payment is for a tour package booking, so we either update an existing booking to "Successful" status or create a new booking if it doesn't exist. We also create a transaction record for this booking payment and send a notification to the user about their confirmed booking. Finally, we send a confirmation email to the user with the booking reference. After handling the booking payment, we return early since we've completed all necessary processing for this event.
        if (metadata.bookingId && metadata.transactionType === "Booking Payment") {
            console.log('🛫 Booking payment detected');
            console.log('PackageId in metadata:', metadata.packageId);
            let booking = await BookingModel.findById(metadata.bookingId);

            if (!booking) {
                console.warn('Booking not found for ID:', metadata.bookingId);
                return res.status(404).send('Booking not found');
            }

            const bookingStart = dayjs(booking.travelDate.startDate).format('YYYY-MM-DD');
            const bookingEnd = dayjs(booking.travelDate.endDate).format('YYYY-MM-DD');
            const packageId = booking.packageId.toString();

            console.log("Start Date:", bookingStart);
            console.log("End Date:", bookingEnd);

            const packageDoc = await PackageModel.findById(packageId);
            console.log("Fetched package document:", packageDoc);
            console.log("packageSpecificDate array:", packageDoc.packageSpecificDate);

            const updateResult = await PackageModel.updateOne(
                {
                    _id: packageDoc._id,
                    packageSpecificDate: {
                        $elemMatch: {
                            startdaterange: { $lte: booking.travelDate.startDate },
                            enddaterange: { $gte: booking.travelDate.endDate },
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
            }

            // Update the booking status
            booking.status = 'Successful';
            await booking.save();

            // if (!booking) {
            //     booking = await BookingModel.create({
            //         packageId: metadata.packageId,
            //         userId: user._id,
            //         bookingDate: new Date(),
            //         travelDate: metadata.travelDate,
            //         travelers: Number(metadata.travelerTotal || 1),
            //         reference: generateBookingReference(),
            //         status: 'Successful',
            //     });
            // }

            const amount =
                Number(metadata.totalAmountCents || 0) / 100 ||
                Number(sessionAttributes?.amount_total || 0) / 100;

            await TransactionModel.create({
                bookingId: booking._id,
                packageId: booking.packageId,
                userId: user._id,
                reference: generateTransactionReference(),
                amount,
                method: 'Paymongo',
                status: 'Successful',
            });

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
                        <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
                        <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">

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

                            <p style="color:#aaa; font-size:12px;">
                                © ${new Date().getFullYear()} M&RC Travel and Tours <br/>
                                Making your travel dreams come true.
                            </p>

                        </div>
                    </div>
            `
                });
            } catch (emailError) {
                console.error('Failed to send booking email:', emailError);
            }

            return res.status(200).send('Booking handled');
        }

        // if we reach this point, it means we received a valid webhook with correct signature and metadata, but it doesn't match our expected structure for either passport or booking payments. We log this as a warning for further investigation but still return a 200 response to acknowledge receipt of the webhook. This way we avoid unnecessary retries from PayMongo while we investigate the unexpected payload structure.
        console.warn('Received unhandled webhook event with valid signature but missing expected metadata:', metadata);
        res.status(200).send('Event received');
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
};

const createCheckoutToken = async (req, res) => {
    // const { quotationId, travelers } = req.body;
    const userId = req.userId;
    const { totalPrice } = req.body

    // const quotation = await QuotationModel.findById(quotationId);
    // if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    // console.log(quotation)
    const token = uuidv4();

    await TokenCheckoutModel.create({
        token,
        userId,
        totalPrice: totalPrice || 29000,
        createdAt: new Date(),
    });

    res.status(201).json({ token });
};





module.exports = { createCheckoutSession, createCheckoutSessionPassport, createCheckoutSessionVisa, createCheckoutSessionDeposit, createCheckoutToken, handlePayMongoWebhook, createManualPayment, createManualPaymentDeposit };