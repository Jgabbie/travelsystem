import React from 'react';
import { Row, Col, Input, Form } from 'antd';
import '../../style/components/mrcregistration.css';

export default function BookingRegistrationTermsPart1({ form, onValuesChange }) {

    const boxStyle = { borderRadius: 0, border: '1px solid #000' };
    const sectionHeaderStyle = {
        background: '#ADD8E6',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '11px',
        padding: '2px',
        border: '1px solid #000',
        marginBottom: '5px'
    };
    const textStyle = { fontSize: '9px', lineHeight: '1.3', textAlign: 'justify', marginBottom: '10px' };

    return (
        <div className="mrc-overlay-wrapper">
            <div className="mrc-form-page" style={{ padding: '20px', backgroundColor: '#fff' }}>

                {/* Header Section */}
                <div className="mrc-form-header" style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <img src="/images/Logo.png" alt="MRC Travel Logo" style={{ height: '80px', marginBottom: '10px' }} />
                    <div style={{ padding: '10px', fontSize: '11px', textAlign: 'left' }}>
                        <p><strong>PAYMENT DETAILS</strong></p>
                        <p style={{ fontSize: '10px' }}>
                            We have multiple payment channels (BDO, GCASH, CC MAYA) with accounts names under M&RC TRAVEL AND TOURS and its owners, MR. RHON CARLE & MRS. MARICAR CARLE. Payments can only be paid directly to these accounts through online transfers, bank transfers, direct deposit or via credit card (via MAYA payment physical only with surcharge of <span style={{ color: 'red' }}>3.5%</span>).
                        </p>
                        <p style={{ fontSize: '10px', marginTop: '10px' }}>
                            As the lead guest and the sole mediator between the Travel Agency and the guests enlisted of this group, I hereby confirm that all the above information is correct and true and I am happy for M&RC Travel and Tours to access this information when organizing this trip/travel for me.
                        </p>
                    </div>
                    <div style={{ background: '#FFD700', fontWeight: 'bold', padding: '5px', fontSize: '13px', border: '1px solid #000', marginTop: '10px' }}>
                        GENERAL PACKAGE DISCLAIMER, TERMS & CONDITIONS
                    </div>
                </div>

                <div className="mrc-terms-content" style={{ marginTop: '15px' }}>
                    <Row gutter={20}>
                        {/* Left Column */}
                        <Col span={10}>
                            <p style={{ ...textStyle, fontStyle: 'italic', fontWeight: 'bold' }}>
                                Complete and signed copy this form must be sent together with all the participant's PASSPORT COPIES (for international) or VALID ID's (for domestic). Failure to send accomplished form will be subject to penalties or cancellation of your package...
                            </p>

                            <div style={sectionHeaderStyle}>PAYMENTS & PENALTIES</div>
                            <p style={textStyle}>
                                If you choose installment, you need to follow the payment schedule and failure to do so will be subject to penalties and/or cancellation of your tour package. We can only acknowledge payments that are directly paid to us by cash (at our office) and bank deposit...
                            </p>

                            <div style={sectionHeaderStyle}>CANCELLATION POLICY</div>
                            <p style={textStyle}>
                                Please refer to the quotation sent to you. All tour packages will not be converted to any travel funds in case the tour will not push through whether it be government mandated, due to natural calamities, etc. Tour Package purchase is non-refundable...
                            </p>
                        </Col>

                        {/* Right Column */}
                        <Col span={14}>
                            <div style={sectionHeaderStyle}>AMENDMENTS</div>
                            <p style={textStyle}>
                                Any amendment request such as changes in name (MINOR spelling only) date of birth of the passenger may have applicable charges.
                            </p>

                            <div style={sectionHeaderStyle}>PASSPORT & VISAS</div>
                            <p style={textStyle}>
                                Make sure your passport/ID is valid at least 6 months PRIOR to your onward and return date to avoid inconvenience. Your travel company is not liable for refusal of boarding due to passport validity...
                                <br /><br />
                                We appreciate honest declarations to avoid confusion / disapproval of VISA/Documents and/or prolonged processing. Any fake documents submitted for VISA application processing will be confiscated and payments will be forfeited...
                            </p>
                        </Col>
                    </Row>
                </div>

                {/* Signature Area */}
                <div style={{ marginTop: '40px' }}>
                    <Form form={form} onValuesChange={onValuesChange}>
                        <Row gutter={40}>
                            <Col span={12}>
                                <Form.Item name="termsSignature" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '45px' }} />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Type your full name</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="termsDate" style={{ marginBottom: 0 }}>
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