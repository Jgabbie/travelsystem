import React, { useState } from 'react'
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

export default function SignupPage() {

    const navigate = useNavigate();


    const [values, setValues] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        phone: ''
    });

    const [output, setOutput] = useState('');

    const login = (e) => {
        e.preventDefault();
        //const { username, password, confirmPassword, email, phone } = values;

        axios.post('http://localhost:8000/api/createUsers', values)
            .then(() => {
                setOutput("Signup successful! Please log in.");
            })
            .catch(error => {
                setOutput("Signup failed: " + error.response.data.message);
            });
    }

    const goToLogin = (e) => {
        e.preventDefault();
        navigate('/login');
    }
    return (
        <div>
            <div>
                <form method='post' onSubmit={login}>
                    <h2>Travel System Signup</h2>
                    <div>
                        <label htmlFor="username">Username:</label>
                        <input onChange={(e) => setValues({ ...values, username: e.target.value })} type="text" id="username" name="username" required />
                    </div>
                    <div>
                        <label htmlFor="email">Email:</label>
                        <input onChange={(e) => setValues({ ...values, email: e.target.value })} type="email" id="email" name="email" required />
                    </div>
                    <div>
                        <label htmlFor="phone">Phone:</label>
                        <input onChange={(e) => setValues({ ...values, phone: e.target.value })} type="tel" id="phone" name="phone" required />
                    </div>
                    <div>
                        <label htmlFor="password">Password:</label>
                        <input onChange={(e) => setValues({ ...values, password: e.target.value })} type="password" id="password" name="password" required />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword">Confirm Password:</label>
                        <input onChange={(e) => setValues({ ...values, confirmPassword: e.target.value })} type="password" id="confirmPassword" name="confirmPassword" required />
                    </div>
                    <button type="submit">Signup</button>
                    <button onClick={goToLogin}>Go to Login</button>
                </form>
                <div>
                    <p> {output} </p>
                </div>
            </div>
        </div>
    )
}
