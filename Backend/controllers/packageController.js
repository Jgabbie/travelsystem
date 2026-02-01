const PackageModel = require("../models/package");

const addPackage = async (req, res) => {
    const { name, code, pricePerPax, availableSlots, description, packageType, dateRanges, duration, hotels, airlines, addons, inclusions, exclusions, itineraries } = req.body;
    try {

        const newUser = await PackageModel.create({
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

        res.status(201).json({ message: "Package created successfully", package: newUser });

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