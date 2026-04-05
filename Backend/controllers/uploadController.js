const express = require("express")
const cloudinary = require("../config/cloudinary")
const streamifier = require("streamifier")
const { upload } = require("../middleware/uploadFile")

const uploadBufferToCloudinary = (file, folder) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
            if (error) return reject(error);
            resolve(result);
        }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
});


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
        const uploadResult = await uploadBufferToCloudinary(req.file, 'manual-deposits');

        console.log('Upload result:', uploadResult);

        // Only send response once, after upload completes
        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: uploadResult.secure_url,
        });
    }

    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
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
        const uploadPromises = req.files.map(file =>
            uploadBufferToCloudinary(file, 'booking-documents').then(result => result.secure_url)
        );

        const uploadedUrls = await Promise.all(uploadPromises);

        console.log('Uploaded URLs:', uploadedUrls);

        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedUrls
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
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
        const uploadPromises = req.files.map(file =>
            uploadBufferToCloudinary(file, 'package-images')
        );

        const uploadedResults = await Promise.all(uploadPromises);

        console.log('Uploaded Results:', uploadedResults);

        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedResults.map(result => result.secure_url)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
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

        const uploadResult = await uploadBufferToCloudinary(req.file, 'profile-pictures');

        console.log('Upload result:', uploadResult);

        // Only send response once, after upload completes
        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: uploadResult.secure_url,
        });
    }

    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
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
        const uploadPromises = req.files.map(file =>
            uploadBufferToCloudinary(file, 'passport-requirements')
        );

        const uploadedResults = await Promise.all(uploadPromises);

        console.log('Uploaded Results:', uploadedResults);

        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedResults.map(result => result.secure_url)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
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
        const uploadPromises = req.files.map(file =>
            uploadBufferToCloudinary(file, 'visa-requirements')
        );

        const uploadedResults = await Promise.all(uploadPromises);

        console.log('Uploaded Results:', uploadedResults);

        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedResults.map(result => result.secure_url)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
}

const uploadCancellationProof = async (req, res) => {
    console.log('Received request to upload cancellation proof');
    console.log('BODY:', req.body);
    console.log('FILE:', req.file);

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        console.log('Uploading file to Cloudinary:', req.file);

        const uploadResult = await uploadBufferToCloudinary(req.file, 'cancellation-proofs');

        console.log('Upload result:', uploadResult);

        // Only send response once, after upload completes
        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: uploadResult.secure_url,
        });
    }

    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
}

const viewQuotationPdf = async (req, res) => {
    console.log('Received request to view quotation PDF');
    try {
        const publicId = req.params.publicId;

        // generate temporary signed URL
        const url = cloudinary.url(publicId, {
            resource_type: "raw",
            type: "authenticated",
            sign_url: true,
        });

        return res.json({ url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to generate signed URL" });
    }
}

module.exports = { uploadReceiptProof, uploadBookingDocuments, uploadPackageImage, uploadProfilePicture, uploadPassportRequirements, uploadVisaRequirements, uploadCancellationProof, viewQuotationPdf };