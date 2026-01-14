import React, { useEffect, useState } from 'react'
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

export default function SignupPage() {

    const navigate = useNavigate();

    const [getUsers, setUsers] = useState([])
    const [getEmails, setEmails] = useState([])

    useEffect(() => {
        axios.get('http://localhost:8000/api/getUsers')
            .then((response) => {
                setUsers(response.data.map(user => user.username))
                setEmails(response.data.map(user => user.emails))
            })
            .catch(error => {
                setOutput("Signup failed: " + error.response.data.message);
            });
    }, [])



    const validate = (field, value) => {



        if (field === "username") {
            if (value === "") {
                return "Username is required."
            }
            if (value.length < 8) {
                return "Username must be at least 8 characters"
            }
            if (getUsers.find(user => user === value)) {
                return "Username already exists"
            }
        }

        if (field === "firstname") {
            if (value === "") {
                return "Firstname is required."
            }
        }

        if (field === "lastname") {
            if (value === "") {
                return "Lastname is required."
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
            if (getEmails.find(email => email === value)) {
                return "This email is already registered"
            }
        }

        if (field === "phone") {
            if (value === "") {
                return "Phone is required."
            }
            if (value.length < 8) {
                return "Phone must be 11 digits"
            }
            if (/^09\d{10}$/.test(value)) {
                return "Invalid Phone Number"
            }
        }

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
                return "Password is required."
            }
            if (value !== values.password) {
                return "Password and Confirm password does not match"
            }
        }

        return ""
    }

    const [error, setError] = useState({
        username: '',
        firstname: '',
        lastname: '',
        password: '',
        confirmPassword: '',
        email: '',
        phone: ''
    })

    const [values, setValues] = useState({
        username: '',
        firstname: '',
        lastname: '',
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

    const signup = (e) => {

        e.preventDefault();


        if (error.username !== "" && error.firstname !== "" && error.lastname !== "" && error.email !== "" && error.phone !== "" && error.password !== "" && error.confirmPassword !== "") {
            return console.log("Inputs are invalid!")
        }

        {
            axios.post('http://localhost:8000/api/createUsers', values)
                .then(() => {
                    setOutput("Signup successful! Please log in.");
                    setValues({
                        username: "",
                        firstname: '',
                        lastname: '',
                        password: "",
                        confirmPassword: "",
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
                        <input value={values.username} maxLength={20} onChange={(e) => valueHandler("username", e.target.value)} onKeyDown={(e) => {
                            if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="text" id="username" name="username" required />
                    </div>
                    <div>
                        <label htmlFor="firstname">First Name:</label>
                        <input value={values.firstname} maxLength={20} onChange={(e) => valueHandler("firstname", e.target.value)} onKeyDown={(e) => {
                            if (!/^[A-Za-z]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="text" id="firstname" name="firstname" required />
                    </div>
                    <div>
                        <label htmlFor="lastname">Last Name:</label>
                        <input value={values.lastname} maxLength={15} onChange={(e) => valueHandler("lastname", e.target.value)} onKeyDown={(e) => {
                            if (!/^[A-Za-z]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="text" id="lastname" name="lastname" required />
                    </div>
                    <div>
                        <label htmlFor="email">Email:</label>
                        <input value={values.email} maxLength={40} onChange={(e) => valueHandler("email", e.target.value)} onKeyDown={(e) => {
                            if (e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="email" id="email" name="email" required />
                    </div>
                    <div>
                        <label htmlFor="phone">Phone:</label>
                        <input value={values.phone} maxLength={11} onChange={(e) => valueHandler("phone", e.target.value)} onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="tel" id="phone" name="phone" required />
                    </div>
                    <div>
                        <label htmlFor="password">Password:</label>
                        <input value={values.password} maxLength={16} onChange={(e) => valueHandler("password", e.target.value)} onKeyDown={(e) => {
                            if (e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="password" id="password" name="password" required />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword">Confirm Password:</label>
                        <input value={values.confirmPassword} maxLength={16} onChange={(e) => valueHandler("confirmPassword", e.target.value)} onKeyDown={(e) => {
                            if (e.key === " " && e.key !== "Backspace") {
                                e.preventDefault()
                            }
                        }} type="password" id="confirmPassword" name="confirmPassword" required />
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
                    <p>{error.confirmPassword}</p>
                </div>
            </div>
        </div>
    )
}
