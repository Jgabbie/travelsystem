
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser');

const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const transactionRoute = require('./routes/transactionRoute');
const ratingRoutes = require('./routes/ratingRoutes');

require('dotenv').config();

const app = express();

app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

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

app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/transaction', transactionRoute);
app.use('/api/rating', ratingRoutes);

app.get('/', (req, res) => res.send('API Working'));

module.exports = app;


// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// const path = require('path');

// const userRoutes = require("./routes/userRoutes")
// const authRoutes = require("./routes/authRoutes")
// const logRoutes = require("./routes/logRoutes");
// const packageRoutes = require("./routes/packageRoutes");
// const adminRoutes = require("./routes/adminRoute");
// const bookingRoutes = require("./routes/bookingRoutes");
// const ratingRoutes = require("./routes/ratingRoutes");
// const wishlistRoutes = require("./routes/wishlistRoutes");
// const paymentRoutes = require("./routes/paymentRoute");
// const transactionRoute = require("./routes/transactionRoute");
// const quotationRoutes = require("./routes/quotationRoutes")
// const passportRoutes = require("./routes/passportRoutes")
// const serviceRoutes = require("./routes/serviceRoutes")
// const notificationRoutes = require("./routes/notificationRoutes")
// const visaRoutes = require("./routes/visaRoutes")
// const sendEmailRoutes = require("./routes/sendEmailRoutes")

// const rateLimit = require('express-rate-limit');

// const contactLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 5,
//     message: 'Too many requests from this IP, please try again later.'
// });

// const app = express()
// const allowedOrigins = [
//     "http://localhost:3000",
//     "https://mrctravelntoursapi.vercel.app"
// ];

// app.use(cors({
//     origin: (origin, callback) => {
//         if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
//             return callback(null, true);
//         }
//         return callback(new Error("Not allowed by CORS"));
//     },
//     credentials: true,
// }));

// app.use(cookieParser())
// app.use(express.json({ limit: '10mb' }))
// app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// mongoose.connect(process.env.MONGODB_URI)
//     .then(() => console.log('MongoDB connected'))
//     .catch(err => console.error('MongoDB connection error:', err))

// app.use('/api/user', userRoutes)
// app.use('/api/auth', authRoutes)
// app.use('/api/logs', logRoutes)
// app.use('/api/package', packageRoutes)
// app.use('/api/admin', adminRoutes)
// app.use('/api/booking', bookingRoutes)
// app.use('/api/rating', ratingRoutes)
// app.use('/api/wishlist', wishlistRoutes)
// app.use('/api/payment', paymentRoutes);
// app.use('/api/transaction', transactionRoute);
// app.use('/api/quotation', quotationRoutes);
// app.use("/api/passport", passportRoutes);
// app.use("/api/services", serviceRoutes);
// app.use("/api/notifications", notificationRoutes);
// app.use("/api/visa", visaRoutes);
// app.use("/api/email", sendEmailRoutes);

// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// app.use('/api/contactlimit', contactLimiter);

// if (process.env.NODE_ENV !== 'production') {
//     app.listen(8000, () => {
//         console.log('Server is up and running');
//     });
// }