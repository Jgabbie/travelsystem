import React, { useEffect, useState } from 'react';
import { Button, ConfigProvider, message } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useQuotationBooking } from '../../context/BookingQuotationContext';
import axiosInstance from '../../config/axiosConfig';


export default function SuccessfulBooking() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { setBookingData } = useBooking();
    const { clearQuotationBookingData } = useQuotationBooking();

    const [countdown, setCountdown] = useState(10);

    useEffect(() => {

        const token = searchParams.get('token');
        if (!token) {
            navigate('/home', { replace: true });
            return;
        }

        // Call backend API to verify payment using token
        axiosInstance.post(`/booking/verify-payment`, { token })
            .then(res => {
                const pdfDataUri = sessionStorage.getItem(REGISTRATION_PDF_KEY);
                const pdfFileName = sessionStorage.getItem(REGISTRATION_PDF_NAME_KEY) || 'booking-registration.pdf';

                if (pdfDataUri) {
                    const link = document.createElement('a');
                    link.href = pdfDataUri;
                    link.download = pdfFileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            })
            .catch(err => {
                console.error(err);
                message.error('Unable to verify booking.');
            });

        clearQuotationBookingData();
        setBookingData(null);

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
    }, [navigate, searchParams, setBookingData]);

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                },
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    paddingBottom: 60,
                }}
            >

                <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>

                    <div style={{ marginBottom: 24 }}>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <h1 style={{ marginBottom: 12 }}>Payment Successful</h1>
                    <p style={{ marginBottom: 24 }}>
                        Your booking has been confirmed. Your booking will appear in your account shortly once payment is verified.
                    </p>

                    <p style={{ color: 'rgba(0, 0, 0, 0.45)', marginBottom: 24 }}>
                        Redirecting to home in <strong>{countdown}</strong> seconds...
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                        <Button onClick={() => navigate('/user-bookings')}>View Bookings</Button>
                        <Button type="primary" onClick={() => navigate('/home')}>Go to Home</Button>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}
