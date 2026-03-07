import React, { useEffect, useMemo, useState } from 'react'
import { Select, Input, Button, ConfigProvider, DatePicker } from 'antd'
import { useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import { useAuth } from '../../hooks/useAuth'
import LoginModal from '../../components/modals/LoginModal'
import TopNavUser from '../../components/TopNavUser'
import '../../style/client/passport.css'
import axiosInstance from '../../config/axiosConfig'

const DEFAULT_REQUIREMENTS = [
    'Valid passport (at least 6 months validity)',
    'Completed visa application form',
    'Recent passport-size photo',
    'Proof of travel itinerary',
    'Financial documents or bank statements'
]

const DEFAULT_STEPS = [
    'Choose a visa service and submit your request.',
    'Prepare all documents based on the service requirements.',
    'Attend biometrics or interview schedule if required.',
    'Wait for processing updates from the embassy.'
]

export default function ApplyVisa() {
    const [loginModalVisible, setLoginModalVisible] = useState(false)
    const [services, setServices] = useState([])
    const [selectedServiceId, setSelectedServiceId] = useState(undefined)
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [preferredDate, setPreferredDate] = useState('')
    const [purpose, setPurpose] = useState('')

    const { auth } = useAuth()
    const location = useLocation()

    const [error, setError] = useState({
        selectedServiceId: '',
        preferredDate: '',
        purpose: ''
    })

    useEffect(() => {
        const loadServices = async () => {
            try {
                const response = await axiosInstance.get('/services/services')
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

    const requirements = selectedService?.visaRequirements?.length
        ? selectedService.visaRequirements
        : DEFAULT_REQUIREMENTS

    const steps = selectedService?.visaProcessSteps?.length
        ? selectedService.visaProcessSteps
        : DEFAULT_STEPS

    const submitRequest = async () => {
        const newErrors = {
            selectedServiceId: '',
            preferredDate: '',
            purpose: '',
        }

        if (!selectedServiceId) {
            newErrors.selectedServiceId = 'Please select a visa service'
        }

        if (!preferredDate) {
            newErrors.preferredDate = 'Please select a preferred submission date'
        }

        if (!purpose.trim()) {
            newErrors.purpose = 'Please provide your purpose of travel'
        }

        setError(newErrors)

        if (newErrors.selectedServiceId || newErrors.preferredDate || newErrors.purpose) {
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
                purposeOfTravel: purpose,
                applicationType: 'Visa'
            })
            console.log('Submitting visa application request')
        } catch (submitError) {
            console.error('Error submitting visa application request:', submitError)
        }
    }

    const disableDates = (current) => {
        return (current && current < dayjs().startOf('day')) || current.day() === 0 || current.day() === 6
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
                                    <li key={`req-${index}`}>{item}</li>
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
                                            <p>{step}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="renew-passport-card">
                        <h3>Application Details</h3>
                        <div className="passport-form">

                            <label className="passport-label">Preferred submission date</label>
                            <DatePicker
                                disabledDate={disableDates}
                                onChange={(date) => setPreferredDate(date ? date.format('YYYY-MM-DD') : '')}
                                className="passport-input"
                            />
                            {error.preferredDate && (
                                <div className="error-message">{error.preferredDate}</div>
                            )}

                            <label className="passport-label">Purpose of travel</label>
                            <Input.TextArea
                                className="passport-input"
                                rows={3}
                                placeholder="Share your purpose of travel"
                                value={purpose}
                                onChange={(event) => setPurpose(event.target.value)}
                            />
                            {error.purpose && <div className="error-message">{error.purpose}</div>}

                            <Button className="passport-submit" type="primary" onClick={submitRequest}>
                                Submit request
                            </Button>
                        </div>
                    </section>
                </div>
            </div>
        </ConfigProvider>
    )
}
