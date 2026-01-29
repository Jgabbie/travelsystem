import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';

/**
 * ProtectedRoute - Protects routes that require authentication
 * Only authenticated non-admin users can access these routes
 * Admins are redirected to the admin dashboard
 */
const ProtectedRoute = () => {
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

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (isAdmin) {
        return <Navigate to="/admin/bookings" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;