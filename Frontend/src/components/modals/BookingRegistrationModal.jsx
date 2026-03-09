import React, { useState } from 'react';
import { Modal, Button, Checkbox, ConfigProvider, Input, Radio } from 'antd';
import '../../style/components/modals/bookingregistrationmodal.css';

export default function BookingRegistrationModal({
    open,
    onCancel,
    onProceed,
    packageData
}) {
    const [agreements, setAgreements] = useState({
        paymentDetails: false,
        generalDisclaimer: false,
        paymentsPenalties: false,
        cancellationPolicy: false,
        amendments: false,
        passportVisas: false,
        waiverDisclaimer: false,
        leadGuest: false,
        securityDeposits: false,
        domesticTickets: false,
        packageTerms: false,
        finalConsent: false,
    });

    const allAgreed = Object.values(agreements).every(Boolean);

    const updateAgreement = (key) => (e) => {
        setAgreements((prev) => ({
            ...prev,
            [key]: e.target.checked,
        }));
    };

    const handleProceed = () => {
        if (!allAgreed) return;
        onProceed?.();
    };

    const handleCancel = () => {
        setAgreements({
            paymentDetails: false,
            generalDisclaimer: false,
            paymentsPenalties: false,
            cancellationPolicy: false,
            amendments: false,
            passportVisas: false,
            waiverDisclaimer: false,
            leadGuest: false,
            securityDeposits: false,
            domesticTickets: false,
            packageTerms: false,
            finalConsent: false,
        });
        onCancel?.();
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <Modal
                open={open}
                onCancel={handleCancel}
                footer={null}
                width={1000}
                centered
                className="booking-registration-modal"
            >
                <h2 className="booking-registration-title">Booking Registration</h2>
                <div className="booking-registration-wrapper">

                    {/* Package Summary */}
                    {packageData && (
                        <div className="booking-registration-package">
                            <h3>{packageData.packageName}</h3>
                            <p>Duration: {packageData.packageDuration} days</p>
                            <p>Price per pax: ₱{packageData.packagePricePerPax?.toLocaleString()}</p>
                        </div>
                    )}

                    {/* Introduction */}
                    <div className="booking-registration-section">
                        <h3>Introduction</h3>
                        <p className='booking-registration-checkbox-paragraph'>
                            As the lead guest and the sole mediator between the Travel Agency and the guests enlisted of this group,
                            I hereby confirm that all the above information is correct and true and I am happy for M&RC Travel and Tours
                            to access this information when organizing this trip/travel for me.

                            By agreeing with this form, I allow M&RC Travel and Tours to keep all my and our group's data on file and access
                            details which are necessary for this trip/travel and authorized by me.
                        </p>
                    </div>

                    {/* Travel Registration Details */}
                    <div className="booking-registration-section">
                        <h3>Travel Registration Details</h3>
                        <p>
                            Tour Package Title:
                        </p>
                        <p>
                            Travel Date:
                        </p>

                        <div className="booking-registration-travel-details-form">
                            <label>Does anyone in your group have any dietary restrictions?</label>
                            <p>(Only applicable for travel and tour packages with meal inclusions)</p>
                            <Input.TextArea placeholder="Please specify if yes" autoSize={{ minRows: 3, maxRows: 5 }} />

                            <label>Does anyone in your group have any Allergies/Medical Conditions?</label>
                            <p>(Only applicable for travel and tour packages with meal inclusions)</p>
                            <Input.TextArea placeholder="Please specify if yes" autoSize={{ minRows: 3, maxRows: 5 }} />
                        </div>

                        <h3>Travel Insurance</h3>
                        <p className='booking-registration-checkbox-paragraph'>
                            We highly encourage ALL OUR CLIENTS to have and are covered with travel insurance for health, repartriation,
                            loss of luggage/belongings and in case of cancellation, flight delays, and the like that is why purchasing of
                            travel insurance together with our tour packages is compulsory for your convenience and peace of mind.
                        </p>

                        <label>Do you agree to purchase travel insurance from us?</label>
                        <p className='booking-registration-checkbox-notes'>
                            Note: Purchasing of travel insurance from our Travel & Tours company does not hold us liable for any claims and
                            anything about the process of claims from the insurance company. We can only provide the documents from our suppliers,
                            operators, and airlines' end if necessary.
                        </p>

                        <Radio.Group className="booking-registration-radio-group">
                            <Radio value={true}>Yes</Radio>
                            <Radio value={false}>No</Radio>
                        </Radio.Group>

                        <label>If NO, do you have your own Travel Insurance?</label>
                        <Radio.Group className="booking-registration-radio-group">
                            <Radio value={true}>Yes</Radio>
                            <Radio value={false}>No</Radio>
                        </Radio.Group>

                        <p className='booking-registration-checkbox-notes'>
                            Note: If YES, please check the conditions and coverage carefully and send us a copy of the policy so we can review
                            as well the availed Travel Insurance.
                            If NO, but chose not to purchase Travel Insurance from us: "I understand that I am waiving the right of any assistance
                            from the travel and tour company related to claims."
                        </p>

                        <h3>Provide Emergency Contact</h3>
                        <p>(The person to contact in the event of an emergency while you are away)</p>
                        <div className="booking-registration-emergency-contact-form">
                            <label>Full Name:</label>
                            <Input placeholder="Emergency Contact Name" />

                            <label>Email:</label>
                            <Input placeholder="Emergency Contact Email" />

                            <label>Contact Number:</label>
                            <Input placeholder="Emergency Contact Number" />

                            <label>Relationship:</label>
                            <Input placeholder="Relationship to Emergency Contact" />
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div className="booking-registration-section">
                        <h3>Payment Details</h3>
                        <p className='booking-registration-checkbox-paragraph'>
                            We have multiple payment channels (BDO, GCASH, CC MAYA) with account names under M&RC TRAVEL AND TOURS and its owners,
                            MR. RHON CARLE & MRS. MARICAR CARLE. Payments can be paid directly to these accounts through online transfers, bank transfers,
                            direct deposit or via credit card (via MAYA payment physical only with surcharge of 3.5%).

                            As the lead guest and sole mediator between the Travel Agency and the guests enlisted of this group, I hereby confirm that all
                            the above information is correct and true and I am happy for M&RC Travel and Tours to access this information whne organizing this
                            trip/travel for me.
                        </p>

                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.paymentDetails}
                                onChange={updateAgreement('paymentDetails')}
                                className="booking-registration-checkbox"
                            />
                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for Payments Details
                            </p>

                        </div>
                    </div>

                    {/* General Package Disclaimer, Terms & Conditions */}
                    <div className="booking-registration-section">
                        <h3>General Package Disclaimer, Terms & Conditions</h3>
                        <p className='booking-registration-checkbox-paragraph'>
                            Completion of this form must be done together with all the participant's PASSPORT COPIES (For Internations) or VALID IDs (For Domestic).
                            Failure to comply will be subject to penalties of cancellation of your package. Upon completion of your booking process and deposit, you will
                            receive a Booking Confirmation of your purchase and registration.

                            By making any payments or purchase, this shall mean that you have read and agreed to the terms and conditions set forth in the quotation proposed
                            to you before purchasing.
                        </p>

                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.generalDisclaimer}
                                onChange={updateAgreement('generalDisclaimer')}
                                className="booking-registration-checkbox"
                            />
                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for General Package Disclaimer
                            </p>
                        </div>
                    </div>

                    {/* Payments & Penalties */}
                    <div className="booking-registration-section">
                        <h3>Payments and Penalties</h3>
                        <p className='booking-registration-checkbox-paragraph'>
                            If you choose installment, you need to follow the payment schedule and failure to do so will be subject to penalties and/or cancellation of your
                            tour package. We can only acknowledge payments that are directly paid to us by cash (at our office) and bank deposit or online cashless transfers
                            to our official payment channels. Other mode of payments such as payment through a specific person such as M&RC Travel and Tours Staffs will not be
                            honoured.
                        </p>

                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.paymentsPenalties}
                                onChange={updateAgreement('paymentsPenalties')}
                                className="booking-registration-checkbox"
                            />
                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for Payments and Penalties
                            </p>
                        </div>
                    </div>

                    {/* Cancellation Policy */}
                    <div className="booking-registration-section">
                        <h3>Cancellation Policy</h3>
                        <p className="booking-registration-checkbox-paragraph">
                            Please refer to the quotation sent to you. All tour packages will not be converted to any travel funds in case the tour will not push through whether it
                            be government mandated, due to natural calamities, etc. Tour package purchase is non-refundable , non-reroutable, non-rebookable, and non-transferable
                            unless otherwise stated and is due to natural calamities and force majeur that is beyond our control otherwise NON-REFUNDABLE.
                        </p>

                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.cancellationPolicy}
                                onChange={updateAgreement('cancellationPolicy')}
                                className="booking-registration-checkbox"
                            />
                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for Cancellation Policy
                            </p>
                        </div>
                    </div>

                    {/* Amendments */}
                    <div className="booking-registration-section">
                        <h3>Amendments</h3>
                        <p className="booking-registration-checkbox-paragraph">
                            Any amendment request such as changes in name (MINOR spelling only) date of birth of the passenger may have applicable changes.
                        </p>

                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.amendments}
                                onChange={updateAgreement('amendments')}
                                className="booking-registration-checkbox"
                            />
                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for Amendments
                            </p>
                        </div>
                    </div>

                    {/* Passport and Visas */}
                    <div className="booking-registration-section">
                        <h3>Passport and VISAs</h3>
                        <p className="booking-registration-checkbox-paragraph">
                            Make sure your passport/ID is valid at least 6 months PRIOR to your onward and return date to avoid inconvenience. Our travel company is not liable for refusal
                            of boarding due to passport validity. For VISA assistance, failure to comply with the requirements on the deadlines may automatically result to cancellation of package.
                            Submission of VISA applications through travel agencies does not guarantee VISA approval. The discretion still lies upon the consul and company is not liable for such
                            decision. Our travel company will try our best to have your VISA approved but in the event of denied VISA, the amount indicated in the cancellation/refund policy per person
                            is non-refundable since airline, hotel and tour are all confirmed and guaranteed prior to VISA issuance.

                            We appreciate honest declaration to avoid confusion/disapproval of VISA/Documents and/or prolonged processing. Any fake documents submitted for VISA application processing
                            will be confiscated and payments will be forfeited. This includes tampered and illegaly procured documents as verified by respective agencies. Moreover, the company has the right
                            to file charges against you.

                            Original passport, with approve VISA will be release only once fully paid, once there is a valid travel or reason to secure the passport, client must submit notarized reasons and
                            stating for the compliance and to paid the balance as stated in the due date.
                        </p>

                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.passportVisas}
                                onChange={updateAgreement('passportVisas')}
                                className="booking-registration-checkbox"
                            />
                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for Passport and VISAs
                            </p>
                        </div>
                    </div>

                    {/* Waiver and Disclaimer */}
                    <div className="booking-registration-section">
                        <h3>Waiver and Disclaimer</h3>
                        <p className="booking-registration-checkbox-paragraph">
                            Our travel company is not liable for changes of flight, tours, and hotel acommodation due to weather, transportation, property renovation related issue, force majeure, acts of terrorism, and
                            other unforseen events that is company's out of control. The client waives the right for any cliams over the company as such incidents occur. Company is not liable for any offloading incidents may
                            it be due to immigration or airline/airport measures or any reasons beyond the company's control and as such, no refund can be made whatsoever. Company has the right to proceed with the confirmation
                            of the whole package or any services such as flight, hotel and tours even without prior notice. However, if there will be a change of any of the said services on the part of these tour operators,
                            an email notification will be sent to the concerned participants informing of the said change/s.
                        </p>

                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.waiverDisclaimer}
                                onChange={updateAgreement('waiverDisclaimer')}
                                className="booking-registration-checkbox"
                            />
                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for Waiver and Disclaimer
                            </p>
                        </div>
                    </div>

                    {/* Lead Guest Liabilities and Responsibilities */}
                    <div className="booking-registration-section">
                        <h3>Lead Guest Liabilities and Responsibilities</h3>
                        <p className='booking-registration-checkbox-paragraph'>
                            I am responsible in ensuring that all the participants have all the required documents necessary for travel abroad such as VISA and other related documents like Travel Authority for Government Employees, ARC
                            or ALIEN REGISTRATION CARD and old passports for foreign passports or Balikbayans, Travel Clearance from DSWD for CHILD/MINORS NOT travelling with their parents etc.
                        </p>

                        <p className='booking-registration-checkbox-paragraph-second'>
                            I, the lead guest is the lead contact responsible for the whole group, I must disseminate any information I obtain from the company. The company is not liable for any miscommunication between members of the group.
                            I am the sole mediator between the Travel Agency and the guests enlisted of this group. As the lead guest, all transactions related to our travel package will be communicated to and by me. I am responsible to coordinate with
                            the respective authorities regarding the safety protocols in our destinations, as well as to provide their requirements, I am aware that travel insurance is highly suggested for convenience, if any assistance from travel and
                            tours company. I understand that our FINAL travel documents will be provided 3-7 days before departure or as soon as available as your trip will be required to be finalized before being sent to our valued clients.
                        </p>


                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.leadGuest}
                                onChange={updateAgreement('leadGuest')}
                                className="booking-registration-checkbox"
                            />
                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for Lead Guest Liabilities and Responsibilities
                            </p>
                        </div>
                    </div>

                    {/* Security Deposits */}
                    <div className="booking-registration-section">
                        <h3>Security Deposits</h3>
                        <p className='booking-registration-checkbox-paragraph'>
                            Certain hotels and resorts require a security deposite to cover potential charges, damages, or additional services used during stay. The security deposit is payable directly to M&RC Travel and Tours. The hotel may deduct from the security
                            deposit for, but not limited to damage to hotel property, missing items, smoking penalities, unpaid bills, or incidental expenses, excessive cleaning charges.
                        </p>

                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.securityDeposits}
                                onChange={updateAgreement('securityDeposits')}
                                className="booking-registration-checkbox"
                            />
                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for Security Deposits
                            </p>
                        </div>
                    </div>

                    {/* Purchasing of Domestic Tickets */}
                    <div className="booking-registration-section">
                        <h3>Purchasing of Domestic Tickets</h3>
                        <p className='booking-registration-checkbox-paragraph'>
                            For purchased International Tour packages to VISA countries, purchasing of domestic tickets or any tour activities prior to VISA issuance is highly discouraged. Non-compliance to this doesn't make the company liable to any applicable penalities
                            to be paid to the airline in case of any changes in the booking. For non-VISA countries, it is highly suggested to book domestic tickets that has atleast 14 hours to 24 hours allowance to your international flight for possible flight changes and delays

                            The Travel and Tour comapny is not liable for any missed connections resulting from the flight cancellations, delays, or changes to the itinerary whether it will be purchased outside the company or by client's own acocunt.
                        </p>

                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.domesticTickets}
                                onChange={updateAgreement('domesticTickets')}
                                className="booking-registration-checkbox"
                            />

                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for Purchasing of Domestic Tickets
                            </p>
                        </div>
                    </div>

                    {/* Package */}
                    <div className="booking-registration-section">
                        <h3>Package</h3>
                        <p className="booking-registration-checkbox-paragraph">
                            Some packages requires a certain number of passengers in order to proceed. In the event that the required number of travelers was not met by the travel company and tour operator, they have the right to transfer passengers with PREVIOUS DENIED VISA will not be accepted.
                            Some documents are needed to be submitted to the embassy/immigration if necesary. The rate quoted is based on a minimum number of travelers per departure. Lead guest must understand that the rate will vary if minimum number of travlers was not met or is subject to new quotation.
                        </p>

                        {/* Agree Checkbox */}
                        <div className="booking-registration-checkbox-container">
                            <Checkbox
                                checked={agreements.packageTerms}
                                onChange={updateAgreement('packageTerms')}
                                className="booking-registration-checkbox"
                            />
                            <p className="booking-registration-checkbox-text">
                                I have read and understand the Terms & Conditions for the Package
                            </p>
                        </div>
                    </div>

                    {/* Agree Checkbox */}
                    <div className="booking-registration-checkbox-container">
                        <Checkbox
                            checked={agreements.finalConsent}
                            onChange={updateAgreement('finalConsent')}
                            className="booking-registration-checkbox"
                        />

                        <p className="booking-registration-checkbox-paragraph">
                            I have read and understand the Terms & Conditions detailed above and the special booking conditions as stated out in the Terms & Conditions of the tour package quotation.
                            I have availed and accept them on behalf of myself and my party.
                        </p>

                    </div>
                </div>
                {/* Action Buttons */}
                <div className="booking-registration-actions">
                    <Button
                        className='booking-registration-proceed'
                        type="primary"
                        onClick={handleProceed}
                        disabled={!allAgreed}
                    >
                        Proceed
                    </Button>
                    <Button
                        className='booking-registration-cancel'
                        onClick={handleCancel}
                        danger
                    >
                        Cancel
                    </Button>
                </div>
            </Modal >
        </ConfigProvider >
    );
}