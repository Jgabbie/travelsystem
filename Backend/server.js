require("dotenv").config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')

const userRoutes = require("./routes/userRoutes")
const authRoutes = require("./routes/authRoutes")
const logRoutes = require("./routes/logRoutes");
const packageRoutes = require("./routes/packageRoutes");
const adminRoutes = require("./routes/adminRoute");
const bookingRoutes = require("./routes/bookingRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const paymentRoutes = require("./routes/paymentRoute");
const transactionRoute = require("./routes/transactionRoute");
const quotationRoutes = require("./routes/quotationRoutes")
const flightPriceRoutes = require("./routes/flightpriceRoutes")
const passportRoutes = require("./routes/passportRoutes")

const app = express()
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(cookieParser())
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true, limit: '5mb' }))

app.get('/', (req, res) => res.send("API Working"))

mongoose.connect("mongodb://localhost:27017/travelsystem")
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err))

app.use('/api/user', userRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/package', packageRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/booking', bookingRoutes)
app.use('/api/rating', ratingRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/payment', paymentRoutes);
app.use('/api/transaction', transactionRoute);
app.use('/api/quotation', quotationRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/flights", flightPriceRoutes);
app.use("/api/passport", passportRoutes);


app.listen(8000, () => {
    console.log('Server is up and running');
})