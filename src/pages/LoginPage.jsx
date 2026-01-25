import axios from 'axios';
import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button } from 'antd';
import '../style/loginpage.css'



export default function LoginPage() {

    const navigate = useNavigate();


    const [values, setValues] = useState({
        username: '',
        password: ''
    });

    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post('http://localhost:8000/api/auth/loginUser', { username: values.username, password: values.password }, { withCredentials: true })
            alert("Login Successful")
            navigate('/home')
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            setError(errorMsg)
        }

        // const { username, password } = values;
        // setOutput("Logging in with " + username + " and " + password);
    }

    const goToSignup = (e) => {
        e.preventDefault();
        navigate('/signup');
    }

    const resetPassword = (e) => {
        e.preventDefault();
        navigate('/reset-password');
    }

    return (
        <div id='login-container'>
            <div id='login-form'>
                <form method='post' onSubmit={handleLogin}>

                    <div id='heading-div'>
                        <h1 id='heading'>Welcome</h1>
                        <h4 id='second-heading'>Login Account</h4>
                    </div>

                    <div className='div-input-fields'>
                        <label className='labels' htmlFor="username">Username</label>
                        <Input status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, username: e.target.value })} autoComplete='off' placeholder='Enter your Username' onKeyDown={(e) => {
                            if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="text" id="username" name="username" className='input-fields' required />
                    </div>

                    <div className='div-input-fields'>
                        <label className='labels' htmlFor="password">Password</label>
                        <Input.Password status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, password: e.target.value })} autoComplete='off' placeholder='Enter your Password' onKeyDown={(e) => {
                            if (e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="password" id="password" name="password" className='input-fields' required />
                    </div>

                    <p id='error-message'>{error}</p>

                    <div id='links-container'>
                        <p className='label-links'>Need an Account?<Button className='button-links' type="link" onClick={goToSignup}>Signup here</Button></p>
                        <p className='label-links'>Forget your<Button className='button-links' type="link" onClick={resetPassword}>Password?</Button></p>
                    </div>

                    <Button id='login-button' htmlType="submit">Login</Button>
                </form>
            </div>

            <div id='div-image-banner'>
                <img src='/images/LoginPage_Banner.png' alt='Banner' id='image-banner' />
            </div>

        </div>
    )
}
