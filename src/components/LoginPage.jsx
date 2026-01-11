import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {

    const navigate = useNavigate();

    const [values, setValues] = useState({
        username: '',
        password: ''
    });

    const [output, setOutput] = useState('');

    const login = (e) => {
        e.preventDefault();
        const { username, password } = values;
        setOutput("Logging in with " + username + " and " + password);
    }

    const goToSignup = (e) => {
        e.preventDefault();
        navigate('/signup');
    }

    return (
        <div>
            <form method='post' onSubmit={login}>
                <h2>Travel System Login</h2>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input onChange={(e) => setValues({ ...values, username: e.target.value })} type="text" id="username" name="username" required />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input onChange={(e) => setValues({ ...values, password: e.target.value })} type="password" id="password" name="password" required />
                </div>
                <button type="submit">Login</button>
                <button onClick={goToSignup}>Go to Signup</button>
            </form>
            <div>
                <p> {output} </p>
            </div>
        </div>
    )
}
