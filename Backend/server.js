require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

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
const passportRoutes = require("./routes/passportRoutes")
const serviceRoutes = require("./routes/serviceRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const visaRoutes = require("./routes/visaRoutes")
const sendEmailRoutes = require("./routes/sendEmailRoutes")
const preferencesRoutes = require("./routes/preferencesRoutes")
const uploadRoutes = require("./routes/uploadRoutes")

const rateLimit = require('express-rate-limit');

const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many requests from this IP, please try again later.'
});

const app = express()
const allowedOrigins = [
    "http://localhost:3000",
    "https://mrctravelandtours.com",
    "https://www.mrctravelandtours.com",
    "https://lively-smoke-07f042800.7.azurestaticapps.net"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));

app.use(cookieParser())
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        // Only store rawBody for the webhook route to save memory
        if (req.originalUrl.includes('/api/payment/webhook')) {
            console.log('✅ RawBody captured for:', req.originalUrl);
            req.rawBody = buf;
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGODB_URI)
            .then((mongooseInstance) => mongooseInstance);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (err) {
        console.error('DB connection failed:', err);
        res.status(500).json({ message: 'Database connection error' });
    }
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
app.use("/api/preferences", preferencesRoutes);
app.use("/api/upload", uploadRoutes);

//might remove later
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use('/api/contactlimit', contactLimiter);

app.get('/api/test', (_req, res) => {
    res.json({ message: 'API is working!' });
});

app.get('/', (_req, res) => res.send('API Working'));

const isServerless = Boolean(process.env.VERCEL);
if (!isServerless) {
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
                    return callback(null, true);
                }
                return callback(new Error("Not allowed by CORS"));
            },
            credentials: true,
        },
    });

    app.set('io', io);

    // Use the PORT variable provided by the host, default to 8080
    //const LOCAL_PORT = 8000
    const PORT = 8080; //change to 8000 for local testing, 8080 for cloud deployment

    // Remove the 'production' check so it actually runs on the cloud
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is up and running on port ${PORT}`);
    });
}

module.exports = app;