import axios from 'axios'
import React from 'react'
import { useNavigate } from 'react-router-dom'



export default function LandingPage() {

    const navigate = useNavigate()


    const goToSignup = (e) => {
        e.preventDefault();
        navigate('/signup');
    }

    const logout = async (e) => {
        e.preventDefault()
        try {
            const response = await axios.post('http://localhost:8000/api/auth/logoutUser', {}, { withCredentials: true })
            alert("Logout Successful")
            navigate('/login')
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
            alert(errorMsg)

        }
    }

    return (
        <div>
            <h1>Welcome to the Travel System</h1>
            <button onClick={goToSignup}>
                GO TO SIGNUP
            </button>

            <button onClick={logout}>
                LOGOUT
            </button>


        </div>
    )
}
