import cloudinary from '../config/cloudinary.js'
import QuotationModel from '../models/quotations.js'
import ArchivedQuotationModel from '../models/archivedquotations.js'
import UserModel from '../models/user.js'
import NotificationModel from '../models/notification.js'
import logAction from '../utils/logger.js'
import transporter from '../config/nodemailer.js'
import { buildBrandedEmail } from '../utils/emailTemplate.js'


//generate unique quotation reference
const generateQuotationReference = () => {
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(1000 + Math.random() * 9000)
    return `QT-${timestamp}${random}`
}


//create quotation function
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


//get user quotations function
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


//get all quotations function 
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

//get archived quotations function
const getArchivedQuotations = async (_req, res) => {
    try {
        const quotations = await ArchivedQuotationModel.find({}).sort({ archivedAt: -1 })
            .populate('userId', 'username')
            .populate('packageId', 'packageName packageType')

        res.status(200).json(quotations)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching archived quotations', error })
    }
}


//update quotation function
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


//archive quotation function
const deleteQuotation = async (req, res) => {
    const { id } = req.params

    try {
        const quotation = await QuotationModel.findById(id)
        if (!quotation) {
            return res.status(404).json({ message: 'Quotation not found' })
        }

        await ArchivedQuotationModel.create({
            originalQuotationId: quotation._id,
            packageId: quotation.packageId,
            userId: quotation.userId,
            quotationDetails: quotation.quotationDetails,
            reference: quotation.reference,
            status: quotation.status,
            currentPdfUrl: quotation.currentPdfUrl,
            pdfRevisions: quotation.pdfRevisions,
            revisionComments: quotation.revisionComments,
            createdAt: quotation.createdAt
        })

        await QuotationModel.findByIdAndDelete(id)

        logAction('QUOTATION_ARCHIVED', req.userId, { "Quotation Archived": `Reference: ${quotation.reference}` })
        res.status(200).json({ message: 'Quotation archived' })
    } catch (error) {
        res.status(500).json({ message: 'Error archiving quotation', error })
    }
}


//restore quotation function
const restoreArchivedQuotation = async (req, res) => {
    const { id } = req.params

    try {
        const archivedQuotation = await ArchivedQuotationModel.findById(id)
        if (!archivedQuotation) {
            return res.status(404).json({ message: 'Archived quotation not found' })
        }

        const existingQuotation = await QuotationModel.findOne({ reference: archivedQuotation.reference })
        if (existingQuotation) {
            return res.status(409).json({ message: 'Quotation with this reference already exists' })
        }

        const restoredQuotation = await QuotationModel.create({
            _id: archivedQuotation.originalQuotationId,
            packageId: archivedQuotation.packageId,
            userId: archivedQuotation.userId,
            quotationDetails: archivedQuotation.quotationDetails,
            reference: archivedQuotation.reference,
            status: archivedQuotation.status,
            currentPdfUrl: archivedQuotation.currentPdfUrl,
            pdfRevisions: archivedQuotation.pdfRevisions,
            revisionComments: archivedQuotation.revisionComments,
            createdAt: archivedQuotation.createdAt
        })

        await ArchivedQuotationModel.findByIdAndDelete(id)

        logAction('QUOTATION_RESTORED', req.userId, { "Quotation Restored": `Reference: ${restoredQuotation.reference}` })
        res.status(200).json({ message: 'Quotation restored', quotation: restoredQuotation })
    } catch (error) {
        res.status(500).json({ message: 'Error restoring quotation', error })
    }
}


