import React, { useEffect, useState } from 'react'
import { Button, Modal, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../style/components/modals/emailverifymodal.css'

export default function EmailVerifyModal({ isOpenOTPModal, isCloseOTPModal, userEmail, userUsername, userPassword }) {

    const navigate = useNavigate();

    const [timer, setTimer] = useState(0)
    const [errorOTP, setErrorOTP] = useState("")
    const [getOTP, setOTP] = useState("")
    const [isVerifiedModalOpen, setIsVerifiedModalOpen] = useState(false)

    //start timer when OTP modal opens
    useEffect(() => {
        if (isOpenOTPModal) {
            setTimer(60)
        }
    }, [isOpenOTPModal])

    //decrease timer every second until it reaches 0
    useEffect(() => {
        let interval = null
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [timer])

    //submit OTP for verification
    const submitOTP = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/verify-account', { otp: getOTP, email: userEmail, username: userUsername, password: userPassword }, { withCredentials: true })

            if (response.data.success || response.status === 200) {
                setOTP("")
                isCloseOTPModal()
                setIsVerifiedModalOpen(true)
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            setErrorOTP(errorMsg)
        }
    }

    //resend OTP and restart timer
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
                className='emailverify-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onCancel={() => {
                    setErrorOTP("")
                    setOTP("")
                    isCloseOTPModal()
                }}
            >

                <div className='emailverify-container-modal'>
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
                            <p className='emailverify-label-links-modal'>Didn't get the code? <Button className='emailverify-button-links-modal' type='link' onClick={resendOTP}>Click here</Button></p>
                    }
                </div>

            </Modal>

            <Modal
                open={isVerifiedModalOpen}
                className='emailverify-success-modal'
                footer={null}
                closable={false}
            >
                <div className='emailverify-container-modal'>
                    <h1 className='emailverify-heading-modal'>Account has been verified</h1>
                    <p className='emailverify-secondary-heading-modal'>You can now proceed to your account.</p>
                    <Button
                        id='emailverify-success-button'
                        onClick={() => {
                            setIsVerifiedModalOpen(false)
                            navigate('/home')
                        }}
                    >
                        Continue
                    </Button>
                </div>
            </Modal>
        </div >
    )
}
