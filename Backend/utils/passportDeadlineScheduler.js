const PassportModel = require('../models/passport');
const { processPassportDeadlineAction } = require('../controllers/passportController');

const processPassportDeadlines = async () => {
    const applications = await PassportModel.find({
        status: { $nin: ['DFA Approved', 'Passport Released', 'Rejected'] },
    });

    for (const application of applications) {
        try {
            await processPassportDeadlineAction(application);
        } catch (error) {
            console.error('Failed to process passport deadline reminder:', error);
        }
    }
};

const startPassportDeadlineScheduler = () => {
    processPassportDeadlines().catch((error) => {
        console.error('Passport deadline scheduler startup run failed:', error);
    });

    setInterval(() => {
        processPassportDeadlines().catch((error) => {
            console.error('Passport deadline scheduler interval run failed:', error);
        });
    }, 60 * 60 * 1000);
};

module.exports = {
    processPassportDeadlines,
    startPassportDeadlineScheduler,
};