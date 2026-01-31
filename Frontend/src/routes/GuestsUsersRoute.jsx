import React from 'react'
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const GuestsUsersRoute = () => {
    const { auth } = useAuth();

    const isAuthenticated = auth && auth.accessToken; //if authenticated
    const isAdmin = auth && auth.role === 'Admin'; //if authenticated user is admin

    if (isAdmin && isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default GuestsUsersRoute;