//This is not safe
// Use tokens as another "key" to be able to set a new password

import axios from 'axios'
import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

export default function SetNewPassword() {

    const navigate = useNavigate()
    const location = useLocation()

    const { email } = location.state || {}

    const [getNewPassword, setNewPassword] = useState({
        password: ''
    })
    const [error, setError] = useState({
        password: ''
    })

    if (!email) {
        return <Navigate to="/reset-password" replace />
    }

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

        return ""
    }

    const valueHandler = (field, value) => {
        setNewPassword({ ...getNewPassword, [field]: value })
        setError({ ...error, [field]: validate(field, value) })
    }

    const submitNewPassword = async (e) => {
        e.preventDefault()

        if (error.password !== "") {
            return console.log("Inputs are invalid!")
        }

        try {
            const response = await axios.post('http://localhost:8000/api/auth/reset-password', { newPassword: getNewPassword.password, email: email })

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
        <>
            <div>
                <h1>Reset Password</h1>
                <form onSubmit={submitNewPassword}>
                    <label htmlFor="password">Password:</label>
                    <input value={getNewPassword.password} maxLength={16} onChange={(e) => valueHandler("password", e.target.value)} onKeyDown={(e) => {
                        if (e.key === " " && e.key !== "Backspace") {
                            e.preventDefault()
                        }
                    }} type="password" id="password" name="password" required />
                    <button type='submit'> Reset Password </button>
                </form>
                <p>{error.password}</p>
            </div>
        </>

    )
}
