const express = require("express")
const cloudinary = require("../config/cloudinary")
const https = require("https")
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

const buildPrivateAccessUrl = (req, uploadResult) => {
    if (!uploadResult?.public_id) {
        return null;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const params = new URLSearchParams({
        publicId: uploadResult.public_id,
        resourceType: uploadResult.resource_type || 'image',
    });

    const format = getCloudinaryFormat(uploadResult);
    if (format) {
        params.set('format', format);
    }

    return `${baseUrl}/api/upload/private-file?${params.toString()}`;
};


const uploadReceiptProof = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        // Use upload_stream with a Promise to await the upload
        const uploadResult = await uploadBufferToCloudinary(req.file, 'manual-deposits');
        const publicUrl = uploadResult?.secure_url || buildPrivateAccessUrl(req, uploadResult);

        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: publicUrl,
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
            uploadBufferToCloudinary(file, 'booking-documents').then(result => result?.secure_url || buildPrivateAccessUrl(req, result))
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
            urls: uploadedResults.map(result => result?.secure_url || buildPrivateAccessUrl(req, result))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
};

const uploadPackageVideo = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        const uploadResult = await uploadBufferToCloudinary(req.file, 'package-videos');

        return res.status(200).json({
            message: 'Video uploaded successfully.',
            url: uploadResult?.secure_url || buildPrivateAccessUrl(req, uploadResult)
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
        const publicUrl = uploadResult?.secure_url || buildPrivateAccessUrl(req, uploadResult);

        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: publicUrl,
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
            urls: uploadedResults.map(result => result?.secure_url || buildPrivateAccessUrl(req, result))
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
            urls: uploadedResults.map(result => result?.secure_url || buildPrivateAccessUrl(req, result))
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
        const publicUrl = uploadResult?.secure_url || buildPrivateAccessUrl(req, uploadResult);

        return res.status(200).json({
            message: 'File uploaded successfully.',
            url: publicUrl,
        });
    }

    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
}

const viewQuotationPdf = async (req, res) => {
    try {
        const publicId = req.query.publicId;
        const resourceType = req.query.resourceType || 'raw';
        const format = req.query.format || 'pdf';

        if (!publicId) {
            return res.status(400).json({ message: 'publicId is required' });
        }

        const url = cloudinary.utils.private_download_url(publicId, format, {
            resource_type: resourceType,
            type: 'private',
        });

        return https.get(url, (cloudRes) => {
            if (cloudRes.statusCode && cloudRes.statusCode >= 400) {
                let errorBody = '';
                cloudRes.on('data', (chunk) => {
                    errorBody += chunk.toString();
                });
                cloudRes.on('end', () => {
                    res.status(cloudRes.statusCode || 502).json({
                        message: 'Failed to fetch private file',
                        error: errorBody || 'Cloudinary request failed',
                    });
                });
                return;
            }

            if (cloudRes.headers['content-type']) {
                res.setHeader('Content-Type', cloudRes.headers['content-type']);
            }

            if (cloudRes.headers['content-length']) {
                res.setHeader('Content-Length', cloudRes.headers['content-length']);
            }

            if (cloudRes.headers['content-disposition']) {
                res.setHeader('Content-Disposition', cloudRes.headers['content-disposition']);
            }

            res.setHeader('Cache-Control', 'private, no-store, max-age=0');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            cloudRes.pipe(res);
        }).on('error', (error) => {
            console.error(error);
            if (!res.headersSent) {
                res.status(500).json({ message: 'Failed to generate signed URL' });
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to generate signed URL" });
    }
}

module.exports = { uploadReceiptProof, uploadBookingDocuments, uploadPackageImage, uploadPackageVideo, uploadProfilePicture, uploadPassportRequirements, uploadVisaRequirements, uploadCancellationProof, viewQuotationPdf };
