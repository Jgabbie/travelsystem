import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spin } from 'antd';

/**
 * AdminRoute - Protects routes that require admin access
 * Only authenticated admin users can access these routes
 */
const AdminRoute = () => {
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
