import { fetchPopularPackages, fetchAllPackages } from '../../api/landingpage/packageApi';
import { mapPackage } from '../../utils/landingpage/mapPackage';

export const getPopularPackagesService = async () => {
    try {
        const res = await fetchPopularPackages(3);
        const mapped = (res.data || []).map(mapPackage).slice(0, 3);

        if (mapped.length > 0) return mapped;

        // fallback
        const fallbackRes = await fetchAllPackages();
        return (fallbackRes.data || []).slice(0, 3).map(mapPackage);

    } catch {
        const fallbackRes = await fetchAllPackages();
        return (fallbackRes.data || []).slice(0, 3).map(mapPackage);
    }
};

export const getDomesticPackagesService = async () => {
    const res = await fetchAllPackages();

    return (res.data || [])
        .filter(pkg => String(pkg.packageType).toLowerCase() === 'domestic')
        .map(mapPackage);
};