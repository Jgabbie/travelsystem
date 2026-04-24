const dayjs = require('dayjs');
const BookingModel = require('../models/booking');
const TransactionModel = require('../models/transactions');
const NotificationModel = require('../models/notification');
const transporter = require('../config/nodemailer');

const PENALTY_AMOUNT = 200;
const REMINDER_DAYS_BEFORE_DUE = 3;
const SUCCESSFUL_TRANSACTION_STATUSES = ['Successful', 'Paid', 'Fully Paid', 'fully_paid'];

const toAmount = (value) => {
    if (value == null) return 0;
    const parsed = Number(String(value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
};

const getFrequencyWeeks = (value) => {
    if (value === 'Every week') return 1;
    if (value === 'Every 3 weeks') return 3;
    return 2;
};

const formatMoney = (value) =>
    Number(value || 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const buildPaymentSchedule = (booking, totalPaid = 0) => {
    const details = booking?.bookingDetails || {};
    const totalAmount = toAmount(details?.totalPrice || booking?.totalPrice || 0);

    const baseDateValue = booking?.bookingDate || booking?.createdAt;
    const baseDate = baseDateValue && dayjs(baseDateValue).isValid() ? dayjs(baseDateValue) : dayjs();

    const travelStartValue = details?.travelDate?.startDate || booking?.travelDate?.startDate;
    const travelDate = travelStartValue && dayjs(travelStartValue).isValid() ? dayjs(travelStartValue) : null;

    const maxAllowedDate = baseDate.add(45, 'day');
    const dueCutoffDate = travelDate && travelDate.isBefore(maxAllowedDate) ? travelDate : maxAllowedDate;

    const paymentTypeRaw = String(
        details?.paymentDetails?.paymentType
        || details?.paymentMode
        || ''
    ).toLowerCase().trim();
    const isDeposit = paymentTypeRaw.includes('deposit');

    if (!isDeposit) {
        return {
            schedule: [
                {
                    label: 'Full Payment',
                    amount: totalAmount,
                    dueDate: dueCutoffDate,
                    status: totalPaid >= (totalAmount - 0.01) ? 'PAID' : 'PENDING',
                },
            ],
            isDeposit,
        };
    }

    const depositAmount = toAmount(details?.paymentDetails?.depositAmount);
    const remainingAmount = Math.max(totalAmount - depositAmount, 0);
    const frequencyWeeks = getFrequencyWeeks(details?.paymentDetails?.frequency);

    const paymentDates = [];
    let nextDate = dayjs(baseDate).add(frequencyWeeks, 'week');
    while (nextDate.isBefore(dueCutoffDate) || nextDate.isSame(dueCutoffDate)) {
        paymentDates.push(nextDate);
        nextDate = nextDate.add(frequencyWeeks, 'week');
    }

    if (!paymentDates.length) {
        paymentDates.push(dueCutoffDate.subtract(1, 'day'));
    }

    const installmentAmount = paymentDates.length ? remainingAmount / paymentDates.length : 0;

    const schedule = [
        {
            label: 'Deposit',
            amount: depositAmount,
            dueDate: baseDate,
            status: totalPaid >= (depositAmount - 0.01) ? 'PAID' : 'PENDING',
        },
        ...paymentDates.map((dueDate, index) => {
            const cumulativeTarget = depositAmount + (installmentAmount * (index + 1));
            return {
                label: `Installment ${index + 1}`,
                amount: installmentAmount,
                dueDate,
                status: totalPaid >= (cumulativeTarget - 0.01) ? 'PAID' : 'PENDING',
            };
        }),
    ];

    return { schedule, isDeposit };
};

const sendReminderEmail = async ({ to, username, bookingRef, label, dueDate, amount }) => {
    if (!to) return;

    await transporter.sendMail({
        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
        to,
        subject: `Payment Reminder: ${bookingRef} due on ${dueDate.format('MMM D, YYYY')}`,
        html: `
        <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:32px;">
            <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:10px; padding:24px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                <h2 style="color:#305797; margin-top:0;">Payment Reminder</h2>
                <p>Hello <b>${username || 'Customer'}</b>,</p>
                <p>This is a reminder that your <b>${label}</b> for booking <b>${bookingRef}</b> is due on <b>${dueDate.format('MMM D, YYYY')}</b>.</p>
                <p>Amount due: <b>PHP ${formatMoney(amount)}</b></p>
                <p>Please settle your account on or before the deadline to avoid penalties.</p>
                <p style="font-size:12px; color:#666; margin-top:24px;">This is an automated email from M&RC Travel and Tours.</p>
            </div>
        </div>
        `,
    });
};

const sendPenaltyEmail = async ({ to, username, bookingRef, addedAmount, totalPenalty }) => {
    if (!to) return;

    await transporter.sendMail({
        from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
        to,
        subject: `Late Payment Penalty Applied: ${bookingRef}`,
        html: `
        <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:32px;">
            <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:10px; padding:24px; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                <h2 style="color:#b45309; margin-top:0;">Late Payment Penalty Applied</h2>
                <p>Hello <b>${username || 'Customer'}</b>,</p>
                <p>A late payment penalty has been added to booking <b>${bookingRef}</b>.</p>
                <p>Added penalty: <b>PHP ${formatMoney(addedAmount)}</b></p>
                <p>Total accumulated penalty: <b>PHP ${formatMoney(totalPenalty)}</b></p>
                <p>Please settle your account as soon as possible to avoid further penalties.</p>
                <p style="font-size:12px; color:#666; margin-top:24px;">This is an automated email from M&RC Travel and Tours.</p>
            </div>
        </div>
        `,
    });
};

const processBookings = async (bookings) => {
    if (!bookings.length) return { processed: 0 };

    const bookingIds = bookings.map((booking) => booking._id).filter(Boolean);
    if (!bookingIds.length) return { processed: 0 };

    const paidAgg = await TransactionModel.aggregate([
        { $match: { bookingId: { $in: bookingIds }, status: { $in: SUCCESSFUL_TRANSACTION_STATUSES } } },
        { $group: { _id: '$bookingId', totalPaid: { $sum: '$amount' } } },
    ]);

    const paidMap = new Map(paidAgg.map((item) => [String(item._id), Number(item.totalPaid || 0)]));
    const today = dayjs().startOf('day');

    for (const booking of bookings) {
        const totalPaid = paidMap.get(String(booking._id)) || 0;
        const { schedule } = buildPaymentSchedule(booking, totalPaid);
        const bookingUserId = booking?.userId?._id || booking?.userId || null;
        const bookingUserEmail = booking?.userId?.email || null;
        const bookingUsername = booking?.userId?.username || null;

        if (!Array.isArray(booking.paymentReminderKeys)) booking.paymentReminderKeys = [];
        if (!Array.isArray(booking.paymentPenaltyKeys)) booking.paymentPenaltyKeys = [];
        if (!Number.isFinite(booking.paymentPenaltyTotal)) booking.paymentPenaltyTotal = 0;

        let penaltyAddedNow = 0;
        const newReminderKeys = [];
        const newPenaltyKeys = [];

        for (const item of schedule) {
            if (item.status !== 'PENDING') continue;

            const dueKeyDate = item.dueDate.format('YYYY-MM-DD');
            const reminderDate = dayjs(item.dueDate).subtract(REMINDER_DAYS_BEFORE_DUE, 'day').startOf('day');
            const reminderKey = `${item.label}|${dueKeyDate}|${reminderDate.format('YYYY-MM-DD')}`;

            if (today.isSame(reminderDate, 'day') && !booking.paymentReminderKeys.includes(reminderKey)) {
                newReminderKeys.push(reminderKey);

                if (bookingUserId) {
                    await NotificationModel.create({
                        userId: bookingUserId,
                        title: 'Payment Reminder',
                        message: `${item.label} is due on ${item.dueDate.format('MMM D, YYYY')}. Please settle your account on or before the deadline.`,
                        type: 'payment-reminder',
                        link: '/user-bookings',
                        metadata: {
                            bookingId: booking._id,
                            bookingReference: booking.reference,
                            dueDate: dueKeyDate,
                            amount: Number(item.amount || 0),
                        },
                    });
                }

                try {
                    await sendReminderEmail({
                        to: bookingUserEmail,
                        username: bookingUsername,
                        bookingRef: booking.reference,
                        label: item.label,
                        dueDate: item.dueDate,
                        amount: Number(item.amount || 0),
                    });
                } catch (emailError) {
                    console.error('Failed to send payment reminder email:', emailError);
                }
            }

            const penaltyKey = `${item.label}|${dueKeyDate}`;
            if (today.isAfter(item.dueDate, 'day') && !booking.paymentPenaltyKeys.includes(penaltyKey)) {
                newPenaltyKeys.push(penaltyKey);
                penaltyAddedNow += PENALTY_AMOUNT;
            }
        }

        if (newReminderKeys.length) {
            booking.paymentReminderKeys = [...booking.paymentReminderKeys, ...newReminderKeys];
        }

        if (newPenaltyKeys.length) {
            booking.paymentPenaltyKeys = [...booking.paymentPenaltyKeys, ...newPenaltyKeys];
            booking.paymentPenaltyTotal = Number(booking.paymentPenaltyTotal || 0) + penaltyAddedNow;

            if (bookingUserId) {
                await NotificationModel.create({
                    userId: bookingUserId,
                    title: 'Late Payment Penalty Applied',
                    message: `PHP ${formatMoney(penaltyAddedNow)} has been added to your balance as a late payment penalty for booking ${booking.reference}.`,
                    type: 'payment-penalty',
                    link: '/user-bookings',
                    metadata: {
                        bookingId: booking._id,
                        bookingReference: booking.reference,
                        addedPenalty: penaltyAddedNow,
                        totalPenalty: booking.paymentPenaltyTotal,
                    },
                });
            }

            try {
                await sendPenaltyEmail({
                    to: bookingUserEmail,
                    username: bookingUsername,
                    bookingRef: booking.reference,
                    addedAmount: penaltyAddedNow,
                    totalPenalty: booking.paymentPenaltyTotal,
                });
            } catch (emailError) {
                console.error('Failed to send penalty email:', emailError);
            }
        }

        if (newReminderKeys.length || newPenaltyKeys.length) {
            await BookingModel.updateOne(
                { _id: booking._id },
                {
                    $set: {
                        paymentPenaltyTotal: Number(booking.paymentPenaltyTotal || 0),
                        paymentPenaltyKeys: booking.paymentPenaltyKeys,
                        paymentReminderKeys: booking.paymentReminderKeys,
                    },
                }
            );
        }
    }

    return { processed: bookings.length };
};

const processBillingForBookingId = async (bookingId) => {
    if (!bookingId) return { processed: 0 };

    const bookings = await BookingModel.find({
        _id: bookingId,
        status: { $nin: ['Cancelled', 'cancellation requested', 'Fully Paid'] },
    }).populate('userId', 'email username');

    return processBookings(bookings);
};

const processBillingDeadlines = async () => {
    const bookings = await BookingModel.find({
        status: { $nin: ['Cancelled', 'cancellation requested', 'Fully Paid'] },
    }).populate('userId', 'email username');

    return processBookings(bookings);
};

const startBillingDeadlineScheduler = () => {
    // run once on startup
    processBillingDeadlines().catch((error) => {
        console.error('Billing deadline scheduler startup run failed:', error);
    });

    // run every hour
    setInterval(() => {
        processBillingDeadlines().catch((error) => {
            console.error('Billing deadline scheduler interval run failed:', error);
        });
    }, 60 * 60 * 1000);
};

module.exports = {
    startBillingDeadlineScheduler,
    processBillingDeadlines,
    processBillingForBookingId,
};
