import axios from 'axios';
import React, { useEffect, useState, useRef } from 'react';
import '../style/packagepage.css'
import { Button, Dropdown, Space, Card, Tabs } from 'antd';
import { DownOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import LoginModal from '../components/LoginModal';
import SignupModal from '../components/SignupModal';

export default function PackagePage() {

    const [isLoginVisible, setIsLoginVisble] = useState(false)
    const [isSignupVisible, setIsSignupVisble] = useState(false)
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true); // Default true to avoid flash

    const [itemsTab, setItems] = useState([
        {
            label: 'Itinerary',
            key: '1',
            children: 'Content of editable tab 1',
        },
        {
            label: 'Inclusions and Exclusions',
            key: '2',
            children: 'Content of editable tab 2',
        },
        {
            label: 'Terms and Conditions',
            key: '3',
            children: 'Content of editable tab 3',
        },
        {
            label: 'Requirements',
            key: '4',
            children: 'Content of editable tab 4',
        },
    ]);

    const checkAuthentication = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/auth/is-auth', {
                method: "POST",
                credentials: "include"
            });
            if (response.ok) {
                const data = await response.json()
                setIsAuthenticated(true);
                setUser(data.user)
            } else {
                setIsAuthenticated(false);
            }
        } catch (err) {
            setIsAuthenticated(false);
            const errorMsg = err.response?.data?.message || "Verification failed"
            console.error("Error: ", errorMsg)
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuthentication()
    }, [])

    const logout = async () => {
        try {
            await axios.post('http://localhost:8000/api/auth/logoutUser', {}, { withCredentials: true });
            alert("Logout Successful");
            checkAuthentication()
        } catch (err) {
            console.error("Error logging out", err);
        }
    };

    //dropdown menu items
    const items = [
        {
            key: '1',
            label: 'Profile',
        },
        {
            key: '2',
            label: 'Settings',
            icon: <SettingOutlined />,
        },
        {
            key: '3',
            label: 'Settings',
            icon: <SettingOutlined />,
        },
        {
            key: '4',
            label: 'Settings',
            icon: <SettingOutlined />,
        },
        {
            type: 'divider',
        },
        {
            key: '5',
            label: 'Logout',
            icon: <LogoutOutlined />,
            danger: true,
        },
    ];

    //dropdown menu items handler/functions
    const handleMenuClick = ({ key }) => {
        if (key === '5') {
            logout()
        }
    }


    return (
        <div className='package-container'>
            <nav className="navbar">
                <div className="logo-section">
                    <img src={null} alt="Logo" className="logo-img" />
                    <span>M&RC Travel and Tours</span>
                </div>

                {/* if authenticated, show username, if not, then show signup and login button links */}
                {isAuthenticated ?
                    <div>
                        <Dropdown menu={{ items, onClick: handleMenuClick }} className='user-dropdown'>
                            <Space className='dropdown-space'>
                                <h4>
                                    Welcome, <span className='username-dropdown'>{user?.username.toUpperCase()}</span>
                                </h4>
                                <DownOutlined className='user-dropdown-icon' />
                            </Space>
                        </Dropdown>
                    </div>
                    :
                    <div className="nav-links">
                        <span className="regsignin">
                            <Button className='button-links' type="link" onClick={() => setIsSignupVisble(true)}>SIGN UP</Button>
                            |
                            <Button className='button-links' type="link" onClick={() => setIsLoginVisble(true)}>LOG IN</Button>
                        </span>
                    </div>
                }
            </nav>


            {/* open login modal */}
            <LoginModal
                isOpenLogin={isLoginVisible}
                isCloseLogin={() => setIsLoginVisble(false)}
                onLoginSuccess={checkAuthentication}
                onOpenSignup={() => setIsSignupVisble(true)}
            />

            {/* open signup modal */}
            <SignupModal
                isOpenSignup={isSignupVisible}
                isCloseSignup={() => setIsSignupVisble(false)}
                onOpenLogin={() => setIsLoginVisble(true)}
            />


            <div className='package-box'>
                {/* leftside */}
                <div className='package-left'>
                    <div className='package-name-duration'>
                        <h1>Baguio City Tour</h1>
                        <h1>4 DAYS</h1>
                    </div>

                    <div className='package-img-des'>
                        <img
                            draggable={false}
                            alt="example"
                            src="https://media.philstar.com/photos/2025/03/29/4_2025-03-29_22-14-19.jpg"
                        />
                        <p>
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure
                            dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur Duis aute irure dolor in reprehenderit
                            in voluptate velit esse cillum dolore eu fugiat nulla pariatur.  Duis aute irure dolor in reprehenderit in voluptate.
                        </p>
                    </div>
                </div>


                {/* rightside */}
                <div className='package-right'>
                    <h2>FROM</h2>
                    <div className='package-price-button'>
                        <h1>12,000<span>/PAX</span></h1>
                        <Button> CHECK AVAILABILITY</Button>
                    </div>

                    <Tabs
                        className='package-tabs'
                        defaultActiveKey="1"
                        size={"small"}
                        style={{ marginBottom: 32 }}
                        items={itemsTab}
                    />
                </div>




            </div>

        </div>
    )
}
