import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Typography, ConfigProvider, Empty } from 'antd'
import TopNavUser from '../../components/TopNavUser'
import '../../style/client/passandvisaservice.css'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../../config/axiosConfig'

export default function PassAndVisaService() {
    const [search, setSearch] = useState('')
    const [visaType, setVisaType] = useState('All')
    const [processing, setProcessing] = useState('All')
    const [services, setServices] = useState([])
    const { Title, Text } = Typography
    const navigate = useNavigate()

    useEffect(() => {
        const loadServices = async () => {
            try {
                const response = await axiosInstance.get('/services/services')
                setServices(response.data || [])
            } catch (error) {
                console.error('Failed to fetch visa services:', error)
            }
        }

        loadServices()
    }, [])

    const visaTypeOptions = useMemo(() => {
        const types = services.map((service) => service.visaType).filter(Boolean)
        return ['All', ...new Set(types)]
    }, [services])

    const processingOptions = useMemo(() => {
        const types = services.map((service) => service.processing).filter(Boolean)
        return ['All', ...new Set(types)]
    }, [services])

    const filteredVisas = useMemo(() => {
        const query = search.trim().toLowerCase()
        return services.filter((visa) => {
            const matchesSearch =
                query.length === 0 ||
                visa.visaName?.toLowerCase().includes(query) ||
                visa.visaDescription?.toLowerCase().includes(query)

            const matchesType = visaType === 'All' || visa.visaType === visaType
            const matchesProcessing =
                processing === 'All' || visa.processing === processing

            return matchesSearch && matchesType && matchesProcessing
        })
    }, [search, visaType, processing, services])

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div>
                <TopNavUser />

                <div className="passandvisa-hero-section">
                    <div className="passandvisa-hero-overlay"></div>
                    <div className="passandvisa-hero-content">
                        <h1>Need some Assistance?</h1>
                        <p>M&RC Travel and Tours is here to guide you in getting your passport or visa for your upcoming trip!</p>
                    </div>
                </div>

                <div className="passport-assistance">
                    <header className='passandvisa-header'>
                        <Title level={2}>Passport and VISA Services</Title>
                        <Text type="secondary">Search and filter VISAs or apply for Passport services.</Text>
                    </header>
                    <div className="passport-visa-layout">
                        <section className="visa-section">
                            <div className="section-header">
                                <h3>Visa Services</h3>
                                <p>Search and filter the visa type you need to apply.</p>
                            </div>

                            <div className="visa-controls">
                                <div className="visa-search">
                                    <span className="field-label">Search</span>
                                    <Input
                                        allowClear
                                        placeholder="Search visa type"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="visa-list">
                                {filteredVisas.length === 0 ? (
                                    <Empty description="No visa services found" />
                                ) : (
                                    filteredVisas.map((visa) => (
                                        <div className="visa-card" key={visa._id}>
                                            <div>
                                                <h4>{visa.visaName}</h4>
                                                <p>{visa.visaDescription}</p>
                                                {visa.visaPrice && (
                                                    <p className="visa-price">{`₱ ${visa.visaPrice}`}</p>
                                                )}
                                            </div>
                                            <div className="visa-actions">
                                                <Button
                                                    type="primary"
                                                    className="visa-apply-btn"
                                                    onClick={() => navigate('/apply-visa', {
                                                        state: { serviceId: visa._id }
                                                    })}
                                                >
                                                    Apply
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        <section className="passport-section">
                            <div className="section-header">
                                <h3>Passport Assistance</h3>
                                <p>Select the passport service you need.</p>
                            </div>
                            <div className="passport-card-grid">
                                <div
                                    className="passport-card"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => navigate('/new-passport')}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            navigate('/new-passport')
                                        }
                                    }}
                                >
                                    <h3>New Passport</h3>
                                    <p>Apply for a passport for first-time applicants.</p>
                                </div>
                                <div
                                    className="passport-card"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => navigate('/renew-passport')}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            navigate('/renew-passport')
                                        }
                                    }}
                                >
                                    <h3>Renew Passport</h3>
                                    <p>Renew your existing passport quickly.</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    )
}
