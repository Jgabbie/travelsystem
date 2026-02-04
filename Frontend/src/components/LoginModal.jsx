import React, { useEffect, useState } from 'react'
import { Button, Modal, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import '../style/loginmodal.css';
import EmailVerifyModal from './EmailVerifyModal';
import LoadingScreen from './LoadingScreen';
import { useAuth } from '../hooks/useAuth';
import axiosInstance from '../config/axiosConfig';

export default function LoginModal({ isOpenLogin, isCloseLogin, onLoginSuccess, onOpenSignup }) {

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
    const [showPassword, setShowPassword] = useState(false);

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

    //clear forms
    const clearForms = () => {
        setValues({
            username: '',
            password: ''
        })
        setError("")
        setShowPassword(false);
        isCloseLogin()
    }

    //go to signup page
    const goToSignup = (e) => {
        e.preventDefault();
        if (onOpenSignup) {
            clearForms();
            isCloseLogin();
            onOpenSignup();
            return;
        }
    }

    //go to reset password page
    const resetPassword = (e) => {
        e.preventDefault();
        navigate('/reset-password');
    }

    const blockClipboardKeys = (e) => {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;

        if (
            isCtrlOrCmd &&
            ["c", "v", "x", "a"].includes(e.key.toLowerCase())
        ) {
            e.preventDefault();
        }
    };

    const blockShortcuts = (e) => {
        e.preventDefault();
    };

    return (
        <div>
            <LoadingScreen isVisible={isLoading} message="Logging in..." onComplete={() => console.log("Loading complete")} />


            <Modal
                open={isOpenLogin}
                className='login-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onCancel={clearForms}
            >

                <div id='login-container-modal'>
                    <h1 id='login-heading-modal'>Welcome</h1>
                    <p id='login-secondary-heading-modal'>Login Account</p>

                    <form onCopy={blockShortcuts} onPaste={blockShortcuts} onCut={blockShortcuts} onKeyDown={blockClipboardKeys} onSubmit={handleLogin}>
                        <div className='login-div-input-fields-modal'>
                            <label className='login-labels-modal' htmlFor="username">Username</label>
                            <Input status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, username: e.target.value })} autoComplete='off' onKeyDown={(e) => {
                                if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.username} type="text" id="username" name="username" className='login-input-fields-modal' required />
                        </div>

                        <div className='login-div-input-fields-modal'>
                            <label className='login-labels-modal' htmlFor="password">Password</label>
                            <Input.Password status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, password: e.target.value })} autoComplete='off' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} visibilityToggle={{ visible: showPassword, onVisibleChange: setShowPassword }} key={isOpenLogin ? "" : false} value={values.password} type="password" id="password" name="password" className='login-input-fields-modal' required />
                        </div>

                        <p id='login-error-message-modal'>{error}</p>

                        <div id='login-links-container-modal'>
                            <Button className='login-button-links-modal' type="link" onClick={goToSignup}>Need an Account? Signup here</Button>
                            <Button className='login-button-links-modal' type="link" onClick={resetPassword} > Forgot your Password?</Button>
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


        </div >
    )
}
