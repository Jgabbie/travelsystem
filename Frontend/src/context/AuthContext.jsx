import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check authentication status on mount
    const checkAuth = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await axios.post(
                'http://localhost:8000/api/auth/is-auth',
                {},
                { withCredentials: true }
            );

            if (response.status === 200 && response.data) {
                setUser(response.data.user || null);
                setIsAuthenticated(true);
                setIsAdmin(response.data.user?.role === 'Admin' || false);
                setError(null);
            }
        } catch (err) {
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            setError(err.message || 'Authentication check failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial auth check
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const login = useCallback(async (credentials) => {
        try {
            const response = await axios.post(
                'http://localhost:8000/api/auth/loginUser',
                credentials,
                { withCredentials: true }
            );

            setUser(response.data.user || null);
            setIsAuthenticated(true);
            setIsAdmin(response.data.user?.role === 'Admin' || false);
            setError(null);
            return response.data;

        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Login failed';
            setError(errorMessage);
            throw err;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            setIsLoading(true);
            await axios.post(
                'http://localhost:8000/api/auth/logoutUser',
                {},
                { withCredentials: true }
            );
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            setError(null);
            setIsLoading(false);
        }
    }, []);

    const signup = useCallback(async (userData) => {
        try {
            const response = await axios.post(
                'http://localhost:8000/api/auth/signupUser',
                userData,
                { withCredentials: true }
            );
            if (response.status === 200) {
                setError(null);
                return response.data;
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'Signup failed';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value = {
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        error,
        login,
        logout,
        signup,
        checkAuth,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;