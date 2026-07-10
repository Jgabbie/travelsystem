import React, { useEffect, useState } from 'react';
import { Button, ConfigProvider, Spin, message } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiFetch from '../../config/fetchConfig';
import '../../style/client/successfulpaymentpage.css';

export default function SuccessfulPaymentPassport() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        // token handled outside render; this effect assumes token exists
        const token = searchParams.get('token');
        if (!token) {
            navigate('/home', { replace: true });
            return;
        }


        window.history.pushState(null, '', window.location.href);

        const handleBrowserBack = () => {
            window.history.pushState(null, '', window.location.href);
        };

        window.addEventListener('popstate', handleBrowserBack);


        // Call backend API to verify payment using token
        apiFetch.post(`/passport/verify-payment`, { token })
            .then(res => {
                if (res.success) {
                    console.success("Payment verified successfully.");
                } else {
                    console.error("Payment verification failed.");
                }
            })
            .catch(err => {
                console.error(err);
            });


        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/home', { replace: true });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate, searchParams]);

    // Prevent initial render flash when token is missing — compute synchronously
    const token = searchParams.get('token');
    if (!token) return null;

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            <div className="successpayment-page">
                <div className="successpayment-content">
                    <CheckCircleFilled className="successpayment-icon" />

                    <h1 className="successpayment-title">Payment Successful</h1>
                    <p className="successpayment-message">
                        Your payment has been verified successfully.
                    </p>

                    <p className="successpayment-redirect">
                        Redirecting to home in <strong>{countdown}</strong> seconds...
                    </p>

                    <div className="successpayment-actions">
                        <Button
                            className="successpayment-button"
                            type="primary"
                            onClick={() => navigate('/user-applications', { replace: true })}
                        >
                            View Applications
                        </Button>
                        <Button
                            className="successpayment-button"
                            type="primary"
                            onClick={() => navigate('/home', { replace: true })}
                        >
                            Go to Home
                        </Button>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}