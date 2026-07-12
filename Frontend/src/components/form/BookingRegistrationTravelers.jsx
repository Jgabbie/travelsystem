import React, { useEffect, useState } from 'react';
import { ConfigProvider, Form, Input } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';
import apiFetch from '../../config/fetchConfig';
import { useNavigate } from 'react-router-dom';

export default function BookingRegistrationTravelers({
    form,
    onValuesChange,
    summary,
    totalCount,
}) {
    const navigate = useNavigate();
    const [userProfile, setUserProfile] = useState({});

    const hasLeadAddress = Boolean(String(userProfile.homeAddress || '').trim());
    const bookingType = summary?.bookingType || 'No Booking';
    const packageType = summary?.packageType || 'fixed';
    const isDomesticPackage = String(packageType).toLowerCase().includes('domestic');

    const normalizeRoomType = (value) =>
        String(value || '').trim().replace(/\s+\d+$/, '');

    useEffect(() => {
        if (!summary?.packageName) {
            navigate('/home');
        }
    }, [summary, navigate]);

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

        const roomNumber =
            Math.floor(sameRoomTypeIndex / getRoomOccupancy(roomType)) + 1;

        return `${roomType} ${roomNumber}`;
    };

    const getDisplayAge = (traveler) => {
        if (
            traveler?.age !== undefined &&
            traveler?.age !== null &&
            traveler?.age !== ''
        ) {
            return traveler.age;
        }

        if (!traveler?.birthday || !dayjs(traveler.birthday).isValid()) {
            return '';
        }

        const today = dayjs();
        const birthDate = dayjs(traveler.birthday);
        let age = today.diff(birthDate, 'year');

        if (birthDate.add(age, 'year').isAfter(today)) {
            age -= 1;
        }

        if (age >= 0 && age < 2) {
            return traveler.ageCategory === 'INFANT' ? 'INFANT' : '0';
        }

        if (age >= 2 && age < 12) {
            return traveler.ageCategory === 'CHILD' ? 'CHILD' : age;
        }

        if (age >= 12) {
            return traveler.ageCategory === 'ADULT' ? 'ADULT' : age;
        }

        return age < 0 ? '' : age;
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await apiFetch.get('/user/data', {
                    withCredentials: true,
                });

                const userData = response?.userData;
                const user = {
                    firstName: userData.firstname,
                    lastName: userData.lastname,
                    fullName: `${userData.firstname} ${userData.lastname}`,
                    email: userData.email,
                    phone: userData.phone,
                    homeAddress: userData.homeAddress,
                };

                form.setFieldsValue({
                    leadTitle: form.getFieldValue('leadTitle') || 'MR',
                    leadFullName: user.fullName,
                    leadEmail: user.email,
                    leadContact: user.phone,
                    leadAddress: user.homeAddress,
                    travelersSignature: user.fullName,
                });

                setUserProfile(user);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchUserData();
    }, [form]);

    useEffect(() => {
        const currentTravelers = form.getFieldValue('travelers') || [];

        if (currentTravelers.length < totalCount) {
            const extraRows = Array.from(
                { length: totalCount - currentTravelers.length },
                () => ({})
            );
            form.setFieldsValue({
                travelers: [...currentTravelers, ...extraRows],
            });
        } else if (currentTravelers.length > totalCount) {
            form.setFieldsValue({
                travelers: currentTravelers.slice(0, totalCount),
            });
        }
    }, [totalCount, form]);

    useEffect(() => {
        if (!userProfile.firstName) return;

        const currentTravelers = form.getFieldValue('travelers') || [];
        const travelers = [...currentTravelers];
        const isSolo = bookingType === 'Solo Booking';
        const isGroup = bookingType === 'Group Booking';

        travelers[0] = {
            ...travelers[0],
            title: 'MR',
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            roomType: isSolo ? 'SINGLE' : travelers[0]?.roomType,
        };

        let updatedTravelers = travelers.map((traveler) => ({
            ...traveler,
            roomType: isSolo
                ? 'SINGLE'
                : isGroup && traveler?.roomType === 'SINGLE'
                    ? undefined
                    : traveler?.roomType,
            passportNo: isDomesticPackage ? 'N/A' : traveler?.passportNo,
            passportExpiry: isDomesticPackage ? 'N/A' : traveler?.passportExpiry,
        }));

        if (updatedTravelers.length < totalCount) {
            updatedTravelers = [
                ...updatedTravelers,
                ...Array.from(
                    { length: totalCount - updatedTravelers.length },
                    () => ({})
                ),
            ];
        } else if (updatedTravelers.length > totalCount) {
            updatedTravelers = updatedTravelers.slice(0, totalCount);
        }

        form.setFieldsValue({
            travelers: updatedTravelers,
            dateOfRegistration: dayjs().format('MMMM D, YYYY'),
            tourPackageTitle: summary?.packageName || 'N/A',
            tourPackageVia: summary?.airlineOptions?.[0]?.name
                ? summary.airlineOptions[0].type === 'fixed'
                    ? summary.airlineOptions[0].name
                    : 'N/A'
                : 'N/A',
            packageTravelDate:
                summary?.travelDate?.startDate && summary?.travelDate?.endDate
                    ? `${dayjs(summary.travelDate.startDate).format('MMM D, YYYY')} - ${dayjs(
                        summary.travelDate.endDate
                    ).format('MMM D, YYYY')}`
                    : 'N/A',
            travelersDate: dayjs().format('MMMM D, YYYY'),
        });
    }, [
        totalCount,
        userProfile,
        form,
        bookingType,
        isDomesticPackage,
        summary,
    ]);

    const passengerInputClass = 'mrc-registration-passenger-input';
    const passengerCellClass = 'mrc-registration-passenger-cell';

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
                        form={form}
                        className="mrc-registration-form"
                        layout="vertical"
                        onValuesChange={onValuesChange}
                        initialValues={{
                            travelers: Array.from({ length: totalCount }, () => ({})),
                        }}
                        validateMessages={{ required: '' }}
                    >
                        <div className="mrc-registration-info-grid mrc-registration-package-grid">
                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">
                                    DATE OF REGISTRATION
                                </span>
                                <Form.Item name="dateOfRegistration" noStyle>
                                    <Input
                                        className="mrc-registration-value-input"
                                        readOnly
                                    />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">
                                    PACKAGE TRAVEL DATE
                                </span>
                                <Form.Item name="packageTravelDate" noStyle>
                                    <Input
                                        className="mrc-registration-value-input"
                                        readOnly
                                    />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">
                                    TOUR PACKAGE TITLE
                                </span>
                                <Form.Item name="tourPackageTitle" noStyle>
                                    <Input
                                        className="mrc-registration-value-input"
                                        readOnly
                                    />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">
                                    TOUR PACKAGE VIA
                                </span>
                                <Form.Item name="tourPackageVia" noStyle>
                                    <Input
                                        className="mrc-registration-value-input"
                                        readOnly
                                    />
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
                                    <Input
                                        className="mrc-registration-value-input"
                                        readOnly
                                    />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field mrc-registration-name-field">
                                <span className="mrc-registration-label">FULL NAME:</span>
                                <Form.Item
                                    name="leadFullName"
                                    noStyle
                                    rules={[{ required: true }]}
                                >
                                    <Input
                                        className="mrc-registration-value-input"
                                        readOnly
                                    />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">EMAIL ADD:</span>
                                <Form.Item
                                    name="leadEmail"
                                    noStyle
                                    rules={[{ required: true }]}
                                >
                                    <Input
                                        className="mrc-registration-value-input"
                                        readOnly
                                    />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field">
                                <span className="mrc-registration-label">
                                    CONTACT DETAILS:
                                </span>
                                <Form.Item
                                    name="leadContact"
                                    noStyle
                                    rules={[{ required: true }]}
                                >
                                    <Input
                                        className="mrc-registration-value-input"
                                        readOnly
                                    />
                                </Form.Item>
                            </div>

                            <div className="mrc-registration-info-field mrc-registration-full-row">
                                <span className="mrc-registration-label">ADDRESS:</span>
                                <Form.Item
                                    name="leadAddress"
                                    className="mrc-home-address-field"
                                    style={{ margin: 0 }}
                                    rules={[
                                        {
                                            required: true,
                                            whitespace: true,
                                            message: 'Home address is required to continue',
                                        },
                                    ]}
                                >
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
                            shouldUpdate={(previousValues, currentValues) =>
                                previousValues.leadTitle !== currentValues.leadTitle
                            }
                        >
                            {() => {
                                const value = form.getFieldValue('leadTitle');
                                const isInvalid = value && value !== 'MR' && value !== 'MS';
                                const isEmpty = !value;

                                return isEmpty || isInvalid ? (
                                    <div className="mrc-registration-inline-error">
                                        {isEmpty
                                            ? 'Please select a title'
                                            : 'Title must be MR or MS'}
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
                                            {fields.map(
                                                ({ key, name, ...restField }, index) => (
                                                    <tr key={key}>
                                                        <td
                                                            className={`${passengerCellClass} mrc-registration-row-number`}
                                                        >
                                                            {index + 1}
                                                        </td>

                                                        <td className={passengerCellClass}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'title']}
                                                                noStyle
                                                                rules={[
                                                                    {
                                                                        required: true,
                                                                        message: 'Please select a title',
                                                                    },
                                                                    {
                                                                        validator: (_, value) =>
                                                                            value === 'MR' || value === 'MS'
                                                                                ? Promise.resolve()
                                                                                : Promise.reject(
                                                                                    new Error(
                                                                                        'Title must be MR or MS'
                                                                                    )
                                                                                ),
                                                                    },
                                                                ]}
                                                            >
                                                                <Input
                                                                    variant="borderless"
                                                                    className={passengerInputClass}
                                                                    readOnly
                                                                />
                                                            </Form.Item>
                                                        </td>

                                                        <td className={passengerCellClass}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'firstName']}
                                                                noStyle
                                                                rules={[
                                                                    {
                                                                        required: true,
                                                                        message: 'Please enter first name',
                                                                    },
                                                                    {
                                                                        pattern: /^[A-Za-z\s-]{2,}$/,
                                                                        message:
                                                                            'First name must be at least 2 characters and contain letters only',
                                                                    },
                                                                ]}
                                                            >
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
                                                                name={[name, 'lastName']}
                                                                noStyle
                                                                rules={[
                                                                    {
                                                                        required: true,
                                                                        message: 'Please enter last name',
                                                                    },
                                                                    {
                                                                        pattern: /^[A-Za-z\s-]{2,}$/,
                                                                        message:
                                                                            'Last name must be at least 2 characters and contain letters only',
                                                                    },
                                                                ]}
                                                            >
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
                                                                rules={[
                                                                    {
                                                                        required: true,
                                                                        message: 'Please select a room type',
                                                                    },
                                                                ]}
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
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'birthday']}
                                                                noStyle
                                                                rules={[
                                                                    {
                                                                        required: true,
                                                                        message: 'Please enter birthday',
                                                                    },
                                                                    {
                                                                        validator: (_, value) =>
                                                                            value && dayjs(value).isValid()
                                                                                ? Promise.resolve()
                                                                                : Promise.reject(
                                                                                    new Error(
                                                                                        'Please enter birthday'
                                                                                    )
                                                                                ),
                                                                    },
                                                                ]}
                                                                getValueProps={(value) => ({
                                                                    value:
                                                                        value && dayjs(value).isValid()
                                                                            ? dayjs(value).format(
                                                                                'MMM D, YYYY'
                                                                            )
                                                                            : '',
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
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'age']}
                                                                noStyle
                                                                rules={[
                                                                    {
                                                                        required: true,
                                                                        message: 'Please enter age',
                                                                    },
                                                                    {
                                                                        type: 'number',
                                                                        min: 0,
                                                                        max: 120,
                                                                        transform: (value) => Number(value),
                                                                        message:
                                                                            'Age must be a valid number between 0 and 120',
                                                                    },
                                                                ]}
                                                                dependencies={[
                                                                    ['travelers', index, 'birthday'],
                                                                    ['travelers', index, 'age'],
                                                                ]}
                                                                getValueProps={() => {
                                                                    const traveler =
                                                                        form.getFieldValue([
                                                                            'travelers',
                                                                            index,
                                                                        ]) || {};
                                                                    return {
                                                                        value: getDisplayAge(traveler),
                                                                    };
                                                                }}
                                                            >
                                                                <Input
                                                                    variant="borderless"
                                                                    className={passengerInputClass}
                                                                    readOnly
                                                                />
                                                            </Form.Item>
                                                        </td>

                                                        <td className={passengerCellClass}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'passportNo']}
                                                                noStyle
                                                                rules={
                                                                    isDomesticPackage
                                                                        ? []
                                                                        : [
                                                                            {
                                                                                required: true,
                                                                                message:
                                                                                    'Please enter passport number',
                                                                            },
                                                                            {
                                                                                pattern: /^P\d{7}[A-Za-z]$/,
                                                                                message:
                                                                                    'Passport number must start with P, followed by 7 digits and end with a letter (e.g. P8263213C)',
                                                                            },
                                                                        ]
                                                                }
                                                            >
                                                                <Input
                                                                    variant="borderless"
                                                                    className={passengerInputClass}
                                                                    maxLength={9}
                                                                    readOnly
                                                                />
                                                            </Form.Item>
                                                        </td>

                                                        <td className={passengerCellClass}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'passportExpiry']}
                                                                noStyle
                                                                rules={
                                                                    isDomesticPackage
                                                                        ? []
                                                                        : [
                                                                            {
                                                                                required: true,
                                                                                message:
                                                                                    'Please enter passport expiry date',
                                                                            },
                                                                            {
                                                                                validator: (_, value) => {
                                                                                    if (
                                                                                        !value ||
                                                                                        !dayjs(value).isValid()
                                                                                    ) {
                                                                                        return Promise.reject(
                                                                                            new Error(
                                                                                                'Please enter passport expiry date'
                                                                                            )
                                                                                        );
                                                                                    }

                                                                                    if (
                                                                                        dayjs(value).year() <=
                                                                                        dayjs().year()
                                                                                    ) {
                                                                                        return Promise.reject(
                                                                                            new Error(
                                                                                                'Expiry must be after the current year'
                                                                                            )
                                                                                        );
                                                                                    }

                                                                                    return Promise.resolve();
                                                                                },
                                                                            },
                                                                        ]
                                                                }
                                                                getValueProps={(value) => ({
                                                                    value: isDomesticPackage
                                                                        ? 'N/A'
                                                                        : value && dayjs(value).isValid()
                                                                            ? dayjs(value).format(
                                                                                'MMM D, YYYY'
                                                                            )
                                                                            : '',
                                                                })}
                                                            >
                                                                <Input
                                                                    variant="borderless"
                                                                    className={passengerInputClass}
                                                                    readOnly
                                                                />
                                                            </Form.Item>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    )}
                                </Form.List>
                            </table>
                        </div>

                        <Form.Item
                            name="adultValidation"
                            hidden
                            dependencies={['travelers']}
                            rules={[
                                {
                                    validator: () => {
                                        const travelers =
                                            form.getFieldValue('travelers') || [];
                                        const hasAdult = travelers.some((traveler) => {
                                            const age = traveler?.age;
                                            return typeof age === 'number'
                                                ? age >= 18
                                                : Number(age) >= 18;
                                        });

                                        return hasAdult
                                            ? Promise.resolve()
                                            : Promise.reject(
                                                new Error(
                                                    'At least one passenger must be an adult.'
                                                )
                                            );
                                    },
                                },
                            ]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item noStyle shouldUpdate>
                            {() => {
                                const travelers = form.getFieldValue('travelers') || [];
                                const hasIncomplete = travelers.some((traveler) =>
                                    !traveler ||
                                    !traveler.title ||
                                    !traveler.firstName ||
                                    !traveler.lastName ||
                                    !traveler.roomType ||
                                    !traveler.birthday ||
                                    traveler.age === undefined ||
                                    traveler.age === null ||
                                    traveler.age === '' ||
                                    (!isDomesticPackage &&
                                        (!traveler.passportNo ||
                                            !traveler.passportExpiry))
                                );

                                const hasAdult = travelers.some((traveler) => {
                                    const age = traveler?.age;
                                    return typeof age === 'number'
                                        ? age >= 18
                                        : Number(age) >= 18;
                                });

                                if (hasIncomplete) {
                                    return (
                                        <div className="mrc-passengerlist-field">
                                            Please complete all traveler details before proceeding.
                                        </div>
                                    );
                                }

                                return !hasAdult ? (
                                    <div className="mrc-registration-inline-error">
                                        At least one passenger must be an adult.
                                    </div>
                                ) : null;
                            }}
                        </Form.Item>

                        <div className="mrc-registration-two-column mrc-registration-room-guide-section">
                            <div className="mrc-registration-room-guide">
                                <strong className="mrc-registration-room-guide-title">
                                    GUIDE IN ROOM ASSIGNMENTS:
                                </strong>
                                <p className="mrc-registration-room-note">
                                    *Important note: All room type requests are subject for
                                    availability. Use of SINGLE ROOM has a single supplement
                                    charge.
                                </p>
                                <p>
                                    <strong>TWIN BED ROOM</strong> - 1 Room with 2 single
                                    beds; 2 pax occupancy
                                </p>
                                <p>
                                    <strong>DOUBLE ROOM</strong> - 1 room with 1 double bed;
                                    2 pax occupancy
                                </p>
                                <p>
                                    <strong>SINGLE ROOM</strong> - 1 room with 1 bed; 1 pax
                                    occupancy
                                </p>
                                <p>
                                    <strong>TRIPLE ROOM</strong> - 1 room with 3 single beds
                                    OR 1 double + 1 single
                                </p>
                            </div>

                            <div className="mrc-registration-declaration">
                                <p>
                                    As the lead guest and the sole mediator between the Travel
                                    Agency and the guests enlisted of this group, I hereby
                                    confirm that all the above information is correct and true
                                    and I am happy for M&amp;RC Travel and Tours to access this
                                    information when organizing this trip/travel for me.
                                </p>
                                <p>
                                    By signing this form, I allow M&amp;RC Travel and Tours to
                                    keep all my and our group&apos;s data on file and access
                                    details which are necessary for this trip/travel and
                                    authorized by me.
                                </p>
                            </div>
                        </div>

                        <div className="mrc-registration-signature-row">
                            <div className="mrc-registration-signature-box">
                                <Form.Item name="travelersSignature" noStyle>
                                    <Input
                                        className="mrc-registration-signature-input"
                                        readOnly
                                    />
                                </Form.Item>
                                <div className="mrc-registration-signature-label">
                                    Signature over printed name
                                </div>
                            </div>

                            <div className="mrc-registration-signature-box">
                                <Form.Item name="travelersDate" noStyle>
                                    <Input
                                        className="mrc-registration-signature-input"
                                        readOnly
                                    />
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