require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// ... (Your route imports remain the same) ...

// --- ADD THESE BACK TO THE TOP ---
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

const app = express();

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

const allowedOrigins = [
    "http://localhost:3000",
    "https://mrctraveltours.vercel.app"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

// MUST handle the OPTIONS preflight globally
app.options('*', cors());

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- FIX 2: Database Connection Optimization ---
// On Vercel, don't use middleware for connectDB. Connect at the top level.
const DBuri = process.env.MONGODB_URI;

mongoose.connect(DBuri, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
})
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));


// --- YOUR ROUTES ---
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
// ... (all other app.use routes) ...

// --- FIX 3: Catch-all for "API Working" should be at the BOTTOM ---
// If this is at the top, it will intercept all your /api requests and return "API Working" instead of hitting your routes.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get('/', (req, res) => res.send("API Working"));

app.all('/api/*', (req, res) => {
    res.status(404).json({ message: 'API route not found' });
});

module.exports = app;