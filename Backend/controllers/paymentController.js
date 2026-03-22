const axios = require("axios");
const crypto = require('crypto');
const { v4: uuidv4 } = require("uuid");
const TokenCheckoutModel = require("../models/tokencheckout");
const PackageModel = require("../models/package");
const QuotationModel = require("../models/quotations");
const BookingModel = require("../models/booking");
const TransactionModel = require("../models/transactions");
const UserModel = require("../models/user");

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


        //currently not being used
        const metadata = {
            ...(paymentPayload.metadata || {}),
            userId: req.userId,
            packageId,
            travelDate,
            travelerTotal
        };


        console.log("Received payment payload:", paymentPayload);

        const package = await PackageModel.findById(packageId).select('packageName');
        const packageName = package.packageName

        console.log("Package Name:", packageName);


        // 1. Calculate the Convenience Fee (e.g., 3.5% + 15 Pesos)
        // We calculate this in cents to avoid floating point issues
        const baseAmountCents = Math.round(totalPrice * 100);
        const convenienceFeeCents = Math.round((baseAmountCents * 0.035) + 1500);

        const finalTotalCents = baseAmountCents + convenienceFeeCents; //total amount with convenience fee

        console.log(`Creating PayMongo Checkout Session: Base=${baseAmountCents} cents, Fee=${convenienceFeeCents} cents, Total=${finalTotalCents} cents`);

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
    try {
        const event = req.body?.data?.attributes?.type;
        const eventData = req.body?.data?.attributes?.data?.attributes || {};
        const sessionData = req.body?.data?.attributes || {};

        if (!event) {
            console.error('Invalid webhook payload received');
            return res.status(400).send('Invalid payload');
        }

        if (event === 'checkout_session.payment.paid') {
            const metadata = eventData.metadata || sessionData.metadata || {};

            // Your existing logic...
            if (!metadata.userId) {
                console.error('Missing userId in PayMongo metadata.');
                return res.status(200).send('Event received');
            }

            const user = await UserModel.findById(metadata.userId);
            if (!user) {
                throw new Error('User not found for PayMongo metadata userId.');
            }

            // Create Booking and Transaction...
            const travelerTotal = Number(metadata.travelerTotal || 0);
            const newBooking = await BookingModel.create({
                packageId: metadata.packageId,
                userId: user._id,
                bookingDate: new Date().toISOString(),
                travelDate: metadata.travelDate,
                travelers: travelerTotal,
                reference: generateBookingReference(),
                status: 'Successful'
            });

            await TransactionModel.create({
                bookingId: newBooking._id,
                packageId: metadata.packageId,
                userId: user._id,
                reference: generateTransactionReference(),
                amount: (eventData.paid_amount || eventData.amount || sessionData.amount_total || 0) / 100,
                method: 'Paymongo',
                status: 'Successful',
            });
        }

        // IMPORTANT: Always return 200 so PayMongo stops retrying the request
        res.status(200).send('Event received');
    } catch (error) {
        console.error('Webhook Error:', error.message);
        // We still send 200 or 400 here depending on if you want PayMongo to retry
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
};



//hitpay
const hitpayPayment = async (req, res) => {
    try {
        const { totalPrice, orderId, email } = req.body;

        const isProduction = process.env.NODE_ENV === 'production';
        const baseUrl = isProduction
            ? 'https://api.hit-pay.com/v1/payment-requests'
            : 'https://api.sandbox.hit-pay.com/v1/payment-requests';

        const params = new URLSearchParams();
        params.append('amount', totalPrice);
        params.append('currency', 'SGD');
        params.append('reference_number', orderId);
        params.append('email', email);


        // Update these to your actual frontend and backend URLs
        params.append('redirect_url', 'http://localhost:3000/payment-success');
        params.append('webhook', 'https://your-ngrok-url.ngrok-free.app/api/payment/webhook/hitpay');

        const response = await axios.post(baseUrl, params, {
            headers: {
                'X-BUSINESS-API-KEY': process.env.HITPAY_SECRET_KEY,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        console.log(`HitPay Request Created: ${response.data.id}`);

        // IMPORTANT: Send the URL back to the frontend
        res.status(200).json({ url: response.data.url });

    } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        console.error('HitPay Integration Error:', errorMsg);
        res.status(500).json({ error: `Payment failed: ${errorMsg}` });
    }
};

//hitpay webhook handler
const handleHitPayWebhook = async (req, res) => {
    try {
        const data = req.body;
        const receivedHmac = data.hmac;
        const salt = process.env.HITPAY_SALT; // Found in HitPay Settings > API Keys

        // 1. SECURE STEP: Verify HMAC Signature
        // We remove 'hmac' from the data, then hash the rest to see if it matches
        const { hmac, ...fields } = data;

        // Sort keys alphabetically (HitPay requirement for HMAC)
        const sortedKeys = Object.keys(fields).sort();
        const queryString = sortedKeys
            .map(key => `${key}${fields[key]}`)
            .join('');

        const computedHmac = crypto
            .createHmac('sha256', salt)
            .update(queryString)
            .digest('hex');

        if (computedHmac !== receivedHmac) {
            console.error("Invalid HitPay Signature!");
            return res.status(401).send('Unauthorized');
        }

        if (data.status === 'completed') {
            const referenceNumber = data.reference_number;
            console.log(`Payment successful for: ${referenceNumber}`);
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('Webhook Error:', error.message);
        res.status(500).send('Internal Server Error');
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





module.exports = { createCheckoutSession, createCheckoutToken, hitpayPayment, handleHitPayWebhook, handlePayMongoWebhook };