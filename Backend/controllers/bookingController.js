const BookingModel = require('../models/booking')
const ArchivedBookingModel = require('../models/archivedbookings')
const TransactionModel = require('../models/transactions')
const CancellationModel = require('../models/cancellations')
const ArchivedCancellationModel = require('../models/archivedcancellations')
const TokenCheckoutModel = require('../models/tokencheckout')
const PackageModel = require('../models/package')
const NotificationModel = require('../models/notification')
const UserModel = require('../models/user')
const transporter = require('../config/nodemailer')
const crypto = require('crypto');
const logAction = require('../utils/logger')
const dayjs = require('dayjs');


const generateBookingReference = () => {
    return `BK-${Math.floor(100000000 + Math.random() * 900000000)}`
}

const generateCancellationReference = () => {
    return `CN-${Math.floor(100000000 + Math.random() * 900000000)}`
}


//CREATE BOOKING -----------------------------------------------------------------
const createBooking = async (req, res) => {
    const { bookingPayload } = req.body
    const userId = req.userId

    const packageId = bookingPayload.packageId
    const travelDate = bookingPayload.travelDate
    const travelers = bookingPayload.travelers
    const bookingDate = new Date().toISOString()
    const bookingDetails = bookingPayload.bookingDetails || null
    const status = 'Not Paid'
    const amount = bookingPayload.amount || 0
    const passportFiles = bookingPayload.passportFiles || []
    const photoFiles = bookingPayload.photoFiles || []
    const expiresAt = dayjs().add(5, 'minutes').toDate() // 5 minutes from now

    //find package by name to get its id, then create booking with that package id
    try {

        if (!userId || !bookingPayload) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        const newBooking = await BookingModel.create({
            packageId,
            userId,
            travelDate,
            bookingDate,
            bookingDetails,
            passportFiles,
            photoFiles,
            travelers,
            reference: generateBookingReference(),
            status,
            expiresAt
        })

        const token = crypto.randomUUID();

        const tokenCheckout = await TokenCheckoutModel.create({
            token,
            userId,
            bookingId: newBooking._id,
            amount: bookingPayload.amount,
            expiresAt: dayjs().add(5, 'minutes').toDate()
        });

        const packageName = await PackageModel.findById(packageId).select('packageName').lean()

        logAction('BOOKING_CREATED', userId, { "Booking Created": `Booking Reference: ${newBooking.reference} | Package Name: ${packageName.packageName}` })

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


//GET USER BOOKINGS -----------------------------------------------------------------
const getUserBookings = async (req, res) => {
    const userId = req.userId
    try {
        const bookings = await BookingModel.find({ userId }).sort({ createdAt: -1 })
            .populate('userId', 'username')
            .populate('packageId', 'packageName packageType')
            .lean()

        const bookingIds = bookings.map((booking) => booking._id)
        const paidAgg = await TransactionModel.aggregate([
            { $match: { bookingId: { $in: bookingIds }, status: 'Successful' } },
            { $group: { _id: '$bookingId', totalPaid: { $sum: '$amount' } } }
        ])

        const paidMap = paidAgg.reduce((acc, entry) => {
            acc[entry._id.toString()] = entry.totalPaid
            return acc
        }, {})

        const enriched = bookings.map((booking) => ({
            ...booking,
            paidAmount: paidMap[booking._id.toString()] || 0
        }))

        res.status(200).json(enriched)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error })
    }
}


//GET BOOKINGS TOTAL BASED ON MONTH -----------------------------------------------------------------
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


//GET ALL BOOKINGS (ADMIN) -----------------------------------------------------------------
const getAllBookings = async (_req, res) => {
    try {
        const bookings = await BookingModel.find({})
            .populate('userId', 'username')
            .populate('packageId', 'packageName packageType packageDuration')
            .sort({ createdAt: -1 });

        res.status(200).json(bookings)
    } catch (error) {
        console.error('Error fetching bookings:', error)
        res.status(500).json({ message: 'Error fetching bookings', error })
    }
}

