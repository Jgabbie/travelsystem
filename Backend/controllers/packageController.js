const PackageModel = require("../models/package");
const logAction = require("../utils/logger");

const addPackage = async (req, res) => {
    const { name, code, pricePerPax, availableSlots, description, packageType, dateRanges, duration, hotels, airlines, addons, termsAndConditions, inclusions, exclusions, itineraries, image } = req.body;
    try {

        if (name === null || code === null || pricePerPax === null || availableSlots === null || description === null || packageType === null || duration === null || hotels === null || airlines === null || addons === null || termsAndConditions === null || inclusions === null || exclusions === null || itineraries === null) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const newPackage = await PackageModel.create({
            packageName: name,
            packageCode: code,
            packagePricePerPax: Number(pricePerPax),
            packageAvailableSlots: Number(availableSlots),
            packageDescription: description,
            packageType: packageType,
            packageDuration: Number(duration),
            packageSpecificDate: (dateRanges || []).map(range => [
                new Date(range[0]),
                new Date(range[1])
            ]),
            packageHotels: hotels,
            packageAirlines: airlines,
            packageAddons: addons,
            packageTermsConditions: termsAndConditions,
            packageInclusions: inclusions,
            packageExclusions: exclusions,
            packageItineraries: itineraries,
            image: image || ''
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
                addons: newPackage.packageAddons,
                termsAndConditions: newPackage.packageTermsConditions,
                inclusions: newPackage.packageInclusions,
                exclusions: newPackage.packageExclusions,
                itineraries: newPackage.packageItineraries,
                image: newPackage.image || ''
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
                packageDuration: Number(req.body.duration),
                packageDescription: req.body.description,
                packageType: req.body.packageType,
                packageSpecificDate: (req.body.dateRanges || []).map(range => [
                    new Date(range[0]),
                    new Date(range[1])
                ]),
                packageHotels: req.body.hotels,
                packageAirlines: req.body.airlines,
                packageAddons: req.body.addons,
                packageInclusions: req.body.inclusions,
                packageExclusions: req.body.exclusions,
                packageTermsConditions: req.body.termsAndConditions,
                packageItineraries: req.body.itineraries,
                image: req.body.image || ''
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


module.exports = { addPackage, getPackages, removePackage, getPackage, updatePackage };