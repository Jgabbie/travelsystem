import React from 'react';
import '../../style/components/mrcregistration.css';
import '../../style/components/mrcquotation.css';

export default function QuotationFormInEx({ quotationData }) {

    console.log('Received quotationData in QuotationFormInEx:', quotationData); // Debug log to check received data

    const inclusions = quotationData.inclusions || [];

    const exclusions = quotationData.exclusions || [];

    const itinerary = Object.entries(quotationData.itinerary || {}).map(
        ([dayKey, activities], index) => {
            const normalizedDay = String(dayKey || '').toLowerCase().startsWith('day')
                ? dayKey.replace(/day/i, 'Day ')
                : `Day ${index + 1}`;

            return {
                day: normalizedDay,
                date: quotationData.itineraryDate || '',
                bullets: Array.isArray(activities) ? activities : [],
            };
        }
    );

    const remarks = [
        'Air and Land Arrangement is on a BOOK AND BUY basis. No room space and seats reserved.',
        'Itinerary may change due to local weather condition or any other unavoidable circumstances.',
        'Surcharge may apply on peak season dates, rush bookings, foreign passport holder and late arrival or early departure.',
        'Cash payment only. If check payment, booking will be finalized upon clearing of check.',
        'For credit card payments, 3.5% charge will apply.',
    ];

    const getItemText = (item) => {
        if (typeof item === 'string') return item;
        if (!item) return '';
        return item.activity || item.optionalActivity || item.item || '';
    };

    const renderItineraryItem = (item) => {
        if (typeof item === 'string') return item;
        if (!item) return '';

        const activity = item.activity || item.optionalActivity || item.item || '';
        const optionalPrice = Number.isFinite(Number(item.optionalPrice))
            ? Number(item.optionalPrice).toLocaleString()
            : null;

        return (
            <>
                <div>{activity}</div>
                {item.isOptional && item.optionalActivity && (
                    <div>
                        Optional: {item.optionalActivity}
                        {optionalPrice ? ` - ₱${optionalPrice}` : ''}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="mrc-overlay-wrapper">
            <div className="mrc-form-page mrc-quotation-page">
                <div className="mrc-form-header">
                    <img src="/images/Logo.png" alt="MRC Travel Logo" className="mrc-logo" />
                </div>

                <div className="mrc-quotation-section">
                    <div className="mrc-quotation-subtitle">INCLUSIONS:</div>
                    <ul className="mrc-quotation-list">
                        {inclusions.map((item, index) => (
                            <li key={`inclusion-${index}`}>{getItemText(item) || '--'}</li>
                        ))}
                    </ul>
                </div>

                <div className="mrc-quotation-section">
                    <div className="mrc-quotation-subtitle">EXCLUSIONS:</div>
                    <ul className="mrc-quotation-list is-bulleted">
                        {exclusions.map((item, index) => (
                            <li key={`exclusion-${index}`}>{getItemText(item) || '--'}</li>
                        ))}
                    </ul>
                </div>

                <div className="mrc-quotation-section">
                    <div className="mrc-quotation-subtitle">SUGGESTED ITINERARY:</div>
                    <div className="mrc-quotation-itinerary">
                        {itinerary.map((entry) => (
                            <div key={`${entry.day}`} className="mrc-quotation-itinerary-row">
                                <div className="mrc-quotation-itinerary-date">
                                    {entry.date ? `${entry.date} | ${entry.day}` : entry.day}
                                </div>
                                <div className="mrc-quotation-itinerary-body">
                                    <ul className="mrc-quotation-list is-bulleted">
                                        {(entry.bullets.length ? entry.bullets : ['N/A']).map((item, index) => (
                                            <li key={`${entry.day}-${index}`}>{renderItineraryItem(item) || '--'}</li>
                                        ))}
                                    </ul>
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
