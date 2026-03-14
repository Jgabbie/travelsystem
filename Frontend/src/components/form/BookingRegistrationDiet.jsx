import React, { useEffect } from 'react';
import { Form, Input, Select, Row, Col } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';

const { TextArea } = Input;
const { Option } = Select;

export default function BookingRegistrationDiet({ form, onValuesChange, summary }) {

    const boxStyle = { borderRadius: 0, border: '1px solid #000' };
    const labelStyle = { fontSize: '11px', fontWeight: 'bold', color: '#000' };

    useEffect(() => {
        form.setFieldsValue({
            signatureDate: dayjs().format('MMMM DD, YYYY')
        });
    }, [form]);

    return (
        <div className="mrc-overlay-wrapper">
            <div className="mrc-form-page" style={{ padding: '20px', backgroundColor: '#fff' }}>
                <div className="mrc-form-header" style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <img src="/images/Logo.png" alt="MRC Travel Logo" className="mrc-logo" style={{ height: '80px', marginBottom: '10px' }} />
                    <div className="mrc-diet-header-title" >
                        TRAVEL REGISTRATION DETAILS
                    </div>
                    <p style={{ fontSize: '10px', fontStyle: 'italic', margin: '5px 0', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
                        Instructions: Please fill-up and write your answers inside each box.
                    </p>
                </div>

                <Form
                    form={form}
                    layout="horizontal"
                    onValuesChange={onValuesChange}
                    initialValues={{
                        tourPackageTitle: summary?.packageName,
                        packageTravelDate: summary?.travelDate
                    }}
                >
                    {/* Read-Only Package Info */}
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ fontSize: '11px' }}><strong>TOUR PACKAGE TITLE:</strong> {summary?.packageName || '____________________'}</div>
                        <div style={{ fontSize: '11px' }}><strong>PACKAGE TRAVEL DATE:</strong> {summary?.travelDate || '____________________'}</div>
                    </div>

                    {/* Dietary Section */}
                    <div style={{ marginBottom: '15px' }}>
                        <Row align="middle">
                            <Col span={18} style={labelStyle}>Does anyone in your group have any dietary requests?</Col>
                            <Col span={4}>
                                <Form.Item name="dietaryRequest" noStyle>
                                    <Select size="small" style={{ ...boxStyle, width: '60px' }} placeholder="N">
                                        <Option value="Y">Y</Option>
                                        <Option value="N">N</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                        <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '5px' }}>(Applicable for tour package with meal inclusions; if not included, please select N/A)</div>
                        <Form.Item label={<span style={{ fontSize: '10px' }}>If yes, please indicate details:</span>} name="dietaryDetails" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>
                            <TextArea rows={2} style={boxStyle} />
                        </Form.Item>
                    </div>

                    {/* Medical Section */}
                    <div style={{ marginBottom: '15px' }}>
                        <Row align="middle">
                            <Col span={18} style={labelStyle}>Does anyone in your group have any Allergies/Medical conditions?</Col>
                            <Col span={4}>
                                <Form.Item name="medicalRequest" noStyle>
                                    <Select size="small" style={{ ...boxStyle, width: '60px' }} placeholder="N">
                                        <Option value="Y">Y</Option>
                                        <Option value="N">N</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                        <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '5px' }}>(Applicable for tour package with meal inclusions; if not included, please select N/A)</div>
                        <Form.Item label={<span style={{ fontSize: '10px' }}>If yes, please indicate details:</span>} name="medicalDetails" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} style={{ marginTop: '5px' }}>
                            <TextArea rows={2} style={boxStyle} />
                        </Form.Item>
                    </div>

                    {/* Insurance Section */}
                    <div className="mrc-insurance-section" style={{ borderTop: '1px solid #000', paddingTop: '10px' }}>
                        <h4 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>TRAVEL INSURANCE</h4>
                        <p style={{ fontSize: '9px', lineHeight: '1.2' }}>
                            We highly encourage <strong>ALL OUR CLIENTS</strong> to have and are covered with travel insurance for health, repartriation,
                            loss of luggage/belongings and in case of cancellation, flight delays, and the like that is why purchasing of
                            travel insurance together with our tour packages is compulsory for your convenience and peace of mind.
                        </p>

                        <Row align="middle" style={{ marginBottom: '5px' }}>
                            <Col span={16} style={{ fontSize: '10px' }}>Do you agree to purchase a Travel Insurance from us?</Col>
                            <Col span={4}><Form.Item name="purchaseInsurance" noStyle><Input size="small" style={{ ...boxStyle, width: '60px' }} placeholder="Y/N" /></Form.Item></Col>
                        </Row>

                        <p style={{ fontSize: '9px', lineHeight: '1.2' }}>
                            Note: Purchasing of travel insurance from our Travel & Tours company does not hold us liable for any claims and
                            anything about the process of claims from the insurance company. We can only provide the documents from our suppliers,
                            operators, and airlines' end if necessary.
                        </p>

                        <Row align="middle" style={{ marginBottom: '5px' }}>
                            <Col span={16} style={{ fontSize: '10px' }}>Do you agree to purchase a Travel Insurance from us?</Col>
                            <Col span={4}><Form.Item name="ownInsurance" noStyle><Input size="small" style={{ ...boxStyle, width: '60px' }} placeholder="Y/N" /></Form.Item></Col>
                        </Row>
                    </div>

                    {/* ADDED DETAILS SECTION BASED ON IMAGE */}
                    <div style={{ marginTop: '10px' }}>
                        <Row>
                            <Col span={8} style={{ border: '1px solid #000', padding: '5px', fontSize: '10px', fontWeight: 'bold', textAlign: 'right', backgroundColor: '#f9f9f9' }}>
                                If YES, please indicate details:
                            </Col>
                            <Col span={16} style={{ border: '1px solid #000', borderLeft: 'none', padding: '5px', fontSize: '9px', fontStyle: 'italic' }}>
                                Please check the conditions and coverage carefully and send us a copy of the policy so we can review as well.
                            </Col>
                        </Row>
                        <Row>
                            <Col span={8} style={{ border: '1px solid #000', borderTop: 'none', padding: '5px', fontSize: '10px', fontWeight: 'bold', textAlign: 'right', backgroundColor: '#f9f9f9' }}>
                                If NO but chose not to purchase Travel Insurance from us:
                            </Col>
                            <Col span={16} style={{ border: '1px solid #000', borderTop: 'none', borderLeft: 'none', padding: '5px', fontSize: '9px', fontWeight: 'bold' }}>
                                I understand that I am waiving the right of any assistance from the travel and tours company related to claims.
                            </Col>
                        </Row>
                    </div>


                    {/* Emergency Contact Grid */}
                    <div style={{ marginTop: '15px' }}>
                        <div style={{ background: '#ADD8E6', padding: '2px 10px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #000' }}>
                            EMERGENCY CONTACT <span style={{ fontWeight: 'normal', fontSize: '9px' }}>(i.e: the person to contact in the event of an emergency while you are away)</span>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginTop: '5px' }}>
                            <tbody>
                                {/* Row 1: Title and Full Name */}
                                <tr>
                                    <td style={{ border: '1px solid #000', width: '10%', padding: '4px', fontWeight: 'bold' }}>Title:</td>
                                    <td style={{ border: '1px solid #000', width: '20%' }}>
                                        <Form.Item name="emergencyTitle" noStyle>
                                            <Input variant="borderless" size="small" style={{ fontSize: '10px' }} />
                                        </Form.Item>
                                    </td>
                                    <td style={{ border: '1px solid #000', width: '15%', padding: '4px', fontWeight: 'bold' }}>Full name:</td>
                                    <td style={{ border: '1px solid #000', width: '55%' }}>
                                        <Form.Item name="emergencyName" noStyle>
                                            <Input variant="borderless" size="small" style={{ fontSize: '10px' }} />
                                        </Form.Item>
                                    </td>
                                </tr>

                                {/* Row 2: Email, Contact No, and Relation */}
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Email Add</td>
                                    <td style={{ border: '1px solid #000' }}>
                                        <Form.Item name="emergencyEmail" noStyle>
                                            <Input variant="borderless" size="small" style={{ fontSize: '10px' }} />
                                        </Form.Item>
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>Contact no:</td>
                                    <td style={{ border: '1px solid #000' }}>
                                        <div style={{ display: 'flex', width: '100%' }}>
                                            <div style={{ flex: 1 }}>
                                                <Form.Item name="emergencyContact" noStyle>
                                                    <Input variant="borderless" size="small" style={{ fontSize: '10px' }} />
                                                </Form.Item>
                                            </div>
                                            <div style={{ borderLeft: '1px solid #000', padding: '4px', width: '80px', fontWeight: 'bold' }}>Relation</div>
                                            <div style={{ flex: 1, borderLeft: '1px solid #000' }}>
                                                <Form.Item name="emergencyRelation" noStyle>
                                                    <Input variant="borderless" size="small" style={{ fontSize: '10px' }} />
                                                </Form.Item>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Signature Area */}
                    <div style={{ marginTop: '30px' }}>
                        <Row gutter={40}>
                            <Col span={12}>
                                <Form.Item name="signature" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '40px' }} />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Type your fullname</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="signatureDate" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '40px' }} readOnly />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Date</div>
                            </Col>
                        </Row>
                    </div>
                </Form>
            </div >
        </div >
    );
}