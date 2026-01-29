import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { Input, Button, Modal } from 'antd';
import '../style/resetpasswordpage.css'
import '../style/newpasswordpage.css'


export default function ResetPassword() {

    const [isOTPValid, setIsOTPValid] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [resetToken, setResetToken] = useState("")
    const [timer, setTimer] = useState(0)
    const [errorOTP, setErrorOTP] = useState("")

    useEffect(() => {
        let interval = null
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [timer])

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleOk = () => {
        setIsModalOpen(false);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };


    const navigate = useNavigate();

    const [getOTP, setOTP] = useState("")
    const [getEmail, setEmail] = useState("")
    const [errorEmail, setErrorEmail] = useState('');

    const resetPassword = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/send-reset-otp', { email: getEmail })
            console.log(getEmail)
            showModal()
            setTimer(60)
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            setErrorEmail(errorMsg)
        }
    }

    const submitOTP = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/check-reset-otp', { email: getEmail, otp: getOTP })
            if (response.data.success || response.status === 200) {
                setResetToken(response.data.resetToken)
                alert("OTP for reset password is correct")
                setIsModalOpen(false)
                setIsOTPValid(true)
                setOTP("")
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            setErrorOTP(errorMsg)
        }
    }

    const resendOTP = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/send-reset-otp', { email: getEmail })
            setTimer(60)
            alert("OTP sent!")
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            alert(errorMsg)
        }
    }

    const goToLogin = (e) => {
        e.preventDefault();
        navigate('/login');
    }

    //password validations

    const [values, setValues] = useState({
        password: '',
        confirmPassword: ''
    })
    const [error, setError] = useState({
        password: '',
        confirmPassword: ''
    })

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

    const submitNewPassword = async (e) => {
        e.preventDefault()

        if (error.password !== "") {
            return console.log("Inputs are invalid!")
        }

        try {
            const response = await axios.post('http://localhost:8000/api/auth/reset-password', { newPassword: values.password, token: resetToken })

            if (response.data.success || response.status === 200) {
                alert("Password has been reset successfully")
                navigate('/login')
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            alert(errorMsg)
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
                                <Input value={values.password} maxLength={16} onChange={(e) => valueHandler("password", e.target.value)} autoComplete='off' placeholder='Enter your new password' onKeyDown={(e) => {
                                    if (e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} type="password" id="password" name="password" className='newpassword-input-fields' required />
                            </div>

                            <p id='error-message'>{error.password}</p>

                            <div className='div-input-fields'>
                                <label className='newpassword-labels' htmlFor="confirmPassword">Confirm Password</label>
                                <Input value={values.confirmPassword} maxLength={16} onChange={(e) => valueHandler("confirmPassword", e.target.value)} autoComplete='off' placeholder='Enter confirm password' onKeyDown={(e) => {
                                    if (e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} type="password" id="confirmPassword" name="confirmPassword" className='newpassword-input-fields' required />
                            </div>

                            <p id='error-message'>{error.confirmPassword}</p>

                            <div id='newpassword-links-container'>
                                <p className='newpassword-label-links'>Remember your password?<Button className='newpassword-button-links' type='link' onClick={goToLogin}>Go to Login</Button></p>
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
                                <Input status={errorEmail ? "error" : ""} value={getEmail} maxLength={40} onChange={(e) => setEmail(e.target.value)} autoComplete='off' placeholder='Enter your Email' onKeyDown={(e) => {
                                    if (e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} type="email" id="email" name="email" className='input-fields' required />
                            </div>

                            <p id='error-message'>{errorEmail}</p>

                            <div id='resetpassword-links-container'>
                                <p className='resetpassword-label-links'>Remember your password?<Button className='resetpassword-button-links' type='link' onClick={goToLogin}>Go to Login</Button></p>
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
                            <p className='resetpassword-label-links-modal'>Didn't get the code? <Button className='resetpassword-button-links-modal' type='link' onClick={resendOTP}>Click here</Button></p>
                    }
                </div>
            </Modal>
        </div>
    )
}
