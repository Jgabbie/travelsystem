import React, { useEffect } from 'react';
import { Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import '../../style/components/mrcregistration.css';
import apiFetch from '../../config/fetchConfig';

const { TextArea } = Input;

export default function BookingRegistrationDiet({
    form,
    onValuesChange,
    summary,
}) {
    const dietaryRequest = Form.useWatch('dietaryRequest', form);
    const medicalRequest = Form.useWatch('medicalRequest', form);

    const formatTravelDate = () => {
        const start = summary?.travelDate?.startDate
            ? dayjs(summary.travelDate.startDate)
            : null;
        const end = summary?.travelDate?.endDate
            ? dayjs(summary.travelDate.endDate)
            : null;

        if (start?.isValid() && end?.isValid()) {
            return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
        }

        if (start?.isValid()) return start.format('MMM D, YYYY');
        return '____________________';
    };

    const handleRequestChange = (requestField, detailsField, value) => {
        form.setFieldsValue({
            [requestField]: value,
            [detailsField]: value === 'N' ? 'N/A' : '',
        });
    };

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await apiFetch.get('/user/data', {
                    withCredentials: true,
                });

                const userData = response?.userData;
                const fullName = `${userData.firstname} ${userData.lastname}`;

                form.setFieldsValue({
                    leadFullName: fullName,
                    leadEmail: userData.email,
                    leadContact: userData.phone,
                    leadAddress: userData.homeAddress,
                    travelersSignature: fullName,
                    signatureDate: dayjs().format('MMMM D, YYYY'),
                });
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchUserData();
    }, [form]);

    const yesNoOptions = [
        { value: 'Y', label: 'Y' },
        { value: 'N', label: 'N' },
    ];

    const compactSelectStyle = {
        width: 42,
        minWidth: 42,
        borderRadius: 0,
    };

    return (
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
                    TRAVEL REGISTRATION DETAILS
                </div>

                <p className="mrc-registration-instructions">
                    Instructions: Please fill-up and write your answers inside each box.
                </p>

                <Form
                    form={form}
                    className="mrc-registration-form"
                    layout="vertical"
                    onValuesChange={onValuesChange}
                    initialValues={{
                        tourPackageTitle: summary?.packageName,
                        packageTravelDate: formatTravelDate(),
                    }}
                >
                    <div className="mrc-registration-package-summary">
                        <div>
                            <strong>TOUR PACKAGE TITLE:</strong>{' '}
                            <span>{summary?.packageName || '____________________'}</span>
                        </div>
                        <div>
                            <strong>PACKAGE TRAVEL DATE:</strong>{' '}
                            <span>{formatTravelDate()}</span>
                        </div>
                    </div>

                    <section className="mrc-registration-question-block">
                        <div className="mrc-registration-question-row">
                            <div className="mrc-registration-question-copy">
                                <strong>
                                    Does anyone in your group have any dietary requests?
                                </strong>
                                <span className="mrc-registration-note-text">
                                    (Applicable for tour package with meal inclusions; if not
                                    included, please select N/A)
                                </span>
                            </div>

                            <Form.Item
                                name="dietaryRequest"
                                noStyle
                                rules={[
                                    {
                                        required: true,
                                        message: 'Required Dietary Request',
                                    },
                                ]}
                            >
                                <Select
                                    size="small"
                                    style={compactSelectStyle}
                                    placeholder="Y/N"
                                    onChange={(value) =>
                                        handleRequestChange(
                                            'dietaryRequest',
                                            'dietaryDetails',
                                            value
                                        )
                                    }
                                    options={yesNoOptions}
                                />
                            </Form.Item>
                        </div>

                        <div className="mrc-registration-detail-row">
                            <span>If yes, please indicate details:</span>

                            <Form.Item
                                name="dietaryDetails"
                                className="mrc-dietary-restrictions-field"
                                style={{ margin: 0 }}
                                rules={[
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (
                                                getFieldValue('dietaryRequest') === 'Y' &&
                                                (!value || value === 'N/A')
                                            ) {
                                                return Promise.reject(
                                                    new Error(
                                                        'Please provide dietary details'
                                                    )
                                                );
                                            }
                                            return Promise.resolve();
                                        },
                                    }),
                                ]}
                            >
                                <TextArea
                                    className="mrc-registration-detail-box"
                                    maxLength={200}
                                    rows={2}
                                    disabled={dietaryRequest !== 'Y'}
                                />
                            </Form.Item>
                        </div>
                    </section>

                    <section className="mrc-registration-question-block">
                        <div className="mrc-registration-question-row">
                            <div className="mrc-registration-question-copy">
                                <strong>
                                    Does anyone in your group have any Allergies/Medical
                                    conditions?
                                </strong>
                                <span className="mrc-registration-note-text">
                                    (Applicable for tour package with meal inclusions; if not
                                    included, please select N/A)
                                </span>
                            </div>

                            <Form.Item
                                name="medicalRequest"
                                noStyle
                                rules={[
                                    {
                                        required: true,
                                        message: 'Required Medical Request',
                                    },
                                ]}
                            >
                                <Select
                                    size="small"
                                    style={compactSelectStyle}
                                    placeholder="Y/N"
                                    onChange={(value) =>
                                        handleRequestChange(
                                            'medicalRequest',
                                            'medicalDetails',
                                            value
                                        )
                                    }
                                    options={yesNoOptions}
                                />
                            </Form.Item>
                        </div>

                        <div className="mrc-registration-detail-row">
                            <span>If yes, please indicate details:</span>

                            <Form.Item
                                name="medicalDetails"
                                className="mrc-medical-details-field"
                                style={{ margin: 0 }}
                                rules={[
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (
                                                getFieldValue('medicalRequest') === 'Y' &&
                                                (!value || value === 'N/A')
                                            ) {
                                                return Promise.reject(
                                                    new Error(
                                                        'Please provide medical details'
                                                    )
                                                );
                                            }
                                            return Promise.resolve();
                                        },
                                    }),
                                ]}
                            >
                                <TextArea
                                    className="mrc-registration-detail-box"
                                    maxLength={200}
                                    rows={2}
                                    disabled={medicalRequest !== 'Y'}
                                />
                            </Form.Item>
                        </div>
                    </section>

                    <section className="mrc-registration-insurance-card">
                        <h4>TRAVEL INSURANCE</h4>

                        <p>
                            We highly encourage <strong>ALL OUR CLIENTS</strong> to have and
                            are covered with travel insurance for health, repatriation, loss
                            of luggage/belongings and in case of cancellation, flight delays,
                            and the like that is why purchasing of travel insurance together
                            with our tour packages is compulsory for your convenience and
                            peace of mind.
                        </p>

                        <div className="mrc-registration-insurance-answer-row">
                            <span>
                                Do you agree to purchase a Travel Insurance from us?
                            </span>
                            <Form.Item
                                name="purchaseInsurance"
                                noStyle
                                rules={[
                                    {
                                        required: true,
                                        message: 'Required Insurance Agreement',
                                    },
                                ]}
                            >
                                <Select
                                    size="small"
                                    style={compactSelectStyle}
                                    placeholder="Y/N"
                                    options={yesNoOptions}
                                />
                            </Form.Item>
                        </div>

                        <p className="mrc-registration-note-text">
                            Note: Purchasing of travel insurance from our Travel &amp; Tours
                            company does not hold us liable for any claims and anything about
                            the process of claims from the insurance company. We can only
                            provide the documents from our suppliers, operators, and
                            airlines&apos; end if necessary. Kindly email us immediately at{' '}
                            <strong>info1@mrctravel.com</strong> if you plan to purchase travel
                            insurance from us.
                        </p>

                        <div className="mrc-registration-insurance-answer-row">
                            <span>
                                Do you agree to purchase a Travel Insurance from us?
                            </span>
                            <Form.Item
                                name="ownInsurance"
                                noStyle
                                rules={[
                                    {
                                        required: true,
                                        message: 'Required Insurance Agreement',
                                    },
                                ]}
                            >
                                <Select
                                    size="small"
                                    style={compactSelectStyle}
                                    placeholder="Y/N"
                                    options={yesNoOptions}
                                />
                            </Form.Item>
                        </div>

                        <table className="mrc-registration-insurance-table">
                            <tbody>
                                <tr>
                                    <th>If YES, please indicate details:</th>
                                    <td>
                                        Please check the conditions and coverage carefully and
                                        send us a copy of the policy to our email{' '}
                                        <strong>info1@mrctravel.com</strong> so we can review as
                                        well.
                                    </td>
                                </tr>
                                <tr>
                                    <th>
                                        If NO but chose not to purchase Travel Insurance from
                                        us:
                                    </th>
                                    <td>
                                        <strong>
                                            I understand that I am waiving the right of any
                                            assistance from the travel and tours company related
                                            to claims.
                                        </strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <div className="mrc-registration-header mrc-registration-header--blue mrc-registration-emergency-title">
                        EMERGENCY CONTACT{' '}
                        <span>
                            (i.e: the person to contact in the event of an emergency while
                            you are away)
                        </span>
                    </div>

                    <div className="mrc-registration-table-wrap">
                        <table className="mrc-registration-emergency-table">
                            <tbody>
                                <tr>
                                    <th>Title:</th>
                                    <td>
                                        <Form.Item
                                            name="emergencyTitle"
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
                                            <Select
                                                size="small"
                                                variant="borderless"
                                                style={{ width: '100%' }}
                                                placeholder="MR/MS"
                                                options={[
                                                    { value: 'MR', label: 'MR' },
                                                    { value: 'MS', label: 'MS' },
                                                ]}
                                            />
                                        </Form.Item>
                                    </td>

                                    <th>Full name:</th>
                                    <td colSpan={3}>
                                        <Form.Item
                                            name="emergencyName"
                                            noStyle
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Full name is required',
                                                },
                                                {
                                                    pattern: /^[A-Za-z\s'-]+$/,
                                                    message:
                                                        'Full name must contain letters only',
                                                },
                                            ]}
                                        >
                                            <Input
                                                autoComplete="off"
                                                maxLength={50}
                                                variant="borderless"
                                                onKeyDown={(event) => {
                                                    const allowedCharacter = /^[A-Za-z\s'-]$/;
                                                    if (
                                                        event.key.length === 1 &&
                                                        !allowedCharacter.test(event.key)
                                                    ) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                            />
                                        </Form.Item>
                                    </td>
                                </tr>

                                <tr>
                                    <th>Email:</th>
                                    <td>
                                        <Form.Item
                                            name="emergencyEmail"
                                            noStyle
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Email is required',
                                                },
                                                {
                                                    type: 'email',
                                                    message: 'Invalid email format',
                                                },
                                            ]}
                                        >
                                            <Input
                                                maxLength={50}
                                                variant="borderless"
                                                onKeyDown={(event) => {
                                                    const allowedCharacter =
                                                        /^[A-Za-z0-9\s'@.-]$/;
                                                    if (
                                                        event.key.length === 1 &&
                                                        !allowedCharacter.test(event.key)
                                                    ) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                            />
                                        </Form.Item>
                                    </td>

                                    <th>Contact Number:</th>
                                    <td>
                                        <Form.Item
                                            name="emergencyContact"
                                            noStyle
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Contact number is required',
                                                },
                                                {
                                                    pattern: /^[0-9]{7,11}$/,
                                                    message:
                                                        'Enter valid contact number (7-11 digits)',
                                                },
                                            ]}
                                        >
                                            <Input
                                                maxLength={11}
                                                variant="borderless"
                                                onChange={(event) => {
                                                    const value = event.target.value
                                                        .replace(/\D/g, '')
                                                        .slice(0, 11);
                                                    form.setFieldsValue({
                                                        emergencyContact: value,
                                                    });
                                                }}
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key.length === 1 &&
                                                        !/^[0-9]$/.test(event.key)
                                                    ) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                            />
                                        </Form.Item>
                                    </td>

                                    <th>Relation:</th>
                                    <td>
                                        <Form.Item
                                            name="emergencyRelation"
                                            noStyle
                                            rules={[
                                                {
                                                    required: true,
                                                    message: 'Relation is required',
                                                },
                                            ]}
                                        >
                                            <Select
                                                size="small"
                                                variant="borderless"
                                                style={{ width: '100%' }}
                                                placeholder="Select relation"
                                                options={[
                                                    { value: 'BROTHER', label: 'BROTHER' },
                                                    { value: 'SISTER', label: 'SISTER' },
                                                    { value: 'MOTHER', label: 'MOTHER' },
                                                    { value: 'FATHER', label: 'FATHER' },
                                                    { value: 'RELATIVE', label: 'RELATIVE' },
                                                ]}
                                            />
                                        </Form.Item>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <Form.Item
                        name="emergencyContactValidation"
                        hidden
                        dependencies={[
                            'emergencyTitle',
                            'emergencyName',
                            'emergencyEmail',
                            'emergencyContact',
                            'emergencyRelation',
                        ]}
                        rules={[
                            {
                                validator: () => {
                                    const emergencyTitle =
                                        form.getFieldValue('emergencyTitle');
                                    const emergencyName = String(
                                        form.getFieldValue('emergencyName') || ''
                                    ).trim();
                                    const emergencyEmail = String(
                                        form.getFieldValue('emergencyEmail') || ''
                                    ).trim();
                                    const emergencyContact = String(
                                        form.getFieldValue('emergencyContact') || ''
                                    ).trim();
                                    const emergencyRelation = String(
                                        form.getFieldValue('emergencyRelation') || ''
                                    ).trim();

                                    return emergencyTitle &&
                                        emergencyName &&
                                        emergencyEmail &&
                                        emergencyContact &&
                                        emergencyRelation
                                        ? Promise.resolve()
                                        : Promise.reject(
                                            new Error(
                                                'Please complete all emergency contact details before proceeding.'
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
                            const emergencyTitle =
                                form.getFieldValue('emergencyTitle');
                            const emergencyName = String(
                                form.getFieldValue('emergencyName') || ''
                            ).trim();
                            const emergencyEmail = String(
                                form.getFieldValue('emergencyEmail') || ''
                            ).trim();
                            const emergencyContact = String(
                                form.getFieldValue('emergencyContact') || ''
                            ).trim();
                            const emergencyRelation = String(
                                form.getFieldValue('emergencyRelation') || ''
                            ).trim();

                            const hasAllEmergencyDetails =
                                emergencyTitle &&
                                emergencyName &&
                                emergencyEmail &&
                                emergencyContact &&
                                emergencyRelation;

                            return hasAllEmergencyDetails ? null : (
                                <div className="mrc-contact-form-field">
                                    Please complete all emergency contact details before
                                    proceeding.
                                </div>
                            );
                        }}
                    </Form.Item>

                    <div className="mrc-registration-signature-row">
                        <div className="mrc-registration-signature-box">
                            <Form.Item name="leadFullName" noStyle>
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
                            <Form.Item name="signatureDate" noStyle>
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
                    <span>Page 2 of 4</span>
                </div>
            </div>
        </div>
    );
}