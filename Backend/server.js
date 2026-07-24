import dotenv from 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';


import faqsRoutes from "./routes/faqsRoutes.js";
import paymentMethodRoutes from "./routes/paymentmethodRoutes.js";
import dfaLocationRoutes from "./routes/dfalocationRoutes.js";
import packageTagRoutes from "./routes/packageTagRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import packageRoutes from "./routes/packageRoutes.js";
import adminRoutes from "./routes/adminRoute.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import ratingRoutes from "./routes/ratingRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import paymentRoutes from "./routes/paymentRoute.js";
import transactionRoute from "./routes/transactionRoute.js";
import quotationRoutes from "./routes/quotationRoutes.js";
import passportRoutes from "./routes/passportRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import visaRoutes from "./routes/visaRoutes.js";
import sendEmailRoutes from "./routes/sendEmailRoutes.js";
import preferencesRoutes from "./routes/preferencesRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import recommendationsRoutes from "./routes/recommendations.js";
import { startBillingDeadlineScheduler } from './utils/billingDeadlineScheduler.js';
import { startCleanupScheduler } from './utils/cleanupBookings.js';
import { startPassportDeadlineScheduler } from './utils/passportDeadlineScheduler.js';
import { startVisaDeadlineScheduler } from './utils/visaDeadlineScheduler.js';
import { startTravelReminderScheduler } from './utils/travelReminderScheduler.js';
import rateLimit from 'express-rate-limit';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        if (req.originalUrl.includes('/api/payment/webhook')) {
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
        cached.promise = mongoose.connect(process.env.MONGODB_URI, {
            dbName: process.env.MONGODB_DB
        })
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
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use("/api/package-tags", packageTagRoutes);
app.use("/api/dfa-locations", dfaLocationRoutes);
app.use("/api/payment-methods", paymentMethodRoutes);
app.use("/api/faqs", faqsRoutes);

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

    const PORT = 8080; //change to 8000 for local testing, 8080 for cloud deployment

    // Remove the 'production' check so it actually runs on the cloud
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is up and running on port ${PORT}`);

        connectToDatabase()
            .then(() => {
                startBillingDeadlineScheduler();
                console.log('Billing deadline scheduler started.');

                startCleanupScheduler();
                console.log('Cleanup scheduler started.');

                startPassportDeadlineScheduler();
                console.log('Passport deadline scheduler started.');

                startVisaDeadlineScheduler();
                console.log('Visa deadline scheduler started.');

                startTravelReminderScheduler();
                console.log('Travel reminder scheduler started.');
            })
            .catch((error) => {
                console.error('Failed to start schedulers:', error);
            });
    });
}

export default app;