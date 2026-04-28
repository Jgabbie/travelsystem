import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, ConfigProvider, Spin } from 'antd';
import apiFetch from '../../config/fetchConfig';
import '../../style/components/verifyemailpage.css';

export default function VerifyEmail() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';

    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('Verifying your email address.');
    const [isSubmitting, setIsSubmitting] = useState(true);

    useEffect(() => {
        let timeoutId;
        let isActive = true;

        const verifyAccount = async () => {
            if (!token || !email) {
                setStatus('error');
                setMessage('This verification link is missing the token or email parameter.');
                setIsSubmitting(false);
                return;
            }

            try {
                const response = await apiFetch.post('/auth/verify-account', { token, email });

                if (!isActive) {
                    return;
                }

                setStatus('success');
                setMessage(response?.message || 'Your account has been verified successfully.');
                setIsSubmitting(false);

                timeoutId = window.setTimeout(() => {
                    navigate('/home', { replace: true });
                }, 2500);
            } catch (err) {
                if (!isActive) {
                    return;
                }

                const errorMessage = err?.data?.message || 'Verification failed. Please request a new link.';
                setStatus('error');
                setMessage(errorMessage);
                setIsSubmitting(false);
            }
        };

        verifyAccount();

        return () => {
            isActive = false;
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [email, navigate, token]);

    const statusLabel = status === 'success' ? 'Verified' : status === 'error' ? 'Unable to verify' : 'Checking link';

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                },
            }}
        >
            <div className="verify-email-page">
                <div className="verify-email-bg verify-email-bg--one" />
                <div className="verify-email-bg verify-email-bg--two" />

                <div className="verify-email-shell">
                    <div className="verify-email-card">
                        <div className={`verify-email-badge verify-email-badge--${status}`}>
                            {statusLabel}
                        </div>

                        <h1 className="verify-email-title">Verify your email</h1>
                        <p className="verify-email-copy">{message}</p>

                        <div className="verify-email-spinner-wrap">
                            <Spin spinning={isSubmitting} tip="Please wait..." size="large">
                                <div className="verify-email-spinner-placeholder" />
                            </Spin>
                        </div>

                        <div className="verify-email-actions">
                            <Button
                                className="verify-email-primary-btn"
                                type="primary"
                                onClick={() => navigate('/home', { replace: true })}
                            >
                                Go to Home
                            </Button>

                            {status === 'error' && (
                                <Button
                                    className="verify-email-secondary-btn"
                                    onClick={() => window.location.reload()}
                                >
                                    Try Again
                                </Button>
                            )}
                        </div>

                        <p className="verify-email-footnote">
                            If you keep seeing this message, request a new verification email from the signup flow.
                        </p>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}
