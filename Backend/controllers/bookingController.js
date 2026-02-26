const BookingModel = require('../models/booking')
const PackageModel = require('../models/package')
const CancellationModel = require('../models/cancellations')
const logAction = require('../utils/logger')

const generateBookingReference = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(1000 + Math.random() * 9000)
    return `BK-${timestamp}${random}`
}

const createBooking = async (req, res) => {
    const { packageId, bookingDetails, checkoutToken } = req.body
    const userId = req.userId
    const { packageName } = bookingDetails || {}

    console.log(bookingDetails)

    //find package by name to get its id, then create booking with that package id
    try {

        let finalPackageId = packageId;

        if (!userId || !bookingDetails || !checkoutToken) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        const existingBooking = await BookingModel.findOne({ checkoutToken });
        if (existingBooking) {
            return res.status(200).json(existingBooking); // return existing booking
        }

        if (!finalPackageId && packageName) {
            const pkg = await PackageModel.findOne({ packageName });
            if (!pkg) {
                return res.status(404).json({ message: "Package not found" });
            }
            finalPackageId = pkg._id;
        }

        if (!finalPackageId) {
            return res.status(400).json({ message: "Package ID is required" });
        }

        const newBooking = await BookingModel.create({
            packageId: finalPackageId,
            userId,
            bookingDetails,
            checkoutToken,
            reference: generateBookingReference(),
            status: 'Successful'
        })
        logAction('BOOKING_CREATED', userId, {
            bookingId: newBooking._id,
            packageId: finalPackageId
        })
        res.status(201).json(newBooking)
    } catch (error) {
        res.status(500).json({ message: "Error creating booking", error })
    }
}

const getUserBookings = async (req, res) => {
    const userId = req.userId
    try {
        const bookings = await BookingModel.find({ userId }).sort({ createdAt: -1 })
        res.status(200).json(bookings)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error })
    }
}

const getAllBookings = async (_req, res) => {
    try {
        const bookings = await BookingModel.find({}).sort({ createdAt: -1 })
        res.status(200).json(bookings)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error })
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
    const { reason } = req.body
    const userId = req.userId
    try {
        const booking = await BookingModel.findById(id)
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' })
        }

        if (booking.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized to cancel this booking' })
        }

        booking.status = 'cancelled'
        await booking.save()
        await CancellationModel.create({
            bookingId: id,
            userId,
            cancellationReason: reason
        })
        logAction('BOOKING_CANCELLED', userId, { bookingId: id, reason })
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
            .populate('bookingId', 'bookingDetails createdAt reference status')
            .sort({ cancellationDate: -1 })
        res.status(200).json(cancellations)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching cancellations', error })
    }
}

module.exports = { createBooking, getUserBookings, getAllBookings, updateBooking, deleteBooking, cancelBooking, getcancellations }