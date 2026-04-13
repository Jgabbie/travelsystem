import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Input, Modal, Select, Slider, Image, ConfigProvider, InputNumber, message } from 'antd';
import { SearchOutlined, FacebookFilled, InstagramFilled } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../../components/modals/LoginModal';
import apiFetch from '../../config/fetchConfig';
import '../../style/client/landingpage.css'

export default function LandingPage() {
    const navigate = useNavigate()

    const packagesRef = useRef(null)
    const exploreRef = useRef(null)
    const aboutusRef = useRef(null)

    const [budgetRange, setBudgetRange] = useState([12000, 30000]);
    const [activity, setActivity] = useState([]);
    const [type, setType] = useState('Tour Type');
    const [duration, setDuration] = useState('Length of Stay');
    const [pax, setPax] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoginVisible, setIsLoginVisible] = useState(false)
    const [isChatbotOpen, setIsChatbotOpen] = useState(false)
    const [chatMessage, setChatMessage] = useState('')

    const [openModalSuccess, setOpenModalSuccess] = useState(false)
    const [openModalError, setOpenModalError] = useState(false)
    const [fallbackPopularPackages, setFallbackPopularPackages] = useState([])

    const [popularPackages, setPopularPackages] = useState([])
    const [domesticPackages, setDomesticPackages] = useState([])
    const [activityTags, setActivityTags] = useState([])
    const [isPopularLoading, setIsPopularLoading] = useState(false)
    const [isDomesticLoading, setIsDomesticLoading] = useState(false)
    const handleActivityChange = (values) => {
        if (values.length > 3) {
            message.warning('Select up to 3 tags only.');
            return;
        }
        setActivity(values);
    };

    const [contactValues, setContactValues] = useState({
        name: '',
        email: '',
        message: '',
    })

    //SEARCH BAR -------------------------------------------------------------
    const handleSearch = () => {
        const params = new URLSearchParams();
        const trimmed = searchTerm.trim();

        if (trimmed) {
            params.set('q', trimmed);
        }

        if (Array.isArray(activity) && activity.length) {
            activity.forEach((tag) => params.append('tag', tag));
        }

        if (duration && duration !== 'Length of Stay') {
            const parsedDays = Number.parseInt(duration, 10);
            if (Number.isFinite(parsedDays)) {
                params.set('maxDays', String(parsedDays));
            }
        }

        if (type && type !== 'Tour Type') {
            params.set('tourType', type);
        }

        if (pax) {
            const parsedTravelers = Number.parseInt(pax, 10);
            if (Number.isFinite(parsedTravelers)) {
                params.set('travelers', String(parsedTravelers));
            }
        }

        params.set('minBudget', String(budgetRange[0]));
        params.set('maxBudget', String(budgetRange[1]));

        const query = params.toString();
        navigate(query ? `/destinations-packages?${query}` : '/destinations-packages');
    }


    // SEND MESSAGE ---------------------------------------------------------------------
    const sendMessage = async () => {
        try {
            await apiFetch.post('/email/contact', contactValues)
            setOpenModalSuccess(true)
            setContactValues({
                name: '',
                email: '',
                message: '',
            })
        } catch (error) {
            setOpenModalError(true)
        }
    }

    //FETCH PACKAGES
    useEffect(() => {
        const fetchPopularPackages = async () => {
            setIsPopularLoading(true)
            try {
                const response = await apiFetch.get('/package/popular-packages', {
                    params: { limit: 3 }
                })

                const packages = (response || []).map((pkg) => ({
                    id: pkg._id,
                    packageName: pkg.packageName,
                    packageDescription: pkg.packageDescription,
                    image: Array.isArray(pkg.images) && pkg.images.length > 0 ? pkg.images[0] : '',
                    bookingCount: pkg.bookingCount || 0
                }))

                const trimmed = packages.slice(0, 3)
                setPopularPackages(trimmed)

                if (trimmed.length === 0) {
                    const fallbackResponse = await apiFetch.get('/package/get-packages')
                    const fallbackPackages = (fallbackResponse || [])
                        .slice(0, 3)
                        .map((pkg) => ({
                            id: pkg._id,
                            packageName: pkg.packageName,
                            packageDescription: pkg.packageDescription,
                            image: Array.isArray(pkg.images) && pkg.images.length > 0 ? pkg.images[0] : ''
                        }))

                    setFallbackPopularPackages(fallbackPackages)
                } else {
                    setFallbackPopularPackages([])
                }
            } catch (error) {
                console.error('Failed to load popular packages:', error)
                setPopularPackages([])
                try {
                    const fallbackResponse = await apiFetch.get('/package/get-packages')
                    const fallbackPackages = (fallbackResponse || [])
                        .slice(0, 3)
                        .map((pkg) => ({
                            id: pkg._id,
                            packageName: pkg.packageName,
                            packageDescription: pkg.packageDescription,
                            image: Array.isArray(pkg.images) && pkg.images.length > 0 ? pkg.images[0] : ''
                        }))

                    setFallbackPopularPackages(fallbackPackages)
                } catch (fallbackError) {
                    console.error('Failed to load fallback packages:', fallbackError)
                    setFallbackPopularPackages([])
                }
            } finally {
                setIsPopularLoading(false)
            }
        }

        fetchPopularPackages()
    }, [])

    //FETCH DOMESTIC PACKAGES -----------------------------------------------
    useEffect(() => {
        const fetchDomesticPackages = async () => {
            setIsDomesticLoading(true)
            try {
                const response = await apiFetch.get('/package/get-packages')
                const packages = (response || [])
                    .filter((pkg) => String(pkg.packageType).toLowerCase() === 'domestic')
                    .map((pkg) => ({
                        id: pkg._id,
                        packageName: pkg.packageName,
                        packageDescription: pkg.packageDescription,
                        image: Array.isArray(pkg.images) && pkg.images.length > 0 ? pkg.images[0] : ''
                    }))

                setDomesticPackages(packages)
            } catch (error) {
                console.error('Failed to load domestic packages:', error)
                setDomesticPackages([])
            } finally {
                setIsDomesticLoading(false)
            }
        }

        fetchDomesticPackages()
    }, [])

    useEffect(() => {
        const fetchActivityTags = async () => {
            try {
                const response = await apiFetch.get('/package/get-packages-for-users')
                const unique = new Set()

                    ; (response || []).forEach((pkg) => {
                        pkg.packageTags?.forEach((tag) => unique.add(tag))
                    })

                setActivityTags(Array.from(unique))
            } catch (error) {
                console.error('Failed to load activity tags:', error)
                setActivityTags([])
            }
        }

        fetchActivityTags()
    }, [])

    const formatDescription = (text, maxLength = 160) => {
        if (!text) return 'No description available.'
        if (text.length <= maxLength) return text
        return `${text.slice(0, maxLength).trim()}...`
    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                    colorInfo: '#305797',
                    colorSuccess: '#4CAF50',
                    colorError: '#F44336',
                    colorWarning: '#FF9800',
                    colorText: '#333',
                    colorBgContainer: '#fff',
                },
            }}
        >
            <div className="landing-container">


                {/* FIRST SECTION */}
                <div className="hero-section">
                    <div className="hero-overlay"></div>
                    <div className="hero-content">
                        <h1>Your Link to the World</h1>
                        <p>Discover affordable vacation travel and tours. Book your dream activities and start exploring the world!</p>
                    </div>

                    <div className="search-widget">

                        <div className="search-row">
                            <input
                                type="text"
                                placeholder="Search here..."
                                className="search-input-land"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearch();
                                    }
                                }}
                            />
                            <Button type='primary' className="search-btn" onClick={handleSearch}>
                                <SearchOutlined />
                            </Button>
                        </div>


                        <div className="filter-row">


                            <div className="filter-group">
                                <label>TAGS</label>
                                <Select
                                    className="landing-select"
                                    mode="multiple"
                                    allowClear
                                    placeholder="Select tags"
                                    value={activity}
                                    onChange={handleActivityChange}
                                    options={activityTags.map((tag) => ({
                                        value: tag,
                                        label: tag
                                    }))}
                                />
                            </div>


                            <div className="filter-group">
                                <label>DURATION</label>
                                <Select
                                    className="landing-select"
                                    value={duration}
                                    onChange={setDuration}
                                    options={[
                                        { value: 'Length of Stay', label: 'Length of Stay' },
                                        { value: '2 Days', label: '2 Days' },
                                        { value: '3 Days', label: '3 Days' },
                                        { value: '4 Days', label: '4 Days' },
                                        { value: '5 Days', label: '5 Days' },
                                        { value: '6 Days', label: '6 Days' },
                                        { value: '7 Days', label: '7 Days' },
                                    ]}
                                />
                            </div>

                            <div className="filter-group">
                                <label>TOUR TYPE</label>
                                <Select
                                    className="landing-select"
                                    value={type}
                                    onChange={setType}
                                    options={[
                                        { value: 'Tour Type', label: 'Tour Type' },
                                        { value: 'Domestic', label: 'Domestic' },
                                        { value: 'International', label: 'International' },
                                    ]}
                                />
                            </div>

                            <div className="filter-group">
                                <label>TRAVELERS</label>
                                <InputNumber
                                    className="landing-filter-input"
                                    maxLength={2}
                                    value={pax}
                                    placeholder="Travelers"
                                    min={1}
                                    max={50}
                                    onChange={(val) => {
                                        setPax(val);
                                    }}
                                    onKeyDown={(e) => {
                                        const allowedKeys = [
                                            'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight',
                                            'Tab', 'Enter', 'Escape'
                                        ];

                                        if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </div>

                            <div className="filter-group" style={{ minWidth: '200px' }}>
                                <label>BUDGET</label>
                                <div className="budget-labels">
                                    <span>₱{budgetRange[0].toLocaleString()}</span>
                                    <span>₱{budgetRange[1].toLocaleString()}</span>
                                </div>
                                <Slider
                                    range
                                    min={0}
                                    max={100000}
                                    step={1000}
                                    value={budgetRange}
                                    onChange={setBudgetRange}
                                    className="budget-slider"
                                    tooltip={{ formatter: (value) => `₱${value}` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className='page-link-buttons-container'>
                    <Button className='page-link-buttons' type='link' onClick={() => packagesRef.current?.scrollIntoView({ behavior: 'smooth' })} >Popular Packages</Button>
                    <Button className='page-link-buttons' type='link' onClick={() => exploreRef.current?.scrollIntoView({ behavior: 'smooth' })} >Explore Now!</Button>
                    <Button className='page-link-buttons' type='link' onClick={() => aboutusRef.current?.scrollIntoView({ behavior: 'smooth' })} >About Us</Button>
                </div>


                {/* SECOND SECTION */}
                <div ref={packagesRef} style={{ paddingTop: '50px', marginTop: '30px' }}>
                    <div className="hero-section-packages">
                        <div className="hero-overlay-packages"></div>
                        <div className="hero-content-packages">
                            <h1>Book Your Tours Now</h1>
                            <p>
                                Ready for your next adventure?  Book your international tour with M&RC Travel today and explore the world with ease and comfort. From stunning destinations to well-planned itineraries, we handle all the details so you can focus on making unforgettable memories. Don’t wait—your dream journey starts now!
                            </p>
                            <Button className='packages-button' onClick={() => { navigate('/destinations-packages') }}>BROWSE TOUR PACKAGES</Button>
                        </div>
                    </div>

                    <div className='popular-packages-section'>
                        <h1 className='popular-packages-text'>Popular Packages</h1>

                        <div className='popular-packages'>
                            {isPopularLoading ? (
                                <p>Loading popular packages...</p>
                            ) : popularPackages.length === 0 && fallbackPopularPackages.length === 0 ? (
                                <p>No popular packages available yet.</p>
                            ) : (
                                (popularPackages.length > 0 ? popularPackages : fallbackPopularPackages).map((pkg) => (
                                    <Card
                                        className='package-card'
                                        key={pkg.id}
                                        hoverable
                                        onClick={() => navigate(`/package/${pkg.id}`)}
                                        cover={
                                            pkg.image ? (
                                                <img
                                                    style={{ height: 250 }}
                                                    draggable={false}
                                                    alt={pkg.packageName}
                                                    src={pkg.image}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        height: 250,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: '#f5f5f5',
                                                        color: '#777'
                                                    }}
                                                >
                                                    No Image
                                                </div>
                                            )
                                        }
                                    >
                                        <h2>{pkg.packageName}</h2>
                                        <p>{formatDescription(pkg.packageDescription)}</p>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>


                {/* THIRD SECTION */}
                <div ref={exploreRef} style={{ marginTop: '50px', paddingTop: '110px' }}>
                    <div className='explore-container'>
                        <div className='explore-local-packages-section'>
                            <h1 className='explore-text explore-text-center-mobile'>Local Tour Packages</h1>
                            <div className='explore-local-packages'>
                                {isDomesticLoading ? (
                                    <p>Loading domestic packages...</p>
                                ) : domesticPackages.length === 0 ? (
                                    <p>No domestic packages available yet.</p>
                                ) : (
                                    domesticPackages.map((pkg) => (
                                        <Card
                                            key={pkg.id}
                                            hoverable
                                            style={{ width: 300 }}
                                            onClick={() => navigate(`/package/${pkg.id}`)}
                                            cover={
                                                pkg.image ? (
                                                    <img
                                                        style={{ height: 200 }}
                                                        draggable={false}
                                                        alt={pkg.packageName}
                                                        src={pkg.image}
                                                    />
                                                ) : (
                                                    <div
                                                        style={{
                                                            height: 200,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            background: '#f5f5f5',
                                                            color: '#777'
                                                        }}
                                                    >
                                                        No Image
                                                    </div>
                                                )
                                            }
                                        >
                                            <h2>{pkg.packageName}</h2>
                                            <p>{formatDescription(pkg.packageDescription)}</p>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ABOUTUS SECTION */}
                <div ref={aboutusRef} style={{ paddingTop: '100px', marginTop: '50px' }}>

                    <div className="hero-section-aboutus">
                        <div className="hero-overlay-aboutus"></div>
                        <div className="hero-content-aboutus">
                            <h1>M&RC Travel and Tours</h1>
                            <p>
                                Ready for your next adventure?  Book your international tour with M&RC Travel today and explore the world with ease and comfort. From stunning destinations to well-planned itineraries, we handle all the details so you can focus on making unforgettable memories. Don’t wait—your dream journey starts now!
                            </p>
                        </div>
                    </div>


                    <div className='aboutus-row'>
                        <div className='aboutus-text-col'>
                            <div className='aboutus-text-wrap'>
                                <h1 className='explore-text'>About Us</h1>

                                <p className='aboutus-text'>
                                    M&RC Travel and Tours humbly started travel business in July 2018 when two vibrant entrepreneur, traveler,
                                    Maricar Carle and Rhon Carle decided to turn their passion into business. Office is located at #1 Cor Fatima Street
                                    San antonio Avenue Valley 1, Brgy. San Antonio Paranaque City with over thousand of agents worldwide and travel partners.
                                </p>

                                <p className='aboutus-text'>
                                    We commit to adapt the changing needs of business sectors and become a major player through satisfying specialized requirements of the small, medium and large organizations.
                                </p>

                                <p className='aboutus-text'>
                                    We value honesty and integrity.
                                    M&RC Travel and Tours continuously develop other line of services with the primary objective of extending wide range of quality and excellent service.
                                </p>
                            </div>

                        </div>

                        <div className='aboutus-image-col'>
                            <img
                                className='aboutus-image'
                                draggable={false}
                                alt="example"
                                src="/images/Homepage1.png"
                            />
                        </div>

                    </div>

                    <div className='aboutus-row'>

                        <div className='aboutus-image-col aboutus-image-col-left'>
                            <img
                                className='aboutus-image aboutus-image-offset'
                                draggable={false}
                                alt="example"
                                src="/images/Homepage2.png"
                            />
                        </div>

                        <div className='aboutus-vision-mission'>
                            <h2 className='explore-text'>Our Vision</h2>
                            <p className='aboutus-text'>
                                Our Vision is to be the preferred travel
                                and tours agency in the country offering
                                specialized, high quality and cost-
                                efficient travel solutions at all times,
                                anywhere, everywhere.
                            </p>

                            <h2 className='explore-text'>Our Mission</h2>
                            <p className='aboutus-text'>
                                We are committed to provide value-added travel
                                solutions to our Customers by offering good service
                                and meaningful experience through the help of our
                                reliable and service- oriented travel partners.
                                We aim to grow and profit with the knowledge that

                                each customer we served is fully satisfied.

                                We adhere to the notion of reliability, competence,

                                competitiveness and integrity.

                                We are committed to be updated with the latest
                                technology to keep up with the demands of the global

                                market.

                                We care for the well-being of our employees, our

                                community and our environment.
                            </p>

                        </div>
                    </div>


                    <div className='aboutus-accreditation'>
                        <h2 className='explore-text'>Accreditations</h2>

                        <div style={{ display: 'flex', gap: '70px', flexDirection: 'row' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                                <img
                                    style={{ width: 200, height: 200 }}
                                    draggable={false}
                                    alt="example"
                                    src="/images/philgeps.png"
                                />

                                <p style={{ textAlign: "center", width: 600 }} className='aboutus-text'>
                                    M&RC Travel and Tours is accredited by the Philippine Government Electronic Procurement System (PhilGEPS), ensuring that we meet the highest standards of quality, reliability, and professionalism in providing travel services. Our accreditation reflects our commitment to excellence and our dedication to delivering exceptional travel experiences to our customers.
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                                <img
                                    style={{ width: 200, height: 200 }}
                                    draggable={false}
                                    alt="example"
                                    src="/images/dotseal.png"
                                />

                                <p style={{ textAlign: "center", width: 600 }} className='aboutus-text'>
                                    M&RC Travel and Tours is accredited by the Department of Tourism (DOT) of the Philippines, ensuring that we meet the highest standards of quality, safety, and customer service in the travel industry. Our accreditation reflects our commitment to providing exceptional travel experiences and our dedication to upholding the integrity and professionalism of our services.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>


                <div style={{ paddingTop: '25px', marginTop: '50px' }}>
                    <div className='contactus-container'>
                        <div className='contactus-section'>
                            <div className='contactus-section-left'>
                                <h1 className='explore-text'>Contact Us</h1>
                                <p className='contactus-text'>
                                    Have questions or need assistance? Our friendly customer support team is here to help you with all your travel needs. Whether you’re looking for more information about our tour packages, need help with booking, or want to customize your itinerary, we’re just a message away. Contact us today and let us make your travel dreams a reality!
                                </p>
                            </div>

                            <div className='contactus-section-right'>
                                <div className='contactus-section-right-card'>
                                    <label className='contact-label'>Send us a message:</label>
                                    <Input
                                        placeholder="Your Name"
                                        className='contact-input'
                                        value={contactValues.name}
                                        onChange={(e) => setContactValues(prev => ({ ...prev, name: e.target.value }))}
                                        onKeyDown={(e) => {
                                            const value = e.target.value
                                            if (e.key === " " && value.length === 0) {
                                                e.preventDefault()
                                                return
                                            }

                                            if (e.key === " " && value.endsWith(" ")) {
                                                e.preventDefault()
                                                return
                                            }

                                            if (!/^[a-zA-Z\s]*$/.test(e.key) &&
                                                e.key !== "Backspace" &&
                                                e.key !== "ArrowLeft" &&
                                                e.key !== "ArrowRight") {
                                                e.preventDefault()
                                            }
                                        }}
                                    />
                                    <Input
                                        placeholder="Your Email"
                                        className='contact-input'
                                        value={contactValues.email}
                                        onChange={(e) => setContactValues(prev => ({ ...prev, email: e.target.value }))}
                                        onKeyDown={(e) => {
                                            if (e.key === " ") {
                                                e.preventDefault()
                                            }
                                        }}
                                    />
                                    <Input.TextArea
                                        placeholder="Your Message"
                                        className='contact-textarea'
                                        rows={4}
                                        value={contactValues.message}
                                        onChange={(e) => setContactValues(prev => ({ ...prev, message: e.target.value }))}
                                        onKeyDown={(e) => {
                                            const value = e.target.value

                                            if (e.key === " " && value.length === 0) {
                                                e.preventDefault()
                                            }
                                        }}
                                    />
                                    <Button
                                        type="primary"
                                        className={`contact-submit-button${(!contactValues.name.trim() || !contactValues.email.trim() || !contactValues.message.trim()) ? ' contact-submit-button-disabled' : ''}`}
                                        disabled={
                                            !contactValues.name.trim() ||
                                            !contactValues.email.trim() ||
                                            !contactValues.message.trim()
                                        }
                                        onClick={sendMessage}
                                        style={(!contactValues.name.trim() || !contactValues.email.trim() || !contactValues.message.trim()) ? { pointerEvents: 'none' } : {}}
                                    >
                                        Submit
                                    </Button>
                                </div>
                            </div>

                        </div>
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
                                        <p className='footer-text'>M&RC Travel and Tours</p>
                                    </div>

                                    <div className='footer-section-socials-icons'>
                                        <InstagramFilled className='socials-icon' onClick={() => window.open('https://www.instagram.com/mrc_travelandtours?fbclid=IwY2xjawQVIU5leHRuA2FlbQIxMABicmlkETE1M0YwaFZ6SW1EQ0xTZnNrc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHgrnAZz5frwKYlnHCi-Txow7AV3kwbYXwWp0W7XV-_BZcoANgGr7hUQA3Eq6_aem_VyUBdOcsD0LsgGhYaEtNog', '_blank')} />
                                        <p className='footer-text'>@mrc_travel_tours</p>
                                    </div>


                                </div>
                            </div>

                            <hr className='footer-divider' />
                            <p className='footer-bottom-text'>© 2026 M&RC Travel and Tours. All rights reserved.</p>
                        </div>
                    </div>
                </div>

                <LoginModal
                    isOpenLogin={isLoginVisible}
                    isCloseLogin={() => setIsLoginVisible(false)}
                    onLoginSuccess={() => navigate('/destinations-packages')}
                />

                <Button className="chatbot-fab" type="primary" onClick={() => setIsChatbotOpen(true)}>
                    <Image preview={false} style={{ width: 20, height: 20 }} src="/images/chatbotlogo.png" />
                </Button>

                <Modal
                    open={isChatbotOpen}
                    onCancel={() => setIsChatbotOpen(false)}
                    footer={null}
                    title="Chatbot"
                    wrapClassName="chatbot-modal"
                >
                    <div className="chatbot-body">
                        <div className="chatbot-message">
                            Hi! How can I help you today?
                        </div>
                        <Input.TextArea
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            placeholder="Type your message..."
                            rows={3}
                        />
                        <div className="chatbot-actions">
                            <Button
                                type="primary"
                                disabled={!chatMessage.trim()}
                            >
                                Send
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>

            {/* success modal */}
            <Modal
                open={openModalSuccess}
                className='emailverify-success-modal'
                footer={null}
                closable={false}
                style={{ top: 230 }}
            >
                <div className='emailverify-container-modal'>
                    <h1 className='emailverify-heading-modal'>Your message has been sent</h1>
                    <p className='emailverify-secondary-heading-modal'>Kindly check your email for responses.</p>
                    <Button
                        id='emailverify-success-button'
                        onClick={() => {
                            setOpenModalSuccess(false)
                            navigate('/home')
                        }}
                    >
                        Continue
                    </Button>
                </div>
            </Modal>

            {/* fail modal */}
            <Modal
                open={openModalError}
                className='emailverify-fail-modal'
                footer={null}
                closable={false}
                style={{ top: 230 }}
            >
                <div className='emailverify-container-modal'>
                    <h1 className='emailverify-heading-modal'>Failed to Send Message</h1>
                    <p className='emailverify-secondary-heading-modal'>There was an error sending your message. Please try again later.</p>
                    <Button
                        id='emailverify-success-button'
                        onClick={() => {
                            setOpenModalError(false)
                            navigate('/home')
                        }}
                    >
                        Continue
                    </Button>
                </div>
            </Modal>

        </ConfigProvider>
    );
}