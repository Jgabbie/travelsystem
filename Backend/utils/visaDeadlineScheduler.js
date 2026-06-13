import VisaModel from '../models/visas.js';
import {
    getVisaDeadlineInfo,
    processVisaDeadlineAction,
} from '../controllers/visaController.js';

const processVisaDeadlines = async () => {
    const applications = await VisaModel.find({
        status: { $nin: ['Processing by Embassy', 'Embassy Approved', 'DFA Approved', 'Passport Released', 'Rejected'] },
    });

    for (const application of applications) {
        try {
            const deadlineInfo = getVisaDeadlineInfo(application);
            if (!deadlineInfo) {
                continue;
            }

            await processVisaDeadlineAction(application);
        } catch (error) {
            console.error('Failed to process visa deadline action:', error);
        }
    }
};

const startVisaDeadlineScheduler = () => {
    processVisaDeadlines().catch((error) => {
        console.error('Visa deadline scheduler startup run failed:', error);
    });

    setInterval(() => {
        processVisaDeadlines().catch((error) => {
            console.error('Visa deadline scheduler interval run failed:', error);
        });
    }, 60 * 60 * 1000);
};

export {
    processVisaDeadlines,
    startVisaDeadlineScheduler,
};