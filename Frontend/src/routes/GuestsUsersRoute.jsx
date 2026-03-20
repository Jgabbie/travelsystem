import React from 'react'
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../hooks/useAuth';

const GuestsUsersRoute = () => {
    const { auth, authLoading } = useAuth();

    if (authLoading && !auth) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (auth?.role === "Admin") {
        return <Navigate to="/dashboard" replace />;
    }

    if (auth?.role === "Employee") {
        return <Navigate to="/employee/dashboard" replace />;
    }

    return <Outlet />;
};

export default GuestsUsersRoute;