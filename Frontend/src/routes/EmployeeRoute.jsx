import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spin, ConfigProvider } from 'antd';
import { useAuth } from '../hooks/useAuth';

const EmployeeRoute = () => {
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

    if (!auth) {
        return <Navigate to="/login" replace />;
    }

    if (auth?.role !== 'Employee') {
        const redirectPath = auth?.role === 'Admin' ? '/dashboard' : '/home';
        return <Navigate to={redirectPath} replace />;
    }

    return <Outlet />;
};

export default EmployeeRoute;
