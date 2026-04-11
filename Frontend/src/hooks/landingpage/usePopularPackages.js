import { useEffect, useState } from 'react';
import { getPopularPackagesService } from '../../services/landingpage/packageService';

export const usePopularPackages = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await getPopularPackagesService();
                setData(res);
            } catch (err) {
                console.error(err);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetch();
    }, []);

    return { data, loading };
};