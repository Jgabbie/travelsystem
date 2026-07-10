import PackageModel from "../models/package.js";
import ArchivedPackageModel from "../models/archivedpackages.js";
import BookingModel from "../models/booking.js";
import WishlistModel from "../models/wishlist.js";
import UserModel from "../models/user.js";
import NotificationModel from "../models/notification.js";
import logAction from "../utils/logger.js";
import dayjs from "dayjs";
import baseTransporter from "../config/nodemailer.js";
import { buildBrandedEmail } from "../utils/emailTemplate.js";
import mongoose from "mongoose";


//function to send email notifications to users on wishlist when a package becomes available
const transporter = {
    ...baseTransporter,
    sendMail: (mailOptions = {}) => {
        const subjectText = String(mailOptions.subject || "").trim();
        const derivedTitle = subjectText
            ? subjectText.replace(/^M&RC Travel and Tours\s*-\s*/i, "")
            : "M&RC Travel and Tours";

        return baseTransporter.sendMail({
            ...mailOptions,
            html: buildBrandedEmail({
                title: derivedTitle || "M&RC Travel and Tours",
                bodyHtml: typeof mailOptions.html === "string" ? mailOptions.html : "",
            }),
        });
    },
};

const FRONTEND_URL = process.env.FRONTEND_URL ||
    "http://localhost:3000";

const sumSlots = (ranges = []) => ranges.reduce((total, range) => total + Number(range?.slots || 0), 0);

//function to build a package link for email notifications
const buildPackageLink = (pkg) => {
    const packageCode = encodeURIComponent(String(pkg?.packageCode || ""));

    return `${FRONTEND_URL}/package#${packageCode}`;
};


//function to find a package by its code or ID
const findPackageByCodeParam = async (packageCodeParam) => {
    const byCode = await PackageModel.findOne({ packageCode: packageCodeParam });
    if (byCode) return byCode;

    if (mongoose.Types.ObjectId.isValid(packageCodeParam)) {
        return PackageModel.findById(packageCodeParam);
    }

    return null;
};


//function to find an archived package by its code or ID
const findArchivedPackageByCodeParam = async (packageCodeParam) => {
    const byCode = await ArchivedPackageModel.findOne({ packageCode: packageCodeParam }).sort({ archivedAt: -1 });
    if (byCode) return byCode;

    if (mongoose.Types.ObjectId.isValid(packageCodeParam)) {
        return ArchivedPackageModel.findById(packageCodeParam);
    }

    return null;
};


//function to notify users on the wishlist when a package becomes available
const notifyWishlistUsers = async ({
    packageId,
    title,
    message,
    type,
    link,
    metadata,
    emailSubject,
    emailHtml
}) => {
    const wishlistEntries = await WishlistModel.find({
        $or: [
            { packageId },
            { packageId: String(packageId) },
            { packageItem: packageId },
            { packageItem: String(packageId) }
        ]
    }).lean();

    console.log(
        `[Wishlist Notification] Found ${wishlistEntries.length} wishlist entries`
    );

    if (!wishlistEntries.length) {
        return {
            recipients: 0,
            sent: 0,
            failed: 0
        };
    }

    const notifications = [];
    let sent = 0;
    let failed = 0;

    for (const entry of wishlistEntries) {
        const wishlistUserId =
            entry.userId?._id ||
            entry.userId ||
            entry.user;

        if (!wishlistUserId) {
            console.warn(
                `[Wishlist Email] Wishlist ${entry._id} has no user ID`
            );
            continue;
        }

        const user = await UserModel.findById(wishlistUserId)
            .select("email username firstname lastname")
            .lean();

        if (!user) {
            console.warn(
                `[Wishlist Email] User ${wishlistUserId} was not found`
            );
            continue;
        }

        notifications.push({
            userId: user._id,
            title,
            message,
            type,
            link,
            metadata,
            pushStatus: "pending"
        });

        const recipientEmail = String(user.email || "")
            .trim()
            .toLowerCase();

        if (!recipientEmail) {
            console.warn(
                `[Wishlist Email] User ${user._id} does not have an email`
            );
            failed += 1;
            continue;
        }

        try {
            const bodyContent =
                typeof emailHtml === "function"
                    ? emailHtml(user)
                    : "";

            console.log("[Wishlist Email] Attempting to send:", {
                to: recipientEmail,
                subject: emailSubject,
                hasBody: Boolean(bodyContent)
            });

            const mailResult = await transporter.sendMail({
                from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                to: recipientEmail,
                subject: emailSubject,
                text: message,
                html: bodyContent
            });

            console.log("[Wishlist Email] Email accepted:", {
                to: recipientEmail,
                messageId: mailResult.messageId,
                accepted: mailResult.accepted,
                rejected: mailResult.rejected,
                response: mailResult.response
            });

            if (
                Array.isArray(mailResult.rejected) &&
                mailResult.rejected.length > 0
            ) {
                failed += 1;
            } else {
                sent += 1;
            }
        } catch (emailError) {
            failed += 1;

            console.error("[Wishlist Email] Sending failed:", {
                to: recipientEmail,
                subject: emailSubject,
                message: emailError.message,
                response: emailError.response,
                responseCode: emailError.responseCode,
                command: emailError.command,
                code: emailError.code,
                stack: emailError.stack
            });
        }
    }

    if (notifications.length) {
        await NotificationModel.insertMany(notifications);
    }

    console.log("[Wishlist Email] Complete:", {
        wishlistEntries: wishlistEntries.length,
        notifications: notifications.length,
        sent,
        failed
    });

    return {
        recipients: wishlistEntries.length,
        sent,
        failed
    };
};


