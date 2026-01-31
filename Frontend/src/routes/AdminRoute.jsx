import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AdminRoute = () => {
    const { auth } = useAuth();

    const isAuthenticated = auth && auth.accessToken; //if authenticated
    const isAdmin = auth && auth.role === 'Admin'; //if authenticated user is admin

    // Check if user is authenticated and is an admin
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/home" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
