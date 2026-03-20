const upload = require('../middleware/upload')
const QuotationModel = require('../models/quotations')
const UserModel = require('../models/user')
const NotificationModel = require('../models/notification')
const logAction = require('../utils/logger')

const generateQuotationReference = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(1000 + Math.random() * 9000)
    return `QT-${timestamp}${random}`
}

const createQuotation = async (req, res) => {
    const { packageId, packageName, travelDetails } = req.body
    const userId = req.userId

    console.log("Creating quotation with data:", { packageId, packageName, userId, travelDetails })

    try {
        const userName = await UserModel.findById(userId).select('username')
        console.log("User found for quotation:", userName.username)

        if (!packageId || !packageName || !userId || !travelDetails) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        const newQuotation = await QuotationModel.create({
            packageId,
            userName: userName.username,
            packageName,
            userId,
            travelDetails,
            reference: generateQuotationReference(),
            status: 'Pending'
        })

        console.log("Quotation created successfully:", newQuotation)

        logAction('QUOTATION_CREATED', userId, {
            quotationId: newQuotation._id,
            packageId
        })

        res.status(201).json(newQuotation)

    } catch (error) {
        console.error("CREATE QUOTATION ERROR:", error)

        res.status(500).json({
            message: "Error creating quotation",
            error: error.message
        })
    }
}

const getUserQuotations = async (req, res) => {
    const userId = req.userId
    try {
        const quotations = await QuotationModel.find({ userId }).sort({ createdAt: -1 })
        res.status(200).json(quotations)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotations', error })
    }
}

const getAllQuotations = async (_req, res) => {
    try {
        const quotations = await QuotationModel.find({}).sort({ createdAt: -1 })
        res.status(200).json(quotations)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotations', error })
    }
}

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
        logAction('QUOTATION_UPDATED', req.userId, { quotationId: id })
        res.status(200).json(updatedQuotation)
    } catch (error) {
        res.status(500).json({ message: 'Error updating quotation', error })
    }
}

const deleteQuotation = async (req, res) => {
    const { id } = req.params

    try {
        const deletedQuotation = await QuotationModel.findByIdAndDelete(id)
        if (!deletedQuotation) {
            return res.status(404).json({ message: 'Quotation not found' })
        }

        logAction('QUOTATION_DELETED', req.userId, { quotationId: id })
        res.status(200).json({ message: 'Quotation deleted' })
    } catch (error) {
        res.status(500).json({ message: 'Error deleting quotation', error })
    }
}

const getQuotation = async (req, res) => {
    try {
        const { id } = req.params
        const quotation = await QuotationModel.findById(id)
            .populate('packageId', 'packageItineraries packageInclusions packageExclusions')


        if (!quotation) return res.status(404).json({ message: "Quotation not found" })


        res.status(200).json(quotation)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quotation', error })
    }
}

const uploadQuotationPDF = async (req, res) => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: "No PDF file uploaded" });
    }

    try {
        const pdfUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        const quotation = await QuotationModel.findById(id);

        if (!quotation) {
            return res.status(404).json({ message: "Quotation not found" });
        }

        const userName = await UserModel.findById(req.userId).select('username')

        console.log("Current PDF URL before upload:", pdfUrl)


        quotation.status = 'Under Review'
        quotation.pdfRevisions.push({
            url: pdfUrl,
            version: quotation.pdfRevisions.length + 1,
            uploaderName: userName.username,
            uploadedBy: req.userId,
            uploadedAt: new Date()
        });




        // const updatedQuotation = await QuotationModel.findByIdAndUpdate(
        //     id,
        //     { pdfUrl, pdfRevisions: quotation.pdfRevisions, status: 'Under Review' },
        //     { new: true }
        // );

        // if (!updatedQuotation) {
        //     return res.status(404).json({ message: "Quotation not found" });
        // }
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

        logAction('QUOTATION_PDF_UPLOADED', req.userId, { quotationId: id });

        res.status(200).json({ message: "PDF uploaded successfully", quotation: quotation });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading PDF', error });
    }
};

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
        logAction('QUOTATION_REVISION_REQUESTED', req.userId, { quotationId: id })
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
    requestRevision
}