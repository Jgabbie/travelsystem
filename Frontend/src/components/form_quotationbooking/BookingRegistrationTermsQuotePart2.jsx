import React, { useEffect } from 'react';
import { Row, Col, Input, Form } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';

export default function BookingRegistrationTermsQuotePart2({ form, onValuesChange }) {
    const boxStyle = { borderRadius: 0, border: '1px solid #000' };
    const sectionHeaderStyle = {
        background: '#ADD8E6',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '11px',
        padding: '2px',
        border: '1px solid #000',
        marginBottom: '5px',
        textTransform: 'uppercase'
    };
    const textStyle = { fontSize: '11px', lineHeight: '1.3', textAlign: 'justify', marginBottom: '12px' };

    useEffect(() => {
        form.setFieldsValue({
            waiverDate: dayjs().format('MMMM DD, YYYY')
        });
    }, [form]);

    return (
        <div className="mrc-overlay-wrapper">
            <div className="mrc-form-page" style={{ padding: '20px', backgroundColor: '#fff' }}>

                {/* Header Branding */}
                <div className="mrc-form-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <img src="/images/Logo.png" alt="MRC Travel Logo" style={{ height: '80px' }} />
                </div>

                <div className="mrc-waiver-content">
                    <Row gutter={24}>
                        {/* Left Column */}
                        <Col span={12}>
                            <div style={sectionHeaderStyle}>Waiver & Disclaimer</div>
                            <p style={textStyle}>
                                Our travel company is not liable for changes of flight, tours, and hotel acommodation due to weather, transportation, property renovation related issue, force majeure, acts of terrorism, and
                                other unforseen events that is company's out of control. The client waives the right for any cliams over the company as such incidents occur. Company is not liable for any offloading incidents may
                                it be due to immigration or airline/airport measures or any reasons beyond the company's control and as such, no refund can be made whatsoever. Company has the right to proceed with the confirmation
                                of the whole package or any services such as flight, hotel and tours even without prior notice. However, if there will be a change of any of the said services on the part of these tour operators,
                                an email notification will be sent to the concerned participants informing of the said change/s.
                            </p>

                            <div style={sectionHeaderStyle}>Lead Guest Liabilities and Responsibilities</div>
                            <p style={textStyle}>
                                I am responsible in ensuring that all the participants have all the required documents necessary for travel abroad such as VISA and other related documents like Travel Authority for Government Employees, ARC
                                or ALIEN REGISTRATION CARD and old passports for foreign passports or Balikbayans, Travel Clearance from DSWD for CHILD/MINORS NOT travelling with their parents etc.
                                <br /><br />
                                I, the lead guest is the lead contact responsible for the whole group, I must disseminate any information I obtain from the company. The company is not liable for any miscommunication between members of the group.
                                I am the sole mediator between the Travel Agency and the guests enlisted of this group. As the lead guest, all transactions related to our travel package will be communicated to and by me. I am responsible to coordinate with
                                the respective authorities regarding the safety protocols in our destinations, as well as to provide their requirements, I am aware that travel insurance is highly suggested for convenience, if any assistance from travel and
                                tours company. I understand that our FINAL travel documents will be provided 3-7 days before departure or as soon as available as your trip will be required to be finalized before being sent to our valued clients.
                            </p>
                        </Col>

                        {/* Right Column */}
                        <Col span={12}>
                            <div style={sectionHeaderStyle}>Security Deposits</div>
                            <p style={textStyle}>
                                Certain hotels and resorts require a security deposit to cover potential charges, damages, or additional services used during stay. The security deposit is payable directly to M&RC. The hotel may deduct from the security deposit for, but not limited to, damage to hotel property, missing items, smoking penalties, unpaid bills or incidental expenses, excessive cleaning charges.
                            </p>

                            <div style={sectionHeaderStyle}>Purchasing of Domestic Tickets</div>
                            <p style={textStyle}>
                                For purchased International Tour packages to VISA countries, purchasing of domestic tickets or any tour activities prior to VISA issuance is highly discouraged. Non-compliance to this doesn't make the company liable to any applicable penalities
                                to be paid to the airline in case of any changes in the booking. For non-VISA countries, it is highly suggested to book domestic tickets that has atleast 14 hours to 24 hours allowance to your international flight for possible flight changes and delays

                                The Travel and Tour comapny is not liable for any missed connections resulting from the flight cancellations, delays, or changes to the itinerary whether it will be purchased outside the company or by client's own acocunt.
                            </p>

                            <div style={sectionHeaderStyle}>Package</div>
                            <p style={textStyle}>
                                Some packages requires a certain number of passengers in order to proceed. In the event that the required number of travelers was not met by the travel company and tour operator, they have the right to transfer passengers with PREVIOUS DENIED VISA will not be accepted.
                                Some documents are needed to be submitted to the embassy/immigration if necesary. The rate quoted is based on a minimum number of travelers per departure. Lead guest must understand that the rate will vary if minimum number of travlers was not met or is subject to new quotation.
                            </p>


                            {/* Red Acknowledgment Text */}
                            <p style={{ ...textStyle, color: '#b22222', fontWeight: 'bold', fontStyle: 'italic', marginTop: '15px' }}>
                                I have read and understand the Terms & Conditions detailed above and the Special Booking Conditions as stated out in the T&C of the tour package quotation I have availed, and accept them on behalf of myself and my party.
                            </p>
                        </Col>
                    </Row>
                </div>

                {/* Final Signature Section */}
                <div style={{ marginTop: '50px' }}>
                    <Form form={form} onValuesChange={onValuesChange}>
                        <Row gutter={40}>
                            <Col span={12}>
                                <Form.Item name="leadFullName" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '45px', textAlign: 'center' }} readOnly />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Signature over printed name</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="waiverDate" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '45px', textAlign: 'center' }} readOnly />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Date</div>
                            </Col>
                        </Row>
                    </Form>
                </div>
            </div>
        </div >
    );
}