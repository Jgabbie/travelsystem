import React, { useState, useRef } from 'react';
import { Button, Card, Input, Modal, Select, Slider, Image, ConfigProvider, InputNumber } from 'antd';
import { SearchOutlined, FacebookFilled, InstagramFilled } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import TopNavUser from '../../components/TopNavUser';
import LoginModal from '../../components/modals/LoginModal';
import '../../style/client/landingpage.css'
import axiosInstance from '../../config/axiosConfig';


export default function LandingPage() {
    const navigate = useNavigate()
    const { auth } = useAuth()

    const packagesRef = useRef(null)
    const exploreRef = useRef(null)
    const aboutusRef = useRef(null)

    const [budgetRange, setBudgetRange] = useState([12000, 30000]);
    const [activity, setActivity] = useState('Adventure Type');
    const [type, setType] = useState('Tour Type');
    const [duration, setDuration] = useState('Length of Stay');
    const [pax, setPax] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoginVisible, setIsLoginVisible] = useState(false)
    const [isChatbotOpen, setIsChatbotOpen] = useState(false)
    const [chatMessage, setChatMessage] = useState('')

    const [openModalSuccess, setOpenModalSuccess] = useState(false)
    const [openModalError, setOpenModalError] = useState(false)


    const [contactValues, setContactValues] = useState({
        name: '',
        email: '',
        message: '',
    })

    const handleBrowsePackages = () => {
        if (auth) {
            navigate('/destinations-packages')
            return
        }
        setIsLoginVisible(true)
    }

    const handleSearch = () => {
        const params = new URLSearchParams();
        const trimmed = searchTerm.trim();

        if (trimmed) {
            params.set('q', trimmed);
        }

        if (activity && activity !== 'Adventure Type') {
            params.set('activity', activity);
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

    const sendMessage = async () => {
        try {
            await axiosInstance.post('/email/contact', contactValues)
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
                <TopNavUser />

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
                            <button className="search-btn" onClick={handleSearch}>
                                <SearchOutlined />
                            </button>
                        </div>


                        <div className="filter-row">


                            <div className="filter-group">
                                <label>ACTIVITIES</label>
                                <Select
                                    className="landing-select"
                                    value={activity}
                                    onChange={setActivity}
                                    options={[
                                        { value: 'Adventure Type', label: 'Adventure Type' },
                                        { value: 'Beach', label: 'Beach' },
                                        { value: 'Hiking', label: 'Hiking' },
                                        { value: 'City Tour', label: 'City Tour' },
                                    ]}
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

                <div ref={packagesRef} style={{ paddingTop: '50px', marginTop: '30px' }}>
                    <div className="hero-section-packages">
                        <div className="hero-overlay-packages"></div>
                        <div className="hero-content-packages">
                            <h1>Book Your Tours Now</h1>
                            <p>
                                Ready for your next adventure?  Book your international tour with M&RC Travel today and explore the world with ease and comfort. From stunning destinations to well-planned itineraries, we handle all the details so you can focus on making unforgettable memories. Don’t wait—your dream journey starts now!
                            </p>
                            <Button className='packages-button' onClick={handleBrowsePackages}>BROWSE TOUR PACKAGES</Button>
                        </div>
                    </div>

                    <h1 className='popular-packages-text'>Popular Packages</h1>

                    {/* if data for popular packages is available, just map it */}
                    <div className='popular-packages'>

                        <Card
                            hoverable
                            style={{ width: 350 }}
                            cover={
                                <img style={{ height: 250 }}
                                    draggable={false}
                                    alt="example"
                                    src="https://www.nagoya-info.jp/assets/otherlan/img/nagoya/main_sp.jpg"
                                    className="footer-logo-img"
                                />
                            }
                        >
                            <h2>
                                Nagoya Tour Package
                            </h2>
                            <p>
                                Explore the perfect balance of tradition and modern life in Nagoya, Japan’s vibrant industrial and cultural hub. This tour takes you through historic landmarks, modern cityscapes, and authentic local experiences that reveal a side of Japan often missed by first-time visitors.
                            </p>
                        </Card>

                        <Card
                            hoverable
                            style={{ width: 350 }}
                            cover={
                                <img style={{ height: 250 }}
                                    draggable={false}
                                    alt="example"
                                    src="https://static.toiimg.com/photo/111258550.cms"
                                />
                            }
                        >
                            <h2>
                                Seoul Tour Package
                            </h2>
                            <p>
                                Experience the dynamic heart of Seoul, where ancient palaces stand beside futuristic skylines and vibrant street culture. This tour takes you through South Korea’s rich history, cutting-edge trends, and world-famous cuisine—all in one unforgettable journey.
                            </p>
                        </Card>

                        <Card
                            hoverable
                            style={{ width: 350 }}
                            cover={
                                <img style={{ height: 250 }}
                                    draggable={false}
                                    alt="example"
                                    src="https://media.istockphoto.com/id/533554773/photo/white-beach-boracay-philippines.jpg?s=612x612&w=0&k=20&c=BVCgea8yLM6WBJrCgbntaRGFHU_hCotyg4QWMZ_32ps="
                                />
                            }
                        >
                            <h2>
                                Boracay Tour Package
                            </h2>
                            <p>
                                Escape to the world-famous island of Boracay, known for its powdery white sand, crystal-clear waters, and breathtaking sunsets. This tropical paradise offers the perfect mix of relaxation, adventure, and vibrant island life.
                            </p>
                        </Card>

                        <Card
                            hoverable
                            style={{ width: 350 }}
                            cover={
                                <img style={{ height: 250 }}
                                    draggable={false}
                                    alt="example"
                                    src="https://www.elnidoparadise.com/wp-content/uploads/entalula-beach-el-nido-palawan-2.jpg"
                                />
                            }
                        >
                            <h2>
                                El Nido Tour Package
                            </h2>
                            <p>
                                Discover the breathtaking beauty of El Nido, Palawan—famous for its dramatic limestone cliffs, hidden lagoons, and crystal-clear turquoise waters. This tour offers a perfect tropical escape surrounded by some of the most stunning seascapes in the Philippines.
                            </p>
                        </Card>

                    </div>
                </div>

                <div ref={exploreRef} style={{ paddingTop: '100px', marginTop: '50px' }}>
                    <div className='explore-container'>
                        <div className='explore-local-packages-section'>
                            <h1 className='explore-text'>Local Tour Packages</h1>
                            <div className='explore-local-packages'>
                                <Card
                                    hoverable
                                    style={{ width: 300 }}
                                    cover={
                                        <img style={{ height: 200 }}
                                            draggable={false}
                                            alt="example"
                                            src="https://pinayodyssey.com/wp-content/uploads/2023/12/img_5850.jpg"
                                        />
                                    }
                                >
                                    <h2>
                                        Baguio City Tour Package
                                    </h2>
                                    <p>
                                        Baguio City is the "Summer Capital of the Philippines," perched in the Cordillera Mountains and celebrated for its refreshing pine-scented air and cool highland climate.
                                    </p>
                                </Card>

                                <Card
                                    hoverable
                                    style={{ width: 300 }}
                                    cover={
                                        <img style={{ height: 200 }}
                                            draggable={false}
                                            alt="example"
                                            src="https://www.beyondmydoor.com/wp-content/uploads/2024/03/Kalesa-Ride-Calle-Crisologo%E2%80%8B-Vigan-Philippines-1024x776.webp"
                                        />
                                    }
                                >
                                    <h2>
                                        Vigan City Tour Package
                                    </h2>
                                    <p>
                                        Step back in time and experience the rich history and cultural charm of Vigan City, a UNESCO World Heritage Site.
                                    </p>
                                </Card>

                                <Card
                                    hoverable
                                    style={{ width: 300 }}
                                    cover={
                                        <img style={{ height: 200 }}
                                            draggable={false}
                                            alt="example"
                                            src="https://media.philstar.com/photos/2025/03/29/4_2025-03-29_22-14-19.jpg"
                                        />
                                    }
                                >
                                    <h2>
                                        Batanes Tour Package
                                    </h2>
                                    <p>
                                        Discover the untouched beauty of Batanes, the northernmost paradise of the Philippines, where rolling hills meet endless seas and time seems to slow down.
                                    </p>
                                </Card>

                            </div>

                            <h1 className='explore-text'>Explore the World</h1>
                            <div className='explore-world-section'>
                                <img style={{ height: 250, width: 400, marginLeft: 40, marginBottom: 40 }}
                                    draggable={false}
                                    alt="example"
                                    src="https://www.hertz.com/content/dam/hertz/global/blog-articles/planning-a-trip/kyoto-japan/kyoto-header.jpg"
                                />
                                <div className='explore-world-text'>
                                    <h2 className='explore-world-text-heading'>Kyoto, Japan</h2>
                                    <p className='explore-world-text-description'>
                                        Experience the cultural heart of Japan with our Kyoto tour package, featuring ancient temples, serene gardens, and traditional tea houses. Explore iconic landmarks such as Kiyomizu-dera, Fushimi Inari Shrine, and the Arashiyama Bamboo Grove. Enjoy comfortable accommodations and guided experiences throughout your journey. Perfect for travelers seeking history, culture, and unforgettable memories.
                                    </p>
                                </div>
                            </div>

                        </div>

                        <div className='explore-local-packages-section-right'>
                            <img
                                draggable={false}
                                alt="example"
                                src="https://i.pinimg.com/736x/0c/57/3e/0c573eba9d6beacea2a2c6b59874a138.jpg"
                            />
                            <Button>VIEW MORE</Button>
                        </div>
                    </div>
                </div>


                <div ref={aboutusRef} style={{ paddingTop: '100px', marginTop: '50px' }}>
                    <div className='explore-container'>


                        <div className='explore-local-packages-section'>

                            <div className="hero-section-aboutus">
                                <div className="hero-overlay-aboutus"></div>
                                <div className="hero-content-aboutus">
                                    <h1>M&RC Travel and Tours</h1>
                                    <p>
                                        Ready for your next adventure?  Book your international tour with M&RC Travel today and explore the world with ease and comfort. From stunning destinations to well-planned itineraries, we handle all the details so you can focus on making unforgettable memories. Don’t wait—your dream journey starts now!
                                    </p>
                                </div>
                            </div>


                            <div style={{ display: 'flex', flexDirection: 'row', marginTop: '50px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
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

                                <div style={{ display: 'flex', flexDirection: 'column', width: '45%', alignItems: 'center', marginLeft: 40 }}>
                                    <img
                                        style={{ width: 250, height: 250, borderRadius: '55%' }}
                                        draggable={false}
                                        alt="example"
                                        src="/images/owners.jpg"
                                    />
                                </div>

                            </div>

                            <div style={{ display: 'flex', flexDirection: 'row', marginTop: '50px' }}>

                                <div style={{ display: 'flex', flexDirection: 'column', width: '45%', alignItems: 'center', marginLeft: 40 }}>
                                    <img
                                        style={{ width: 250, height: 250, borderRadius: '55%' }}
                                        draggable={false}
                                        alt="example"
                                        src="/images/owners.jpg"
                                    />
                                </div>

                                <div className='aboutus-vision-mission' style={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
                                    <div className='aboutus-vision-mision-block' style={{ width: 550 }}>
                                        <h2 className='explore-text'>Our Vision</h2>
                                        <p className='aboutus-text'>
                                            Our Vision is to be the preferred travel
                                            and tours agency in the country of ering

                                            specialized, high quality and cost-
                                            ef icient travel solutions at all times,

                                            anywhere, everywhere.
                                        </p>
                                    </div>

                                    <div className='aboutus-vision-mision-block' style={{ width: 550 }}>
                                        <h2 className='explore-text'>Our Mission</h2>
                                        <p className='aboutus-text'>
                                            We are committed to provide value- added travel
                                            solutions to our Customers by of ering good service
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
                                        className='contact-submit-button'
                                        disabled={
                                            !contactValues.name.trim() ||
                                            !contactValues.email.trim() ||
                                            !contactValues.message.trim()
                                        }
                                        onClick={sendMessage}
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