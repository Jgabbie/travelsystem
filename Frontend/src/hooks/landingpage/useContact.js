import { useState } from 'react';
import { sendContactService } from '../../services/landingpage/contactService';

export const useContact = () => {
    const [loading, setLoading] = useState(false);

    const sendMessage = async (data, onSuccess, onError) => {
        setLoading(true);
        try {
            await sendContactService(data);
            onSuccess?.();
        } catch (err) {
            onError?.();
        } finally {
            setLoading(false);
        }
    };

    return { sendMessage, loading };
};