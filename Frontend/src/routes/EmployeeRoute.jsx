import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../hooks/useAuth';

const EmployeeRoute = () => {
    const { auth, authLoading } = useAuth();

    if (authLoading && !auth) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
            </div>
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
