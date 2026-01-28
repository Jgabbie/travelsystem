import { Table, Input, Select, Button, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import "../style/users.css";

export default function UserManagement() {
  const columns = [
    { title: "Name", dataIndex: "name" },
    { title: "Email", dataIndex: "email" },
    { title: "Role", dataIndex: "role" },
    {
      title: "Status",
      dataIndex: "status",
      render: s => <Tag color="green">{s}</Tag>
    }
  ];

  const data = Array.from({ length: 8 }).map((_, i) => ({
    key: i,
    name: "John Smith",
    email: "john@gmail.com",
    role: "Customer",
    status: "Active"
  }));

  return (
    <>
      <h1 className="page-header">User Management</h1>

      <div className="user-actions">
        <Input prefix={<SearchOutlined />} placeholder="Search user..." />
        <Select placeholder="Role" />
        <Button type="primary">Add User</Button>
      </div>

      <Table columns={columns} dataSource={data} />
    </>
  );
}
