
import React, { useEffect, useState } from 'react';
import {
    Button,
    ConfigProvider,
    DatePicker,
    Input,
    Modal,
    Select,
    TimePicker,
    message
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import dayjs from 'dayjs';
import LoginModal from '../../components/modals/LoginModal';
import '../../style/client/passport.css';
import apiFetch from '../../config/fetchConfig';

const emptyDetails = {
    phoneNumber: '',
    mobileNumber: '',
    emailAddress: '',
    lastName: '',
    givenName: '',
    middleName: '',
    suffix: '',
    dateOfBirth: '',
    gender: '',
    civilStatus: '',
    citizenship: '',
    birthLegitimacy: '',
    countryOfBirth: '',
    provinceOfBirth: '',
    cityMunicipalityOfBirth: '',
    companionName: '',
    companionRelationship: '',
    companionContactNumber: '',
    fatherLastName: '',
    fatherGivenName: '',
    fatherMiddleName: '',
    fatherCitizenship: '',
    motherMaidenLastName: '',
    motherGivenName: '',
    motherMiddleName: '',
    motherCitizenship: '',
    oldPassportNumber: '',
    oldPassportDateOfIssue: '',
    oldPassportIssuingAuthority: '',
    emergencyContactPerson: '',
    emergencyContactNumber: '',
    currentAddress: '',
    barangay: '',
    currentCity: '',
    currentProvince: '',
    zipCode: '',
    occupation: '',
    officeNumber: '',
    officeAddress: ''
};

const requiredFields = [
    ['phoneNumber', 'Phone number'],
    ['mobileNumber', 'Mobile number'],
    ['emailAddress', 'Email address'],
    ['lastName', 'Last name'],
    ['givenName', 'Given name'],
    ['citizenship', 'Citizenship'],
    ['dateOfBirth', 'Date of birth'],
    ['gender', 'Gender'],
    ['civilStatus', 'Civil status'],
    ['birthLegitimacy', 'Birth legitimacy'],
    ['countryOfBirth', 'Country of birth'],
    ['provinceOfBirth', 'Birth province'],
    ['cityMunicipalityOfBirth', 'Birth city/municipality'],
    ['fatherLastName', "Father's last name"],
    ['fatherGivenName', "Father's given name"],
    ['fatherCitizenship', "Father's citizenship"],
    ['motherMaidenLastName', "Mother's maiden last name"],
    ['motherGivenName', "Mother's given name"],
    ['motherCitizenship', "Mother's citizenship"],
    ['emergencyContactPerson', 'Emergency contact person'],
    ['emergencyContactNumber', 'Emergency contact number'],
    ['currentAddress', 'Current address'],
    ['barangay', 'Barangay'],
    ['currentCity', 'Current city'],
    ['currentProvince', 'Current province'],
    ['zipCode', 'ZIP code'],
    ['occupation', 'Occupation']
];

const steps = [
    {
        title: 'Application Submitted',
        desc: 'Your passport application has been successfully submitted.'
    },
    {
        title: 'Application Approved',
        desc: 'Your application has been reviewed and approved.'
    },
    {
        title: 'Payment Completed',
        desc: 'The required passport assistance fee has been paid.'
    },
    {
        title: 'Documents Uploaded',
        desc: 'The required application documents have been uploaded.'
    },
    {
        title: 'Documents Approved',
        desc: 'Your uploaded documents have been reviewed and approved.'
    },
    {
        title: 'Documents Received',
        desc: 'Your physical documents have been received.'
    },
    {
        title: 'Documents Submitted',
        desc: 'Your documents have been submitted for processing.'
    },
    {
        title: 'Processing By DFA',
        desc: 'Your passport application is currently being processed by DFA.'
    },
    {
        title: 'DFA Approved',
        desc: 'Your passport application has been approved by DFA.'
    },
    {
        title: 'Passport Released',
        desc: 'Your passport is ready for release or delivery.'
    }
];

const reminders = [
    'Bring your original PSA birth certificate and a valid government-issued ID.',
    'Make sure all personal information matches your supporting documents.',
    'Prepare additional documents if you have a change in name or personal information.',
    'Arrive at the selected DFA location at least 30 minutes before your appointment.',
    'Your preferred appointment schedule is subject to confirmation and availability.'
];

const phonePattern = /^09\d{9}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lettersOnlyPattern = /^[A-Za-zÀ-ÿ]{2,}(?: [A-Za-zÀ-ÿ]{2,})*$/;
const zipCodePattern = /^\d{4}$/;
const numericFields = [
    'phoneNumber',
    'mobileNumber',
    'companionContactNumber',
    'emergencyContactNumber',
    'officeNumber',
    'zipCode'
];

const lettersOnlyFields = [
    'lastName',
    'givenName',
    'middleName',
    'suffix',
    'fatherLastName',
    'fatherGivenName',
    'fatherMiddleName',
    'motherMaidenLastName',
    'motherGivenName',
    'motherMiddleName',
    'emergencyContactPerson',
    'provinceOfBirth',
    'companionName',
    'companionRelationship',
    'fatherCitizenship',
    'motherCitizenship',
    'currentProvince',
    'occupation',
    'citizenship'
];

const countryOptions = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola',
    'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus',
    'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina',
    'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
    'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic',
    'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo',
    'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Denmark',
    'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
    'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini',
    'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia',
    'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea',
    'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland',
    'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
    'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
    'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho',
    'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
    'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
    'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia',
    'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique',
    'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand',
    'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
    'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama',
    'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
    'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
    'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
    'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
    'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
    'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain',
    'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
    'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
    'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
    'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
    'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
    'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export default function RenewPassport({ isRenewal = true }) {
    const applicationType = isRenewal ? 'Renewal Passport' : 'New Passport';

    const [details, setDetails] = useState(emptyDetails);
    const [errors, setErrors] = useState({});
    const [location, setLocation] = useState();
    const [preferredDate, setPreferredDate] = useState(null);
    const [preferredTime, setPreferredTime] = useState(null);
    const [dfaLocations, setDfaLocations] = useState([]);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loginOpen, setLoginOpen] = useState(false);
    const [successOpen, setSuccessOpen] = useState(false);

    const { auth } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const loadLocations = async () => {
            setLoadingLocations(true);

            try {
                const result = await apiFetch.get(
                    '/dfa-locations/get-dfalocation'
                );
                setDfaLocations(Array.isArray(result) ? result : []);
            } catch (error) {
                message.error(
                    'Unable to load DFA locations. Please refresh and try again.'
                );
            } finally {
                setLoadingLocations(false);
            }
        };

        loadLocations();
    }, []);

    const update = (key, value) => {
        setDetails(previous => ({
            ...previous,
            [key]: value
        }));

        setErrors(previous => ({
            ...previous,
            [key]: ''
        }));
    };

    const disabledAppointmentDate = current =>
        current &&
        (
            current.isBefore(dayjs().startOf('day').add(14, 'day'), 'day') ||
            current.day() === 0 ||
            current.day() === 6
        );

    const validate = () => {
        const nextErrors = {};

        requiredFields.forEach(([key, label]) => {
            if (!String(details[key] || '').trim()) {
                nextErrors[key] = `${label} is required.`;
            }
        });

        if (isRenewal) {
            [
                ['oldPassportNumber', 'Previous passport number'],
                ['oldPassportDateOfIssue', 'Previous passport date of issue'],
                ['oldPassportIssuingAuthority', 'Previous passport issuing authority']
            ].forEach(([key, label]) => {
                if (!String(details[key] || '').trim()) {
                    nextErrors[key] = `${label} is required.`;
                }
            });
        }

        if (
            details.emailAddress &&
            !emailPattern.test(details.emailAddress.trim())
        ) {
            nextErrors.emailAddress = 'Enter a valid email address.';
        }

        lettersOnlyFields.forEach(key => {
            const value = String(details[key] || '').trim();

            if (value && !lettersOnlyPattern.test(value)) {
                nextErrors[key] =
                    'Use letters and spaces only.';
            }
        });

        [
            'phoneNumber',
            'mobileNumber',
            'companionContactNumber',
            'emergencyContactNumber',
            'officeNumber'
        ].forEach(key => {
            if (
                details[key] &&
                !phonePattern.test(details[key].trim())
            ) {
                nextErrors[key] = 'Enter exactly 11 digits starting with 09.';
            }
        });

        if (details.zipCode && !zipCodePattern.test(details.zipCode.trim())) {
            nextErrors.zipCode = 'Enter a valid 4-digit ZIP code.';
        }

        if (details.dateOfBirth) {
            const dateOfBirth = dayjs(details.dateOfBirth);

            if (!dateOfBirth.isValid()) {
                nextErrors.dateOfBirth = 'Enter a valid date of birth.';
            } else if (dateOfBirth.isAfter(dayjs(), 'day')) {
                nextErrors.dateOfBirth =
                    'Date of birth cannot be in the future.';
            }
        }

        if (!location) {
            nextErrors.location = 'Please select a DFA location.';
        }

        if (!preferredDate) {
            nextErrors.preferredDate =
                'Please select an appointment date.';
        } else if (
            !preferredDate.isValid() ||
            disabledAppointmentDate(preferredDate)
        ) {
            nextErrors.preferredDate =
                'Choose a weekday at least 14 days from today.';
        }

        if (!preferredTime) {
            nextErrors.preferredTime =
                'Please select an appointment time.';
        } else if (
            !preferredTime.isValid() ||
            preferredTime.hour() < 8 ||
            preferredTime.hour() > 17 ||
            ![0, 30].includes(preferredTime.minute())
        ) {
            nextErrors.preferredTime =
                'Choose an appointment time between 8:00 AM and 5:00 PM.';
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const submit = async () => {
        if (!validate()) {
            message.error('Please correct the highlighted fields.');
            return;
        }

        if (!auth?.username) {
            setLoginOpen(true);
            return;
        }

        setSubmitting(true);

        try {
            await apiFetch.post('/passport/apply', {
                dfaLocation: location,
                preferredDate: preferredDate.format('YYYY-MM-DD'),
                preferredTime: preferredTime.format('h:mm A'),
                applicationType,
                passportDetails: {
                    ...details
                }
            });

            setSuccessOpen(true);
        } catch (error) {
            message.error(
                error?.response?.data?.message ||
                error?.message ||
                'Unable to submit the passport application. Please try again.'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const field = (
        key,
        label,
        type = 'text',
        required = false
    ) => (
        <div className="form-group" key={key}>
            <label className="passport-label">
                {label}
                {required && <span style={{ color: '#d00' }}> *</span>}
            </label>

            <Input
                type={type}
                inputMode={numericFields.includes(key) ? 'numeric' : undefined}
                value={details[key]}
                placeholder={`Enter ${label.toLowerCase()}`}
                maxLength={
                    key === 'zipCode'
                        ? 4
                        : numericFields.includes(key)
                            ? 11
                            : 120
                }
                status={errors[key] ? 'error' : ''}
                onChange={event => update(
                    key,
                    numericFields.includes(key)
                        ? event.target.value.replace(/\D/g, '')
                        : lettersOnlyFields.includes(key)
                            ? event.target.value.replace(/[^A-Za-zÀ-ÿ ]/g, '')
                            : event.target.value
                )}
            />

            {errors[key] && (
                <p className="error-message">{errors[key]}</p>
            )}
        </div>
    );

    const selectField = (
        key,
        label,
        options,
        required = false
    ) => (
        <div className="form-group" key={key}>
            <label className="passport-label">
                {label}
                {required && <span style={{ color: '#d00' }}> *</span>}
            </label>

            <Select
                className="passport-select"
                value={details[key] || undefined}
                placeholder={`Select ${label.toLowerCase()}`}
                options={options.map(value => ({
                    label: value,
                    value
                }))}
                status={errors[key] ? 'error' : ''}
                onChange={value => update(key, value)}
            />

            {errors[key] && (
                <p className="error-message">{errors[key]}</p>
            )}
        </div>
    );

    const section = (title, children) => (
        <section className="passport-panel" key={title}>
            <h3>{title}</h3>
            <div className="passport-form passport-details-grid">
                {children}
            </div>
        </section>
    );

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            <LoginModal
                isOpenLogin={loginOpen}
                isCloseLogin={() => setLoginOpen(false)}
                onLoginSuccess={() => setLoginOpen(false)}
            />

            <Modal
                open={successOpen}
                footer={null}
                centered
                onCancel={() => setSuccessOpen(false)}
            >
                <div className="signup-success-container">
                    <h1 className="signup-success-heading">
                        Application submitted
                    </h1>
                    <p className="signup-success-text">
                        Your passport application has been submitted successfully.
                        Please wait for it to be reviewed.
                    </p>
                    <Button
                        id="signup-success-button"
                        onClick={() => {
                            setSuccessOpen(false);
                            navigate('/user-applications');
                        }}
                    >
                        Continue
                    </Button>
                </div>
            </Modal>

            <div className="passport-container">
                <Button
                    className="passport-back-button"
                    type="primary"
                    onClick={() => navigate('/passandvisa-service')}
                >
                    <ArrowLeftOutlined /> Back
                </Button>

                <header className="passport-header">
                    <h2>{isRenewal ? 'Passport Renewal Assistance' : 'New Passport Assistance'}</h2>
                    <p>
                        Complete all required details from the passport appointment form.
                    </p>
                </header>

                <div className="passport-page">
                    <div className="passport-content">
                        <h2 style={{ margin: '10px 20px 15px', color: '#992A46' }}>
                            {isRenewal ? 'Renew Passport' : 'New Passport'}
                        </h2>

                        <p style={{ margin: '0 20px 18px' }}>
                            Fields marked with <span style={{ color: '#d00' }}>*</span>
                            {' '}are required. Enter accurate information matching your
                            supporting documents.
                        </p>

                        <section className="passport-grid">
                            <div className="passport-panel">
                                <h3>Requirements</h3>
                                <ul className="passport-list">
                                    <li>Confirmed DFA appointment</li>
                                    <li>Accomplished passport application form</li>
                                    <li>Original PSA birth certificate</li>
                                    <li>Valid government-issued ID</li>
                                    <li>Supporting documents, if required</li>
                                </ul>
                            </div>

                            <div className="passport-panel">
                                <h3>Reminders</h3>
                                <ul className="passport-list">
                                    {reminders.map((item, index) => (
                                        <li key={`reminder-${index}`}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        </section>

                        <section className="passport-grid passport-info-wide">
                            <div className="passport-panel">
                                <h3>Step-by-step process</h3>
                                <div className="passport-steps">
                                    {steps.map((step, index) => (
                                        <div className="passport-step" key={step.title}>
                                            <span className="passport-step-number">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <h4>{step.title}</h4>
                                                <p>{step.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        {section('Personal Information', <>
                            <div className="passport-subsection">Contact Information</div>
                            {field('phoneNumber', 'Phone Number', 'tel', true)}
                            {field('mobileNumber', 'Mobile Number', 'tel', true)}
                            {field('emailAddress', 'Email Address', 'email', true)}

                            <div className="passport-subsection">Name Information</div>
                            {field('lastName', 'Last Name', 'text', true)}
                            {field('givenName', 'Given Name', 'text', true)}
                            {field('middleName', 'Middle Name')}
                            {field('suffix', 'Name Suffix')}

                            <div className="passport-subsection">Additional Information</div>
                            <div className="form-group">
                                <label className="passport-label">
                                    Date of Birth <span style={{ color: '#d00' }}>*</span>
                                </label>
                                <DatePicker
                                    className="passport-input"
                                    value={
                                        details.dateOfBirth
                                            ? dayjs(details.dateOfBirth)
                                            : null
                                    }
                                    disabledDate={date =>
                                        date && date.isAfter(dayjs(), 'day')
                                    }
                                    onChange={date =>
                                        update(
                                            'dateOfBirth',
                                            date ? date.format('YYYY-MM-DD') : ''
                                        )
                                    }
                                />
                                {errors.dateOfBirth && (
                                    <p className="error-message">{errors.dateOfBirth}</p>
                                )}
                            </div>

                            {selectField(
                                'gender',
                                'Gender',
                                ['Male', 'Female', 'Prefer not to say'],
                                true
                            )}
                            {selectField(
                                'civilStatus',
                                'Civil Status',
                                ['Single', 'Married', 'Widowed', 'Separated', 'Annulled'],
                                true
                            )}
                            {field('citizenship', 'Citizenship', 'text', true)}
                            {selectField(
                                'birthLegitimacy',
                                'Birth Legitimacy',
                                ['Legitimate', 'Illegitimate'],
                                true
                            )}
                            {selectField(
                                'countryOfBirth',
                                'Country of Birth',
                                countryOptions,
                                true
                            )}
                            {field('provinceOfBirth', 'Province of Birth', 'text', true)}
                            {field(
                                'cityMunicipalityOfBirth',
                                'City/Municipality of Birth',
                                'text',
                                true
                            )}
                            {field('companionName', "Travelling Companion's Name")}
                            {field('companionRelationship', 'Companion Relationship')}
                            {field('companionContactNumber', 'Companion Contact Number', 'tel')}
                        </>)}

                        {section('Family Information', <>
                            <div className="passport-subsection">Father's Information</div>
                            {field('fatherLastName', "Father's Last Name", 'text', true)}
                            {field('fatherGivenName', "Father's Given Name", 'text', true)}
                            {field('fatherMiddleName', "Father's Middle Name")}
                            {field('fatherCitizenship', "Father's Citizenship", 'text', true)}

                            <div className="passport-subsection">Mother's Information</div>
                            {field(
                                'motherMaidenLastName',
                                "Mother's Maiden Last Name",
                                'text',
                                true
                            )}
                            {field('motherGivenName', "Mother's Given Name", 'text', true)}
                            {field('motherMiddleName', "Mother's Middle Name")}
                            {field('motherCitizenship', "Mother's Citizenship", 'text', true)}
                        </>)}

                        {section('Application Information', <>
                            {isRenewal && (
                                <>
                                    {field(
                                        'oldPassportNumber',
                                        'Old Passport',
                                        'text',
                                        true
                                    )}
                                    <div className="form-group">
                                        <label className="passport-label">
                                            Date of Issue
                                            <span style={{ color: '#d00' }}> *</span>
                                        </label>
                                        <DatePicker
                                            className="passport-input"
                                            value={
                                                details.oldPassportDateOfIssue
                                                    ? dayjs(details.oldPassportDateOfIssue)
                                                    : null
                                            }
                                            disabledDate={date =>
                                                date && date.isAfter(dayjs(), 'day')
                                            }
                                            onChange={date =>
                                                update(
                                                    'oldPassportDateOfIssue',
                                                    date ? date.format('YYYY-MM-DD') : ''
                                                )
                                            }
                                        />
                                        {errors.oldPassportDateOfIssue && (
                                            <p className="error-message">
                                                {errors.oldPassportDateOfIssue}
                                            </p>
                                        )}
                                    </div>
                                    {field(
                                        'oldPassportIssuingAuthority',
                                        'Issuing Authority',
                                        'text',
                                        true
                                    )}
                                </>
                            )}
                            <div className="form-group">
                                <label className="passport-label">Application Type</label>
                                <Input value={isRenewal ? 'Renewal' : 'New'} readOnly />
                            </div>

                            {field(
                                'emergencyContactPerson',
                                'Emergency Contact Person',
                                'text',
                                true
                            )}
                            {field(
                                'emergencyContactNumber',
                                'Emergency Contact Number',
                                'tel',
                                true
                            )}
                        </>)}

                        {section('Contact Information', <>
                            {field('currentAddress', 'Current Address', 'text', true)}
                            {field('barangay', 'Barangay', 'text', true)}
                            {field('currentCity', 'City', 'text', true)}
                            {field('currentProvince', 'Province', 'text', true)}
                            {field('zipCode', 'ZIP Code', 'text', true)}
                            {field('occupation', 'Occupation', 'text', true)}
                            {field('officeNumber', 'Office Number', 'tel')}
                            {field('officeAddress', 'Office Address')}
                        </>)}

                        <section className="passport-panel">
                            <h3>Appointment Schedule</h3>

                            <div className="passport-form passport-details-grid">
                                <div className="form-group">
                                    <label className="passport-label">
                                        DFA Location <span style={{ color: '#d00' }}>*</span>
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        className="passport-select"
                                        value={location}
                                        loading={loadingLocations}
                                        placeholder="Choose a DFA site"
                                        options={dfaLocations.map(item => ({
                                            label: item.location,
                                            value: item.location
                                        }))}
                                        onChange={setLocation}
                                    />
                                    {errors.location && (
                                        <p className="error-message">{errors.location}</p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="passport-label">
                                        Appointment Date <span style={{ color: '#d00' }}>*</span>
                                    </label>
                                    <DatePicker
                                        className="passport-input"
                                        value={preferredDate}
                                        disabledDate={disabledAppointmentDate}
                                        onChange={setPreferredDate}
                                        placeholder="Select date"
                                    />
                                    {errors.preferredDate && (
                                        <p className="error-message">{errors.preferredDate}</p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="passport-label">
                                        Appointment Time <span style={{ color: '#d00' }}>*</span>
                                    </label>
                                    <TimePicker
                                        className="passport-input"
                                        value={preferredTime}
                                        format="h:mm A"
                                        use12Hours
                                        minuteStep={30}
                                        disabledTime={() => ({
                                            disabledHours: () =>
                                                Array.from({ length: 24 }, (_, i) => i)
                                                    .filter(hour => hour < 8 || hour > 17)
                                        })}
                                        onChange={setPreferredTime}
                                        placeholder="Select time"
                                    />
                                    {errors.preferredTime && (
                                        <p className="error-message">{errors.preferredTime}</p>
                                    )}
                                </div>
                            </div>

                            <p>
                                Appointment date and time are preferences and remain subject
                                to confirmation.
                            </p>
                        </section>

                        <Button
                            className="passport-submit"
                            type="primary"
                            loading={submitting}
                            onClick={submit}
                        >
                            Submit Application
                        </Button>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}
