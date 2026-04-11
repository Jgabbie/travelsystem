import { useState } from 'react';
import { message } from 'antd';
import { authService } from '../../services/login/authService';
import { getRedirectPath } from '../../utils/login/authUtils';

export const useLogin = ({ setAuth, navigate, onLoginSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [otpError, setOtpError] = useState('');
    const [email, setEmail] = useState('');
    const [isOTPModalVisible, setIsOTPModalVisible] = useState(false);

    const handleLogin = async (values) => {
        setIsLoading(true);
        try {
            const user = await authService.login(values); //this line calls the login function in authService, which sends a POST request to the backend with the login credentials. If the login is successful, it returns the user data.

            setAuth(user);
            message.success('Login successful');

            navigate(getRedirectPath(user));
            onLoginSuccess?.();
            return true;

        } catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;

            if (status === 403) {//status code 403 means not verified
                const email = await authService.handleUnverified(data.email);//this line calls the handleUnverified function in authService, which sends a POST request to the backend to trigger sending a verification OTP to the user's email. This is typically used when a user tries to log in but their account is not yet verified. The backend will handle sending the OTP to the user's email address.
                setEmail(email);
                setIsOTPModalVisible(true);
                return false;
            }

            const msg = data?.message || 'Login failed';
            setError(msg);
            message.error(msg);
            return false;

        } finally {
            setIsLoading(false);
        }
    };

    const submitOTP = async ({ otp, values }) => {
        try {
            const user = await authService.verifyAndLogin({ //this line calls the verifyAndLogin function in authService, which first verifies the user's account using the provided OTP and email. If the verification is successful, it then automatically logs the user in by calling the login function again. The result is the user data if both verification and login are successful.
                otp,
                email,
                values //username and password from the login form
            });

            setAuth(user); // Set the authenticated user in the global state
            setIsOTPModalVisible(false); // Close the OTP modal

            navigate(getRedirectPath(user)); //Redirects the user to the proper page based on their role
            onLoginSuccess?.(); //call on loginSuccess to close the login modal
            return true;

        } catch (err) {
            setOtpError(err.response?.data?.message || 'Verification failed');
            return false;
        }
    };

    const resendOTP = async () => {
        try {
            await authService.handleUnverified(email);
            message.success('OTP sent');
        } catch (err) {
            setOtpError(err.response?.data?.message || 'Verification failed');
        }
    };

    const resetLoginState = () => {
        setError('');
        setOtpError('');
        setIsOTPModalVisible(false);
    };

    return {
        isLoading,
        error,
        otpError,
        email,
        isOTPModalVisible,
        handleLogin,
        submitOTP,
        resendOTP
    };
};