//GET ARCHIVED BOOKINGS (ADMIN) -----------------------------------------------------------------
const getArchivedBookings = async (_req, res) => {
    try {
        const bookings = await ArchivedBookingModel.find({})
            .populate('userId', 'username')
            .populate('packageId', 'packageName packageType packageDuration')
            .sort({ archivedAt: -1 })

        res.status(200).json(bookings)
    } catch (error) {
        console.error('Error fetching archived bookings:', error)
        res.status(500).json({ message: 'Error fetching archived bookings', error })
    }
}


//GET BOOKING BY REFERENCE (USER) -----------------------------------------------------------------
const getBookingByReference = async (req, res) => {
    const userId = req.userId
    const { reference } = req.params

    if (!reference) {
        return res.status(400).json({ message: 'Reference is required' })
    }

    try {
        const user = await UserModel.findById(userId).select('role').lean()
        const isAdmin = user?.role === 'Admin' || user?.role === 'Employee'

        const booking = await BookingModel.findOne(
            isAdmin ? { reference } : { reference, userId }
        )
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

//UPDATE BOOKING (ADMIN) -----------------------------------------------------------------
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

        logAction('BOOKING_UPDATED', req.userId, { "Booking Updated": `Booking Reference: ${updatedBooking.reference}` })
        res.status(200).json(updatedBooking)
    } catch (error) {
        res.status(500).json({ message: 'Error updating booking', error })
    }
}

//ARCHIVE BOOKING (ADMIN) -----------------------------------------------------------------
const deleteBooking = async (req, res) => {
    const { id } = req.params

    try {
        const booking = await BookingModel.findById(id)
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' })
        }

        await ArchivedBookingModel.create({
            originalBookingId: booking._id,
            packageId: booking.packageId,
            userId: booking.userId,
            bookingDate: booking.bookingDate,
            travelDate: booking.travelDate,
            travelers: booking.travelers,
            reference: booking.reference,
            status: booking.status,
            bookingDetails: booking.bookingDetails,
            passportFiles: booking.passportFiles,
            photoFiles: booking.photoFiles,
            statusHistory: booking.statusHistory,
            slotDecremented: booking.slotDecremented,
            createdAt: booking.createdAt,
            expiresAt: booking.expiresAt
        })

        await BookingModel.findByIdAndDelete(id)

        logAction('BOOKING_ARCHIVED', req.userId, { "Booking Archived": `Booking Reference: ${booking.reference}` })
        res.status(200).json({ message: 'Booking archived' })
    } catch (error) {
        res.status(500).json({ message: 'Error archiving booking', error })
    }
}

//RESTORE BOOKING (ADMIN) -----------------------------------------------------------------
const restoreArchivedBooking = async (req, res) => {
    const { id } = req.params
    console.log("Restoring booking with archived ID:", id)

    try {
        const archivedBooking = await ArchivedBookingModel.findById(id)
        if (!archivedBooking) {
            return res.status(404).json({ message: 'Archived booking not found' })
        }

        const existingBooking = await BookingModel.findOne({ reference: archivedBooking.reference })
        if (existingBooking) {
            return res.status(409).json({ message: 'Booking with this reference already exists' })
        }

        const restoredExpiresAt = archivedBooking.expiresAt || dayjs().add(5, 'minutes').toDate()
        const restoredBooking = await BookingModel.create({
            _id: archivedBooking.originalBookingId,
            packageId: archivedBooking.packageId,
            userId: archivedBooking.userId,
            bookingDate: archivedBooking.bookingDate,
            travelDate: archivedBooking.travelDate,
            travelers: archivedBooking.travelers,
            reference: archivedBooking.reference,
            status: archivedBooking.status,
            bookingDetails: archivedBooking.bookingDetails,
            passportFiles: archivedBooking.passportFiles,
            photoFiles: archivedBooking.photoFiles,
            statusHistory: archivedBooking.statusHistory,
            slotDecremented: archivedBooking.slotDecremented,
            createdAt: archivedBooking.createdAt,
            expiresAt: restoredExpiresAt
        })

        await ArchivedBookingModel.findByIdAndDelete(id)

        logAction('BOOKING_RESTORED', req.userId, { "Booking Restored": `Booking Reference: ${restoredBooking.reference}` })
        res.status(200).json({ message: 'Booking restored', booking: restoredBooking })
    } catch (error) {
        res.status(500).json({ message: 'Error restoring booking', error })
    }
}

