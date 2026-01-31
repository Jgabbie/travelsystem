import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axiosConfig';

//use axiosInstance to make the code cleaner
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState({}); //if user is logged in

    //wraps the children components so the the values can be accessed
    //children is the <App/> component stored in index.js
    return (
        <AuthContext.Provider value={{ auth, setAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;