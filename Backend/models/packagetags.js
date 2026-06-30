import mongoose from "mongoose";

const packageTagSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        // Used to prevent duplicates such as "Beach", "beach", and "BEACH"
        normalizedName: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

packageTagSchema.pre("validate", function () {
    if (this.name) {
        this.name = this.name.trim();
        this.normalizedName = this.name.toLowerCase();
    }
});

const PackageTag =
    mongoose.models.PackageTag ||
    mongoose.model("PackageTag", packageTagSchema);

export default PackageTag;