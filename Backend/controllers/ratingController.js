const Rating = require('../models/rating')
const ArchivedRatingModel = require('../models/archivedratings')
const PackageModel = require('../models/package')
const mongoose = require('mongoose')
const logAction = require('../utils/logger')

const submitRating = async (req, res) => {
    const { packageId, rating, review } = req.body;
    const userId = req.userId;

    try {
        if (!userId) {
            return res.status(401).json({ message: "Login required to submit a rating" })
        }

        if (!packageId || !rating) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const existingRating = await Rating.findOne({ packageId, userId });

        if (existingRating) {
            return res.status(400).json({
                message: "You have already submitted a review for this package"
            });
        }

        const newRating = await Rating.create({
            packageId,
            userId,
            rating,
            review
        });

        const io = req.app.get('io')
        if (io) {
            io.emit('rating:created', {
                id: newRating._id,
                createdAt: newRating.createdAt
            })
        }

        const ratingDoc = await Rating.findById(newRating._id)
            .populate('packageId', 'packageName')
            .populate('userId', 'username')
            .select('packageId userId')

        const packageName = ratingDoc?.packageId?.packageName || 'Unknown'
        const userName = ratingDoc?.userId?.username || 'Unknown'

        logAction('RATING_SUBMITTED', userId, { "Rating Submitted": `Customer Name: ${userName} | Package Name: ${packageName} | Rating: ${rating} | Review: ${review}` })

        return res.status(201).json({
            message: "Rating submitted successfully",
            rating: newRating
        });
    } catch (error) {
        res.status(500).json({
            message: "Error submitting rating",
            error
        });
    }
};

