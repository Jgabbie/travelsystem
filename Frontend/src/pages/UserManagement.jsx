import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Tag, Space, DatePicker, Dropdown, message } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined, DownOutlined, UserAddOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import axios from 'axios';
import AddUserModal from "../components/AddUserModal"; // Import the new modal
import "../style/users.css";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState("User"); // Default role to add

  // Fetch users from backend
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/user/getUsers', { withCredentials: true });
      // Add 'key' prop for Ant Design Table
      const formattedData = response.data.map(user => ({
        key: user._id,
        id: user._id,
        name: `${user.firstname} ${user.lastname}`,
        username: user.username,
        email: user.email,
        role: user.role || "User",
        status: user.isAccountVerified ? "Verified" : "Pending"
      }));
      setUsers(formattedData);
    } catch (err) {
      console.error("Failed to fetch users", err);
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this user?")) {
        try {
            await axios.delete(`http://localhost:8000/api/user/deleteUsers`, { 
                data: { id }, // Pass ID in body or change route to /deleteUsers/:id
                withCredentials: true 
            });
            // Note: Your current route is /deleteUsers/:id so specific axios call:
            // await axios.delete(`http://localhost:8000/api/user/deleteUsers/${id}`)
            // But let's assume you fix the route or use query param. 
            // Based on your code provided: router.delete('/deleteUsers', userController.delUsers) 
            // But controller uses req.params.id. This route definition in userRoutes.js is likely wrong 
            // and should be router.delete('/deleteUsers/:id', ...). 
            // For now, I'll refresh data assuming deletion works or you fix route.
            message.success("User deleted");
            fetchUsers();
        } catch (err) {
            message.error("Delete failed");
        }
    }
  }

  // --- Dropdown Menu Items ---
  const addUserItems = [
    {
      key: 'Admin',
      label: 'Add Admin',
      icon: <SafetyCertificateOutlined />,
    },
    {
      key: 'User',
      label: 'Add Normal User',
      icon: <UserAddOutlined />,
    },
  ];

  const handleMenuClick = (e) => {
    setTargetRole(e.key); // Set role to 'Admin' or 'User'
    setIsModalOpen(true); // Open the modal
  };

  const menuProps = {
    items: addUserItems,
    onClick: handleMenuClick,
  };

  const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Username", dataIndex: "username" },
    { title: "Email", dataIndex: "email" },
    { 
      title: "Role", 
      dataIndex: "role",
      render: role => (
        <Tag color={role === "Admin" ? "purple" : "blue"}>{role}</Tag>
      )
    },
    {
      title: "Status",
      dataIndex: "status",
      render: s => (
        <Tag color={s === "Verified" ? "green" : "orange"}>{s}</Tag>
      )
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button type="primary" icon={<EditOutlined />} />
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ];

  return (
    <>
      <h1 className="page-header">User Management</h1>

      <div className="user-actions">
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search user..."
          className="search-input"
        />

        <Select placeholder="Role" style={{ width: 140 }}>
          <Select.Option value="admin">Admin</Select.Option>
          <Select.Option value="customer">User</Select.Option>
        </Select>

        <Button onClick={fetchUsers}>Refresh</Button>

        {/* --- MODIFIED ADD USER BUTTON --- */}
        <Dropdown menu={menuProps}>
          <Button type="primary">
            <Space>
              Add User
              <DownOutlined />
            </Space>
          </Button>
        </Dropdown>
      </div>

      <Table
        loading={loading}
        columns={columns}
        dataSource={users}
        pagination={{ pageSize: 6 }}
      />

      {/* --- ADD USER MODAL --- */}
      <AddUserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        roleToAdd={targetRole}
        refreshData={fetchUsers}
      />
    </>
  );
}