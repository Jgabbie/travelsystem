import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { Input, Button, Modal } from 'antd';
import '../style/resetpasswordpage.css'


export default function ResetPassword() {

    const [isModalOpen, setIsModalOpen] = useState(false);
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
    const [error, setError] = useState('');

    const resetPassword = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/send-reset-otp', { email: getEmail })
            console.log(getEmail)
            showModal()
            setTimer(60)
            //navigate('/reset-password-otp', { state: { email: getEmail } })
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            setError(errorMsg)
        }
    }

    const submitOTP = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/check-reset-otp', { email: getEmail, otp: getOTP })

            if (response.data.success || response.status === 200) {
                alert("OTP for reset password is correct")
                navigate('/set-newpassword', { state: { email: getEmail } })
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
            const response = await axios.post('http://localhost:8000/api/auth/send-verify-otp', { email: getEmail })
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

    return (
        <div id='resetpassword-container'>
            <div id='resetpassword-form'>
                <form onSubmit={resetPassword}>

                    <div id='heading-div'>
                        <h1 id='heading'>Reset Password</h1>
                        <h4 id='second-heading'>Enter Email to Reset Password</h4>
                    </div>

                    <div className='div-input-fields'>
                        <label className='labels' htmlFor="email">Email</label>
                        <Input status={error ? "error" : ""} value={getEmail} maxLength={40} onChange={(e) => setEmail(e.target.value)} autoComplete='off' placeholder='Enter your Email' onKeyDown={(e) => {
                            if (e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="email" id="email" name="email" className='input-fields' required />
                    </div>

                    <p id='error-message'>{error}</p>

                    <div id='links-container'>
                        <p className='label-links'>Remember your password?<Button className='button-links' type='link' onClick={goToLogin}>Go to Login</Button></p>
                    </div>

                    <Button id='resetpassword-button' htmlType="submit">Reset Password</Button>
                </form>
            </div>

            <div id='div-image-banner'>
                <img src='/images/ResetPasswordPage_Banner.png' alt='Banner' id='image-banner' />
            </div>

            <Modal
                open={isModalOpen}
                className='resetpassword-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onOk={handleOk}
                onCancel={handleCancel}
            >

                <div id='resetpassword-container-modal'>
                    <h1 id='heading-modal'>Verify OTP</h1>
                    <p id='secondary-heading-modal'>We've sent a verification code to your <span style={{ color: "#992A46" }}>Email</span></p>
                    <p className='label-links-modal'>Didn't get the code? <Button className='button-links-modal' type='link' onClick={resendOTP}>Click here</Button></p>

                    <form onSubmit={submitOTP}>
                        <Input.OTP status={errorOTP ? "error" : ""} value={getOTP} maxLength={6} onChange={setOTP} onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="tel" id="enterOTP" name="enterOTP" className='input-fields-modal' required />

                        <p id='error-message-modal'>{errorOTP}</p>

                        <Button id='submit-otp-button' htmlType="submit">Submit</Button>
                    </form>

                    <p id='footer-text-modal'> Wait for <span style={{ color: "#992A46" }}>{timer}</span> sec to send OTP again </p>
                </div>

            </Modal>

        </div>
    )
}
