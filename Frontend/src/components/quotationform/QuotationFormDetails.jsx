import React from 'react';
import '../../style/components/mrcregistration.css';
import '../../style/components/mrcquotation.css';

export default function QuotationFormDetails() {
    const packageRows = [
        { label: 'TRAVEL PACKAGE', value: '5D4N ALL IN JAPAN PACKAGE', emphasis: true },
        { label: 'TRAVEL DATES', value: 'MARCH 31 - APRIL 4, 2025' },
        { label: 'HOTEL', value: 'HOTEL HILLARYS' },
        { label: 'ROOM/S (NO./TYPE)', value: '1 STUDIO TWIN ROOM' },
        { label: 'AIRLINE', value: 'VIA AIR ASIA' },
        { label: 'BAGGAGE ALLOWANCE', value: 'HANDCARRY: 1PC. 7KGS/PERSON | CHECK IN: N/A' },
        { label: 'PH TRAVEL TAX OF PHP 1620', value: 'EXCLUDED', danger: true },
        { label: 'AIRPORT TERMINAL FEE', value: 'INCLUDED' },
        {
            label: 'TOTAL RATE PER PERSON (QUOTED FOR A MINIMUM OF 3 | VAT EXCLUSIVE)',
            value: 'ADULTS: PHP 46,888/PAX',
            emphasis: true,
        },
    ];

    const flights = [
        {
            title: 'Onward - 1 Flight(s)',
            route: 'Manila to Osaka',
            airline: 'Philippines AirAsia',
            flightNo: 'Z2 188',
            date: '31 Mar, 08:10 - 31 Mar, 13:15',
        },
        {
            title: 'Return - 1 Flight(s)',
            route: 'Osaka to Manila',
            airline: 'Philippines AirAsia',
            flightNo: 'Z2 189',
            date: '04 Apr, 14:15 - 04 Apr, 17:20',
        },
    ];

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
                        JAPAN TRIP on below schedule. Rates are as follows:
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
                    </div>
                </div>
            </div>
        </div>
    );
}
