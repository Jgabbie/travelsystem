require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// ... (Your route imports remain the same) ...

const app = express();

const allowedOrigins = [
    "http://localhost:3000",
    "https://mrctraveltoursapi.vercel.app",
    "https://mrctraveltours.vercel.app",
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};

// --- FIX 1: Use Regex Literals (No quotes) to avoid PathError ---
app.use(cors(corsOptions));
app.options(/^(.*)$/, cors(corsOptions));

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

// Remove the app.use(async (req, res, next) => { await connectDB(); ... }) block entirely.

// --- YOUR ROUTES ---
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
// ... (all other app.use routes) ...

// --- FIX 3: Catch-all for "API Working" should be at the BOTTOM ---
// If this is at the top, it will intercept all your /api requests and return "API Working" instead of hitting your routes.
app.get('/', (req, res) => res.send("API Working"));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

module.exports = app;