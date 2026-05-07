import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { Button, Modal } from 'antd';
import apiFetch from '../config/fetchConfig';
import "../style/components/modals/modaldesign.css";


const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState(null); //if user is logged in
    const [authLoading, setAuthLoading] = useState(true);
    const [idleLogoutModalOpen, setIdleLogoutModalOpen] = useState(false);
    const [idleLogoutMessage, setIdleLogoutMessage] = useState('');
    const lastActivityRef = useRef(Date.now());
    const touchInFlightRef = useRef(false);

    const isIdleLogoutError = useCallback((err) => {
        return Boolean(err?.data?.idleLogout) || err?.status === 401 && (err?.data?.message || err?.message || '').includes('idling');
    }, []);

    const triggerIdleLogout = useCallback((message) => {
        setAuth(null);
        setIdleLogoutMessage(message || 'You have been logged out by the system for idling');
        setIdleLogoutModalOpen(true);
    }, []);

    const syncAuthFromResponse = useCallback((res) => {
        const { user } = res;
        setAuth({
            username: user.username,
            firstname: user.firstName,
            lastname: user.lastName,
            role: user.role,
            profileImage: user.profileImage,
            loginOnce: user.loginOnce
        });
    }, []);


    const touchSession = useCallback(async () => {
        if (touchInFlightRef.current) {
            return;
        }

        touchInFlightRef.current = true;
        try {
            await apiFetch.get('/auth/is-auth', {
                withCredentials: true
            });
        } catch (err) {
            console.error("Session touch failed:", err);
            if (isIdleLogoutError(err)) {
                triggerIdleLogout(err?.data?.message);
                return;
            }

            setAuth(null);
        } finally {
            touchInFlightRef.current = false;
        }
    }, [isIdleLogoutError, triggerIdleLogout]);

    const checkAuth = useCallback(async () => {
        setAuthLoading(true);
        try {
            const res = await apiFetch.get('/auth/is-auth', {
                withCredentials: true
            });

            syncAuthFromResponse(res);
        } catch (err) {
            console.error("Auth check failed:", err);
            if (isIdleLogoutError(err)) {
                triggerIdleLogout(err?.data?.message);
                return;
            }

            setAuth(null);
        } finally {
            setAuthLoading(false);
        }
    }, [isIdleLogoutError, syncAuthFromResponse, triggerIdleLogout]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    useEffect(() => {
        const handleIdleLogout = (event) => {
            const message = event?.detail?.message || 'You have been logged out by the system for idling';
            triggerIdleLogout(message);
        };

        window.addEventListener('auth:idle-logout', handleIdleLogout);
        return () => {
            window.removeEventListener('auth:idle-logout', handleIdleLogout);
        };
    }, [triggerIdleLogout]);

    useEffect(() => {
        if (!auth) {
            lastActivityRef.current = Date.now();
            return undefined;
        }

        const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        const heartbeatIntervalMs = 15 * 60 * 1000;

        const markActivity = () => {
            lastActivityRef.current = Date.now();
        };

        const handleActivity = () => {
            markActivity();
        };

        activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
        window.addEventListener('focus', handleActivity);

        const heartbeatId = window.setInterval(() => {
            if (Date.now() - lastActivityRef.current <= heartbeatIntervalMs) {
                touchSession();
            }
        }, heartbeatIntervalMs);

        return () => {
            activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
            window.removeEventListener('focus', handleActivity);
            window.clearInterval(heartbeatId);
        };
    }, [auth, touchSession]);

    //wraps the children components so the the values can be accessed
    //children is the <App/> component stored in index.js
    return (
        <AuthContext.Provider value={{ auth, setAuth, authLoading, checkAuth }}>
            {children}

            <Modal
                open={idleLogoutModalOpen}
                closable={false}
                centered
                footer={null}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Logged Out</h1>

                    <p className='modal-text'>You have been logged out due to inactivity. Reload the page.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIdleLogoutModalOpen(false);
                                window.location.reload();
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>
        </AuthContext.Provider>
    );
};

export default AuthContext;