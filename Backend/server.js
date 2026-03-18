require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const serverless = require('serverless-http');

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// --- CORS must come first ---
const allowedOrigins = [
    "http://localhost:3000",
    "https://mrctraveltours.vercel.app"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

// --- Handle preflight OPTIONS requests globally ---
app.options('*', cors({
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200
}));

// --- Other middleware ---
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- MongoDB connection ---
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectToDatabase() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGODB_URI)
            .then(mongoose => mongoose);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error("DB connection failed:", err);
        res.status(500).json({ message: "Database connection error" });
    }
});

// --- Logging middleware ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// --- Routes ---
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);

// --- Static files ---
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Root and catch-all ---
app.get('/', (req, res) => res.send("API Working"));
app.use('/api', (req, res) => res.status(404).json({ message: 'API route not found' }));

// --- Export serverless ---
module.exports = serverless(app);