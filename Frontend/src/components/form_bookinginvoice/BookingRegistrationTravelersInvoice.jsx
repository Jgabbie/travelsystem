import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Row, Col, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css'

export default function BookingRegistrationTravelersInvoice({ form, onValuesChange, summaryInvoice, totalCount }) {

    const boxStyle = { borderRadius: 0, border: '1px solid #000' };
    const [userProfile, setUserProfile] = useState({})

    const normalizeRoomType = (value) => String(value || '').trim().replace(/\s+\d+$/, '')

    const getRoomOccupancy = (roomType) => {
        const normalized = normalizeRoomType(roomType)
        if (normalized === 'TRIPLE') return 3
        if (normalized === 'TWIN' || normalized === 'DOUBLE') return 2
        return 1
    }

    const getDisplayRoomType = (travelers, index) => {
        const traveler = travelers[index] || {}
        const roomType = normalizeRoomType(traveler.roomType)

        if (!roomType) return ''
        if (roomType === 'SINGLE') return 'SINGLE'

        const sameRoomTypeIndex = travelers
            .slice(0, index)
            .filter((item) => normalizeRoomType(item?.roomType) === roomType)
            .length

        const roomNumber = Math.floor(sameRoomTypeIndex / getRoomOccupancy(roomType)) + 1

        return `${roomType} ${roomNumber}`
    }

    const formatTravelDate = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        const start = value.startDate ? dayjs(value.startDate) : null;
        const end = value.endDate ? dayjs(value.endDate) : null;
        if (start?.isValid() && end?.isValid()) {
            return `${start.format('MMMM DD, YYYY')} - ${end.format('MMMM DD, YYYY')}`;
        }
        if (start?.isValid()) {
            return start.format('MMMM DD, YYYY');
        }
        return '';
    };

    const bookingType = summaryInvoice.bookingType || 'No Booking';

    useEffect(() => {
        if (!summaryInvoice) return;

        const isSolo = bookingType === 'Solo Booking';
        const isGroup = bookingType === 'Group Booking';

        let travelersData = (summaryInvoice.travelers || []).map((t) => ({
            ...t,
            birthday: t.birthday || '',
            passportExpiry: t.passportExpiry || '',
            passportNo: t.passportNumber || 'N/A',
            roomType: isSolo
                ? 'SINGLE'
                : (isGroup && t?.roomType === 'SINGLE' ? undefined : t?.roomType)
        }));

        const desiredCount = travelersData.length;
        const countDiff = desiredCount - travelersData.length;

        if (countDiff > 0) {
            const extraFields = Array.from({ length: countDiff }, () => ({
                title: '',
                firstName: '',
                lastName: '',
                roomType: '',
                birthday: '',
                age: '',
                passportNo: '',
                passportExpiry: ''
            }));
            travelersData = [...travelersData, ...extraFields];
        } else if (countDiff < 0) {
            travelersData = travelersData.slice(0, desiredCount);
        }

        form.setFieldsValue({
            leadFullName: summaryInvoice.leadFullName,
            leadEmail: summaryInvoice.leadEmail,
            leadContact: summaryInvoice.leadContact,
            leadAddress: summaryInvoice.leadAddress,
            leadTitle: summaryInvoice.leadTitle,
            travelersSignature: summaryInvoice.leadFullName,
            dateOfRegistration: dayjs().format('MMMM DD, YYYY'),
            tourPackageTitle: summaryInvoice.tourPackageTitle || 'N/A',
            tourPackageVia: summaryInvoice.tourPackageVia || 'N/A',
            packageTravelDate: formatTravelDate(summaryInvoice.travelDate),
            travelersDate: dayjs().format('MMMM DD, YYYY'),
            travelers: travelersData, // Set the array here
        });

    }, [summaryInvoice, totalCount, form]); // Added form to deps

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
                        key={totalCount}
                        form={form}
                        layout="vertical"
                        onValuesChange={onValuesChange}
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
                                        <Input
                                            size="small"
                                            className="mrc-lead-guest-section-input"
                                            readOnly
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
                                const travelers = form.getFieldValue('travelers') || [];
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
                        <div style={{ marginTop: '15px' }}>
                            <div style={{
                                background: '#ADD8E6',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                border: '1px solid #000',
                                textAlign: 'center',
                                textTransform: 'uppercase'
                            }}>
                                PASSENGER LIST (Including Lead Guest)
                            </div>

                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '9px', // Increased from 8px
                                tableLayout: 'fixed',
                                textAlign: 'center'
                            }}>
                                <colgroup>
                                    <col style={{ width: '4%' }} />
                                    <col style={{ width: '8%' }} />
                                    <col style={{ width: '18%' }} />
                                    <col style={{ width: '18%' }} />
                                    <col style={{ width: '12%' }} />
                                    <col style={{ width: '12%' }} />
                                    <col style={{ width: '5%' }} />
                                    <col style={{ width: '12%' }} />
                                    <col style={{ width: '11%' }} />
                                </colgroup>
                                <thead>
                                    <tr style={{ background: '#e6f7ff', height: '26px' }}>
                                        <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '10px' }}>NO</th>
                                        <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '10px' }}>TITLE</th>
                                        <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '10px' }}>FIRST NAME</th>
                                        <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '10px' }}>LAST NAME</th>
                                        <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '10px' }}>ROOM</th>
                                        <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '10px' }}>BIRTHDAY</th>
                                        <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '10px' }}>AGE</th>
                                        <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '10px' }}>PASSPORT #</th>
                                        <th style={{ border: '1px solid #000', borderTop: 'none', padding: '2px', fontSize: '10px' }}>EXPIRY</th>
                                    </tr>
                                </thead>

                                <Form.List name="travelers">
                                    {(fields) => (
                                        <tbody>
                                            {fields.map(({ key, name, ...restField }, index) => (
                                                <tr key={key} style={{ height: '26px' }}>
                                                    {/* Row Number */}
                                                    <td style={{ border: '1px solid #000', background: '#fafafa', fontSize: '9px' }}>
                                                        {index + 1}
                                                    </td>

                                                    {/* Title */}
                                                    <td style={{ border: '1px solid #000' }}>
                                                        <Form.Item {...restField} name={[name, 'title']} noStyle>
                                                            <Input variant="borderless" style={{ padding: '0 2px', textAlign: 'center' }} readOnly />
                                                        </Form.Item>
                                                    </td>

                                                    {/* First Name */}
                                                    <td style={{ border: '1px solid #000' }}>
                                                        <Form.Item {...restField} name={[name, 'firstName']} noStyle>
                                                            <Input variant="borderless" style={{ padding: '0 6px' }} readOnly />
                                                        </Form.Item>
                                                    </td>

                                                    {/* Last Name */}
                                                    <td style={{ border: '1px solid #000' }}>
                                                        <Form.Item {...restField} name={[name, 'lastName']} noStyle>
                                                            <Input variant="borderless" style={{ padding: '0 6px' }} readOnly />
                                                        </Form.Item>
                                                    </td>

                                                    {/* Room Type */}
                                                    <td style={{ border: '1px solid #000' }}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'roomType']}
                                                            noStyle
                                                            getValueProps={() => ({
                                                                value: getDisplayRoomType(form.getFieldValue('travelers') || [], index)
                                                            })}
                                                        >
                                                            <Input variant="borderless" style={{ padding: '0 2px', textAlign: 'center' }} readOnly />
                                                        </Form.Item>
                                                    </td>

                                                    {/* Birthday */}
                                                    <td style={{ border: '1px solid #000' }}>
                                                        <Form.Item {...restField} name={[name, 'birthday']} noStyle>
                                                            <Input variant="borderless" style={{ padding: '0 2px', textAlign: 'center' }} readOnly />
                                                        </Form.Item>
                                                    </td>

                                                    {/* Age */}
                                                    <td style={{ border: '1px solid #000' }}>
                                                        <Form.Item {...restField} name={[name, 'age']} noStyle>
                                                            <Input variant="borderless" style={{ padding: 0, textAlign: 'center' }} readOnly />
                                                        </Form.Item>
                                                    </td>

                                                    {/* Passport No */}
                                                    <td style={{ border: '1px solid #000' }}>
                                                        <Form.Item {...restField} name={[name, 'passportNo']} noStyle>
                                                            <Input variant="borderless" style={{ padding: '0 2px', textAlign: 'center' }} readOnly />
                                                        </Form.Item>
                                                    </td>

                                                    {/* Passport Expiry */}
                                                    <td style={{ border: '1px solid #000' }}>
                                                        <Form.Item {...restField} name={[name, 'passportExpiry']} noStyle>
                                                            <Input variant="borderless" style={{ padding: '0 2px', textAlign: 'center' }} readOnly />
                                                        </Form.Item>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    )}
                                </Form.List>

                            </table>
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