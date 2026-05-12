const express = require("express")
const cloudinary = require("../config/cloudinary")
const streamifier = require("streamifier")
const { upload } = require("../middleware/uploadFile")

const uploadBufferToCloudinary = (file, folder) => new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto', type: 'private' },
        (error, result) => {
            if (error) return reject(error);
            resolve(result);
        }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
});

const getCloudinaryFormat = (uploadResult) => {
    if (uploadResult?.format) {
        return uploadResult.format;
    }

    const secureUrl = uploadResult?.secure_url || '';
    const cleanUrl = secureUrl.split('?')[0].split('#')[0];
    const lastSegment = cleanUrl.split('/').pop() || '';
    const segments = lastSegment.split('.');

    return segments.length > 1 ? segments.pop() : null;
};

const buildSignedCloudinaryUrl = (uploadResult) => {
    const format = getCloudinaryFormat(uploadResult);

    if (!uploadResult?.public_id || !format) {
        return uploadResult?.secure_url || null;
    }

    return cloudinary.utils.private_download_url(uploadResult.public_id, format, {
        resource_type: uploadResult.resource_type || 'image',
        type: 'private',
    });
};


const uploadReceiptProof = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        // Use upload_stream with a Promise to await the upload
        const uploadResult = await uploadBufferToCloudinary(req.file, 'manual-deposits');
        const signedUrl = buildSignedCloudinaryUrl(uploadResult);

        // Only send response once, after upload completes
        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: signedUrl,
        });
    }

    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
}

const uploadBookingDocuments = async (req, res) => {

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const uploadPromises = req.files.map(file =>
            uploadBufferToCloudinary(file, 'booking-documents').then(result => buildSignedCloudinaryUrl(result))
        );

        const uploadedUrls = await Promise.all(uploadPromises);

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

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const uploadPromises = req.files.map(file =>
            uploadBufferToCloudinary(file, 'package-images')
        );

        const uploadedResults = await Promise.all(uploadPromises);


        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedResults.map(result => buildSignedCloudinaryUrl(result))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
};

const uploadProfilePicture = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {

        const uploadResult = await uploadBufferToCloudinary(req.file, 'profile-pictures');
        const signedUrl = buildSignedCloudinaryUrl(uploadResult);


        // Only send response once, after upload completes
        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: signedUrl,
        });
    }

    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
};

const uploadPassportRequirements = async (req, res) => {

    if (!req.files) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const uploadPromises = req.files.map(file =>
            uploadBufferToCloudinary(file, 'passport-requirements')
        );

        const uploadedResults = await Promise.all(uploadPromises);

        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedResults.map(result => buildSignedCloudinaryUrl(result))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
}

const uploadVisaRequirements = async (req, res) => {

    if (!req.files) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const uploadPromises = req.files.map(file =>
            uploadBufferToCloudinary(file, 'visa-requirements')
        );

        const uploadedResults = await Promise.all(uploadPromises);


        return res.status(200).json({
            message: 'Files uploaded successfully.',
            urls: uploadedResults.map(result => buildSignedCloudinaryUrl(result))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
}

const uploadCancellationProof = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {

        const uploadResult = await uploadBufferToCloudinary(req.file, 'cancellation-proofs');
        const signedUrl = buildSignedCloudinaryUrl(uploadResult);


        // Only send response once, after upload completes
        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: signedUrl,
        });
    }

    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
}

const viewQuotationPdf = async (req, res) => {
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