//get single quotation function
const getQuotation = async (req, res) => {
    try {
        const { id } = req.params
        const quotation = await QuotationModel.findById(id)
            .populate('packageId', 'packageName packageType packageItineraries packageInclusions packageExclusions')
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


//upload quotation PDF function
const uploadQuotationPDF = async (req, res) => {
    const { id } = req.params
    const file = req.file

    if (!file) {
        return res.status(400).json({
            message: 'No PDF file uploaded'
        })
    }

    try {
        // Find quotation first before uploading
        const quotation = await QuotationModel.findById(id)

        if (!quotation) {
            return res.status(404).json({
                message: 'Quotation not found'
            })
        }

        // Get the employee/admin who uploaded the PDF
        const uploader = await UserModel.findById(req.userId)
            .select('username')

        // Get the customer who owns the quotation
        const quotationUser = await UserModel.findById(quotation.userId)
            .select('email firstname username')

        const versionNumber = quotation.pdfRevisions.length + 1

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'quotation-pdfs',
                    resource_type: 'image',
                    format: 'pdf'
                },
                (error, result) => {
                    if (error) {
                        return reject(error)
                    }

                    resolve(result)
                }
            )

            stream.end(file.buffer)
        })

        const pdfUrl = uploadResult.secure_url

        quotation.status = 'Under Review'

        quotation.pdfRevisions.push({
            url: pdfUrl,
            version: versionNumber,
            uploaderName: uploader?.username || 'Administrator',
            uploadedBy: req.userId,
            uploadedAt: new Date()
        })

        await quotation.save()

        // Create in-app notification
        try {
            await NotificationModel.create({
                userId: quotation.userId,
                title: 'Quotation update available',
                message: `Your quotation ${quotation.reference} has a new PDF update.`,
                type: 'quotation',
                link: '/user-package-quotation',
                metadata: {
                    quotationId: quotation._id
                },
                pushStatus: 'pending'
            })
        } catch (notificationError) {
            console.error(
                'Failed to create quotation notification:',
                notificationError
            )
        }

        // Send email notification
        // Send email notification
        let emailSent = false
        let emailErrorMessage = null

        if (!quotationUser?.email) {
            emailErrorMessage =
                `Customer email was not found for quotation ${quotation.reference}`

            console.error(emailErrorMessage)
        } else {
            const recipientName =
                quotationUser.firstname ||
                quotationUser.username ||
                'Customer'

            const clientUrl =
                process.env.FRONTEND_URL ||
                'http://localhost:3000'

            const quotationPageUrl =
                `${clientUrl}/user-package-quotation`

            const senderEmail =
                process.env.SENDER_EMAIL ||
                process.env.SMTP_USER

            if (!senderEmail) {
                emailErrorMessage =
                    'SENDER_EMAIL and SMTP_USER are not configured.'

                console.error(emailErrorMessage)
            } else {
                const mailOptions = {
                    from: `"M&RC Travel and Tours" <${senderEmail}>`,
                    to: quotationUser.email,
                    subject: `Quotation Available - ${quotation.reference}`,
                    html: buildBrandedEmail({
                        title: 'Your Quotation Is Available',
                        introHtml: `Hello <strong>${recipientName}</strong>,`,
                        bodyHtml: `
                    <p style="margin:0 0 12px;">
                        Your requested quotation is now available.
                    </p>

                    <div style="
                        margin:16px 0;
                        padding:14px 16px;
                        background:#f8fafc;
                        border:1px solid #e2e8f0;
                        border-radius:10px;
                    ">
                        <p style="margin:0 0 8px;">
                            <strong>Quotation reference:</strong>
                            ${quotation.reference}
                        </p>

                        <p style="margin:0 0 8px;">
                            <strong>PDF version:</strong>
                            ${versionNumber}
                        </p>

                        <p style="margin:0;">
                            <strong>Status:</strong>
                            Under Review
                        </p>
                    </div>

                    <p style="margin:0;">
                        You can view the quotation and submit a revision
                        request through your account.
                    </p>
                `,
                        ctaText: 'View Quotation',
                        ctaUrl: quotationPageUrl
                    })
                }

                for (let attempt = 1; attempt <= 2; attempt += 1) {
                    try {

                        const emailResult =
                            await transporter.sendMail(mailOptions)

                        const acceptedRecipients =
                            Array.isArray(emailResult?.accepted)
                                ? emailResult.accepted
                                : []

                        const rejectedRecipients =
                            Array.isArray(emailResult?.rejected)
                                ? emailResult.rejected
                                : []

                        if (
                            acceptedRecipients.length === 0 &&
                            rejectedRecipients.length > 0
                        ) {
                            throw new Error(
                                `Email rejected for: ${rejectedRecipients.join(', ')}`
                            )
                        }

                        emailSent = true
                        emailErrorMessage = null

                        break
                    } catch (emailError) {
                        emailErrorMessage =
                            emailError?.response ||
                            emailError?.message ||
                            'Unknown email sending error'

                        console.error(
                            `Quotation email attempt ${attempt} failed:`,
                            {
                                quotationReference: quotation.reference,
                                recipient: quotationUser.email,
                                message: emailError?.message,
                                code: emailError?.code,
                                command: emailError?.command,
                                response: emailError?.response,
                                responseCode: emailError?.responseCode
                            }
                        )

                        if (attempt < 2) {
                            await new Promise((resolve) =>
                                setTimeout(resolve, 1000)
                            )
                        }
                    }
                }
            }
        }

        logAction(
            'QUOTATION_FORM_UPLOADED',
            req.userId,
            {
                'Quotation Form Uploaded':
                    `Reference: ${quotation.reference}`
            }
        )

        return res.status(emailSent ? 200 : 207).json({
            message: emailSent
                ? 'PDF uploaded and quotation email sent successfully'
                : 'PDF uploaded, but the quotation email was not sent',
            quotation,
            emailSent,
            emailRecipient: quotationUser?.email || null,
            emailError: emailSent ? null : emailErrorMessage
        })
    } catch (error) {
        console.error('UPLOAD QUOTATION PDF ERROR:', error)

        return res.status(500).json({
            message: 'Error uploading PDF',
            error: error.message
        })
    }
}


//upload travel details function
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


//request revision function
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


export {
    createQuotation,
    getUserQuotations,
    getAllQuotations,
    getArchivedQuotations,
    restoreArchivedQuotation,
    updateQuotation,
    deleteQuotation,
    getQuotation,
    uploadQuotationPDF,
    requestRevision,
    uploadTravelDetails
};
