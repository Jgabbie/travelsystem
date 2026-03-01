import React, { useState, useEffect } from 'react';
import {
  Table,
  Input,
  Select,
  Button,
  Form,
  Modal,
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
import { ConfigProvider } from "antd";

export default function UserManagement() {

  const [form] = Form.useForm();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState("User");

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editingKey, setEditingKey] = useState("");

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
    Modal.confirm({
      className: "users-manage-confirm-modal",
      icon: null,
      title: (
        <div className="users-manage-confirm-title" style={{ textAlign: "center" }}>
          Confirm Delete
        </div>
      ),
      content: (
        <div className="users-manage-confirm-content" style={{ textAlign: "center" }}>
          <p className="users-manage-confirm-text">Are you sure you want to delete this user?</p>
        </div>
      ),
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { className: "users-manage-confirm-btn" },
      cancelButtonProps: { className: "users-manage-cancel-btn" },
      style: { top: 200 },
      onOk: async () => {
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
      }
    });
  };

  const filteredUsers = users.filter(user => {

    const matchesSearch =
      user.name.toLowerCase().includes(searchText.toLowerCase()) ||
      user.username.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase());

    const matchesRole =
      roleFilter === "" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const isEditing = (record) => record.key === editingKey;

  const edit = (record) => {
    form.setFieldsValue({
      name: record.name,
      username: record.username,
      role: record.role
    });
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey("");
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const newData = [...users];
      const index = newData.findIndex((item) => item.key === key);

      if (index > -1) {
        Modal.confirm({
          className: "users-manage-confirm-modal",
          icon: null,
          title: (
            <div className="users-manage-confirm-title" style={{ textAlign: "center" }}>
              Confirm Changes
            </div>
          ),
          content: (
            <div className="users-manage-confirm-content" style={{ textAlign: "center" }}>
              <p className="users-manage-confirm-text">Are you sure about these changes?</p>
            </div>
          ),
          okText: "Save",
          cancelText: "Cancel",
          okButtonProps: { className: "users-manage-confirm-btn" },
          cancelButtonProps: { className: "users-manage-cancel-btn" },
          style: { top: 200 },
          onOk: async () => {
            try {
              await axios.put(
                `http://localhost:8000/api/admin/editUser/${key}`,
                {
                  username: row.username,
                  name: row.name,
                  role: row.role
                },
                { withCredentials: true }
              );
              const item = newData[index];
              newData.splice(index, 1, { ...item, ...row });
              setUsers(newData);
              setEditingKey("");
              message.success("User updated");
            } catch (err) {
              message.error(err?.response?.data?.message || "Update failed");
            }
          }
        });
      }
    } catch {
      message.error("Please fix validation errors");
    }
  };

  // ================= TABLE =================

  const columns = [
    { title: "Name", dataIndex: "name", editable: true },
    { title: "Username", dataIndex: "username", editable: true },
    { title: "Email", dataIndex: "email" },
    {
      title: "Role",
      dataIndex: "role",
      editable: true,
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
          {isEditing(record) ? (
            <>
              <Button
                className='savebutton-usermanagement'
                type="primary"
                onClick={() => save(record.key)}
              >
                Save
              </Button>
              <Button className='cancelbutton-usermanagement' onClick={cancel}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                className='editbutton-usermanagement'
                type="primary"
                icon={<EditOutlined />}
                onClick={() => edit(record)}
                disabled={editingKey !== ""}
              />
              <Button
                className='deletebutton-usermanagement'
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record.id)}
                disabled={editingKey !== ""}
              />
            </>
          )}
        </Space>
      )
    }
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }

    const inputType = col.dataIndex === "role" ? "select" : "text";

    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record)
      })
    };
  });

  const EditableCell = ({
    editing,
    dataIndex,
    inputType,
    record,
    children,
    ...restProps
  }) => {
    let inputNode = <Input />;

    if (inputType === "select") {
      inputNode = (
        <Select
          className="user-edit-select"
          options={[
            { value: "Admin", label: "Admin" },
            { value: "User", label: "User" }
          ]}
        />
      );
    }

    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            rules={[{ required: true, message: `Please enter ${dataIndex}` }]}
          >
            {inputNode}
          </Form.Item>
        ) : (
          children
        )}
      </td>
    );
  };

  const totalUsers = users.length;
  const verifiedUsers = users.filter(u => u.status === "Verified").length;
  const unverifiedUsers = users.filter(u => u.status === "Pending").length;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#305797"
        }
      }}
    >
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
            className='user-select'
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

          <Button className='adduser-usermanagement' type="primary" onClick={() => setIsModalOpen(true)}>
            Add User
          </Button>
        </div>

        <Card style={{ marginTop: 20 }}>
          <Form form={form} component={false}>
            <Table
              components={{
                body: {
                  cell: EditableCell
                }
              }}
              loading={loading}
              columns={mergedColumns}
              dataSource={filteredUsers}
              pagination={{ pageSize: 6 }}
              rowClassName="editable-row"
              scroll={{ x: "max-content" }}
            />
          </Form>
        </Card>

        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          roleToAdd={targetRole}
          refreshData={getUsers}
        />
      </div>
    </ConfigProvider>
  );
}