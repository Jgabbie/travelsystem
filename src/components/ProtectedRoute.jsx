import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'


const ProtectedRoute = (props) => {
    return (
        props.getIsAuthenticated ?
            <Outlet /> : <Navigate to="/" />
    )
}

export default ProtectedRoute