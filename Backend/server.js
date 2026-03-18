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

// Middleware
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
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.options('*', cors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// Routes
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
// …all other app.use routes here…

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Catch-all for API routes
app.all('/api/*', (req, res) => {
    res.status(404).json({ message: 'API route not found' });
});

// Optional root route
app.get('/', (req, res) => res.send("API Working"));

// Export wrapped in serverless for Vercel
module.exports = serverless(app);