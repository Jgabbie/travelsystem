const Rating = require('../models/rating')

const submitRating = async (req, res) => {
    const { packageId, rating, review } = req.body
    const userId = req.userId
    try {
        if (!packageId || !rating || !userId) {
            return res.status(400).json({ message: "Missing required fields" })
        }
        const existingRating = await Rating.findOne({ packageId, userId })
        if (existingRating) {
            existingRating.rating = rating
            existingRating.review = review
            await existingRating.save()
            return res.status(200).json({ message: "Rating updated successfully", rating: existingRating })
        }
        const newRating = await Rating.create({
            packageId,
            userId,
            rating,
            review
        })
        res.status(201).json({ message: "Rating submitted successfully", rating: newRating })
    } catch (error) {
        res.status(500).json({ message: "Error submitting rating", error })
    }
}

const getPackageRatings = async (req, res) => {
    const { packageId } = req.params

    try {
        const ratings = await Rating.find({ packageId })
            .populate('userId', 'username firstname lastname profileImage')
            .sort({ createdAt: -1 })
        res.status(200).json(ratings)
    } catch (error) {
        res.status(500).json({ message: "Error fetching ratings", error })
    }
}

const getUserRatings = async (req, res) => {
    const userId = req.userId

    try {
        const ratings = await Rating.find({ userId })
            .populate('packageId', 'packageName')
            .sort({ createdAt: -1 })
        res.status(200).json(ratings)
    } catch (error) {
        res.status(500).json({ message: "Error fetching ratings", error })
    }
}

const deleteRating = async (req, res) => {
    const { id } = req.params
    const userId = req.userId

    try {
        const rating = await Rating.findById(id)
        if (!rating) {
            return res.status(404).json({ message: "Rating not found" })
        }
        if (rating.userId.toString() !== userId) {
            return res.status(403).json({ message: "Forbidden" })
        }

        await rating.deleteOne()
        res.status(200).json({ message: "Rating deleted" })
    } catch (error) {
        res.status(500).json({ message: "Error deleting rating", error })
    }
}

const getAllRatings = async (_req, res) => {
    try {
        const ratings = await Rating.find({})
            .populate('userId', 'username firstname lastname')
            .populate('packageId', 'packageName')
            .sort({ createdAt: -1 })
        res.status(200).json(ratings)
    } catch (error) {
        res.status(500).json({ message: "Error fetching ratings", error })
    }
}

module.exports = { submitRating, getPackageRatings, deleteRating, getUserRatings, getAllRatings }