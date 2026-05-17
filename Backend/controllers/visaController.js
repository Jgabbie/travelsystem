const VisaModel = require('../models/visas')
const ArchivedVisaApplicationModel = require('../models/archivedvisaapplications')
const TokenCheckoutVisaModel = require('../models/tokencheckoutvisa')
const ServiceModel = require('../models/service')
const UserModel = require('../models/user')
const NotificationModel = require('../models/notification')
const baseTransporter = require('../config/nodemailer')
const { buildBrandedEmail } = require('../utils/emailTemplate')
const logAction = require('../utils/logger')
const dayjs = require('dayjs')

const transporter = {
    ...baseTransporter,
    sendMail: (mailOptions = {}) => {
        const subjectText = String(mailOptions.subject || '').trim()
        const derivedTitle = subjectText
            ? subjectText.replace(/^M&RC Travel and Tours\s*-\s*/i, '')
            : 'M&RC Travel and Tours'

        return baseTransporter.sendMail({
            ...mailOptions,
            html: buildBrandedEmail({
                title: derivedTitle || 'M&RC Travel and Tours',
                bodyHtml: typeof mailOptions.html === 'string' ? mailOptions.html : '',
            }),
        })
    },
}

const PENALTY_AMOUNT = 1500;
const PENALTY_PAYMENT_WINDOW_DAYS = 1;
const SECOND_CHANCE_EXTENSION_DAYS = 3;

const VISA_STATUS_TOTAL_DAYS_MAP = {
    'Application Submitted': 2,
    'Application Approved': 4,
    'Payment Completed': 7,
    'Documents Uploaded': 12,
    'Documents Approved': 15,
    'Documents Received': 17,
    'Documents Submitted': 19,
    'Processing by Embassy': 19,
};

const VISA_STEPS_ORDER = [
    'Application Submitted',
    'Application Approved',
    'Payment Completed',
    'Documents Uploaded',
    'Documents Approved',
    'Documents Received',
    'Documents Submitted',
    'Processing by Embassy',
    'Embassy Approved',
    'DFA Approved',
    'Passport Released',
    'Rejected'
];

const buildVisaStatusTotalDaysMapFromSteps = (steps = []) => {
    const map = {};
    let total = 0;
    const trace = [];

    for (const step of steps) {
        const title = String(step?.title || '').trim();
        if (!title) continue;

        const days = Number(step?.daysToBeCompleted ?? 0);
        const safe = Number.isFinite(days) && days > 0 ? days : 0;

        total += safe;
        map[title] = total;
        trace.push({ title, daysToBeCompleted: safe, cumulativeDays: total });
    }

    return map;
};

const getVisaProcessStepsFromApplication = (application) => {
    if (!application) return [];

    if (application.serviceId && typeof application.serviceId === 'object' && Array.isArray(application.serviceId.visaProcessSteps)) {
        return application.serviceId.visaProcessSteps;
    }

    return [];
};

const getVisaDocumentLabel = (application, documentKey) => {
    if (!documentKey) return 'the selected document';

    const visaRequirements = Array.isArray(application?.serviceId?.visaRequirements)
        ? application.serviceId.visaRequirements
        : [];

    const matchedRequirement = visaRequirements.find((req, idx) => {
        const key = req?.key || req?.req || req?.label || `Requirement ${idx + 1}`;
        return String(key).toLowerCase() === String(documentKey).toLowerCase();
    });

    if (matchedRequirement?.req) return matchedRequirement.req;
    if (matchedRequirement?.label) return matchedRequirement.label;

    return String(documentKey)
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};


const VISA_TERMINAL_STATUSES = new Set(['Documents Submitted', 'Processing by Embassy', 'Embassy Approved', 'DFA Approved', 'Passport Released', 'Rejected']);

const getCurrentVisaStatus = (application) => {
    if (!application) return '';

    if (Array.isArray(application.status)) {
        return String(application.status[application.status.length - 1] || '').trim();
    }

    return String(application.status || '').trim();
};

const normalizeVisaDate = (value) => {
    if (!value) return null;

    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.startOf('day') : null;
};

const getVisaProcessStepsFromService = (application) => {
    if (!application) return [];

    if (application.serviceId && typeof application.serviceId === 'object' && Array.isArray(application.serviceId.visaProcessSteps)) {
        return application.serviceId.visaProcessSteps;
    }

    return [];
};

const buildProcessSteps = (application, serviceProcessSteps = []) => {
    const out = {};
    if (!application) return out;

    const preferredDate = normalizeVisaDate(application.preferredDate);
    const createdAt = normalizeVisaDate(application.createdAt) || dayjs().startOf('day');
    const steps = Array.isArray(serviceProcessSteps) ? serviceProcessSteps : [];

    let prevDeadline = null;

    for (const step of steps) {
        const stepTitle = String(step?.title || '').trim();
        if (!stepTitle) continue;

        const setDate = getVisaStatusSetDate(application, stepTitle) || (stepTitle === 'Application Submitted' ? createdAt : null);
        const deadlineDays = Number(step?.daysToBeCompleted ?? 0);

        let deadline = null;

        if (stepTitle === 'Processing by Embassy' && preferredDate) {
            deadline = preferredDate.startOf('day');
        } else if (Number.isFinite(deadlineDays) && deadlineDays > 0) {
            if (stepTitle === 'Application Submitted') {
                if (setDate) deadline = setDate.add(deadlineDays, 'day').startOf('day');
            } else if (prevDeadline) {
                deadline = prevDeadline.add(deadlineDays, 'day').startOf('day');
            } else if (setDate) {
                deadline = setDate.add(deadlineDays, 'day').startOf('day');
            } else if (preferredDate) {
                deadline = preferredDate.startOf('day').add(deadlineDays, 'day');
            }
        }

        if (deadline) prevDeadline = deadline;

        out[stepTitle] = {
            setDate: setDate ? setDate.format('YYYY-MM-DD') : null,
            deadlineDate: deadline ? deadline.format('YYYY-MM-DD') : null,
        };
    }

    return out;
};

const getVisaStatusSetDate = (application, status) => {
    if (!application) return null;

    const history = Array.isArray(application.statusHistory) ? application.statusHistory : [];
    for (let i = history.length - 1; i >= 0; i--) {
        const entry = history[i];
        if (!entry) continue;

        if (String(entry.status || '').trim().toLowerCase() === String(status || '').trim().toLowerCase() && entry.changedAt) {
            return dayjs(entry.changedAt).startOf('day');
        }
    }

    if (application.updatedAt) return dayjs(application.updatedAt).startOf('day');
    if (application.createdAt) return dayjs(application.createdAt).startOf('day');
    return null;
};

