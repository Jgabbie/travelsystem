const PackageModel = require("../models/package");
const BookingModel = require("../models/booking");
const logAction = require("../utils/logger");
const dayjs = require("dayjs");

const addPackage = async (req, res) => {
    const { name, code, pricePerPax, soloRate, childRate, infantRate, deposit, availableSlots, description, packageType, dateRanges, duration, hotels, airlines, termsAndConditions, inclusions, exclusions, itineraries, images, tags } = req.body;
    try {

        if (name === null || code === null || pricePerPax === null || availableSlots === null || description === null || packageType === null || duration === null || hotels === null || airlines === null || termsAndConditions === null || inclusions === null || exclusions === null || itineraries === null || tags === null) {
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
            images: images || []
        });

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        await logAction(
            "PACKAGE_CREATED",
            req.userId || null,
            {
                packageId: newPackage._id,
                packageCode: newPackage.packageCode,
                packageName: newPackage.packageName,
                pricePerPax: newPackage.packagePricePerPax,
                availableSlots: newPackage.packageAvailableSlots,
                description: newPackage.packageDescription,
                packageType: newPackage.packageType,
                duration: newPackage.packageDuration,
                dateRanges: newPackage.packageSpecificDate,
                hotels: newPackage.packageHotels,
                airlines: newPackage.packageAirlines,
                termsAndConditions: newPackage.packageTermsConditions,
                inclusions: newPackage.packageInclusions,
                exclusions: newPackage.packageExclusions,
                itineraries: newPackage.packageItineraries,
                tags: newPackage.packageTags,
                images: newPackage.images || []
            },
            ip
        );

        res.status(201).json({ message: "Package created successfully", package: newPackage });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const getPackages = async (req, res) => {
    try {
        const packages = await PackageModel.find();
        res.status(200).json(packages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const removePackage = async (req, res) => {
    const { id } = req.params;
    try {
        const deletedPackage = await PackageModel.findByIdAndDelete(id);
        if (!deletedPackage) {
            return res.status(404).json({ message: "Package not found" });
        }
        res.status(200).json({ message: "Package removed successfully", package: deletedPackage });
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

        // send everything as-is
        res.status(200).json(pkg);
    } catch (err) {
        console.error("getPackage error:", err);
        res.status(500).json({ error: err.message });
    }
};

const updatePackage = async (req, res) => {
    const { id } = req.params;

    try {
        const updatedPackage = await PackageModel.findByIdAndUpdate(
            id,
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
                images: req.body.images || []
            },
            { new: true }
        );

        if (!updatedPackage) {
            return res.status(404).json({ message: "Package not found" });
        }

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

        res.status(200).json(
            popularPackages.map((entry) => ({
                ...entry.package,
                bookingCount: entry.bookingCount
            }))
        );
    } catch (err) {
        console.error('getPopularPackages error:', err);
        res.status(500).json({ error: err.message });
    }
};

const updateSlots = async (req, res) => {
    const slotsPayload = req.body;
    const packageId = slotsPayload.packageId;
    const dateRanges = Array.isArray(slotsPayload.dateRanges)
        ? slotsPayload.dateRanges
        : [];

    try {
        const pkg = await PackageModel.findById(packageId);
        if (!pkg) {
            return res.status(404).json({ message: "Package not found" });
        }

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

        res.status(200).json({ message: "Slots updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

const updateDiscount = async (req, res) => {
    const { packageId, discountPercent } = req.body;
    const parsedDiscount = Number(discountPercent);

    if (!packageId) {
        return res.status(400).json({ message: "Package id is required" });
    }

    if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
        return res.status(400).json({ message: "Discount percent must be between 0 and 100" });
    }

    try {
        const pkg = await PackageModel.findByIdAndUpdate(
            packageId,
            { packageDiscountPercent: parsedDiscount },
            { new: true }
        );

        if (!pkg) {
            return res.status(404).json({ message: "Package not found" });
        }

        res.status(200).json({ message: "Discount updated successfully", package: pkg });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = { addPackage, getPackages, removePackage, getPackage, updatePackage, getPopularPackages, updateSlots, updateDiscount };