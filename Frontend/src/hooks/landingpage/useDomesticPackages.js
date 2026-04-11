import { useEffect, useState } from 'react';
import { getDomesticPackagesService } from '../../services/landingpage/packageService';

export const useDomesticPackages = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await getDomesticPackagesService();
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