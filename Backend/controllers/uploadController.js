const express = require("express")
const cloudinary = require("../config/cloudinary")
const streamifier = require("streamifier")
const { upload } = require("../middleware/uploadFile")


const uploadReceiptProof = async (req, res) => {
    console.log('Received request to upload receipt proof');
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        console.log('Uploading file to Cloudinary:', req.file.originalname);

        // Use upload_stream with a Promise to await the upload
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'manual-deposits' },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );

            stream.end(req.file.buffer);
        });

        console.log('Upload result:', uploadResult);

        // Only send response once, after upload completes
        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: uploadResult.secure_url,
        });
    }

    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed" });
    }
}

const uploadBookingDocuments = async (req, res) => {
    console.log('Received request to upload booking documents');
    console.log('BODY:', req.body);
    console.log('FILES:', req.files);

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'booking-documents' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result.secure_url);
                    }
                );

                stream.end(file.buffer);
            });
        });

        const uploadedUrls = await Promise.all(uploadPromises);

        console.log('Uploaded URLs:', uploadedUrls);

        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedUrls
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed" });
    }
};

const uploadPackageImage = async (req, res) => {
    console.log('Received request to upload package image');
    console.log('BODY:', req.body);
    console.log('FILE:', req.files);

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'package-images' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );

                stream.end(file.buffer);
            });
        });

        const uploadedResults = await Promise.all(uploadPromises);

        console.log('Uploaded Results:', uploadedResults);

        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedResults.map(result => result.secure_url)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed" });
    }
};

const uploadProfilePicture = async (req, res) => {
    console.log('Received request to upload profile picture');
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        console.log('Uploading file to Cloudinary:', req.file);

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'profile-pictures' },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );

            stream.end(req.file.buffer);
        });

        console.log('Upload result:', uploadResult);

        // Only send response once, after upload completes
        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: uploadResult.secure_url,
        });
    }

    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed" });
    }
};

const uploadPassportRequirements = async (req, res) => {
    console.log('Received request to upload passport requirements');
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);

    if (!req.files) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'passport-requirements' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );

                stream.end(file.buffer);
            });
        });

        const uploadedResults = await Promise.all(uploadPromises);

        console.log('Uploaded Results:', uploadedResults);

        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedResults.map(result => result.secure_url)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed" });
    }
}

const uploadVisaRequirements = async (req, res) => {
    console.log('Received request to upload visa requirements');
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);

    if (!req.files) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const uploadPromises = req.files.map(file => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'visa-requirements' },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );

                stream.end(file.buffer);
            });
        });

        const uploadedResults = await Promise.all(uploadPromises);

        console.log('Uploaded Results:', uploadedResults);

        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedResults.map(result => result.secure_url)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed" });
    }
}


module.exports = { uploadReceiptProof, uploadBookingDocuments, uploadPackageImage, uploadProfilePicture, uploadPassportRequirements, uploadVisaRequirements };