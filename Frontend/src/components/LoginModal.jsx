import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { Button, Modal, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import '../style/loginmodal.css';
import EmailVerifyModal from './EmailVerifyModal';
import { useAuth } from '../context/AuthContext';




export default function LoginModal({ isOpenLogin, isCloseLogin, onLoginSuccess }) {

    const navigate = useNavigate();
    const { login } = useAuth();

    const [isOTPModalVisible, setIsOTPModalVisible] = useState(false)
    const [email, setEmail] = useState('');
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
            const response = await login({ username: values.username, password: values.password })
            alert("Login Successful")
            if (onLoginSuccess) {
                onLoginSuccess()
            }
            setValues({
                username: '',
                password: ''
            })
            isCloseLogin()
        } catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;

            if (status === 403) {
                const email = data.email
                const response = await axios.post('http://localhost:8000/api/auth/send-verify-otp', { email: email })
                setValues({
                    username: '',
                    password: ''
                })
                setEmail(email)
                setIsOTPModalVisible(true)
                isCloseLogin()
                return
            }

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
                className='login-modal'
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

                <div id='login-container-modal'>
                    <h1 id='login-heading-modal'>Welcome</h1>
                    <p id='login-secondary-heading-modal'>Login Account</p>

                    <form onSubmit={handleLogin}>
                        <div className='login-div-input-fields-modal'>
                            <label className='login-labels-modal' htmlFor="username">Username</label>
                            <Input status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, username: e.target.value })} autoComplete='off' placeholder='Enter your Username' onKeyDown={(e) => {
                                if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.username} type="text" id="username" name="username" className='login-input-fields-modal' required />
                        </div>

                        <div className='login-div-input-fields-modal'>
                            <label className='login-labels-modal' htmlFor="password">Password</label>
                            <Input.Password status={error ? "error" : ""} maxLength={20} onChange={(e) => setValues({ ...values, password: e.target.value })} autoComplete='off' placeholder='Enter your Password' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.password} type="password" id="password" name="password" className='login-input-fields-modal' required />
                        </div>

                        <p id='login-error-message-modal'>{error}</p>

                        <div id='login-links-container-modal'>
                            <p className='login-label-links-modal'>Need an Account?<Button className='login-button-links-modal' type="link" onClick={goToSignup}>Signup here</Button></p>
                            <p className='login-label-links-modal'>Forget your<Button className='login-button-links-modal' type="link" onClick={resetPassword}>Password?</Button></p>
                        </div>

                        <Button id='login-button-modal' htmlType="submit">Log in</Button>
                    </form>
                </div>
            </Modal>

            <EmailVerifyModal
                isOpenOTPModal={isOTPModalVisible}
                isCloseOTPModal={() => setIsOTPModalVisible(false)}
                userEmail={email}
            />


        </div>
    )
}
