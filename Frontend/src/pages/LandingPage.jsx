import React, { useState, useRef } from 'react';
import '../style/landingpage.css'
import { Button, Card, Input, Modal, Select, Slider } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import TopNavUser from '../components/TopNavUser';
import LoginModal from '../components/LoginModal';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate()
    const { auth } = useAuth()

    const packagesRef = useRef(null)
    const exploreRef = useRef(null)
    const aboutusRef = useRef(null)

    const [budgetRange, setBudgetRange] = useState([12000, 30000]);
    const [activity, setActivity] = useState('Adventure Type');
    const [duration, setDuration] = useState('Length of Stay');
    const [pax, setPax] = useState('Number of Travelers');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoginVisible, setIsLoginVisible] = useState(false)
    const [isChatbotOpen, setIsChatbotOpen] = useState(false)
    const [chatMessage, setChatMessage] = useState('')

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

        if (pax && pax !== 'Tour Type') {
            params.set('tourType', pax);
        }

        params.set('minBudget', String(budgetRange[0]));
        params.set('maxBudget', String(budgetRange[1]));

        const query = params.toString();
        navigate(query ? `/destinations-packages?${query}` : '/destinations-packages');
    }

    return (
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
                            className="search-input"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
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
                                value={pax}
                                onChange={setPax}
                                options={[
                                    { value: 'Tour Type', label: 'Tour Type' },
                                    { value: 'Domestic', label: 'Domestic' },
                                    { value: 'International', label: 'International' },
                                ]}
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
                                max={50000}
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
                                src="https://japanspecialist.com/o/adaptive-media/image/3834410/big/4_Nagoya.jpg?t=1756118459754"
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
                        <h1 className='explore-text'>About Us</h1>

                        <p className='aboutus-text'>
                            M&RC Travel and Tours is a dedicated travel company committed to turning your dream vacations into unforgettable experiences.
                            We specialize in carefully curated travel packages that combine convenience, value, and adventure—whether you’re planning a
                            relaxing getaway, a family holiday, a romantic escape, or a group tour.
                        </p>

                        <p className='aboutus-text'>
                            Our team is passionate about travel and focused on delivering personalized service from start to finish.
                            From flights and accommodations to guided tours and activities, we handle every detail so you can travel with confidence and peace of mind.
                            We partner with trusted airlines, hotels, and local operators to ensure quality, safety, and memorable journeys for every client.
                        </p>

                        <p className='aboutus-text'>
                            At M&RC Travel and Tours, we believe that travel should be easy, enjoyable, and accessible to everyone.
                            Our mission is to help you explore new destinations, create lasting memories, and experience the world without the stress of planning.
                        </p>

                        <p className='aboutus-text'>
                            Let us take you there — your journey begins with M&RC Travel and Tours.
                        </p>

                    </div>
                </div>
            </div>

            <LoginModal
                isOpenLogin={isLoginVisible}
                isCloseLogin={() => setIsLoginVisible(false)}
                onLoginSuccess={() => navigate('/destinations-packages')}
            />

            <Button className="chatbot-fab" type="primary" onClick={() => setIsChatbotOpen(true)}>
                Chatbot
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
                        onChange={(event) => setChatMessage(event.target.value)}
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
    );
}