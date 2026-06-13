import mongoose from 'mongoose';

const PreferrencesSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true, unique: true },
        moods: { type: [String], default: [] },
        tours: { type: [String], default: [] },
        pace: { type: [String], default: [] }
    },
    { timestamps: true }
);

const PreferrencesModel = mongoose.model('preferrences', PreferrencesSchema);

export default PreferrencesModel;
