import React, { useEffect, useState } from 'react'
import { Dropdown, Space, Button, Modal, Spin, ConfigProvider } from 'antd';
import { DownOutlined, HomeOutlined, UserOutlined, CarryOutOutlined, StarOutlined, CreditCardOutlined, IdcardOutlined, LogoutOutlined, FileTextOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import apiFetch from '../../config/fetchConfig';
import LoginModal from '../modals/LoginModal';
import SignupModal from '../modals/SignupModal';
import Notifications from '../Notifications'
import '../../style/components/topnavuser.css'

export default function TopNavUser() {
    const { auth, setAuth, checkAuth, authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isLoginVisible, setIsLoginVisible] = useState(false);
    const [isSignupVisible, setIsSignupVisible] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const renderAuthControls = () => {
        if (auth) {
            return (
                <>
                    <div className="dropdown-div">
                        <Dropdown menu={{ items, onClick: handleMenuClick }} className='user-dropdown'>
                            <Space className='dropdown-space'>
                                <div className='nav-user-avatar'>
                                    {auth?.profileImage ? (
                                        <img src={auth.profileImage} alt="Profile" className='nav-user-avatar-img' />
                                    ) : (
                                        <div className='nav-user-avatar-placeholder'>{getInitials()}</div>
                                    )}
                                </div>
                                <h4 className='username-text'>
                                    Welcome, <span className='username-dropdown'>
                                        {auth?.username?.toUpperCase()}
                                    </span>
                                </h4>
                                <DownOutlined className='user-dropdown-icon' />
                            </Space>
                        </Dropdown>
                    </div>

                    <Notifications />
                </>
            );
        }

        return (
            <span className="regsignin">
                <Button
                    className='landing-button-links'
                    type="link"
                    onClick={() => setIsSignupVisible(true)}
                >
                    SIGN UP
                </Button>
                |
                <Button
                    className='landing-button-links'
                    type="link"
                    onClick={() => setIsLoginVisible(true)}
                >
                    LOG IN
                </Button>
            </span>
        );
    };

    const handleOk = async () => {
        setIsModalOpen(false);
        try {
            setIsLoading(true);
            await apiFetch.post('/auth/logoutUser', {}, { withCredentials: true });
            setAuth(null);
            navigate('/home');
        } catch (err) {
            console.error('Logout failed:', err);
            setIsLoading(false);
        }
        setIsLoading(false);
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
            label: 'My Wishlist',
            icon: <StarOutlined />,
        },
        {
            key: '4',
            label: 'My Bookings',
            icon: <CarryOutOutlined />,
        },
        {
            key: '5',
            label: 'My Applications',
            icon: <IdcardOutlined />,
        },
        {
            key: '6',
            label: 'My Quotations',
            icon: <FileTextOutlined />,
        },

        {
            key: '7',
            label: 'My Transactions',
            icon: <CreditCardOutlined />,
        },
        {
            type: 'divider',
        },
        {
            key: '8',
            label: 'Logout',
            icon: <LogoutOutlined />,
            danger: true,
        },
    ];

    //dropdown menu items handler/functions
    const handleMenuClick = ({ key }) => {
        if (key === '8') {
            logout()
        } else if (key === '1') {
            navigate('/home');
        } else if (key === '2') {
            navigate('/profile');
        } else if (key === '3') {
            navigate('/wishlist');
        } else if (key === '4') {
            navigate('/user-bookings');
        } else if (key === '5') {
            navigate('/user-applications');
        } else if (key === '6') {
            navigate('/user-package-quotation');
        } else if (key === '7') {
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
        { label: 'SERVICES', route: '/passandvisa-service' },
        { label: 'FAQ', route: '/general-faq' },
    ];


    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                },
            }}
        >
            <div>
                {isLoading && (
                    <Spin fullscreen size="large" className="app-loading-spin" style={{ zIndex: 2000 }} />
                )}
                <nav className="navbar">
                    <div className="logo-section">
                        <img src={"/images/LogoNav.png"} alt="Logo" className="user-logo-img" onClick={() => { navigate("/home") }} />
                    </div>

                    {/* if authenticated, show username, if not, then show signup and login button links */}
                    <div className="nav-links">

                        {/* Always visible navigation */}
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

                        {renderAuthControls()}

                    </div>
                </nav>

                <div className="navbar-spacer" />

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
                    open={isModalOpen}
                    className='signup-success-modal'
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    footer={null}
                    style={{ top: 220 }}
                    onCancel={handleCancel}
                >
                    <div className='signup-success-container'>
                        <h1 className='signup-success-heading'>Confirm Logout?</h1>
                        <p className='signup-success-text'>Are you sure you want to logout?</p>

                        <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                            <Button
                                type='primary'
                                className='logout-confirm-btn'
                                onClick={handleOk}
                            >
                                Logout
                            </Button>
                            <Button
                                type='primary'
                                className='logout-cancel-btn'
                                onClick={handleCancel}
                            >
                                Cancel
                            </Button>

                        </div>

                    </div>
                </Modal>
            </div>
        </ConfigProvider>
    )
}
