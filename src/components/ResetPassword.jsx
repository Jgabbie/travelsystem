import axios from 'axios';
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';


export default function ResetPassword() {

    const navigate = useNavigate();

    const [getEmail, setEmail] = useState("")

    const resetPassword = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/send-reset-otp', { email: getEmail })
            console.log(getEmail)
            navigate('/reset-password-otp', { state: { email: getEmail } })
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            alert(errorMsg)
        }
    }

    const goToSignup = (e) => {
        e.preventDefault();
        navigate('/signup');
    }
    return (
        <div>
            <h2>Reset Password</h2>
            <form onSubmit={resetPassword}>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input value={getEmail} maxLength={40} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => {
                        if (e.key === " " && e.key !== "Backspace") {
                            e.preventDefault()
                        }
                    }} type="email" id="email" name="email" required />
                </div>
                <button type="submit">Reset Password</button>
            </form>

            <button onClick={goToSignup}>Go to Signup</button>
        </div>
    )
}
