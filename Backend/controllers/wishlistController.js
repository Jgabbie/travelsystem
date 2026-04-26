const Wishlist = require('../models/wishlist')

const addToWishlist = async (req, res) => {
    const { packageId } = req.body
    const userId = req.userId
    try {
        if (!packageId) {
            return res.status(400).json({ message: "Package ID is required" })
        }
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" })
        }
        const existingEntry = await Wishlist.findOne({ userId, packageId })
        if (existingEntry) {
            return res.status(400).json({ message: "Package already in wishlist" })
        }
        const newEntry = new Wishlist({ userId, packageId })
        await newEntry.save()
        return res.status(201).json({ message: "Package added to wishlist" })
    } catch (error) {
        console.error("Error adding to wishlist:", error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

const getWishlist = async (req, res) => {
    const userId = req.userId
    try {
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" })
        }
        const wishlist = await Wishlist.find({ userId })
            .populate('packageId')
            .sort({ createdAt: -1 })

        const visibleWishlist = wishlist.filter((entry) => entry?.packageId)

        return res.status(200).json({ wishlist: visibleWishlist })
    } catch (error) {
        console.error("Error fetching wishlist:", error)
        return res.status(500).json({ message: "Internal server error" })
    }
}


const removeFromWishlist = async (req, res) => {
    const { packageId } = req.body
    const userId = req.userId
    try {
        if (!packageId) {
            return res.status(400).json({ message: "Package ID is required" })
        }
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" })
        }
        const existingEntry = await Wishlist.findOne({ userId, packageId })
        if (!existingEntry) {
            return res.status(404).json({ message: "Package not found in wishlist" })
        }
        await Wishlist.deleteOne({ userId, packageId })
        return res.status(200).json({ message: "Package removed from wishlist" })
    } catch (error) {
        console.error("Error removing from wishlist:", error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

const removeWishlistItem = async (req, res) => {
    const { id } = req.params
    const userId = req.userId
    try {
        if (!id) {
            return res.status(400).json({ message: "Wishlist ID is required" })
        }
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" })
        }
        const existingEntry = await Wishlist.findOne({ _id: id, userId })
        if (!existingEntry) {
            return res.status(404).json({ message: "Wishlist item not found" })
        }
        await Wishlist.deleteOne({ _id: id, userId })
        return res.status(200).json({ message: "Wishlist item removed" })
    } catch (error) {
        console.error("Error removing wishlist item:", error)
        return res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = { addToWishlist, getWishlist, removeFromWishlist, removeWishlistItem }