import React, { useEffect, useState } from 'react'
import { Button, Modal, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function EmailVerifyModal({ isOpenOTPModal, isCloseOTPModal, userEmail }) {

    const navigate = useNavigate();

    const [timer, setTimer] = useState(0)
    const [errorOTP, setErrorOTP] = useState("")
    const [getOTP, setOTP] = useState("")

    useEffect(() => {
        if (isOpenOTPModal) {
            setTimer(60)
        }
    }, [isOpenOTPModal])

    useEffect(() => {
        let interval = null
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [timer])

    const submitOTP = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/verify-account', { otp: getOTP, email: userEmail }, { withCredentials: true })

            if (response.data.success || response.status === 200) {
                setOTP("")
                isCloseOTPModal()
                alert("Account has been verified")
                navigate('/home')
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
            const response = await axios.post('http://localhost:8000/api/auth/send-verify-otp', { email: userEmail })
            alert("OTP sent!")
            setTimer(60)
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            alert(errorMsg)
        }
    }

    return (
        <div>
            <Modal
                open={isOpenOTPModal}
                className='resetpassword-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onCancel={() => {
                    setErrorOTP("")
                    setOTP("")
                    isCloseOTPModal()
                }}
            >

                <div id='resetpassword-container-modal'>
                    <h1 id='heading-modal'>Verify OTP</h1>
                    <p id='secondary-heading-modal'>We've sent a verification code to your <span style={{ color: "#992A46" }}>Email</span></p>

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
                            <p className='label-links-modal'>Didn't get the code? <Button className='button-links-modal' type='link' onClick={resendOTP}>Click here</Button></p>
                    }
                </div>

            </Modal>
        </div >
    )
}
