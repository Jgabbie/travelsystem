import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Input, Button, Modal } from 'antd';
import '../style/signuppage.css';
import EmailVerifyModal from '../components/EmailVerifyModal';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
    const navigate = useNavigate();
    const { signup } = useAuth();

    const [isOTPModalVisible, setIsOTPModalVisible] = useState(false)
    const [email, setEmail] = useState("")

    const [error, setError] = useState({
        username: '', firstname: '', lastname: '', password: '',
        confirmPassword: '', email: '', phone: ''
    });

    const [values, setValues] = useState({
        username: '', firstname: '', lastname: '', password: '',
        confirmPassword: '', email: '', phone: ''
    });

    const [output, setOutput] = useState('');

    const validate = (field, value) => {
        if (field === "username") {
            if (value === "") return "Username is required.";
            if (value.length < 8) return "Username must be at least 8 characters";
        }
        if (field === "firstname") {
            if (value === "") return "Firstname is required.";
        }
        if (field === "lastname") {
            if (value === "") return "Lastname is required.";
        }
        if (field === "email") {
            if (value === "") return "Email is required.";
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return "Invalid Email.";
        }
        if (field === "phone") {
            if (value === "") return "Phone is required.";
            if (value.length < 11) return "Phone must be 11 digits";
        }
        if (field === "password") {
            if (value === "") return "Password is required.";
            if (value.length < 8) return "Password must be at least 8 characters.";
        }
        if (field === "confirmPassword") {
            if (value === "") return "Confirm Password is required.";
            if (value !== values.password) return "Passwords do not match";
        }
        return "";
    };

    //might add a delay timer to reduce the api calls
    useEffect(() => {
        const frontEndError = validate("username", values.username) //reduces api requests, it skips api requests when it triggers a frontend validation
        if (frontEndError) {
            return
        }

        axios.post('http://localhost:8000/api/auth/checkDups', { username: values.username })
            .then(() => {
                return
            })
            .catch(error => {
                if (error.response)
                    setError(prev => ({ ...prev, username: "Signup failed: " + error.response.data.message }));
            });
    }, [values.username])

    //might add a delay timer to reduce the api calls
    useEffect(() => {
        const frontEndError = validate("email", values.email)
        if (frontEndError) {
            return
        }

        axios.post('http://localhost:8000/api/auth/checkDups', { email: values.email })
            .then(() => {
                return
            })
            .catch(error => {
                if (error.response)
                    setError(prev => ({ ...prev, email: "Signup failed: " + error.response.data.message }));
            });
    }, [values.email])

    const valueHandler = (field, value) => {
        setValues({ ...values, [field]: value });
        setError({ ...error, [field]: validate(field, value) });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        try {
            const response = await signup(values);
            if (response) {
                const userEmail = values.email
                setEmail(userEmail)
                setIsOTPModalVisible(true)
                setValues({
                    username: '', firstname: '', lastname: '', password: '',
                    confirmPassword: '', email: '', phone: ''
                })
            } else {
                console.log("Response is falsy:", response)
            }
        } catch (err) {
            console.log("Error: " + err)
            alert(err.response?.data?.message || "Verification failed");
        }
    };

    const goToLogin = (e) => {
        e.preventDefault();
        navigate('/login');
    };

    return (
        <div className="signup-page-container">
            {/* LEFT SIDE: Pure Background Image Area */}
            <div className="signup-left-side">
                {/* No logo or image tags here */}
            </div>

            {/* RIGHT SIDE: Form Area */}
            <div className="signup-right-side">
                <div className="signup-form-container-box">
                    <h2 className="signup-header">Sign up</h2>

                    <form onSubmit={handleSignup}>
                        <div className="signup-input-group">
                            <label className='labels-signup'>Username</label>
                            <Input status={error.username ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("username", e.target.value)} autoComplete='off' placeholder='Enter your Username' onKeyDown={(e) => {
                                if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.username} type="text" id="username" className='input-fields-signup' name="username" required />

                            <p id='error-message-signup'>{error.username}</p>
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label className='labels-signup'>First name</label>
                                <Input status={error.firstname ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("firstname", e.target.value)} autoComplete='off' placeholder='Firstname' onKeyDown={(e) => {
                                    if (!/^[A-Za-z]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} value={values.firstname} type="text" id="firstname" className='input-fields-signup-group' name="firstname" required />

                                <p id='error-message-signup'>{error.firstname}</p>
                            </div>

                            <div className="input-group">
                                <label className='labels-signup'>Last name</label>
                                <Input status={error.lastname ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("lastname", e.target.value)} autoComplete='off' placeholder='Lastname' onKeyDown={(e) => {
                                    if (!/^[A-Za-z]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} value={values.lastname} type="text" id="lastname" className='input-fields-signup-group' name="lastname" required />

                                <p id='error-message-signup'>{error.lastname}</p>
                            </div>
                        </div>

                        <div className="input-group">
                            <label className='labels-signup'>Email</label>
                            <Input status={error.email ? "error" : ""} maxLength={40} onChange={(e) => valueHandler("email", e.target.value)} autoComplete='off' placeholder='Enter your Email' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.email} type="email" id="email" className='input-fields-signup' name="email" required />

                            <p id='error-message-signup'>{error.email}</p>
                        </div>

                        <div className="input-group">
                            <label className='labels-signup'>Phone Number</label>
                            <Input status={error.phone ? "error" : ""} maxLength={11} onChange={(e) => valueHandler("phone", e.target.value)} autoComplete='off' placeholder='Enter your Phone Number' onKeyDown={(e) => {
                                if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.phone} type="tel" id="phone" className='input-fields-signup' name="phone" required />

                            <p id='error-message-signup'>{error.phone}</p>
                        </div>

                        <div className="input-group">
                            <label className='labels-signup'>Password</label>
                            <Input.Password status={error.password ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("password", e.target.value)} autoComplete='off' placeholder='Enter your Password' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.password} type="password" id="password" className='input-fields-signup' name="password" required />

                            <p id='error-message-signup'>{error.password}</p>
                        </div>

                        <div className="input-group">
                            <label className='labels-signup'>Confirm Password</label>
                            <Input.Password status={error.confirmPassword ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("confirmPassword", e.target.value)} autoComplete='off' placeholder='Enter Confirm Password' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.confirmPassword} type="password" id="password" className='input-fields-signup' name="password" required />

                            <p id='error-message-signup'>{error.confirmPassword}</p>
                        </div>

                        <div className="button-row">
                            <Button htmlType="submit" id='signup-button'>Create Account</Button>
                            <div className="signup-link-text">
                                <p className='label-links-signup'>Already have an account? <Button className='button-links-signup' type="link" onClick={goToLogin}>Login here</Button></p>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* open email verify modal */}
            <EmailVerifyModal
                isOpenOTPModal={isOTPModalVisible}
                isCloseOTPModal={() => setIsOTPModalVisible(false)}
                userEmail={email}
            />

        </div>

    );
}