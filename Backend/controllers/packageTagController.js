import PackageTag from "../models/packagetags.js";

export const normalizePackageTags = (tags = []) => {
    if (!Array.isArray(tags)) return [];

    const uniqueTags = new Map();

    tags.forEach((tag) => {
        const cleanedTag = String(tag || "").trim();

        if (!cleanedTag) return;

        const normalizedName = cleanedTag.toLowerCase();

        // Preserve the first capitalization entered by the user
        if (!uniqueTags.has(normalizedName)) {
            uniqueTags.set(normalizedName, cleanedTag);
        }
    });

    return Array.from(uniqueTags.values());
};

export const saveReusablePackageTags = async (tags = []) => {
    const cleanedTags = normalizePackageTags(tags);

    if (!cleanedTags.length) {
        return [];
    }

    const operations = cleanedTags.map((name) => ({
        updateOne: {
            filter: {
                normalizedName: name.toLowerCase(),
            },
            update: {
                $setOnInsert: {
                    name,
                    normalizedName: name.toLowerCase(),
                },
            },
            upsert: true,
        },
    }));

    try {
        await PackageTag.bulkWrite(operations, {
            ordered: false,
        });
    } catch (error) {
        // Ignore duplicate errors caused by simultaneous requests
        if (error?.code !== 11000) {
            throw error;
        }
    }

    return PackageTag.find({
        normalizedName: {
            $in: cleanedTags.map((tag) => tag.toLowerCase()),
        },
    })
        .sort({ name: 1 })
        .lean();
};

// GET /package-tags
export const getPackageTags = async (req, res) => {
    try {
        const tags = await PackageTag.find()
            .sort({ name: 1 })
            .select("name normalizedName")
            .lean();

        return res.status(200).json({
            success: true,
            tags,
        });
    } catch (error) {
        console.error("Failed to retrieve package tags:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve package tags.",
        });
    }
};

// POST /package-tags
export const createPackageTags = async (req, res) => {
    try {
        const { tags } = req.body;

        const cleanedTags = normalizePackageTags(tags);

        if (!cleanedTags.length) {
            return res.status(400).json({
                success: false,
                message: "At least one valid tag is required.",
            });
        }

        await saveReusablePackageTags(cleanedTags);

        // Return the complete list so the frontend suggestions stay updated
        const allTags = await PackageTag.find()
            .sort({ name: 1 })
            .select("name normalizedName")
            .lean();

        return res.status(200).json({
            success: true,
            message: "Package tags saved successfully.",
            tags: allTags,
        });
    } catch (error) {
        console.error("Failed to save package tags:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to save package tags.",
        });
    }
};