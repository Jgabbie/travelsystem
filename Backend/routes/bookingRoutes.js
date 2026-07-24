import express from 'express';
import * as bookingController from '../controllers/bookingController.js';
import userAuth from '../middleware/userAuth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Reusable authorization middleware
const staffOnly = authorizeRoles('Admin', 'Employee');
router.use(userAuth);

//to make sure that the admin-only routes are only accessible by admins, we create a middleware function that checks the user's role before allowing access to the route. 
// This is done by fetching the user from the database using their ID (which is set in the userAuth middleware) and checking if their role is 'Admin'. 
// If not, we return a 403 Forbidden response. If they are an admin, we call next() to proceed to the route handler.

router.post(
    '/create-booking',
    bookingController.createBooking
);

router.get(
    '/my-bookings',
    bookingController.getUserBookings
);

router.get(
    '/by-reference/:reference',
    bookingController.getBookingByReference
);

router.get(
    '/bookings-total-month',
    bookingController.getBookingsTotalBaseOnMonth
);

router.post(
    '/cancel/:id',
    upload.array('files', 5),
    bookingController.cancelBooking
);

router.post(
    '/verify-payment',
    bookingController.verifyTokenCheckout
);

router.get(
    '/check-payment-status',
    bookingController.checkPaymentStatus
);

router.post(
    '/:id/resubmit-documents',
    bookingController.resubmitBookingDocuments
);

router.get(
    '/all-bookings',
    staffOnly,
    bookingController.getAllBookings
);

router.get(
    '/archived-bookings',
    staffOnly,
    bookingController.getArchivedBookings
);

router.post(
    '/archived-bookings/:id/restore',
    staffOnly,
    bookingController.restoreArchivedBooking
);

router.put(
    '/:id',
    staffOnly,
    bookingController.updateBooking
);

router.delete(
    '/:id',
    staffOnly,
    bookingController.deleteBooking
);

router.get(
    '/cancellations',
    staffOnly,
    bookingController.getcancellations
);

router.get(
    '/archived-cancellations',
    staffOnly,
    bookingController.getArchivedCancellations
);

router.delete(
    '/cancellations/:id/archive',
    staffOnly,
    bookingController.archiveCancellation
);

router.post(
    '/archived-cancellations/:id/restore',
    staffOnly,
    bookingController.restoreArchivedCancellation
);

router.post(
    '/cancellations/:id/approve',
    staffOnly,
    bookingController.approveCancellation
);

router.post(
    '/cancellations/:id/reject',
    staffOnly,
    bookingController.disApproveCancellation
);

router.post(
    '/:id/request-document-resubmission',
    staffOnly,
    bookingController.requestDocumentResubmission
);
export default router;