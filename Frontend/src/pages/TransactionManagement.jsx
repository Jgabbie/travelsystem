import React, { useState } from "react";
import {
  Input, Select, Button, Table,
  Tag, Space, DatePicker, Row, Col,
  Card, Statistic
} from "antd";
import {
  SearchOutlined, EditOutlined,
  DeleteOutlined, SwapOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
  CloseCircleOutlined
} from "@ant-design/icons";

import "../style/transaction.css";

export default function TransactionManagement() {

  const [searchText, setSearchText] = useState("");

  const data = [
    {
      key: 1,
      ref: "TRX-10021",
      package: "Boracay 4D3N Getaway",
      date: "Nov 25, 2024 10:02 AM",
      price: "₱21,000",
      method: "Bank Transfer",
      status: "Paid",
    },
    {
      key: 2,
      ref: "TRX-10022",
      package: "Palawan Island Adventure",
      date: "Dec 1, 2024 2:45 PM",
      price: "₱35,500",
      method: "GCash",
      status: "Paid",
    },
    {
      key: 3,
      ref: "TRX-10023",
      package: "Bohol Nature Tour",
      date: "Dec 10, 2024 9:15 AM",
      price: "₱12,000",
      method: "Credit Card",
      status: "Pending",
    },
    {
      key: 4,
      ref: "TRX-10024",
      package: "Cebu City Escape",
      date: "Dec 18, 2024 6:30 PM",
      price: "₱18,800",
      method: "Bank Transfer",
      status: "Unpaid",
    },
    {
      key: 5,
      ref: "TRX-10025",
      package: "Siargao Surf Experience",
      date: "Jan 5, 2025 11:00 AM",
      price: "₱27,000",
      method: "GCash",
      status: "Paid",
    }
  ];


  const filteredData = data.filter(item =>
    item.ref.toLowerCase().includes(searchText.toLowerCase()) ||
    item.package.toLowerCase().includes(searchText.toLowerCase()) ||
    item.method.toLowerCase().includes(searchText.toLowerCase()) ||
    item.status.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    { title: "Transaction Reference", dataIndex: "ref" },
    { title: "Travel Package", dataIndex: "package" },
    { title: "Payment Date & Time", dataIndex: "date" },
    { title: "Total Price", dataIndex: "price" },
    { title: "Transaction Method", dataIndex: "method" },
    {
      title: "Status",
      dataIndex: "status",
      render: s => (
        <Tag
          color={
            s === "Paid" ? "green" :
              s === "Pending" ? "orange" :
                "red"
          }
        >
          {s}
        </Tag>
      ),
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

  const totalTransactions = data.length;
  const totalSuccessful = data.filter(item => item.status === "Paid").length;
  const totalPending = data.filter(item => item.status === "Pending").length;
  const totalUnpaid = data.filter(item => item.status === "Unpaid").length;

  return (
    <div>
      <h1 className="page-header">Transaction Management</h1>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Transactions"
              value={totalTransactions}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Successful"
              value={totalSuccessful}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Pending"
              value={totalPending}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Unpaid"
              value={totalUnpaid}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <div className="transaction-actions">


        <Input
          prefix={<SearchOutlined />}
          placeholder="Search reference, package, method or status..."
          className="search-input"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <Select placeholder="Method" style={{ width: 160 }} />

        <Select placeholder="Status" style={{ width: 140 }} />

        <DatePicker placeholder="Payment Date" />

        <Button type="primary">Export</Button>
      </div>
      <Card>
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={{ pageSize: 6 }}
        />
      </Card>
    </div>
  );
}