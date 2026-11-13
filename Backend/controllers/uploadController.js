import express from 'express';
import cloudinary from '../config/cloudinary.js';
import https from 'https';
import streamifier from 'streamifier';
import { upload } from '../middleware/uploadFile.js';
import BookingModel from '../models/booking.js';
import CancellationModel from '../models/cancellations.js';
import PassportModel from '../models/passport.js';
import VisaModel from '../models/visas.js';
import ArchivedBookingModel from '../models/archivedbookings.js';
import ArchivedCancellationModel from '../models/archivedcancellations.js';
import ArchivedPassportModel from '../models/archivedpassportapplications.js';
import ArchivedVisaModel from '../models/archivedvisaapplications.js';
import UserModel from '../models/user.js';


//upload to cloudinary function
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


//get cloudinary format function
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


//build private access URL function
const buildPrivateAccessUrl = (req, uploadResult) => {
    if (!uploadResult?.public_id) {
        return null;
    }

    const baseUrl = (
        process.env.BACKEND_URL ||
        process.env.API_URL ||
        'https://api.mrctravelandtours.com'
    ).replace(/\/+$/, '');
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

const sensitiveFolders = new Set([
    'booking-documents',
    'cancellation-proofs',
    'passport-requirements',
    'visa-requirements',
]);

const isSensitivePublicId = (publicId) =>
    [...sensitiveFolders].some((folder) =>
        decodeURIComponent(publicId).startsWith(`${folder}/`)
    );

const isStaffRole = (role) =>
    ['admin', 'employee'].includes(
        String(role || '').trim().toLowerCase()
    );

const valuesContainPublicId = (value, publicId) => {
    const normalizedPublicId = decodeURIComponent(publicId).replace(/\.[^/.]+$/, '');

    if (typeof value === 'string') {
        try {
            if (decodeURIComponent(value).replace(/\.[^/.]+$/, '') === normalizedPublicId) {
                return true;
            }

            const fileUrl = new URL(value);
            const proxyPublicId = fileUrl.searchParams.get('publicId');
            if (
                proxyPublicId &&
                decodeURIComponent(proxyPublicId).replace(/\.[^/.]+$/, '') === normalizedPublicId
            ) {
                return true;
            }

            const pathname = fileUrl.pathname;
            const publicIdFolder = [...sensitiveFolders].find((folder) =>
                pathname.includes(`/${folder}/`)
            );
            if (!publicIdFolder) {
                return false;
            }

            const publicPath = pathname.slice(
                pathname.indexOf(`/${publicIdFolder}/`) + 1
            );

            return decodeURIComponent(publicPath).replace(/\.[^/.]+$/, '') === normalizedPublicId;
        } catch {
            return false;
        }
    }

    if (Array.isArray(value)) {
        return value.some((item) => valuesContainPublicId(item, publicId));
    }

    if (value && typeof value === 'object') {
        return Object.values(value).some((item) =>
            valuesContainPublicId(item, publicId)
        );
    }

    return false;
};

const userOwnsSensitiveFile = async (userId, publicId) => {
    const [
        bookings,
        cancellations,
        passportApplications,
        visaApplications,
        archivedBookings,
        archivedCancellations,
        archivedPassportApplications,
        archivedVisaApplications,
    ] = await Promise.all([
        BookingModel.find({ userId }).select('passportFiles photoFiles travelers bookingDetails').lean(),
        CancellationModel.find({ userId }).select('imageProof').lean(),
        PassportModel.find({ userId }).select('submittedDocuments').lean(),
        VisaModel.find({ userId }).select('submittedDocuments').lean(),
        ArchivedBookingModel.find({ userId }).select('passportFiles photoFiles travelers bookingDetails').lean(),
        ArchivedCancellationModel.find({ userId }).select('imageProof').lean(),
        ArchivedPassportModel.find({ userId }).select('submittedDocuments').lean(),
        ArchivedVisaModel.find({ userId }).select('submittedDocuments').lean(),
    ]);

    return [
        ...bookings,
        ...cancellations,
        ...passportApplications,
        ...visaApplications,
        ...archivedBookings,
        ...archivedCancellations,
        ...archivedPassportApplications,
        ...archivedVisaApplications,
    ].some((record) =>
        Object.values(record).some((value) => valuesContainPublicId(value, publicId))
    );
};

const assertPrivateFileOwnership = async (req, res, publicId) => {
    if (!isSensitivePublicId(publicId)) {
        return true;
    }

    if (!req.userId) {
        res.status(403).json({
            message: 'You are not authorized to access this file',
        });
        return false;
    }

    const authenticatedUser = req.authUser?.role
        ? req.authUser
        : await UserModel.findById(req.userId)
            .select('role')
            .lean();

    if (isStaffRole(authenticatedUser?.role)) {
        return true;
    }

    const isOwner = await userOwnsSensitiveFile(req.userId, publicId);

    if (!isOwner) {
        res.status(403).json({
            message: 'You are not authorized to access this file',
        });
        return false;
    }

    return true;
};


//upload receipt proof function
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


//upload booking documents function
const uploadBookingDocuments = async (req, res) => {

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const uploadPromises = req.files.map(file =>
            uploadBufferToCloudinary(file, 'booking-documents').then(result => buildPrivateAccessUrl(req, result))
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


//upload package image function
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
            urls: uploadedResults.map(result => result?.secure_url)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
};


//upload package video function
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


//upload profile picture function
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


//upload service image function
const uploadServiceImage = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            message: 'No image uploaded.'
        });
    }

    try {
        if (!req.file.mimetype?.startsWith('image/')) {
            return res.status(400).json({
                message: 'Only image files are allowed.'
            });
        }

        const uploadResult = await uploadBufferToCloudinary(
            req.file,
            'service-images'
        );

        const imageUrl =
            buildPrivateAccessUrl(req, uploadResult) ||
            uploadResult?.secure_url;

        return res.status(200).json({
            message: 'Service image uploaded successfully.',
            imageUrl,
            publicId: uploadResult.public_id
        });
    } catch (err) {
        console.error('Service image upload error:', err);

        return res.status(500).json({
            message: 'Service image upload failed.',
            error: err.message
        });
    }
};


//upload passport requirements function
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
            urls: uploadedResults.map(result => buildPrivateAccessUrl(req, result))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
}


//upload visa requirements function
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
            urls: uploadedResults.map(result => buildPrivateAccessUrl(req, result))
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Upload failed", error: err.message });
    }
}


//upload cancellation proof function
const uploadCancellationProof = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {

        const uploadResult = await uploadBufferToCloudinary(req.file, 'cancellation-proofs');
        const publicUrl = buildPrivateAccessUrl(req, uploadResult);

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


//view quotation PDF function
const viewQuotationPdf = async (req, res) => {
    try {
        const publicId = req.query.publicId;
        const resourceType = req.query.resourceType || 'raw';
        const format = req.query.format || 'pdf';

        if (!publicId) {
            return res.status(400).json({ message: 'publicId is required' });
        }

        if (!(await assertPrivateFileOwnership(req, res, publicId))) {
            return;
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


export {
    uploadServiceImage,
    uploadReceiptProof,
    uploadBookingDocuments,
    uploadPackageImage,
    uploadPackageVideo,
    uploadProfilePicture,
    uploadPassportRequirements,
    uploadVisaRequirements,
    uploadCancellationProof,
    viewQuotationPdf
};
