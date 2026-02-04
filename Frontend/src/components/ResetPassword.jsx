import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { Input, Button, Modal } from 'antd';
import '../style/resetpasswordpage.css'
import '../style/newpasswordpage.css'
import axiosInstance from '../config/axiosConfig';
import LoadingScreen from './LoadingScreen';


export default function ResetPassword() {

    const [isOTPValid, setIsOTPValid] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [resetToken, setResetToken] = useState("")
    const [timer, setTimer] = useState(0)
    const [errorOTP, setErrorOTP] = useState("")
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

    useEffect(() => {
        let interval = null
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [timer])


    const navigate = useNavigate();

    const [getOTP, setOTP] = useState("")
    const [getEmail, setEmail] = useState("")
    const [errorEmail, setErrorEmail] = useState('');

    //reset password function
    const resetPassword = async (e) => {
        e.preventDefault()
        setIsLoading(true);
        try {
            await axiosInstance.post('/auth/send-reset-otp', { email: getEmail })
            setIsLoading(false);
            console.log(getEmail)
            showModal()
            setTimer(60)
        } catch (err) {
            setIsLoading(false);
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            setErrorEmail(errorMsg)
        }
    }

    //submit OTP function
    const submitOTP = async (e) => {
        e.preventDefault()
        setIsLoading(true);
        try {
            const response = await axiosInstance.post('/auth/check-reset-otp', { email: getEmail, otp: getOTP })
            if (response.data.success || response.status === 200) {
                setResetToken(response.data.resetToken)
                setIsLoading(false);
                setIsModalOpen(false)
                setIsOTPValid(true)
                setOTP("")
            }
        } catch (err) {
            setIsLoading(false);
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            setErrorOTP(errorMsg)
        }
    }

    //resent OTP function
    const resendOTP = async (e) => {
        e.preventDefault()
        try {
            await axiosInstance.post('/auth/send-reset-otp', { email: getEmail })
            setTimer(60)
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
        }
    }

    //go to login page
    const goToLogin = (e) => {
        e.preventDefault();
        navigate('/login');
    }

    const [values, setValues] = useState({
        password: '',
        confirmPassword: ''
    })
    const [error, setError] = useState({
        password: '',
        confirmPassword: ''
    })

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleOk = () => {
        setErrorOTP("")
        setIsModalOpen(false);
    };

    const handleCancel = () => {
        setErrorOTP("")
        setIsModalOpen(false);
    };

    const handleSuccessOk = () => {
        setIsSuccessModalOpen(false);
        navigate('/login');
    };

    const handleSuccessCancel = () => {
        setIsSuccessModalOpen(false);
    };

    //password validations
    const validate = (field, value) => {
        if (field === "password") {
            if (value === "") {
                return "Password is required."
            }
            if (value.length < 8) {
                return "Password must be at least 8 characters."
            }
            if (!/\d/.test(value)) {
                return "Password must have at least one number."
            }
            if (!/[A-Z]/.test(value)) {
                return "Password must have at least one uppercase character."
            }
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
                return "Password must have at least contain one special character."
            }
        }

        if (field === "confirmPassword") {
            if (value === "") {
                return "Confirm Password is required."
            }
            if (value !== values.password) {
                return "Password and Confirm password does not match"
            }
        }
        return ""
    }

    const valueHandler = (field, value) => {
        setValues({ ...values, [field]: value })
        setError({ ...error, [field]: validate(field, value) })
    }

    //submit new password function
    const submitNewPassword = async (e) => {
        e.preventDefault()
        setIsLoading(true);
        if (error.password !== "") {
            setIsLoading(false);
            return console.log("Inputs are invalid!")
        }

        try {
            const response = await axiosInstance.post('/auth/reset-password', { newPassword: values.password, token: resetToken })
            if (response.data.success || response.status === 200) {
                setIsLoading(false);
                setIsSuccessModalOpen(true);
            }
        } catch (err) {
            setIsLoading(false);
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
        }
    }

    return (
        <div>
            {isOTPValid ?
                <div className='newpassword-page-container'>
                    <div className='newpassword-left-side'>
                        <form onSubmit={submitNewPassword}>
                            <div>
                                <h1 className='newpassword-heading'>Set New Password</h1>
                                <h4 className='newpassword-secondary-heading'>Enter New Password</h4>
                            </div>

                            <div className='div-input-fields'>
                                <label className='newpassword-labels' htmlFor="password">Password</label>
                                <Input.Password value={values.password} maxLength={16} onChange={(e) => valueHandler("password", e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                    if (e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} type="password" id="password" name="password" className='newpassword-input-fields' required />
                            </div>

                            <p id='error-message'>{error.password}</p>

                            <div className='div-input-fields'>
                                <label className='newpassword-labels' htmlFor="confirmPassword">Confirm Password</label>
                                <Input.Password value={values.confirmPassword} maxLength={16} onChange={(e) => valueHandler("confirmPassword", e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                    if (e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} type="password" id="confirmPassword" name="confirmPassword" className='newpassword-input-fields' required />
                            </div>

                            <p id='error-message'>{error.confirmPassword}</p>

                            <div id='newpassword-links-container'>
                                <Button className='newpassword-button-links' type='link' onClick={goToLogin}>Remembered your password? Go to Login</Button>
                            </div>

                            <Button id='newpassword-button' htmlType='submit'> Reset Password </Button>
                        </form>
                    </div>

                    <div className='newpassword-right-side'>
                    </div>
                </div>

                :

                <div className='resetpassword-page-container'>
                    <div className='resetpassword-left-side'>
                        <form onSubmit={resetPassword}>

                            <div>
                                <h1 className='resetpassword-heading'>Reset Password</h1>
                                <h4 className='resetpassword-second-heading'>Enter Email to Reset Password</h4>
                            </div>

                            <div className='resetpassword-div-input-fields'>
                                <label className='labels' htmlFor="email">Email</label>
                                <Input status={errorEmail ? "error" : ""} value={getEmail} maxLength={40} onChange={(e) => setEmail(e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                    if (e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} type="email" id="email" name="email" className='input-fields' required />
                            </div>

                            <p id='error-message'>{errorEmail}</p>

                            <div id='resetpassword-links-container'>
                                <Button className='resetpassword-button-links' type='link' onClick={goToLogin}>Remembered your password? Go to Login</Button>
                            </div>

                            <Button id='resetpassword-button' htmlType="submit">Reset Password</Button>
                        </form>

                    </div>

                    <div className='resetpassword-right-side'>
                    </div>
                </div>
            }


            <Modal
                open={isModalOpen}
                className='resetpassword-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onOk={handleOk}
                onCancel={handleCancel}
            >

                <div className='resetpassword-container-modal'>
                    <h1 className='resetpassword-heading-modal'>Verify OTP</h1>
                    <p className='resetpassword-secondary-heading-modal'>We've sent a verification code to your <span style={{ color: "#992A46" }}>Email</span></p>

                    <form onSubmit={submitOTP}>
                        <Input.OTP status={errorOTP ? "error" : ""} value={getOTP} maxLength={6} onChange={setOTP} onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="tel" id="enterOTP" name="enterOTP" className='input-fields-modal' required />

                        <p id='error-message-modal'>{errorOTP}</p>

                        <Button id='submit-otp-button' htmlType="submit">Submit</Button>
                    </form>

                    {
                        timer > 0 ? <p id='footer-text-modal'> Wait for <span style={{ color: "#992A46" }}>{timer}</span> sec to send OTP again </p>
                            :
                            <p id='footer-text-modal'>Didn't get the code? <Button className='resetpassword-button-links-modal' type='link' onClick={resendOTP}>Click here</Button></p>
                    }
                </div>
            </Modal>

            <Modal
                open={isSuccessModalOpen}
                className='resetpassword-success-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onOk={handleSuccessOk}
                onCancel={handleSuccessCancel}
            >
                <div className='resetpassword-success-container'>
                    <h1 className='resetpassword-success-heading'>Password Changed</h1>
                    <p className='resetpassword-success-text'>Your password has been updated successfully.</p>

                    <Button id='resetpassword-success-button' onClick={handleSuccessOk}>Continue</Button>
                </div>
            </Modal>

            <LoadingScreen isVisible={isLoading} />
        </div>
    )
}
