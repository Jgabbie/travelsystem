import React, { useState } from 'react'
import { Select, Button, ConfigProvider, DatePicker, TimePicker, Modal } from 'antd'
import { useAuth } from '../../hooks/useAuth'
import dayjs from 'dayjs'
import LoginModal from '../../components/modals/LoginModal'
import '../../style/client/passport.css'
import apiFetch from '../../config/fetchConfig'

const dfaLocations = [
    'DFA Aseana (Paranaque)',
    'DFA Manila (Robinsons Place)',
    'DFA Cebu (Pacific Mall)',
    'DFA Davao (SM City)',
    'DFA Iloilo (Robinsons Jaro)',
    'DFA Baguio (SM City)',
    'DFA Pampanga (SM City Clark)',
    'DFA Cagayan de Oro (SM Downtown Premier)',
    'DFA Laguna (SM City Santa Rosa)',
    'DFA Bacolod (SM City Bacolod)'
]

export default function RenewPassport() {
    const [loginModalVisible, setLoginModalVisible] = useState(false);
    const [sentModalVisible, setSentModalVisible] = useState(false);

    const [location, setLocation] = useState(undefined)
    const [preferredDate, setPreferredDate] = useState('')
    const [preferredTime, setPreferredTime] = useState('')
    const { auth } = useAuth()

    const [error, setError] = useState({
        location: '',
        preferredDate: '',
        preferredTime: ''
    });

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
            await apiFetch.post('/passport/apply', {
                dfaLocation: location,
                preferredDate,
                preferredTime,
                applicationType: 'Renewal Passport'
            });
            setSentModalVisible(true);
        } catch (error) {
            console.error('Error submitting passport application request:', error);
        }
    }

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
                style={{ top: 220 }}
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
                <header className="passport-header">
                    <h2>Passport Renewal Assistance</h2>
                    <p>Keep your documents ready and reserve your renewal schedule.</p>
                </header>
                <div className="passport-page">
                    <div className='passport-content'>
                        <section className="passport-grid">
                            <div className="passport-panel">
                                <h3>Requirements</h3>
                                <ul className="passport-list">
                                    <li>Confirmed DFA appointment</li>
                                    <li>Accomplished application form</li>
                                    <li>Old passport (original and photocopy)</li>
                                    <li>Valid government-issued ID</li>
                                    <li>Supporting documents for changes (if any)</li>
                                </ul>
                            </div>

                            <div className="passport-panel">
                                <h3>Step-by-step process</h3>
                                <div className="passport-steps">
                                    <div className="passport-step">
                                        <span className="passport-step-number">1</span>
                                        <div>
                                            <h4>Choose a DFA site</h4>
                                            <p>Select your preferred location and appointment date.</p>
                                        </div>
                                    </div>
                                    <div className="passport-step">
                                        <span className="passport-step-number">2</span>
                                        <div>
                                            <h4>Prepare renewal documents</h4>
                                            <p>Bring your old passport and updated IDs.</p>
                                        </div>
                                    </div>
                                    <div className="passport-step">
                                        <span className="passport-step-number">3</span>
                                        <div>
                                            <h4>Visit DFA on schedule</h4>
                                            <p>Submit requirements and complete biometrics.</p>
                                        </div>
                                    </div>
                                    <div className="passport-step">
                                        <span className="passport-step-number">4</span>
                                        <div>
                                            <h4>Receive your new passport</h4>
                                            <p>Track release updates after processing.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="renew-passport-card">
                            <h3>Application Details</h3>
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
                                <span>Renew Passport Fee</span>
                                <span>PHP 2,000</span>
                            </div>
                            <div className="passport-form" style={{ display: 'flex', flexDirection: 'row' }}>

                                <div>
                                    <div className='form-group'>
                                        <label className="passport-label">Select DFA location</label>
                                        <Select
                                            className={`passport-select ${error.location ? 'input-error' : ''}`}
                                            placeholder="Choose a DFA site"
                                            value={location}
                                            onChange={(value) => setLocation(value)}
                                            options={dfaLocations.map((item) => ({ value: item, label: item }))}
                                        />
                                        <p className="error-message">
                                            {error.location || ''}
                                        </p>
                                    </div>

                                    <div className="form-group">
                                        <label className="passport-label">Preferred date</label>
                                        <DatePicker
                                            value={preferredDate ? dayjs(preferredDate) : null}
                                            disabledDate={disableDates}
                                            onChange={(date) => setPreferredDate(date ? date.format('YYYY-MM-DD') : '')}
                                            className={`passport-input ${error.preferredDate ? 'input-error' : ''}`}
                                        />
                                        <p className="error-message">
                                            {error.preferredDate || ''}
                                        </p>
                                    </div>

                                    <div className="form-group">
                                        <label className="passport-label">Preferred time</label>
                                        <TimePicker
                                            value={preferredTime ? dayjs(preferredTime, 'h:mm A') : null}
                                            format="h:mm A"
                                            use12Hours
                                            showNow={false}
                                            minuteStep={30}
                                            disabledTime={() => ({
                                                disabledHours
                                            })}
                                            onChange={(time) => setPreferredTime(time ? time.format('h:mm A') : '')}
                                            className={`passport-input ${error.preferredTime ? 'input-error' : ''}`}
                                        />
                                        <p className="error-message">
                                            {error.preferredTime || ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Button className="passport-submit" type="primary" onClick={submitRequest}>
                                Submit request
                            </Button>
                        </section>
                    </div>

                </div>
            </div>
        </ConfigProvider>
    )
}
