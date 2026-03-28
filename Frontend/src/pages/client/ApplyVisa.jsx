import React, { useEffect, useMemo, useState } from 'react'
import { Select, Input, Button, ConfigProvider, DatePicker, TimePicker } from 'antd'
import { useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import { useAuth } from '../../hooks/useAuth'
import LoginModal from '../../components/modals/LoginModal'
import TopNavUser from '../../components/TopNavUser'
import '../../style/client/passport.css'
import axiosInstance from '../../config/axiosConfig'

export default function ApplyVisa() {
    const [loginModalVisible, setLoginModalVisible] = useState(false)
    const [services, setServices] = useState([])
    const [selectedServiceId, setSelectedServiceId] = useState(undefined)
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [preferredDate, setPreferredDate] = useState('')
    const [preferredTime, setPreferredTime] = useState('')
    const [purpose, setPurpose] = useState('')

    const { auth } = useAuth()
    const location = useLocation()

    const [error, setError] = useState({
        selectedServiceId: '',
        preferredDate: '',
        preferredTime: '',
        purpose: ''
    })

    useEffect(() => {
        const loadServices = async () => {
            try {
                const response = await axiosInstance.get('/services/services')
                console.log('Loaded visa services:', response.data)
                setServices(response.data || [])
            } catch (loadError) {
                console.error('Failed to load visa services:', loadError)
            }
        }

        loadServices()
    }, [])

    useEffect(() => {
        if (location?.state?.serviceId) {
            setSelectedServiceId(location.state.serviceId)
        }
    }, [location])

    const selectedService = useMemo(
        () => services.find((service) => service._id === selectedServiceId),
        [services, selectedServiceId]
    )

    const requirements = selectedService?.visaRequirements || []
    const steps = selectedService?.visaProcessSteps || []

    const submitRequest = async () => {
        const newErrors = {
            selectedServiceId: '',
            preferredDate: '',
            preferredTime: '',
            purpose: '',
        }

        if (!selectedServiceId) {
            newErrors.selectedServiceId = 'Please select a visa service'
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

        console.log("User: ", auth)

        if (!auth || !auth?.username) {
            setLoginModalVisible(true)
            return
        }

        try {
            await axiosInstance.post('/visa/apply', {
                serviceId: selectedServiceId,
                preferredDate,
                preferredTime,
                purposeOfTravel: purpose,
                applicationType: 'Visa',
                status: steps[0]
            })
            console.log('Submitting visa application request')
        } catch (submitError) {
            console.error('Error submitting visa application request:', submitError)
        }
    }

    const disableDates = (current) => {
        return current && current < dayjs().startOf('day') || current.day() === 0 || current.day() === 6;
    }

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

            <div className="passport-page">
                <TopNavUser />
                <div className="passport-container">
                    <header className="passport-header">
                        <h2>Visa Application Assistance</h2>
                        <p>Choose a visa service, review the requirements, and submit your preferred schedule.</p>
                    </header>

                    <section className="passport-grid">
                        <div className="passport-panel">
                            <h3>Requirements</h3>
                            <ul className="passport-list">
                                {requirements.map((item, index) => (
                                    <li key={`req-${index}`}>
                                        <strong>{item.req}</strong>
                                        <br />
                                        <span>{item.desc}</span>
                                    </li>
                                ))}
                            </ul>
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
                                                <strong>{step}</strong><br />

                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="renew-passport-card">

                        <h3>Application Details</h3>
                        <div className="passport-form" style={{ display: 'flex', flexDirection: 'row' }}>

                            <div>
                                <div className="form-group">
                                    <label className="passport-label">Preferred appointment date</label>
                                    <DatePicker
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

                            <div style={{ marginLeft: '20px' }}>
                                <h3>FAQs</h3>
                                <p>Find answers to common questions about the visa application process.</p>

                                <h4>What documents do I need to prepare?</h4>
                                <p className='faqs-answer'>Refer to the requirements section above for a general list. Specific services may have additional requirements.</p>

                                <h4>How long does the process take?</h4>
                                <p className='faqs-answer'>Processing times vary by embassy and service. After submission, you will receive updates on your application's status.</p>

                                <h4>Can I reschedule my appointment?</h4>
                                <p className='faqs-answer'>Rescheduling policies depend on the embassy. If you need to change your appointment, please contact the embassy directly.</p>
                            </div>
                        </div>
                        <Button className="passport-submit" type="primary" onClick={submitRequest}>
                            Submit request
                        </Button>
                    </section>
                </div>
            </div>
        </ConfigProvider>
    )
}
