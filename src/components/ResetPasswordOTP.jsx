import axios from 'axios'
import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

export default function ResetPasswordOTP() {




    const navigate = useNavigate()
    const location = useLocation()

    const { email } = location.state || {}
    console.log(email)

    const [getOTP, setOTP] = useState("")

    if (!email) {
        return <Navigate to="/reset-password" replace />
    }


    const submitOTP = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/check-reset-otp', { email: email, otp: getOTP })

            if (response.data.success || response.status === 200) {
                alert("OTP for reset password is correct")
                navigate('/set-newpassword', { state: { email: email } })
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
            const response = await axios.post('http://localhost:8000/api/auth/send-verify-otp', { email: email })
            alert("OTP sent!")
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            alert(errorMsg)
        }
    }

    return (
        <>
            <div>
                <h1>Reset Password OTP</h1>
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



        </>


    )
}
