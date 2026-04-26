import { Layout, Space, Dropdown, Modal, Button } from "antd";
import { DownOutlined, HomeOutlined, UserOutlined, LogoutOutlined, MenuOutlined } from "@ant-design/icons";
import { useAuth } from "../../hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiFetch from "../../config/fetchConfig";
import "../../style/components/topnav.css";
import "../../style/components/modals/modaldesign.css";

const { Header } = Layout;

export default function TopNav() {

  const navigate = useNavigate();

  const { auth, setAuth, checkAuth, authLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!auth && !authLoading) {
      checkAuth();
    }
  }, [auth, authLoading, checkAuth]);



  const handleOk = async () => {
    setIsModalOpen(false);
    await apiFetch.post('/auth/logoutUser', {}, { withCredentials: true });
    setAuth(null);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const showModal = () => {
    setIsModalOpen(true);
  };

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

  const toggleSideNav = () => {
    window.dispatchEvent(new CustomEvent("sidenav:toggle"));
  };

  return (
    <div>
      <Header className="topnav">
        <div className="topnav-items">
          <Button
            className="topnav-menu-toggle"
            type="text"
            icon={<MenuOutlined />}
            onClick={toggleSideNav}
            aria-label="Toggle navigation"
          />
          <div className="admin-logo-section">
            <img src={"/images/Logo.png"} alt="Logo" className="logo-img" />
          </div>


          <div className="topnav-right">
            <Dropdown
              trigger={['hover']}
              align={{
                offset: [0, -15],
              }}
              menu={{ items, onClick: handleMenuClick }}
              className='user-dropdown'>
              <Space className='dropdown-space' align="center">
                <div className='admin-nav-user-avatar'>
                  {auth?.profileImage ? (
                    <img src={auth.profileImage} alt="Profile" className='admin-nav-user-avatar-img' />
                  ) : (
                    <div className='admin-nav-user-avatar-placeholder'>{getInitials()}</div>
                  )}
                </div>
                <h3 className="user-welcome">Welcome, <span className="user-topnav">{auth?.username.toUpperCase()}</span> </h3>
                <DownOutlined className='user-dropdown-icon' />
              </Space>
            </Dropdown>
          </div>
        </div>
      </Header>

      <Modal
        className="modal-main"
        closable={{ 'aria-label': 'Custom Close Button' }}
        open={isModalOpen}
        footer={null}
        onCancel={handleCancel}
        centered={true}
      >
        <div className="modal-container">
          <h2 className="modal-heading">Confirm Logout</h2>
          <p className="modal-text">Are you sure you want to logout?</p>
          <div className="modal-actions">
            <Button className="modal-button-cancel" type="primary" onClick={handleCancel}>Cancel</Button>
            <Button className="modal-button" type="primary" onClick={handleOk}>Logout</Button>
          </div>
        </div>
      </Modal>
    </div>

  );
}
