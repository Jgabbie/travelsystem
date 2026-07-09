import React, { useState } from 'react'
import { Select, Button, ConfigProvider, DatePicker, TimePicker, Modal } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import dayjs from 'dayjs'
import LoginModal from '../../components/modals/LoginModal'
import '../../style/client/passport.css'
import apiFetch from '../../config/fetchConfig'


// list of DFA locations for the dropdown
const dfaLocations = [
    'DFA Aseana (Paranaque)',
    'DFA NCR Central (Robinsons Galleria Ortigas)',
    'DFA NCR East (SM Megamall)',
    'DFA NCR North (Robinsons Novaliches)',
    'DFA NCR Northeast (Ali Mall Cubao)',
    'DFA NCR South (Festival Mall Muntinlupa)',
    'DFA NCR West (SM City Manila)',
    'DFA Angeles (SM City Clark)',
    'DFA Antipolo (SM Center Antipolo)',
    'DFA Baguio (SM City Baguio)',
    'DFA Balanga (The Bunker Bataan)',
    'DFA Calasiao (Robinsons Calasiao)',
    'DFA Candon (Candon City Arena)',
    'DFA Dasmarinas (SM City Dasmarinas)',
    'DFA Ilocos Norte (Robinsons Place San Nicolas)',
    'DFA La Union (CSI Mall San Fernando)',
    'DFA Legazpi (Pacific Mall Legazpi)',
    'DFA Lipa (Robinsons Lipa)',
    'DFA Lucena (Pacific Mall Lucena)',
    'DFA Malolos (Xentro Mall Malolos)',
    'DFA Olongapo (SM City Olongapo Central)',
    'DFA Pampanga (Robinsons Starmills San Fernando)',
    'DFA Paniqui (WalterMart Paniqui)',
    'DFA Puerto Princesa (Robinsons Place Palawan)',
    'DFA San Pablo (SM City San Pablo)',
    'DFA Santiago (Robinsons Place Santiago)',
    'DFA Tuguegarao (Regional Government Center)',
    'DFA Antique (CityMall Antique)',
    'DFA Bacolod (Robinsons Place Bacolod)',
    'DFA Cebu (Robinsons Galleria Cebu)',
    'DFA Dumaguete (Robinsons Place Dumaguete)',
    'DFA Iloilo (Robinsons Place Iloilo)',
    'DFA Tacloban (Robinsons North Tacloban)',
    'DFA Tagbilaran (Alturas Mall)',
    'DFA Butuan (Robinsons Place Butuan)',
    'DFA Cagayan de Oro (SM CDO Downtown Premier)',
    'DFA Clarin (Clarin Town Center)',
    'DFA Davao (SM City Davao)',
    'DFA General Santos (Robinsons Place General Santos)',
    'DFA Kidapawan',
    'DFA Pagadian (C3 Mall)',
    'DFA Tagum (Robinsons Place Tagum)',
    'DFA Zamboanga (Go-Velayo Building)'
];

const steps = [
    {
        title: "Application Submitted",
        desc: "Your passport application has been successfully submitted."
    },
    {
        title: "Application Approved",
        desc: "Your application has been reviewed and approved."
    },
    {
        title: "Payment Completed",
        desc: "The required passport assistance fee has been paid."
    },
    {
        title: "Documents Uploaded",
        desc: "The required application documents have been uploaded."
    },
    {
        title: "Documents Approved",
        desc: "Your uploaded documents have been reviewed and approved."
    },
    {
        title: "Documents Received",
        desc: "Your physical documents have been received."
    },
    {
        title: "Documents Submitted",
        desc: "Your documents have been submitted for processing."
    },
    {
        title: "Processing By DFA",
        desc: "Your passport application is currently being processed by DFA."
    },
    {
        title: "DFA Approved",
        desc: "Your passport application has been approved by DFA."
    },
    {
        title: "Passport Released",
        desc: "Your passport is ready for release or delivery."
    }
];

