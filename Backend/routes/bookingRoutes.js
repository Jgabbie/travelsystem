const express = require('express')
const router = express.Router()
const bookingController = require('../controllers/bookingController')
const userAuth = require('../middleware/userAuth')
const UserModel = require('../models/user')

//to make sure that the admin-only routes are only accessible by admins, we create a middleware function that checks the user's role before allowing access to the route. 
// This is done by fetching the user from the database using their ID (which is set in the userAuth middleware) and checking if their role is 'Admin'. 
// If not, we return a 403 Forbidden response. If they are an admin, we call next() to proceed to the route handler.
const adminOnly = async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.userId).lean()
        if (!user || user.role !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden: Admins only' })
        }
        next()
    } catch (err) {
        res.status(500).json({ message: 'Authorization check failed: ' + err.message })
    }
}

router.post('/create-booking', userAuth, bookingController.createBooking)
router.get('/my-bookings', userAuth, bookingController.getUserBookings)
router.get('/all-bookings', userAuth, adminOnly, bookingController.getAllBookings)
router.put('/:id', userAuth, adminOnly, bookingController.updateBooking)
router.delete('/:id', userAuth, adminOnly, bookingController.deleteBooking)
router.post('/cancel/:id', userAuth, bookingController.cancelBooking)
router.get('/cancellations', userAuth, adminOnly, bookingController.getcancellations)
module.exports = router