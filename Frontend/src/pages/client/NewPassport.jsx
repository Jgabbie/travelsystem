
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

const phonePattern = /^[+()\d\s.-]{7,20}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function NewPassport() {
    const applicationType = 'New Passport';

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

        if (
            details.emailAddress &&
            !emailPattern.test(details.emailAddress.trim())
        ) {
            nextErrors.emailAddress = 'Enter a valid email address.';
        }

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
                nextErrors[key] = 'Enter a valid phone number.';
            }
        });

        if (
            details.dateOfBirth &&
            dayjs(details.dateOfBirth).isAfter(dayjs(), 'day')
        ) {
            nextErrors.dateOfBirth =
                'Date of birth cannot be in the future.';
        }

        if (!location) {
            nextErrors.location = 'Please select a DFA location.';
        }

        if (!preferredDate) {
            nextErrors.preferredDate =
                'Please select an appointment date.';
        }

        if (!preferredTime) {
            nextErrors.preferredTime =
                'Please select an appointment time.';
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
                value={details[key]}
                placeholder={`Enter ${label.toLowerCase()}`}
                maxLength={
                    key.toLowerCase().includes('number') ||
                        key.toLowerCase().includes('phone')
                        ? 30
                        : 120
                }
                status={errors[key] ? 'error' : ''}
                onChange={event => update(key, event.target.value)}
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
                    <h2>New Passport Assistance</h2>
                    <p>
                        Complete all required details from the passport appointment form.
                    </p>
                </header>

                <div className="passport-page">
                    <div className="passport-content">
                        <h2 style={{ margin: '10px 20px 15px', color: '#992A46' }}>
                            New Passport
                        </h2>

                        <p style={{ margin: '0 20px 18px' }}>
                            Fields marked with <span style={{ color: '#d00' }}>*</span>
                            {' '}are required. Enter accurate information matching your
                            supporting documents.
                        </p>

                        {section('Personal Information', <>
                            {field('phoneNumber', 'Phone Number', 'tel', true)}
                            {field('mobileNumber', 'Mobile Number', 'tel', true)}
                            {field('emailAddress', 'Email Address', 'email', true)}
                            {field('lastName', 'Last Name', 'text', true)}
                            {field('givenName', 'Given Name', 'text', true)}
                            {field('middleName', 'Middle Name')}
                            {field('suffix', 'Name Suffix')}

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
                            {field('countryOfBirth', 'Country of Birth', 'text', true)}
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
                            {field('fatherLastName', "Father's Last Name", 'text', true)}
                            {field('fatherGivenName', "Father's Given Name", 'text', true)}
                            {field('fatherMiddleName', "Father's Middle Name")}
                            {field('fatherCitizenship', "Father's Citizenship", 'text', true)}
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
                            <div className="form-group">
                                <label className="passport-label">Application Type</label>
                                <Input value="New" readOnly />
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
