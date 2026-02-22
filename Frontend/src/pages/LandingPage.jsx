import React, { useState, useRef } from 'react';
import '../style/landingpage.css'
import { Button, Card } from 'antd';
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

    const [budget, setBudget] = useState(16000);
    const [isLoginVisible, setIsLoginVisible] = useState(false)

    const handleBrowsePackages = () => {
        if (auth) {
            navigate('/destinations-packages')
            return
        }
        setIsLoginVisible(true)
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
                        <input type="text" placeholder="Search here..." className="search-input" />
                        <button className="search-btn"><SearchOutlined /></button>
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

            <LoginModal
                isOpenLogin={isLoginVisible}
                isCloseLogin={() => setIsLoginVisible(false)}
                onLoginSuccess={() => navigate('/destinations-packages')}
            />
        </div>
    );
}