import React, { useEffect, useState } from 'react';
import { Button, ConfigProvider, Spin } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../config/axiosConfig';

export default function SuccessfulPaymentVisa() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [countdown, setCountdown] = useState(10);
    const [loading, setLoading] = useState(true);
    const [verified, setVerified] = useState(false);

    // 🔁 Poll backend until webhook updates status
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await axiosInstance.get(`/visa/applications/${id}`);

                console.log("Polling visa application status:", res.data.status);

                if (res.data.status?.some((s) => s.toLowerCase() === 'payment complete')) {
                    setVerified(true);
                    setLoading(false);
                    clearInterval(interval);
                }

            } catch (err) {
                console.error(err);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [id]);

    // ⏳ countdown after verified
    useEffect(() => {
        if (!verified) return;

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
    }, [verified, navigate]);

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>

                    {loading ? (
                        <>
                            <Spin size="large" />
                            <p style={{ marginTop: 20 }}>Verifying payment...</p>
                        </>
                    ) : (
                        <>
                            <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a', marginBottom: 24 }} />
                            <h1>Payment Successful</h1>
                            <p>Your payment has been verified successfully.</p>

                            <p style={{ color: 'rgba(0, 0, 0, 0.45)', marginBottom: 24 }}>
                                Redirecting to home in <strong>{countdown}</strong> seconds...
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                                <Button onClick={() => navigate('/user-applications')}>
                                    View Applications
                                </Button>
                                <Button type="primary" onClick={() => navigate('/home')}>
                                    Go to Home
                                </Button>
                            </div>
                        </>
                    )}

                </div>
            </div>
        </ConfigProvider>
    );
}