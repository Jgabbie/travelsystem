const dayjs = require('dayjs');
const BookingModel = require('../models/booking');
const NotificationModel = require('../models/notification');
const baseTransporter = require('../config/nodemailer');
const { buildBrandedEmail } = require('./emailTemplate');

const REMINDER_DAYS_BEFORE_TRAVEL = [3, 1];

const transporter = {
    ...baseTransporter,
    sendMail: (mailOptions = {}) => {
        const subjectText = String(mailOptions.subject || '').trim();
        const derivedTitle = subjectText
            ? subjectText.replace(/^M&RC Travel and Tours\s*-\s*/i, '')
            : 'M&RC Travel and Tours';

        return baseTransporter.sendMail({
            ...mailOptions,
            html: buildBrandedEmail({
                title: derivedTitle || 'M&RC Travel and Tours',
                bodyHtml: typeof mailOptions.html === 'string' ? mailOptions.html : '',
            }),
        });
    },
};

const formatDateRange = (startDate, endDate) => {
    if (!startDate) return 'TBA';

    const startText = startDate.format('MMM D, YYYY');
    if (!endDate) return startText;

    const endText = endDate.format('MMM D, YYYY');
    return startText === endText ? startText : `${startText} to ${endText}`;
};

const sendTravelReminderEmail = async ({
    to,
    username,
    bookingRef,
    packageName,
    travelStart,
    travelEnd,
    daysBefore,
}) => {
    if (!to) return;

    const dayLabel = daysBefore === 1 ? '1 day' : `${daysBefore} days`;
    const travelRange = formatDateRange(travelStart, travelEnd);

    await transporter.sendMail({
        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
        to,
        subject: `Travel Reminder - ${bookingRef} starts in ${dayLabel}`,
        html: `
            <p style="color:#475569; font-size:16px; margin:0 0 12px;">Hello <b>${username || 'Customer'}</b>,</p>
            <p style="color:#475569; font-size:15px; line-height:1.7; margin:0 0 12px;">
                Your trip is coming up in <b>${dayLabel}</b>.
            </p>
            <p style="color:#475569; font-size:15px; line-height:1.7; margin:0 0 12px;">
                <b>Booking Reference:</b> ${bookingRef}<br/>
                <b>Package:</b> ${packageName || 'Package'}<br/>
                <b>Travel Dates:</b> ${travelRange}
            </p>
            <p style="color:#475569; font-size:15px; line-height:1.7; margin:0;">
                Please review your travel details and reach out if you need assistance.
            </p>
        `,
    });
};

const processTravelReminders = async () => {
    const bookings = await BookingModel.find({
        status: { $nin: ['Cancelled', 'Cancellation Requested'] },
    })
        .populate('userId', 'email username')
        .populate('packageId', 'packageName');

    const today = dayjs().startOf('day');

    for (const booking of bookings) {
        const travelStartValue = booking?.travelDate?.startDate || booking?.bookingDetails?.travelDate?.startDate;
        const travelEndValue = booking?.travelDate?.endDate || booking?.bookingDetails?.travelDate?.endDate;
        const travelStart = travelStartValue && dayjs(travelStartValue).isValid() ? dayjs(travelStartValue) : null;
        const travelEnd = travelEndValue && dayjs(travelEndValue).isValid() ? dayjs(travelEndValue) : null;

        if (!travelStart) {
            continue;
        }

        if (!Array.isArray(booking.travelReminderKeys)) {
            booking.travelReminderKeys = [];
        }

        const existingKeys = new Set(booking.travelReminderKeys);
        const newKeys = [];

        for (const daysBefore of REMINDER_DAYS_BEFORE_TRAVEL) {
            const reminderDate = travelStart.subtract(daysBefore, 'day').startOf('day');
            const reminderKey = `${travelStart.format('YYYY-MM-DD')}|${daysBefore}`;

            if (today.isSame(reminderDate, 'day') && !existingKeys.has(reminderKey)) {
                newKeys.push(reminderKey);

                const bookingUserId = booking?.userId?._id || booking?.userId || null;
                const bookingUserEmail = booking?.userId?.email || null;
                const bookingUsername = booking?.userId?.username || null;
                const packageName = booking?.packageId?.packageName || null;

                if (bookingUserId) {
                    await NotificationModel.create({
                        userId: bookingUserId,
                        title: 'Travel Reminder',
                        message: `Your trip for booking ${booking.reference} starts in ${daysBefore} day${daysBefore === 1 ? '' : 's'}.`,
                        type: 'travel-reminder',
                        link: '/user-bookings',
                        metadata: {
                            bookingId: booking._id,
                            bookingReference: booking.reference,
                            travelStart: travelStart.format('YYYY-MM-DD'),
                            travelEnd: travelEnd ? travelEnd.format('YYYY-MM-DD') : null,
                            daysBefore,
                        },
                    });
                }

                try {
                    await sendTravelReminderEmail({
                        to: bookingUserEmail,
                        username: bookingUsername,
                        bookingRef: booking.reference,
                        packageName,
                        travelStart,
                        travelEnd,
                        daysBefore,
                    });
                } catch (emailError) {
                    console.error('Failed to send travel reminder email:', emailError);
                }
            }
        }

        if (newKeys.length) {
            await BookingModel.updateOne(
                { _id: booking._id },
                { $set: { travelReminderKeys: [...booking.travelReminderKeys, ...newKeys] } }
            );
        }
    }

    return { processed: bookings.length };
};

const startTravelReminderScheduler = () => {
    processTravelReminders().catch((error) => {
        console.error('Travel reminder scheduler startup run failed:', error);
    });

    setInterval(() => {
        processTravelReminders().catch((error) => {
            console.error('Travel reminder scheduler interval run failed:', error);
        });
    }, 60 * 60 * 1000);
};

module.exports = {
    processTravelReminders,
    startTravelReminderScheduler,
};