const getVisaStoredDeadlineDate = (application, status) => {
    if (!application || !status) return null;

    const normalizedStatus = String(status || '').trim();
    const processStep = application.processSteps && typeof application.processSteps === 'object'
        ? application.processSteps[normalizedStatus]
        : null;

    if (processStep?.deadlineDate) {
        const deadlineDate = normalizeVisaDate(processStep.deadlineDate);
        if (deadlineDate) {
            return deadlineDate;
        }
    }

    if (String(application.status || '').trim() === normalizedStatus && application.statusDeadlineDate) {
        const deadlineDate = normalizeVisaDate(application.statusDeadlineDate);
        if (deadlineDate) {
            return deadlineDate;
        }
    }

    return null;
};

const getVisaPenaltyDeadlineDate = (application) => {
    if (!application) return null;

    const storedDeadline = normalizeVisaDate(application.penaltyDeadline);
    if (storedDeadline) {
        return storedDeadline;
    }

    const anchorDate = normalizeVisaDate(application.updatedAt) || normalizeVisaDate(application.createdAt);
    return anchorDate ? anchorDate.add(PENALTY_PAYMENT_WINDOW_DAYS, 'day').startOf('day') : null;
};

const getVisaSecondChanceDeadlineDate = (application) => {
    if (!application) return null;

    if (application.secondDeadline) {
        return normalizeVisaDate(application.secondDeadline);
    }

    return dayjs().startOf('day').add(SECOND_CHANCE_EXTENSION_DAYS, 'day');
};


//SETS SECONDDEADLINE AND CHANGE THE "PAYMENT COMPLETED" DEADLINE TO THE SECOND CHANCE DEADLINE
const setVisaSecondChance = (application) => {
    if (!application) return application;

    const secondChanceDeadlineDate = getVisaSecondChanceDeadlineDate(application);

    if (secondChanceDeadlineDate) {
        application.secondChance = true;
        application.secondDeadline = secondChanceDeadlineDate.format('YYYY-MM-DD');
        application.processSteps = {
            ...(application.processSteps || {}),
            'Payment Completed': {
                ...((application.processSteps && application.processSteps['Payment Completed']) || {}),
                deadlineDate: secondChanceDeadlineDate.format('YYYY-MM-DD'),
            },
        };
        application.penaltyDeadline = '';

        if (typeof application.markModified === 'function') {
            application.markModified('processSteps');
        }
    }

    return application;
};



const getVisaDeadlineInfo = (
    application,
    referenceDate = dayjs()
) => {
    if (!application) return null;

    const currentStatus =
        getCurrentVisaStatus(application);

    if (
        !currentStatus ||
        VISA_TERMINAL_STATUSES.has(currentStatus)
    ) {
        return null;
    }

    const processSteps = getVisaProcessStepsFromApplication(application);
    const computedDaysMap = buildVisaStatusTotalDaysMapFromSteps(processSteps);

    const currentDate = referenceDate.startOf('day');

    if (application.secondChance) {
        const deadlineDate = getVisaSecondChanceDeadlineDate(application);
        if (!deadlineDate) {
            return null;
        }
        const warningDate = deadlineDate.subtract(1, 'day').startOf('day');
        const daysRemaining = deadlineDate.diff(currentDate, 'day');
        const warningAlreadySent = Array.isArray(application.deadlineWarnings) && application.deadlineWarnings.some((warning) => (
            warning
            && warning.status === `${currentStatus}|SECOND_CHANCE`
            && warning.deadlineDate === deadlineDate.format('YYYY-MM-DD')
        ));

        return {
            status: currentStatus,
            totalDays: SECOND_CHANCE_EXTENSION_DAYS,
            deadlineDays: SECOND_CHANCE_EXTENSION_DAYS,
            statusDeadlineMap: computedDaysMap,
            deadlineDate,
            warningDate,
            daysRemaining,
            warningAlreadySent,
            shouldSendWarning: false,
            isOverdue: daysRemaining < 0,
        };
    }

    if (application.onPenalty) {
        const deadlineDate = getVisaPenaltyDeadlineDate(application);
        if (!deadlineDate) {
            return null;
        }
        const warningDate = deadlineDate.subtract(1, 'day').startOf('day');
        const daysRemaining = deadlineDate.diff(currentDate, 'day');
        const warningAlreadySent = Array.isArray(application.deadlineWarnings) && application.deadlineWarnings.some((warning) => (
            warning
            && warning.status === `${currentStatus}|PENALTY`
            && warning.deadlineDate === deadlineDate.format('YYYY-MM-DD')
        ));

        return {
            status: currentStatus,
            totalDays: PENALTY_PAYMENT_WINDOW_DAYS,
            deadlineDays: PENALTY_PAYMENT_WINDOW_DAYS,
            statusDeadlineMap: computedDaysMap,
            deadlineDate,
            warningDate,
            daysRemaining,
            warningAlreadySent,
            shouldSendWarning: false,
            isOverdue: daysRemaining < 0,
        };
    }

    const storedDeadlineDate = getVisaStoredDeadlineDate(application, currentStatus);
    if (storedDeadlineDate) {
        const warningDate = storedDeadlineDate.subtract(1, 'day').startOf('day');
        const daysRemaining = storedDeadlineDate.diff(currentDate, 'day');
        const warningAlreadySent = Array.isArray(application.deadlineWarnings) && application.deadlineWarnings.some((warning) => (
            warning
            && warning.status === currentStatus
            && warning.deadlineDate === storedDeadlineDate.format('YYYY-MM-DD')
        ));

        return {
            status: currentStatus,
            totalDays: computedDaysMap[currentStatus] ?? VISA_STATUS_TOTAL_DAYS_MAP[currentStatus] ?? null,
            deadlineDays: computedDaysMap[currentStatus] ?? VISA_STATUS_TOTAL_DAYS_MAP[currentStatus] ?? null,
            statusDeadlineMap: computedDaysMap,
            deadlineDate: storedDeadlineDate,
            warningDate,
            daysRemaining,
            warningAlreadySent,
            shouldSendWarning: daysRemaining === 1 && !warningAlreadySent,
            isOverdue: daysRemaining < 0,
        };
    }

    const totalDays = Number.isFinite(computedDaysMap[currentStatus])
        ? computedDaysMap[currentStatus]
        : VISA_STATUS_TOTAL_DAYS_MAP[currentStatus];

    if (!Number.isFinite(totalDays)) {
        return null;
    }

    // ONLY USE CREATED AT
    const baseDate = dayjs(application.createdAt)
        .startOf('day');

    const deadlineDate = baseDate
        .add(totalDays, 'day')
        .startOf('day');

    const warningDate = deadlineDate
        .subtract(1, 'day')
        .startOf('day');

    const currentDateToday =
        referenceDate.startOf('day');

    const daysRemaining =
        deadlineDate.diff(currentDateToday, 'day');

    const warningAlreadySent =
        Array.isArray(application.deadlineWarnings) &&
        application.deadlineWarnings.some(
            (warning) =>
                warning &&
                warning.status === currentStatus &&
                warning.deadlineDate ===
                deadlineDate.format('YYYY-MM-DD')
        );

    return {
        status: currentStatus,
        totalDays,
        deadlineDays: totalDays,
        statusDeadlineMap: computedDaysMap,
        deadlineDate,
        warningDate,
        daysRemaining,
        warningAlreadySent,
        shouldSendWarning:
            daysRemaining === 1 &&
            !warningAlreadySent,
        isOverdue: daysRemaining < 0,
    };
};

