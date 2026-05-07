import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, Typography, ConfigProvider, Empty } from 'antd'
import { FacebookFilled, InstagramFilled, SearchOutlined } from '@ant-design/icons'
import '../../style/client/passandvisaservice.css'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../../config/fetchConfig'
import { useAuth } from '../../hooks/useAuth'
import LoginModal from '../../components/modals/LoginModal'
import SignupModal from '../../components/modals/SignupModal'

export default function PassAndVisaService() {
    const [search, setSearch] = useState('')
    const [visaType, setVisaType] = useState('All')
    const [processing, setProcessing] = useState('All')
    const [services, setServices] = useState([])
    const [loginModalVisible, setLoginModalVisible] = useState(false)
    const [signupModalVisible, setSignupModalVisible] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState(null)
    const { Title, Text } = Typography
    const navigate = useNavigate()
    const { auth } = useAuth()

    const handleProtectedNavigation = (path, state = undefined) => {
        if (!auth || !auth?.username) {
            setPendingNavigation({ path, state })
            setLoginModalVisible(true)
            return
        }

        navigate(path, state ? { state } : undefined)
    }

    useEffect(() => {
        const loadServices = async () => {
            try {
                const response = await apiFetch.get('/services/services')
                setServices(response || [])
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
            <LoginModal
                isOpenLogin={loginModalVisible}
                isCloseLogin={() => setLoginModalVisible(false)}
                onOpenSignup={() => {
                    setLoginModalVisible(false)
                    setSignupModalVisible(true)
                }}
                onLoginSuccess={() => {
                    setLoginModalVisible(false)
                    if (pendingNavigation?.path) {
                        navigate(
                            pendingNavigation.path,
                            pendingNavigation.state ? { state: pendingNavigation.state } : undefined
                        )
                        setPendingNavigation(null)
                    }
                }}
            />

            <SignupModal
                isOpenSignup={signupModalVisible}
                isCloseSignup={() => setSignupModalVisible(false)}
                onOpenLogin={() => {
                    setSignupModalVisible(false)
                    setLoginModalVisible(true)
                }}
            />

            <div className='passandvisa-container'>
                <div className="passandvisa-hero-section">
                    <div className="passandvisa-hero-overlay"></div>
                    <div className="passandvisa-hero-content">
                        <h1>Need some Assistance?</h1>
                        <p>M&RC Travel and Tours is here to guide you in getting your passport or visa for your upcoming trip!</p>
                    </div>
                </div>

                <div className="passport-assistance">
                    <header className='passandvisa-header'>
                        <h2>Passport and VISA Services</h2>
                        <p>Search and filter VISAs or apply for Passport services.</p>
                    </header>
                    <div className="passport-visa-layout">
                        <section className="visa-section">
                            <div className="section-header">
                                <h3>Visa Services</h3>
                                <p>Search and filter the visa you need to apply.</p>
                            </div>

                            <div className="visa-controls">
                                <div className="visa-search">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <SearchOutlined className='field-label-icon' />
                                        <span className="field-label">Search</span>
                                    </div>
                                    <Input
                                        allowClear
                                        placeholder="Search visa"
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
                                        <div className="visa-card" key={visa.visaItem}>
                                            <div>
                                                <h3>{visa.visaName}</h3>
                                                <p>{visa.visaDescription}</p>
                                                {visa.visaPrice && (
                                                    <p className="visa-price">{`₱ ${visa.visaPrice}`}</p>
                                                )}
                                            </div>
                                            <div className="visa-actions">
                                                <Button
                                                    className="visa-apply-btn"
                                                    type='primary'
                                                    onClick={() => handleProtectedNavigation('/apply-visa', { visaName: visa.visaName })}
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
                                    onClick={() => handleProtectedNavigation('/new-passport')}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            handleProtectedNavigation('/new-passport')
                                        }
                                    }}
                                >
                                    <h3>New Passport</h3>
                                    <p>Apply for a passport for first-time applicants.</p>
                                    <p className="passport-price">₱ 2000</p>
                                </div>
                                <div
                                    className="passport-card"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleProtectedNavigation('/renew-passport')}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            handleProtectedNavigation('/renew-passport')
                                        }
                                    }}
                                >
                                    <h3>Renew Passport</h3>
                                    <p>Renew your existing passport quickly.</p>
                                    <p className="passport-price">₱ 2000</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <div style={{ paddingTop: '10px', marginTop: '20px' }}>
                    <div className='landingpage-footer'>
                        <div className='footer-section'>

                            <div className='footer-section-top'>
                                <div className='footer-section-logo'>
                                    <h2 className='footer-header'>M&RC Travel and Tours</h2>
                                    <p className='footer-text'>Discover affordable vacation travel and tours. Book your dream activities and start exploring the world!</p>

                                </div>

                                <div className='footer-section-address'>
                                    <h2 className='footer-header'>Our Address</h2>
                                    <p className='footer-text'>2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1 , Brgy. San Antonio, Parañaque, Philippines, 1715</p>
                                </div>

                                <div className='footer-section-hours'>
                                    <h2 className='footer-header'>Our Hours</h2>
                                    <p className='footer-text'>Monday - Saturday: 9:00 AM - 6:00 PM</p>
                                </div>

                                <div className='footer-section-socials'>
                                    <h2 className='footer-header'>Our Socials</h2>
                                    <div className='footer-section-socials-icons'>
                                        <FacebookFilled className='socials-icon' onClick={() => window.open('https://www.facebook.com/mrctravelandtour', '_blank')} />
                                        <p className='footer-text-link' onClick={() => window.open('https://www.facebook.com/mrctravelandtour', '_blank')}>M&RC Travel and Tours</p>
                                    </div>

                                    <div className='footer-section-socials-icons'>
                                        <InstagramFilled className='socials-icon' onClick={() => window.open('https://www.instagram.com/mrc_travelandtours?fbclid=IwY2xjawQVIU5leHRuA2FlbQIxMABicmlkETE1M0YwaFZ6SW1EQ0xTZnNrc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHgrnAZz5frwKYlnHCi-Txow7AV3kwbYXwWp0W7XV-_BZcoANgGr7hUQA3Eq6_aem_VyUBdOcsD0LsgGhYaEtNog', '_blank')} />
                                        <p className='footer-text-link' onClick={() => window.open('https://www.instagram.com/mrc_travelandtours?fbclid=IwY2xjawQVIU5leHRuA2FlbQIxMABicmlkETE1M0YwaFZ6SW1EQ0xTZnNrc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHgrnAZz5frwKYlnHCi-Txow7AV3kwbYXwWp0W7XV-_BZcoANgGr7hUQA3Eq6_aem_VyUBdOcsD0LsgGhYaEtNog', '_blank')}>@mrc_travel_tours</p>
                                    </div>


                                </div>
                            </div>

                            <hr className='footer-divider' />
                            <p className='footer-bottom-text'>© 2026 M&RC Travel and Tours. All rights reserved.</p>
                        </div>
                    </div>
                </div>

            </div>
        </ConfigProvider>
    )
}
