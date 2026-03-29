import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Row, Col, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css'
import axiosInstance from '../../config/axiosConfig';

export default function BookingRegistrationTravelers({ form, onValuesChange, summary, totalCount }) {

    const boxStyle = { borderRadius: 0, border: '1px solid #000' };
    const [userProfile, setUserProfile] = useState({})

    console.log("summary in travelers:", summary);

    const bookingType = summary.bookingType || 'No Booking';

    const roomOptions =
        bookingType === 'Solo Booking'
            ? [{ value: 'SINGLE', label: 'SINGLE' }]
            : bookingType === 'Group Booking'
                ? [
                    { value: 'TWIN', label: 'TWIN' },
                    { value: 'DOUBLE', label: 'DOUBLE' },
                    { value: 'TRIPLE', label: 'TRIPLE' },
                ]
                : [
                    { value: 'TWIN', label: 'TWIN' },
                    { value: 'DOUBLE', label: 'DOUBLE' },
                    { value: 'SINGLE', label: 'SINGLE' },
                    { value: 'TRIPLE', label: 'TRIPLE' },
                ];

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await axiosInstance.get('/user/data', { withCredentials: true });

                const u = response.data?.userData

                const user = {
                    firstName: u.firstname,
                    lastName: u.lastname,
                    fullName: `${u.firstname} ${u.lastname}`,
                    email: u.email,
                    phone: u.phone,
                    homeAddress: u.homeAddress,
                }

                form.setFieldsValue({
                    leadFullName: user.fullName,
                    leadEmail: user.email,
                    leadContact: user.phone,
                    leadAddress: user.homeAddress,
                    travelersSignature: user.fullName
                });

                console.log("user data response:", user);
                setUserProfile(user);

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        fetchUserData();
    }, [])


    useEffect(() => {


        const currentTravelers = form.getFieldValue('travelers') || [];
        if (currentTravelers.length < totalCount) {
            const diff = totalCount - currentTravelers.length;
            const newRows = [...currentTravelers, ...Array(diff).fill({})];
            form.setFieldsValue({ travelers: newRows });
        } else if (currentTravelers.length > totalCount) {
            const newRows = currentTravelers.slice(0, totalCount);
            form.setFieldsValue({ travelers: newRows });
        }
    }, [totalCount, form]);

    useEffect(() => {
        const travelers = form.getFieldValue('travelers') || [];
        if (!userProfile.firstName) return;

        const isSolo = bookingType === 'Solo Booking';
        const isGroup = bookingType === 'Group Booking';

        travelers[0] = {
            ...travelers[0],
            title: 'MR',
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            roomType: isSolo ? 'SINGLE' : travelers[0]?.roomType
        };

        const updatedTravelers = travelers.map((t) => ({
            ...t,
            roomType:
                isSolo
                    ? 'SINGLE'
                    : isGroup && t?.roomType === 'SINGLE'
                        ? undefined
                        : t?.roomType
        }));

        form.setFieldsValue({
            travelers: updatedTravelers,
            dateOfRegistration: dayjs().format('MM/DD/YYYY'),
            tourPackageTitle: summary.packageName,
            tourPackageVia: summary.airlineOptions?.[0]?.name
                ? summary.airlineOptions[0].type === "fixed"
                    ? summary.airlineOptions[0].name
                    : 'N/A'
                : 'N/A',
            packageTravelDate: dayjs(summary.travelDate).format('MM/DD/YYYY'),
            travelersDate: dayjs().format('MMMM DD, YYYY'),
        });

        const countDiff = totalCount - updatedTravelers.length;
        if (countDiff > 0) {
            form.setFieldsValue({
                travelers: [...updatedTravelers, ...Array(countDiff).fill({})]
            });
        } else if (countDiff < 0) {
            form.setFieldsValue({
                travelers: updatedTravelers.slice(0, totalCount)
            });
        }

    }, [totalCount, userProfile, form, bookingType]);

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: '#305797' }
            }}
        >
            <div className="mrc-overlay-wrapper">
                <div className="mrc-form-page" style={{ padding: '20px', backgroundColor: '#fff' }}>
                    <div className="mrc-form-header" style={{ textAlign: 'center', marginBottom: '10px' }}>
                        <img src="/images/Logo.png" alt="MRC Travel Logo" className="mrc-logo" style={{ height: '80px', marginBottom: '10px' }} />
                        <div className="mrc-booking-section-header">
                            BOOKING REGISTRATION FORM
                        </div>
                    </div>

                    <Form
                        form={form}
                        layout="vertical"
                        onValuesChange={onValuesChange}
                        initialValues={{ travelers: Array(totalCount).fill({}) }}
                        validateMessages={{ required: '' }}
                    >

                        {/* 2. Registration & Package Details */}
                        <div className="mrc-tour-details" style={{ marginBottom: '15px' }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="dateOfRegistration" label={<span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>DATE OF REGISTRATION</span>}>
                                        <Input size="small" className='mrc-tour-details-input' readOnly />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="packageTravelDate" label={<span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>PACKAGE TRAVEL DATE</span>} style={{ marginBottom: '4px' }}>
                                        <Input size="small" className='mrc-tour-details-input' readOnly />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="tourPackageTitle" label={<span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>TOUR PACKAGE TITLE</span>} style={{ marginBottom: '4px' }}>
                                        <Input size="small" className='mrc-tour-details-input' readOnly />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="tourPackageVia" label={<span style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '6px' }}>TOUR PACKAGE VIA</span>} style={{ marginBottom: '4px' }}>
                                        <Input size="small" className='mrc-tour-details-input' readOnly />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

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
                                        rules={[
                                            { required: true },
                                        ]}
                                        help={null}
                                        validateStatus={undefined}
                                    >
                                        <Select
                                            size="small"
                                            style={{ width: '100%', padding: 0 }}
                                            // Select components need this to affect the inner box
                                            variant="borderless"
                                            placeholder="MR/MS"
                                            className="mrc-lead-guest-section-input"
                                            options={[
                                                { value: 'MR', label: 'MR' },
                                                { value: 'MS', label: 'MS' },
                                            ]}

                                        >
                                        </Select>
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
                                            readOnly
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
                                            readOnly
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
                                            readOnly
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
                                            readOnly
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.leadTitle !== currentValues.leadTitle}>
                            {() => {
                                const value = form.getFieldValue('leadTitle');
                                const isInvalid = value && value !== 'MR' && value !== 'MS';
                                const isEmpty = !value;

                                return isEmpty || isInvalid ? (
                                    <div style={{
                                        color: '#ff4d4f',
                                        fontSize: '11px',
                                        fontWeight: 'bold',
                                        marginTop: '4px',
                                        marginBottom: '0px',
                                        padding: '0px'
                                    }}>
                                        {isEmpty ? 'Please select a title' : 'Title must be MR or MS'}
                                    </div>
                                ) : null;
                            }}
                        </Form.Item>

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
                                            const isFirstRow = index === 0;
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
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'title']}
                                                            noStyle
                                                            rules={[
                                                                { required: true, message: 'Please select a title' },
                                                                {
                                                                    validator: (_, value) =>
                                                                        value === 'MR' || value === 'MS'
                                                                            ? Promise.resolve()
                                                                            : Promise.reject(new Error('Title must be MR or MS')),
                                                                },
                                                            ]}>
                                                            <Select
                                                                size="small"
                                                                style={{ ...inputStyle, width: '100%', padding: 0 }}
                                                                disabled={isFirstRow}
                                                                variant="borderless"
                                                                placeholder="MR/MS"
                                                                options={[
                                                                    { value: 'MR', label: 'MR' },
                                                                    { value: 'MS', label: 'MS' },
                                                                ]}
                                                            >
                                                            </Select>
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={4}>
                                                        <Form.Item {...restField} name={[name, 'firstName']} noStyle>
                                                            <Input disabled={isFirstRow} style={inputStyle} />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={4}>
                                                        <Form.Item {...restField} name={[name, 'lastName']} noStyle>
                                                            <Input disabled={isFirstRow} style={inputStyle} />
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
                                                                options={roomOptions}
                                                            >
                                                            </Select>
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={3}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'birthday']}
                                                            noStyle
                                                            rules={[
                                                                { required: true, message: 'Please enter birthday' },
                                                                {
                                                                    validator: (_, value) => {
                                                                        if (!value) return Promise.reject('Please enter birthday');
                                                                        // Basic MM/DD/YY format check
                                                                        const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{2}$/;
                                                                        return regex.test(value)
                                                                            ? Promise.resolve()
                                                                            : Promise.reject(new Error('Birthday must be in MM/DD/YY format'));
                                                                    },
                                                                },
                                                            ]}
                                                        >
                                                            <Input placeholder="MM/DD/YY" style={inputStyle} />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={1}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'age']}
                                                            noStyle
                                                            rules={[
                                                                { required: true, message: 'Please enter age' },
                                                                {
                                                                    type: 'number',
                                                                    min: 0,
                                                                    max: 120,
                                                                    transform: (value) => Number(value),
                                                                    message: 'Age must be a valid number between 0 and 120',
                                                                },
                                                            ]}
                                                        >
                                                            <Input style={{ ...inputStyle, textAlign: 'center', padding: 0 }} />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={3}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'passportNo']}
                                                            noStyle
                                                            rules={[
                                                                { required: true, message: 'Please enter passport number' },
                                                                {
                                                                    pattern: /^[a-zA-Z0-9]{5,20}$/,
                                                                    message: 'Passport number must be 5–20 alphanumeric characters',
                                                                },
                                                            ]}
                                                        >
                                                            <Input style={inputStyle} />
                                                        </Form.Item>
                                                    </Col>

                                                    <Col span={3}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'passportExpiry']}
                                                            noStyle
                                                            rules={[
                                                                { required: true, message: 'Please enter passport expiry date' },
                                                                {
                                                                    validator: (_, value) => {
                                                                        if (!value) return Promise.reject('Please enter passport expiry date');
                                                                        const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{2}$/;
                                                                        return regex.test(value)
                                                                            ? Promise.resolve()
                                                                            : Promise.reject(new Error('Expiry must be in MM/DD/YY format'));
                                                                    },
                                                                },
                                                            ]}
                                                        >
                                                            <Input placeholder="MM/DD/YY" style={inputStyle} />
                                                        </Form.Item>
                                                    </Col>
                                                </Row>
                                            );
                                        })}
                                    </>
                                )}
                            </Form.List>

                            <Form.Item shouldUpdate>
                                {() => {
                                    const travelers = form.getFieldValue('travelers') || [];

                                    const hasIncomplete = travelers.some((t) => {
                                        return !t ||
                                            !t.title ||
                                            !t.firstName ||
                                            !t.lastName ||
                                            !t.roomType ||
                                            !t.birthday ||
                                            !t.age ||
                                            !t.passportNo ||
                                            !t.passportExpiry;
                                    });

                                    return hasIncomplete ? (
                                        <div style={{
                                            color: '#ff4d4f',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            marginTop: '8px'
                                        }}>
                                            Please complete all traveler details before proceeding.
                                        </div>
                                    ) : null;
                                }}
                            </Form.Item>
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

                        {/* Signature Area */}
                        <div style={{ marginTop: '30px' }}>
                            <Row gutter={40}>
                                <Col span={12}>
                                    <Form.Item name="travelersSignature" style={{ marginBottom: 0 }}>
                                        <Input style={{ ...boxStyle, height: '40px', textAlign: 'center' }} readOnly />
                                    </Form.Item>
                                    <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Signature over printed name</div>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="travelersDate" style={{ marginBottom: 0 }}>
                                        <Input style={{ ...boxStyle, height: '40px', textAlign: 'center' }} value={new Date().toLocaleDateString()} readOnly />
                                    </Form.Item>
                                    <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', fontWeight: 'bold' }}>Date</div>
                                </Col>
                            </Row>
                        </div>

                    </Form>
                </div>
            </div>
        </ConfigProvider>
    );
}