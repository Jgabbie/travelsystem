import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'


const PublicRoute = (props) => {
    return props.getIsAuthenticated ? <Navigate to="/home" replace /> : props.children
}


export default PublicRoute