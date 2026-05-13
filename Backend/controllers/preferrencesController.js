const PreferrencesModel = require('../models/preferrences');
const { scheduleRetrain } = require('../utils/recommendationRetrainQueue');

const savePreferrences = async (req, res) => {
    try {
        const { userId } = req;
        const { moods = [], tours = [], pace = [] } = req.body || {};

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const updated = await PreferrencesModel.findOneAndUpdate(
            { userId },
            { userId, moods, tours, pace },
            { returnDocument: 'after', upsert: true }
        );

        // Keep recommendations fresh after preference updates.
        scheduleRetrain('preferences-updated');

        res.status(200).json({ success: true, preferrences: updated });
    } catch (e) {
        res.status(500).json({ message: 'Save preferences failed: ' + e.message });
    }
};

const getMyPreferrences = async (req, res) => {
    try {
        const { userId } = req;
        const pref = await PreferrencesModel.findOne({ userId });
        res.status(200).json({ success: true, preferrences: pref });
    } catch (e) {
        res.status(500).json({ message: 'Get preferences failed: ' + e.message });
    }
};

module.exports = { savePreferrences, getMyPreferrences };

