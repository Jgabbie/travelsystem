import { Input, Select, Button, Table, Tag, Space, DatePicker } from "antd";
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import "../style/transaction.css";

export default function TransactionManagement() {

  const columns = [
    { title: "Transaction Reference", dataIndex: "ref" },
    { title: "Travel Package", dataIndex: "package" },
    { title: "Payment Date & Time", dataIndex: "date" },
    { title: "Total Price", dataIndex: "price" },
    { title: "Transaction Method", dataIndex: "method" },

    {
      title: "Status",
      dataIndex: "status",
      render: s => <Tag color="green">{s}</Tag>,
    },

    {
      title: "Actions",
      render: () => (
        <Space>
          <Button type="primary" icon={<EditOutlined />} />
          <Button danger icon={<DeleteOutlined />} />
        </Space>
      ),
    },
  ];

  const data = Array.from({ length: 8 }).map((_, i) => ({
    key: i,
    ref: "BKRF-87HDW82QJD",
    package: "Boracay4D2N",
    date: "November 25, 2024 10:02 AM",
    price: "₱21,000",
    method: "Bank Transfer",
    status: "Paid",
  }));

  return (
    <>
      <h1 className="page-header">Transaction Management</h1>

      <div className="transaction-actions">

        <Input
          prefix={<SearchOutlined />}
          placeholder="Search transaction..."
          className="search-input"
        />

        <Select placeholder="Method" style={{ width: 160 }} />

        <Select placeholder="Status" style={{ width: 140 }} />

        <DatePicker placeholder="Payment Date" />

        <Button type="primary">Export</Button>
      </div>

      <Table columns={columns} dataSource={data} pagination={{ pageSize: 6 }} />
    </>
  );
}
