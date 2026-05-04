import React, { useState, useEffect } from 'react';
import { Table, Input, Select, Button, Form, Modal, Tag, Space, Row, Col, Statistic, Card, ConfigProvider, Avatar, notification } from "antd";
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
  CheckCircleFilled,
  InboxOutlined
} from "@ant-design/icons";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import AddUserModal from "../../components/modals/AddUserModal";
import apiFetch from '../../config/fetchConfig';
import "../../style/admin/users.css";
import "../../style/components/modals/modaldesign.css";


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
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState("Customer");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUserEditedModalOpen, setIsUserEditedModalOpen] = useState(false);
  const [isUserDeletedModalOpen, setIsUserDeletedModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isUserRestoredModalOpen, setIsUserRestoredModalOpen] = useState(false);

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
        role: user.role || "Customer",
        status: user.isAccountVerified ? "Verified" : "Pending",
        avatar: user.profilePicture || user.profileImage || user.avatar || "",
        phone: user.phone || "",
        address: user.address || "",
        createdAt: user.createdAt || "",
        lastLogin: user.lastLogin || ""
      }));
      setUsers(formattedData);
    } catch {
      notification.error({ message: "Failed to load users", placement: "topRight" });
    } finally {
      setLoading(false);
    }
  };

  const getArchivedUsers = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get('/user/getArchivedUsers', { withCredentials: true });
      const formattedData = response.map(user => ({
        key: user._id,
        id: user.originalUserId || user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        name: `${user.firstname} ${user.lastname}`,
        username: user.username,
        email: user.email,
        role: user.role || "Customer",
        status: user.isAccountVerified ? "Verified" : "Pending",
        avatar: user.profileImage || "",
        phone: user.phone || "",
        archivedAt: user.archivedAt || ""
      }));
      setArchivedUsers(formattedData);
    } catch {
      notification.error({ message: "Failed to load archived users", placement: "topRight" });
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
    notification.success({ message: "Report exported to PDF successfully.", placement: "topRight" });
  };

  const handleArchive = async (key) => {
    try {
      await apiFetch.delete(`/user/deleteUsers/${key}`, { withCredentials: true });
      setIsDeleteModalOpen(false);
      setIsUserDeletedModalOpen(true);
      getUsers();
    } catch { notification.error({ message: "Archive failed", placement: "topRight" }); }
  };

  const handleRestore = async (key) => {
    try {
      await apiFetch.post(`/user/archived-users/${key}/restore`, {}, { withCredentials: true });
      setIsUserRestoredModalOpen(true);
      notification.success({ message: "User restored successfully", placement: "topRight" });
      setArchivedUsers((prev) => prev.filter((item) => item.key !== key));

    } catch (error) {
      notification.error({ message: error?.response?.data?.message || "User restore failed", placement: "topRight" });
    }
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

      notification.success({ message: "User updated", placement: "topRight" });
      setIsEditModalOpen(false);
      setIsUserEditedModalOpen(true);
      setEditingUser(null);
      editForm.resetFields();
      getUsers();
    } catch {
      notification.error({ message: "Update failed", placement: "topRight" });
    }
  };

  const currentUsers = showArchived ? archivedUsers : users;

  const filteredUsers = currentUsers.filter(user => {
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
      render: role => <Tag color={role === "Admin" ? "purple" : role === "Employee" ? "blue" : "volcano"}>{role}</Tag>
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
          </Button>

          <Button
            className='usermanagement-edit-button'
            type="primary"
            icon={<EditOutlined />}
            onClick={() => edit(record)}
          >
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
          </Button>
        </Space >
      )
    }
  ];

  const archivedColumns = [
    { title: "Name", dataIndex: "name" },
    { title: "Username", dataIndex: "username" },
    { title: "Email", dataIndex: "email" },
    {
      title: "Role",
      dataIndex: "role",
      render: role => <Tag color={role === "Admin" ? "purple" : role === "Employee" ? "blue" : "volcano"}>{role}</Tag>
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
            className='usermanagement-restore-button'
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => {
              setEditingUser(record);
              setIsRestoreModalOpen(true);
            }}
          >
            Restore
          </Button>
        </Space>
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

        {!showArchived && (
          <Row className='usermanagement-statistics' gutter={16} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={8}><Card><Statistic title="Total Users" value={users.length} prefix={<UserOutlined />} /></Card></Col>
            <Col xs={24} sm={8}><Card><Statistic title="Verified Users" value={users.filter(u => u.status === "Verified").length} prefix={<CheckCircleOutlined />} /></Card></Col>
            <Col xs={24} sm={8}><Card><Statistic title="Unverified Users" value={users.filter(u => u.status === "Pending").length} prefix={<ExclamationCircleOutlined />} /></Card></Col>
          </Row>
        )}

        <Card className="usermanagement-actions">
          <div className="usermanagement-actions-row">
            <div className="usermanagement-actions-filters">
              <div className="usermanagement-actions-field usermanagement-actions-field--search">
                <label className="usermanagement-label">Search</label>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Search..."
                  className="usermanagement-search-input"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear />
              </div>

              <div className="usermanagement-actions-field">
                <label className="usermanagement-label">Role</label>
                <Select
                  placeholder="Role"
                  className="usermanagement-select"
                  allowClear
                  onChange={(v) => setRoleFilter(v || "")}
                  options={[
                    { value: "Admin", label: "Admin" },
                    { value: "Customer", label: "Customer" },
                    { value: "Employee", label: "Employee" }
                  ]}
                />
              </div>

              <div className="usermanagement-actions-field">
                <label className="usermanagement-label">Status</label>
                <Select
                  placeholder="Status"
                  className="usermanagement-select"
                  allowClear
                  onChange={(v) => setStatusFilter(v || "")}
                  options={[
                    { value: "Verified", label: "Verified" },
                    { value: "Pending", label: "Pending" }
                  ]}
                />
              </div>
            </div>

            <div className="usermanagement-actions-buttons">
              <Button
                className='usermanagement-add-button'
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsModalOpen(true)}
                disabled={showArchived}
              >
                Add User
              </Button>

              <Button
                className='usermanagement-export-button'
                type="primary"
                icon={<FilePdfOutlined />}
                onClick={generatePDF}
              >
                Export to PDF
              </Button>

              <Button
                icon={showArchived ? <UserOutlined /> : <InboxOutlined />}
                className='usermanagement-archive-button'
                type="primary"
                onClick={() => {
                  const nextValue = !showArchived;
                  setShowArchived(nextValue);
                  setSearchText("");
                  setRoleFilter("");
                  setStatusFilter("");
                  if (nextValue) {
                    getArchivedUsers();
                  } else {
                    getUsers();
                  }
                }}
              >
                {showArchived ? 'Back' : 'Archives'}
              </Button>
            </div>
          </div>
        </Card>

        <Card style={{ marginTop: 20 }}>
          <Form form={form} component={false}>
            <Table
              className='usermanagement-table'
              loading={loading}
              columns={showArchived ? archivedColumns : columns}
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
          centered={true}
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
                    <Tag color={selectedUser.role === "Admin" ? "purple" : selectedUser.role === "Customer" ? "volcano" : "blue"}>{selectedUser.role}</Tag>
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
        centered={true}
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
                { value: "Customer", label: "Customer" },
                { value: "Employee", label: "Employee" }
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
            className="modal-button-cancel">
            Cancel
          </Button>
          <Button
            type='primary'
            onClick={save}
            className="modal-button">
            Save
          </Button>
        </div>
      </Modal>


      {/* ARCHIVE CONFIRMATION */}
      <Modal
        open={isDeleteModalOpen}
        closable={{ 'aria-label': 'Custom Close Button' }}
        footer={null}
        centered={true}
        onCancel={() => {
          setIsDeleteModalOpen(false);
        }}
      >
        <div className='modal-container'>
          <h1 className='modal-heading'>Archive User?</h1>
          <p className='modal-text'>Are you sure you want to archive this user?</p>

          <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

            <Button
              type='primary'
              className='modal-button'
              onClick={() => {
                handleArchive(editingUser.key);
                setIsDeleteModalOpen(false);
              }}
            >
              Archive
            </Button>
            <Button
              type='primary'
              className='modal-button-cancel'
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


      {/* RESTORE CONFIRMATION */}
      <Modal
        open={isRestoreModalOpen}
        closable={{ 'aria-label': 'Custom Close Button' }}
        footer={null}
        centered={true}
        onCancel={() => {
          setIsRestoreModalOpen(false);
        }}
      >
        <div className='modal-container'>
          <h1 className='modal-heading'>Restore User?</h1>
          <p className='modal-text'>Are you sure you want to restore this user?</p>

          <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

            <Button
              type='primary'
              className='modal-button'
              onClick={() => {
                handleRestore(editingUser.key);
                setIsRestoreModalOpen(false);
              }}
            >
              Restore
            </Button>
            <Button
              type='primary'
              className='modal-button-cancel'
              onClick={() => {
                setIsRestoreModalOpen(false);
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
        closable={{ 'aria-label': 'Custom Close Button' }}
        footer={null}
        centered={true}
        onCancel={() => {
          setIsUserEditedModalOpen(false);
        }}
      >
        <div className='modal-container'>
          <h1 className='modal-heading'>User Edited Successfully!</h1>

          <div>
            <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
          </div>

          <p className='modal-text'>The user has been edited.</p>

          <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

            <Button
              type='primary'
              className='modal-button'
              onClick={() => {
                setIsUserEditedModalOpen(false);
              }}
            >
              Continue
            </Button>
          </div>

        </div>
      </Modal>

      {/* USER HAS BEEN ARCHIVED MODAL */}
      <Modal
        open={isUserDeletedModalOpen}
        closable={{ 'aria-label': 'Custom Close Button' }}
        footer={null}
        centered={true}
        onCancel={() => {
          setIsUserDeletedModalOpen(false);
        }}
      >
        <div className='modal-container'>
          <h1 className='modal-heading'>User Archived Successfully!</h1>

          <div>
            <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
          </div>

          <p className='modal-text'>The user has been archived.</p>

          <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

            <Button
              type='primary'
              className='modal-button'
              onClick={() => {
                setIsUserDeletedModalOpen(false);
              }}
            >
              Continue
            </Button>
          </div>

        </div>
      </Modal>


      {/* USER HAS BEEN RESTORED MODAL */}
      <Modal
        open={isUserRestoredModalOpen}
        closable={{ 'aria-label': 'Custom Close Button' }}
        footer={null}
        centered={true}
        onCancel={() => {
          setIsUserRestoredModalOpen(false);
        }}
      >
        <div className='modal-container'>
          <h1 className='modal-heading'>User Restored Successfully!</h1>

          <div>
            <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
          </div>

          <p className='modal-text'>The user has been restored.</p>

          <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

            <Button
              type='primary'
              className='modal-button'
              onClick={() => {
                setIsUserRestoredModalOpen(false);
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