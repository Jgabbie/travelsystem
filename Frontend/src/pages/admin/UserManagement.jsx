import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Form, Modal, Tag, Space, message, Row, Col, Statistic, Card, ConfigProvider, Avatar } from "antd";
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FilePdfOutlined,
  PlusOutlined,
  CheckCircleFilled
} from "@ant-design/icons";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import AddUserModal from "../../components/modals/AddUserModal";
import apiFetch from '../../config/fetchConfig';
import "../../style/admin/users.css";


// HELPER: Converts Logo.png to Base64
const getBase64ImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

export default function UserManagement() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState("User");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUserEditedModalOpen, setIsUserEditedModalOpen] = useState(false);
  const [isUserDeletedModalOpen, setIsUserDeletedModalOpen] = useState(false);

  const getUsers = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get('/user/getUsers', { withCredentials: true });
      const formattedData = response.map(user => ({
        key: user._id,
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        name: `${user.firstname} ${user.lastname}`,
        username: user.username,
        email: user.email,
        role: user.role || "User",
        status: user.isAccountVerified ? "Verified" : "Pending",
        avatar: user.profilePicture || user.profileImage || user.avatar || "",
        phone: user.phone || "",
        address: user.address || "",
        createdAt: user.createdAt || "",
        lastLogin: user.lastLogin || ""
      }));
      setUsers(formattedData);
    } catch {
      message.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { getUsers(); }, []);

  // PDF GENERATION WITH LOGO & HEADER
  const generatePDF = async () => {
    const doc = new jsPDF();
    const tableColumn = ["Name", "Username", "Email", "Role", "Status"];
    const tableRows = filteredUsers.map(user => [
      user.name, user.username, user.email, user.role, user.status
    ]);

    try {
      // 1. Add Logo
      const imgData = await getBase64ImageFromURL("/images/Logo.png");
      doc.addImage(imgData, "PNG", 14, 12, 35, 22);
    } catch (e) {
      console.warn("Logo not found at /public/images/Logo.png");
    }

    // 2. Company Info Header
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("M&RC TRAVEL AND TOURS", 52, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1, Brgy", 52, 23);
    doc.text("San Antonio, Paranaque City, Philippines, 1709 PHL", 52, 27);
    doc.text("+639690554806 | info1@mrctravels.com", 52, 31);

    // 3. Report Title & Search Input Display
    doc.setDrawColor(48, 87, 151);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(48, 87, 151);
    doc.text("USER MANAGEMENT REPORT", 14, 48);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Date Generated: ${new Date().toLocaleString()}`, 14, 55);

    // Display Search Value if any
    let tableStartY = 62;
    if (searchText) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Search Criteria: "${searchText}"`, 14, 62);
      tableStartY = 68;
    }

    // 4. Generate Table
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: tableStartY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [48, 87, 151] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    doc.save(`User_Report_${new Date().toLocaleDateString()}.pdf`);
    message.success("Report exported to PDF successfully.");
  };

  const handleDelete = async (id) => {
    try {
      await apiFetch.delete(`/user/deleteUsers/${id}`, { withCredentials: true });
      setIsDeleteModalOpen(false);
      setIsUserDeletedModalOpen(true);
      getUsers();
    } catch { message.error("Delete failed"); }
  };

  const edit = (record) => {
    setEditingUser(record);

    editForm.setFieldsValue({
      firstname: record.firstname,
      lastname: record.lastname,
      username: record.username,
      email: record.email,
      role: record.role
    });


    setIsEditModalOpen(true);
  };

  const save = async () => {
    try {
      const values = await editForm.validateFields();

      await apiFetch.put(
        `/admin/editUser/${editingUser.id}`, // also fix this
        values,
        { withCredentials: true }
      );

      message.success("User updated");
      setIsEditModalOpen(false);
      setIsUserEditedModalOpen(true);
      setEditingUser(null);
      editForm.resetFields();
      getUsers();
    } catch {
      message.error("Update failed");
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchText.toLowerCase()) ||
      user.username.toLowerCase().includes(searchText.toLowerCase()) ||
      user.email.toLowerCase().includes(searchText.toLowerCase()) ||
      user.role.toLowerCase().includes(searchText.toLowerCase()) ||
      user.status.toLowerCase().includes(searchText.toLowerCase())
    const matchesRole = roleFilter === "" || user.role === roleFilter;
    const matchesStatus = statusFilter === "" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const columns = [
    { title: "Name", dataIndex: "name", editable: true },
    { title: "Username", dataIndex: "username", editable: true },
    { title: "Email", dataIndex: "email" },
    {
      title: "Role",
      dataIndex: "role",
      editable: true,
      render: role => <Tag color={role === "Admin" ? "purple" : "blue"}>{role}</Tag>
    },
    {
      title: "Status",
      dataIndex: "status",
      render: status => <Tag color={status === "Verified" ? "green" : "orange"}>{status}</Tag>
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button
            className='usermanagement-view-button'
            type='primary'
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedUser(record);
              setIsViewModalOpen(true);
            }}
          >
            View
          </Button>

          <Button
            className='usermanagement-edit-button'
            type="primary"
            icon={<EditOutlined />}
            onClick={() => edit(record)}
          >
            Edit
          </Button>

          <Button
            className='usermanagement-remove-button'
            type='primary'
            icon={<DeleteOutlined />}
            onClick={() => {
              setEditingUser(record)
              setIsDeleteModalOpen(true)
            }}
          >
            Delete
          </Button>
        </Space >
      )
    }
  ];

  const resolveAvatarUrl = (value) => {
    if (!value) return "";
    if (value.startsWith("http") || value.startsWith("data:")) return value;
    const normalized = value.startsWith("/") ? value.slice(1) : value;
    return `${window.location.origin}/${normalized}`;
  };


  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#305797" } }}>
      <div className="user-management-container">
        <h1 className="page-header">User Management</h1>

        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={8}><Card><Statistic title="Total Users" value={users.length} prefix={<UserOutlined />} /></Card></Col>
          <Col xs={24} sm={8}><Card><Statistic title="Verified Users" value={users.filter(u => u.status === "Verified").length} prefix={<CheckCircleOutlined />} /></Card></Col>
          <Col xs={24} sm={8}><Card><Statistic title="Unverified Users" value={users.filter(u => u.status === "Pending").length} prefix={<ExclamationCircleOutlined />} /></Card></Col>
        </Row>

        <div className="user-actions">
          <Input prefix={<SearchOutlined />} placeholder="Search..." className="search-input" value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear />
          <Select placeholder="Role" style={{ width: 140 }} allowClear onChange={(v) => setRoleFilter(v || "")} options={[{ value: "Admin", label: "Admin" }, { value: "User", label: "User" }, { value: "Employee", label: "Employee" }]} />
          <Select placeholder="Status" style={{ width: 140 }} allowClear onChange={(v) => setStatusFilter(v || "")} options={[{ value: "Verified", label: "Verified" }, { value: "Pending", label: "Pending" }]} />

          <Space style={{ marginLeft: 'auto' }}>
            {/* RESTORED original classes */}
            <Button className='usermanagement-add-button' type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Add User</Button>
            <Button className='usermanagement-export-button' type="primary" icon={<FilePdfOutlined />} onClick={generatePDF}>Export to PDF</Button>
          </Space>
        </div>

        <Card style={{ marginTop: 20 }}>
          <Form form={form} component={false}>
            <Table
              loading={loading}
              columns={columns}
              dataSource={filteredUsers}
              pagination={{ pageSize: 10, showSizeChanger: false }}
            />
          </Form>
        </Card>

        <AddUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} roleToAdd={targetRole} refreshData={getUsers} />

        <Modal
          open={isViewModalOpen}
          onCancel={() => setIsViewModalOpen(false)}
          footer={null}
          className="users-view-modal"
          width={720}
          destroyOnClose
        >
          {selectedUser && (
            <div className="users-view-content">
              <div className="users-view-header">
                <Avatar
                  size={96}
                  src={resolveAvatarUrl(selectedUser.avatar) || undefined}
                  icon={<UserOutlined />}
                  className="users-view-avatar"
                />
                <div className="users-view-title">
                  <h2 className="users-view-name">{selectedUser.name}</h2>
                  <div className="users-view-subtitle">
                    <span>{selectedUser.email}</span>
                    <Tag color={selectedUser.role === "Admin" ? "purple" : "blue"}>{selectedUser.role}</Tag>
                    <Tag color={selectedUser.status === "Verified" ? "green" : "orange"}>{selectedUser.status}</Tag>
                  </div>
                </div>
              </div>
              <div className="users-view-grid">
                <div className="users-view-item"><span className="users-view-label">First Name</span><span className="users-view-value">{selectedUser.firstname || "N/A"}</span></div>
                <div className="users-view-item"><span className="users-view-label">Last Name</span><span className="users-view-value">{selectedUser.lastname || "N/A"}</span></div>
                <div className="users-view-item"><span className="users-view-label">Username</span><span className="users-view-value">{selectedUser.username}</span></div>
                <div className="users-view-item"><span className="users-view-label">Phone</span><span className="users-view-value">{selectedUser.phone || "N/A"}</span></div>
              </div>
            </div>
          )}
        </Modal>
      </div>


      <Modal
        title="Edit User"
        open={isEditModalOpen}
        onCancel={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        footer={null}
        style={{ top: 120 }}
        className="users-edit-modal"
      >
        <Form form={editForm} layout="vertical" className="users-edit-form">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="firstname"
                label="First Name"
                rules={[{ required: true, message: "First name is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="lastname"
                label="Last Name"
                rules={[{ required: true, message: "Last name is required" }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="email" label="Email">
            <Input disabled />
          </Form.Item>

          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "Admin", label: "Admin" },
                { value: "User", label: "User" }
              ]}
            />
          </Form.Item>
        </Form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button
            type='primary'
            onClick={() => {
              setIsEditModalOpen(false);
              setEditingUser(null);
            }}
            className="usermanagement-remove-button">
            Cancel
          </Button>
          <Button
            type='primary'
            onClick={save}
            className="usermanagement-okmodal-button">
            Save
          </Button>
        </div>
      </Modal>


      {/* DELETE CONFIRMATION */}
      <Modal
        open={isDeleteModalOpen}
        className='signup-success-modal'
        closable={{ 'aria-label': 'Custom Close Button' }}
        footer={null}
        style={{ top: 220 }}
        onCancel={() => {
          setIsDeleteModalOpen(false);
        }}
      >
        <div className='signup-success-container'>
          <h1 className='signup-success-heading'>Delete User?</h1>
          <p className='signup-success-text'>Are you sure you want to delete this user?</p>

          <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

            <Button
              type='primary'
              className='logout-confirm-btn'
              onClick={() => {
                handleDelete(editingUser.id);
                setIsDeleteModalOpen(false);
              }}
            >
              Delete
            </Button>
            <Button
              type='primary'
              className='logout-cancel-btn'
              onClick={() => {
                setIsDeleteModalOpen(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>

          </div>

        </div>
      </Modal>

      {/* USER HAS BEEN EDITED MODAL */}
      <Modal
        open={isUserEditedModalOpen}
        className='signup-success-modal'
        closable={{ 'aria-label': 'Custom Close Button' }}
        footer={null}
        style={{ top: 220 }}
        onCancel={() => {
          setIsUserEditedModalOpen(false);
        }}
      >
        <div className='signup-success-container'>
          <h1 className='signup-success-heading'>User Edited Successfully!</h1>

          <div>
            <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
          </div>

          <p className='signup-success-text'>The user has been edited.</p>

          <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

            <Button
              type='primary'
              className='logout-confirm-btn'
              onClick={() => {
                setIsUserEditedModalOpen(false);
              }}
            >
              Continue
            </Button>
          </div>

        </div>
      </Modal>

      {/* USER HAS BEEN DELETED MODAL */}
      <Modal
        open={isUserDeletedModalOpen}
        className='signup-success-modal'
        closable={{ 'aria-label': 'Custom Close Button' }}
        footer={null}
        style={{ top: 220 }}
        onCancel={() => {
          setIsUserDeletedModalOpen(false);
        }}
      >
        <div className='signup-success-container'>
          <h1 className='signup-success-heading'>User Deleted Successfully!</h1>

          <div>
            <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
          </div>

          <p className='signup-success-text'>The user has been deleted.</p>

          <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

            <Button
              type='primary'
              className='logout-confirm-btn'
              onClick={() => {
                setIsUserDeletedModalOpen(false);
              }}
            >
              Continue
            </Button>
          </div>

        </div>
      </Modal>




    </ConfigProvider>
  );
}