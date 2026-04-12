import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Row, Col } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';


const { TextArea } = Input;

export default function BookingRegistrationDietInvoice({ form, onValuesChange, summaryInvoice }) {
    const [dietInfo, setDietInfo] = useState(null);

    const boxStyle = { borderRadius: 0, border: '1px solid #000' };
    const labelStyle = { fontSize: '11px', fontWeight: 'bold', color: '#000' };

    const formatTravelDate = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        const start = value.startDate ? dayjs(value.startDate) : null;
        const end = value.endDate ? dayjs(value.endDate) : null;
        if (start?.isValid() && end?.isValid()) {
            return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
        }
        if (start?.isValid()) {
            return start.format('MMM D, YYYY');
        }
        return '';
    };

    useEffect(() => {

        if (!summaryInvoice) return

        const diet = {
            fullName: summaryInvoice.leadFullName,
            tourPackageTitle: summaryInvoice.tourPackageTitle,
            travelDate: formatTravelDate(summaryInvoice.travelDate),
            dietaryDetails: summaryInvoice.dietaryDetails,
            dietaryRequest: summaryInvoice.dietaryRequest,
            medicalDetails: summaryInvoice.medicalDetails,
            medicalRequest: summaryInvoice.medicalRequest,
            purchaseInsurance: summaryInvoice.purchaseInsurance,
            ownInsurance: summaryInvoice.ownInsurance,
            emergencyContact: summaryInvoice.emergencyContact,
            emergencyEmail: summaryInvoice.emergencyEmail,
            emergencyName: summaryInvoice.emergencyName,
            emergencyRelation: summaryInvoice.emergencyRelation,
            emergencyTitle: summaryInvoice.emergencyTitle,
        }

        form.setFieldsValue({
            leadFullName: diet.fullName,
            tourPackageTitle: diet.tourPackageTitle,
            travelDate: diet.travelDate,
            dietaryDetails: diet.dietaryDetails,
            dietaryRequest: diet.dietaryRequest,
            medicalDetails: diet.medicalDetails,
            medicalRequest: diet.medicalRequest,
            purchaseInsurance: diet.purchaseInsurance,
            ownInsurance: diet.ownInsurance,
            emergencyContact: diet.emergencyContact,
            emergencyEmail: diet.emergencyEmail,
            emergencyName: diet.emergencyName,
            emergencyRelation: diet.emergencyRelation,
            emergencyTitle: diet.emergencyTitle,
            signatureDate: dayjs().format('MMMM DD, YYYY'),
        });

        console.log("diet data response:", diet);
        setDietInfo(diet);
    }, [summaryInvoice]);

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
                        tourPackageTitle: dietInfo?.tourPackageTitle || "____________________",
                        packageTravelDate: dietInfo?.travelDate || "____________________"
                    }}
                >
                    {/* Read-Only Package Info */}
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ fontSize: '11px' }}><strong>TOUR PACKAGE TITLE:</strong> {summaryInvoice?.tourPackageTitle || '____________________'}</div>
                        <div style={{ fontSize: '11px' }}><strong>PACKAGE TRAVEL DATE:</strong> {formatTravelDate(summaryInvoice?.travelDate) || '____________________'}</div>
                    </div>

                    {/* Dietary Section */}
                    <div style={{ marginBottom: '15px' }}>
                        <Row align="middle">
                            <Col span={18} style={labelStyle}>Does anyone in your group have any dietary requests?</Col>
                            <Col span={4}>
                                <Form.Item
                                    name="dietaryRequest"
                                    rules={[{ required: true, message: 'Required' }]}
                                    noStyle
                                >
                                    <Input size="small" style={{ ...boxStyle, width: '60px', textAlign: 'center' }} readOnly />
                                </Form.Item>
                            </Col>
                        </Row>
                        <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '5px' }}>(Applicable for tour package with meal inclusions; if not included, please select N/A)</div>
                        <Form.Item
                            label={<span style={{ fontSize: '10px' }}>If yes, please indicate details:</span>}
                            name="dietaryDetails"
                            labelCol={{ span: 6 }}
                            wrapperCol={{ span: 18 }}
                            dependencies={['dietaryRequest']}
                            disabled={form.getFieldValue('dietaryRequest') !== 'Y'}
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (getFieldValue('dietaryRequest') === 'Y' && !value) {
                                            return Promise.reject('Please provide dietary details');
                                        }
                                        return Promise.resolve();
                                    }
                                })
                            ]}
                        >
                            <TextArea rows={2} style={boxStyle} readOnly />
                        </Form.Item>
                    </div>

                    {/* Medical Section */}
                    <div style={{ marginBottom: '15px' }}>
                        <Row align="middle">
                            <Col span={18} style={labelStyle}>Does anyone in your group have any Allergies/Medical conditions?</Col>
                            <Col span={4}>
                                <Form.Item
                                    name="medicalRequest"
                                    rules={[{ required: true, message: 'Required' }]}
                                    noStyle
                                >
                                    <Input size="small" style={{ ...boxStyle, width: '60px', textAlign: 'center' }} readOnly />
                                </Form.Item>
                            </Col>
                        </Row>
                        <div style={{ fontSize: '9px', fontStyle: 'italic', marginBottom: '5px' }}>(Applicable for tour package with meal inclusions; if not included, please select N/A)</div>
                        <Form.Item
                            label={<span style={{ fontSize: '10px' }}>If yes, please indicate details:</span>}
                            name="medicalDetails" labelCol={{ span: 6 }}
                            wrapperCol={{ span: 18 }}
                            style={{ marginTop: '5px' }}
                            dependencies={['medicalRequest']}
                            disabled={form.getFieldValue('medicalRequest') !== 'Y'}
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (getFieldValue('medicalRequest') === 'Y' && !value) {
                                            return Promise.reject('Please provide medical details');
                                        }
                                        return Promise.resolve();
                                    }
                                })
                            ]}
                        >
                            <TextArea rows={2} style={boxStyle} readOnly />
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
                            <Col span={4}>
                                <Form.Item
                                    name="purchaseInsurance"
                                    noStyle
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <Input size="small" style={{ ...boxStyle, width: '60px', textAlign: 'center' }} readOnly />
                                </Form.Item>
                            </Col>
                        </Row>

                        <p style={{ fontSize: '9px', lineHeight: '1.2' }}>
                            Note: Purchasing of travel insurance from our Travel & Tours company does not hold us liable for any claims and
                            anything about the process of claims from the insurance company. We can only provide the documents from our suppliers,
                            operators, and airlines' end if necessary.
                        </p>

                        <Row align="middle" style={{ marginBottom: '5px' }}>
                            <Col span={16} style={{ fontSize: '10px' }}>Do you agree to purchase a Travel Insurance from us?</Col>
                            <Col span={4}>
                                <Form.Item
                                    name="ownInsurance"
                                    noStyle
                                    rules={[{ required: true, message: 'Required' }]}
                                >
                                    <Input size="small" style={{ ...boxStyle, width: '60px', textAlign: 'center' }} readOnly />
                                </Form.Item>
                            </Col>
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
                        {/* Header - slightly smaller font here too */}
                        <div style={{
                            background: '#ADD8E6',
                            padding: '3px 8px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            border: '1px solid #000',
                            borderBottom: 'none'
                        }}>
                            EMERGENCY CONTACT <span style={{ fontWeight: 'normal', fontSize: '9px' }}>(i.e: the person to contact in the event of an emergency while you are away)</span>
                        </div>

                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            fontSize: '10px',
                            tableLayout: 'fixed',
                            lineHeight: '1',
                        }}>
                            <colgroup>
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '30%' }} />
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '16%' }} />
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '16%' }} />
                            </colgroup>
                            <tbody>
                                {/* Row 1 */}
                                <tr style={{ height: '28px' }}>
                                    <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Title:</td>
                                    <td style={{ border: '1px solid #000', padding: '2px 4px' }}>
                                        <Form.Item name="emergencyTitle" noStyle>
                                            <Input variant="borderless" size="small" style={{ padding: 0 }} readOnly />
                                        </Form.Item>
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Full name:</td>
                                    <td colSpan={3} style={{ border: '1px solid #000', padding: '2px 4px' }}>
                                        <Form.Item name="emergencyName" noStyle>
                                            <Input variant="borderless" size="small" style={{ padding: 0 }} readOnly />
                                        </Form.Item>
                                    </td>
                                </tr>

                                {/* Row 2 */}
                                <tr style={{ height: '28px' }}>
                                    <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Email:</td>
                                    <td style={{ border: '1px solid #000', padding: '2px 4px' }}>
                                        <Form.Item name="emergencyEmail" noStyle>
                                            <Input
                                                variant="borderless"
                                                size="small"
                                                style={{ padding: 0, whiteSpace: 'nowrap' }}
                                                readOnly
                                            />
                                        </Form.Item>
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Contact Number:</td>
                                    <td style={{ border: '1px solid #000', padding: '2px 4px' }}>
                                        <Form.Item name="emergencyContact" noStyle>
                                            <Input variant="borderless" size="small" style={{ padding: 0 }} readOnly />
                                        </Form.Item>
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>Relation:</td>
                                    <td style={{ border: '1px solid #000', padding: '2px 4px' }}>
                                        <Form.Item name="emergencyRelation" noStyle>
                                            <Input variant="borderless" size="small" style={{ padding: 0 }} readOnly />
                                        </Form.Item>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Signature Area */}
                    <div style={{ marginTop: '30px' }}>
                        <Row gutter={40}>
                            <Col span={12}>
                                <Form.Item name="leadFullName" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '40px', textAlign: 'center' }} readOnly />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Signature over printed name</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="signatureDate" style={{ marginBottom: 0 }}>
                                    <Input style={{ ...boxStyle, height: '40px', textAlign: 'center' }} value={new Date().toLocaleDateString()} readOnly />
                                </Form.Item>
                                <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Date</div>
                            </Col>
                        </Row>
                    </div>

                    <div style={{ height: '150px' }}></div>
                </Form>
            </div >
        </div >
    );
}