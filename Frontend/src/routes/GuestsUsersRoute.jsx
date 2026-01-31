import React from 'react'
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const GuestsUsersRoute = () => {
    const { auth } = useAuth();

    // const isAuthenticated = !!auth?.username; //if authenticated
    // const isAdmin = auth?.role === 'Admin'; //if authenticated user is admin

    if (auth?.role === "Admin" && auth) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default GuestsUsersRoute;