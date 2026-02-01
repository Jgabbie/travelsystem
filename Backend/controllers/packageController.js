const PackageModel = require("../models/package");
const logAction = require("../utils/logger");

const addPackage = async (req, res) => {
    const { name, code, pricePerPax, availableSlots, description, packageType, dateRanges, duration, hotels, airlines, addons, inclusions, exclusions, itineraries } = req.body;
    try {

        const newPackage = await PackageModel.create({
            packageName: name,
            packageCode: code,
            packagePricePerPax: Number(pricePerPax),
            packageAvailableSlots: Number(availableSlots),
            packageDescription: description,
            packageType: packageType,
            packageDuration: Number(duration),
            packageSpecificDate: dateRanges,
            packageHotels: hotels,
            packageAirlines: airlines,
            packageAddons: addons,
            packageInclusions: inclusions,
            packageExclusions: exclusions,
            packageItineraries: itineraries
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
                inclusions: newPackage.packageInclusions,
                exclusions: newPackage.packageExclusions,
                itineraries: newPackage.packageItineraries
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

module.exports = { addPackage, getPackages, removePackage };