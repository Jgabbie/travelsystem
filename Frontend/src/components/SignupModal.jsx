import React, { useEffect, useState } from 'react'
import { Button, Modal, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import '../style/signupmodal.css';
import LoadingScreen from './LoadingScreen';
import EmailVerifyModal from './EmailVerifyModal';
import axiosInstance from '../config/axiosConfig';



export default function SignupModal({ isOpenSignup, isCloseSignup }) {

    const navigate = useNavigate();

    const [isOTPModalVisible, setIsOTPModalVisible] = useState(false)
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false);

    const [error, setError] = useState({
        username: '', firstname: '', lastname: '', password: '',
        confirmPassword: '', email: '', phone: ''
    });

    const [values, setValues] = useState({
        username: '', firstname: '', lastname: '', password: '',
        confirmPassword: '', email: '', phone: ''
    });

    //input validations
    const validate = (field, value) => {
        if (field === "username") {
            if (value === "") return "Username is required.";
            if (value.length < 8) return "Username must be at least 8 characters";
        }
        if (field === "firstname") {
            if (value === "") return "First name is required.";
            if (value.length < 2) return "First name must be at least 2 characters.";
        }
        if (field === "lastname") {
            if (value === "") return "Last name is required.";
            if (value.length < 2) return "Last name must be at least 2 characters.";
        }
        if (field === "email") {
            if (value === "") return "Email is required.";
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return "Invalid Email.";
        }
        if (field === "phone") {
            if (value === "") return "Phone is required.";
            if (value.length < 11) return "Phone must be 11 digits";
            if (value.slice(0, 2) !== "09") return "Phone number must start with 09";
        }
        if (field === "password") {
            if (value === "") return "Password is required.";
            if (value.length < 8) return "Password must be at least 8 characters.";
            if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter.";
            if (!/[0-9]/.test(value)) return "Password must contain at least one number.";
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Password must contain at least one special character.";
        }
        if (field === "confirmPassword") {
            if (value === "") return "Confirm Password is required.";
            if (value !== values.password) return "Passwords do not match";
        }
        return "";
    };

    //check for duplicate username
    useEffect(() => {
        const frontEndError = validate("username", values.username) //reduces api requests, it skips api requests when it triggers a frontend validation
        if (frontEndError) {
            return
        }
        axiosInstance.post('/auth/checkDups', { username: values.username })
            .then(() => {
                return
            })
            .catch(error => {
                if (error.response)
                    setError(prev => ({ ...prev, username: "Signup failed: " + error.response.data.message }));
            });
    }, [values.username])

    //check for duplicate username
    useEffect(() => {
        const frontEndError = validate("email", values.email)
        if (frontEndError) {
            return
        }
        axiosInstance.post('/auth/checkDups', { email: values.email })
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

    //signup function
    const handleSignup = async (e) => {
        e.preventDefault();
        setIsLoading(true)
        try {
            const response = await axiosInstance.post('/auth/signupUser', values);
            if (response) {
                const userEmail = values.email
                setEmail(userEmail)
                setIsLoading(false)
                isCloseSignup()
                setIsOTPModalVisible(true)
                setValues({
                    username: '',
                    firstname: '',
                    lastname: '',
                    email: '',
                    phone: '',
                    password: '',
                    confirmPassword: '',
                })
            }
        } catch (err) {
            console.log("Invalid Inputs")
        }
    };

    //go to login page
    const goToLogin = (e) => {
        e.preventDefault();
        navigate('/login');
    };

    return (
        <div>
            <Modal
                open={isOpenSignup}
                className='signup-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onCancel={() => {
                    setValues({
                        username: '',
                        firstname: '',
                        lastname: '',
                        email: '',
                        phone: '',
                        password: '',
                        confirmPassword: ''
                    })
                    setError("")
                    isCloseSignup()
                }}
            >

                <div id='signup-container-modal'>
                    <h1 id='signup-heading-modal'>Welcome</h1>
                    <p id='signup-secondary-heading-modal'>Create an Account</p>

                    <form onSubmit={handleSignup}>
                        <div className="signup-input-group-modal">
                            <label className='signup-labels-modal'>Username</label>
                            <Input status={error.username ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("username", e.target.value)} autoComplete='off' placeholder='Enter your Username' onKeyDown={(e) => {
                                if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.username} type="text" id="username" className='signup-input-fields-modal' name="username" required />

                            <p id='error-message-signup'>{error.username}</p>
                        </div>

                        <div className="signup-input-row-modal">
                            <div className="signup-input-group-modal">
                                <label className='signup-labels-modal'>First name</label>
                                <Input status={error.firstname ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("firstname", e.target.value)} autoComplete='off' placeholder='Firstname' onKeyDown={(e) => {
                                    if (!/^[A-Za-z]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} value={values.firstname} type="text" id="firstname" className='signup-input-fields-modal-group' name="firstname" required />

                                <p id='error-message-signup'>{error.firstname}</p>
                            </div>

                            <div className="signup-input-group-modal">
                                <label className='signup-labels-modal'>Last name</label>
                                <Input status={error.lastname ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("lastname", e.target.value)} autoComplete='off' placeholder='Lastname' onKeyDown={(e) => {
                                    if (!/^[A-Za-z]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }} value={values.lastname} type="text" id="lastname" className='signup-input-fields-modal-group' name="lastname" required />

                                <p id='error-message-signup'>{error.lastname}</p>
                            </div>
                        </div>

                        <div className="signup-input-group-modal">
                            <label className='signup-labels-modal'>Email</label>
                            <Input status={error.email ? "error" : ""} maxLength={40} onChange={(e) => valueHandler("email", e.target.value)} autoComplete='off' placeholder='Enter your Email' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.email} type="email" id="email" className='signup-input-fields-modal' name="email" required />

                            <p id='error-message-signup'>{error.email}</p>
                        </div>

                        <div className="signup-input-group-modal">
                            <label className='signup-labels-modal'>Phone Number</label>
                            <Input status={error.phone ? "error" : ""} maxLength={11} onChange={(e) => valueHandler("phone", e.target.value)} autoComplete='off' placeholder='Enter your Phone Number' onKeyDown={(e) => {
                                if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.phone} type="tel" id="phone" className='signup-input-fields-modal' name="phone" required />

                            <p id='error-message-signup'>{error.phone}</p>
                        </div>

                        <div className="signup-input-group-modal">
                            <label className='signup-labels-modal'>Password</label>
                            <Input.Password status={error.password ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("password", e.target.value)} autoComplete='off' placeholder='Enter your Password' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.password} type="password" id="password" className='signup-input-fields-modal' name="password" required />

                            <p id='error-message-signup'>{error.password}</p>
                        </div>

                        <div className="signup-input-group-modal">
                            <label className='signup-labels-modal'>Confirm Password</label>
                            <Input.Password status={error.confirmPassword ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("confirmPassword", e.target.value)} autoComplete='off' placeholder='Enter Confirm Password' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.confirmPassword} type="password" id="password" className='signup-input-fields-modal' name="password" required />

                            <p id='error-message-signup'>{error.confirmPassword}</p>
                        </div>

                        <div className="signup-button-row-modal">
                            <Button htmlType="submit" id='signup-button-modal'>Create Account</Button>
                            <div className="signup-link-text-modal">
                                <p className='signup-label-links-modal'>Already have an account? <Button className='signup-button-links-modal' type="link" onClick={goToLogin}>Login here</Button></p>
                            </div>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* open email verify modal */}
            <EmailVerifyModal
                isOpenOTPModal={isOTPModalVisible}
                isCloseOTPModal={() => setIsOTPModalVisible(false)}
                userEmail={email}
            />

            <LoadingScreen isVisible={isLoading} />
        </div>
    )
}
