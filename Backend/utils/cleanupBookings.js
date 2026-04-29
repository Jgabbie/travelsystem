const BookingModel = require('../models/booking');
const TransactionModel = require('../models/transactions');
const TokenCheckoutModel = require('../models/tokencheckout');

const cleanupExpiredBookings = async () => {
    try {
        const now = new Date();

        const expiredBookings = await BookingModel.find({
            status: 'Not Paid',
            expiresAt: { $lt: now }
        });

        for (const booking of expiredBookings) {
            const hasTransaction = await TransactionModel.exists({
                bookingId: booking._id
            });

            if (hasTransaction) {
                // If any transaction exists for this booking, skip deletion
                console.log(`Skipping deletion, transactions found for booking: ${booking.reference}`);
                continue;
            }

            await TokenCheckoutModel.deleteMany({ bookingId: booking._id });
            await BookingModel.findByIdAndDelete(booking._id);

            console.log(`Deleted expired booking: ${booking.reference}`);
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
};

const startCleanupScheduler = () => {
    // Run once on startup
    cleanupExpiredBookings().catch((error) => {
        console.error('Cleanup scheduler startup run failed:', error);
    });

    // Run every 5 minutes to catch expired bookings quickly
    setInterval(() => {
        cleanupExpiredBookings().catch((error) => {
            console.error('Cleanup scheduler interval run failed:', error);
        });
    }, 1 * 60 * 1000);
};

module.exports = {
    cleanupExpiredBookings,
    startCleanupScheduler
};