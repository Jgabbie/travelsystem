export const mapPackage = (pkg) => ({
    id: pkg._id,
    packageName: pkg.packageName,
    packageDescription: pkg.packageDescription,
    image: Array.isArray(pkg.images) && pkg.images.length > 0
        ? pkg.images[0]
        : '',
    bookingCount: pkg.bookingCount || 0,
    packageType: pkg.packageType
});