const express = require("express")
const cloudinary = require("../config/cloudinary")
const streamifier = require("streamifier")
const { upload } = require("../middleware/uploadFile")


const uploadReceiptProof = async (req, res) => {
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

module.exports = { uploadReceiptProof };