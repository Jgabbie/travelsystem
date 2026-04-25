import React, { useEffect, useState } from 'react';
import '../../style/components/mrcregistration.css';
import '../../style/components/mrcquotation.css';


export default function QuotationFormInEx({
    quotationData,
    formData,
    setFormData,
    formErrors,
    pdfMode = false
}) {


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
            return value.split('\n').map((line) => line.trim());
        }
        return [];
    };

    const stripEmptyLines = (lines) =>
        (lines || []).map((line) => line.trim()).filter(Boolean);

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

            return next;
        });
    }, [setFormData, inclusions, exclusions]);

    useEffect(() => {
        if (!setFormData) return;

    }, [setFormData]);

    const inclusionLines = formData?.inclusions?.length
        ? ensureArray(formData.inclusions)
        : normalizeList(inclusions);

    const exclusionLines = formData?.exclusions?.length
        ? ensureArray(formData.exclusions)
        : normalizeList(exclusions);

    const displayInclusionLines = stripEmptyLines(inclusionLines);
    const displayExclusionLines = stripEmptyLines(exclusionLines);

    const inclusionText = ensureArray(inclusionLines).join('\n');
    const exclusionText = ensureArray(exclusionLines).join('\n');

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
                <p className="mrc-quotation-note">
                    KINDLY BE INFORMED WITH THE INCLUSIONS AND EXCLUSIONS FOR THE QUOTATED TOUR PACKAGE STATED BELOW.
                    Changes may apply when revision is requested. Please refer to the quotation details for more information.
                </p>
                <div className="mrc-quotation-section">
                    <div className="mrc-quotation-subtitle">INCLUSIONS:</div>
                    {pdfMode ? (
                        <ul className="mrc-quotation-list">
                            {(displayInclusionLines.length ? displayInclusionLines : ['--']).map((item, index) => (
                                <li key={`inclusion-${index}`}>{item}</li>
                            ))}
                        </ul>
                    ) : (
                        <textarea
                            value={inclusionText}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    inclusions: ensureArray(e.target.value),
                                }))
                            }
                            rows={Math.max(4, inclusionLines.length)}
                            style={{ width: '100%', resize: 'vertical', marginTop: 4 }}
                            placeholder="Add one inclusion per line"
                        />
                    )}
                    {formErrors?.inclusions ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.inclusions}</div>
                    ) : null}
                </div>

                <div className="mrc-quotation-section">
                    <div className="mrc-quotation-subtitle">EXCLUSIONS:</div>
                    {pdfMode ? (
                        <ul className="mrc-quotation-list is-bulleted">
                            {(displayExclusionLines.length ? displayExclusionLines : ['--']).map((item, index) => (
                                <li key={`exclusion-${index}`}>{item}</li>
                            ))}
                        </ul>
                    ) : (
                        <textarea
                            value={exclusionText}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    exclusions: ensureArray(e.target.value),
                                }))
                            }
                            rows={Math.max(4, exclusionLines.length)}
                            style={{ width: '100%', resize: 'vertical', marginTop: 4 }}
                            placeholder="Add one exclusion per line"
                        />
                    )}
                    {formErrors?.exclusions ? (
                        <div style={{ color: '#ff4d4f', fontSize: 11 }}>{formErrors.exclusions}</div>
                    ) : null}
                </div>
            </div>

        </div >
    );
}
