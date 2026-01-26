import React from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import LandingPage from './LandingPage'
import PublicRoute from './PublicRoute'
import LoginPage from './LoginPage'
import SignupPage from './SignupPage'

export default function WebRoutes(props) {
    const navigate = useNavigate()


    const login = () => {
        props.setIsAuthenticated(true)
        navigate("/home", { replace: true })
    }

    const logout = () => {
        props.setIsAuthenticated(false)
        navigate("/login", { replace: true })
    }

    return (
        <Routes>
            <Route element={
                <ProtectedRoute is getIsAuthenticated={props.getIsAuthenticated} />}>
                <Route path="/home" element={<LandingPage logout={logout} />} />
            </Route>


            <Route path="/login" element={
                <PublicRoute getIsAuthenticated={props.getIsAuthenticated}>
                    <LoginPage login={login} />
                </PublicRoute>
            }
            />

            <Route path="/signup" element={
                <PublicRoute getIsAuthenticated={props.getIsAuthenticated}>
                    <SignupPage />
                </PublicRoute>
            }
            />

            <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
    )
}
