import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'bookings', required: false }, // make optional
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'passportApplications', required: false },
    applicationType: { type: String, required: false }, // ADD THIS
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    invoiceNumber: { type: String, required: false },
    reference: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: { type: String, required: true },
    proofImage: { type: String },
    proofImageType: { type: String },
    proofFileName: { type: String },
    paymentType: { type: String },
    transactionDate: {
        type: Date,
        default: Date.now,
    },
    items: [
        {
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            description: {
                type: String,
                required: true,
                trim: true,
            },
            unitPrice: {
                type: Number,
                required: true,
                min: 0,
            },
            amount: {
                type: Number,
                required: true,
                min: 0,
            },
        },
    ],
}, { timestamps: true });

TransactionSchema.index({ createdAt: -1 });
TransactionSchema.index({ transactionDate: -1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ method: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ packageId: 1, createdAt: -1 });
TransactionSchema.index({ reference: 1 });
TransactionSchema.index({ invoiceNumber: 1 });

export default mongoose.model('transactions', TransactionSchema);