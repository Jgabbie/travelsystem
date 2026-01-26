import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

export default function EmailVerify() {

    const navigate = useNavigate()
    const location = useLocation()

    const { email } = location.state || {}

    const [getOTP, setOTP] = useState("")

    // if (!email) {
    //     return <Navigate to="/signup" replace />
    // }


    const submitOTP = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/verify-account', { otp: getOTP }, { withCredentials: true })

            if (response.data.success || response.status === 200) {
                alert("Account Verified")
                navigate('/login')
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            alert(errorMsg)
        }
    }

    const resendOTP = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/send-verify-otp', {}, { withCredentials: true })
            alert("OTP sent!")
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            alert(errorMsg)
        }
    }

    return (
        <div>
            <h1>Enter Your OTP</h1>
            <form method='post' onSubmit={submitOTP}>
                <label htmlFor="enterOTP">Enter OTP:</label>
                <input value={getOTP} maxLength={6} onChange={(e) => (setOTP(e.target.value))} onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                        e.preventDefault()
                    }
                }} type="tel" id="enterOTP" name="enterOTP" required />
                <button type='submit'>SUBMIT OTP</button>
                <button onClick={resendOTP}>RE-SEND OTP</button>
            </form>

        </div>
    )
}
