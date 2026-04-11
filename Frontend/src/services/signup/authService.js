import { signupUser, checkDuplicates } from '../../api/signup/authApi';

export const authService = {
    async signup(values) {
        const res = await signupUser(values);
        return res.data;
    },

    async checkDup(field, value) {
        try {
            await checkDuplicates({ [field]: value });
            return null;
        } catch (err) {
            return err?.response?.data?.message || 'Duplicate error';
        }
    }
};