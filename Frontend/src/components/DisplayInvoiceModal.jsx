import React from 'react';
import { Modal, Button, ConfigProvider } from 'antd';
import '../style/displayinvoicemodal.css';

export default function DisplayInvoiceModal({ open, onCancel, onProceed, summary }) {
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
                onCancel={onCancel}
                footer={null}
                width={800}
                centered
                className="display-invoice-modal"
            >
                <div className="display-invoice-wrapper">
                    <h2 className="display-invoice-title">Booking Invoice</h2>
                    <p className="display-invoice-subtitle">
                        Please review your booking invoice before proceeding to payment.
                    </p>

                    <div className="display-invoice-card">
                        <p><strong>Package:</strong> {summary?.packageName || 'Package Details'}</p>
                        <p><strong>Travel Date:</strong> {summary?.travelDate || 'TBD'}</p>
                        <p><strong>Travelers:</strong> {summary?.travelers?.join(', ') || 'TBD'}</p>
                        <p><strong>Total Price:</strong> ₱{(summary?.totalPrice || 0).toLocaleString()}</p>
                    </div>

                    <div className="display-invoice-actions">
                        <Button
                            type="primary"
                            onClick={onProceed}
                        >
                            Proceed to Payment
                        </Button>
                        <Button
                            danger
                            onClick={onCancel}
                            style={{ marginLeft: 10 }}
                        >
                            Back
                        </Button>
                    </div>
                </div>
            </Modal>
        </ConfigProvider>
    );
}