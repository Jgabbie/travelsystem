import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axiosConfig';


//use axiosInstance to make the code cleaner
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); //store user
    const [isAuthenticated, setIsAuthenticated] = useState(false); //if user is logged in
    const [isAdmin, setIsAdmin] = useState(false); //if user is admin
    const [isLoading, setIsLoading] = useState(true); //loading state while checking auth or performing the login, logout, signup functions
    const [error, setError] = useState(null); //store error


    //just check if user is logged in or not
    const checkAuth = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await axiosInstance.post(
                '/auth/is-auth'
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
        } finally {
            setIsLoading(false);
        }
    }, []);

    //this runs every render of a page
    useEffect(() => {
        const auth = async () => {
            try {
                await checkAuth();
            } catch (err) {
                console.error("Auth check failed:", err);
            }
        }
        auth();
    }, []);


    //logs in the user
    const login = useCallback(async (credentials) => {
        try {
            const response = await axiosInstance.post(
                '/auth/loginUser',
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

    //logs out the user
    const logout = useCallback(async () => {
        try {
            setIsLoading(true);
            await axiosInstance.post(
                '/auth/logoutUser',
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

    //signs up the user
    const signup = useCallback(async (userData) => {
        try {
            const response = await axiosInstance.post(
                '/auth/signupUser',
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

    //clear error state
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    //these are values that can be accessible by using useAuth()
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

    //wraps the children components so the the values can be accessed
    //children is the <App/> component stored in index.js
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// to use the auth context in other components and destructure the values
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;