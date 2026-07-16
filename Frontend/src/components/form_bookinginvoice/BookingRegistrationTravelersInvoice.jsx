import React, { useEffect } from 'react';
import { ConfigProvider, Form, Input } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';

export default function BookingRegistrationTravelersInvoice({
    form,
    onValuesChange,
    summaryInvoice,
    totalCount,
}) {
    const hasLeadAddress = Boolean(String(summaryInvoice?.leadAddress || '').trim());

    const normalizeRoomType = (value) => String(value || '').trim().replace(/\s+\d+$/, '');

    const getRoomOccupancy = (roomType) => {
        const normalized = normalizeRoomType(roomType);
        if (normalized === 'TRIPLE') return 3;
        if (normalized === 'TWIN' || normalized === 'DOUBLE') return 2;
        return 1;
    };

    const isChildOrInfantTraveler = (traveler) => {
        const category = String(traveler?.ageCategory || '').toUpperCase();
        if (category === 'CHILD' || category === 'INFANT') return true;

        const numericAge = Number(traveler?.age);
        return Number.isFinite(numericAge) && numericAge >= 0 && numericAge < 12;
    };

    const getDisplayRoomType = (travelers, index) => {
        const traveler = travelers[index] || {};
        if (isChildOrInfantTraveler(traveler)) return 'N/A';

        const roomType = normalizeRoomType(traveler.roomType);
        if (!roomType) return '';
        if (roomType === 'N/A') return 'N/A';
        if (roomType === 'SINGLE') return 'SINGLE';

        const sameRoomTypeIndex = travelers
            .slice(0, index)
            .filter((item) => normalizeRoomType(item?.roomType) === roomType)
            .length;

        const roomNumber = Math.floor(sameRoomTypeIndex / getRoomOccupancy(roomType)) + 1;
        return `${roomType} ${roomNumber}`;
    };

    const formatTravelDate = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value;

        const start = value.startDate ? dayjs(value.startDate) : null;
        const end = value.endDate ? dayjs(value.endDate) : null;

        if (start?.isValid() && end?.isValid()) {
            return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
        }
        if (start?.isValid()) return start.format('MMM D, YYYY');
        return '';
    };

    useEffect(() => {
        if (!summaryInvoice) return;

        const bookingType = summaryInvoice?.bookingType || 'No Booking';
        const isSolo = bookingType === 'Solo Booking';
        const isGroup = bookingType === 'Group Booking';

        const travelersData = (summaryInvoice.travelers || []).map((traveler) => {
            const birthday = traveler?.birthday ? dayjs(traveler.birthday) : null;
            const passportExpiry = traveler?.passportExpiry ? dayjs(traveler.passportExpiry) : null;

            return {
                ...traveler,
                birthday: birthday?.isValid() ? birthday.format('MMM D, YYYY') : '',
                passportExpiry:
                    traveler?.passportExpiry === 'N/A'
                        ? 'N/A'
                        : passportExpiry?.isValid()
                            ? passportExpiry.format('MMM D, YYYY')
                            : 'N/A',
                passportNo: traveler?.passportNo || 'N/A',
                roomType: isSolo
                    ? 'SINGLE'
                    : isGroup && traveler?.roomType === 'SINGLE'
                        ? undefined
                        : traveler?.roomType,
            };
        });

        form.setFieldsValue({
            leadFullName: summaryInvoice.leadFullName,
            leadEmail: summaryInvoice.leadEmail,
            leadContact: summaryInvoice.leadContact,
            leadAddress: summaryInvoice.leadAddress,
            leadTitle: summaryInvoice.leadTitle,
            travelersSignature: summaryInvoice.leadFullName,
            dateOfRegistration: dayjs().format('MMMM D, YYYY'),
            tourPackageTitle: summaryInvoice.tourPackageTitle || 'N/A',
            tourPackageVia: summaryInvoice.tourPackageVia || 'N/A',
            packageTravelDate: formatTravelDate(summaryInvoice.travelDate),
            travelersDate: dayjs().format('MMMM D, YYYY'),
            travelers: travelersData,
        });
    }, [summaryInvoice, totalCount, form]);

    const passengerCellClass = 'mrc-registration-passenger-cell';
    const passengerInputClass = 'mrc-registration-passenger-input';

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            <div className="mrc-overlay-wrapper">
                <div className="mrc-form-page mrc-booking-invoice-page mrc-registration-page">
                    <div className="mrc-registration-logo-container">
                        <img
                            src="/images/Logo.png"
                            alt="MRC Travel Logo"
                            className="mrc-registration-logo"
                        />
                    </div>

                    <div className="mrc-registration-header mrc-registration-header--gold">
                        BOOKING REGISTRATION FORM
                    </div>

                    <Form
                        key={totalCount}
                        form={form}
                        className="mrc-registration-form"
                        layout="vertical"
                        onValuesChange={onValuesChange}
                        validateMessages={{ required: '' }}
                    >
                        <div className="mrc-registration-info-grid mrc-registration-package-grid">
                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">DATE OF REGISTRATION</span>
                                <Form.Item name="dateOfRegistration" noStyle>
                                    <Input className="mrc-registration-value-input" readOnly />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">PACKAGE TRAVEL DATE</span>
                                <Form.Item name="packageTravelDate" noStyle>
                                    <Input className="mrc-registration-value-input" readOnly />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">TOUR PACKAGE TITLE</span>
                                <Form.Item name="tourPackageTitle" noStyle>
                                    <Input className="mrc-registration-value-input" readOnly />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">TOUR PACKAGE VIA</span>
                                <Form.Item name="tourPackageVia" noStyle>
                                    <Input className="mrc-registration-value-input" readOnly />
                                </Form.Item>
                            </div>
                        </div>

                        <div className="mrc-registration-header mrc-registration-header--blue">
                            LEAD GUEST INFORMATION
                        </div>

                        <div className="mrc-registration-info-grid mrc-registration-lead-grid">
                            <div className="mrc-registration-info-field mrc-registration-title-field">
                                <span className="mrc-registration-label">TITLE:</span>
                                <Form.Item
                                    name="leadTitle"
                                    noStyle
                                    rules={[{ required: true }]}
                                >
                                    <Input className="mrc-registration-value-input" readOnly />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field mrc-registration-name-field">
                                <span className="mrc-registration-label">FULL NAME:</span>
                                <Form.Item name="leadFullName" noStyle>
                                    <Input className="mrc-registration-value-input" readOnly />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">EMAIL ADD:</span>
                                <Form.Item name="leadEmail" noStyle>
                                    <Input className="mrc-registration-value-input" readOnly />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">CONTACT DETAILS:</span>
                                <Form.Item name="leadContact" noStyle>
                                    <Input className="mrc-registration-value-input" readOnly />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field mrc-registration-full-row">
                                <span className="mrc-registration-label">ADDRESS:</span>
                                <Form.Item name="leadAddress" noStyle>
                                    <Input
                                        className="mrc-registration-value-input"
                                        readOnly={hasLeadAddress}
                                        placeholder={hasLeadAddress ? '' : 'Enter address'}
                                    />
                                </Form.Item>
                            </div>
                        </div>

                        <Form.Item
                            noStyle
                            shouldUpdate={(previous, current) => previous.leadTitle !== current.leadTitle}
                        >
                            {() => {
                                const value = form.getFieldValue('leadTitle');
                                const isInvalid = value && value !== 'MR' && value !== 'MS';
                                const isEmpty = !value;

                                return isEmpty || isInvalid ? (
                                    <div className="mrc-registration-inline-error">
                                        {isEmpty ? 'Please select a title' : 'Title must be MR or MS'}
                                    </div>
                                ) : null;
                            }}
                        </Form.Item>

                        <div className="mrc-registration-header mrc-registration-header--blue mrc-registration-passenger-title">
                            PASSENGER LIST (INCLUDING LEAD GUEST)
                        </div>

                        <div className="mrc-registration-table-wrap">
                            <table className="mrc-registration-passenger-table">
                                <colgroup>
                                    <col className="mrc-col-no" />
                                    <col className="mrc-col-title" />
                                    <col className="mrc-col-first-name" />
                                    <col className="mrc-col-last-name" />
                                    <col className="mrc-col-room" />
                                    <col className="mrc-col-birthday" />
                                    <col className="mrc-col-age" />
                                    <col className="mrc-col-passport" />
                                    <col className="mrc-col-expiry" />
                                </colgroup>
                                <thead>
                                    <tr>
                                        {[
                                            'NO',
                                            'TITLE',
                                            'FIRST NAME',
                                            'LAST NAME',
                                            'ROOM',
                                            'BIRTHDAY',
                                            'AGE',
                                            'PASSPORT #',
                                            'EXPIRY',
                                        ].map((heading) => (
                                            <th key={heading}>{heading}</th>
                                        ))}
                                    </tr>
                                </thead>

                                <Form.List name="travelers">
                                    {(fields) => (
                                        <tbody>
                                            {fields.map(({ key, name, ...restField }, index) => (
                                                <tr key={key}>
                                                    <td className={`${passengerCellClass} mrc-registration-row-number`}>
                                                        {index + 1}
                                                    </td>
                                                    <td className={passengerCellClass}>
                                                        <Form.Item {...restField} name={[name, 'title']} noStyle>
                                                            <Input
                                                                variant="borderless"
                                                                className={passengerInputClass}
                                                                readOnly
                                                            />
                                                        </Form.Item>
                                                    </td>
                                                    <td className={passengerCellClass}>
                                                        <Form.Item {...restField} name={[name, 'firstName']} noStyle>
                                                            <Input
                                                                variant="borderless"
                                                                className={`${passengerInputClass} mrc-registration-passenger-input--left`}
                                                                readOnly
                                                            />
                                                        </Form.Item>
                                                    </td>
                                                    <td className={passengerCellClass}>
                                                        <Form.Item {...restField} name={[name, 'lastName']} noStyle>
                                                            <Input
                                                                variant="borderless"
                                                                className={`${passengerInputClass} mrc-registration-passenger-input--left`}
                                                                readOnly
                                                            />
                                                        </Form.Item>
                                                    </td>
                                                    <td className={passengerCellClass}>
                                                        <Form.Item
                                                            {...restField}
                                                            name={[name, 'roomType']}
                                                            noStyle
                                                            getValueProps={() => ({
                                                                value: getDisplayRoomType(
                                                                    form.getFieldValue('travelers') || [],
                                                                    index
                                                                ),
                                                            })}
                                                        >
                                                            <Input
                                                                variant="borderless"
                                                                className={passengerInputClass}
                                                                readOnly
                                                            />
                                                        </Form.Item>
                                                    </td>
                                                    <td className={passengerCellClass}>
                                                        <Form.Item {...restField} name={[name, 'birthday']} noStyle>
                                                            <Input
                                                                variant="borderless"
                                                                className={passengerInputClass}
                                                                readOnly
                                                            />
                                                        </Form.Item>
                                                    </td>
                                                    <td className={passengerCellClass}>
                                                        <Form.Item {...restField} name={[name, 'age']} noStyle>
                                                            <Input
                                                                variant="borderless"
                                                                className={passengerInputClass}
                                                                readOnly
                                                            />
                                                        </Form.Item>
                                                    </td>
                                                    <td className={passengerCellClass}>
                                                        <Form.Item {...restField} name={[name, 'passportNo']} noStyle>
                                                            <Input
                                                                variant="borderless"
                                                                className={passengerInputClass}
                                                                readOnly
                                                            />
                                                        </Form.Item>
                                                    </td>
                                                    <td className={passengerCellClass}>
                                                        <Form.Item {...restField} name={[name, 'passportExpiry']} noStyle>
                                                            <Input
                                                                variant="borderless"
                                                                className={passengerInputClass}
                                                                readOnly
                                                            />
                                                        </Form.Item>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    )}
                                </Form.List>
                            </table>
                        </div>

                        <div className="mrc-registration-two-column mrc-registration-room-guide-section">
                            <div className="mrc-registration-room-guide">
                                <strong className="mrc-registration-room-guide-title">
                                    GUIDE IN ROOM ASSIGNMENTS:
                                </strong>
                                <p className="mrc-registration-room-note">
                                    *Important note: All room type requests are subject for availability.
                                    Use of SINGLE ROOM has a single supplement charge.
                                </p>
                                <p><strong>TWIN BED ROOM</strong> - 1 Room with 2 single beds; 2 pax occupancy</p>
                                <p><strong>DOUBLE ROOM</strong> - 1 room with 1 double bed; 2 pax occupancy</p>
                                <p><strong>SINGLE ROOM</strong> - 1 room with 1 bed; 1 pax occupancy</p>
                                <p><strong>TRIPLE ROOM</strong> - 1 room with 3 single beds OR 1 double + 1 single</p>
                            </div>

                            <div className="mrc-registration-declaration">
                                <p>
                                    As the lead guest and the sole mediator between the Travel Agency and
                                    the guests enlisted of this group, I hereby confirm that all the above
                                    information is correct and true and I am happy for M&amp;RC Travel and
                                    Tours to access this information when organizing this trip/travel for me.
                                </p>
                                <p>
                                    By signing this form, I allow M&amp;RC Travel and Tours to keep all my
                                    and our group's data on file and access details which are necessary for
                                    this trip/travel and authorized by me.
                                </p>
                            </div>
                        </div>

                        <div className="mrc-registration-signature-row">
                            <div className="mrc-registration-signature-box">
                                <Input
                                    className="mrc-registration-signature-input"
                                    value={
                                        summaryInvoice?.leadFullName ||
                                        form.getFieldValue("leadFullName") ||
                                        ""
                                    }
                                    readOnly
                                />
                                <div className="mrc-registration-signature-label">
                                    Signature over printed name
                                </div>
                            </div>

                            <div className="mrc-registration-signature-box">
                                <Form.Item name="travelersDate" noStyle>
                                    <Input className="mrc-registration-signature-input" readOnly />
                                </Form.Item>
                                <div className="mrc-registration-signature-label">Date</div>
                            </div>
                        </div>
                    </Form>

                    <div className="mrc-booking-invoice-footer">
                        <span>M&amp;RC Travel and Tours</span>
                        <span>Page 1 of 4</span>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}