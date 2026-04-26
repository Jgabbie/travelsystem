const PackageModel = require("../models/package");
const ArchivedPackageModel = require("../models/archivedpackages");
const BookingModel = require("../models/booking");
const WishlistModel = require("../models/wishlist");
const NotificationModel = require("../models/notification");
const logAction = require("../utils/logger");
const dayjs = require("dayjs");
const transporter = require("../config/nodemailer");
const mongoose = require("mongoose");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const sumSlots = (ranges = []) => ranges.reduce((total, range) => total + Number(range?.slots || 0), 0);

const findPackageByCodeParam = async (packageCodeParam) => {
    const byCode = await PackageModel.findOne({ packageCode: packageCodeParam });
    if (byCode) return byCode;

    if (mongoose.Types.ObjectId.isValid(packageCodeParam)) {
        return PackageModel.findById(packageCodeParam);
    }

    return null;
};

const findArchivedPackageByCodeParam = async (packageCodeParam) => {
    const byCode = await ArchivedPackageModel.findOne({ packageCode: packageCodeParam }).sort({ archivedAt: -1 });
    if (byCode) return byCode;

    if (mongoose.Types.ObjectId.isValid(packageCodeParam)) {
        return ArchivedPackageModel.findById(packageCodeParam);
    }

    return null;
};

const notifyWishlistUsers = async ({ packageId, title, message, type, link, metadata, emailSubject, emailHtml }) => {
    const wishlistEntries = await WishlistModel.find({ packageId })
        .populate("userId", "email username");

    if (!wishlistEntries.length) {
        return;
    }

    const notifications = [];

    for (const entry of wishlistEntries) {
        const user = entry.userId;
        if (!user?._id) {
            continue;
        }

        notifications.push({
            userId: user._id,
            title,
            message,
            type,
            link,
            metadata
        });

        if (user.email) {
            try {
                await transporter.sendMail({
                    from: `"M&RC Travel and Tours" <${process.env.SENDER_EMAIL}>`,
                    to: user.email,
                    subject: emailSubject,
                    html: emailHtml(user)
                });
            } catch (emailError) {
                console.error("Failed to send wishlist notification email:", emailError);
            }
        }
    }

    if (notifications.length) {
        await NotificationModel.insertMany(notifications);
    }
};


