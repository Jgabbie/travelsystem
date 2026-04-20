const mongoose = require('mongoose');

const ArchivedQuotationSchema = new mongoose.Schema({
    originalQuotationId: { type: mongoose.Schema.Types.ObjectId, required: true },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    quotationDetails: { type: Object, required: true },
    reference: { type: String, required: true },
    status: { type: String, required: true },
    currentPdfUrl: { type: String },
    pdfRevisions: { type: Array, default: [] },
    revisionComments: { type: Array, default: [] },
    createdAt: { type: Date },
    archivedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ArchivedQuotationModel = mongoose.model('archivedquotations', ArchivedQuotationSchema);

module.exports = ArchivedQuotationModel;
