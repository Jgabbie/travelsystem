import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const PublicRoute = () => {
    const { auth } = useAuth();

    const isAuthenticated = auth && auth.accessToken; //if authenticated
    const isAdmin = auth && auth.role === 'Admin'; //if authenticated user is admin

    // If user is authenticated, redirect to home (or admin if admin)
    if (isAuthenticated) {
        return <Navigate to={isAdmin ? '/dashboard' : '/home'} replace />;
    }

    return <Outlet />;
};

export default PublicRoute;