const decorateVisaApplication = (application) => {
    if (!application) return application;

    const plainApplication = typeof application.toObject === 'function'
        ? application.toObject()
        : { ...application };

    const deadlineInfo = getVisaDeadlineInfo(plainApplication);
    const statusText = getCurrentVisaStatus(plainApplication);
    const processSteps = plainApplication.processSteps || buildProcessSteps(plainApplication, getVisaProcessStepsFromApplication(plainApplication));

    return {
        ...plainApplication,
        status: statusText || plainApplication.status,
        processSteps,
        statusDeadlineDate: deadlineInfo ? deadlineInfo.deadlineDate.toISOString() : null,
        statusDeadlineDays: deadlineInfo ? deadlineInfo.deadlineDays : null,
        visaStatusTotalDaysMap: deadlineInfo ? deadlineInfo.statusDeadlineMap : buildVisaStatusTotalDaysMapFromSteps(getVisaProcessStepsFromApplication(plainApplication)),
        statusDeadlineWarningDate: deadlineInfo ? deadlineInfo.warningDate.toISOString() : null,
        statusDeadlineDaysRemaining: deadlineInfo ? deadlineInfo.daysRemaining : null,
        statusDeadlineWarningSent: deadlineInfo ? deadlineInfo.warningAlreadySent : false,
    };
};

const sendVisaDeadlineWarning = async (application) => {
    if (application?.onPenalty || application?.secondChance) {
        return { sent: false, application };
    }

    const deadlineInfo = getVisaDeadlineInfo(application);
    if (!deadlineInfo || !deadlineInfo.shouldSendWarning) {
        return { sent: false, application };
    }

    const populatedUser = application.userId && typeof application.userId === 'object' ? application.userId : null;
    const userId = populatedUser?._id || application.userId;
    const user = populatedUser && populatedUser.email
        ? populatedUser
        : await UserModel.findById(userId).select('email username firstname lastname');

    if (!user || !user.email) {
        return { sent: false, application };
    }

    const applicationNumber = application.applicationNumber || 'your visa application';
    const displayName = user.firstname || user.username || 'Customer';
    const deadlineLabel = deadlineInfo.deadlineDate.format('MMMM DD, YYYY');
    const statusLabel = deadlineInfo.status;

    await NotificationModel.create({
        userId: user._id,
        title: 'Visa Deadline Reminder',
        message: `One day remains to complete ${statusLabel} for ${applicationNumber}. The deadline is ${deadlineLabel}.`,
        type: 'visa-deadline-reminder',
        link: '/user-applications',
        metadata: {
            applicationId: application._id,
            applicationNumber,
            status: statusLabel,
            deadlineDate: deadlineInfo.deadlineDate.format('YYYY-MM-DD'),
        }
    });

    await transporter.sendMail({
        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
        to: user.email,
        subject: `Visa Deadline Reminder: ${statusLabel} due ${deadlineLabel}`,
        html: `
            <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                    <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                    <h2 style="color:#305797;">Visa Deadline Reminder</h2>
                    <p style="color:#555; font-size:16px;">Hello <b>${displayName}</b>,</p>
                    <p style="color:#555; font-size:15px; line-height:1.6;">One day remains to complete <b>${statusLabel}</b> for your visa application <b>${applicationNumber}</b>.</p>
                    <p style="color:#555; font-size:15px; line-height:1.6;">Deadline: <b>${deadlineLabel}</b></p>
                    <p style="color:#555; font-size:15px; line-height:1.6;">Please log in and finish the required step to keep your application on track.</p>

                    <a href="https://mrctravelandtours.com/home"
                        style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                        Login to Your Account
                    </a>

                    <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
                    <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                        <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                        <p>M&RC Travel and Tours</p>
                        <p>info1@mrctravels.com</p>
                        <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `,
    });

    application.deadlineWarnings = application.deadlineWarnings || [];
    application.deadlineWarnings.push({
        status: deadlineInfo.status,
        deadlineDate: deadlineInfo.deadlineDate.format('YYYY-MM-DD'),
        warnedAt: new Date(),
    });

    if (typeof application.save === 'function') {
        await application.save();
    }

    return { sent: true, application };
};

const appendVisaStatusHistory = (application, status, changedBy, changedByName) => {
    if (!application) return;

    const normalizedStatus = String(status || '').trim();
    if (!normalizedStatus) return;

    application.statusHistory = Array.isArray(application.statusHistory) ? application.statusHistory : [];
    application.statusHistory.push({
        status: normalizedStatus,
        changedAt: new Date(),
        changedBy: changedBy || undefined,
        changedByName: changedByName || undefined,
    });
};

