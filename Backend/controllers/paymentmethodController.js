
import PaymentMethod from '../models/paymentmethods.js';
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


const createMethod = async (req, res) => {



    try {

        let image = "";

        if (req.file) {
            const result = await uploadBufferToCloudinary(
                req.file,
                "payment-methods"
            );

            image = result.secure_url;
        }

        const method = await PaymentMethod.create({
            paymentType: req.body.paymentType,
            number: req.body.number,
            accountName: req.body.accountName,
            additionalInfo: req.body.additionalInfo,
            image
        });

        res.status(201).json(method);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const getMethods = async (req, res) => {
    try {
        const methods = await PaymentMethod.find()
            .sort({ createdAt: -1 });

        res.json(methods);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const updateMethod = async (req, res) => {
    try {
        const updateData = {
            paymentType: req.body.paymentType,
            number: req.body.number,
            accountName: req.body.accountName,
            additionalInfo: req.body.additionalInfo,
        };

        if (req.file) {
            const result = await uploadBufferToCloudinary(
                req.file,
                "payment-methods"
            );

            updateData.image = result.secure_url;
        }

        const method = await PaymentMethod.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.json(method);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

const deleteMethod = async (req, res) => {
    try {
        await PaymentMethod.findByIdAndDelete(req.params.id);

        res.json({
            message: "Payment method deleted",
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};


export {
    createMethod,
    getMethods,
    updateMethod,
    deleteMethod,
};