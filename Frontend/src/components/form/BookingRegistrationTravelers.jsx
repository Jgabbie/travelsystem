import React, { useEffect } from 'react';
import { Form, Input, Select, Row, Col, DatePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css'

const { Option } = Select;

export default function BookingRegistrationTravelers({ form, onValuesChange, summary, totalCount }) {

    // Sync table rows with the traveler counters
    useEffect(() => {
        const currentTravelers = form.getFieldValue('travelers') || [];
        if (currentTravelers.length < totalCount) {
            // Add rows if count increased
            const diff = totalCount - currentTravelers.length;
            const newRows = [...currentTravelers, ...Array(diff).fill({})];
            form.setFieldsValue({ travelers: newRows });
        } else if (currentTravelers.length > totalCount) {
            // Remove rows from the end if count decreased
            const newRows = currentTravelers.slice(0, totalCount);
            form.setFieldsValue({ travelers: newRows });
        }
    }, [totalCount, form]);

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: '#305797' }
            }}
        >
            <div className="mrc-overlay-wrapper">
                <div className="mrc-form-page">
                    <div className="mrc-form-header" style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <img src="/images/Logo.png" alt="MRC Travel Logo" className="mrc-logo" style={{ height: '200px', marginBottom: '30px' }} />
                        <div className="mrc-booking-section-header">
                            BOOKING REGISTRATION FORM
                        </div>
                    </div>

                    {/* 2. Registration & Package Details */}
                    <div className="mrc-tour-details" style={{ marginBottom: '15px' }}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="dateOfRegistration" label={<span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>DATE OF REGISTRATION</span>}>
                                    <Input size="small" className='mrc-tour-details-input' />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="packageTravelDate" label={<span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>PACKAGE TRAVEL DATE</span>} style={{ marginBottom: '4px' }}>
                                    <Input size="small" className='mrc-tour-details-input' />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="tourPackageTitle" label={<span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>TOUR PACKAGE TITLE</span>} style={{ marginBottom: '4px' }}>
                                    <Input size="small" className='mrc-tour-details-input' />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="tourPackageVia" label={<span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>TOUR PACKAGE VIA</span>} style={{ marginBottom: '4px' }}>
                                    <Input size="small" className='mrc-tour-details-input' />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onValuesChange={onValuesChange}
                        initialValues={{ travelers: Array(totalCount).fill({}) }}
                    >
                        {/* LEAD GUEST SECTION */}
                        <div className="mrc-lead-guest-section">
                            {/* Section Header */}
                            <div className='mrc-lead-guest-section-header'>
                                LEAD GUEST INFORMATION
                            </div>

                            {/* Title and Full Name Row */}
                            <Row gutter={16}>
                                <Col span={6}>
                                    <Form.Item
                                        name="leadTitle"
                                        label={<span style={{ fontSize: '10px', fontWeight: 'bold' }}>TITLE:</span>}
                                        style={{ marginBottom: '4px' }}
                                    >
                                        <Input
                                            size="small"
                                            placeholder="MR/MS"
                                            className="mrc-lead-guest-section-input"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={18}>
                                    <Form.Item
                                        name="leadFullName"
                                        label={<span style={{ fontSize: '10px', fontWeight: 'bold' }}>FULL NAME:</span>}
                                        style={{ marginBottom: '4px' }}
                                    >
                                        <Input
                                            size="small"
                                            className="mrc-lead-guest-section-input"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            {/* Email and Contact Details Row */}
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="leadEmail"
                                        label={<span style={{ fontSize: '10px', fontWeight: 'bold' }}>EMAIL ADD:</span>}
                                        style={{ marginBottom: '4px' }}
                                    >
                                        <Input
                                            size="small"
                                            className="mrc-lead-guest-section-input"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="leadContact"
                                        label={<span style={{ fontSize: '10px', fontWeight: 'bold' }}>CONTACT DETAILS:</span>}
                                        style={{ marginBottom: '4px' }}
                                    >
                                        <Input
                                            size="small"
                                            className="mrc-lead-guest-section-input"
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            {/* Address Row */}
                            <Row gutter={0}>
                                <Col span={24}>
                                    <Form.Item
                                        name="leadAddress"
                                        label={<span style={{ fontSize: '10px', fontWeight: 'bold' }}>ADDRESS:</span>}
                                        style={{ marginBottom: '10px' }}
                                    >
                                        <Input
                                            size="small"
                                            style={{ borderRadius: 0, height: '22px', borderBottom: '1px solid black', borderTop: 0, borderLeft: 0, borderRight: 0, fontSize: '11px' }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        {/* PASSENGER TABLE SECTION */}
                        <h3 className="mrc-passengers-section-header">PASSENGER LIST (Including Lead Guest)</h3>

                        <div className="mrc-table-container">
                            <Form.List name="travelers">
                                {(fields) => (
                                    <>
                                        {/* 1. Header Row */}
                                        <Row gutter={0} align="middle" style={{ background: '#e6f7ff', border: '1px solid #d9d9d9', textAlign: 'center' }}>
                                            <Col span={1} style={{ fontWeight: 'bold', fontSize: '10px', padding: '2px 0' }}>NO</Col>
                                            <Col span={2} style={{ fontWeight: 'bold', fontSize: '10px', padding: '2px 0', borderLeft: '1px solid #d9d9d9' }}>TITLE</Col>
                                            <Col span={4} style={{ fontWeight: 'bold', fontSize: '10px', padding: '2px 0', borderLeft: '1px solid #d9d9d9' }}>FIRST NAME</Col>
                                            <Col span={4} style={{ fontWeight: 'bold', fontSize: '10px', padding: '2px 0', borderLeft: '1px solid #d9d9d9' }}>LAST NAME</Col>
                                            <Col span={3} style={{ fontWeight: 'bold', fontSize: '10px', padding: '2px 0', borderLeft: '1px solid #d9d9d9' }}>ROOM</Col>
                                            <Col span={3} style={{ fontWeight: 'bold', fontSize: '10px', padding: '2px 0', borderLeft: '1px solid #d9d9d9' }}>BIRTHDAY</Col>
                                            <Col span={1} style={{ fontWeight: 'bold', fontSize: '10px', padding: '2px 0', borderLeft: '1px solid #d9d9d9' }}>AGE</Col>
                                            <Col span={3} style={{ fontWeight: 'bold', fontSize: '10px', padding: '2px 0', borderLeft: '1px solid #d9d9d9' }}>PASSPORT #</Col>
                                            <Col span={3} style={{ fontWeight: 'bold', fontSize: '10px', padding: '2px 0', borderLeft: '1px solid #d9d9d9' }}>EXPIRY</Col>
                                        </Row>

                                        {/* 2. Data Rows */}
                                        {fields.map(({ key, name, ...restField }, index) => {
                                            // Shared style for all inputs to keep code clean
                                            const inputStyle = {
                                                fontSize: '10px',
                                                height: '20px',
                                                lineHeight: '1',
                                                padding: '0 4px',
                                                borderRadius: '0px',
                                                border: '1px solid #d9d9d9',
                                                borderTop: 'none' // Prevents double borders between rows
                                            };

                                            return (
                                                <Row key={key} gutter={0} align="middle">
                                                    <Col span={1} style={{ ...inputStyle, textAlign: 'center', background: '#fafafa' }}>{index + 1}</Col>

                                                    <Col span={2}>
                                                        <Form.Item {...restField} name={[name, 'title']} noStyle>
                                                            <Input placeholder="MR" style={inputStyle} />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={4}>
                                                        <Form.Item {...restField} name={[name, 'firstName']} noStyle>
                                                            <Input style={inputStyle} />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={4}>
                                                        <Form.Item {...restField} name={[name, 'lastName']} noStyle>
                                                            <Input style={inputStyle} />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={3}>
                                                        <Form.Item {...restField} name={[name, 'roomType']} noStyle>
                                                            <Select
                                                                size="small"
                                                                style={{ ...inputStyle, width: '100%', padding: 0 }}
                                                                // Select components need this to affect the inner box
                                                                variant="borderless"
                                                                className="mrc-select-flat"
                                                            >
                                                                <Option value="TWIN">TWIN</Option>
                                                                <Option value="DOUBLE">DOUBLE</Option>
                                                                <Option value="SINGLE">SINGLE</Option>
                                                                <Option value="TRIPLE">TRIPLE</Option>
                                                            </Select>
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={3}>
                                                        <Form.Item {...restField} name={[name, 'birthday']} noStyle>
                                                            <Input placeholder="MM/DD/YY" style={inputStyle} />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={1}>
                                                        <Form.Item {...restField} name={[name, 'age']} noStyle>
                                                            <Input style={{ ...inputStyle, textAlign: 'center', padding: 0 }} />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={3}>
                                                        <Form.Item {...restField} name={[name, 'passportNo']} noStyle>
                                                            <Input style={inputStyle} />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={3}>
                                                        <Form.Item {...restField} name={[name, 'passportExpiry']} noStyle>
                                                            <Input placeholder="MM/DD/YY" style={inputStyle} />
                                                        </Form.Item>
                                                    </Col>
                                                </Row>
                                            );
                                        })}
                                    </>
                                )}
                            </Form.List>
                        </div>

                        <div className="mrc-form-footer" style={{ marginTop: '20px' }}>
                            <Row gutter={24}>
                                <Col span={12}>
                                    <div className="mrc-guide-box" style={{ border: '1px solid #d9d9d9', padding: '10px', fontSize: '11px' }}>
                                        <strong style={{ color: '#d32f2f' }}>GUIDE IN ROOM ASSIGNMENTS:</strong>
                                        <p style={{ fontStyle: 'italic', margin: '4px 0' }}>*Important note: All room type requests are subject for availability. Use of SINGLE ROOM has a single supplement charge.</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '4px' }}>
                                            <strong>TWIN BED ROOM</strong> <span>- 1 Room with 2 single beds; 2 pax occupancy</span>
                                            <strong>DOUBLE ROOM</strong> <span>- 1 room with 1 double bed; 2 pax occupancy</span>
                                            <strong>SINGLE ROOM</strong> <span>- 1 room with 1 bed; 1 pax occupancy</span>
                                            <strong>TRIPLE ROOM</strong> <span>- 1 room with 3 single beds OR 1 double + 1 single</span>
                                        </div>
                                    </div>
                                </Col>
                                <Col span={12} style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                    <p>
                                        As the lead guest and the sole mediator between the Travel Agency and the guests enlisted of this group,
                                        I hereby confirm that all the above information is correct and true and I am happy for M&RC Travel and Tours
                                        to access this information when organizing this trip/travel for me.
                                    </p>
                                    <p>
                                        By signing this form, I allow M&RC Travel and Tours to keep all my and our group's data on file and access
                                        details which are necessary for this trip/travel and authorized by me.
                                    </p>
                                </Col>
                            </Row>
                        </div>

                    </Form>
                </div>
            </div>
        </ConfigProvider>
    );
}