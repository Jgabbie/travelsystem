import React, { useEffect, useMemo, useState } from 'react'
import { Input, Button, ConfigProvider, DatePicker, TimePicker, Modal } from 'antd'
import { useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import { useAuth } from '../../hooks/useAuth'
import LoginModal from '../../components/modals/LoginModal'
import '../../style/client/passport.css'
import apiFetch from '../../config/fetchConfig'

export default function ApplyVisa() {
    const [loginModalVisible, setLoginModalVisible] = useState(false)
    const [sentModalVisible, setSentModalVisible] = useState(false)

    const [services, setServices] = useState([])
    const [selectedServiceId, setSelectedServiceId] = useState('')
    const [preferredDate, setPreferredDate] = useState('')
    const [preferredTime, setPreferredTime] = useState('')
    const [purpose, setPurpose] = useState('')

    const { auth } = useAuth()
    const location = useLocation()

    const normalizeServiceValue = (value) => String(value || '').trim().toLowerCase()

    const routeServiceValue = useMemo(
        () => location?.state?.visaName || location?.state?.serviceId || location?.state?.visaItem || '',
        [location?.state]
    )

    const [error, setError] = useState({
        selectedServiceId: '',
        preferredDate: '',
        preferredTime: '',
        purpose: ''
    })

    useEffect(() => {
        const loadServices = async () => {
            try {
                const response = await apiFetch.get('/services/services')
                setServices(response || [])
            } catch (loadError) {
                console.error('Failed to load visa services:', loadError)
            }
        }

        loadServices()
    }, [])

    useEffect(() => {
        if (routeServiceValue) {
            setSelectedServiceId(routeServiceValue)
        }
    }, [routeServiceValue])


    const selectedService = useMemo(
        () => services.find((service) => {
            const serviceName = normalizeServiceValue(service?.visaName)
            const serviceItem = normalizeServiceValue(service?.visaItem)
            const selectedValue = normalizeServiceValue(selectedServiceId)
            return serviceName === selectedValue || serviceItem === selectedValue
        }),
        [services, selectedServiceId]
    )

    useEffect(() => {
        if (!selectedServiceId && services.length > 0) {
            setSelectedServiceId(services[0].visaName)
        }
    }, [selectedServiceId, services])

    const requirements = selectedService?.visaRequirements || []
    const reminders = selectedService?.visaReminders || []
    const additionalRequirements = selectedService?.visaAdditionalRequirements || []
    const steps = selectedService?.visaProcessSteps || []

    const requiredRequirements = useMemo(
        () => requirements.filter((item) => item.isReq === 'Required'),
        [requirements]
    )

    const optionalRequirements = useMemo(
        () => requirements.filter((item) => item.isReq === 'Optional'),
        [requirements]
    )

    const handleOpenLink = (url) => {
        if (!url) return;
        const safeUrl = url.startsWith('http') ? url : `https://${url}`;
        window.open(safeUrl, '_blank', 'noopener,noreferrer');
    };

    const hasAdditionalRequirements = useMemo(
        () => additionalRequirements.some((group) =>
            group.customer?.trim?.() || (group.requirements || []).some((req) =>
                req.requirement?.trim?.() || req.description?.trim?.() || req.isReq
            )
        ),
        [additionalRequirements]
    )

    const submitRequest = async () => {
        const newErrors = {
            selectedServiceId: '',
            preferredDate: '',
            preferredTime: '',
            purpose: '',
        }

        if (!selectedServiceId) {
            newErrors.selectedServiceId = 'Please select a visa service'
        } else if (!selectedService) {
            newErrors.selectedServiceId = 'Please wait for the selected visa service to load'
        }

        if (!preferredDate) {
            newErrors.preferredDate = 'Please select a preferred submission date'
        }

        if (!preferredTime) {
            newErrors.preferredTime = 'Please select a preferred submission time'
        }

        if (!purpose.trim()) {
            newErrors.purpose = 'Please provide your purpose of travel'
        }

        setError(newErrors)

        if (newErrors.selectedServiceId || newErrors.preferredDate || newErrors.preferredTime || newErrors.purpose) {
            return
        }

        if (!auth || !auth?.username) {
            setLoginModalVisible(true)
            return
        }

        try {
            await apiFetch.post('/visa/apply', {
                serviceName: selectedService?.visaName || selectedServiceId,
                preferredDate,
                preferredTime,
                purposeOfTravel: purpose,
                applicationType: 'Visa',
                status: steps[0]
            })
            setSentModalVisible(true)
            console.log('Submitting visa application request')
        } catch (submitError) {
            console.error('Error submitting visa application request:', submitError)
        }
    }

    // DISABLE DATES AND HOURS --------------------------------
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
                    colorPrimary: '#305797'
                }
            }}
        >
            <LoginModal
                isOpenLogin={loginModalVisible}
                isCloseLogin={() => setLoginModalVisible(false)}
                onLoginSuccess={() => {
                    setLoginModalVisible(false)
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
                    <p className='signup-success-text'>Your visa application has been submitted successfully. Kindly wait for your application to be approved.</p>
                    <Button
                        type='primary'
                        id='signup-success-button'
                        onClick={() => {
                            setSentModalVisible(false)
                            setPurpose('')
                            setPreferredDate(null)
                            setPreferredTime(null)
                            setError({
                                purpose: '',
                                preferredDate: '',
                                preferredTime: '',
                            })
                        }}
                    >
                        Continue
                    </Button>
                </div>
            </Modal>

            <div className="passport-container">
                <header className="passport-header">
                    <h2>Visa Application Assistance</h2>
                    <p>Choose a visa service, review the requirements, and submit your preferred schedule.</p>
                </header>

                <div className="passport-page">
                    <div className='passport-content'>
                        <section className="passport-grid">
                            <div className="passport-panel" style={{ gridColumn: "1 / -1" }}>
                                <h3>Requirements</h3>

                                <h4>Required</h4>
                                {requiredRequirements.length ? (
                                    <ul className="passport-list">
                                        {requiredRequirements.map((item, index) => (
                                            <li key={`req-required-${index}`}>
                                                <strong>{item.req}</strong>
                                                <br />
                                                <span>{item.desc}</span>
                                                {item.applicationLink && (
                                                    <div style={{ marginTop: 8 }}>
                                                        <Button
                                                            className='visaapplication-link-button'
                                                            size="small"
                                                            type="link"
                                                            onClick={() => handleOpenLink(item.applicationLink)}
                                                        >
                                                            Open Application Link
                                                        </Button>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No required items.</p>
                                )}

                                <h4 style={{ marginTop: 12 }}>Optional</h4>
                                {optionalRequirements.length ? (
                                    <ul className="passport-list">
                                        {optionalRequirements.map((item, index) => (
                                            <li key={`req-optional-${index}`}>
                                                <strong>{item.req}</strong>
                                                <br />
                                                <span>{item.desc}</span>
                                                {item.applicationLink && (
                                                    <div style={{ marginTop: 8 }}>
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            onClick={() => handleOpenLink(item.applicationLink)}
                                                        >
                                                            Open Application Link
                                                        </Button>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No optional items.</p>
                                )}
                            </div>

                            {hasAdditionalRequirements ? (
                                <div className="passport-panel" style={{ gridColumn: "1 / -1" }}>
                                    <h3>Additional Requirements</h3>
                                    {additionalRequirements.map((group, groupIndex) => (
                                        <div key={`additional-group-${groupIndex}`} style={{ marginBottom: 16 }}>
                                            <h4 style={{ marginBottom: 8 }}>{group.customer || `Customer ${groupIndex + 1}`}</h4>
                                            <ul className="passport-list">
                                                {(group.requirements || []).map((reqItem, reqIndex) => (
                                                    <li key={`additional-req-${groupIndex}-${reqIndex}`}>
                                                        <strong>{reqItem.requirement}</strong>
                                                        {reqItem.isReq ? <span>{` (${reqItem.isReq})`}</span> : null}
                                                        <br />
                                                        <span>{reqItem.description}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            <div className="passport-panel">
                                <h3>Reminders</h3>
                                {reminders.length ? (
                                    <ul className="passport-list">
                                        {reminders.map((item, index) => (
                                            <li key={`reminder-${index}`}>{item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No reminders available.</p>
                                )}
                            </div>

                            <div className="passport-panel">
                                <h3>Step-by-step process</h3>
                                <div className="passport-steps">
                                    {steps.map((step, index) => (
                                        <div className="passport-step" key={`step-${index}`}>
                                            <span className="passport-step-number">{index + 1}</span>
                                            <div>
                                                <h4>{`Step ${index + 1}`}</h4>
                                                <p>
                                                    <strong>{typeof step === 'string' ? step : step?.title}</strong><br />
                                                    {typeof step === 'object' && step?.description ? step.description : null}

                                                </p>
                                            </div>
                                        </div>
                                    ))}
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
                                <span>Visa Fee</span>
                                <span>₱{selectedService?.visaPrice || 0}</span>
                            </div>
                            <div className="passport-form" style={{ display: 'flex', flexDirection: 'row' }}>

                                <div>
                                    <div className="form-group">
                                        <label className="passport-label">Preferred appointment date</label>
                                        <DatePicker
                                            value={preferredDate ? dayjs(preferredDate, 'YYYY-MM-DD') : null}
                                            disabledDate={disableDates}
                                            onChange={(date) => setPreferredDate(date ? date.format('YYYY-MM-DD') : '')}
                                            className={`passport-input ${error.preferredDate ? 'input-error' : ''}`}
                                        />
                                        <p className="error-message">
                                            {error.preferredDate || ''}
                                        </p>
                                    </div>


                                    <div className="form-group">
                                        <label className="passport-label">Preferred appointment time</label>
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


                                    <div className="form-group">
                                        <label className="passport-label">Purpose of travel</label>
                                        <Input.TextArea
                                            className={`passport-input ${error.purpose ? 'input-error' : ''}`}
                                            rows={3}
                                            placeholder="Share your purpose of travel"
                                            value={purpose}
                                            onChange={(event) => setPurpose(event.target.value)}
                                        />
                                        <p className="error-message">
                                            {error.purpose || ''}
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
