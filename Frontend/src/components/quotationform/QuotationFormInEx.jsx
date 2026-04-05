import React, { useState } from 'react';
import '../../style/components/mrcregistration.css';
import '../../style/components/mrcquotation.css';


export default function QuotationFormInEx({ quotationData, editableItinerary, setEditableItinerary, pdfMode = false }) {

    console.log('Received quotationData in QuotationFormInEx:', quotationData); // Debug log to check received data
    const [isEditing, setIsEditing] = useState(true);

    const inclusions = quotationData.inclusions || [];
    const exclusions = quotationData.exclusions || [];

    const handleItineraryChange = (index, value) => {
        const newItinerary = [...editableItinerary];
        newItinerary[index].text = value;
        setEditableItinerary(newItinerary);
    };

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

        const activity = item.activity || item.item || '';
        const optionalPrice = Number.isFinite(Number(item.optionalPrice))
            ? Number(item.optionalPrice).toLocaleString()
            : null;

        let text = activity;

        if (item.isOptional && item.optionalActivity) {
            text += ` (Optional: ${item.optionalActivity}${optionalPrice ? ` - ₱${optionalPrice}` : ''})`;
        }

        return text;
    };

    return (
        <div className="mrc-overlay-wrapper">
            {/* PAGE 1 */}
            <div className="mrc-form-page mrc-quotation-page" data-quotation-page>
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
            </div>

            {/* PAGE 2 */}
            <div className="mrc-form-page mrc-quotation-page" data-quotation-page>
                <div className="mrc-quotation-section page-break">
                    <div className="mrc-quotation-subtitle">SUGGESTED ITINERARY:</div>
                    <div className="mrc-quotation-itinerary">
                        {editableItinerary.map((entry, index) => (
                            <div key={entry.day} className="mrc-quotation-itinerary-row">
                                <div className="mrc-quotation-itinerary-date">
                                    {entry.date ? `${entry.date} | ${entry.day}` : entry.day}
                                </div>
                                <div className="mrc-quotation-itinerary-body">
                                    {pdfMode ? (
                                        // PDF preview: always bullets
                                        <ul className="mrc-quotation-list is-bulleted">
                                            {entry.text.split('\n').filter(line => line.trim()).map((line, i) => (
                                                <li key={i}>{line}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        // Editable UI
                                        <textarea
                                            value={entry.text}
                                            onChange={(e) => handleItineraryChange(index, e.target.value)}
                                            rows={Math.max(3, entry.text.split('\n').length)}
                                            style={{ width: '100%', resize: 'vertical', marginTop: 4 }}
                                        />
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
