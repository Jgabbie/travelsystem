import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import '../style/signuppage.css';

export default function SignupPage() {
    const navigate = useNavigate();

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

    const valueHandler = (field, value) => {
        setValues({ ...values, [field]: value });
        setError({ ...error, [field]: validate(field, value) });
    };

    const signup = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8000/api/auth/signupUser', values, { withCredentials: true });
            setOutput("Signup successful!");
            navigate('/email-verify', { state: { email: values.email } });
        } catch (err) {
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
                <div className="form-container-box">
                    <h2 className="signup-header">Sign up</h2>
                    
                    <form onSubmit={signup}>
                        <div className="input-group">
                            <label>Username</label>
                            <input 
                                placeholder="Enter Username"
                                value={values.username} 
                                onChange={(e) => valueHandler("username", e.target.value)} 
                                type="text" required 
                            />
                        </div>

                        <div className="input-row">
                            <div className="input-group">
                                <label>First name</label>
                                <input 
                                    placeholder="First Name"
                                    value={values.firstname} 
                                    onChange={(e) => valueHandler("firstname", e.target.value)} 
                                    type="text" required 
                                />
                            </div>
                            <div className="input-group">
                                <label>Last name</label>
                                <input 
                                    placeholder="Last Name"
                                    value={values.lastname} 
                                    onChange={(e) => valueHandler("lastname", e.target.value)} 
                                    type="text" required 
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Email</label>
                            <input 
                                placeholder="Email"
                                value={values.email} 
                                onChange={(e) => valueHandler("email", e.target.value)} 
                                type="email" required 
                            />
                        </div>

                        <div className="input-group">
                            <label>Phone Number</label>
                            <input 
                                placeholder="Phone Number"
                                value={values.phone} 
                                onChange={(e) => valueHandler("phone", e.target.value)} 
                                type="tel" required 
                            />
                        </div>

                        <div className="input-group">
                            <label>Password</label>
                            <input 
                                placeholder="Password"
                                value={values.password} 
                                onChange={(e) => valueHandler("password", e.target.value)} 
                                type="password" required 
                            />
                        </div>

                        <div className="input-group">
                            <label>Confirm Password</label>
                            <input 
                                placeholder="Confirm Password"
                                value={values.confirmPassword} 
                                onChange={(e) => valueHandler("confirmPassword", e.target.value)} 
                                type="password" required 
                            />
                        </div>

                        <div className="button-row">
                            <button type="submit" className="signup-btn">Create Account</button>
                            <div className="login-link-text">
                                Already have an account? {' '}
                                <Link to="/login" onClick={goToLogin}>Login here</Link>
                            </div>
                        </div>
                    </form>

                    <div className="error-list">
                        {error.username && <p className="error-text">{error.username}</p>}
                        {error.email && <p className="error-text">{error.email}</p>}
                        {error.phone && <p className="error-text">{error.phone}</p>}
                        {error.password && <p className="error-text">{error.password}</p>}
                    </div>
                </div>
            </div>
        </div>
        
    );
}