const reminders = [
    'Bring your current or expired passport together with a photocopy of its data page.',
    'Make sure all personal information matches your valid government-issued ID.',
    'Additional documents may be required for changes in your name or personal information.',
    'Arrive at the selected DFA location at least 30 minutes before your appointment.',
    'Your preferred appointment schedule is still subject to confirmation and availability.'
];

export default function RenewPassport() {
    const [loginModalVisible, setLoginModalVisible] = useState(false);
    const [sentModalVisible, setSentModalVisible] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [location, setLocation] = useState(undefined)
    const [preferredDate, setPreferredDate] = useState('')
    const [preferredTime, setPreferredTime] = useState('')
    const { auth } = useAuth()

    const navigate = useNavigate()


    // error state for form validation
    const [error, setError] = useState({
        location: '',
        preferredDate: '',
        preferredTime: ''
    });


    // form submission handler
    const submitRequest = async () => {

        const newErrors = {
            location: '',
            preferredDate: '',
            preferredTime: ''
        }

        if (!location) {
            newErrors.location = 'Please select a DFA location';
        }

        if (!preferredDate) {
            newErrors.preferredDate = 'Please select a preferred date';
        }

        if (!preferredTime) {
            newErrors.preferredTime = 'Please select a preferred time';
        }

        setError(newErrors);

        if (newErrors.location || newErrors.preferredDate || newErrors.preferredTime) {
            return;
        }

        if (!auth || !auth?.username) {
            setLoginModalVisible(true);
            return;
        }

        try {
            setIsSubmitting(true)

            await apiFetch.post('/passport/apply', {
                dfaLocation: location,
                preferredDate,
                preferredTime,
                applicationType: 'Renewal Passport'
            });
            setSentModalVisible(true);
        } catch (error) {
            console.error('Error submitting passport application request:', error);
        } finally {
            setIsSubmitting(false)
        }
    }


    // disable dates that are less than 2 weeks from now and weekends
    const disableDates = (current) => {
        const today = dayjs().startOf('day');
        const twoWeeksFromNow = today.add(14, 'day');

        return (
            current &&
            (
                current < twoWeeksFromNow ||
                current.day() === 0 ||
                current.day() === 6
            )
        );
    };


    // disable hours outside of 8am-5pm
    const disabledHours = () => {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            if (i < 8 || i > 17) {
                hours.push(i);
            }
        }
        return hours;
    }




    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <LoginModal
                isOpenLogin={loginModalVisible}
                isCloseLogin={() => setLoginModalVisible(false)}
                onLoginSuccess={() => {
                    setLoginModalVisible(false);
                }}
            />

            <Modal
                open={sentModalVisible}
                className='signup-success-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
            >
                <div className='signup-success-container'>
                    <h1 className='signup-success-heading'>Application submitted</h1>
                    <p className='signup-success-text'>Your passport renewal application has been submitted successfully. Kindly wait for your application to be approved.</p>
                    <Button
                        id='signup-success-button'
                        onClick={() => {
                            setSentModalVisible(false)
                            setLocation('')
                            setPreferredDate(null)
                            setPreferredTime(null)
                            setError({
                                location: '',
                                preferredDate: '',
                                preferredTime: '',
                            })
                            window.location.reload()
                        }}
                    >
                        Continue
                    </Button>
                </div>
            </Modal>

            <div className="passport-container">
                <Button
                    className='passport-back-button'
                    type='primary'
                    onClick={() => {
                        navigate('/passandvisa-service');
                    }}
                >
                    <ArrowLeftOutlined />
                    Back
                </Button>
                <header className="passport-header">
                    <h2>Passport Renewal Assistance</h2>
                    <p>Keep your documents ready and reserve your renewal schedule.</p>
                </header>
                <div className="passport-page">
                    <div className='passport-content'>
                        <p
                            style={{
                                marginTop: 10,
                                marginBottom: 15,
                                marginLeft: 20,
                                fontWeight: 700,
                                fontSize: 30,
                                fontFamily: 'Montserrat, sans-serif',
                                color: '#992A46'
                            }}
                        >
                            Renew Passport
                        </p>

                        {/* First row: Requirements and Reminders */}
                        <section className="passport-grid">
                            <div className="passport-panel">
                                <h3>Requirements</h3>

                                <ul className="passport-list">
                                    <li>Confirmed DFA appointment</li>
                                    <li>Accomplished application form</li>
                                    <li>Original PSA birth certificate</li>
                                    <li>Valid government-issued ID</li>
                                    <li>Supporting documents (if required)</li>
                                </ul>
                            </div>

                            <div className="passport-panel">
                                <h3>Reminders</h3>

                                {reminders.length ? (
                                    <ul className="passport-list">
                                        {reminders.map((item, index) => (
                                            <li key={`reminder-${index}`}>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No reminders available.</p>
                                )}
                            </div>
                        </section>

                        {/* Second row: Process and Application Details */}
                        <section className="passport-grid">
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

                            <section className="renew-passport-card passport-panel">
                                <h3 >Application Details</h3>

                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '6px 12px',
                                        marginTop: 6,
                                        marginBottom: 14,
                                        borderRadius: 999,
                                        background: 'rgba(48, 87, 151, 0.08)',
                                        border: '1px solid rgba(48, 87, 151, 0.25)',
                                        color: '#305797',
                                        fontWeight: 600,
                                    }}
                                >
                                    <span>Passport Fee</span>
                                    <span>PHP 2,000</span>
                                </div>

                                <div
                                    className="passport-form"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row'
                                    }}
                                >
                                    <div className="form-group-section">
                                        <div className="form-group">
                                            <label className="passport-label">
                                                Select DFA location
                                            </label>

                                            <Select
                                                className={`passport-select ${error.location ? 'input-error' : ''}`}
                                                placeholder="Choose a DFA site"
                                                value={location}
                                                onChange={(value) => setLocation(value)}
                                                options={dfaLocations.map((item) => ({
                                                    value: item,
                                                    label: item
                                                }))}
                                            />

                                            <p className="error-message">
                                                {error.location || ''}
                                            </p>
                                        </div>

                                        <div className="form-group">
                                            <label className="passport-label">
                                                Preferred date
                                            </label>

                                            <DatePicker
                                                value={preferredDate ? dayjs(preferredDate) : null}
                                                disabledDate={disableDates}
                                                showNow={false}
                                                onChange={(date) =>
                                                    setPreferredDate(
                                                        date ? date.format('YYYY-MM-DD') : ''
                                                    )
                                                }
                                                className={`passport-input ${error.preferredDate ? 'input-error' : ''}`}
                                            />

                                            <p className="error-message">
                                                {error.preferredDate || ''}
                                            </p>
                                        </div>

                                        <div className="form-group">
                                            <label className="passport-label">
                                                Preferred time
                                            </label>

                                            <TimePicker
                                                value={
                                                    preferredTime
                                                        ? dayjs(preferredTime, 'h:mm A')
                                                        : null
                                                }
                                                format="h:mm A"
                                                use12Hours
                                                showNow={false}
                                                minuteStep={30}
                                                disabledTime={() => ({
                                                    disabledHours
                                                })}
                                                onChange={(time) =>
                                                    setPreferredTime(
                                                        time ? time.format('h:mm A') : ''
                                                    )
                                                }
                                                className={`passport-input ${error.preferredTime ? 'input-error' : ''}`}
                                            />

                                            <p className="error-message">
                                                {error.preferredTime || ''}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    className="passport-submit"
                                    type="primary"
                                    onClick={submitRequest}
                                    loading={isSubmitting}
                                >
                                    Submit request
                                </Button>
                            </section>
                        </section>
                    </div>

                </div>
            </div>
        </ConfigProvider>
    )
}
