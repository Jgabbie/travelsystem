import React, { useEffect, useState } from 'react';
import { Button, ConfigProvider } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useQuotationBooking } from '../../context/BookingQuotationContext';
import apiFetch from '../../config/fetchConfig';
import '../../style/client/successfulpaymentpage.css';


export default function SuccessfulBooking() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { clearBookingData } = useBooking();
    const { clearQuotationBookingData } = useQuotationBooking();

    const [countdown, setCountdown] = useState(10);


    // Put it here
    useEffect(() => {
        const handleBrowserBack = () => {
            navigate('/user-bookings', { replace: true });
        };

        window.addEventListener('popstate', handleBrowserBack);

        return () => {
            window.removeEventListener('popstate', handleBrowserBack);
        };
    }, [navigate]);


    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            navigate('/home', { replace: true });
            return;
        }


        // Call backend API to verify payment using token
        apiFetch.post(`/booking/verify-payment`, { token })
            .then(res => {
                clearQuotationBookingData();
                clearBookingData();

                sessionStorage.removeItem(PAYMENT_STATE_KEY);
                sessionStorage.removeItem("returningFromPayMongo");
            })
            .catch(err => {
                console.error(err);
                //notification.error({ message: 'Unable to verify booking.', placement: 'topRight' });
            });

        // Ensure local state is cleared regardless
        clearQuotationBookingData();
        clearBookingData();


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

        return () => {
            clearInterval(timer);
        };
    }, [navigate, searchParams, clearBookingData, clearQuotationBookingData]);

    const token = searchParams.get('token');
    if (!token) return null;

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                },
            }}
        >
            <div className="successpayment-page successpayment-page-booking">
                <div className="successpayment-content">
                    <CheckCircleFilled className="successpayment-icon" />

                    <h1 className="successpayment-title">Payment Successful</h1>
                    <p className="successpayment-message">
                        Your booking has been confirmed. Your booking will appear in your account shortly once payment is verified.
                    </p>

                    <p className="successpayment-redirect">
                        Redirecting to home in <strong>{countdown}</strong> seconds...
                    </p>

                    <div className="successpayment-actions">
                        <Button
                            className="successpayment-button"
                            type="primary"
                            onClick={() => navigate('/user-bookings', { replace: true })}
                        >
                            View Bookings
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
