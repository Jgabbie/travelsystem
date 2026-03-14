import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = () => {
    const { auth, authLoading } = useAuth();

    if (authLoading) {
        return null;
    }

    if (!auth) {
        return <Navigate to="/login" replace />;
    }

    if (auth?.role === 'Admin') {
        return <Navigate to="/dashboard" replace />;
    }

    if (auth?.role === 'Employee') {
        return <Navigate to="/employee/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;