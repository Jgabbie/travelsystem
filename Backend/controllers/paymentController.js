const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const TokenCheckoutModel = require("../models/tokencheckout");
const QuotationModel = require("../models/quotations");

const createCheckoutSession = async (req, res) => {
    try {
        const totalPrice = req.body?.totalPrice
        const packageName = req.body?.packageName || 'Tour Package'
        const travelersCount = req.body?.travelersCount || 1
        const successUrl = req.body?.successUrl
        const cancelUrl = req.body?.cancelUrl

        console.log("Creating checkout session with URLs:", { successUrl, cancelUrl });

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
                                name: packageName,
                                quantity: 1,
                                amount: totalPrice * 100, // Convert to cents
                                currency: "PHP",
                            },
                        ],
                        payment_method_types: ["card", "gcash", "grab_pay", "paymaya"],
                        success_url: successUrl,
                        cancel_url: cancelUrl,
                    },
                },
            },
            {
                headers: {
                    Authorization:
                        "Basic " +
                        Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString(
                            "base64"
                        ),
                    "Content-Type": "application/json",
                },
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error(
            "PayMongo error:",
            error.response?.data || error.message
        );

        res.status(500).json({
            error: error.response?.data || error.message,
        });
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





module.exports = { createCheckoutSession, createCheckoutToken };