import React, { useEffect, useState } from 'react'
import { Button, Modal, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import '../../style/components/modals/signupmodal.css';
import LoadingScreen from '../LoadingScreen';
import axiosInstance from '../../config/axiosConfig';



export default function SignupModal({ isOpenSignup, isCloseSignup, onOpenLogin }) {

    const navigate = useNavigate();

    const [isOTPModalVisible, setIsOTPModalVisible] = useState(false)
    const [email, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSignupSuccessVisible, setIsSignupSuccessVisible] = useState(false);

    const [error, setError] = useState({
        username: '', firstname: '', lastname: '', password: [],
        confirmPassword: [], email: '', phone: ''
    });

    const [values, setValues] = useState({
        username: '', firstname: '', lastname: '', password: '',
        confirmPassword: '', email: '', phone: ''
    });

    //prevent clipboard and shortcut keys
    const blockClipboardKeys = (e) => {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;

        if (
            isCtrlOrCmd &&
            ["x", "a"].includes(e.key.toLowerCase())
        ) {
            e.preventDefault();
        }
    };

    //prevent clipboard actions
    const blockShortcuts = (e) => {
        e.preventDefault();
    };

    //proper case function
    const toProperCase = (value) =>
        value
            .toLowerCase()
            .split(" ")
            .map(word =>
                word
                    .split("-")
                    .map(
                        part =>
                            part.charAt(0).toUpperCase() + part.slice(1)
                    )
                    .join("-")
            )
            .join(" ");

    //input validations
    const validate = (field, value) => {
        if (field === "username") {
            if (value === "") return "Username is required.";
            if (value.length < 8) return "Username must be at least 8 characters";
        }
        if (field === "firstname") {
            if (value === "") return "First name is required.";
            if (value.length < 2) return "First name must be at least 2 characters.";
            if (/[ ]$/.test(value)) return "First name must not end with a space.";
        }
        if (field === "lastname") {
            if (value === "") return "Last name is required.";
            if (value.length < 2) return "Last name must be at least 2 characters.";
            if (/[ -]$/.test(value)) return "Last name must not end with a space or dash.";
        }
        if (field === "email") {
            if (value === "") return "Email is required.";
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) return "Invalid Email.";
        }
        if (field === "phone") {
            if (value === "") return "Phone is required.";
            if (value.length < 12) return "Phone must be 10 digits";
            if (value.slice(0, 1) !== "8" && value.slice(0, 1) !== "9") return "Phone number must start with 8 or 9";
        }
        if (field === "password") {
            const errors = [];
            if (value === "") errors.push("Password is required.");
            if (value.length < 8) errors.push("Password must be at least 8 characters.");
            if (!/[A-Z]/.test(value)) errors.push("Password must contain at least one uppercase letter.");
            if (!/[0-9]/.test(value)) errors.push("Password must contain at least one number.");
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errors.push("Password must contain at least one special character.");
            return errors;
        }
        if (field === "confirmPassword") {
            const errors = [];
            if (value === "") errors.push("Confirm Password is required.");
            if (value !== values.password) errors.push("Passwords do not match");
            return errors;
        }
        return "";
    };

    const hasFieldError = (fieldError) =>
        Array.isArray(fieldError) ? fieldError.length > 0 : Boolean(fieldError);

    const renderErrorMessages = (fieldError, fieldKey) => {
        if (Array.isArray(fieldError)) {
            return fieldError
                .filter((message) => message)
                .map((message, index) => (
                    <p className='signup-error-message-modal' key={`${fieldKey}-error-${index}`}>
                        {message}
                    </p>
                ));
        }

        if (!fieldError) {
            return null;
        }

        return <p className='signup-error-message-modal'>{fieldError}</p>;
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
                    setError(prev => ({ ...prev, username: error.response.data.message }));
            });
    }, [values.username])

    //check for duplicate email
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
                    setError(prev => ({ ...prev, email: error.response.data.message }));
            });
    }, [values.email])

    const valueHandler = (field, value) => {
        setValues({ ...values, [field]: value });
        setError({ ...error, [field]: validate(field, value) });
    };

    //signup function
    const handleSignup = async (e) => {
        e.preventDefault();

        const fieldsToValidate = [
            "username",
            "firstname",
            "lastname",
            "email",
            "phone",
            "password",
            "confirmPassword",
        ];

        const validationErrors = fieldsToValidate.reduce((acc, field) => {
            acc[field] = validate(field, values[field]);
            return acc;
        }, {});

        const combinedErrors = {
            ...error,
            ...validationErrors,
        };

        const hasErrors = Object.values(combinedErrors).some((message) =>
            Array.isArray(message) ? message.length > 0 : Boolean(message)
        );
        if (hasErrors) {
            setError(combinedErrors);
            return;
        }

        setIsLoading(true);
        try {
            const response = await axiosInstance.post('/auth/signupUser', values);
            if (response) {
                const userEmail = values.email
                setEmail(userEmail)
                setIsLoading(false)
                isCloseSignup()
                setIsSignupSuccessVisible(true)
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

    //clear form and errors
    const clearForms = () => {
        setError({
            username: '', firstname: '', lastname: '', password: [],
            confirmPassword: [], email: '', phone: ''
        });
        setValues({
            username: '',
            firstname: '',
            lastname: '',
            email: '',
            phone: '',
            password: '',
            confirmPassword: '',
        })
        setShowPassword(false);
        isCloseSignup()
    }

    //go to login page
    const goToLogin = (e) => {
        e.preventDefault();
        if (onOpenLogin) {
            clearForms();
            onOpenLogin();
            return;
        }
    };

    return (
        <div>
            <Modal
                open={isOpenSignup}
                className='signup-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onCancel={clearForms}
            >

                <div id='signup-container-modal'>
                    <h1 id='signup-heading-modal'>Welcome</h1>
                    <p id='signup-secondary-heading-modal'>Create an Account</p>

                    <form onCopy={blockShortcuts} onPaste={blockShortcuts} onCut={blockShortcuts} onKeyDown={blockClipboardKeys} onSubmit={handleSignup}>
                        <div className="signup-input-group-modal">
                            <label className='signup-labels-modal'>Username</label>
                            <Input status={hasFieldError(error.username) ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("username", e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.username} type="text" id="username" className='signup-input-fields-modal' name="username" required />

                            {renderErrorMessages(error.username, "username")}
                        </div>

                        <div className="signup-input-row-modal">
                            <div className="signup-input-group-modal">
                                <label className='signup-labels-modal'>First name</label>
                                <Input status={hasFieldError(error.firstname) ? "error" : ""} maxLength={20} onChange={(e) => { valueHandler("firstname", toProperCase(e.target.value)) }} autoComplete='off' onKeyDown={(e) => {
                                    const value = e.target.value;
                                    if (e.key === " " && value.length === 0) { e.preventDefault(); return; }
                                    if (e.key === " " && value.endsWith(" ")) { e.preventDefault(); return; }

                                    if (
                                        !/^[A-Za-z ]$/.test(e.key) &&
                                        e.key !== "Backspace" &&
                                        e.key !== "ArrowLeft" &&
                                        e.key !== "ArrowRight"
                                    ) {
                                        e.preventDefault();
                                    }
                                }} value={values.firstname} type="text" id="firstname" className='signup-input-fields-modal-group' name="firstname" required />

                                {renderErrorMessages(error.firstname, "firstname")}
                            </div>

                            <div className="signup-input-group-modal">
                                <label className='signup-labels-modal'>Last name</label>
                                <Input status={hasFieldError(error.lastname) ? "error" : ""} maxLength={20} onChange={(e) => { valueHandler("lastname", toProperCase(e.target.value)) }} autoComplete='off' onKeyDown={(e) => {
                                    const value = e.target.value;
                                    if ((e.key === " " || e.key === "-") && value.length === 0) { e.preventDefault(); return; }
                                    if (e.key === " " && value.endsWith(" ")) { e.preventDefault(); return; }
                                    if (e.key === "-" && value.endsWith("-")) { e.preventDefault(); return; }
                                    if (e.key === " " && value.endsWith("-")) { e.preventDefault(); return; }
                                    if (e.key === "-" && value.endsWith(" ")) { e.preventDefault(); return; }
                                    if (
                                        !/^[A-Za-z -]$/.test(e.key) &&
                                        e.key !== "Backspace" &&
                                        e.key !== "ArrowLeft" &&
                                        e.key !== "ArrowRight"
                                    ) {
                                        e.preventDefault();
                                    }
                                }} value={values.lastname} type="text" id="lastname" className='signup-input-fields-modal-group' name="lastname" required />

                                {renderErrorMessages(error.lastname, "lastname")}
                            </div>
                        </div>

                        <div className="signup-input-group-modal">
                            <label className='signup-labels-modal'>Email</label>
                            <Input status={hasFieldError(error.email) ? "error" : ""} maxLength={40} onChange={(e) => valueHandler("email", e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} value={values.email} type="email" id="email" className='signup-input-fields-modal' name="email" required />

                            {renderErrorMessages(error.email, "email")}
                        </div>

                        <div className="signup-input-group-modal">
                            <label className='signup-labels-modal'>Phone Number</label>
                            <Input addonBefore="+63" status={hasFieldError(error.phone) ? "error" : ""} maxLength={12} onChange={(e) => {
                                let value = e.target.value.replace(/\D/g, "");


                                let formatted = "";
                                if (value.length > 0) formatted += value.slice(0, 3);
                                if (value.length >= 4) formatted += " " + value.slice(3, 6);
                                if (value.length >= 7) formatted += " " + value.slice(6, 10);

                                valueHandler("phone", formatted)
                            }} autoComplete='off' onKeyDown={(e) => {
                                if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {

                                    e.preventDefault()
                                }
                            }} value={values.phone} type="tel" id="phone" className='signup-input-fields-modal' name="phone" required />

                            {renderErrorMessages(error.phone, "phone")}
                        </div>

                        <div className="signup-input-group-modal">
                            <label className='signup-labels-modal'>Password</label>
                            <Input.Password status={hasFieldError(error.password) ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("password", e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} visibilityToggle={{ visible: showPassword, onVisibleChange: setShowPassword }} value={values.password} type="password" id="password" className='signup-input-fields-modal' name="password" required />

                            {renderErrorMessages(error.password, "password")}
                        </div>

                        <div className="signup-input-group-modal">
                            <label className='signup-labels-modal'>Confirm Password</label>
                            <Input.Password status={hasFieldError(error.confirmPassword) ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("confirmPassword", e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                if (e.key === " " && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }} visibilityToggle={{ visible: showPassword, onVisibleChange: setShowPassword }} value={values.confirmPassword} type="password" id="password" className='signup-input-fields-modal' name="password" required />

                            {renderErrorMessages(error.confirmPassword, "confirmPassword")}
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

            <LoadingScreen isVisible={isLoading} />

            <Modal
                open={isSignupSuccessVisible}
                className='signup-success-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
            >
                <div className='signup-success-container'>
                    <h1 className='signup-success-heading'>Account created</h1>
                    <p className='signup-success-text'>Your account has been created successfully. You can now log in.</p>
                    <Button
                        id='signup-success-button'
                        onClick={() => {
                            setIsSignupSuccessVisible(false)
                            if (onOpenLogin) {
                                onOpenLogin();
                                return;
                            }
                            navigate('/login');
                        }}
                    >
                        Continue to Login
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
