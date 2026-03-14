import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const PublicRoute = () => {
    const { auth } = useAuth();

    // const isAuthenticated = !!auth?.username; //if authenticated
    // const isAdmin = auth?.role === 'Admin'; //if authenticated user is admin

    // If user is authenticated, redirect by role
    if (auth) {
        if (auth.role === 'Admin') {
            return <Navigate to="/dashboard" replace />;
        }
        if (auth.role === 'Employee') {
            return <Navigate to="/employee/dashboard" replace />;
        }
        return <Navigate to="/home" replace />;
    }

    return <Outlet />;
};

export default PublicRoute;