import React, { useState } from 'react'
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

export default function SignupPage() {

    const navigate = useNavigate();

    const validate = async (field, value) => {

        if (field === "username") {
            if (value === "") {
                return "Username is required."
            }
            if (value.length < 8) {
                return "Username must be at least 8 characters"
            }

            try {
                const response = await axios.get("http://localhost:8000/api/getUsers")
                const usernames = response.data.map(user => user.username)
                if (usernames.includes(value)) {
                    return "Username already exists"
                }
            } catch (error) {
                console.log("Error fetching usernames: " + error.message);
            }
        }

        if (field === "email") {
            if (value === "") {
                return "Email is required."
            }
            if (value.length < 8) {
                return "Email must be at least 8 characters"
            }
            if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value)) {
                return "Invalid Email."
            }

            try {
                const response = await axios.get("http://localhost:8000/api/getUsers")
                const emails = response.data.map(user => user.email)
                if (emails.includes(value)) {
                    return "Email has already been used."
                }
            } catch (error) {
                console.log("Error fetching emails: " + error.message)
            }
        }

        if (field === "phone") {
            if (value === "") {
                return "Phone is required."
            }
            if (value.length < 8) {
                return "Phone must be 15 digits"
            }
        }

        if (field === "password") {
            if (value === "") {
                return "Password is required."
            }
            if (value.length < 8) {
                return "Password must be at least 8 characters"
            }
        }

        if (field === "confirmpassword") {
            if (value === "") {
                return "Password is required."
            }
            if (value !== values.password) {
                return "Password and Confirm password does not match"
            }
        }
    }

    const [error, setError] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        phone: ''
    })

    const [values, setValues] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        phone: ''
    });

    const valueHandler = (field, value) => {
        setValues({ ...values, [field]: value })
        setError({ ...error, [field]: validate(field, value) })
    }


    const [output, setOutput] = useState('');

    // const validationsSignup = () => {

    //     if (!values.username || !values.password || !values.confirmPassword || !values.email || !values.phone) {
    //         return setOutput("All fields are required.");
    //     }

    //     if (values.password !== values.confirmPassword) {
    //         return setOutput("Passwords do not match.")
    //     }

    //     if (values.password.length < 6) {
    //         return setOutput("Password must be at least 6 characters long.");

    //     }

    //     if (values.username.length < 7) {
    //         return setOutput("Username must be at least 8 characters long")
    //     }

    //     if (values.phone.substring(0, 2) !== "09" || values.phone.length !== 10) {
    //         return setOutput("Phone must be valid.")
    //     }
    // }

    const signup = (e) => {

        e.preventDefault();

        if (error) {
            return console.log("Inputs are invalid!")
        } else {
            axios.post('http://localhost:8000/api/createUsers', values)
                .then(() => {
                    setOutput("Signup successful! Please log in.");
                    setValues({
                        username: "",
                        password: "",
                        confirmpassword: "",
                        email: "",
                        phone: ""
                    })
                })
                .catch(error => {
                    setOutput("Signup failed: " + error.response.data.message);
                });
        }

    }

    const goToLogin = (e) => {
        e.preventDefault();
        navigate('/login');
    }
    return (
        <div>
            <div>
                <form method='post' onSubmit={signup}>
                    <h2>Travel System Signup</h2>
                    <div>
                        <label htmlFor="username">Username:</label>
                        <input onChange={(e) => valueHandler("username", e.target.value)} type="text" id="username" name="username" required />
                    </div>
                    <div>
                        <label htmlFor="email">Email:</label>
                        <input onChange={(e) => valueHandler("email", e.target.value)} type="email" id="email" name="email" required />
                    </div>
                    <div>
                        <label htmlFor="phone">Phone:</label>
                        <input onChange={(e) => valueHandler("phone", e.target.value)} type="tel" id="phone" name="phone" required />
                    </div>
                    <div>
                        <label htmlFor="password">Password:</label>
                        <input onChange={(e) => valueHandler("password", e.target.value)} type="password" id="password" name="password" required />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword">Confirm Password:</label>
                        <input onChange={(e) => valueHandler("confirmpassword", e.target.value)} type="password" id="confirmPassword" name="confirmPassword" required />
                    </div>
                    <button type="submit">Signup</button>
                    <button onClick={goToLogin}>Go to Login</button>
                </form>
                <div>
                    <p> {output} </p>
                    <p>{error.username}</p>
                    <p>{error.email}</p>
                    <p>{error.phone}</p>
                    <p>{error.password}</p>
                    <p>{error.confirmpassword}</p>
                </div>
            </div>
        </div>
    )
}
