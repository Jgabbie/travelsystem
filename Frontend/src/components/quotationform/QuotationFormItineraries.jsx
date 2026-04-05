import React, { useEffect, useState } from 'react';
import '../../style/components/mrcregistration.css';
import '../../style/components/mrcquotation.css';


export default function QuotationFormIntineraries({
    quotationData,
    editableItinerary,
    setEditableItinerary,
    formData,
    setFormData,
    formErrors,
    pdfMode = false
}) {

    console.log('Received quotationData in QuotationFormInEx:', quotationData); // Debug log to check received data

    const inclusions = quotationData.inclusions || [];
    const exclusions = quotationData.exclusions || [];

    const buildItineraryObject = (items) => {
        return (items || []).reduce((acc, entry, idx) => {
            const key = entry?.day || `Day ${idx + 1}`;
            const lines = (entry?.text || '')
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);

            acc[key] = lines.map((line) => ({
                activity: line,
                isOptional: false,
                optionalActivity: '',
                optionalPrice: ''
            }));
            return acc;
        }, {});
    };

    const handleItineraryChange = (index, value) => {
        const newItinerary = [...editableItinerary];
        newItinerary[index].text = value;
        setEditableItinerary(newItinerary);
        if (setFormData) {
            setFormData((prev) => ({
                ...prev,
                itinerary: buildItineraryObject(newItinerary)
            }));
        }
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

    const normalizeList = (items) =>
        (items || []).map((item) => getItemText(item)).filter((text) => text.trim());

    const ensureArray = (value) => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            return value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);
        }
        return [];
    };

    useEffect(() => {
        if (!setFormData) return;

        setFormData((prev) => {
            const next = { ...prev };

            if (!prev.inclusions || prev.inclusions.length === 0) {
                next.inclusions = normalizeList(inclusions);
            }

            if (!prev.exclusions || prev.exclusions.length === 0) {
                next.exclusions = normalizeList(exclusions);
            }

            const itineraryIsObject = prev.itinerary && typeof prev.itinerary === 'object';
            const itineraryIsEmptyObject = itineraryIsObject && !Array.isArray(prev.itinerary)
                && Object.keys(prev.itinerary).length === 0;

            if (!itineraryIsObject || Array.isArray(prev.itinerary) || itineraryIsEmptyObject) {
                next.itinerary = buildItineraryObject(editableItinerary);
            }

            return next;
        });
    }, [setFormData, inclusions, exclusions, editableItinerary]);

    useEffect(() => {
        if (!setFormData) return;

        setFormData((prev) => ({
            ...prev,
            itinerary: buildItineraryObject(editableItinerary)
        }));
    }, [setFormData, editableItinerary]);


    return (
        <div className="mrc-overlay-wrapper">

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
                    {formErrors?.itinerary ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11, marginTop: 6 }}>{formErrors.itinerary}</div>
                    ) : null}
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
