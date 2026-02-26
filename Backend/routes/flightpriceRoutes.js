const express = require("express");
const router = express.Router();
const flightPriceController = require("../controllers/flightpriceController");

router.get("/calendar", flightPriceController.getFlightPrices);

module.exports = router;