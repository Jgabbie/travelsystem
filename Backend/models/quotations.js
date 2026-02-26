const mongoose = require('mongoose')

const RevisionCommentSchema = new mongoose.Schema({
    comments: { type: String, required: true },

    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },

    authorName: { type: String, required: true },

    role: {
        type: String,
        enum: ['User', 'Admin', 'Agent'],
        required: true
    },

    createdAt: { type: Date, default: Date.now }
})


const PdfRevisionSchema = new mongoose.Schema({
    url: { type: String, required: true },

    version: { type: Number, required: true },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },

    uploaderName: { type: String, required: true },

    uploadedAt: { type: Date, default: Date.now }
})


const QuotationSchema = new mongoose.Schema({
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },

    userName: { type: String, required: true },
    packageName: { type: String, required: true },

    travelDetails: { type: Object, required: true },

    reference: { type: String, required: true, unique: true },

    status: {
        type: String,
        enum: [
            'Pending',
            'Under Review',
            'Revision Requested',
            'Revised',
            'Approved',
            'Rejected'
        ],
        default: 'Pending'
    },

    currentPdfUrl: { type: String },
    pdfRevisions: [PdfRevisionSchema],
    revisionComments: [RevisionCommentSchema]

}, { timestamps: true })

module.exports = mongoose.model('quotations', QuotationSchema)