const sendVisaPenaltyNotification = async (application, deadlineInfo) => {
    if (!application || !deadlineInfo) {
        return { sent: false, application };
    }

    const populatedUser = application.userId && typeof application.userId === 'object' ? application.userId : null;
    const userId = populatedUser?._id || application.userId;
    const user = populatedUser && populatedUser.email
        ? populatedUser
        : await UserModel.findById(userId).select('email username firstname lastname');

    if (!user || !user.email) {
        return { sent: false, application };
    }

    const applicationNumber = application.applicationNumber || 'your visa application';
    const displayName = user.firstname || user.username || 'Customer';
    const deadlineLabel = deadlineInfo.deadlineDate.format('MMMM DD, YYYY');

    await NotificationModel.create({
        userId: user._id,
        title: 'Visa Application On Penalty',
        message: `Your visa application ${applicationNumber} is now on penalty. Please pay PHP ${PENALTY_AMOUNT.toLocaleString('en-PH')} within 1 day.`,
        type: 'visa-penalty',
        link: '/user-applications',
        metadata: {
            applicationId: application._id,
            applicationNumber,
            status: deadlineInfo.status,
            penaltyAmount: PENALTY_AMOUNT,
            deadlineDate: deadlineInfo.deadlineDate.format('YYYY-MM-DD'),
        }
    });

    await transporter.sendMail({
        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
        to: user.email,
        subject: `Visa Application On Penalty: ${applicationNumber}`,
        html: `
            <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                    <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                    <h2 style="color:#305797;">Visa Application On Penalty</h2>
                    <p style="color:#555; font-size:16px;">Hello <b>${displayName}</b>,</p>
                    <p style="color:#555; font-size:15px; line-height:1.6;">Your visa application <b>${applicationNumber}</b> is on penalty because <b>${deadlineInfo.status}</b> was not completed on time.</p>
                    <p style="color:#555; font-size:15px; line-height:1.6;">Penalty fee: <b>PHP ${PENALTY_AMOUNT.toLocaleString('en-PH')}</b></p>
                    <p style="color:#555; font-size:15px; line-height:1.6;">Pay within <b>1 day</b> to avoid rejection. Deadline: <b>${deadlineLabel}</b></p>

                    <a href="https://mrctravelandtours.com/home"
                        style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                        Login to Your Account
                    </a>

                    <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
                    <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                        <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                        <p>M&RC Travel and Tours</p>
                        <p>info1@mrctravels.com</p>
                        <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                    </div>
                </div>
            </div>
        `,
    });

    return { sent: true, application };
};