//ADD PACKAGE
const addPackage = async (req, res) => {
    const { name, code, pricePerPax, soloRate, childRate, infantRate, deposit, availableSlots, description, packageType, dateRanges, duration, hotels, airlines, termsAndConditions, inclusions, exclusions, itineraries, images, tags, visaRequired } = req.body;
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
            packageTags: tags,
            visaRequired: visaRequired,
            images: images || []
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


//GET PACKAGES (ADMIN)
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

//GET ARCHIVED PACKAGES (ADMIN)
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

//RESTORE PACKAGE (ADMIN)
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

const getPackage = async (req, res) => {
    try {
        const { id } = req.params;
        const pkg = await PackageModel.findById(id);


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
            packageHotels: pkg.packageHotels,
            packageAirlines: pkg.packageAirlines,
            packageInclusions: pkg.packageInclusions,
            packageExclusions: pkg.packageExclusions,
            packageTermsConditions: pkg.packageTermsConditions,
            packageItineraries: pkg.packageItineraries,
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

const updatePackage = async (req, res) => {
    const { id } = req.params;

    try {
        const existingPackage = await PackageModel.findById(id);
        if (!existingPackage) {
            return res.status(404).json({ message: "Package not found" });
        }

        const previousSlots = sumSlots(existingPackage.packageSpecificDate || []);
        const updatedSlots = sumSlots(req.body.dateRanges || []);

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
                packageSpecificDate: (req.body.dateRanges || []).map(range => ({
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
                packageTags: req.body.tags,
                visaRequired: req.body.visaRequired,
                images: req.body.images || []
            },
            { new: true }
        );

        if (previousSlots <= 0 && updatedSlots > 0) {
            await notifyWishlistUsers({
                packageId: updatedPackage._id,
                title: "Package is Now Available",
                message: `${updatedPackage.packageName} is now available for booking.`,
                type: "wishlist",
                link: '/package',
                metadata: {
                    availability: "available",
                    routeState: {
                        packageCode: updatedPackage.packageCode,
                        packageId: updatedPackage._id
                    }
                },
                emailSubject: `Now Available: ${updatedPackage.packageName}`,
                emailHtml: (user) => `
                    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
                        <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                            <img src="https://mrctravelandtours.com/images/Logo.png" style="width:100px; margin-bottom:15px;" />

                            <h2 style="color:#305797; margin-bottom:10px;">Package is Now Available</h2>
                            <p style="color:#555; font-size:16px;">Hello <b>${user.username || "Customer"}</b>,</p>
                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>${updatedPackage.packageName}</b> is now available for booking.
                            </p>
                            <a href="${FRONTEND_URL}/package/${updatedPackage._id}" style="display:inline-block; margin-top:16px; padding:10px 18px; background:#305797; color:#fff; text-decoration:none; border-radius:6px;">
                                View Package
                            </a>
                            <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />

                            <div style="max-width:520px; margin:auto; padding:15px; text-align:center; color:#555; font-size:12px;">
                                <p style="font-size:10px; margin-bottom:5px;">This is an automated message, please do not reply.</p>
                                <p>M&RC Travel and Tours</p>
                                <p>support@mrctravelandtours.com</p>
                                <p>&copy; ${new Date().getFullYear()} M&RC Travel and Tours. All rights reserved.</p>
                            </div>
                        </div>
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

const updateSlots = async (req, res) => {
    const slotsPayload = req.body;
    const packageCode = slotsPayload.packageItem || slotsPayload.packageCode || slotsPayload.packageId;
    const dateRanges = Array.isArray(slotsPayload.dateRanges)
        ? slotsPayload.dateRanges
        : [];

    try {
        const pkg = await findPackageByCodeParam(packageCode);
        if (!pkg) {
            return res.status(404).json({ message: "Package not found" });
        }

        const previousSlots = sumSlots(pkg.packageSpecificDate || []);
        const updatedSlots = sumSlots(dateRanges || []);

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

        if (previousSlots <= 0 && updatedSlots > 0) {
            await notifyWishlistUsers({
                packageId: pkg._id,
                title: "Package is Now Available",
                message: `${pkg.packageName} is now available for booking.`,
                type: "wishlist",
                link: '/package',
                metadata: {
                    availability: "available",
                    routeState: {
                        packageCode: pkg.packageCode,
                        packageId: pkg._id
                    }
                },
                emailSubject: `Now Available: ${pkg.packageName}`,
                emailHtml: (user) => `
                    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
                        <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                            <h2 style="color:#305797; margin-bottom:10px;">Package is Now Available</h2>
                            <p style="color:#555; font-size:16px;">Hello <b>${user.username || "Customer"}</b>,</p>
                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>${pkg.packageName}</b> is now available for booking.
                            </p>
                            <a href="${FRONTEND_URL}/package/${pkg._id}" style="display:inline-block; margin-top:16px; padding:10px 18px; background:#305797; color:#fff; text-decoration:none; border-radius:6px;">
                                View Package
                            </a>
                            <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
                            <p style="color:#aaa; font-size:12px;">© ${new Date().getFullYear()} M&RC Travel and Tours</p>
                        </div>
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
                        packageCode: pkg.packageCode,
                        packageId: pkg._id
                    }
                },
                emailSubject: `Discount Alert: ${pkg.packageName}`,
                emailHtml: (user) => `
                    <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
                        <div style="max-width:520px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 4px 10px rgba(0,0,0,0.05);">
                            <h2 style="color:#305797; margin-bottom:10px;">Package Discount Available</h2>
                            <p style="color:#555; font-size:16px;">Hello <b>${user.username || "Customer"}</b>,</p>
                            <p style="color:#555; font-size:15px; line-height:1.6;">
                                <b>${pkg.packageName}</b> now has a <b>${parsedDiscount}%</b> discount.
                            </p>
                            <a href="${FRONTEND_URL}/package/${pkg._id}" style="display:inline-block; margin-top:16px; padding:10px 18px; background:#305797; color:#fff; text-decoration:none; border-radius:6px;">
                                View Package
                            </a>
                            <hr style="margin:30px 0; border:none; border-top:1px solid #eee;" />
                            <p style="color:#aaa; font-size:12px;">© ${new Date().getFullYear()} M&RC Travel and Tours</p>
                        </div>
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

module.exports = { addPackage, getPackages, getArchivedPackages, restoreArchivedPackage, getPackagesForUsers, removePackage, getPackage, updatePackage, getPopularPackages, updateSlots, updateDiscount };