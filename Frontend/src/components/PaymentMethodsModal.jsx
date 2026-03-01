import React, { useState } from 'react';
import { Modal, Button, Radio, ConfigProvider } from 'antd';
import '../style/paymentmethodsmodal.css';

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
                        className="payment-methods-radio"
                    >
                        <Radio value="card">Credit / Debit Card</Radio>
                        <br />
                        <Radio value="gcash">GCash</Radio>
                        <br />
                        <Radio value="bank">Bank Transfer</Radio>
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