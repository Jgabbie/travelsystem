import { loginUser, sendVerifyOTP, verifyAccount } from '../../api/login/authApi';

export const authService = {
    async login(values) {
        const res = await loginUser(values); //this line calls the loginUser function in authApi, which sends a POST request to the backend with the login credentials. The response from the backend is expected to contain user data if the login is successful.
        return res.data.user;
    },

    async handleUnverified(email) {
        await sendVerifyOTP(email);//this line calls the sendVerifyOTP function in authApi, which sends a POST request to the backend to trigger sending a verification OTP to the user's email. This is typically used when a user tries to log in but their account is not yet verified. The backend will handle sending the OTP to the user's email address.
        return email;
    },

    async verifyAndLogin({ otp, email, values }) {
        await verifyAccount({ //this line calls the verifyAccount function in authApi, which sends a POST request to the backend to verify the user's account using the provided OTP and email. The backend will check if the OTP is correct and if it matches the email address. If the verification is successful, the user's account will be marked as verified in the database.
            otp,
            email,
            username: values.username,
            password: values.password
        });

        // auto login after verification
        const res = await loginUser(values); //run the loginUser function again to log the user in after successful verification. This will return the user data if the login is successful.
        return res.data.user;
    }
};