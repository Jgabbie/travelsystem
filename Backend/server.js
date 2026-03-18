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


const corsOptions = {
    origin: "https://mrctraveltours.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true
};

app.use(cors(corsOptions));


let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGODB_URI) // remove options
            .then((mongoose) => mongoose);
    }
    cached.conn = await cached.promise;
    return cached.conn;
}

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next(); // proceed to the next middleware / route
    } catch (err) {
        console.error("DB connection failed:", err);
        res.status(500).json({ message: "Database connection error" });
    }
});


app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);


app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.use('/api', (req, res) => {
    res.status(404).json({ message: 'API route not found' });
});


app.get('/', (req, res) => res.send("API Working"));


module.exports = serverless(app);


// require('dotenv').config();
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// const path = require('path');