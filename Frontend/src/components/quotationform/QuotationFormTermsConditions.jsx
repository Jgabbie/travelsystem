import React from 'react';
import '../../style/components/mrcregistration.css';
import '../../style/components/mrcquotation.css';

export default function QuotationFormTermsConditions({ quotationData }) {
    const terms = [
        'Minimum number of pax to avail the promo package, rooms are based on twin/double sharing. Single supplements apply.',
        'Failure to pay remaining balances on due dates means cancellation of package. No refund for unused airfare tickets, rooms, meals, tours & transfer services.',
        'Strictly no cancellation or amendments upon confirmation of booking.',
        'Full cancellation charges will be applied to any cancellation made a month before the departure dates.',
        'Package is not applicable for Senior Citizen/PWD/Student discounts.',
        'Immigration has the right to subject passenger to questioning or interview upon exit. Travel agency will not be liable for any immigration decision not to allow passenger to depart due to any circumstances.',
        'All passengers must get a Negative RT-PCR Test result (own pax account) if needed within (72 hours) or Antigen Test (24hrs) before their arrival.',
        'Cancellation made due to force majeure and Gov\'t imposed restrictions is for rebooking only, subject to room and flight availability and policy.',
        'In the event of sudden notice of flight time changes by the airlines, the clients are to follow the new set schedules.',
    ];

    return (
        <div className="mrc-overlay-wrapper">
            <div className="mrc-form-page mrc-quotation-page">
                <div className="mrc-form-header">
                    <img src="/images/Logo.png" alt="MRC Travel Logo" className="mrc-logo" />
                </div>

                <div className="mrc-quotation-terms-box">
                    <div className="mrc-quotation-terms-title">TERMS AND CONDITIONS:</div>
                    <ul className="mrc-quotation-terms-list">
                        {terms.map((term) => (
                            <li key={term}>{term}</li>
                        ))}
                    </ul>

                    <div className="mrc-quotation-signoff">
                        <p>Best regards,</p>
                        <p className="mrc-quotation-signoff-name">{quotationData.coordinatorName}</p>
                        <p>Travel coordinator.</p>
                    </div>
                </div>

                <div style={{ height: 300 }} />
            </div>
        </div>
    );
}
