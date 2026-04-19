const cloudinary = require('../config/cloudinary')
const QuotationModel = require('../models/quotations')
const UserModel = require('../models/user')
const NotificationModel = require('../models/notification')
const logAction = require('../utils/logger')


//GENERATE UNIQUE QUOTATION REFERENCE -----------------------------------------------------
const generateQuotationReference = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(1000 + Math.random() * 9000)
    return `QT-${timestamp}${random}`
}


//CREATE QUOTATION ------------------------------------------------------------------------
const createQuotation = async (req, res) => {
    const { packageId, quotationDetails } = req.body
    const userId = req.userId

    try {
        const userName = await UserModel.findById(userId).select('username')

        if (!packageId || !quotationDetails) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        const newQuotation = await QuotationModel.create({
            packageId,
            userId,
            quotationDetails,
            reference: generateQuotationReference(),
            status: 'Pending'
        })

        const packageName = await QuotationModel.findById(packageId).select('packageName')

        logAction('QUOTATION_CREATED', userId, { "Quotation Created: ": `Reference: ${newQuotation.reference}` })

        const io = req.app.get('io')
        if (io) {
            io.emit('quotation:created', {
                id: newQuotation._id,
                createdAt: newQuotation.createdAt
            })
        }

        res.status(201).json(newQuotation)

    } catch (error) {
        console.error("CREATE QUOTATION ERROR:", error)

        res.status(500).json({
            message: "Error creating quotation",
            error: error.message
        })
    }
}


//GET USER QUOTATIONS ---------------------------------------------------------------------
const getUserQuotations = async (req, res) => {
    const userId = req.userId
    try {
        const quotations = await QuotationModel.find({ userId }).sort({ createdAt: -1 })
            .populate('packageId', 'packageName packageType')
        res.status(200).json(quotations)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotations', error })
    }
}


//GET ALL QUOTATIONS (ADMIN) --------------------------------------------------------------
const getAllQuotations = async (_req, res) => {
    try {
        const quotations = await QuotationModel.find({}).sort({ createdAt: -1 })
            .populate('userId', 'username')
            .populate('packageId', 'packageName packageType')

        res.status(200).json(quotations)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotations', error })
    }
}


//UPDATE QUOTATION ------------------------------------------------------------------------
const updateQuotation = async (req, res) => {
    const { id } = req.params
    const { status, travelDetails } = req.body
    try {
        const updatedQuotation = await QuotationModel.findByIdAndUpdate(
            id,
            {
                ...(status ? { status } : {}),
                ...(travelDetails ? { travelDetails } : {})
            },
            { new: true }
        )
        if (!updatedQuotation) {
            return res.status(404).json({ message: 'Quotation not found' })
        }
        logAction('QUOTATION_UPDATED', req.userId, { "Quotation Updated": `Reference: ${updatedQuotation.reference}` })
        res.status(200).json(updatedQuotation)
    } catch (error) {
        res.status(500).json({ message: 'Error updating quotation', error })
    }
}


//DELETE QUOTATION ------------------------------------------------------------------------
const deleteQuotation = async (req, res) => {
    const { id } = req.params

    try {
        const deletedQuotation = await QuotationModel.findByIdAndDelete(id)
        if (!deletedQuotation) {
            return res.status(404).json({ message: 'Quotation not found' })
        }

        logAction('QUOTATION_DELETED', req.userId, { "Quotation Deleted": `Reference: ${deletedQuotation.reference}` })
        res.status(200).json({ message: 'Quotation deleted' })
    } catch (error) {
        res.status(500).json({ message: 'Error deleting quotation', error })
    }
}


//GET SINGLE QUOTATION -------------------------------------------------------------------
const getQuotation = async (req, res) => {
    try {
        const { id } = req.params
        const quotation = await QuotationModel.findById(id)
            .populate('packageId', 'packageName packageItineraries packageInclusions packageExclusions')
            .populate('userId', 'username')

        if (!quotation) return res.status(404).json({ message: "Quotation not found" })

        const latestPdfRevision = quotation.pdfRevisions?.length
            ? quotation.pdfRevisions[quotation.pdfRevisions.length - 1]
            : null

        res.status(200).json({
            ...quotation.toObject(),
            latestPdfRevision
        })
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotation', error })
    }
}


//UPLOAD QUOTATION PDF -------------------------------------------------------------------
const uploadQuotationPDF = async (req, res) => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
    }

    try {
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'quotation-pdfs',
                    resource_type: 'image',
                    format: 'pdf'
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );

            stream.end(file.buffer);
        });

        const pdfUrl = uploadResult.secure_url;
        const quotation = await QuotationModel.findById(id);

        if (!quotation) {
            return res.status(404).json({ message: "Quotation not found" });
        }

        const userName = await UserModel.findById(req.userId).select('username')


        quotation.status = 'Under Review'
        quotation.pdfRevisions.push({
            url: pdfUrl,
            version: quotation.pdfRevisions.length + 1,
            uploaderName: userName.username,
            uploadedBy: req.userId, uploadedAt: new Date()
        });

        await quotation.save();

        try {
            await NotificationModel.create({
                userId: quotation.userId,
                title: 'Quotation update available',
                message: `Your quotation ${quotation.reference} has a new PDF update.`,
                type: 'quotation',
                link: '/user-package-quotation',
                metadata: { quotationId: quotation._id }
            })
        } catch (notificationError) {
            console.error('Failed to create notification:', notificationError)
        }

        logAction('QUOTATION_FORM_UPLOADED', req.userId, { "Quotation FORM Uploaded": `Reference: ${quotation.reference}` });

        res.status(200).json({ message: "PDF uploaded successfully", quotation: quotation });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading PDF', error });
    }
};


//UPLOAD TRAVEL DETAILS (ADMIN) ---------------------------------------------------------
const uploadTravelDetails = async (req, res) => {
    const { id } = req.params
    const { travelDetails } = req.body

    try {
        const quotation = await QuotationModel.findById(id)

        if (!quotation) {
            return res.status(404).json({ message: "Quotation not found" })
        }

        quotation.pdfRevisions[quotation.pdfRevisions.length - 1].travelDetails = travelDetails
        const updatedQuotation = await quotation.save()

        res.status(200).json({ message: "Travel details updated successfully", quotation: updatedQuotation });
    } catch (error) {
        res.status(500).json({ message: 'Error updating travel details', error });
    }
};

//REQUEST REVISION (ADMIN) ----------------------------------------------------------------
const requestRevision = async (req, res) => {
    const { id } = req.params
    const { notes } = req.body
    try {
        const quotation = await QuotationModel.findById(id)
        const userName = await UserModel.findById(req.userId).select('username')
        const userRole = await UserModel.findById(req.userId).select('role')

        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' })
        }

        quotation.status = 'Revision Requested'
        quotation.revisionComments.push({
            authorId: req.userId,
            authorName: userName.username,
            role: userRole.role,
            comments: notes,
            createdAt: new Date()
        })
        await quotation.save()
        logAction('QUOTATION_REVISION_REQUESTED', req.userId, { "Quotation Revision Requested": `Reference: ${quotation.reference}` })
        res.status(200).json({ message: 'Revision requested successfully', quotation })

    } catch (error) {
        res.status(500).json({ message: 'Error requesting revision', error })
    }
}


module.exports = {
    createQuotation,
    getUserQuotations,
    getAllQuotations,
    updateQuotation,
    deleteQuotation,
    getQuotation,
    uploadQuotationPDF,
    requestRevision,
    uploadTravelDetails
}