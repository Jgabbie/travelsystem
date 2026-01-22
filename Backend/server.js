require("dotenv").config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const userRoutes = require("./routes/userRoutes")
const authRoutes = require("./routes/authRoutes")


const app = express()
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => res.send("API Working"))

mongoose.connect("mongodb://localhost:27017/travelsystem")
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err))

app.use('/api/user', userRoutes)
app.use('/api/auth', authRoutes)


app.listen(8000, () => {
    console.log('Server is up and running');
})