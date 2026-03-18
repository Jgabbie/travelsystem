// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// const path = require('path');
// const serverless = require('serverless-http');

// const authRoutes = require("./routes/authRoutes");
// const userRoutes = require("./routes/userRoutes");


// // Connect to MongoDB
// let cached = global.mongoose;
// if (!cached) {
//     cached = global.mongoose = { conn: null, promise: null };
// }

// async function connectToDatabase() {
//     if (cached.conn) return cached.conn;
//     if (!cached.promise) {
//         cached.promise = mongoose.connect(process.env.MONGODB_URI) // remove options
//             .then((mongoose) => mongoose);
//     }
//     cached.conn = await cached.promise;
//     return cached.conn;
// }


// const app = express();

// // Middleware
// app.use((req, res, next) => {
//     console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//     next();
// });

// const allowedOrigins = [
//     "http://localhost:3000",
//     "https://mrctraveltours.vercel.app"
// ];

// app.use((req, res, next) => {
//     const origin = req.headers.origin;
//     if (allowedOrigins.includes(origin)) {
//         res.setHeader('Access-Control-Allow-Origin', origin);
//         res.setHeader('Access-Control-Allow-Credentials', 'true');
//         res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
//         res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
//     }

//     // Respond to OPTIONS preflight immediately
//     if (req.method === 'OPTIONS') {
//         return res.status(200).end();
//     }

//     next();
// });

// app.use(cookieParser());
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// app.use(async (req, res, next) => {
//     try {
//         await connectToDatabase();
//         next(); // proceed to the next middleware / route
//     } catch (err) {
//         console.error("DB connection failed:", err);
//         res.status(500).json({ message: "Database connection error" });
//     }
// });

// // Routes
// app.use('/api/user', userRoutes);
// app.use('/api/auth', authRoutes);
// // …all other app.use routes here…

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// // Catch-all for API routes
// app.use('/api', (req, res) => {
//     res.status(404).json({ message: 'API route not found' });
// });

// // Optional root route
// app.get('/', (req, res) => res.send("API Working"));

// // Export wrapped in serverless for Vercel
// module.exports = serverless(app);

require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http');

const authRoutes = require('./routes/authRoutes'); // your existing route file

const app = express();

// --- CORS middleware ---
const allowedOrigins = [
    'http://localhost:3000',
    'https://mrctraveltours.vercel.app'
];

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    }

    if (req.method === 'OPTIONS') return res.status(200).end(); // preflight
    next();
});

// --- Body parsing ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Routes ---
app.use('/api/auth', authRoutes);

// --- Serverless export ---
module.exports = serverless(app);