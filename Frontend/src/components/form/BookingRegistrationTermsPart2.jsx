import React, { useEffect } from 'react';
import { Form, Input } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';

export default function BookingRegistrationTermsPart2({ form, onValuesChange }) {
    useEffect(() => {
        form.setFieldsValue({
            waiverDate: dayjs().format('MMMM D, YYYY'),
        });
    }, [form]);

    return (
        <div className="mrc-overlay-wrapper">
            <div className="mrc-form-page mrc-booking-invoice-page mrc-registration-page">
                <div className="mrc-registration-logo-container">
                    <img
                        src="/images/Logo.png"
                        alt="MRC Travel Logo"
                        className="mrc-registration-logo"
                    />
                </div>

                <div className="mrc-registration-terms-grid mrc-registration-waiver-grid">
                    <div className="mrc-registration-terms-column">
                        <div className="mrc-registration-header mrc-registration-header--blue mrc-registration-header--flush-top">
                            WAIVER &amp; DISCLAIMER
                        </div>

                        <p className="mrc-registration-terms-text">
                            Our travel company is not liable for changes of flight, tours, and
                            hotel accommodation due to weather, transportation, property
                            renovation related issue, force majeure, acts of terrorism, and
                            other unforeseen events that is company&apos;s out of control. The
                            client waives the right for any claims over the company as such
                            incidents occur. Company is not liable for any offloading incidents
                            may it be due to immigration or airline/airport measures or any
                            reasons beyond the company&apos;s control and as such, no refund can
                            be made whatsoever. Company has the right to proceed with the
                            confirmation of the whole package or any services such as flight,
                            hotel and tours even without prior notice. However, if there will be
                            a change of any of the said services on the part of those tour
                            operators, an email notification will be sent to the concerned
                            participants informing of the said change/s.
                        </p>

                        <div className="mrc-registration-header mrc-registration-header--blue">
                            LEAD GUEST LIABILITIES AND RESPONSIBILITIES
                        </div>

                        <p className="mrc-registration-terms-text">
                            I am responsible in ensuring that all the participants have all the
                            required documents necessary for travel abroad such as VISA and
                            other related documents like Travel Authority for Government
                            Employees, ARC or ALIEN REGISTRATION CARD and old passports for
                            foreign passports or Balikbayans. Travel Clearance from DSWD for
                            CHILD/MINORS NOT travelling with their parents etc.
                        </p>

                        <p className="mrc-registration-terms-text">
                            I, the lead guest is the lead contact responsible for the whole
                            group, I must disseminate any information I obtain from the company.
                            The company is not liable for any miscommunication between members
                            of the group. I am the sole mediator between the Travel Agency and
                            the guests enlisted of this group. As the lead guest, all
                            transactions related to our travel package will be communicated to
                            and by me. I am responsible to coordinate with the respective
                            authorities regarding the safety protocols in our destinations as
                            well as to provide their requirements. I am aware that travel
                            insurance is highly suggested for convenience, if any assistance
                            from travel and tours company. I understand that our FINAL travel
                            documents will be provided 3-7 days before departure or as soon as
                            available as your trip will be required to be finalized before
                            being sent to our valued clients.
                        </p>
                    </div>

                    <div className="mrc-registration-terms-column mrc-registration-terms-column--divided">
                        <div className="mrc-registration-header mrc-registration-header--blue mrc-registration-header--flush-top">
                            SECURITY DEPOSITS
                        </div>

                        <p className="mrc-registration-terms-text">
                            Certain hotels and resorts require a security deposit to cover
                            potential charges, damages, or additional services used during
                            stay. The security deposit is payable directly to M&amp;RC. The
                            hotel may deduct from the security deposit for, but not limited to,
                            damage to hotel property, missing items, smoking penalties, unpaid
                            bills or incidental expenses, excessive cleaning charges.
                        </p>

                        <div className="mrc-registration-header mrc-registration-header--blue">
                            PURCHASING OF DOMESTIC TICKETS
                        </div>

                        <p className="mrc-registration-terms-text">
                            For purchased International tour packages to VISA countries,
                            purchasing of domestic tickets or any tour activities prior to VISA
                            issuance is highly discouraged. Non-compliance to this doesn&apos;t
                            make the company liable to any applicable penalties to be paid to
                            the airline in case of any changes in the booking. For non VISA
                            countries, it is highly suggested to book domestic tickets that has
                            at least 14 hours to 24 hours allowance to your international flight
                            for possible flight changes and delays. The Travel and Tour company
                            is not liable for any missed connections resulting from the flight
                            cancellations, delays, or changes to the itinerary whether it will
                            be purchased outside the company or by client&apos;s own account.
                        </p>

                        <div className="mrc-registration-header mrc-registration-header--blue">
                            PACKAGE
                        </div>

                        <p className="mrc-registration-terms-text">
                            Some packages requires a certain number of passengers in order to
                            proceed. In the event that the required number of travelers was not
                            met by the travel company and tour operator, they have the right to
                            transfer passengers with PREVIOUS DENIED VISA will not be accepted.
                            Some documents are needed to be submitted to the
                            embassy/immigration if necessary. The rate quoted is based on a
                            minimum number of travelers per departure. Lead guest must
                            understand that the rate will vary if minimum number of travelers
                            was not met or is subject to new quotation.
                        </p>

                        <p className="mrc-registration-red-text mrc-registration-acknowledgment">
                            I have read and understand the Terms &amp; Conditions detailed above
                            and the Special Booking Conditions as stated out in the T&amp;C of
                            the tour package quotation I have availed, and accept them on behalf
                            of myself and my party.
                        </p>
                    </div>
                </div>

                <Form
                    form={form}
                    className="mrc-registration-form"
                    onValuesChange={onValuesChange}
                >
                    <div className="mrc-registration-signature-row mrc-registration-signature-row--terms">
                        <div className="mrc-registration-signature-box">
                            <Form.Item name="leadFullName" noStyle>
                                <Input
                                    className="mrc-registration-signature-input"
                                    readOnly
                                />
                            </Form.Item>
                            <div className="mrc-registration-signature-label">
                                Signature over printed name
                            </div>
                        </div>

                        <div className="mrc-registration-signature-box">
                            <Form.Item name="waiverDate" noStyle>
                                <Input
                                    className="mrc-registration-signature-input"
                                    readOnly
                                />
                            </Form.Item>
                            <div className="mrc-registration-signature-label">Date</div>
                        </div>
                    </div>
                </Form>

                <div className="mrc-booking-invoice-footer">
                    <span>M&amp;RC Travel and Tours</span>
                    <span>Page 4 of 4</span>
                </div>
            </div>
        </div>
    );
}