import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const PublicRoute = () => {
    const { auth } = useAuth();

    // const isAuthenticated = !!auth?.username; //if authenticated
    // const isAdmin = auth?.role === 'Admin'; //if authenticated user is admin

    // If user is authenticated, redirect to home (or admin if admin)
    if (auth) {
        return <Navigate to={auth.role === 'Admin' ? '/dashboard' : '/home'} replace />;
    }

    return <Outlet />;
};

export default PublicRoute;