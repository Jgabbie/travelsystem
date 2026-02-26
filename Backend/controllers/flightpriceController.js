// controllers/flightController.js
const FlightPrice = require("../models/flightprice.js");
const axios = require("axios");
const dayjs = require("dayjs");

// Helper function: fetch price from API (Airlabs or any API)
const getFlightPrice = async (origin, destination, date) => {

    console.log(`Fetching price for ${origin} -> ${destination} on ${date} from API...`);
    console.log(`Using API key: ${process.env.AIRLABS_KEY}`);
    try {
        const res = await axios.get("https://airlabs.co/api/v9/schedules", {
            params: {
                dep_iata: origin,
                arr_iata: destination,
                date: date,
                api_key: process.env.AIRLABS_KEY
            }
        });

        const flights = res.data.response || [];
        if (!flights.length) return null;

        let min = Infinity;
        flights.forEach(f => {
            if (f.price && f.price < min) min = f.price;
        });

        return min === Infinity ? null : min;
    } catch (err) {
        console.error("Error fetching flight price:", err.message);
        return null;
    }
};

// Controller: fetch monthly prices (cached + lazy generation)
const getFlightPrices = async (req, res) => {
    try {
        const { origin, destination, month } = req.query; // month="2026-03"
        if (!origin || !destination || !month) {
            return res.status(400).json({ message: "Missing required parameters." });
        }

        const daysInMonth = dayjs(month + "-01").daysInMonth();
        const results = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const date = `${month}-${String(i).padStart(2, "0")}`;

            let existing = await FlightPrice.findOne({ origin, destination, date });

            // Refresh if missing or older than 24h
            if (!existing || Date.now() - new Date(existing.lastUpdated) > 86400000) {
                const price = await getFlightPrice(origin, destination, date);

                if (existing) {
                    existing.price = price;
                    existing.lastUpdated = new Date();
                    await existing.save();
                } else {
                    existing = await FlightPrice.create({
                        origin,
                        destination,
                        date,
                        price
                    });
                }
            }

            results.push(existing);
        }

        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error fetching flight prices." });
    }
};

module.exports = { getFlightPrices };