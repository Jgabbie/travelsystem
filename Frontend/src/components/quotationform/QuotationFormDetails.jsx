import React, { useState } from 'react';
import { Input, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import '../../style/components/mrcregistration.css';
import '../../style/components/mrcquotation.css';

export default function QuotationFormDetails({ quotationData }) {
    const [flightImageA, setFlightImageA] = useState('');
    const [flightImageB, setFlightImageB] = useState('');

    const handleImageUpload = (file, setImage) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('Only JPG or PNG files are allowed.');
            return Upload.LIST_IGNORE;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImage(reader.result?.toString() || '');
        };
        reader.readAsDataURL(file);

        return false;
    };

    const packageRows = [
        { label: 'TRAVEL PACKAGE', value: quotationData.packageName, emphasis: true },
        { label: 'TRAVEL DATES', value: quotationData.travelDates },
        { label: 'HOTEL', value: quotationData.hotel },
        {
            label: 'ROOM/S (NO./TYPE)',
            value: (
                <Input
                    size="small"
                    className="mrc-tour-details-input"
                    placeholder="1 STUDIO TWIN ROOM"
                />
            )
        },
        { label: 'AIRLINE', value: quotationData.airline },
        {
            label: 'BAGGAGE ALLOWANCE',
            value: (
                <Input
                    size="small"
                    className="mrc-tour-details-input"
                    placeholder="HANDCARRY: 1PC. 7KGS/PERSON | CHECK IN: N/A"
                />
            )
        },
        { label: 'PH TRAVEL TAX OF PHP 1620', value: 'EXCLUDED', danger: true },
        { label: 'AIRPORT TERMINAL FEE', value: 'INCLUDED' },
        {
            label: 'TOTAL RATE PER PERSON (QUOTED FOR A MINIMUM OF 3 | VAT EXCLUSIVE)',
            value: (
                <Input
                    size="small"
                    className="mrc-tour-details-input"
                    placeholder="ADULTS: PHP 46,888/PAX"
                />
            ),
            emphasis: true,
        },
    ];

    const flights = [];

    return (
        <div className="mrc-overlay-wrapper">
            <div className="mrc-form-page mrc-quotation-page">
                <div className="mrc-form-header">
                    <img src="/images/Logo.png" alt="MRC Travel Logo" className="mrc-logo" />
                </div>

                <div className="mrc-quotation-intro">
                    <p>Dear Ma&apos;am/ Sir,</p>
                    <p>
                        Greetings from M&amp;RC Travel and Tours! We are pleased to offer our quotation for your
                        {" " + quotationData.packageName} on below schedule. Rates are as follows:
                    </p>
                </div>

                <div className="mrc-quotation-table">
                    {packageRows.map((row) => (
                        <div
                            key={row.label}
                            className={`mrc-quotation-row${row.emphasis ? ' is-emphasis' : ''}${row.danger ? ' is-danger' : ''}`}
                        >
                            <div className="mrc-quotation-label">{row.label}</div>
                            <div className="mrc-quotation-value">{row.value}</div>
                        </div>
                    ))}
                </div>

                <div className="mrc-flight-details">
                    <div className="mrc-flight-header">FLIGHT DETAILS: (SUBJECT TO CHANGE WITHOUT PRIOR NOTICE)</div>
                    <div className="mrc-flight-grid">
                        {flights.map((flight) => (
                            <div key={flight.title} className="mrc-flight-card">
                                <div className="mrc-flight-title">{flight.title}</div>
                                <div className="mrc-flight-route">{flight.route}</div>
                                <div className="mrc-flight-airline">
                                    <span className="mrc-flight-airline-dot" aria-hidden="true" />
                                    <div>
                                        <div>{flight.airline}</div>
                                        <div className="mrc-flight-no">{flight.flightNo}</div>
                                    </div>
                                </div>
                                <div className="mrc-flight-date">{flight.date}</div>
                            </div>
                        ))}
                        {flights.length === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flexWrap: 'wrap' }}>
                                <div>
                                    {flightImageA ? (
                                        <img
                                            src={flightImageA}
                                            alt="Flight Upload 1"
                                            style={{ width: 240, height: 150, objectFit: 'cover', borderRadius: 8 }}
                                        />
                                    ) : (
                                        <Upload
                                            showUploadList={false}
                                            beforeUpload={(file) => handleImageUpload(file, setFlightImageA)}
                                            accept=".jpg,.jpeg,.png"
                                        >
                                            <Button icon={<UploadOutlined />}>
                                                Upload Flight Image 1
                                            </Button>
                                        </Upload>
                                    )}
                                </div>

                                <div>
                                    {flightImageB ? (
                                        <img
                                            src={flightImageB}
                                            alt="Flight Upload 2"
                                            style={{ width: 240, height: 150, objectFit: 'cover', borderRadius: 8 }}
                                        />
                                    ) : (
                                        <Upload
                                            showUploadList={false}
                                            beforeUpload={(file) => handleImageUpload(file, setFlightImageB)}
                                            accept=".jpg,.jpeg,.png"
                                        >
                                            <Button icon={<UploadOutlined />}>
                                                Upload Flight Image 2
                                            </Button>
                                        </Upload>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
