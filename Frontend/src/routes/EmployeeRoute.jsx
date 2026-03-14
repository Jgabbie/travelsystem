import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const EmployeeRoute = () => {
    const { auth } = useAuth();

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
