import { Table, Input, Select, Button, Tag, Space, DatePicker } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import "../style/users.css";

export default function UserManagement() {

  const columns = [
    { title: "User ID", dataIndex: "id" },
    { title: "Name", dataIndex: "name" },
    { title: "Username", dataIndex: "username" },
    { title: "Email", dataIndex: "email" },
    { title: "Join Date", dataIndex: "joinDate" },
    { title: "Role", dataIndex: "role" },
    {
      title: "Status",
      dataIndex: "status",
      render: s => (
        <Tag color={s === "Active" ? "green" : "orange"}>{s}</Tag>
      )
    },
    {
      title: "Actions",
      render: () => (
        <Space>
          <Button type="primary" icon={<EditOutlined />} />
          <Button danger icon={<DeleteOutlined />} />
        </Space>
      )
    }
  ];

  const data = Array.from({ length: 8 }).map((_, i) => ({
    key: i,
    id: `USR-${1000 + i}`,
    name: "John Smith",
    username: "johnsmith",
    email: "john@gmail.com",
    joinDate: "Jan 12, 2024",
    role: "Customer",
    status: "Active",
  }));

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
          <Select.Option value="customer">Customer</Select.Option>
        </Select>

        <Select placeholder="Status" style={{ width: 140 }}>
          <Select.Option value="active">Active</Select.Option>
          <Select.Option value="inactive">Inactive</Select.Option>
          <Select.Option value="banned">Banned</Select.Option>
        </Select>

        <DatePicker placeholder="Join Date" />

        <Button type="primary">Add User</Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        pagination={{ pageSize: 6 }}
      />
    </>
  );
}
