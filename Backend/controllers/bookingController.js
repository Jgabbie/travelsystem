const BookingModel = require('../models/booking')
const TransactionModel = require('../models/transactions')
const CancellationModel = require('../models/cancellations')
const TokenCheckoutModel = require('../models/tokencheckout')
const { v4: uuidv4 } = require('uuid');
const logAction = require('../utils/logger')
const dayjs = require('dayjs');


const generateBookingReference = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(1000 + Math.random() * 9000)
    return `BK-${timestamp}${random}`
}

const generateCancellationReference = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(1000 + Math.random() * 9000)
    return `CN-${timestamp}${random}`
}

const createBooking = async (req, res) => {
    const { bookingPayload } = req.body
    const userId = req.userId

    console.log("Creating booking with data:", bookingPayload)

    const packageId = bookingPayload.packageId
    const travelDate = bookingPayload.travelDate
    const travelers = bookingPayload.travelers
    const bookingDate = new Date().toISOString()
    const bookingDetails = bookingPayload.bookingDetails || null
    const status = bookingPayload.status || 'Pending'
    const amount = bookingPayload.amount || 0
    const expiresAt = dayjs().add(5, 'minutes').toDate() // 5 minutes from now

    //find package by name to get its id, then create booking with that package id
    try {

        if (!userId || !bookingPayload) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        // const existingBooking = await BookingModel.findOne({ checkoutToken });
        // if (existingBooking) {
        //     return res.status(200).json(existingBooking); // return existing booking
        // }

        const newBooking = await BookingModel.create({
            packageId,
            userId,
            travelDate,
            bookingDate,
            bookingDetails,
            travelers,
            reference: generateBookingReference(),
            status,
            expiresAt
        })

        console.log("New booking created:", newBooking)

        const token = uuidv4();

        const tokenCheckout = await TokenCheckoutModel.create({
            token,
            userId,
            bookingId: newBooking._id,
            amount: bookingPayload.amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });

        console.log("Token checkout created:", tokenCheckout)

        logAction('BOOKING_CREATED', userId, {
            bookingId: newBooking._id,
            packageId: packageId
        })

        const io = req.app.get('io')
        if (io) {
            io.emit('booking:created', {
                id: newBooking._id,
                createdAt: newBooking.createdAt
            })
        }

        res.status(201).json({ booking: newBooking, paymentToken: token, expiresAt: tokenCheckout.expiresAt });
    } catch (error) {
        res.status(500).json({ message: "Error creating booking", error })
        console.error("Error creating booking:", error)
    }
}

const getUserBookings = async (req, res) => {
    const userId = req.userId
    try {
        const bookings = await BookingModel.find({ userId }).sort({ createdAt: -1 })
            .populate('userId', 'username')
            .populate('packageId', 'packageName packageType')
        res.status(200).json(bookings)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error })
    }
}

const getBookingsTotalBaseOnMonth = async (req, res) => {
    const userId = req.userId;

    try {
        const startOfMonth = dayjs().startOf('month').toDate();
        const endOfMonth = dayjs().endOf('month').toDate();

        const totalBookings = await BookingModel.countDocuments({
            userId,
            createdAt: { $gte: startOfMonth, $lte: endOfMonth }
        });

        res.status(200).json({ totalBookings });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings total', error });
    }
};


const getAllBookings = async (_req, res) => {
    try {
        const bookings = await BookingModel.find({})
            .populate('userId', 'username')
            .populate('packageId', 'packageName packageType')
            .sort({ createdAt: -1 });

        res.status(200).json(bookings)
    } catch (error) {
        logAction('GET_ALL_BOOKINGS_ERROR', _req.userId, { error: error.message })
        console.error('Error fetching bookings:', error)
        res.status(500).json({ message: 'Error fetching bookings', error })
    }
}

const getBookingByReference = async (req, res) => {
    const userId = req.userId
    const { reference } = req.params

    if (!reference) {
        return res.status(400).json({ message: 'Reference is required' })
    }

    try {
        const booking = await BookingModel.findOne({ reference, userId })
            .populate('packageId', 'packageName packageType')

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' })
        }

        const transactions = await TransactionModel.find({ bookingId: booking._id })
            .sort({ createdAt: -1 }) // latest first
            .populate('packageId', 'packageName')

        return res.status(200).json({ booking, transactions })
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching booking details', error })
    }
}

const updateBooking = async (req, res) => {
    const { id } = req.params
    const { status, bookingDetails } = req.body

    try {
        const updatedBooking = await BookingModel.findByIdAndUpdate(
            id,
            {
                ...(status ? { status } : {}),
                ...(bookingDetails ? { bookingDetails } : {})
            },
            { new: true }
        )

        if (!updatedBooking) {
            return res.status(404).json({ message: 'Booking not found' })
        }

        logAction('BOOKING_UPDATED', req.userId, { bookingId: id })
        res.status(200).json(updatedBooking)
    } catch (error) {
        res.status(500).json({ message: 'Error updating booking', error })
    }
}

const deleteBooking = async (req, res) => {
    const { id } = req.params

    try {
        const deletedBooking = await BookingModel.findByIdAndDelete(id)
        if (!deletedBooking) {
            return res.status(404).json({ message: 'Booking not found' })
        }

        logAction('BOOKING_DELETED', req.userId, { bookingId: id })
        res.status(200).json({ message: 'Booking deleted' })
    } catch (error) {
        res.status(500).json({ message: 'Error deleting booking', error })
    }
}

const cancelBooking = async (req, res) => {
    const { id } = req.params
    const userId = req.userId
    const { reason, comments } = req.body || {}
    const uploadedFiles = Array.isArray(req.files) ? req.files : []
    const supportingFiles = uploadedFiles.map((file) => `/uploads/${file.filename}`)


    console.log('Cancellation form data:', {
        reason,
        comments,
        filesCount: supportingFiles.length
    });

    try {
        const booking = await BookingModel.findById(id)
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' })
        }

        if (booking.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized to cancel this booking' })
        }

        if (!reason) {
            return res.status(400).json({ message: 'Cancellation reason is required' })
        }

        booking.status = 'cancelled'
        await booking.save()
        const cancellation = await CancellationModel.create({
            bookingId: id,
            packageId: booking.packageId,
            userId,
            reference: generateCancellationReference(),
            cancellationReason: reason,
            cancellationComments: comments || '',
            cancellationDate: new Date(),
            supportingFiles,
            status: 'Pending'
        })
        logAction('BOOKING_CANCELLED', userId, { bookingId: id, reason })
        const io = req.app.get('io')
        if (io) {
            io.emit('cancellation:created', {
                id: cancellation._id,
                cancellationDate: cancellation.cancellationDate
            })
        }
        res.status(200).json({ message: 'Booking cancelled' })
    }
    catch (error) {
        res.status(500).json({ message: 'Error cancelling booking', error })
    }
}

const getcancellations = async (req, res) => {
    try {
        const cancellations = await CancellationModel.find({})
            .populate('userId', 'username email')
            .populate({
                path: 'bookingId',
                select: 'bookingDetails createdAt reference status packageId',
                populate: { path: 'packageId', select: 'packageName' }
            })
            .populate('packageId', 'packageName')
            .sort({ cancellationDate: -1 })
        res.status(200).json(cancellations)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cancellations', error })
    }
}

module.exports = { createBooking, getUserBookings, getAllBookings, getBookingsTotalBaseOnMonth, updateBooking, deleteBooking, cancelBooking, getcancellations, getBookingByReference }