const rejectVisaApplicationForDeadline = async (application, deadlineInfo, reachedSecondDeadline = false) => {
    if (!application) {
        return { rejected: false, application };
    }

    const currentStatus = getCurrentVisaStatus(application);
    if (!currentStatus || VISA_TERMINAL_STATUSES.has(currentStatus) || currentStatus === 'Rejected') {
        return { rejected: false, application };
    }

    const resolvedDeadlineInfo = deadlineInfo || getVisaDeadlineInfo(application);
    if (!resolvedDeadlineInfo || !resolvedDeadlineInfo.isOverdue) {
        return { rejected: false, application };
    }

    const populatedUser = application.userId && typeof application.userId === 'object' ? application.userId : null;
    const userId = populatedUser?._id || application.userId;
    const user = populatedUser && populatedUser.email
        ? populatedUser
        : await UserModel.findById(userId).select('email username firstname lastname');

    appendVisaStatusHistory(application, 'Rejected', null, 'System Auto-Rejection');
    application.status = 'Rejected';
    application.reachedSecondDeadline = Boolean(reachedSecondDeadline);

    if (typeof application.save === 'function') {
        await application.save();
    }

    const applicationNumber = application.applicationNumber || 'your visa application';
    const displayName = user?.firstname || user?.username || 'Customer';
    const deadlineLabel = resolvedDeadlineInfo.deadlineDate.format('MMMM DD, YYYY');

    if (user && user._id) {
        await NotificationModel.create({
            userId: user._id,
            title: 'Visa Application Automatically Rejected',
            message: reachedSecondDeadline
                ? `Your visa application ${applicationNumber} was automatically rejected because the extra 3-day period after paying the penalty expired.`
                : `Your visa application ${applicationNumber} was automatically rejected because the penalty fee was not paid within 1 day.`,
            type: 'visa',
            link: '/user-applications',
            metadata: {
                applicationId: application._id,
                applicationNumber,
                status: 'Rejected',
                rejectedForStatus: resolvedDeadlineInfo.status,
                deadlineDate: resolvedDeadlineInfo.deadlineDate.format('YYYY-MM-DD'),
                reachedSecondDeadline: Boolean(reachedSecondDeadline),
            }
        });
    }

    if (user && user.email) {
        try {
            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: `Visa Application Automatically Rejected: ${applicationNumber}`,
                html: `
                    <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797;">Visa Application Automatically Rejected</h2>
                            <p style="color:#555; font-size:16px;">Hello <b>${displayName}</b>,</p>
                            <p style="color:#555; font-size:15px; line-height:1.6;">Your visa application <b>${applicationNumber}</b> was automatically rejected because ${reachedSecondDeadline ? 'the extra 3-day period after penalty payment expired' : 'the penalty fee was not paid within 1 day'}.</p>
                            <p style="color:#555; font-size:15px; line-height:1.6;">Please contact our office if you need assistance or wish to submit a new application.</p>

                            <a href="https://mrctravelandtours.com/home"
                                style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                                Login to Your Account
                            </a>

                            <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
                            <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                                <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                                <p>M&RC Travel and Tours</p>
                                <p>info1@mrctravels.com</p>
                                <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                            </div>
                        </div>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error('Failed to send visa auto-rejection email:', emailError);
        }
    }

    return { rejected: true, application };
};

const markVisaApplicationOnPenalty = async (application, deadlineInfo = null) => {
    if (!application) {
        return { penalized: false, application };
    }

    if (application.onPenalty || application.secondChance || String(application.status || '').trim() === 'Rejected') {
        return { penalized: false, application };
    }

    const resolvedDeadlineInfo = deadlineInfo || getVisaDeadlineInfo(application);
    if (!resolvedDeadlineInfo || !resolvedDeadlineInfo.isOverdue) {
        return { penalized: false, application };
    }

    const penaltyDeadlineDate = getVisaPenaltyDeadlineDate(application);
    const deadlineKey = penaltyDeadlineDate.format('YYYY-MM-DD');

    application.onPenalty = true;
    application.secondChance = false;
    application.reachedSecondDeadline = false;
    application.penaltyDeadline = deadlineKey;
    application.deadlineWarnings = Array.isArray(application.deadlineWarnings) ? application.deadlineWarnings : [];

    const alreadyRecorded = application.deadlineWarnings.some((warning) => (
        warning
        && warning.status === `Penalty:${resolvedDeadlineInfo.status}`
        && warning.deadlineDate === deadlineKey
    ));

    if (!alreadyRecorded) {
        application.deadlineWarnings.push({
            status: `Penalty:${resolvedDeadlineInfo.status}`,
            deadlineDate: deadlineKey,
            warnedAt: new Date(),
        });
    }

    if (typeof application.save === 'function') {
        await application.save();
    }

    await sendVisaPenaltyNotification(application, {
        ...resolvedDeadlineInfo,
        deadlineDate: penaltyDeadlineDate,
    });

    return { penalized: true, application };
};


const processVisaDeadlineAction = async (application) => {
    const deadlineInfo = getVisaDeadlineInfo(application);
    if (!deadlineInfo) {
        return { application, warned: false, rejected: false };
    }

    const currentStatus = String(getCurrentVisaStatus(application) || '').trim();
    const isPaymentCompleted = currentStatus.toLowerCase() === 'payment completed';

    if (deadlineInfo.isOverdue) {
        if (application?.secondChance && isPaymentCompleted) {
            return rejectVisaApplicationForDeadline(application, deadlineInfo, true);
        }

        if (application?.onPenalty) {
            return rejectVisaApplicationForDeadline(application, deadlineInfo, false);
        }

        return markVisaApplicationOnPenalty(application, deadlineInfo);
    }

    if (deadlineInfo.shouldSendWarning) {
        const warningResult = await sendVisaDeadlineWarning(application);
        return { ...warningResult, warned: true, rejected: false };
    }

    return { application, warned: false, rejected: false };
};


const generateApplicationNumber = () => {
    return `APP-VISA-${Math.floor(100000000 + Math.random() * 900000000)}`
}

const applyVisa = async (req, res) => {
    const { serviceName, preferredDate, preferredTime, purposeOfTravel, status } = req.body
    const userId = req.userId
    const initialStatus = String(status || 'Application Submitted').trim() || 'Application Submitted'

    const serviceId = await ServiceModel.findOne({ visaName: serviceName }).select('_id')

    if (!serviceId || !preferredDate || !preferredTime || !purposeOfTravel) {
        return res.status(400).json({ message: 'Missing required fields' })
    }

    try {
        const user = await UserModel.findById(userId).select('firstname lastname username')
        const serviceDoc = await ServiceModel.findById(serviceId).select('visaProcessSteps')

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }
        if (!serviceDoc) {
            return res.status(404).json({ message: 'Service not found' })
        }
        const applicantName = `${user.firstname} ${user.lastname}`.trim() || user.username

        const application = await VisaModel.create({
            applicationNumber: generateApplicationNumber(),
            userId,
            serviceId: serviceId,
            serviceName: serviceName,
            applicantName,
            preferredDate,
            preferredTime,
            purposeOfTravel,
            status: initialStatus,
            statusHistory: [{
                status: initialStatus,
                changedAt: new Date(),
                changedBy: userId,
                changedByName: user.username || `${user.firstname || ''} ${user.lastname || ''}`.trim() || undefined,
            }],
        })

        try {
            application.processSteps = buildProcessSteps(application, serviceDoc.visaProcessSteps);
            await application.save();
        } catch (processStepsError) {
            console.error('Failed to build/persist visa processSteps:', processStepsError);
        }

        logAction('APPLY_VISA', userId, { "Visa Application Created": `Application Number: ${application.applicationNumber}` });

        const io = req.app.get('io')
        if (io) {
            io.emit('visa:created', {
                id: application._id,
                createdAt: application.createdAt
            })
        }

        res.status(201).json({ message: 'Visa application submitted successfully' })

    } catch (error) {
        res.status(500).json({ message: 'Error creating visa application', error: error.message })
        console.error('Error creating visa application:', error)
    }
}

const updateVisaApplicationWithDocs = async (req, res) => {
    try {
        const userId = req.userId
        const { id } = req.params;

        const {
            preferredDate,
            preferredTime,
            purposeOfTravel,
            submittedDocuments
        } = req.body;

        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: 'Visa application not found' })
        }

        const deadlineActionResult = await processVisaDeadlineAction(application).catch((error) => {
            console.error('Failed to process visa deadline action before document upload:', error);
            return null;
        });

        if (deadlineActionResult?.rejected || String(application.status || '').trim() === 'Rejected') {
            return res.status(400).json({ message: 'Visa application has been rejected due to a missed deadline.' });
        }

        if (application.userId.toString() !== userId) {
            return res.status(403).json({ message: 'Unauthorized to update this application' })
        }

        application.onPenalty = false;
        application.secondChance = false;
        application.reachedSecondDeadline = false;
        application.penaltyDeadline = '';

        application.preferredDate = preferredDate || application.preferredDate
        application.preferredTime = preferredTime || application.preferredTime
        application.purposeOfTravel = purposeOfTravel || application.purposeOfTravel
        application.submittedDocuments = submittedDocuments || application.submittedDocuments
        appendVisaStatusHistory(application, 'Documents Uploaded', userId)
        application.status = 'Documents Uploaded'

        try {
            const serviceDoc = await ServiceModel.findById(application.serviceId).select('visaProcessSteps')
            application.processSteps = buildProcessSteps(application, serviceDoc?.visaProcessSteps || [])
        } catch (processStepsError) {
            console.error('Failed to rebuild visa processSteps:', processStepsError);
        }

        await application.save();

        logAction('UPDATE_VISA_APPLICATION', userId, { "Visa Application Updated": `Application Number: ${application.applicationNumber}` });

        const io = req.app.get('io')
        if (io) {
            io.emit('visa:updated', {
                id: application._id,
                updatedAt: application.updatedAt
            })
        }

        res.status(200).json({ message: 'Visa application updated successfully' })

    } catch (error) {
        res.status(500).json({ message: 'Error updating visa application', error: error.message })
    }

}

//REQUEST DOCUMENT RESUBMISSION ------------------------------------------------------
const requestVisaDocumentResubmission = async (req, res) => {
    const { id } = req.params;
    const { documentKey, documentKeys } = req.body;

    try {
        const application = await VisaModel.findById(id).populate('serviceId', 'visaName visaRequirements');
        if (!application) {
            return res.status(404).json({ message: "Visa application not found" });
        }

        const requestedKeys = Array.isArray(documentKeys) && documentKeys.length > 0
            ? documentKeys
            : documentKey
                ? [documentKey]
                : [];

        const uniqueKeys = [...new Set(requestedKeys.filter((key) => typeof key === 'string' && key.trim()))];

        if (uniqueKeys.length === 0) {
            return res.status(400).json({ message: "Please select a valid document to resubmit." });
        }

        application.resubmissionTarget = uniqueKeys[uniqueKeys.length - 1];
        application.resubmissionTargets = [...new Set([...(application.resubmissionTargets || []), ...uniqueKeys])];
        application.submittedDocuments = application.submittedDocuments || {};

        for (const key of uniqueKeys) {
            application.set(`submittedDocuments.${key}`, null);
        }

        application.markModified('submittedDocuments');

        appendVisaStatusHistory(application, 'Payment Completed', application.userId)
        application.status = "Payment Completed";
        await application.save();

        const user = await UserModel.findById(application.userId);
        if (user) {
            const requestedSummary = uniqueKeys.map((key) => getVisaDocumentLabel(application, key)).join(', ');

            await NotificationModel.create({
                userId: user._id,
                title: "Visa documents resubmission requested",
                message: `Please resubmit your ${requestedSummary.toLowerCase()} for your application.`,
                type: "visa",
                link: "/user-applications",
                metadata: { applicationId: application._id }
            });

            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: "Visa Documents Resubmission Requested",
                html: `
                    <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                            <h2 style="color:#305797; margin-bottom:10px;">Visa Documents Resubmission Requested</h2>
                            <p style="color:#555; font-size:16px;">Hello <b>${user.firstname || user.username}</b>,</p>
                            <p style="color:#555; font-size:15px; line-height:1.6;">Our team needs you to resubmit your ${requestedSummary.toLowerCase()} for your application.</p>
                            <p style="color:#555; font-size:15px; line-height:1.6;">Please log in to your account to upload the updated documents.</p>
                            <a href="https://mrctravelandtours.com/home"
                                style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                                Login to Your Account
                            </a>
                            <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
                            <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                                <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                                <p>M&RC Travel and Tours</p>
                                <p>info1@mrctravels.com</p>
                                <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                            </div>
                        </div>
                    </div>
                `
            });
        }

        res.status(200).json({ message: "Resubmission requested", application });
    } catch (error) {
        console.error("Error requesting visa document resubmission:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};



const getVisaApplications = async (_req, res) => {
    try {
        const applications = await VisaModel.find({})
            .populate('userId', 'firstname lastname username')
            .populate('serviceId', 'visaName visaProcessSteps')
            .sort({ createdAt: -1 })

        await Promise.all(applications.map((application) => processVisaDeadlineAction(application).catch((error) => { console.error('Failed to process visa deadline action:', error); })));
        await Promise.all(applications.map((application) => sendVisaDeadlineWarning(application).catch((error) => { console.error('Failed to send visa deadline warning:', error); })));

        const applicationsPayload = applications.map(app => ({
            applicationItem: app._id,
            applicationNumber: app.applicationNumber,
            applicantName: app.applicantName,
            serviceName: app.serviceId?.visaName || app.serviceName || "N/A",
            preferredDate: app.preferredDate,
            preferredTime: app.preferredTime,
            purposeOfTravel: app.purposeOfTravel,
            status: getCurrentVisaStatus(app) || app.status,
            processSteps: app.processSteps || buildProcessSteps(app, getVisaProcessStepsFromApplication(app)),
            suggestedAppointmentSchedules: app.suggestedAppointmentSchedules,
            suggestedAppointmentScheduleChosen: app.suggestedAppointmentScheduleChosen,
            statusDeadlineDate: getVisaDeadlineInfo(app)?.deadlineDate.toISOString() || null,
            statusDeadlineDays: getVisaDeadlineInfo(app)?.deadlineDays ?? null,
            visaStatusTotalDaysMap: buildVisaStatusTotalDaysMapFromSteps(getVisaProcessStepsFromApplication(app)),
            statusHistory: app.statusHistory || [],
            resubmissionTarget: app.resubmissionTarget || null,
            resubmissionTargets: app.resubmissionTargets || [],
        }))

        res.status(200).json(applicationsPayload)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching visa applications', error: error.message })
    }
}


const getUserVisaApplications = async (req, res) => {
    try {
        const userId = req.userId
        const applications = await VisaModel.find({ userId })
            .populate('serviceId', 'visaName visaProcessSteps')
            .sort({ createdAt: -1 })

        await Promise.all(applications.map((application) => processVisaDeadlineAction(application).catch((error) => { console.error('Failed to process visa deadline action:', error); })));
        await Promise.all(applications.map((application) => sendVisaDeadlineWarning(application).catch((error) => { console.error('Failed to send visa deadline warning:', error); })));

        res.status(200).json(applications.map(decorateVisaApplication))
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching user visa applications', error: error.message })
    }
}


const getVisaApplicationById = async (req, res) => {
    try {
        const { id } = req.params;
        const application = await VisaModel.findById(id)
            .populate('userId', 'firstname lastname username')
            .populate('serviceId', 'visaName visaProcessSteps')
            .populate('statusHistory.changedBy', 'firstname lastname username');
        if (!application) {
            return res.status(404).json({ message: 'Visa application not found' });
        }

        await processVisaDeadlineAction(application).catch((error) => { console.error('Failed to process visa deadline action:', error); });
        await sendVisaDeadlineWarning(application).catch((error) => { console.error('Failed to send visa deadline warning:', error); });

        res.status(200).json(decorateVisaApplication(application));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching visa application', error: error.message });
    }
};


const suggestAppointmentSchedules = async (req, res) => {
    const { id } = req.params;
    const { slots } = req.body;

    try {
        if (!Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ message: "Suggested appointment slots are required" });
        }

        const cleanedSlots = slots
            .filter((slot) => slot && slot.date && slot.time)
            .map((slot) => ({ date: slot.date, time: slot.time }));

        if (cleanedSlots.length === 0) {
            return res.status(400).json({ message: "All suggested slots must have date and time" });
        }

        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Visa application not found" });
        }

        application.suggestedAppointmentSchedules = cleanedSlots;
        application.suggestedAppointmentScheduleChosen = { date: "", time: "" };
        await application.save();

        const user = await UserModel.findById(application.userId);
        if (user) {
            const summary = cleanedSlots
                .map((slot, index) => `Option ${index + 1}: ${slot.date} ${slot.time}`)
                .join(" | ");

            await NotificationModel.create({
                userId: user._id,
                title: "Visa Appointment Options",
                message: `We suggested appointment options for your visa application. ${summary}`,
                type: "visa",
                link: "/user-applications",
                metadata: { applicationId: application._id }
            });

            await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: user.email,
                subject: "Visa Appointment Options Available",
                html: `
                <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
        
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                            
                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797;">Visa Appointment Options</h2>
                            <p style="color:#555;">We’ve found available schedules for your visa application.</p>

                            <div style="text-align:center; color:#333; margin-top:15px;">
                                <p style="font-size:16px; margin-bottom:10px;">Hello ${user.firstname || user.username},</p>
                                <p>Please review the available appointment slots below:</p>

                                <ul style="padding-left:20px;">
                                    ${cleanedSlots
                        .map((slot, index) => `
                                                            <div style="margin-bottom:10px;">
                                                                <strong>Option ${index + 1}:</strong> ${dayjs(slot.date).format("MMMM DD, YYYY")} - ${slot.time}
                                                            </div>
                                                        `)
                        .join("")}
                                </ul>

                                <p style="margin-top:15px;">
                                    Log in to your account to confirm your preferred schedule.
                                </p>
                            </div>

                            <a href="https://mrctravelandtours.com/home"
                            style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                            Login to your account
                            </a>
                        </div>

                        <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                            <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                            <p>M&RC Travel and Tours</p>
                            <p>info1@mrctravels.com</p>
                            <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                        </div>

                </div>
                `
            });
        }

        res.status(200).json({ message: "Suggested appointment schedules updated", application });
    } catch (error) {
        console.error("Error suggesting appointment schedules:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


//CHOSEN SUGGESTED APPOINTMENT SCHEDULE ------------------------------------------------------
const chosenSuggestedSchedule = async (req, res) => {
    const { id } = req.params;
    const { date, time } = req.body;
    try {
        if (!date || !time) {
            return res.status(400).json({ message: "Chosen appointment date and time are required" });
        }
        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Visa application not found" });
        }

        application.suggestedAppointmentSchedules = [];
        application.suggestedAppointmentScheduleChosen = { date, time };
        application.preferredDate = date;
        application.preferredTime = time;

        try {
            const serviceDoc = await ServiceModel.findById(application.serviceId).select('visaProcessSteps');
            if (serviceDoc) {
                application.processSteps = buildProcessSteps(application, serviceDoc.visaProcessSteps);
            }
        } catch (e) {
            console.error('Failed to rebuild processSteps after appointment date change:', e);
        }

        await application.save();

        res.status(200).json({ message: "Preferred appointment schedule updated", application });
    } catch (error) {
        console.error("Error updating preferred appointment schedule:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


//DELIVERY ADDRESS UPDATE FOR VISA APPLICATION ------------------------------------------------------
const passportReleaseOptionUpdate = async (req, res) => {
    const { id } = req.params;
    const { passportReleaseOption, deliveryAddress } = req.body;

    try {
        if (!passportReleaseOption) {
            return res.status(400).json({ message: "Release option is required" });
        }
        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Visa application not found" });
        }

        application.passportReleaseOption = passportReleaseOption;
        application.deliveryAddress = deliveryAddress || "";
        if ((passportReleaseOption || "").toLowerCase() !== "delivery") {
            application.deliveryFee = 0;
            application.deliveryDate = "";
        }
        appendVisaStatusHistory(application, 'Passport Released', req.userId)
        application.status = "Passport Released";
        await application.save();

        res.status(200).json({ message: "Release option updated", application });
    }
    catch (error) {
        console.error("Error updating release option:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const updateVisaDeliveryDetails = async (req, res) => {
    const { id } = req.params;
    const { deliveryFee, deliveryDate } = req.body;

    try {
        const fee = Number(deliveryFee);
        if (!Number.isFinite(fee) || fee <= 0) {
            return res.status(400).json({ message: "Valid delivery fee is required" });
        }

        if (!deliveryDate) {
            return res.status(400).json({ message: "Delivery date is required" });
        }

        const application = await VisaModel.findById(id);
        if (!application) {
            return res.status(404).json({ message: "Visa application not found" });
        }

        if ((application.passportReleaseOption || "").toLowerCase() !== "delivery") {
            return res.status(400).json({ message: "Application is not marked for delivery" });
        }

        application.deliveryFee = fee;
        application.deliveryDate = deliveryDate;
        await application.save();

        const user = await UserModel.findById(application.userId);
        if (user) {
            await NotificationModel.create({
                userId: user._id,
                title: "Visa Delivery Details Available",
                message: `Your delivery fee is PHP ${fee.toLocaleString()} and target date is ${deliveryDate}.`,
                type: "visa",
                link: "/user-applications",
                metadata: { applicationId: application._id, deliveryFee: fee, deliveryDate }
            });
        }

        return res.status(200).json({ message: "Visa delivery details updated", application });
    } catch (error) {
        console.error("Error updating visa delivery details:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};


const updateVisaApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Get the serviceId from the visa application
        const visaDoc = await VisaModel.findById(id).select('serviceId userId');
        if (!visaDoc || !visaDoc.serviceId) {
            return res.status(404).json({ message: 'Visa application or service not found' });
        }

        const serviceId = visaDoc.serviceId._id || visaDoc.serviceId;

        // Get the valid steps from the service and normalize to titles
        const serviceDoc = await ServiceModel.findById(serviceId).select('visaProcessSteps');
        const validStatuses = [
            ...(serviceDoc?.visaProcessSteps || []).map((step) => (typeof step === 'string' ? step : (step?.title || ''))),
            "Rejected"
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const updated = await VisaModel.findById(id);
        if (!updated) {
            return res.status(404).json({ message: 'Visa application not found' });
        }

        appendVisaStatusHistory(updated, status, req.userId);
        updated.status = status;

        const statusIndex = validStatuses.findIndex((item) => String(item || '').trim().toLowerCase() === String(status || '').trim().toLowerCase());
        if (statusIndex >= 0) {
            updated.currentStepIndex = statusIndex;
        }

        await updated.save();

        try {
            const user = await UserModel.findById(updated.userId);
            if (user) {
                await NotificationModel.create({
                    userId: user._id,
                    title: 'Visa Application Status Updated',
                    message: `Your Visa Application Status is now ${status}.`,
                    type: 'visa',
                    link: '/user-applications',
                    metadata: { applicationId: updated._id, status }
                });

                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: 'Visa Application Status Update',
                    html: `
                    <div style="font-family: Arial, sans-serif; background:#305797; padding:30px 16px;">
                            <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                                <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                                <h2 style="color:#305797;">M&RC Travel and Tours</h2>
                                <p style="color:#555;">Your visa application status has been updated.</p>

                                <div style="text-align:center; color:#333; margin-top:15px;">
                                    <p style="font-size:16px; margin-bottom:10px;">Hello ${user.firstname || user.username},</p>
                                    <p>Your Visa Application Status is now <strong>${status}</strong>.</p>
                                </div>

                                <a href="https://mrctravelandtours.com/home"
                                style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                                Login to Your Account
                                </a>

                                <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
                                <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                                    <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                                    <p>M&RC Travel and Tours</p>
                                    <p>info1@mrctravels.com</p>
                                    <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                                </div>
                            </div>
                        </div>
                    `
                });
            }

            logAction('UPDATE_VISA_STATUS', req.userId, { "Visa Application Status Updated": `Application Number: ${updated.applicationNumber}, New Status: ${status}` });

        } catch (notifyError) {
            console.error('Failed to send visa status notification:', notifyError);
        }

        res.status(200).json({ message: 'Status updated', application: updated });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating visa application status', error: error.message });
    }
};

const verifyTokenCheckout = async (req, res) => {
    const { token } = req.body;
    try {

        const tokenCheckoutVisa = await TokenCheckoutVisaModel.findOne({ token })

        if (!tokenCheckoutVisa) {
            return res.status(400).json({ message: "Invalid token" });
        }

        if (tokenCheckoutVisa.expiresAt < new Date()) {
            return res.status(400).json({ message: "Token has expired" });
        }

        await TokenCheckoutVisaModel.deleteOne({ _id: tokenCheckoutVisa._id });

        return { valid: true };

    } catch (error) {
        console.error("Error verifying token checkout:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const archiveVisaApplication = async (req, res) => {
    const { id } = req.params
    try {
        const application = await VisaModel.findById(id)
        if (!application) {
            return res.status(404).json({ message: 'Visa application not found' })
        }

        await ArchivedVisaApplicationModel.create({
            originalVisaApplicationId: application._id,
            userId: application.userId,
            serviceId: application.serviceId,
            serviceName: application.serviceName,
            applicantName: application.applicantName,
            preferredDate: application.preferredDate,
            preferredTime: application.preferredTime,
            purposeOfTravel: application.purposeOfTravel,
            applicationNumber: application.applicationNumber,
            suggestedAppointmentSchedules: application.suggestedAppointmentSchedules,
            suggestedAppointmentScheduleChosen: application.suggestedAppointmentScheduleChosen,
            submittedDocuments: application.submittedDocuments,
            resubmissionTarget: application.resubmissionTarget,
            resubmissionTargets: application.resubmissionTargets,
            passportReleaseOption: application.passportReleaseOption,
            deliveryAddress: application.deliveryAddress,
            deliveryFee: application.deliveryFee,
            deliveryDate: application.deliveryDate,
            status: application.status,
            statusHistory: application.statusHistory,
            deadlineWarnings: application.deadlineWarnings,
            currentStepIndex: application.currentStepIndex,
            processSteps: application.processSteps,
            createdAt: application.createdAt
        })

        await application.deleteOne()

        logAction('VISA_APPLICATION_ARCHIVED', req.userId, { "Visa Application Archived": `Application Number: ${application.applicationNumber}` })

        res.status(200).json({ message: 'Visa application archived successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Error archiving visa application', error: error.message })
    }
}

const getArchivedVisaApplications = async (_req, res) => {
    try {
        const applications = await ArchivedVisaApplicationModel.find({})
            .populate('userId', 'firstname lastname username')
            .populate('serviceId', 'visaName')
            .sort({ archivedAt: -1 })

        res.status(200).json(applications)
    } catch (error) {
        res.status(500).json({ message: 'Error fetching archived visa applications', error: error.message })
    }
}

const restoreArchivedVisaApplication = async (req, res) => {
    const { id } = req.params
    try {
        const archivedApplication = await ArchivedVisaApplicationModel.findById(id)
        if (!archivedApplication) {
            return res.status(404).json({ message: 'Archived visa application not found' })
        }

        const existing = await VisaModel.findOne({ applicationNumber: archivedApplication.applicationNumber })
        if (existing) {
            return res.status(409).json({ message: 'Visa application already exists' })
        }

        const restored = await VisaModel.create({
            applicationNumber: archivedApplication.applicationNumber,
            userId: archivedApplication.userId,
            serviceId: archivedApplication.serviceId,
            serviceName: archivedApplication.serviceName,
            applicantName: archivedApplication.applicantName,
            preferredDate: archivedApplication.preferredDate,
            preferredTime: archivedApplication.preferredTime,
            purposeOfTravel: archivedApplication.purposeOfTravel,
            suggestedAppointmentSchedules: archivedApplication.suggestedAppointmentSchedules,
            suggestedAppointmentScheduleChosen: archivedApplication.suggestedAppointmentScheduleChosen,
            submittedDocuments: archivedApplication.submittedDocuments,
            resubmissionTarget: archivedApplication.resubmissionTarget,
            resubmissionTargets: archivedApplication.resubmissionTargets,
            passportReleaseOption: archivedApplication.passportReleaseOption,
            deliveryAddress: archivedApplication.deliveryAddress,
            deliveryFee: archivedApplication.deliveryFee,
            deliveryDate: archivedApplication.deliveryDate,
            status: archivedApplication.status,
            statusHistory: archivedApplication.statusHistory,
            deadlineWarnings: archivedApplication.deadlineWarnings,
            currentStepIndex: archivedApplication.currentStepIndex,
            processSteps: archivedApplication.processSteps,
            createdAt: archivedApplication.createdAt,
            updatedAt: archivedApplication.createdAt
        })

        await archivedApplication.deleteOne()

        logAction('VISA_APPLICATION_RESTORED', req.userId, { "Visa Application Restored": `Application Number: ${restored.applicationNumber}` })

        res.status(200).json({ message: 'Visa application restored successfully' })
    } catch (error) {
        res.status(500).json({ message: 'Error restoring visa application', error: error.message })
    }
}

module.exports = {
    applyVisa,
    getVisaApplications,
    getUserVisaApplications,
    getVisaApplicationById,
    updateVisaApplicationWithDocs,
    requestVisaDocumentResubmission,
    suggestAppointmentSchedules,
    chosenSuggestedSchedule,
    passportReleaseOptionUpdate,
    updateVisaDeliveryDetails,
    updateVisaApplicationStatus,
    verifyTokenCheckout,
    archiveVisaApplication,
    getArchivedVisaApplications,
    restoreArchivedVisaApplication,
    getVisaDeadlineInfo,
    decorateVisaApplication,
    sendVisaDeadlineWarning,
    processVisaDeadlineAction,
    autoRejectVisaApplication: rejectVisaApplicationForDeadline,
    buildProcessSteps,
    setVisaSecondChance
};

