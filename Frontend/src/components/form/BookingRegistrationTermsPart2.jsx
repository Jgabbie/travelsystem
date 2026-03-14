import React from 'react';
import { Row, Col, Input, Form } from 'antd';
import '../../style/components/mrcregistration.css';

export default function BookingRegistrationTermsPart2({ form, onValuesChange }) {
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
    const textStyle = { fontSize: '9px', lineHeight: '1.3', textAlign: 'justify', marginBottom: '12px' };

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
                        <Col span={11}>
                            <div style={sectionHeaderStyle}>Waiver & Disclaimer</div>
                            <p style={textStyle}>
                                Our travel company is not liable for changes of flight, tours and hotel accommodation due to weather, transportation, property renovation related issue, force majeure, acts of terrorism, and other unforeseen events that is company's out of control...
                            </p>

                            <div style={sectionHeaderStyle}>Lead Guest Liabilities and Responsibilities</div>
                            <p style={textStyle}>
                                I am responsible in ensuring that all the participants have all the required documents necessary for travel abroad such as visa and other related documents... I am the sole mediator between the Travel Agency and the guests enlisted in the group.
                                <br /><br />
                                I understand that our FINAL travel documents will be provided 3-7 days before departure or as soon as available as your trip will required to be finalized before being sent to our valued clients.
                            </p>
                        </Col>

                        {/* Right Column */}
                        <Col span={13}>
                            <div style={sectionHeaderStyle}>Security Deposits</div>
                            <p style={textStyle}>
                                Certain hotels and resorts require a security deposit to cover potential charges, damages, or additional services used during stay. The security deposit is payable directly to M&RC. The hotel may deduct from the security deposit for, but not limited to, damage to hotel property, missing items, smoking penalties, unpaid bills or incidental expenses.
                            </p>

                            <div style={sectionHeaderStyle}>Purchasing of Domestic Tickets</div>
                            <p style={textStyle}>
                                For purchased International Tour packages to visa countries, purchasing of domestic tickets or any tour activities prior to visa issuance is highly discouraged. Non-compliance to this doesn't make company liable to any applicable penalties to be paid to the airline in case of any changes in the booking.
                            </p>

                            <div style={sectionHeaderStyle}>Package</div>
                            <p style={textStyle}>
                                Some packages requires a certain number of passengers in order to proceed. In the event that the required number of pax was not met by the travel company and tour operator, they have the right to transfer passengers to other available travel dates... The rate quoted is based on a minimum # of pax per departure.
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
                                <Form.Item name="waiverSignature" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '45px' }} />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Type your full name</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="waiverDate" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '45px' }} />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Date</div>
                            </Col>
                        </Row>
                    </Form>
                </div>
            </div>
        </div>
    );
}