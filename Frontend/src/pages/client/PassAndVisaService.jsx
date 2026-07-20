import React, { useEffect, useMemo, useState } from 'react'
import { Button, Input, ConfigProvider, Empty, Card } from 'antd'
import { FacebookFilled, InstagramFilled, SearchOutlined, FileTextOutlined } from '@ant-design/icons'
import '../../style/client/passandvisaservice.css'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../../config/fetchConfig'
import { useAuth } from '../../hooks/useAuth'
import LoginModal from '../../components/modals/LoginModal'
import SignupModal from '../../components/modals/SignupModal'

export default function PassAndVisaService() {
    const [search, setSearch] = useState('')
    const [visaType] = useState('All')
    const [processing] = useState('All')
    const [services, setServices] = useState([])
    const [loginModalVisible, setLoginModalVisible] = useState(false)
    const [signupModalVisible, setSignupModalVisible] = useState(false)
    const [pendingNavigation, setPendingNavigation] = useState(null)
    const navigate = useNavigate()
    const { auth } = useAuth()


    //handle navigation to protected routes, if user is not logged in, show login modal first
    const handleProtectedNavigation = (path, state = undefined) => {
        if (!auth || !auth?.username) {
            setPendingNavigation({ path, state })
            setLoginModalVisible(true)
            return
        }

        navigate(path, state ? { state } : undefined)
    }


    //fetch visa services from backend
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


    //useMemo hooks to generate unique visa type and processing options for filtering
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
                            <div className="passandvisasection-header">
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
                                        maxLength={30}
                                        allowClear
                                        placeholder="Search visa"
                                        value={search}
                                        onChange={(event) => {
                                            const cleanedValue = event.target.value
                                                .replace(/[^a-zA-Z0-9\s]/g, '')
                                                .replace(/\s{2,}/g, ' ')
                                                .replace(/^\s+/, '');

                                            setSearch(cleanedValue);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="visa-list">
                                {filteredVisas.length === 0 ? (
                                    <Empty description="No visa services found" />
                                ) : (
                                    filteredVisas.map((visa) => {
                                        const visaId =
                                            visa.visaItem ||
                                            visa._id ||
                                            visa.id

                                        const formattedPrice =
                                            Number(visa.visaPrice) > 0
                                                ? `₱${Number(
                                                    visa.visaPrice
                                                ).toLocaleString('en-PH')}`
                                                : 'Contact Us'

                                        const visaTypeLabel =
                                            visa.visaType
                                                ? String(visa.visaType)
                                                : 'Visa Service'

                                        const processingLabel =
                                            visa.processing
                                                ? String(visa.processing)
                                                : ''

                                        const handleApplyVisa = () => {
                                            handleProtectedNavigation(
                                                '/apply-visa',
                                                {
                                                    visaItem: visaId,
                                                    visaName: visa.visaName,
                                                    visaImage: visa.visaImage
                                                }
                                            )
                                        }

                                        return (
                                            <Card
                                                className="passandvisa-reference-card"
                                                key={
                                                    visaId ||
                                                    visa.visaName
                                                }
                                                hoverable
                                                onClick={handleApplyVisa}
                                                cover={
                                                    <div className="passandvisa-reference-cover">
                                                        {visa.visaImage ? (
                                                            <img
                                                                src={visa.visaImage}
                                                                alt={`${visa.visaName} visa`}
                                                                className="passandvisa-reference-image"
                                                                draggable={false}
                                                            />
                                                        ) : (
                                                            <div className="passandvisa-reference-image-placeholder">
                                                                No Image
                                                            </div>
                                                        )}

                                                        {processingLabel && (
                                                            <span className="passandvisa-reference-processing">
                                                                {processingLabel}
                                                            </span>
                                                        )}
                                                    </div>
                                                }
                                            >
                                                <h3 className="passandvisa-reference-title">
                                                    {visa.visaName}
                                                </h3>

                                                <p className="passandvisa-reference-description">
                                                    {visa.visaDescription ||
                                                        'Visa application assistance and document processing service.'}
                                                </p>

                                                <div className="passandvisa-reference-price">
                                                    {formattedPrice}
                                                </div>

                                                <p className="passandvisa-reference-price-label">
                                                    Service fee per applicant
                                                </p>

                                                <div className="passandvisa-reference-details">
                                                    <span>
                                                        {visaTypeLabel}
                                                    </span>

                                                    {processingLabel && (
                                                        <>
                                                            <span className="passandvisa-reference-divider">
                                                                •
                                                            </span>

                                                            <span>
                                                                {processingLabel}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                <Button
                                                    type="primary"
                                                    className="passandvisa-reference-button"
                                                    icon={<FileTextOutlined />}
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        handleApplyVisa()
                                                    }}
                                                >
                                                    APPLY NOW
                                                </Button>
                                            </Card>
                                        )
                                    })
                                )}
                            </div>
                        </section>

                        <section className="passport-section">
                            <div className="passandvisasection-header">
                                <h3>Passport Assistance</h3>
                                <p>Select the passport service you need.</p>
                            </div>
                            <div className="passport-card-grid">
                                <Card
                                    className="passport-service-card"
                                    hoverable
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                        handleProtectedNavigation('/new-passport')
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault()
                                            handleProtectedNavigation('/new-passport')
                                        }
                                    }}
                                >
                                    <div className="passport-service-card-content">
                                        <div className="passport-service-icon-container">
                                            <img
                                                src="/images/plus-circle-svgrepo-com.svg"
                                                alt="New passport"
                                                className="passport-service-icon"
                                                draggable={false}
                                            />
                                        </div>

                                        <div className="passport-service-information">
                                            <span className="passport-service-label">
                                                First-Time Applicant
                                            </span>

                                            <h3>New Passport</h3>

                                            <p>
                                                Apply for a new passport with complete
                                                assistance throughout the application process.
                                            </p>
                                        </div>

                                        <div className="passport-service-footer">
                                            <div className="passport-service-price-container">
                                                <span className="passport-service-price">
                                                    ₱2,000
                                                </span>

                                                <span className="passport-service-price-label">
                                                    Service fee
                                                </span>
                                            </div>

                                            <Button
                                                type="primary"
                                                className="passport-service-button"
                                                icon={<FileTextOutlined />}
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    handleProtectedNavigation('/new-passport')
                                                }}
                                            >
                                                APPLY NOW
                                            </Button>
                                        </div>
                                    </div>
                                </Card>

                                <Card
                                    className="passport-service-card"
                                    hoverable
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                        handleProtectedNavigation('/renew-passport')
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault()
                                            handleProtectedNavigation('/renew-passport')
                                        }
                                    }}
                                >
                                    <div className="passport-service-card-content">
                                        <div className="passport-service-icon-container">
                                            <img
                                                src="/images/refresh-f-svgrepo-com.svg"
                                                alt="Renew passport"
                                                className="passport-service-icon"
                                                draggable={false}
                                            />
                                        </div>

                                        <div className="passport-service-information">
                                            <span className="passport-service-label">
                                                Existing Passport Holder
                                            </span>

                                            <h3>Renew Passport</h3>

                                            <p>
                                                Renew your existing passport with guided
                                                document preparation and application assistance.
                                            </p>
                                        </div>

                                        <div className="passport-service-footer">
                                            <div className="passport-service-price-container">
                                                <span className="passport-service-price">
                                                    ₱2,000
                                                </span>

                                                <span className="passport-service-price-label">
                                                    Service fee
                                                </span>
                                            </div>

                                            <Button
                                                type="primary"
                                                className="passport-service-button"
                                                icon={<FileTextOutlined />}
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    handleProtectedNavigation('/renew-passport')
                                                }}
                                            >
                                                APPLY NOW
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
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
