import React, { useState } from 'react';
import { Modal, Button, Radio, ConfigProvider } from 'antd';
import '../../style/components/modals/paymentmethodsmodal.css';

export default function PaymentMethodsModal({ open, onCancel, onProceed }) {
    const [method, setMethod] = useState('card');

    const handleProceed = () => {
        onProceed?.(method);
    };

    const handleCancel = () => {
        setMethod('card');
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
                className="payment-methods-modal"
            >
                <div className="payment-methods-wrapper">
                    <h2 className="payment-methods-title">Payment Methods</h2>
                    <p className="payment-methods-subtitle">
                        Select a payment method to complete your booking.
                    </p>

                    <Radio.Group
                        onChange={(e) => setMethod(e.target.value)}
                        value={method}
                        className="payment-methods-cards"
                    >
                        <Radio value="card" className={`payment-card ${method === "card" ? "selected" : ""}`}>
                            <div>
                                <h3>Paymongo</h3>
                                <p>Pay through using the Paymongo Gateway. Rates depends in the transaction method.</p>
                            </div>
                        </Radio>

                        <Radio value="gcash" className={`payment-card ${method === "gcash" ? "selected" : ""}`}>
                            <div>
                                <h3>Pay through Bank Account</h3>
                                <p>Pay using bank transfer. Payment proof/receipt must be uploaded, payment transaction will be reviewed.</p>
                            </div>
                        </Radio>
                    </Radio.Group>

                    <div className="payment-methods-actions">
                        <Button
                            type="primary"
                            onClick={handleProceed}
                        >
                            Confirm Payment
                        </Button>
                        <Button
                            danger
                            onClick={handleCancel}
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