import React, { useEffect } from 'react';
import { Input, Upload, Button, message } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';
import '../../style/components/mrcquotation.css';

export default function QuotationFormDetails({
    quotationData,
    formData,
    setFormData,
    formErrors
}) {


    const parseTravelerCounts = (value) => {
        if (!value) return { adult: 0, child: 0, infant: 0, total: 0 };

        if (typeof value === 'number') {
            return { adult: value, child: 0, infant: 0, total: value };
        }

        if (typeof value === 'object') {
            const adult = Number(value.adult) || 0;
            const child = Number(value.child) || 0;
            const infant = Number(value.infant) || 0;
            return { adult, child, infant, total: adult + child + infant };
        }

        const raw = String(value).trim();
        if (!raw) return { adult: 0, child: 0, infant: 0, total: 0 };

        if (/^\d+$/.test(raw)) {
            const total = Number(raw) || 0;
            return { adult: total, child: 0, infant: 0, total };
        }

        const adultMatch = raw.match(/adult\s*:\s*(\d+)/i);
        const childMatch = raw.match(/child\s*:\s*(\d+)/i);
        const infantMatch = raw.match(/infant\s*:\s*(\d+)/i);
        const adult = adultMatch ? Number(adultMatch[1]) : 0;
        const child = childMatch ? Number(childMatch[1]) : 0;
        const infant = infantMatch ? Number(infantMatch[1]) : 0;

        return { adult, child, infant, total: adult + child + infant };
    };

    //total price calculation
    const calculateTotalPrice = () => {
        const totalRate = parseFloat(formData.totalRate) || 0;
        const totalChildRate = parseFloat(formData.totalChildRate) || 0;
        const totalInfantRate = parseFloat(formData.totalInfantRate) || 0;
        const counts = parseTravelerCounts(formData.travelers);

        return (totalRate * counts.adult)
            + (totalChildRate * counts.child)
            + (totalInfantRate * counts.infant);
    };

    if (!formData.dynamicRows) setFormData(prev => ({ ...prev, dynamicRows: [] }));

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


    const travelerCounts = parseTravelerCounts(formData.travelers);
    const isSoloTraveler = travelerCounts.total <= 1 && travelerCounts.child === 0 && travelerCounts.infant === 0;
    const isLandArrangement = (quotationData.packageCategory || '').toLowerCase() === 'land arrangement';

    useEffect(() => {
        if (!isLandArrangement) return;

        setFormData(prev => ({
            ...prev,
            flightImageA: prev.flightImageA || 'No Image, Land Arrangement',
            flightImageB: prev.flightImageB || 'No Image, Land Arrangement'
        }));
    }, [isLandArrangement, setFormData]);

    const packageRows = [
        { label: 'TRAVEL PACKAGE', value: quotationData.packageName, emphasis: true },
        {
            label: 'TRAVEL DATES',
            value: (
                <div>
                    <Input
                        size="small"
                        className="mrc-tour-details-input"
                        placeholder={formatTravelDates(quotationData.travelDates)}
                        value={formData.travelDates || ''}
                        onChange={(e) =>
                            setFormData(prev => ({ ...prev, travelDates: e.target.value }))
                        }
                        style={formErrors.travelDates ? { borderColor: '#ff4d4f' } : undefined}
                    />
                    {formErrors.travelDates ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.travelDates}</div>
                    ) : null}
                </div>
            )
        },
        {
            label: 'HOTEL',
            value: (
                <div>
                    <Input
                        size="small"
                        className="mrc-tour-details-input"
                        placeholder={quotationData.hotel || 'Hotel name'}
                        value={formData.hotel || ''}
                        onChange={(e) =>
                            setFormData(prev => ({ ...prev, hotel: e.target.value }))
                        }
                        style={formErrors.hotel ? { borderColor: '#ff4d4f' } : undefined}
                    />
                    {formErrors.hotel ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.hotel}</div>
                    ) : null}
                </div>
            )
        },
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
        {
            label: 'AIRLINE',
            value: (
                <div>
                    <Input
                        size="small"
                        className="mrc-tour-details-input"
                        placeholder={quotationData.airline || 'Airline'}
                        value={formData.airline || ''}
                        onChange={(e) =>
                            setFormData(prev => ({ ...prev, airline: e.target.value }))
                        }
                        style={formErrors.airline ? { borderColor: '#ff4d4f' } : undefined}
                    />
                    {formErrors.airline ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.airline}</div>
                    ) : null}
                </div>
            )
        },
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
            label: 'TRAVELERS',
            value: (
                <div>
                    <Input
                        size="small"
                        className="mrc-tour-details-input"
                        placeholder="TOTAL"
                        value={formData.travelers}
                        onChange={(e) =>
                            setFormData(prev => ({ ...prev, travelers: e.target.value }))
                        }
                        style={formErrors.travelers ? { borderColor: '#ff4d4f' } : undefined}
                    />
                    {formErrors.travelers ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.travelers}</div>
                    ) : null}
                </div>
            ),
        },
        {
            label: 'TOTAL RATE PER ADULT',
            value: (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <Input
                        size="small"
                        maxLength={6}
                        className="mrc-tour-details-input mrc-currency-input"
                        placeholder="ADULTS PRICE"
                        value={formData.totalRate}
                        prefix={<span className="mrc-peso-prefix">₱</span>}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');

                            setFormData(prev => ({
                                ...prev,
                                totalRate: value
                            }));
                        }}
                        style={formErrors.totalRate ? { borderColor: '#ff4d4f' } : undefined}
                        onKeyDown={(e) => {
                            if (
                                ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)
                            ) {
                                return;
                            }

                            if (e.ctrlKey || e.metaKey) {
                                return;
                            }

                            if (!/^[0-9.]$/.test(e.key)) {
                                e.preventDefault();
                            }
                        }}
                    />
                    {formErrors.totalRate ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.totalRate}</div>
                    ) : null}
                </div>
            ),
        },
        {
            label: 'TOTAL PRICE',
            value: (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <Input
                        size="small"
                        maxLength={7}
                        className="mrc-tour-details-input mrc-currency-input"
                        placeholder="TOTAL"
                        value={formData.totalPrice || calculateTotalPrice()}
                        prefix={<span className="mrc-peso-prefix">₱</span>}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setFormData(prev => ({ ...prev, totalPrice: value }))
                        }}
                        style={formErrors.totalPrice ? { borderColor: '#ff4d4f' } : undefined}
                        onKeyDown={(e) => {
                            if (
                                ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)
                            ) {
                                return;
                            }

                            if (e.ctrlKey || e.metaKey) {
                                return;
                            }

                            if (!/^[0-9.]$/.test(e.key)) {
                                e.preventDefault();
                            }
                        }}
                    />
                    {formErrors.totalPrice ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.totalPrice}</div>
                    ) : null}
                </div>
            ),
        },
        {
            label: 'IF DEPOSIT',
            value: (
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <Input
                        size="small"
                        maxLength={6}
                        className="mrc-tour-details-input mrc-currency-input"
                        placeholder="DEPOSIT AMOUNT"
                        value={formData.totalDeposit}
                        prefix={<span className="mrc-peso-prefix">₱</span>}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            setFormData(prev => ({ ...prev, totalDeposit: value }));
                        }}
                        style={formErrors.totalDeposit ? { borderColor: '#ff4d4f' } : undefined}
                        onKeyDown={(e) => {
                            if (
                                ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)
                            ) {
                                return;
                            }

                            if (e.ctrlKey || e.metaKey) {
                                return;
                            }

                            if (!/^[0-9.]$/.test(e.key)) {
                                e.preventDefault();
                            }
                        }}
                    />
                    {formErrors.totalDeposit ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.totalDeposit}</div>
                    ) : null}
                </div>
            ),
        },
    ];

    if (!isSoloTraveler) {
        packageRows.splice(
            packageRows.findIndex((row) => row.label === 'TOTAL PRICE'),
            0,
            {
                label: 'TOTAL RATE PER CHILD',
                value: (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Input
                            size="small"
                            maxLength={6}
                            className="mrc-tour-details-input mrc-currency-input"
                            placeholder="CHILDREN PRICE"
                            value={formData.totalChildRate}
                            prefix={<span className="mrc-peso-prefix">₱</span>}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                setFormData(prev => ({ ...prev, totalChildRate: value }));
                            }}
                            style={formErrors.totalChildRate ? { borderColor: '#ff4d4f' } : undefined}
                            onKeyDown={(e) => {
                                if (
                                    ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)
                                ) {
                                    return;
                                }

                                if (e.ctrlKey || e.metaKey) {
                                    return;
                                }

                                if (!/^[0-9.]$/.test(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                        />
                        {formErrors.totalChildRate ? (
                            <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.totalChildRate}</div>
                        ) : null}
                    </div>
                ),
            },
            {
                label: 'TOTAL RATE PER INFANT',
                value: (
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <Input
                            size="small"
                            maxLength={6}
                            className="mrc-tour-details-input mrc-currency-input"
                            placeholder="INFANTS PRICE"
                            value={formData.totalInfantRate}
                            prefix={<span className="mrc-peso-prefix">₱</span>}
                            onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                setFormData(prev => ({ ...prev, totalInfantRate: value }));
                            }}
                            style={formErrors.totalInfantRate ? { borderColor: '#ff4d4f' } : undefined}
                            onKeyDown={(e) => {
                                if (
                                    ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)
                                ) {
                                    return;
                                }

                                if (e.ctrlKey || e.metaKey) {
                                    return;
                                }

                                if (!/^[0-9.]$/.test(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                        />
                        {formErrors.totalInfantRate ? (
                            <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.totalInfantRate}</div>
                        ) : null}
                    </div>
                ),
            }
        );
    }

    const updateDynamicRow = (index, field, value) => {
        setFormData(prev => {
            const newRows = [...(prev.dynamicRows || [])];
            newRows[index][field] = value;
            return { ...prev, dynamicRows: newRows };
        });
    };

    const flights = [];

    return (
        <div className="mrc-overlay-wrapper">
            <div className="mrc-form-page mrc-quotation-page" data-quotation-page>
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

                    {/* Dynamic rows */}
                    {formData.dynamicRows?.map((row, index) => (
                        <div key={index} className="mrc-quotation-row">
                            <div className="mrc-quotation-label">
                                <Input
                                    size="small"
                                    placeholder="Label"
                                    className="mrc-quotation-inline-input"
                                    value={row.label}
                                    onChange={(e) => updateDynamicRow(index, 'label', e.target.value)}
                                    style={formErrors.dynamicRows?.[index]?.label ? { borderColor: '#ff4d4f' } : undefined}
                                />
                                {formErrors.dynamicRows?.[index]?.label ? (
                                    <div style={{ color: '#ff4d4f', fontSize: 11 }}>
                                        {formErrors.dynamicRows[index].label}
                                    </div>
                                ) : null}
                            </div>
                            <div className="mrc-quotation-value">
                                <Input
                                    size="small"
                                    placeholder="Value"
                                    className="mrc-quotation-inline-input"
                                    value={row.value}
                                    onChange={(e) => updateDynamicRow(index, 'value', e.target.value)}
                                    style={formErrors.dynamicRows?.[index]?.value ? { borderColor: '#ff4d4f' } : undefined}
                                />
                                {formErrors.dynamicRows?.[index]?.value ? (
                                    <div style={{ color: '#ff4d4f', fontSize: 11 }}>
                                        {formErrors.dynamicRows[index].value}
                                    </div>
                                ) : null}
                            </div>
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
                            <div style={{ display: 'flex', flexDirection: 'row', gap: 40, flexWrap: 'wrap' }}>
                                <div>
                                    {isLandArrangement ? (
                                        <div>No Image, Land Arrangement</div>
                                    ) : formData.flightImageA ? (
                                        <img
                                            src={formData.flightImageA}
                                            alt="Flight Upload 1"
                                            style={{ width: 300, height: 220, objectFit: 'cover', borderRadius: 8 }}
                                        />
                                    ) : (
                                        <Upload
                                            showUploadList={false}
                                            beforeUpload={(file) => handleImageUpload(file, 'flightImageA')}
                                            accept=".jpg,.jpeg,.png"
                                        >
                                            <Button icon={<UploadOutlined />} className='quotationformdetails-button'>
                                                Upload Flight Image 1
                                            </Button>
                                            {formErrors.flightImageA && (
                                                <div style={{ color: '#ff4d4f', fontSize: 11 }}>
                                                    {formErrors.flightImageA.toUpperCase()}
                                                </div>
                                            )}
                                        </Upload>
                                    )}
                                </div>

                                <div>
                                    {isLandArrangement ? (
                                        <div>No Image, Land Arrangement</div>
                                    ) : formData.flightImageB ? (
                                        <img
                                            src={formData.flightImageB}
                                            alt="Flight Upload 2"
                                            style={{ width: 300, height: 220, objectFit: 'cover', borderRadius: 8 }}
                                        />
                                    ) : (
                                        <Upload
                                            showUploadList={false}
                                            beforeUpload={(file) => handleImageUpload(file, 'flightImageB')}
                                            accept=".jpg,.jpeg,.png"
                                        >
                                            <Button icon={<UploadOutlined />} className='quotationformdetails-button'>
                                                Upload Flight Image 2
                                            </Button>
                                            {formErrors.flightImageB && (
                                                <div style={{ color: '#ff4d4f', fontSize: 11 }}>
                                                    {formErrors.flightImageB.toUpperCase()}
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
