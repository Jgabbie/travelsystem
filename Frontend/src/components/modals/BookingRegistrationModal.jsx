import React, { useState } from 'react';
import { Modal, Button, Checkbox, ConfigProvider } from 'antd';
import '../../style/components/modals/bookingregistrationmodal.css';

export default function BookingRegistrationModal({
    open,
    onCancel,
    onProceed,
    packageData
}) {
    const [agreed, setAgreed] = useState(false);

    const handleProceed = () => {
        if (!agreed) return;
        onProceed?.();
    };

    const handleCancel = () => {
        setAgreed(false);
        onCancel?.();
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <Modal
                open={open}
                onCancel={handleCancel}
                footer={null}
                width={800}
                centered
                className="booking-registration-modal"
            >
                <div className="booking-registration-wrapper">
                    <h2 className="booking-registration-title">Booking Registration</h2>

                    {/* Package Summary */}
                    {packageData && (
                        <div className="booking-registration-package">
                            <h3>{packageData.packageName}</h3>
                            <p>Duration: {packageData.packageDuration} days</p>
                            <p>Price per pax: ₱{packageData.packagePricePerPax?.toLocaleString()}</p>
                        </div>
                    )}

                    {/* Terms & Conditions */}
                    <div className="booking-registration-section">
                        <h3>Terms and Conditions</h3>
                        <p>
                            By booking this package, you agree to follow all rules and regulations
                            set forth by our service. Please read carefully.
                        </p>
                    </div>

                    {/* Cancellation Policy */}
                    <div className="booking-registration-section">
                        <h3>Cancellation Policy</h3>
                        <p>
                            Cancellations within 24 hours of booking receive a full refund.
                            Cancellations after that are non-refundable.
                        </p>
                    </div>

                    {/* Agree Checkbox */}
                    <Checkbox
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="booking-registration-checkbox"
                    >
                        I have read and agree to all terms and conditions
                    </Checkbox>

                    {/* Action Buttons */}
                    <div className="booking-registration-actions">
                        <Button
                            type="primary"
                            onClick={handleProceed}
                            disabled={!agreed}
                        >
                            Proceed
                        </Button>
                        <Button
                            onClick={handleCancel}
                            danger
                            style={{ marginLeft: 10 }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>
        </ConfigProvider>
    );
}