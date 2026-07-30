import RecentTour from "../models/recenttours.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

const uploadBufferToCloudinary = (file, folder) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        streamifier.createReadStream(file.buffer).pipe(stream);
    });


// CREATE
const createRecentTour = async (req, res) => {
    try {

        let image = "";

        if (req.file) {
            const result = await uploadBufferToCloudinary(
                req.file,
                "recent-tours"
            );

            image = result.secure_url;
        }

        const recentTour = await RecentTour.create({
            image,
        });

        res.status(201).json(recentTour);

    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};


// READ
const getRecentTours = async (req, res) => {
    try {

        const tours = await RecentTour.find()
            .sort({ createdAt: -1 });

        res.json(tours);

    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};


// DELETE
const deleteRecentTour = async (req, res) => {
    try {

        await RecentTour.findByIdAndDelete(req.params.id);

        res.json({
            message: "Recent tour deleted",
        });

    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};


export {
    createRecentTour,
    getRecentTours,
    deleteRecentTour,
};