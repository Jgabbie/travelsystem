//This is not safe
// Use tokens as another "key" to be able to set a new password

import axios from 'axios'
import React, { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Input, Button } from 'antd';
import '../style/newpasswordpage.css'

export default function SetNewPassword() {

    const navigate = useNavigate()
    const location = useLocation()

    const { email } = location.state || {}

    const [values, setValues] = useState({
        password: '',
        confirmPassword: ''
    })
    const [error, setError] = useState({
        password: '',
        confirmPassword: ''
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
            const response = await axios.post('http://localhost:8000/api/auth/reset-password', { newPassword: values.password, email: email })

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

    const goToLogin = (e) => {
        e.preventDefault();
        navigate('/login');
    }

    return (
        <div className='newpassword-page-container'>
            <div className='newpassword-left-side'>
                <form onSubmit={submitNewPassword}>
                    <div id='heading-div'>
                        <h1 id='heading'>Set New Password</h1>
                        <h4 id='second-heading'>Enter New Password</h4>
                    </div>

                    <div className='div-input-fields'>
                        <label className='labels' htmlFor="password">Password</label>
                        <Input value={values.password} maxLength={16} onChange={(e) => valueHandler("password", e.target.value)} autoComplete='off' placeholder='Enter your new password' onKeyDown={(e) => {
                            if (e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="password" id="password" name="password" className='input-fields' required />
                    </div>

                    <p id='error-message'>{error.password}</p>

                    <div className='div-input-fields'>
                        <label className='labels' htmlFor="confirmPassword">Confirm Password</label>
                        <Input value={values.confirmPassword} maxLength={16} onChange={(e) => valueHandler("confirmPassword", e.target.value)} autoComplete='off' placeholder='Enter confirm password' onKeyDown={(e) => {
                            if (e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="password" id="confirmPassword" name="confirmPassword" className='input-fields' required />
                    </div>

                    <p id='error-message'>{error.confirmPassword}</p>

                    <div id='links-container'>
                        <p className='label-links'>Remember your password?<Button className='button-links' type='link' onClick={goToLogin}>Go to Login</Button></p>
                    </div>

                    <Button id='newpassword-button' htmlType='submit'> Reset Password </Button>
                </form>
            </div>

            <div className='newpassword-right-side'>
            </div>
        </div>

    )
}
