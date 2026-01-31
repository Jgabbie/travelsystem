import axiosInstance from '../config/axiosConfig';
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button } from 'antd';
import { useAuth } from '../hooks/useAuth';
import EmailVerifyModal from '../components/EmailVerifyModal';
import LoadingScreen from '../components/LoadingScreen';
import '../style/loginpage.css'

export default function LoginPage() {

    const navigate = useNavigate();
    const { setAuth } = useAuth();

    const [email, setEmail] = useState('');
    const [isOTPModalVisible, setIsOTPModalVisible] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [values, setValues] = useState({
        username: '',
        password: ''
    });


    //clear form function
    const clearForm = () => {
        setValues({
            username: '',
            password: ''
        });
        setError('');
    }

    //login function
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await axiosInstance.post(
                '/auth/loginUser',
                { username: values.username, password: values.password },
            );
            const userRole = response.data.user?.role;

            console.log("userRole:", userRole)

            setIsLoading(false);

            setAuth({ username: values.username, role: userRole });
            if (userRole === 'Admin') {
                navigate('/dashboard')
            } else {
                navigate('/home')
            }

        } catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;
            if (status === 403) {
                const email = data.email
                await axiosInstance.post('auth/send-verify-otp', { email: email })
                setValues({
                    username: '',
                    password: ''
                })
                setEmail(email)
                setIsLoading(false)
                setIsOTPModalVisible(true)
                return
            } else {
                setIsLoading(false)
                setError(data.message || 'Login failed. Please try again.');
            }
        }
    }

    //go to signup page
    const goToSignup = (e) => {
        e.preventDefault();
        navigate('/signup');
    }

    //go to reset password page
    const resetPassword = (e) => {
        e.preventDefault();
        navigate('/reset-password');
    }

    return (
        <div className='login-page-container'>
            <div className='login-left-side'>
                <form method='post' onSubmit={handleLogin}>

                    <div id='heading-div'>
                        <h1 className='login-heading'>Welcome</h1>
                        <h4 className='login-secondary-heading'>Login Account</h4>
                    </div>

                    <div className='div-input-fields'>
                        <label className='labels' htmlFor="username">Username</label>
                        <Input status={error ? "error" : ""} value={values.username} maxLength={20} onChange={(e) => setValues({ ...values, username: e.target.value })} autoComplete='off' placeholder='Enter your Username' onKeyDown={(e) => {
                            if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="text" id="username" name="username" className='input-fields-login' required />
                    </div>

                    <div className='div-input-fields'>
                        <label className='labels' htmlFor="password">Password</label>
                        <Input.Password status={error ? "error" : ""} value={values.password} maxLength={20} onChange={(e) => setValues({ ...values, password: e.target.value })} autoComplete='off' placeholder='Enter your Password' onKeyDown={(e) => {
                            if (e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="password" id="password" name="password" className='input-fields-login' required />
                    </div>

                    <p id='error-message' style={{ height: 12 }}>{error}</p>

                    <div className='links-container-login'>
                        <p className='label-links-login'>Need an Account?<Button className='button-links-login' type="link" onClick={goToSignup}>Signup here</Button></p>
                        <p className='label-links-login'>Forget your<Button className='button-links-login' type="link" onClick={resetPassword}>Password?</Button></p>
                    </div>

                    <Button id='login-button' htmlType="submit">Login</Button>
                </form>
            </div>

            <div className='login-right-side'>
            </div>

            <EmailVerifyModal
                isOpenOTPModal={isOTPModalVisible}
                isCloseOTPModal={() => setIsOTPModalVisible(false)}
                userEmail={email}
            />

            <LoadingScreen isVisible={isLoading} />
        </div>
    )
}
