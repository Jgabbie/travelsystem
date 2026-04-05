import React, { useState } from 'react';
import { Input, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';
import '../../style/components/mrcquotation.css';

export default function QuotationFormDetails({
    quotationData,
    formData,
    setFormData,
    formErrors
}) {

    const handleImageUpload = (file, key) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';

        if (!isJpgOrPng) {
            message.error('Only JPG or PNG files are allowed.');
            return Upload.LIST_IGNORE;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result?.toString() || '';

            setFormData(prev => ({
                ...prev,
                [key]: base64
            }));
        };

        reader.readAsDataURL(file);

        return false;
    };

    const formatDateValue = (value) => {
        const parsed = dayjs(value);
        if (!parsed.isValid()) {
            return value;
        }
        return parsed.format('MMM DD, YYYY');
    };

    const formatTravelDates = (value) => {
        if (!value) return 'N/A';

        if (Array.isArray(value)) {
            if (value.length === 2) {
                return `${formatDateValue(value[0])} - ${formatDateValue(value[1])}`;
            }
            return value.map((item) => formatDateValue(item)).join(', ');
        }

        if (typeof value === 'object') {
            const start = value.startDate || value.startdaterange || value.start;
            const end = value.endDate || value.enddaterange || value.end;
            if (start && end) {
                return `${formatDateValue(start)} - ${formatDateValue(end)}`;
            }
        }

        return formatDateValue(value);
    };


    const packageRows = [
        { label: 'TRAVEL PACKAGE', value: quotationData.packageName, emphasis: true },
        { label: 'TRAVEL DATES', value: formatTravelDates(quotationData.travelDates) },
        { label: 'HOTEL', value: quotationData.hotel },
        {
            label: 'ROOM/S (NO./TYPE)',
            value: (
                <div>
                    <Input
                        size="small"
                        className="mrc-tour-details-input"
                        placeholder="1 STUDIO TWIN ROOM"
                        value={formData.roomType}
                        onChange={(e) =>
                            setFormData(prev => ({ ...prev, roomType: e.target.value }))
                        }
                        style={formErrors.roomType ? { borderColor: '#ff4d4f' } : undefined}
                    />
                    {formErrors.roomType ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.roomType}</div>
                    ) : null}
                </div>
            )
        },
        { label: 'AIRLINE', value: quotationData.airline },
        {
            label: 'BAGGAGE ALLOWANCE',
            value: (
                <div>
                    <Input
                        size="small"
                        className="mrc-tour-details-input"
                        placeholder="HANDCARRY: 1PC. 7KGS/PERSON | CHECK IN: N/A"
                        value={formData.baggageAllowance}
                        onChange={(e) =>
                            setFormData(prev => ({ ...prev, baggageAllowance: e.target.value }))
                        }
                        style={formErrors.baggageAllowance ? { borderColor: '#ff4d4f' } : undefined}
                    />
                    {formErrors.baggageAllowance ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.baggageAllowance}</div>
                    ) : null}
                </div>
            )
        },
        { label: 'PH TRAVEL TAX OF PHP 1620', value: 'EXCLUDED', danger: true },
        { label: 'AIRPORT TERMINAL FEE', value: 'INCLUDED' },
        {
            label: 'TOTAL RATE PER PERSON (QUOTED FOR A MINIMUM OF 3 | VAT EXCLUSIVE)',
            value: (
                <div>
                    <Input
                        size="small"
                        className="mrc-tour-details-input"
                        placeholder="ADULTS: PHP 46,888/PAX"
                        value={formData.totalRate}
                        onChange={(e) =>
                            setFormData(prev => ({ ...prev, totalRate: e.target.value }))
                        }
                        style={formErrors.totalRate ? { borderColor: '#ff4d4f' } : undefined}
                    />
                    {formErrors.totalRate ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.totalRate}</div>
                    ) : null}
                </div>
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
                                    {formData.flightImageA ? (
                                        <img
                                            src={formData.flightImageA}
                                            alt="Flight Upload 1"
                                            style={{ width: 240, height: 150, objectFit: 'cover', borderRadius: 8 }}
                                        />
                                    ) : (
                                        <Upload
                                            showUploadList={false}
                                            beforeUpload={(file) => handleImageUpload(file, 'flightImageA')}
                                            accept=".jpg,.jpeg,.png"
                                        >
                                            <Button icon={<UploadOutlined />}>
                                                Upload Flight Image 1
                                            </Button>
                                            {formErrors.flightImageA && (
                                                <div style={{ color: '#ff4d4f', fontSize: 11 }}>
                                                    {formErrors.flightImageA}
                                                </div>
                                            )}
                                        </Upload>
                                    )}
                                </div>

                                <div>
                                    {formData.flightImageB ? (
                                        <img
                                            src={formData.flightImageB}
                                            alt="Flight Upload 2"
                                            style={{ width: 240, height: 150, objectFit: 'cover', borderRadius: 8 }}
                                        />
                                    ) : (
                                        <Upload
                                            showUploadList={false}
                                            beforeUpload={(file) => handleImageUpload(file, 'flightImageB')}
                                            accept=".jpg,.jpeg,.png"
                                        >
                                            <Button icon={<UploadOutlined />}>
                                                Upload Flight Image 2
                                            </Button>
                                            {formErrors.flightImageB && (
                                                <div style={{ color: '#ff4d4f', fontSize: 11 }}>
                                                    {formErrors.flightImageB}
                                                </div>
                                            )}
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
