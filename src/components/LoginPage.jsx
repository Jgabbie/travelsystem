import axios from 'axios';
import React, { useContext, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';


export default function LoginPage() {

    const navigate = useNavigate();


    const [values, setValues] = useState({
        username: '',
        password: ''
    });

    const [output, setOutput] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post('http://localhost:8000/api/auth/loginUser', { username: values.username, password: values.password }, { withCredentials: true })
            setOutput("Login Successful: " + response.data.message);
            alert("Login Successful")
            navigate('/home')
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            alert(errorMsg)
        }

        // const { username, password } = values;
        // setOutput("Logging in with " + username + " and " + password);
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
            <form method='post' onSubmit={handleLogin}>
                <h2>Travel System Login</h2>
                <div>
                    <label htmlFor="username">Username:</label>
                    <input onChange={(e) => setValues({ ...values, username: e.target.value })} onKeyDown={(e) => {
                        if (!/^[A-Za-z0-9]+$/.test(e.key) || e.key === " " && e.key !== "Backspace") {
                            e.preventDefault()
                        }
                    }} type="text" id="username" name="username" required />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input onChange={(e) => setValues({ ...values, password: e.target.value })} onKeyDown={(e) => {
                        if (e.key === " " && e.key !== "Backspace") {
                            e.preventDefault()
                        }
                    }} type="password" id="password" name="password" required />
                </div>
                <button type="submit">Login</button>
                <button onClick={goToSignup}>Go to Signup</button>
                <button onClick={resetPassword}>Forget Password</button>
            </form>
            <div>
                <p> {output} </p>
            </div>
        </div>
    )
}
