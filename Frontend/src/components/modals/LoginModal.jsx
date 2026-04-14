import React, { useEffect, useState } from 'react'
import { Button, Modal, Input, Spin, ConfigProvider, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import '../../style/components/modals/loginmodal.css';
import '../../style/components/modals/emailverifymodal.css';
import { useAuth } from '../../hooks/useAuth';
import apiFetch from '../../config/fetchConfig';


export default function LoginModal({ isOpenLogin, isCloseLogin, onLoginSuccess, onOpenSignup }) {

    const navigate = useNavigate();
    const { setAuth } = useAuth();

    const [values, setValues] = useState({
        username: '',
        password: ''
    });

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isOTPModalVisible, setIsOTPModalVisible] = useState(false)
    const [email, setEmail] = useState('');

    const [timer, setTimer] = useState(0)
    const [errorOTP, setErrorOTP] = useState("")
    const [getOTP, setOTP] = useState("")
    const [isVerifiedModalOpen, setIsVerifiedModalOpen] = useState(false)

    //start timer when OTP modal opens
    useEffect(() => {
        if (isOTPModalVisible) {
            setTimer(60);
        }
    }, [isOTPModalVisible]);

    //decrease timer every second until it reaches 0
    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);



    //clear form function
    const clearForm = () => {
        setValues({
            username: '',
            password: ''
        });
        setError('');
        setIsOTPModalVisible(false);
        setOTP("");
        setErrorOTP("");
        isCloseLogin();
    }

    //login function
    const handleLogin = async (e) => {
        e.preventDefault();

        setIsLoading(true);
        try {
            const response = await apiFetch('/auth/loginUser', {
                method: 'POST',
                body: JSON.stringify({ username: values.username, password: values.password })
            });

            console.log("Login response:", response);

            if (response) {
                if (onLoginSuccess) {
                    const userData = response.user;
                    const userRole = userData?.role;
                    console.log("userRole:", userRole)
                    setIsLoading(false);

                    if (userData) {
                        setAuth({ id: userData.id, username: userData.username, role: userData.role, loginOnce: userData.loginOnce });
                    }

                    message.success('Login successful');
                    if (userRole === 'Admin') {
                        navigate('/dashboard')
                    } else if (userRole === 'Employee') {
                        navigate('/employee/dashboard')
                    } else if (userData && !userData.loginOnce) {
                        navigate('/user-preferences')
                    } else {
                        navigate('/home')
                    }

                    isCloseLogin()
                    onLoginSuccess()
                    clearForm()
                }

                setIsLoading(false);
            }

        } catch (err) {

            const status = err.status;
            const data = err.data;

            if (status === 403) {
                try {
                    const email = data.email
                    await apiFetch('/auth/send-verify-otp', {
                        method: 'POST',
                        body: JSON.stringify({ email: email })
                    })
                    setEmail(email)
                    setIsLoading(false);
                    setIsOTPModalVisible(true)
                    return
                } catch (error) {
                    const errorMsg = error.data?.message || "Verification failed"
                    console.error("Error: ", errorMsg)
                    setError(errorMsg)
                    setIsLoading(false);
                    return
                }
            }
            const errorMsg = err.data?.message || 'Login failed';
            console.error("Error: ", errorMsg)
            setError(errorMsg)
            message.error(errorMsg);
            setIsLoading(false);
        }
    }

    //submit OTP for verification
    const submitOTP = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await apiFetch('/auth/verify-account', {
                method: 'POST',
                body: JSON.stringify({ otp: getOTP, email: email, username: values.username, password: values.password })
            });

            if (response?.user || response?.accessToken || response?.message) {
                setOTP("");
                setIsOTPModalVisible(false);
                setIsVerifiedModalOpen(false);

                try {
                    const loginResponse = await apiFetch('/auth/loginUser', {
                        method: 'POST',
                        body: JSON.stringify({ username: values.username, password: values.password })
                    });

                    const userData = loginResponse.user;
                    if (userData) {
                        setAuth({ id: userData.id, username: userData.username, role: userData.role, loginOnce: userData.loginOnce });

                        if (userData.role === 'Admin') {
                            navigate('/dashboard');
                        } else if (userData.role === 'Employee') {
                            navigate('/employee/dashboard');
                        } else if (!userData.loginOnce) {
                            navigate('/user-preferences');
                        } else {
                            navigate('/home');
                        }

                        isCloseLogin();
                        onLoginSuccess?.();
                        clearForm();
                    }
                } catch (loginError) {
                    const errorMsg = loginError.data?.message || loginError.message || "Auto login after verification failed";
                    console.error("Auto login after verification failed:", errorMsg);
                    setErrorOTP(errorMsg);
                }
            }
        } catch (err) {
            const errorMsg = err.data?.message || "Verification failed";
            console.error("Error: ", errorMsg);
            setErrorOTP(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }

    //resend OTP and restart timer
    const resendOTP = async (e) => {
        e.preventDefault()
        try {
            await apiFetch('/auth/send-verify-otp', {
                method: 'POST',
                body: JSON.stringify({ email: email })
            })
            alert("OTP sent!")
            setTimer(60)
        } catch (err) {
            const errorMsg = err.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            alert(errorMsg)
        }
    }

    //go to signup page
    const goToSignup = (e) => {
        e.preventDefault();
        if (onOpenSignup) {
            clearForm();
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

    //block clipboard shortcuts, only few shortcuts
    const blockClipboardKeys = (e) => {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;

        if (
            isCtrlOrCmd &&
            ["x", "a"].includes(e.key.toLowerCase())
        ) {
            e.preventDefault();
        }
    };

    //block shortcut keys, all shortcuts
    const blockShortcuts = (e) => {
        e.preventDefault();
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305979',
                }
            }}
        >
            <div>
                <Spin spinning={isLoading} fullscreen size="large" className="app-loading-spin" style={{ zIndex: 2000 }} />
                <Modal
                    open={isOpenLogin}
                    className='login-modal'
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    footer={null}
                    onCancel={clearForm}
                >

                    {isOTPModalVisible ? (
                        <div id='login-container-modal'>
                            <h1 className='emailverify-heading-modal'>Verify OTP</h1>
                            <p className='emailverify-secondary-heading-modal'>We've sent a verification code to your <span style={{ color: "#992A46" }}>Email</span></p>

                            <form onSubmit={submitOTP}>
                                <Input.OTP status={errorOTP ? "error" : ""} value={getOTP} maxLength={6} onChange={setOTP} onKeyDown={(e) => {
                                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} type="tel" id="enterOTP" name="enterOTP" className='emailverify-input-fields-modal' required />

                                <p id='error-message-modal'>{errorOTP}</p>

                                <Button id='emailverify-submit-otp-button' htmlType="submit">Submit</Button>
                            </form>

                            {
                                timer > 0 ? <p id='emailverify-footer-text-modal'> Wait for <span style={{ color: "#992A46" }}>{timer}</span> sec to send OTP again </p>
                                    :
                                    <p className='emailverify-label-links-modal'>Didn't get the code? <Button className='emailverify-button-links-modal' type='link' onClick={(e) => {
                                        resendOTP(e);
                                        setTimer(60);
                                    }}>Click here</Button></p>
                            }
                        </div>
                    ) : (
                        <div id='login-container-modal'>
                            <h1 id='login-heading-modal'>Welcome</h1>
                            <p id='login-secondary-heading-modal'>Login Account</p>

                            <form onCopy={blockShortcuts} onPaste={blockShortcuts} onCut={blockShortcuts} onKeyDown={blockClipboardKeys} onSubmit={handleLogin}>
                                <div className='login-div-input-fields-modal'>
                                    <label className='login-labels-modal' htmlFor="username">Username</label>
                                    <Input status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, username: e.target.value })} autoComplete='off' onKeyDown={(e) => {
                                        if (e.key === " " || e.key === "Backspace") {
                                            return;
                                        }

                                        if (!/^[A-Za-z0-9]+$/.test(e.key)) {
                                            e.preventDefault();
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

                    )}
                </Modal>
            </div >
        </ConfigProvider>
    )
}
