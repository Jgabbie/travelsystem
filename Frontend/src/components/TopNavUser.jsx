import React, { useEffect, useState } from 'react'
import { Dropdown, Space, Button, Modal } from 'antd';
import { DownOutlined, HomeOutlined, UserOutlined, CarryOutOutlined, EnvironmentOutlined, StarOutlined, CreditCardOutlined, IdcardOutlined, GlobalOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import '../style/topnavuser.css'
import LoginModal from './LoginModal';
import SignupModal from './SignupModal';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../config/axiosConfig';

export default function TopNavUser() {
    const { auth, setAuth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [profileImage, setProfileImage] = useState('');

    const checkAuth = async () => {
        try {
            const response = await axiosInstance.get('/auth/is-auth', { withCredentials: true });
            const { user } = response.data;
            setAuth({ username: user.username, role: user.role });
            const profileResponse = await axiosInstance.get('/user/data', { withCredentials: true });
            const profile = profileResponse?.data?.userData;
            setProfileImage(
                profile?.profileImageUrl ||
                profile?.profileImage ||
                profile?.avatarUrl ||
                user?.profileImageUrl ||
                user?.profileImage ||
                user?.avatarUrl ||
                ''
            );
        } catch (err) {
            setAuth(null);
            setProfileImage('');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const [isLoginVisible, setIsLoginVisible] = useState(false);
    const [isSignupVisible, setIsSignupVisible] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const handleOk = async () => {
        setIsModalOpen(false);
        await axiosInstance.post('/auth/logoutUser', {}, { withCredentials: true });
        setAuth(null);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const showModal = () => {
        setIsModalOpen(true);
    };

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
            label: 'My Profile',
            icon: <UserOutlined />,
        },
        {
            key: '3',
            label: 'My Bookings',
            icon: <CarryOutOutlined />,
        },
        {
            key: '4',
            label: 'My Wishlist',
            icon: <StarOutlined />,
        },
        {
            key: '5',
            label: 'My Transactions',
            icon: <CreditCardOutlined />,
        },
        {
            type: 'divider',
        },
        {
            key: '6',
            label: 'Logout',
            icon: <LogoutOutlined />,
            danger: true,
        },
    ];

    //dropdown menu items handler/functions
    const handleMenuClick = ({ key }) => {
        if (key === '6') {
            logout()
        } else if (key === '1') {
            navigate('/home');
        } else if (key === '2') {
            navigate('/profile');
        } else if (key === '3') {
            navigate('/user-bookings');
        } else if (key === '4') {
            navigate('/wishlist');
        } else if (key === '5') {
            navigate('/user-transactions');
        }
    }

    const getInitials = () => {
        const name = auth?.username?.trim() || '';
        if (!name) return 'U';
        return name[0].toUpperCase();
    }

    const navItems = [
        { label: 'HOME', route: '/home' },
        { label: 'DESTINATIONS', route: '/destinations-packages' },
        { label: 'ABOUT', route: '/about' },
        { label: 'SERVICES', route: '/passandvisa-service' },
    ];

    return (
        <div>
            <nav className="navbar">
                <div className="logo-section">
                    <img src={"/images/Logo.png"} alt="Logo" className="admin-logo-img" />
                    <span>M&RC Travel and Tours</span>
                </div>

                {/* if authenticated, show username, if not, then show signup and login button links */}
                {auth ?
                    <div className="nav-links">
                        <div className='nav-buttonlinks-group'>
                            {navItems.map((item) => (
                                <Button
                                    key={item.route}
                                    className={`nav-buttonlinks${location.pathname === item.route ? ' nav-buttonlinks--active' : ''}`}
                                    type="link"
                                    onClick={() => navigate(item.route)}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </div>
                        <div className="dropdown-div">
                            <Dropdown menu={{ items, onClick: handleMenuClick }} className='user-dropdown'>
                                <Space className='dropdown-space'>
                                    <div className='nav-user-avatar'>
                                        {profileImage ? (
                                            <img src={profileImage} alt="Profile" className='nav-user-avatar-img' />
                                        ) : (
                                            <div className='nav-user-avatar-placeholder'>{getInitials()}</div>
                                        )}
                                    </div>
                                    <h4 className='username-text'>
                                        Welcome, <span className='username-dropdown'>{auth?.username?.toUpperCase()}</span>
                                    </h4>
                                    <DownOutlined className='user-dropdown-icon' />
                                </Space>
                            </Dropdown>
                        </div>

                    </div>
                    :
                    <div className="nav-links">
                        <span className="regsignin">
                            <Button className='landing-button-links' type="link" onClick={() => setIsSignupVisible(true)}>SIGN UP</Button>
                            |
                            <Button className='landing-button-links' type="link" onClick={() => setIsLoginVisible(true)}>LOG IN</Button>
                        </span>
                    </div>
                }
            </nav>

            {/* open login modal */}
            <LoginModal
                isOpenLogin={isLoginVisible}
                isCloseLogin={() => setIsLoginVisible(false)}
                onLoginSuccess={checkAuth}
                onOpenSignup={() => setIsSignupVisible(true)}
            />

            {/* open signup modal */}
            <SignupModal
                isOpenSignup={isSignupVisible}
                isCloseSignup={() => setIsSignupVisible(false)}
                onOpenLogin={() => setIsLoginVisible(true)}
            />

            <Modal
                className="logout-confirm-modal"
                closable={{ 'aria-label': 'Custom Close Button' }}
                open={isModalOpen}
                footer={null}
                onCancel={handleCancel}
            >
                <div className="logout-confirm-content">
                    <h2 className="logout-confirm-title">Confirm Logout</h2>
                    <p className="logout-confirm-text">Are you sure you want to logout?</p>
                    <div className="logout-confirm-actions">
                        <Button className="logout-cancel-btn" onClick={handleCancel}>Cancel</Button>
                        <Button className="logout-confirm-btn" type="primary" onClick={handleOk}>Logout</Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
