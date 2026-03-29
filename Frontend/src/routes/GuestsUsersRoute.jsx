import React from 'react'
import { Navigate, Outlet } from 'react-router-dom';
import { Spin, ConfigProvider } from 'antd';
import { useAuth } from '../hooks/useAuth';

const GuestsUsersRoute = () => {
    const { auth, authLoading } = useAuth();

    if (authLoading && !auth) {
        return (
            <ConfigProvider
                theme={{
                    token: {
                        colorPrimary: '#305797',
                    }
                }}
            >
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spin size="large" />
                </div>
            </ConfigProvider>
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