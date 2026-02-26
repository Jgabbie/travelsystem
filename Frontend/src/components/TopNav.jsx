import { Layout, Space, Dropdown, Modal, Button } from "antd";
import { DownOutlined, HomeOutlined, UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth";
import "../style/topnav.css";
import axiosInstance from "../config/axiosConfig";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const { Header } = Layout;

export default function TopNav() {

  const navigate = useNavigate();

  const { auth, setAuth } = useAuth();
  const [profileImage, setProfileImage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const getInitials = () => {
    const name = auth?.username?.trim() || '';
    if (!name) return 'U';
    return name[0].toUpperCase();
  }

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
      label: 'Dashboard',
      icon: <HomeOutlined />
    },
    {
      key: '2',
      label: 'Profile',
      icon: <UserOutlined />,
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
    } else if (key === '1') {
      navigate('/dashboard');
    } else if (key === '2') {
      navigate('/adminprofile');
    }
  }

  return (
    <div>
      <Header className="topnav">
        <div className="admin-logo-section">
          <img src={"/images/Logo.png"} alt="Logo" className="logo-img" />
          <div className="brand">M&RC Travel and Tours</div>
        </div>


        <div className="topnav-right">
          <Dropdown
            trigger={['hover']}
            align={{
              offset: [0, -15],
            }}
            menu={{ items, onClick: handleMenuClick }}
            className='user-dropdown'>
            <Space className='dropdown-space'>
              <div className='admin-nav-user-avatar'>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className='admin-nav-user-avatar-img' />
                ) : (
                  <div className='admin-nav-user-avatar-placeholder'>{getInitials()}</div>
                )}
              </div>
              <h3 className="user-welcome">Welcome, <span className="user-topnav">{auth?.username.toUpperCase()}</span> </h3>
              <DownOutlined className='user-dropdown-icon' />
            </Space>
          </Dropdown>
        </div>
      </Header>

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

  );
}
