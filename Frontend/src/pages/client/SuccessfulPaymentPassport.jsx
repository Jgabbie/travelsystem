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

        const token = searchParams.get('token');
        if (!token) {
            navigate('/home', { replace: true });
            return;
        }

        // Call backend API to verify payment using token
        apiFetch.post(`/passport/verify-payment`, { token })
            .then(res => {
                console.log("Payment verification response:", res);

                if (res.success) {
                    console.log("Payment verified successfully.");
                } else {
                    console.log("Payment verification failed.");
                }
            })
            .catch(err => {
                console.error(err);
            });

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/home');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate, searchParams]);

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
                    <>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a', marginBottom: 24 }} />
                        <h1>Payment Successful</h1>
                        <p>Your payment has been verified successfully.</p>

                        <p style={{ color: 'rgba(0, 0, 0, 0.45)', marginBottom: 24 }}>
                            Redirecting to home in <strong>{countdown}</strong> seconds...
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                            <Button className='successpayment-button' type='primary' onClick={() => navigate('/user-applications')}>
                                View Applications
                            </Button>
                            <Button className='successpayment-button' type='primary' onClick={() => navigate('/home')}>
                                Go to Home
                            </Button>
                        </div>
                    </>
                </div>
            </div>
        </ConfigProvider>
    );
}