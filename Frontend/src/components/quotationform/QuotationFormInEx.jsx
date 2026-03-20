import React from 'react';
import '../../style/components/mrcregistration.css';
import '../../style/components/mrcquotation.css';

export default function QuotationFormInEx({ quotationData }) {

    console.log('Received quotationData in QuotationFormInEx:', quotationData); // Debug log to check received data

    const inclusions = quotationData.inclusions || [];

    const exclusions = quotationData.exclusions || [];

    const itinerary = Object.entries(quotationData.itinerary || {}).map(
        ([dayKey, activities], index) => ({
            day: `Day ${index + 1}`,
            date: quotationData.itineraryDate || '',
            bullets: activities,
        })
    );

    const remarks = [
        'Air and Land Arrangement is on a BOOK AND BUY basis. No room space and seats reserved.',
        'Itinerary may change due to local weather condition or any other unavoidable circumstances.',
        'Surcharge may apply on peak season dates, rush bookings, foreign passport holder and late arrival or early departure.',
        'Cash payment only. If check payment, booking will be finalized upon clearing of check.',
        'For credit card payments, 3.5% charge will apply.',
    ];

    return (
        <div className="mrc-overlay-wrapper">
            <div className="mrc-form-page mrc-quotation-page">
                <div className="mrc-form-header">
                    <img src="/images/Logo.png" alt="MRC Travel Logo" className="mrc-logo" />
                </div>

                <div className="mrc-quotation-section">
                    <div className="mrc-quotation-subtitle">INCLUSIONS:</div>
                    <ul className="mrc-quotation-list">
                        {inclusions.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="mrc-quotation-section">
                    <div className="mrc-quotation-subtitle">EXCLUSIONS:</div>
                    <ul className="mrc-quotation-list is-bulleted">
                        {exclusions.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="mrc-quotation-section">
                    <div className="mrc-quotation-subtitle">SUGGESTED ITINERARY:</div>
                    <div className="mrc-quotation-itinerary">
                        {itinerary.map((entry) => (
                            <div key={`${entry.date}-${entry.day}`} className="mrc-quotation-itinerary-row">
                                <div className="mrc-quotation-itinerary-date">
                                    {entry.date} {entry.day}
                                </div>
                                <div className="mrc-quotation-itinerary-body">
                                    <p>{entry.details}</p>
                                    {entry.bullets && (
                                        <ul className="mrc-quotation-list is-bulleted">
                                            {entry.bullets.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mrc-quotation-section">
                    <div className="mrc-quotation-subtitle mrc-quotation-remark-title">REMARKS:</div>
                    <ul className="mrc-quotation-list is-bulleted">
                        {remarks.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="mrc-quotation-note">
                    NOTE: ALL RATES &amp; AVAILABILITY ARE STILL SUBJECT TO CHANGE WITHOUT PRIOR NOTICE.
                </div>
            </div>
        </div>
    );
}
