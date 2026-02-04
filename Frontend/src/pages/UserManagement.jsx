import React, { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Select,
  Button,
  Tag,
  Space,
  Dropdown,
  message,
  Row,
  Col,
  Statistic,
  Card
} from "antd";

import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  UserAddOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from "@ant-design/icons";

import axios from 'axios';
import AddUserModal from "../components/AddUserModal";
import "../style/users.css";

export default function UserManagement() {

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState("User");

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // ================= FETCH USERS =================

  const getUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost:8000/api/user/getUsers",
        { withCredentials: true }
      );

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
    } catch {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  // ================= DELETE =================

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;

    try {
      await axios.delete(
        `http://localhost:8000/api/user/deleteUsers`,
        {
          data: { id },
          withCredentials: true
        }
      );
      message.success("User deleted");
      getUsers();
    } catch {
      message.error("Delete failed");
    }
  };

  // ================= FILTERS =================

  const filteredUsers = users.filter(user => {

    const matchesSearch =
      user.name.toLowerCase().includes(searchText.toLowerCase()) ||
      user.username.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase());

    const matchesRole =
      roleFilter === "" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // ================= DROPDOWN =================

  const addUserItems = [
    {
      key: "Admin",
      label: "Add Admin",
      icon: <SafetyCertificateOutlined />
    },
    {
      key: "User",
      label: "Add Normal User",
      icon: <UserAddOutlined />
    }
  ];

  const handleMenuClick = (e) => {
    setTargetRole(e.key);
    setIsModalOpen(true);
  };

  // ================= TABLE =================

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
      render: status => (
        <Tag color={status === "Verified" ? "green" : "orange"}>{status}</Tag>
      )
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button className='editbutton-usermanagement' type="primary" icon={<EditOutlined />} />
          <Button className='deletebutton-usermanagement'
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      )
    }
  ];


  const totalUsers = users.length;
  const verifiedUsers = users.filter(u => u.status === "Verified").length;
  const unverifiedUsers = users.filter(u => u.status === "Pending").length;

  return (
    <div className="user-management-container">

      <h1 className="page-header">User Management</h1>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Users"
              value={totalUsers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Verified Users"
              value={verifiedUsers}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Unverified Users"
              value={unverifiedUsers}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <div className="user-actions">

        <Input
          prefix={<SearchOutlined />}
          placeholder="Search name, username or email..."
          className="search-input"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <Select
          placeholder="Role"
          style={{ width: 140 }}
          allowClear
          value={roleFilter || undefined}
          onChange={(value) => setRoleFilter(value || "")}
          options={[
            { value: "Admin", label: "Admin" },
            { value: "User", label: "User" }
          ]}
        />

        <Button onClick={getUsers}>Refresh</Button>

        <Dropdown
          menu={{ items: addUserItems, onClick: handleMenuClick }}
        >
          <Button className='adduser-usermanagement' type="primary">
            <Space>
              Add User
              <DownOutlined />
            </Space>
          </Button>
        </Dropdown>
      </div>

      <Card style={{ marginTop: 20 }}>
        <Table
          loading={loading}
          columns={columns}
          dataSource={filteredUsers}
          pagination={{ pageSize: 6 }}
        />
      </Card>

      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        roleToAdd={targetRole}
        refreshData={getUsers}
      />
    </div>
  );
}