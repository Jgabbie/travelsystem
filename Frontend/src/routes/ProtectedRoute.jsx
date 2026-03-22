import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = () => {
    const { auth, authLoading } = useAuth();
    const location = useLocation();

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

    if (auth && auth.loginOnce === false && location.pathname !== '/user-preferences') {
        return <Navigate to="/user-preferences" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;