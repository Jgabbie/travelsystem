import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../hooks/useAuth';

const AdminRoute = () => {
    const { auth, authLoading } = useAuth();

    // const isAuthenticated = !!auth?.username; //if authenticated
    // const isAdmin = auth?.role === 'Admin'; //if authenticated user is admin

    if (authLoading && !auth) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    // Check if user is authenticated and is an admin
    if (!auth) {
        return <Navigate to="/login" replace />;
    }

    if (auth?.role !== 'Admin') {
        return <Navigate to="/home" replace />;
    }

    return <Outlet />;
};

export default AdminRoute;
