require("dotenv").config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const path = require('path')
const cookieParser = require('cookie-parser')

const userRoutes = require("../routes/userRoutes")
const authRoutes = require("../routes/authRoutes")
const logRoutes = require("../routes/logRoutes");
const packageRoutes = require("../routes/packageRoutes");
const adminRoutes = require("../routes/adminRoute");
const bookingRoutes = require("../routes/bookingRoutes");
const ratingRoutes = require("../routes/ratingRoutes");
const wishlistRoutes = require("../routes/wishlistRoutes");
const paymentRoutes = require("../routes/paymentRoute");
const transactionRoute = require("../routes/transactionRoute");
const quotationRoutes = require("../routes/quotationRoutes")
const passportRoutes = require("../routes/passportRoutes")
const serviceRoutes = require("../routes/serviceRoutes")
const notificationRoutes = require("../routes/notificationRoutes")
const visaRoutes = require("../routes/visaRoutes")
const sendEmailRoutes = require("../routes/sendEmailRoutes")

const rateLimit = require('express-rate-limit');

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

const app = express()

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://localhost:19006",
    "https://mrctraveltoursapi.vercel.app"
];


const corsOptions = {
    origin: (origin, callback) => {
        if (
            !origin ||
            allowedOrigins.includes(origin) ||
            origin.endsWith(".vercel.app")
        ) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/', (req, res) => res.send("API Working"))

const DBuri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travelsystem';

let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;

    const db = await mongoose.connect(process.env.MONGODB_URI);
    isConnected = db.connections[0].readyState;
};

app.use(async (req, res, next) => {
    await connectDB();
    next();
});

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
app.use("/api/passport", passportRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/visa", visaRoutes);
app.use("/api/email", sendEmailRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use('/api/contactlimit', contactLimiter);


module.exports = app;