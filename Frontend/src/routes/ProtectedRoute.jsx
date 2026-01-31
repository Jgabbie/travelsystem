import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = () => {
    const { auth } = useAuth();

    const isAuthenticated = auth && auth.accessToken; //if authenticated
    const isAdmin = auth && auth.role === 'Admin'; //if authenticated user is admin

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;