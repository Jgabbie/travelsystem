import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';

/**
 * PublicRoute - For pages that should not be accessible to authenticated users
 * Like login and signup pages. Redirects authenticated users to home.
 */
const PublicRoute = () => {
    const { isAuthenticated, isLoading, isAdmin } = useAuth();

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <Spin size="large" />
            </div>
        );
    }

    // If user is authenticated, redirect to home (or admin if admin)
    if (isAuthenticated) {
        return <Navigate to={isAdmin ? '/admin/bookings' : '/home'} replace />;
    }

    return <Outlet />;
};

export default PublicRoute;