//CANCEL BOOKING (USER) -----------------------------------------------------------------
const cancelBooking = async (req, res) => {
    const { id } = req.params
    const userId = req.userId
    const payload = req.body


    const { reason, comments, imageProof } = payload

    try {
        const booking = await BookingModel.findById(id)
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' })
        }

        if (booking.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized to cancel this booking' })
        }

        if (!reason || !imageProof) {
            return res.status(400).json({ message: 'Cancellation reason and image proof are required' })
        }

        booking.status = 'cancellation requested'
        await booking.save()
        const cancellation = await CancellationModel.create({
            bookingId: id,
            packageId: booking.packageId,
            userId,
            reference: generateCancellationReference(),
            cancellationReason: reason,
            cancellationComments: comments || '',
            cancellationDate: new Date(),
            imageProof: imageProof || null,
            status: 'Pending'
        })
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


//APPROVE CANCELLATION (ADMIN) -----------------------------------------------------------------
const approveCancellation = async (req, res) => {
    const { id } = req.params
    try {
        const cancellation = await CancellationModel.findById(id)
        if (!cancellation) {
            return res.status(404).json({ message: 'Cancellation request not found' })
        }

        cancellation.status = 'Approved'
        await cancellation.save()
        const booking = await BookingModel.findById(cancellation.bookingId)
        if (booking) {
            booking.status = 'Cancelled'
            if (!Array.isArray(booking.statusHistory)) {
                booking.statusHistory = []
            }
            booking.statusHistory.push({ status: 'Cancelled', changedAt: new Date() })
            await booking.save()

            const packageDoc = await PackageModel.findById(booking.packageId)
            if (packageDoc) {
                const normalizedStart = dayjs(booking.travelDate.startDate).format('YYYY-MM-DD')
                const normalizedEnd = dayjs(booking.travelDate.endDate).format('YYYY-MM-DD')
                const updateResult = await PackageModel.updateOne(
                    {
                        _id: packageDoc._id,
                        packageSpecificDate: {
                            $elemMatch: {
                                startdaterange: normalizedStart,
                                enddaterange: normalizedEnd
                            }
                        }
                    },
                    {
                        $inc: { 'packageSpecificDate.$.slots': 1 }
                    }
                )

                if (updateResult.matchedCount === 0) {
                    console.log('No matching date range found for slot increment.')
                } else if (updateResult.modifiedCount === 1) {
                    console.log('Slot successfully incremented.')
                }
            }

            await NotificationModel.create({
                userId: booking.userId,
                title: 'Cancellation Approved',
                message: `Your cancellation request for booking ${booking.reference} was approved.`,
                type: 'cancellation',
                link: '/user-bookings'
            })

            const user = await UserModel.findById(booking.userId).select('email username')
            if (user?.email) {
                try {
                    await transporter.sendMail({
                        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                        to: user.email,
                        subject: `Cancellation Approved - ${booking.reference}`,
                        html: `
                        <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
                        <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">

                        <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">Cancellation Approved</h2>

                            <p style="color:#555; font-size:16px;">Hello <b>${user.username || 'Customer'}</b>,</p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your cancellation request has been approved.
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>Booking Reference:</b> ${booking.reference} <br/>
                                <b>Travel Dates:</b> ${dayjs(booking.travelDate.startDate).format('YYYY-MM-DD')} to ${dayjs(booking.travelDate.endDate).format('YYYY-MM-DD')}
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you did not request this cancellation, please contact support.
                            </p>

                            <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                            <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                                <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                                <p>M&RC Travel and Tours</p>
                                <p>support@mrctravelandtours.com</p>
                                <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                            </div>

                        </div>
                    </div>
                    `
                    })
                } catch (emailError) {
                    console.error('Failed to send cancellation approval email:', emailError)
                }
            }
        }
        logAction('CANCELLATION_APPROVED', req.userId, { "Cancellation Approved": `Cancellation Reference: ${cancellation.reference}` })
        res.status(200).json({ message: 'Cancellation approved' })
    } catch (error) {
        res.status(500).json({ message: 'Error approving cancellation', error })
    }
}


//DISAPPROVE CANCELLATION (ADMIN) -----------------------------------------------------------------
const disApproveCancellation = async (req, res) => {
    const { id } = req.params
    try {
        const cancellation = await CancellationModel.findById(id)
        if (!cancellation) {
            return res.status(404).json({ message: 'Cancellation request not found' })
        }
        cancellation.status = 'Disapproved'
        await cancellation.save()

        const booking = await BookingModel.findById(cancellation.bookingId)
        if (booking) {
            let previousStatus = null
            if (Array.isArray(booking.statusHistory) && booking.statusHistory.length) {
                for (let i = booking.statusHistory.length - 1; i >= 0; i -= 1) {
                    const candidate = booking.statusHistory[i]?.status
                    if (candidate && candidate !== 'cancellation requested') {
                        previousStatus = candidate
                        break
                    }
                }
            }

            if (!previousStatus) {
                previousStatus = booking.status === 'cancellation requested' ? 'Pending' : booking.status
            }

            booking.status = previousStatus
            if (!Array.isArray(booking.statusHistory)) {
                booking.statusHistory = []
            }
            booking.statusHistory.push({ status: previousStatus, changedAt: new Date() })
            await booking.save()

            await NotificationModel.create({
                userId: booking.userId,
                title: 'Cancellation Rejected',
                message: `Your cancellation request for booking ${booking.reference} was rejected.`,
                type: 'cancellation',
                link: '/user-bookings'
            })

            const user = await UserModel.findById(booking.userId).select('email username')
            if (user?.email) {
                try {
                    await transporter.sendMail({
                        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                        to: user.email,
                        subject: `Cancellation Rejected - ${booking.reference}`,
                        html: `
                        <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
                        <div style="max-width:500px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">

                        <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#b91c1c; margin-bottom:10px;">Cancellation Rejected</h2>

                            <p style="color:#555; font-size:16px;">Hello <b>${user.username || 'Customer'}</b>,</p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                Your cancellation request has been rejected.
                            </p>

                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>Booking Reference:</b> ${booking.reference} <br/>
                                <b>Current Status:</b> ${previousStatus}
                            </p>

                            <p style="color:#777; font-size:13px; margin-top:30px;">
                                If you have questions, please contact support.
                            </p>

                            <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                            <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                                <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                                <p>M&RC Travel and Tours</p>
                                <p>support@mrctravelandtours.com</p>
                                <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                            </div>

                        </div>
                    </div>
                    `
                    })
                } catch (emailError) {
                    console.error('Failed to send cancellation rejection email:', emailError)
                }
            }
        }

        logAction('CANCELLATION_DISAPPROVED', req.userId, { "Cancellation Disapproved": `Cancellation Reference: ${cancellation.reference}` })
        res.status(200).json({ message: 'Cancellation disapproved' })
    } catch (error) {
        res.status(500).json({ message: 'Error disapproving cancellation', error })
    }
}

//GET CANCELLATIONS (ADMIN) -----------------------------------------------------------------
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

//GET ARCHIVED CANCELLATIONS (ADMIN) -----------------------------------------------------------------
const getArchivedCancellations = async (req, res) => {
    try {
        const cancellations = await ArchivedCancellationModel.find({})
            .populate('userId', 'username email')
            .populate({
                path: 'bookingId',
                select: 'bookingDetails createdAt reference status packageId',
                populate: { path: 'packageId', select: 'packageName' }
            })
            .populate('packageId', 'packageName')
            .sort({ archivedAt: -1 })
        res.status(200).json(cancellations)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching archived cancellations', error })
    }
}

//ARCHIVE CANCELLATION (ADMIN) -----------------------------------------------------------------
const archiveCancellation = async (req, res) => {
    const { id } = req.params

    try {
        const cancellation = await CancellationModel.findById(id)
        if (!cancellation) {
            return res.status(404).json({ message: 'Cancellation request not found' })
        }

        await ArchivedCancellationModel.create({
            originalCancellationId: cancellation._id,
            bookingId: cancellation.bookingId,
            packageId: cancellation.packageId,
            userId: cancellation.userId,
            cancellationReason: cancellation.cancellationReason,
            cancellationComments: cancellation.cancellationComments,
            imageProof: cancellation.imageProof,
            cancellationDate: cancellation.cancellationDate,
            reference: cancellation.reference,
            status: cancellation.status
        })

        await CancellationModel.findByIdAndDelete(id)

        logAction('CANCELLATION_ARCHIVED', req.userId, { "Cancellation Archived": `Cancellation Reference: ${cancellation.reference}` })
        res.status(200).json({ message: 'Cancellation archived' })
    } catch (error) {
        res.status(500).json({ message: 'Error archiving cancellation', error })
    }
}

//RESTORE CANCELLATION (ADMIN) -----------------------------------------------------------------
const restoreArchivedCancellation = async (req, res) => {
    const { id } = req.params

    try {
        const archivedCancellation = await ArchivedCancellationModel.findById(id)
        if (!archivedCancellation) {
            return res.status(404).json({ message: 'Archived cancellation not found' })
        }

        const existingCancellation = await CancellationModel.findOne({ reference: archivedCancellation.reference })
        if (existingCancellation) {
            return res.status(409).json({ message: 'Cancellation with this reference already exists' })
        }

        const restoredCancellation = await CancellationModel.create({
            _id: archivedCancellation.originalCancellationId,
            bookingId: archivedCancellation.bookingId,
            packageId: archivedCancellation.packageId,
            userId: archivedCancellation.userId,
            cancellationReason: archivedCancellation.cancellationReason,
            cancellationComments: archivedCancellation.cancellationComments,
            imageProof: archivedCancellation.imageProof,
            cancellationDate: archivedCancellation.cancellationDate,
            reference: archivedCancellation.reference,
            status: archivedCancellation.status
        })

        await ArchivedCancellationModel.findByIdAndDelete(id)

        logAction('CANCELLATION_RESTORED', req.userId, { "Cancellation Restored": `Cancellation Reference: ${restoredCancellation.reference}` })
        res.status(200).json({ message: 'Cancellation restored', cancellation: restoredCancellation })
    } catch (error) {
        res.status(500).json({ message: 'Error restoring cancellation', error })
    }
}

const verifyTokenCheckout = async (req, res) => {
    const { token } = req.body

    try {
        const tokenCheckout = await TokenCheckoutModel.findOne({ token })
        if (!tokenCheckout) {
            return { valid: false, message: 'Invalid token' }
        }

        if (tokenCheckout.expiresAt < new Date()) {
            return { valid: false, message: 'Token has expired' }
        }
        return { valid: true, tokenCheckout }
    } catch (error) {
        console.error('Error verifying token checkout:', error)
        return { valid: false, message: 'Error verifying token' }
    }
}
module.exports = { createBooking, getUserBookings, getAllBookings, getArchivedBookings, getBookingsTotalBaseOnMonth, updateBooking, deleteBooking, restoreArchivedBooking, cancelBooking, getcancellations, getArchivedCancellations, archiveCancellation, restoreArchivedCancellation, getBookingByReference, verifyTokenCheckout, approveCancellation, disApproveCancellation }