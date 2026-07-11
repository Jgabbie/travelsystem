import PreferrencesModel from '../models/preferrences.js';
import { scheduleRetrain } from '../utils/recommendationRetrainQueue.js';


//save preferrences function
const savePreferrences = async (req, res) => {
    try {
        const { userId } = req;
        const {
            moods = [],
            tours = [],
            pace = []
        } = req.body || {};

        if (!userId) {
            return res.status(401).json({
                message: 'Unauthorized'
            });
        }

        const normalizeList = (values) => {
            if (!Array.isArray(values)) return [];

            const uniqueValues = new Map();

            values.forEach((value) => {
                const cleanedValue = String(value || '').trim();

                if (!cleanedValue) return;

                const normalizedValue = cleanedValue.toLowerCase();

                if (!uniqueValues.has(normalizedValue)) {
                    uniqueValues.set(normalizedValue, cleanedValue);
                }
            });

            return Array.from(uniqueValues.values());
        };

        const normalizedMoods = normalizeList(moods);
        const normalizedTours = normalizeList(tours);
        const normalizedPace = normalizeList(pace);

        if (normalizedMoods.length !== 3) {
            return res.status(400).json({
                message: 'Please select exactly 3 mood preferences.'
            });
        }

        if (
            normalizedTours.length < 1 ||
            normalizedTours.length > 2
        ) {
            return res.status(400).json({
                message: 'Please select 1 or 2 tour preferences.'
            });
        }

        const updated = await PreferrencesModel.findOneAndUpdate(
            { userId },
            {
                userId,
                moods: normalizedMoods,
                tours: normalizedTours,
                pace: normalizedPace
            },
            {
                returnDocument: 'after',
                upsert: true
            }
        );

        scheduleRetrain('preferences-updated');

        return res.status(200).json({
            success: true,
            preferrences: updated
        });
    } catch (error) {
        return res.status(500).json({
            message: `Save preferences failed: ${error.message}`
        });
    }
};


//get my preferrences function
const getMyPreferrences = async (req, res) => {
    try {
        const { userId } = req;
        const pref = await PreferrencesModel.findOne({ userId });
        res.status(200).json({ success: true, preferrences: pref });
    } catch (e) {
        res.status(500).json({ message: 'Get preferences failed: ' + e.message });
    }
};

export {
    savePreferrences,
    getMyPreferrences
};

