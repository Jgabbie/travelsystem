const express = require('express')
const router = express.Router()
const notificationController = require('../controllers/notificationController')
const userAuth = require('../middleware/userAuth')

router.get('/my', userAuth, notificationController.getUserNotifications)
router.post('/create', userAuth, notificationController.createNotification)
router.patch('/read-all', userAuth, notificationController.markAllRead)
router.patch('/:id/read', userAuth, notificationController.markNotificationRead)

module.exports = router
