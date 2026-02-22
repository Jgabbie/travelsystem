const axios = require("axios");

const createCheckoutSession = async (req, res) => {
    try {
        const successUrl = req.body?.successUrl || "http://localhost:3000/home";
        const cancelUrl = req.body?.cancelUrl || "http://localhost:3000/home";
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
                                name: "Baguio City Tour",
                                quantity: 1,
                                amount: 2900000,
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

module.exports = { createCheckoutSession };