const getPackageRatings = async (req, res) => {
    const { packageCode } = req.params

    try {

        const packageId = await PackageModel.find({ packageCode }).select('_id')

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
        if (!rating.userId || rating.userId.toString() !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        await rating.populate('packageId', 'packageName');
        await rating.populate('userId', 'username');

        const packageName = rating?.packageId?.packageName || 'Unknown'
        const userName = rating?.userId?.username || 'Unknown'

        await rating.deleteOne()

        logAction('RATING_DELETED', userId, { "Rating Deleted": `Customer Name: ${userName} | Package Name: ${packageName}` })

        res.status(200).json({ message: "Rating deleted" })
    } catch (error) {
        res.status(500).json({ message: "Error deleting rating", error })
    }
}

const adminDeleteRating = async (req, res) => {
    const { id } = req.params
    try {
        const rating = await Rating.findById(id)
            .populate('packageId', 'packageName')
            .populate('userId', 'username')
        if (!rating) {
            return res.status(404).json({ message: "Rating not found" })
        }

        const packageName = rating?.packageId?.packageName || 'Unknown'
        const userName = rating?.userId?.username || 'Unknown'

        const packageId = rating?.packageId?._id || rating?.packageId
        const userId = rating?.userId?._id || rating?.userId || null

        await ArchivedRatingModel.create({
            originalRatingId: rating._id,
            packageId,
            userId,
            rating: rating.rating,
            review: rating.review,
            guestName: rating.guestName,
            guestEmail: rating.guestEmail,
            createdAt: rating.createdAt
        })

        await rating.deleteOne()

        logAction('RATING_ARCHIVED_BY_ADMIN', req.userId, { "Rating Archived by Admin": `Customer Name: ${userName} | Package Name: ${packageName}` })

        res.status(200).json({ message: "Rating archived" })
    } catch (error) {
        res.status(500).json({ message: "Error archiving rating", error })
    }
}

const updateRating = async (req, res) => {
    const { id } = req.params
    const { rating, review } = req.body
    const userId = req.userId
    try {
        const existingRating = await Rating.findById(id)
        if (!existingRating) {
            return res.status(404).json({ message: "Rating not found" })
        }
        if (!existingRating.userId || existingRating.userId.toString() !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }
        existingRating.rating = rating
        existingRating.review = review
        await existingRating.save()


        const ratingDoc = await Rating.findById(id)
            .populate('packageId', 'packageName')
            .populate('userId', 'username')
            .select('packageId userId')

        const packageName = ratingDoc?.packageId?.packageName || 'Unknown'
        const userName = ratingDoc?.userId?.username || 'Unknown'

        logAction('RATING_UPDATED', userId, { "Rating Updated": `Customer Name: ${userName} | Package Name: ${packageName} | New Rating: ${rating} | New Review: ${review}` })

        res.status(200).json({ message: "Rating updated successfully", rating: existingRating })
    } catch (error) {
        res.status(500).json({ message: "Error updating rating", error })
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

const getAverageRating = async (req, res) => {
    try {
        const { packageCode } = req.params;

        const packageId = await PackageModel.findOne({ packageCode }).select('_id');
        const result = await Rating.aggregate([
            {
                $match: {
                    packageId: new mongoose.Types.ObjectId(packageId)
                }
            },
            {
                $group: {
                    _id: "$packageId",
                    averageRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 }
                }
            }
        ]);

        if (result.length === 0) {
            return res.json({ averageRating: 0, totalRatings: 0 });
        }

        console.log("Average rating result for packageCode", packageCode, ":", result[0]); // Debug log

        res.json(result[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

const getAverageRatings = async (_req, res) => {
    try {
        const result = await Rating.aggregate([
            {
                $group: {
                    _id: "$packageId",
                    averageRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 }
                }
            }
        ]);

        const averages = result.map((item) => ({
            packageId: item._id,
            averageRating: item.averageRating,
            totalRatings: item.totalRatings
        }));

        const populated = await PackageModel.populate(averages, {
            path: 'packageId',
            select: 'packageCode packageName'
        });

        const cleanPayload = populated.map(item => ({
            packageCode: item.packageId?.packageCode,
            packageName: item.packageId?.packageName,
            averageRating: item.averageRating,
            totalRatings: item.totalRatings
        }));

        return res.json({ averagesPayload: cleanPayload });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
};

const getArchivedRatings = async (_req, res) => {
    try {
        const ratings = await ArchivedRatingModel.find({})
            .populate('userId', 'username firstname lastname')
            .populate('packageId', 'packageName')
            .sort({ archivedAt: -1 })
        res.status(200).json(ratings)
    } catch (error) {
        res.status(500).json({ message: "Error fetching archived ratings", error })
    }
}

const restoreArchivedRating = async (req, res) => {
    const { id } = req.params

    try {
        const archivedRating = await ArchivedRatingModel.findById(id)
            .populate('packageId', 'packageName')
            .populate('userId', 'username')
        if (!archivedRating) {
            return res.status(404).json({ message: "Archived rating not found" })
        }

        if (archivedRating.userId) {
            const existingRating = await Rating.findOne({
                packageId: archivedRating.packageId,
                userId: archivedRating.userId
            })
            if (existingRating) {
                return res.status(409).json({ message: "Rating already exists" })
            }
        }

        await Rating.create({
            packageId: archivedRating.packageId,
            userId: archivedRating.userId,
            rating: archivedRating.rating,
            review: archivedRating.review,
            guestName: archivedRating.guestName,
            guestEmail: archivedRating.guestEmail,
            createdAt: archivedRating.createdAt,
            updatedAt: archivedRating.createdAt
        })

        const packageName = archivedRating?.packageId?.packageName || 'Unknown'
        const userName = archivedRating?.userId?.username || 'Unknown'

        await archivedRating.deleteOne()

        logAction('RATING_RESTORED_BY_ADMIN', req.userId, { "Rating Restored by Admin": `Customer Name: ${userName} | Package Name: ${packageName}` })

        res.status(200).json({ message: "Rating restored" })
    } catch (error) {
        res.status(500).json({ message: "Error restoring rating", error })
    }
}

module.exports = { submitRating, getPackageRatings, deleteRating, adminDeleteRating, getUserRatings, getAllRatings, updateRating, getAverageRating, getAverageRatings, getArchivedRatings, restoreArchivedRating }