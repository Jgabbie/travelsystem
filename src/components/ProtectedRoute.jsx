import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'


const ProtectedRoute = ({ getIsAuthenticated }) => {

    // if (!getIsVerified) {
    //     return <Navigate to="/verify-account" replace />
    // }

    // if (getIsAuthenticated) {
    //     return <Navigate to="/home" replace />
    // }

    if (getIsAuthenticated) {
        return <Outlet />
    } else {
        return <Navigate to="/login" replace />
    }



}

export default ProtectedRoute