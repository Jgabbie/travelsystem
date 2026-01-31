import React, { useEffect, useState } from 'react'
import { Button, Modal, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import '../style/loginmodal.css';
import EmailVerifyModal from './EmailVerifyModal';
import LoadingScreen from './LoadingScreen';
import { useAuth } from '../hooks/useAuth';
import axiosInstance from '../config/axiosConfig';

export default function LoginModal({ isOpenLogin, isCloseLogin, onLoginSuccess }) {

    const navigate = useNavigate();
    const { setAuth } = useAuth();

    const [isOTPModalVisible, setIsOTPModalVisible] = useState(false)
    const [email, setEmail] = useState('');
    const [values, setValues] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    //clear form function
    const clearForm = () => {
        setValues({
            username: '',
            password: ''
        });
        setError('');
    }

    //clear form when modal is closed
    useEffect(() => {
        if (!isOpenLogin) {
            clearForm();
            setError("")
        }
    }, [isOpenLogin])

    //login function
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axiosInstance.post(
                '/auth/loginUser',
                { username: values.username, password: values.password }
            )
            if (onLoginSuccess) {
                const userRole = response.data.user?.role;

                console.log("userRole:", userRole)

                setIsLoading(false);

                setAuth({ username: values.username, role: userRole });
                if (userRole === 'Admin') {
                    navigate('/dashboard')
                } else {
                    navigate('/home')
                }

                isCloseLogin()
                onLoginSuccess()
                clearForm()
            }

        } catch (err) {
            setIsLoading(false);
            const status = err.response?.status;
            const data = err.response?.data;

            if (status === 403) {
                try {
                    const email = data.email
                    const response = await axiosInstance.post('auth/send-verify-otp', { email: email })
                    setValues({
                        username: '',
                        password: ''
                    })
                    setEmail(email)
                    setIsOTPModalVisible(true)
                    isCloseLogin()
                    return
                } catch (error) {
                    const errorMsg = error.response?.data?.message || "Verification failed"
                    console.error("Error: ", errorMsg)
                    setError(errorMsg)
                }
            }
            const errorMsg = err.response?.data?.message || 'Login failed';
            console.error("Error: ", errorMsg)
            setError(errorMsg)
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
        <div>
            <LoadingScreen isVisible={isLoading} message="Logging in..." onComplete={() => console.log("Loading complete")} />
            <Modal
                open={isOpenLogin}
                className='login-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onCancel={() => {
                    setValues({
                        username: '',
                        password: ''
                    })
                    setError("")
                    isCloseLogin()
                }}
            >

                <div id='login-container-modal'>
                    <h1 id='login-heading-modal'>Welcome</h1>
                    <p id='login-secondary-heading-modal'>Login Account</p>

                    <form onSubmit={handleLogin}>
                        <div className='login-div-input-fields-modal'>
                            <label className='login-labels-modal' htmlFor="username">Username</label>
                            <Input status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, username: e.target.value })} autoComplete='off' placeholder='Enter your Username' onKeyDown={(e) => {
                                if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.username} type="text" id="username" name="username" className='login-input-fields-modal' required />
                        </div>

                        <div className='login-div-input-fields-modal'>
                            <label className='login-labels-modal' htmlFor="password">Password</label>
                            <Input.Password status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, password: e.target.value })} autoComplete='off' placeholder='Enter your Password' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.password} type="password" id="password" name="password" className='login-input-fields-modal' required />
                        </div>

                        <p id='login-error-message-modal'>{error}</p>

                        <div id='login-links-container-modal'>
                            <p className='login-label-links-modal'>Need an Account?<Button className='login-button-links-modal' type="link" onClick={goToSignup}>Signup here</Button></p>
                            <p className='login-label-links-modal'>Forget your<Button className='login-button-links-modal' type="link" onClick={resetPassword}>Password?</Button></p>
                        </div>

                        <Button id='login-button-modal' htmlType="submit">Log in</Button>
                    </form>
                </div>
            </Modal>

            <EmailVerifyModal
                isOpenOTPModal={isOTPModalVisible}
                isCloseOTPModal={() => setIsOTPModalVisible(false)}
                userEmail={email}
            />


        </div>
    )
}
