import React, { useEffect, useState, useRef } from 'react';
import '../style/landingpage.css'
import { Button, Dropdown, Space, Card, Spin, Modal } from 'antd';
import {
    DownOutlined, LogoutOutlined, HomeOutlined,
    UserOutlined, IdcardOutlined, CreditCardOutlined, StarOutlined, CarryOutOutlined, EnvironmentOutlined, GlobalOutlined
} from '@ant-design/icons';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';
import LoadingScreen from '../components/LoadingScreen';
import { useAuth } from '../hooks/useAuth';
import axiosInstance from '../config/axiosConfig';
import useRefreshToken from '../hooks/useRefreshToken';


export default function LandingPage() {
    const refresh = useRefreshToken();

    const { auth, setAuth } = useAuth();

    const packagesRef = useRef(null)
    const exploreRef = useRef(null)

    const [isLoginVisible, setIsLoginVisble] = useState(false)
    const [isSignupVisible, setIsSignupVisble] = useState(false)
    const [isLoading, setIsLoading] = useState(true);
    const [budget, setBudget] = useState(16000);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const showModal = () => {
        setIsModalOpen(true);
    };

    const handleOk = async () => {
        setIsModalOpen(false);
        await axiosInstance.post('/auth/logoutUser', {}, { withCredentials: true });
        setAuth(null);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    //check if user is logged in on load
    const checkAuth = async () => {
        try {
            const response = await axiosInstance.get('/auth/is-auth', { withCredentials: true });
            const { user } = response.data;
            setAuth({ username: user.username, role: user.role });
        } catch (err) {
            setAuth(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    console.log("Auth Context Data in Landing Page:", auth);

    const logout = async () => {
        try {
            showModal()
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };


    //dropdown menu items
    const items = [
        {
            key: '1',
            label: 'Home',
            icon: <HomeOutlined />
        },
        {
            key: '2',
            label: 'Profile',
            icon: <UserOutlined />,
        },
        {
            key: '3',
            label: 'Bookings',
            icon: <CarryOutOutlined />,
        },
        {
            key: '4',
            label: 'Destinations',
            icon: <EnvironmentOutlined />,
        },
        {
            key: '5',
            label: 'Featured',
            icon: <StarOutlined />,
        },
        {
            key: '6',
            label: 'Transactions',
            icon: <CreditCardOutlined />,
        },
        {
            key: '7',
            label: 'VISA Assistance',
            icon: <IdcardOutlined />,
        },
        {
            key: '8',
            label: 'Passport Assistance',
            icon: <GlobalOutlined />,
        },
        {
            type: 'divider',
        },
        {
            key: '9',
            label: 'Logout',
            icon: <LogoutOutlined />,
            danger: true,
        },
    ];

    //dropdown menu items handler/functions
    const handleMenuClick = ({ key }) => {
        if (key === '9') {
            logout()
        }
    }

    return (
        <div className="landing-container">
            <LoadingScreen isVisible={isLoading} message="Loading..." />

            <Modal
                title="Confirm Logout"
                closable={{ 'aria-label': 'Custom Close Button' }}
                open={isModalOpen}
                onOk={handleOk}
                onCancel={handleCancel}
            >
                <p>Are you sure you want to logout?</p>
            </Modal>

            {/* --- 1. NAVBAR --- */}
            <nav className="navbar">
                <div className="logo-section">
                    <img src={"/images/Logo.png"} alt="Logo" className="logo-img" />
                    <span>M&RC Travel and Tours</span>
                </div>

                {/* if authenticated, show username, if not, then show signup and login button links */}
                {auth ?
                    <div>
                        <Dropdown menu={{ items, onClick: handleMenuClick }} className='user-dropdown'>
                            <Space className='dropdown-space'>
                                <h4 className='username-text'>
                                    Welcome, <span className='username-dropdown'>{auth?.username?.toUpperCase()}</span>
                                </h4>
                                <DownOutlined className='user-dropdown-icon' />
                            </Space>
                        </Dropdown>
                    </div>
                    :
                    <div className="nav-links">
                        <span className="regsignin">
                            <Button className='landing-button-links' type="link" onClick={() => setIsSignupVisble(true)}>SIGN UP</Button>
                            |
                            <Button className='landing-button-links' type="link" onClick={() => setIsLoginVisble(true)}>LOG IN</Button>
                        </span>
                    </div>
                }
            </nav>


            {/* open login modal */}
            <LoginModal
                isOpenLogin={isLoginVisible}
                isCloseLogin={() => setIsLoginVisble(false)}
                onLoginSuccess={checkAuth}
            />

            {/* open signup modal */}
            <SignupModal
                isOpenSignup={isSignupVisible}
                isCloseSignup={() => setIsSignupVisble(false)}
            />


            {/* --- 2. BODY --- */}
            <div className="hero-section">
                <div className="hero-overlay"></div>
                <div className="hero-content">
                    <h1>Your Link to the World</h1>
                    <p>Discover affordable vacation travel and tours. Book your dream activities and start exploring the world!</p>
                </div>


                <div className="search-widget">

                    <div className="search-row">
                        <input type="text" placeholder="Search here..." className="search-input" />
                        <button className="search-btn">🔍</button>
                    </div>


                    <div className="filter-row">


                        <div className="filter-group">
                            <label>ACTIVITIES</label>
                            <select className="filter-select">
                                <option>Adventure Type</option>
                                <option>Beach</option>
                                <option>Hiking</option>
                                <option>City Tour</option>
                            </select>
                        </div>


                        <div className="filter-group">
                            <label>DURATION</label>
                            <select className="filter-select">
                                <option>Length of Stay</option>
                                <option>2 Days</option>
                                <option>3 Days</option>
                                <option>4 Days</option>
                                <option>5 Days</option>
                                <option>6 Days</option>
                                <option>7 Days</option>
                            </select>
                        </div>


                        <div className="filter-group">
                            <label>PAX</label>
                            <select className="filter-select">
                                <option>Number of Travelers</option>
                                <option>Solo Booking</option>
                                <option>Group Booking</option>
                            </select>
                        </div>


                        <div className="filter-group" style={{ minWidth: '200px' }}>
                            <label>BUDGET</label>
                            <div className="budget-labels">
                                <span>₱12,000</span>
                                <span>₱{budget.toLocaleString()}</span>
                            </div>
                            <input
                                type="range"
                                min="12000"
                                max="50000"
                                step="1000"
                                value={budget}
                                onChange={(e) => setBudget(Number(e.target.value))}
                                className="budget-slider"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className='page-link-buttons-container'>
                <Button className='page-link-buttons' type='link' onClick={() => packagesRef.current?.scrollIntoView({ behavior: 'smooth' })} >Popular Packages</Button>
                <Button className='page-link-buttons' type='link' onClick={() => exploreRef.current?.scrollIntoView({ behavior: 'smooth' })} >Explore Now!</Button>
            </div>

            <div ref={packagesRef} style={{ paddingTop: '50px', marginTop: '30px' }}>
                <div className="hero-section-packages">
                    <div className="hero-overlay-packages"></div>
                    <div className="hero-content-packages">
                        <h1>Book Your Tours Now</h1>
                        <p>
                            Ready for your next adventure?  Book your international tour with M&RC Travel today and explore the world with ease and comfort. From stunning destinations to well-planned itineraries, we handle all the details so you can focus on making unforgettable memories. Don’t wait—your dream journey starts now!
                        </p>
                        <Button className='packages-button' onClick={() => { refresh() }}>BROWSE TOUR PACKAGES</Button>
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
                                src="https://media.philstar.com/photos/2025/03/29/4_2025-03-29_22-14-19.jpg"
                            />
                        }
                    >
                        <h2>
                            Travel and Tour Package
                        </h2>
                        <p>
                            Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet, lectus velit tempus lectus, ac molestie purus lorem at sem.
                        </p>
                    </Card>

                    <Card
                        hoverable
                        style={{ width: 350 }}
                        cover={
                            <img style={{ height: 250 }}
                                draggable={false}
                                alt="example"
                                src="https://media.philstar.com/photos/2025/03/29/4_2025-03-29_22-14-19.jpg"
                            />
                        }
                    >
                        <h2>
                            Travel and Tour Package
                        </h2>
                        <p>
                            Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet, lectus velit tempus lectus, ac molestie purus lorem at sem.
                        </p>
                    </Card>

                    <Card
                        hoverable
                        style={{ width: 350 }}
                        cover={
                            <img style={{ height: 250 }}
                                draggable={false}
                                alt="example"
                                src="https://media.philstar.com/photos/2025/03/29/4_2025-03-29_22-14-19.jpg"
                            />
                        }
                    >
                        <h2>
                            Travel and Tour Package
                        </h2>
                        <p>
                            Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet, lectus velit tempus lectus, ac molestie purus lorem at sem.
                        </p>
                    </Card>

                    <Card
                        hoverable
                        style={{ width: 350 }}
                        cover={
                            <img style={{ height: 250 }}
                                draggable={false}
                                alt="example"
                                src="https://media.philstar.com/photos/2025/03/29/4_2025-03-29_22-14-19.jpg"
                            />
                        }
                    >
                        <h2>
                            Travel and Tour Package
                        </h2>
                        <p>
                            Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet, lectus velit tempus lectus, ac molestie purus lorem at sem.
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
                                        src="https://media.philstar.com/photos/2025/03/29/4_2025-03-29_22-14-19.jpg"
                                    />
                                }
                            >
                                <h2>
                                    Travel and Tour Package
                                </h2>
                                <p>
                                    Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet
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
                                    Travel and Tour Package
                                </h2>
                                <p>
                                    Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet
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
                                    Travel and Tour Package
                                </h2>
                                <p>
                                    Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet
                                </p>
                            </Card>

                        </div>

                        <h1 className='explore-text'>Explore the World</h1>
                        <div className='explore-world-section'>
                            <img style={{ height: 250, width: 400, marginLeft: 40, marginBottom: 40 }}
                                draggable={false}
                                alt="example"
                                src="https://media.philstar.com/photos/2025/03/29/4_2025-03-29_22-14-19.jpg"
                            />
                            <div className='explore-world-text'>
                                <h2 className='explore-world-text-heading'>Kyoto, Japan</h2>
                                <p className='explore-world-text-description'>
                                    Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet
                                    Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet
                                    Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet
                                    Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet
                                    Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet
                                    Sed egestas sodales quam et tristique. Integer at ligula nisl. Morbi sodales, enim id feugiat imperdiet
                                </p>
                            </div>
                        </div>

                    </div>

                    <div className='explore-local-packages-section-right'>
                        <img
                            draggable={false}
                            alt="example"
                            src="https://media.philstar.com/photos/2025/03/29/4_2025-03-29_22-14-19.jpg"
                        />
                        <Button>VIEW MORE</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}