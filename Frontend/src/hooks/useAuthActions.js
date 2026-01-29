import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { message } from 'antd';

/**
 * useAuthActions - Hook for common authentication-related actions
 * Provides convenient methods for login, logout, and navigation
 */
export const useAuthActions = () => {
    const { login, logout, isLoading, error, clearError } = useAuth();
    const navigate = useNavigate();

    const handleLogin = useCallback(async (credentials) => {
        try {
            clearError();
            const response = await login(credentials);
            message.success('Login successful!');
            return response;
        } catch (err) {
            const errorMsg = error || err.message || 'Login failed';
            message.error(errorMsg);
            throw err;
        }
    }, [login, error, clearError]);

    const handleLogout = useCallback(async () => {
        try {
            clearError();
            await logout();
            message.success('Logged out successfully');
            navigate('/login');
        } catch (err) {
            const errorMsg = error || err.message || 'Logout failed';
            message.error(errorMsg);
        }
    }, [logout, error, clearError, navigate]);

    const handleSignup = useCallback(async (userData) => {
        try {
            clearError();
            message.success('Account created! Please log in.');
            navigate('/login');
        } catch (err) {
            const errorMsg = error || err.message || 'Signup failed';
            message.error(errorMsg);
            throw err;
        }
    }, [error, clearError, navigate]);

    return {
        handleLogin,
        handleLogout,
        handleSignup,
        isLoading,
        error,
        clearError,
    };
};

/**
 * useRequireAuth - Hook to ensure user is authenticated
 * Can redirect to login if not authenticated
 */
export const useRequireAuth = () => {
    const { isAuthenticated, isLoading, user } = useAuth();
    const navigate = useNavigate();

    if (!isLoading && !isAuthenticated) {
        navigate('/login');
    }

    return {
        isAuthenticated,
        isLoading,
        user,
    };
};

/**
 * useRequireAdmin - Hook to ensure user is admin
 * Can redirect if not admin
 */
export const useRequireAdmin = () => {
    const { isAdmin, isAuthenticated, isLoading, user } = useAuth();
    const navigate = useNavigate();

    if (!isLoading && !isAdmin) {
        if (!isAuthenticated) {
            navigate('/login');
        } else {
            navigate('/home');
        }
    }

    return {
        isAdmin,
        isAuthenticated,
        isLoading,
        user,
    };
};

export default useAuthActions;