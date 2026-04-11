import { useState, useEffect } from 'react';
import { authService } from '../../services/signup/authService';

export const useSignup = () => {
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const checkField = async (field, value) => {
        if (!value) return;

        const message = await authService.checkDup(field, value);

        setErrors((prev) => ({
            ...prev,
            [field]: message || ''
        }));
    };

    const signup = async (values) => {
        setLoading(true);
        try {
            const data = await authService.signup(values);
            return data;
        } finally {
            setLoading(false);
        }
    };

    return { errors, loading, signup, checkField, setErrors };
};