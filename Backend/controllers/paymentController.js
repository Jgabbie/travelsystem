const axios = require("axios");
const crypto = require('crypto');
const transporter = require('../config/nodemailer')
const { v4: uuidv4 } = require("uuid");
const TokenCheckoutModel = require("../models/tokencheckout");
const PackageModel = require("../models/package");
const BookingModel = require("../models/booking");
const TransactionModel = require("../models/transactions");
const UserModel = require("../models/user");
const NotificationModel = require("../models/notification");

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
            packageId,
            travelDate,
            travelerTotal,
            amount,
            paymentType,
            proofImage,
            proofImageType,
            proofFileName,
            bookingReference,
            bookingDetails
        } = req.body || {};

        if (!proofImage || !proofImageType) {
            return res.status(400).json({ error: "Proof of payment image is required." });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        let booking = null;
        if (bookingReference) {
            booking = await BookingModel.findOne({ reference: bookingReference, userId: user._id });
        }

        if (!booking) {
            if (!packageId || !travelDate || !travelerTotal || !amount) {
                return res.status(400).json({ error: "Missing required booking details." });
            }

            booking = await BookingModel.create({
                packageId,
                userId: user._id,
                bookingDate: new Date().toISOString(),
                travelDate,
                travelers: Number(travelerTotal),
                reference: generateBookingReference(),
                status: 'Pending',
                ...(bookingDetails ? { bookingDetails } : {})
            });
        } else if (bookingDetails) {
            booking.bookingDetails = bookingDetails;
            await booking.save();
        }

        const transaction = await TransactionModel.create({
            bookingId: booking._id,
            packageId: booking.packageId || packageId,
            userId: user._id,
            reference: generateTransactionReference(),
            amount: Number(amount),
            method: 'Manual',
            status: 'Pending',
            proofImage,
            proofImageType,
            proofFileName,
            paymentType
        });

        return res.status(201).json({
            message: 'Manual payment submitted for verification.',
            bookingId: booking._id,
            transactionId: transaction._id
        });
    } catch (error) {
        console.error('Manual payment error:', error.message);
        return res.status(500).json({ error: 'Failed to submit manual payment.' });
    }
};

const createCheckoutSessionPassport = async (req, res) => {
    const userId = req.userId;

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }

        const { applicationId, totalPrice, successUrl, cancelUrl, email } = req.body;

        if (!applicationId || !totalPrice || !successUrl || !cancelUrl) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const convenienceFeeCents = Math.round(totalPrice * 0.035 * 100) + 1500; // 3.5% + 15 PHP in cents
        const baseAmountCents = Math.round(totalPrice * 100);
        const finalTotalCents = baseAmountCents + convenienceFeeCents;

        const metadata = {
            userId,
            applicationId,
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

        const checkoutUrl = response.data?.data?.attributes?.url;
        if (!checkoutUrl) {
            console.error("PayMongo response missing URL:", response.data);
            return res.status(500).json({ error: "Failed to create PayMongo checkout session - URL missing" });
        }

        res.json({ url: checkoutUrl });

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

        const { applicationId, totalPrice, successUrl, cancelUrl, email } = req.body;

        if (!applicationId || !totalPrice || !successUrl || !cancelUrl) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const convenienceFeeCents = Math.round(totalPrice * 0.035 * 100) + 1500; // 3.5% + 15 PHP in cents
        const baseAmountCents = Math.round(totalPrice * 100);
        const finalTotalCents = baseAmountCents + convenienceFeeCents;

        const metadata = {
            userId,
            applicationId,
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

        const checkoutUrl = response.data?.data?.attributes?.url;
        if (!checkoutUrl) {
            console.error("PayMongo response missing URL:", response.data);
            return res.status(500).json({ error: "Failed to create PayMongo checkout session - URL missing" });
        }

        res.json({ url: checkoutUrl });

    } catch (error) {
        console.error("Visa Checkout Error:", error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data || error.message });
    }
};


//paymongo
const createCheckoutSession = async (req, res) => {
    const userId = req.userId;

    try {
        if (!process.env.PAYMONGO_SECRET_KEY) {
            return res.status(500).json({ error: "PayMongo secret key is not configured." });
        }

        const { paymentPayload } = req.body;

        const packageId = paymentPayload.packageId;
        const totalPrice = paymentPayload.totalPrice
        const travelDate = paymentPayload.travelDate;
        const travelerTotal = paymentPayload.travelerTotal;
        const successUrl = paymentPayload.successUrl;
        const cancelUrl = paymentPayload.cancelUrl;


        const package = await PackageModel.findById(packageId).select('packageName');
        const packageName = package.packageName


        const baseAmountCents = Math.round(totalPrice * 100);
        const convenienceFeeCents = Math.round((baseAmountCents * 0.035) + 1500);
        const finalTotalCents = baseAmountCents + convenienceFeeCents; //total amount with convenience fee

        //currently not being used
        const metadata = {
            ...(paymentPayload.metadata || {}),
            userId: req.userId,
            packageId,
            travelDate,
            travelerTotal,
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

            await NotificationModel.create({
                userId: user._id,
                title: 'Visa Payment Successful',
                message: `Your visa application (${metadata.applicationId}) was successful.`,
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

            await NotificationModel.create({
                userId: user._id,
                title: 'Passport Payment Successful',
                message: `Your passport application (${metadata.applicationId}) was successful.`,
                type: 'passport',
                link: '/user-transactions',
            });

            return res.status(200).send('Passport handled');
        }



        // if packageId exists in metadata, we know this payment is for a tour package booking, so we either update an existing booking to "Successful" status or create a new booking if it doesn't exist. We also create a transaction record for this booking payment and send a notification to the user about their confirmed booking. Finally, we send a confirmation email to the user with the booking reference. After handling the booking payment, we return early since we've completed all necessary processing for this event.
        if (metadata.packageId) {
            console.log('🛫 Booking payment detected');
            let booking = null;

            if (metadata.bookingReference) {
                booking = await BookingModel.findOneAndUpdate(
                    { reference: metadata.bookingReference, userId: user._id },
                    { status: 'Successful' },
                    { new: true }
                );
            }

            if (!booking) {
                booking = await BookingModel.create({
                    packageId: metadata.packageId,
                    userId: user._id,
                    bookingDate: new Date(),
                    travelDate: metadata.travelDate,
                    travelers: Number(metadata.travelerTotal || 1),
                    reference: generateBookingReference(),
                    status: 'Successful',
                });
            }

            const amount =
                Number(metadata.totalAmountCents || 0) / 100 ||
                Number(sessionAttributes?.amount_total || 0) / 100;

            await TransactionModel.create({
                bookingId: booking._id,
                packageId: metadata.packageId,
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
                    html: `<p>Your booking ${booking.reference} payment was successful.</p>`,
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





module.exports = { createCheckoutSession, createCheckoutSessionPassport, createCheckoutSessionVisa, createCheckoutToken, handlePayMongoWebhook, createManualPayment };