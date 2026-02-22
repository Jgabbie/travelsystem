import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = () => {
    const { auth, authLoading } = useAuth();

    // const isAuthenticated = !!auth?.username; //if authenticated
    // const isAdmin = auth?.role === 'Admin'; //if authenticated user is admin

    if (authLoading) {
        return null;
    }

    if (!auth) {
        return <Navigate to="/login" replace />;
    }

    if (auth?.role === 'Admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;