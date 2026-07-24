import React, { useEffect, useState } from 'react'
import { Button, Modal, Input, ConfigProvider, Spin, Checkbox } from 'antd';
import { useNavigate } from 'react-router-dom';
import '../../style/components/modals/signupmodal.css';
import apiFetch from '../../config/fetchConfig';


export default function SignupModal({ isOpenSignup, isCloseSignup, onOpenLogin }) {

    const navigate = useNavigate();

    const [, setEmail] = useState("")
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSignupSuccessVisible, setIsSignupSuccessVisible] = useState(false);

    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    const [error, setError] = useState({
        username: '', firstname: '', lastname: '', password: [],
        confirmPassword: [], email: '', phone: '', terms: ''
    });

    const [values, setValues] = useState({
        username: '', firstname: '', lastname: '', password: '',
        confirmPassword: '', email: '', phone: ''
    });

    // ------------------------------------------------------------------------------------------------ FUNTIONS ------------------------------------------------------------------------------------------------


    //PREVENT CLIPBOARD ACTIONS
    const blockClipboardKeys = (e) => {
        const isCtrlOrCmd = e.ctrlKey || e.metaKey;

        if (
            isCtrlOrCmd &&
            ["x", "a"].includes(e.key.toLowerCase())
        ) {
            e.preventDefault();
        }
    };


    //PREVENT SHORTCUTS
    const blockShortcuts = (e) => {
        e.preventDefault();
    };


    //FORCE FIRST NAME AND LAST NAME TO PROPER CASE
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


    //INPUT VALIDATION
    const validate = (field, value, allValues) => {
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
            if (value === "") return "Phone number is required.";
            if (value.length < 13) return "Phone number must be 10 digits";
            if (!/^0[9]/.test(value))
                return "Phone number must start with 09";
        }
        if (field === "password") {

            if (value === "") return "Password is required.";
            if (value.length < 8) return "Password must be at least 8 characters.";
            if (!/[A-Z]/.test(value)) return "Password must contain at least one uppercase letter.";
            if (!/[a-z]/.test(value)) return "Password must contain at least one lowercase letter.";
            if (!/[0-9]/.test(value)) return "Password must contain at least one number.";
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Password must contain at least one special character.";

        }
        if (field === "confirmPassword") {
            if (value === "") return ["Confirm Password is required."];
            if (value !== allValues.password) return ["Passwords do not match"];
            return [];
        }
        return "";
    };


    //CHECK IF FIELD HAS ERROR
    const hasFieldError = (fieldError) =>
        Array.isArray(fieldError) ? fieldError.length > 0 : Boolean(fieldError);


    //RENDER ERROR MESSAGES
    const renderErrorMessages = (fieldError, fieldKey) => {
        if (Array.isArray(fieldError)) {
            return (
                <div className='signup-error-slot signup-error-slot--multi'>
                    {fieldError
                        .filter((message) => message)
                        .map((message, index) => (
                            <p className='signup-error-message-modal' key={`${fieldKey}-error-${index}`}>
                                {message}
                            </p>
                        ))}
                </div>
            );
        }

        return (
            <div className='signup-error-slot'>
                {fieldError ? (
                    <p className='signup-error-message-modal'>{fieldError}</p>
                ) : null}
            </div>
        );
    };


    //HANDLE INPUT CHANGES AND VALIDATION
    const valueHandler = (field, value) => {
        const nextValues = { ...values, [field]: value };

        const validationError = validate(field, value, nextValues);

        const nextErrors = {
            ...error,
            [field]: validationError || ""
        };

        if (!validationError) {
            nextErrors[field] = "";
        }

        if (field === "password" || field === "confirmPassword") {
            nextErrors.confirmPassword = validate(
                "confirmPassword",
                nextValues.confirmPassword,
                nextValues
            );
        }

        setValues(nextValues);
        setError(nextErrors);
    };


    //CHECK FOR DUPLICATE USERNAME
    useEffect(() => {
        const frontEndError = validate("username", values.username) //reduces api requests, it skips api requests when it triggers a frontend validation
        if (frontEndError) return;

        apiFetch.post('/auth/checkDups', { username: values.username })
            .then((data) => {
                setError(prev => ({
                    ...prev,
                    username: ""
                }));
            })
            .catch((err) => {

                const message = err?.data.message || "Username already exists";

                setError(prev => ({
                    ...prev,
                    username: message
                }));
            });
    }, [values.username])


    //CHECK FOR DUPLICATE EMAIL
    useEffect(() => {
        const frontEndError = validate("email", values.email);
        if (frontEndError) return;

        apiFetch.post('/auth/checkDups', { email: values.email })
            .then((data) => {
                setError(prev => ({
                    ...prev,
                    email: ""
                }));
            })
            .catch((err) => {

                const message = err?.data.message || "Email already exists";

                setError(prev => ({
                    ...prev,
                    email: message
                }));
            });
    }, [values.email]);


    //CHECK FOR DUPLICATE PHONE
    useEffect(() => {
        const frontEndError = validate("phone", values.phone);
        if (frontEndError) return;

        apiFetch.post('/auth/checkDups', { phone: values.phone })
            .then((data) => {
                setError(prev => ({
                    ...prev,
                    phone: ""
                }));
            })
            .catch((err) => {

                const message = err?.data.message || "Phone number already exists";

                setError(prev => ({
                    ...prev,
                    phone: message
                }));
            });
    }, [values.phone]);


    //HANDLE SIGNUP
    const handleSignup = async (e) => {
        e.preventDefault();

        if (!acceptedTerms) {
            setError((prev) => ({
                ...prev,
                terms: 'Please agree to the Terms and Conditions.'
            }));
            return;
        }

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
            acc[field] = validate(field, values[field], values);
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
            const response = await apiFetch.post('/auth/signupUser', values);
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
            setIsLoading(false);
        }
    };


    //CLEAR FORMS
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
        setAcceptedTerms(false);
        setIsTermsModalOpen(false);
        setShowPassword(false);
        isCloseSignup()
    }


    //GO TO LOGIN
    const goToLogin = (e) => {
        e.preventDefault();
        if (onOpenLogin) {
            clearForms();
            onOpenLogin();
            return;
        }
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                },
            }}
        >
            {isLoading && (
                <Spin fullscreen size="large" className="app-loading-spin" style={{ zIndex: 2000 }} />
            )}

            <div>
                <Modal
                    open={isOpenSignup}
                    className='signup-modal'
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    footer={null}
                    onCancel={clearForms}
                    width={1000}
                    centered={true}
                >

                    <div className='signup-container-modal'>


                        <div className='signup-container-left'>
                            <img
                                src='/images/Signup_BackgroundImage.webp'
                                alt='Signup Background'
                                className='signup-container-left-image'
                            />
                        </div>


                        <div className='signup-container-right'>
                            <h1 id='signup-heading-modal'>Welcome</h1>
                            <p id='signup-secondary-heading-modal'>Create an Account</p>

                            <form onCopy={blockShortcuts} onPaste={blockShortcuts} onCut={blockShortcuts} onKeyDown={blockClipboardKeys} onSubmit={handleSignup}>
                                <div className="signup-input-group-modal">
                                    <label className='signup-labels-modal'>Username <span style={{ color: "#ff0000" }}>*</span></label>
                                    <Input status={hasFieldError(error.username) ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("username", e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                        if (
                                            !/^[A-Za-z0-9]+$/.test(e.key) ||
                                            e.key === " "
                                        ) {
                                            e.preventDefault();
                                        }
                                    }} value={values.username} type="text" id="username" className='signup-input-fields-modal' name="username" required />
                                </div>
                                {renderErrorMessages(error.username, "username")}

                                <div className="signup-input-row-modal">
                                    <div className="signup-input-group-modal">
                                        <label className='signup-labels-modal'>First name <span style={{ color: "#ff0000" }}>*</span></label>
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
                                        <label className='signup-labels-modal'>Last name <span style={{ color: "#ff0000" }}>*</span></label>
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
                                    <label className='signup-labels-modal'>Email <span style={{ color: "#ff0000" }}>*</span></label>
                                    <Input status={hasFieldError(error.email) ? "error" : ""} maxLength={40} onChange={(e) => valueHandler("email", e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                        if (e.key === " " && e.key !== "Backspace") {
                                            e.preventDefault()
                                        }
                                    }} value={values.email} type="email" id="email" className='signup-input-fields-modal' name="email" required />

                                    {renderErrorMessages(error.email, "email")}
                                </div>

                                <div className="signup-input-group-modal">
                                    <label className='signup-labels-modal'>Phone Number <span style={{ color: "#ff0000" }}>*</span></label>
                                    <Input status={hasFieldError(error.phone) ? "error" : ""} maxLength={13}
                                        onChange={(e) => {
                                            let value = e.target.value.replace(/\D/g, "");

                                            value = value.slice(0, 11);

                                            let formatted = value;

                                            if (value.length > 4 && value.length <= 7) {
                                                formatted =
                                                    value.slice(0, 4) + " " +
                                                    value.slice(4);
                                            }
                                            else if (value.length > 7) {
                                                formatted =
                                                    value.slice(0, 4) + " " +
                                                    value.slice(4, 7) + " " +
                                                    value.slice(7);
                                            }

                                            valueHandler("phone", formatted);
                                        }} value={values.phone} type="tel" id="phone" className='signup-input-fields-modal' name="phone" required />

                                    {renderErrorMessages(error.phone, "phone")}
                                </div>

                                <div className="signup-input-row-modal">
                                    <div className="signup-input-group-modal">
                                        <label className='signup-labels-modal'>Password <span style={{ color: "#ff0000" }}>*</span></label>
                                        <Input.Password status={hasFieldError(error.password) ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("password", e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                            if (e.key === " " && e.key !== "Backspace") {
                                                e.preventDefault()
                                            }
                                        }} visibilityToggle={{ visible: showPassword, onVisibleChange: setShowPassword }} value={values.password} type="password" id="password" className='signup-input-fields-modal-group' name="password" required />

                                        {renderErrorMessages(error.password, "password")}
                                    </div>

                                    <div className="signup-input-group-modal">
                                        <label className='signup-labels-modal'>Confirm Password <span style={{ color: "#ff0000" }}>*</span></label>
                                        <Input.Password status={hasFieldError(error.confirmPassword) ? "error" : ""} maxLength={20} onChange={(e) => valueHandler("confirmPassword", e.target.value)} autoComplete='off' onKeyDown={(e) => {
                                            if (e.key === " " && e.key !== "Backspace") {
                                                e.preventDefault()
                                            }
                                        }} visibilityToggle={{ visible: showConfirmPassword, onVisibleChange: setShowConfirmPassword }} value={values.confirmPassword} type="password" id="confirmPassword" className='signup-input-fields-modal-group' name="confirmPassword" required />

                                        {renderErrorMessages(error.confirmPassword, "confirmPassword")}
                                    </div>
                                </div>

                                <div className="signup-terms-container-modal">
                                    <Checkbox
                                        checked={acceptedTerms}
                                        onChange={(e) => {
                                            const checked = e.target.checked;

                                            setAcceptedTerms(checked);

                                            setError((prev) => ({
                                                ...prev,
                                                terms: checked
                                                    ? ''
                                                    : 'Please agree to the Terms and Conditions.'
                                            }));
                                        }}
                                    >
                                        <p className='signup-terms-text-modal'>I agree to the</p>
                                        <Button
                                            className='signup-terms-link-modal'
                                            onClick={() => setIsTermsModalOpen(true)}
                                        >
                                            Terms and Conditions
                                        </Button>

                                        <span style={{ color: "#ff0000" }}> *</span>
                                    </Checkbox>

                                    <div className="signup-terms-error-container-modal">
                                        {error.terms && (
                                            <p className="signup-terms-error-modal">
                                                {error.terms || ''}
                                            </p>
                                        )}
                                    </div>

                                </div>

                                <div className="signup-button-row-modal">
                                    <Button htmlType="submit" id='signup-button-modal'>Create Account</Button>
                                    <div className="signup-link-text-modal">
                                        <p className='signup-label-links-modal'>Already have an account? <Button className='signup-button-links-modal' type="link" onClick={goToLogin}>Login here</Button></p>
                                    </div>
                                </div>
                            </form>
                        </div>

                    </div>
                </Modal>

                <Modal
                    open={isSignupSuccessVisible}
                    className='signup-success-modal'
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    onCancel={() => {
                        setIsSignupSuccessVisible(false)
                    }}
                    footer={null}
                    centered={true}
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


                <Modal
                    open={isTermsModalOpen}
                    rootClassName="signup-terms-modal-root"
                    className="signup-terms-modal"
                    closable={false}
                    mask={{ closable: false }}
                    footer={
                        <div className="signup-terms-footer">
                            <Button
                                type="text"
                                onClick={() => setIsTermsModalOpen(false)}
                                className="signup-terms-close-button"
                            >
                                Cancel
                            </Button>

                            <Button
                                type="primary"
                                className="signup-terms-agree-button"
                                onClick={() => {
                                    setAcceptedTerms(true);

                                    setError((prev) => ({
                                        ...prev,
                                        terms: ''
                                    }));

                                    setIsTermsModalOpen(false);
                                }}
                            >
                                Agree
                            </Button>
                        </div>
                    }
                    onCancel={() => setIsTermsModalOpen(false)}
                    centered
                    width={850}
                >
                    <div className="signup-terms-header">
                        <h2>Terms and Conditions</h2>
                        <h3>Your Agreement</h3>
                    </div>

                    <div className="signup-terms-content-modal">
                        <p className="signup-terms-revised">
                            Last Revised: July 8, 2026
                        </p>

                        <p>
                            Welcome to M&amp;RC Travel and Tours. This platform is provided as
                            a service to our users and may be used for travel bookings,
                            passport assistance, visa assistance, quotations, and other
                            related travel services. Because these Terms and Conditions
                            contain legal obligations, please read them carefully.
                        </p>

                        <h4>1. Acceptance of Terms</h4>
                        <p>
                            By creating or accessing an account with M&amp;RC Travel and Tours,
                            you agree to comply with and be bound by these Terms and Conditions.
                            If you do not agree with these terms, please do not create an
                            account or use the platform.
                        </p>

                        <h4>2. Account Information</h4>
                        <p>
                            You are responsible for providing complete, accurate, and updated
                            account information. You are also responsible for keeping your
                            username, password, and other account credentials secure.
                        </p>

                        <h4>3. Booking and Payment</h4>
                        <p>
                            All bookings are subject to availability. Package prices,
                            deposits, payment schedules, payment deadlines, and additional
                            charges may vary depending on the selected travel package or
                            service.
                        </p>

                        <h4>4. Cancellations and Refunds</h4>
                        <p>
                            Cancellation and refund eligibility will depend on the applicable
                            package, airline, hotel, embassy, travel provider, or service
                            provider policy. Certain payments and processing fees may be
                            non-refundable.
                        </p>

                        <h4>5. User Responsibilities</h4>
                        <p>
                            Users must submit complete, accurate, and valid information and
                            documents. M&amp;RC Travel and Tours will not be responsible for
                            delays, penalties, rejections, or additional expenses caused by
                            incomplete, inaccurate, invalid, or expired documents.
                        </p>

                        <h4>6. Passport and Visa Services</h4>
                        <p>
                            Passport and visa processing times may depend on the Department of
                            Foreign Affairs, embassies, consulates, and other government
                            agencies. Approval of an application is determined solely by the
                            appropriate government authority.
                        </p>

                        <h4>7. Privacy</h4>
                        <p>
                            Personal information will be collected and processed only for
                            account management, travel bookings, payments, travel
                            documentation, customer support, and other related services.
                        </p>

                        <h4>8. Changes to the Terms</h4>
                        <p>
                            M&amp;RC Travel and Tours may revise these Terms and Conditions
                            whenever necessary. Continued use of the platform after changes
                            are published means that you accept the updated terms.
                        </p>
                    </div>
                </Modal>


            </div>
        </ConfigProvider>
    )
}
