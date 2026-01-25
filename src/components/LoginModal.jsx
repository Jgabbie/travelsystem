import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { Button, Modal, Input } from 'antd';
import { useNavigate } from 'react-router-dom';


export default function LoginModal({ isOpenLogin, isCloseLogin, onLoginSuccess }) {

    const navigate = useNavigate();

    const [values, setValues] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpenLogin) {
            setValues({
                username: '',
                password: ''
            })
            setError("")
        }
    }, [])

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post('http://localhost:8000/api/auth/loginUser', { username: values.username, password: values.password }, { withCredentials: true })
            alert("Login Successful")
            if (onLoginSuccess) {
                onLoginSuccess()
            }
            isCloseLogin()
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            setError(errorMsg)
        }
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
        <div>
            <Modal
                open={isOpenLogin}
                className='resetpassword-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onCancel={() => {
                    setValues({
                        username: '',
                        password: ''
                    })
                    setError("")
                    isCloseLogin()
                }}
            >

                <div id='resetpassword-container-modal'>
                    <h1 id='heading-modal'>Welcome</h1>
                    <p id='secondary-heading-modal'>Login Account</p>

                    <form onSubmit={handleLogin}>

                        <div className='div-input-fields'>
                            <label className='labels' htmlFor="username">Username</label>
                            <Input status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, username: e.target.value })} autoComplete='off' placeholder='Enter your Username' onKeyDown={(e) => {
                                if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.username} type="text" id="username" name="username" className='input-fields' required />
                        </div>

                        <div className='div-input-fields'>
                            <label className='labels' htmlFor="password">Password</label>
                            <Input.Password status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, password: e.target.value })} autoComplete='off' placeholder='Enter your Password' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.password} type="password" id="password" name="password" className='input-fields' required />
                        </div>

                        <p id='error-message-modal'>{error}</p>

                        <div id='links-container'>
                            <p className='label-links'>Need an Account?<Button className='button-links' type="link" onClick={goToSignup}>Signup here</Button></p>
                            <p className='label-links'>Forget your<Button className='button-links' type="link" onClick={resetPassword}>Password?</Button></p>
                        </div>

                        <Button id='submit-otp-button' htmlType="submit">Log in</Button>
                    </form>
                </div>

            </Modal>
        </div>
    )
}
