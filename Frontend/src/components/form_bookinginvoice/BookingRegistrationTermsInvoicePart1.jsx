import React, { useEffect } from 'react';
import { Row, Col, Input, Form } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';
import apiFetch from '../../config/fetchConfig';


export default function BookingRegistrationTermsInvoicePart1({ form, onValuesChange, summaryInvoice }) {
    const [userProfile, setUserProfile] = React.useState(null);

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
    const textStyle = { fontSize: '11px', lineHeight: '1.3', textAlign: 'justify', marginBottom: '10px' };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const user = form.setFieldsValue({
                    leadFullName: summaryInvoice.leadFullName,
                    leadEmail: summaryInvoice.leadEmail,
                    leadContact: summaryInvoice.leadContact,
                    leadAddress: summaryInvoice.leadAddress,
                    travelersSignature: summaryInvoice.travelersSignature,
                    termsDate: dayjs().format('MMMM DD, YYYY')
                });

                setUserProfile(user);

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        fetchUserData();
    }, [form])

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
                        <Col span={12}>
                            <p style={{ ...textStyle, fontStyle: 'italic', fontWeight: 'bold' }}>
                                Complete and signed copy this form must be sent together with all the participant's PASSPORT COPIES (for international) or VALID ID's (for domestic).
                                Failure to send accomplished form will be subject to penalties or cancellation of your package. Upon completion of your booking process and deposit, you will
                                receive a Booking Confirmation of your purchase and registration.
                            </p>

                            <p style={{ ...textStyle, fontStyle: 'italic', fontWeight: 'bold' }}>
                                By making any payments or purchase, this shall mean that you have read and agreed to the terms and conditions set forth in the quotation proposed
                                to you before purchasing.
                            </p>

                            <div style={sectionHeaderStyle}>PAYMENTS & PENALTIES</div>
                            <p style={textStyle}>
                                If you choose installment, you need to follow the payment schedule and failure to do so will be subject to penalties and/or cancellation of your
                                tour package. We can only acknowledge payments that are directly paid to us by cash (at our office) and bank deposit or online cashless transfers
                                to our official payment channels. Other mode of payments such as payment through a specific person such as M&RC Travel and Tours Staffs will not be
                                honoured.
                            </p>

                            <div style={sectionHeaderStyle}>CANCELLATION POLICY</div>
                            <p style={textStyle}>
                                Please refer to the quotation sent to you. All tour packages will not be converted to any travel funds in case the tour will not push through whether it
                                be government mandated, due to natural calamities, etc. Tour package purchase is non-refundable , non-reroutable, non-rebookable, and non-transferable
                                unless otherwise stated and is due to natural calamities and force majeur that is beyond our control otherwise NON-REFUNDABLE.
                            </p>
                        </Col>

                        {/* Right Column */}
                        <Col span={12}>
                            <div style={sectionHeaderStyle}>AMENDMENTS</div>
                            <p style={textStyle}>
                                Any amendment request such as changes in name (MINOR spelling only) date of birth of the passenger may have applicable charges.
                            </p>

                            <div style={sectionHeaderStyle}>PASSPORT & VISAS</div>
                            <p style={textStyle}>
                                Make sure your passport/ID is valid at least 6 months PRIOR to your onward and return date to avoid inconvenience. Our travel company is not liable for refusal
                                of boarding due to passport validity. For VISA assistance, failure to comply with the requirements on the deadlines may automatically result to cancellation of package.
                                Submission of VISA applications through travel agencies does not guarantee VISA approval. The discretion still lies upon the consul and company is not liable for such
                                decision. Our travel company will try our best to have your VISA approved but in the event of denied VISA, the amount indicated in the cancellation/refund policy per person
                                is non-refundable since airline, hotel and tour are all confirmed and guaranteed prior to VISA issuance.
                            </p>

                            <p style={textStyle}>
                                We appreciate honest declaration to avoid confusion/disapproval of VISA/Documents and/or prolonged processing. Any fake documents submitted for VISA application processing
                                will be confiscated and payments will be forfeited. This includes tampered and illegaly procured documents as verified by respective agencies. Moreover, the company has the right
                                to file charges against you.
                            </p>

                            <p style={textStyle}>
                                Original passport, with approve VISA will be release only once fully paid, once there is a valid travel or reason to secure the passport, client must submit notarized reasons and
                                stating for the compliance and to paid the balance as stated in the due date.
                            </p>
                        </Col>
                    </Row>
                </div>

                {/* Signature Area */}
                <div style={{ marginTop: '40px' }}>
                    <Form form={form} onValuesChange={onValuesChange}>
                        <Row gutter={40}>
                            <Col span={12}>
                                <Form.Item name="leadFullName" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '45px', textAlign: 'center' }} readOnly />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Signature over printed name</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="termsDate" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '45px', textAlign: 'center' }} readOnly />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Date</div>
                            </Col>
                        </Row>
                    </Form>
                </div>

                <div style={{ height: '235px' }}></div>
            </div>
        </div>
    );
}