//add package function
const addPackage = async (req, res) => {
    const { name, code, pricePerPax, soloRate, childRate, infantRate, deposit, availableSlots, description, packageType, dateRanges, duration, hotels, airlines, termsAndConditions, inclusions, exclusions, itineraries, images, tags, visaRequired, video } = req.body;
    try {

        if (name === null || code === null || pricePerPax === null
            || availableSlots === null || description === null ||
            packageType === null || duration === null || hotels === null
            || airlines === null || termsAndConditions === null ||
            inclusions === null || exclusions === null || itineraries === null
            || tags === null || visaRequired === null) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const newPackage = await PackageModel.create({
            packageName: name,
            packageCode: code,
            packagePricePerPax: Number(pricePerPax),
            packageAvailableSlots: Number(availableSlots),
            packageSoloRate: Number(soloRate),
            packageChildRate: Number(childRate),
            packageInfantRate: Number(infantRate),
            packageDeposit: Number(deposit),
            packageDescription: description,
            packageType: packageType,
            packageDuration: Number(duration),
            packageSpecificDate: (dateRanges || []).map(range => ({
                startdaterange: range.startdaterange
                    ? new dayjs(range.startdaterange).format('YYYY-MM-DD')
                    : null,
                enddaterange: range.enddaterange
                    ? new dayjs(range.enddaterange).format('YYYY-MM-DD')
                    : null,
                extrarate: range.extrarate
                    ? Number(range.extrarate)
                    : 0,
                slots: range.slots
                    ? Number(range.slots)
                    : 0
            })),
            packageHotels: hotels,
            packageAirlines: airlines,
            packageTermsConditions: termsAndConditions,
            packageInclusions: inclusions,
            packageExclusions: exclusions,
            packageItineraries: itineraries,
            packageItineraryImages: req.body.packageItineraryImages || {},
            packageTags: tags,
            visaRequired: visaRequired,
            images: images || [],
            packageVideo: video || null
        });

        await logAction(
            "PACKAGE_CREATED",
            req.userId || null,
            {
                "Package Created": `Package Name: ${newPackage.packageName} | Package Code: ${newPackage.packageCode} | Package Type: ${newPackage.packageType} | Duration: ${newPackage.packageDuration}`
            }
        );


        res.status(201).json({ message: "Package created successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


//get packages function
const getPackages = async (req, res) => {
    try {
        const packages = await PackageModel.find();

        const packagePayload = packages.map(pkg => {

            const availableSlots = (pkg.packageSpecificDate || [])
                .reduce((total, dateRange) => {
                    return total + (dateRange?.slots || 0);
                }, 0);

            return {
                packageItem: pkg._id,
                packageCode: pkg.packageCode,
                packageName: pkg.packageName,
                packageDescription: pkg.packageDescription,
                packageDuration: pkg.packageDuration,
                packagePricePerPax: pkg.packagePricePerPax,
                packageDeposit: pkg.packageDeposit,
                packageSoloRate: pkg.packageSoloRate,
                packageChildRate: pkg.packageChildRate,
                packageInfantRate: pkg.packageInfantRate,
                packageAvailableSlots: availableSlots,
                packageSpecificDate: pkg.packageSpecificDate || [],
                packageType: pkg.packageType,
                packageImages: pkg.images || [],
                packageVideo: pkg.packageVideo || null,
                packageTags: pkg.packageTags || [],
                packageDiscountPercent: pkg.packageDiscountPercent || 0
            };
        });

        res.status(200).json(packagePayload);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


//get archived packages function
const getArchivedPackages = async (_req, res) => {
    try {
        const packages = await ArchivedPackageModel.find().sort({ archivedAt: -1 });

        const packagePayload = packages.map(pkg => {

            const availableSlots = (pkg.packageSpecificDate || [])
                .reduce((total, dateRange) => {
                    return total + (dateRange?.slots || 0);
                }, 0);

            return {
                packageItem: pkg._id,
                packageCode: pkg.packageCode,
                packageName: pkg.packageName,
                packageDescription: pkg.packageDescription,
                packageDuration: pkg.packageDuration,
                packagePricePerPax: pkg.packagePricePerPax,
                packageDeposit: pkg.packageDeposit,
                packageSoloRate: pkg.packageSoloRate,
                packageChildRate: pkg.packageChildRate,
                packageInfantRate: pkg.packageInfantRate,
                packageAvailableSlots: availableSlots,
                packageSpecificDate: pkg.packageSpecificDate || [],
                packageType: pkg.packageType,
                packageImages: pkg.images || [],
                packageVideo: pkg.packageVideo || null,
                packageTags: pkg.packageTags || [],
                packageDiscountPercent: pkg.packageDiscountPercent || 0
            };
        });

        res.status(200).json(packagePayload);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


//get packages for users function
const getPackagesForUsers = async (req, res) => {
    try {
        const packages = await PackageModel.find();

        const packagePayload = packages.map(pkg => {

            const availableSlots = (pkg.packageSpecificDate || [])
                .reduce((total, dateRange) => {
                    return total + (dateRange?.slots || 0);
                }, 0);

            return {
                packageItem: pkg._id,
                packageCode: pkg.packageCode,
                packageName: pkg.packageName,
                packageDescription: pkg.packageDescription,
                packageDuration: pkg.packageDuration,
                packagePricePerPax: pkg.packagePricePerPax,
                packageAvailableSlots: availableSlots,
                packageType: pkg.packageType,
                packageImages: pkg.images || [],
                packageVideo: pkg.packageVideo || null,
                packageTags: pkg.packageTags || [],
                packageDiscountPercent: pkg.packageDiscountPercent || 0
            };
        });

        res.status(200).json(packagePayload);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


//remove package function
const removePackage = async (req, res) => {
    const packageItem = req.params.id || req.params.packageItem;

    if (!packageItem) {
        return res.status(400).json({ message: "Package identifier is required" });
    }

    try {
        const pkg = await PackageModel.findById(packageItem);
        if (!pkg) {
            return res.status(404).json({ message: "Package not found" });
        }

        await ArchivedPackageModel.create({
            originalPackageId: pkg._id,
            packageName: pkg.packageName,
            packageCode: pkg.packageCode,
            packagePricePerPax: pkg.packagePricePerPax,
            packageSoloRate: pkg.packageSoloRate,
            packageChildRate: pkg.packageChildRate,
            packageInfantRate: pkg.packageInfantRate,
            packageDeposit: pkg.packageDeposit,
            packageDuration: pkg.packageDuration,
            packageDescription: pkg.packageDescription,
            packageType: pkg.packageType,
            packageSpecificDate: pkg.packageSpecificDate,
            packageHotels: pkg.packageHotels,
            packageAirlines: pkg.packageAirlines,
            packageAddons: pkg.packageAddons,
            packageInclusions: pkg.packageInclusions,
            packageExclusions: pkg.packageExclusions,
            packageTermsConditions: pkg.packageTermsConditions,
            packageItineraries: pkg.packageItineraries,
            packageTags: pkg.packageTags,
            packageDiscountPercent: pkg.packageDiscountPercent,
            images: pkg.images,
            packageVideo: pkg.packageVideo,
            visaRequired: pkg.visaRequired,
            createdAt: pkg.createdAt
        });

        await PackageModel.findByIdAndDelete(pkg._id);

        await logAction(
            "PACKAGE_ARCHIVED",
            req.userId || null,
            {
                "Package Archived": `Package Name: ${pkg.packageName} | Package Code: ${pkg.packageCode} | Package Type: ${pkg.packageType} | Duration: ${pkg.packageDuration}`
            },
        );

        res.status(200).json({ message: "Package archived successfully", package: pkg });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


//restore package function
const restoreArchivedPackage = async (req, res) => {
    const packageItem = req.params.id;

    if (!packageItem) {
        return res.status(400).json({ message: "Archived package identifier is required" });
    }

    try {
        const archivedPackage = await ArchivedPackageModel.findById(packageItem);
        if (!archivedPackage) {
            return res.status(404).json({ message: "Archived package not found" });
        }

        const existingPackageByOriginalId = await PackageModel.findById(archivedPackage.originalPackageId);
        if (existingPackageByOriginalId) {
            return res.status(409).json({ message: "Package already exists" });
        }

        const existingPackageByCode = await PackageModel.findOne({ packageCode: archivedPackage.packageCode });
        if (existingPackageByCode) {
            return res.status(409).json({ message: "Package code already exists" });
        }

        const restoredPackage = await PackageModel.create({
            _id: archivedPackage.originalPackageId,
            packageName: archivedPackage.packageName,
            packageCode: archivedPackage.packageCode,
            packagePricePerPax: archivedPackage.packagePricePerPax,
            packageSoloRate: archivedPackage.packageSoloRate,
            packageChildRate: archivedPackage.packageChildRate,
            packageInfantRate: archivedPackage.packageInfantRate,
            packageDeposit: archivedPackage.packageDeposit,
            packageDuration: archivedPackage.packageDuration,
            packageDescription: archivedPackage.packageDescription,
            packageType: archivedPackage.packageType,
            packageSpecificDate: archivedPackage.packageSpecificDate,
            packageHotels: archivedPackage.packageHotels,
            packageAirlines: archivedPackage.packageAirlines,
            packageAddons: archivedPackage.packageAddons,
            packageInclusions: archivedPackage.packageInclusions,
            packageExclusions: archivedPackage.packageExclusions,
            packageTermsConditions: archivedPackage.packageTermsConditions,
            packageItineraries: archivedPackage.packageItineraries,
            packageTags: archivedPackage.packageTags,
            packageDiscountPercent: archivedPackage.packageDiscountPercent,
            images: archivedPackage.images,
            packageVideo: archivedPackage.packageVideo,
            visaRequired: archivedPackage.visaRequired
        });

        await ArchivedPackageModel.findByIdAndDelete(archivedPackage._id);

        await logAction(
            "PACKAGE_RESTORED",
            req.userId || null,
            {
                "Package Restored": `Package Name: ${restoredPackage.packageName} | Package Code: ${restoredPackage.packageCode} | Package Type: ${restoredPackage.packageType} | Duration: ${restoredPackage.packageDuration}`
            },
        );

        res.status(200).json({ message: "Package restored successfully", package: restoredPackage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


//get package by code or ID function
const getPackage = async (req, res) => {
    try {
        const { id } = req.params;
        const pkg = await findPackageByCodeParam(id);


        if (!pkg) return res.status(404).json({ message: "Package not found" });

        const availableSlots = (pkg.packageSpecificDate || [])
            .reduce((total, dateRange) => {
                return total + (dateRange?.slots || 0);
            }, 0);


        const packagePayload = {
            packageItem: pkg._id,
            packageCode: pkg.packageCode,
            packageName: pkg.packageName,
            packageDescription: pkg.packageDescription,
            packageDuration: pkg.packageDuration,
            packagePricePerPax: pkg.packagePricePerPax,
            packageDeposit: pkg.packageDeposit,
            packageSoloRate: pkg.packageSoloRate,
            packageChildRate: pkg.packageChildRate,
            packageInfantRate: pkg.packageInfantRate,
            packageSpecificDate: pkg.packageSpecificDate || [],
            availableSlots: availableSlots,
            packageType: pkg.packageType,
            images: pkg.images || [],
            packageVideo: pkg.packageVideo || null,
            packageHotels: pkg.packageHotels,
            packageAirlines: pkg.packageAirlines,
            packageInclusions: pkg.packageInclusions,
            packageExclusions: pkg.packageExclusions,
            packageTermsConditions: pkg.packageTermsConditions,
            packageItineraries: pkg.packageItineraries,
            packageItineraryImages: pkg.packageItineraryImages || {},
            visaRequired: pkg.visaRequired || false,
            packageTags: pkg.packageTags || [],
            packageDiscountPercent: pkg.packageDiscountPercent || 0
        }

        // send everything as-is
        res.status(200).json(packagePayload);
    } catch (err) {
        console.error("getPackage error:", err);
        res.status(500).json({ error: err.message });
    }
};


//update package function
const updatePackage = async (req, res) => {
    const { id } = req.params;

    try {
        const existingPackage = await PackageModel.findById(id);
        if (!existingPackage) {
            return res.status(404).json({ message: "Package not found" });
        }

        const previousSlots = sumSlots(
            existingPackage.packageSpecificDate || []
        );

        const incomingDateRanges = Array.isArray(req.body.dateRanges)
            ? req.body.dateRanges
            : Array.isArray(req.body.packageSpecificDate)
                ? req.body.packageSpecificDate
                : existingPackage.packageSpecificDate || [];

        const updatedPackage = await PackageModel.findByIdAndUpdate(
            existingPackage._id,
            {
                packageName: req.body.name,
                packageCode: req.body.code,
                packagePricePerPax: Number(req.body.pricePerPax),
                packageAvailableSlots: Number(req.body.availableSlots),
                packageSoloRate: Number(req.body.soloRate),
                packageChildRate: Number(req.body.childRate),
                packageInfantRate: Number(req.body.infantRate),
                packageDeposit: Number(req.body.deposit),
                packageDuration: Number(req.body.duration),
                packageDescription: req.body.description,
                packageType: req.body.packageType,
                packageSpecificDate: incomingDateRanges.map(range => ({
                    startdaterange: range.startdaterange
                        ? new dayjs(range.startdaterange).format('YYYY-MM-DD')
                        : null,
                    enddaterange: range.enddaterange
                        ? new dayjs(range.enddaterange).format('YYYY-MM-DD')
                        : null,
                    extrarate: range.extrarate
                        ? Number(range.extrarate)
                        : 0,
                    slots: range.slots
                        ? Number(range.slots)
                        : 0
                })),
                packageHotels: req.body.hotels,
                packageAirlines: req.body.airlines,
                packageInclusions: req.body.inclusions,
                packageExclusions: req.body.exclusions,
                packageTermsConditions: req.body.termsAndConditions,
                packageItineraries: req.body.itineraries,
                packageItineraryImages: req.body.packageItineraryImages || {},
                packageTags: req.body.tags,
                visaRequired: req.body.visaRequired,
                images: req.body.images || [],
                packageVideo: req.body.video || req.body.packageVideo || null
            },
            { new: true }
        );

        const updatedSlots = sumSlots(
            updatedPackage.packageSpecificDate || []
        );

        if (previousSlots <= 0 && updatedSlots > 0) {
            await notifyWishlistUsers({
                packageId: updatedPackage._id,
                title: "Package is Now Available",
                message: `${updatedPackage.packageName} is now available for booking.`,
                type: "wishlist",
                link: buildPackageLink(updatedPackage),
                metadata: {
                    availability: "available",
                    routeState: {
                        packageCode: updatedPackage.packageCode,
                        packageId: updatedPackage._id
                    }
                },
                emailSubject: `Package Available: ${updatedPackage.packageName}`,
                emailHtml: (user) => `
                                        <div style="max-width:560px; margin:0 auto;">
                                            <p style="margin:0 0 14px; color:#2f2f2f; font-size:15px; line-height:1.7;">
                                                Hello <b>${user.firstname || user.username || "Customer"}</b>,
                                            </p>

                                            <p style="margin:0 0 14px; color:#2f2f2f; font-size:15px; line-height:1.7;">
                                                Great news! Your saved package
                                                <b>${updatedPackage.packageName}</b> is now available for booking.
                                            </p>

                                            <p style="margin:0; color:#64748b; font-size:14px; line-height:1.7;">
                                                New slots have been added. Reserve your preferred travel date
                                                while slots are still available.
                                            </p>

                                            <a
                                                href="${buildPackageLink(updatedPackage)}"
                                                style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;"
                                            >
                                                View Package
                                            </a>
                                        </div>
                                    `
            });
        }

        await logAction(
            "PACKAGE_UPDATED",
            req.userId || null,
            {
                "Package Updated": `Package Name: ${updatedPackage.packageName} | Package Code: ${updatedPackage.packageCode} | Package Type: ${updatedPackage.packageType} | Duration: ${updatedPackage.packageDuration}`
            },
        );

        res.status(200).json(updatedPackage);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


//get popular packages function
const getPopularPackages = async (req, res) => {
    const limit = Number.parseInt(req.query.limit, 10) || 4;

    try {
        const popularPackages = await BookingModel.aggregate([
            { $group: { _id: '$packageId', bookingCount: { $sum: 1 } } },
            { $sort: { bookingCount: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'packages',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'package'
                }
            },
            { $unwind: '$package' },
            {
                $project: {
                    bookingCount: 1,
                    package: 1
                }
            }
        ]);

        const packagePayload = popularPackages.map(entry => ({
            packageItem: entry.package._id,
            packageCode: entry.package.packageCode,
            packageName: entry.package.packageName,
            packageDescription: entry.package.packageDescription,
            packageDuration: entry.package.packageDuration,
            packagePricePerPax: entry.package.packagePricePerPax,
            packageAvailableSlots: (entry.package.packageSpecificDate || []).reduce((total, dateRange) => {
                return total + (dateRange?.slots || 0);
            }, 0),
            packageType: entry.package.packageType,
            packageImages: entry.package.images || [],
            packageTags: entry.package.packageTags || [],
            packageDiscountPercent: entry.package.packageDiscountPercent || 0,
            bookingCount: entry.bookingCount
        }));

        res.status(200).json(
            packagePayload
        );
    } catch (err) {
        console.error('getPopularPackages error:', err);
        res.status(500).json({ error: err.message });
    }
};


//update slots function
const updateSlots = async (req, res) => {
    const slotsPayload = req.body;
    const packageCode = slotsPayload.packageItem || slotsPayload.packageCode || slotsPayload.packageId;
    const dateRanges = Array.isArray(slotsPayload.dateRanges)
        ? slotsPayload.dateRanges
        : Array.isArray(slotsPayload.packageSpecificDate)
            ? slotsPayload.packageSpecificDate
            : [];

    try {
        const pkg = await findPackageByCodeParam(packageCode);
        if (!pkg) {
            return res.status(404).json({ message: "Package not found" });
        }

        const previousSlots = sumSlots(
            pkg.packageSpecificDate || []
        );

        if (!pkg.packageSpecificDate || pkg.packageSpecificDate.length === 0) {
            return res.status(400).json({ message: "Package does not have specific date ranges" });
        }

        pkg.packageSpecificDate = dateRanges.map((range) => ({
            startdaterange: range.startdaterange
                ? new dayjs(range.startdaterange).format('YYYY-MM-DD')
                : null,
            enddaterange: range.enddaterange
                ? new dayjs(range.enddaterange).format('YYYY-MM-DD')
                : null,
            extrarate: range.extrarate
                ? Number(range.extrarate)
                : 0,
            slots: range.slots
                ? Number(range.slots)
                : 0
        }));
        await pkg.save();

        const updatedSlots = sumSlots(
            pkg.packageSpecificDate || []
        );


        if (previousSlots <= 0 && updatedSlots > 0) {
            await notifyWishlistUsers({
                packageId: pkg._id,
                title: "Package is Now Available",
                message: `${pkg.packageName} is now available for booking.`,
                type: "wishlist",
                link: buildPackageLink(pkg),
                metadata: {
                    availability: "available",
                    routeState: {
                        packageCode: pkg.packageCode,
                        packageId: pkg._id
                    }
                },
                emailSubject: `Now Available: ${pkg.packageName}`,
                emailHtml: (user) => `
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:0; padding:30px 32px; text-align:left;">
                            <p style="color:#555; font-size:16px;">Hello <b>${user.username || "Customer"}</b>,</p>
                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>${pkg.packageName}</b> is now available for booking.
                            </p>
                            <a href="${buildPackageLink(pkg)}" style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                                View Package
                            </a>
                        </div>
                `
            });
        }

        await logAction(
            "PACKAGE_SLOTS_UPDATED",
            req.userId || null,
            {
                "Package Slots Updated": `Package Name: ${pkg.packageName} | Package Code: ${pkg.packageCode} | Package Type: ${pkg.packageType} | Duration: ${pkg.packageDuration}`
            },
        );

        res.status(200).json({ message: "Slots updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


//update discount function
const updateDiscount = async (req, res) => {
    const { packageItem, packageCode, packageId, discountPercent } = req.body;
    const lookupCode = packageItem || packageCode || packageId;
    const parsedDiscount = Number(discountPercent);

    if (!lookupCode) {
        return res.status(400).json({ message: "Package code is required" });
    }

    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
        return res.status(400).json({ message: "Discount percent must be between 0 and 100" });
    }

    try {
        const pkg = await findPackageByCodeParam(lookupCode);
        if (!pkg) {
            return res.status(404).json({ message: "Package not found" });
        }

        const previousDiscount = Number(pkg.packageDiscountPercent || 0);

        pkg.packageDiscountPercent = parsedDiscount;
        await pkg.save();

        if (previousDiscount === 0 && parsedDiscount > 0) {
            await notifyWishlistUsers({
                packageId: pkg._id,
                title: "Package Discount Available",
                message: `${pkg.packageName} now has a ${parsedDiscount}% discount.`,
                type: "wishlist",
                link: '/package',
                metadata: {
                    discountPercent: parsedDiscount,
                    routeState: {
                        packageItem: pkg._id
                    }
                },
                emailSubject: `Discount Alert: ${pkg.packageName}`,
                emailHtml: (user) => `
                        <div style="max-width:560px; margin:0 auto; background:#ffffff; padding:0;">

                                <div style="padding:0 32px;">
                                    <p style="margin:0 0 14px 0; color:#2f2f2f; font-size:15px; line-height:1.7;">
                                        Hello <b>${user.username || "Customer"}</b>, we wanted to let you know that your saved package now has a special offer.
                                    </p>
                                    <p style="margin:0; color:#2f2f2f; font-size:15px; line-height:1.7;">
                                        <b>${pkg.packageName}</b> now has a <b style="color:#305797;">${parsedDiscount}%</b> discount available.
                                    </p>

                                    <a href="${buildPackageLink(pkg)}" style="display:inline-block; margin-top:26px; padding:12px 24px; background:#305797; color:#ffffff; text-decoration:none; border-radius:999px; font-size:12px; letter-spacing:1.8px; font-weight:700; text-transform:uppercase;">
                                        View Package
                                    </a>

                        </div>
                `
            });
        }

        await logAction(
            "PACKAGE_DISCOUNT_UPDATED",
            req.userId || null,
            {
                "Package Discount Updated": `Package Name: ${pkg.packageName} | Package Code: ${pkg.packageCode} | Package Type: ${pkg.packageType} | Duration: ${pkg.packageDuration}`
            },
        );

        res.status(200).json({ message: "Discount updated successfully", package: pkg });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


export {
    addPackage,
    getPackages,
    getArchivedPackages,
    restoreArchivedPackage,
    getPackagesForUsers,
    removePackage,
    getPackage,
    updatePackage,
    getPopularPackages,
    updateSlots,
    updateDiscount
};
