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
import dayjs from "dayjs";
import "../style/transaction.css";

export default function TransactionManagement() {

  const [searchText, setSearchText] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentDateFilter, setPaymentDateFilter] = useState(null);

  const data = [
    {
      key: 1,
      ref: "TRX-10021",
      package: "Boracay 4D3N Getaway",
      date: "2024-11-25 10:02",
      price: "₱21,000",
      method: "Bank Transfer",
      status: "Paid",
    },
    {
      key: 2,
      ref: "TRX-10022",
      package: "Palawan Island Adventure",
      date: "2024-12-01 14:45",
      price: "₱35,500",
      method: "GCash",
      status: "Paid",
    },
    {
      key: 3,
      ref: "TRX-10023",
      package: "Bohol Nature Tour",
      date: "2024-12-10 09:15",
      price: "₱12,000",
      method: "Credit Card",
      status: "Pending",
    },
    {
      key: 4,
      ref: "TRX-10024",
      package: "Cebu City Escape",
      date: "2024-12-18 18:30",
      price: "₱18,800",
      method: "Bank Transfer",
      status: "Unpaid",
    },
    {
      key: 5,
      ref: "TRX-10025",
      package: "Siargao Surf Experience",
      date: "2025-01-05 11:00",
      price: "₱27,000",
      method: "GCash",
      status: "Paid",
    }
  ];

  // ================= FILTER LOGIC =================

  const filteredData = data.filter(item => {

    const matchesSearch =
      item.ref.toLowerCase().includes(searchText.toLowerCase()) ||
      item.package.toLowerCase().includes(searchText.toLowerCase()) ||
      item.method.toLowerCase().includes(searchText.toLowerCase()) ||
      item.status.toLowerCase().includes(searchText.toLowerCase());

    const matchesMethod =
      methodFilter === "" || item.method === methodFilter;

    const matchesStatus =
      statusFilter === "" || item.status === statusFilter;

    const matchesPaymentDate =
      !paymentDateFilter ||
      dayjs(item.date).isSame(paymentDateFilter, "day");

    return (
      matchesSearch &&
      matchesMethod &&
      matchesStatus &&
      matchesPaymentDate
    );
  });

  // ================= TABLE =================

  const columns = [
    { title: "Transaction Reference", dataIndex: "ref" },
    { title: "Travel Package", dataIndex: "package" },
    {
      title: "Payment Date & Time",
      dataIndex: "date",
      render: d => dayjs(d).format("MMM DD, YYYY hh:mm A")
    },
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

  // ================= STATS (LIVE) =================

  const totalTransactions = filteredData.length;
  const totalSuccessful = filteredData.filter(t => t.status === "Paid").length;
  const totalPending = filteredData.filter(t => t.status === "Pending").length;
  const totalUnpaid = filteredData.filter(t => t.status === "Unpaid").length;

  return (
    <div>
      <h1 className="page-header">Transaction Management</h1>

      {/* 📊 STATS */}
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

      {/* 🔧 FILTER BAR */}
      <div className="transaction-actions">

        <Input
          prefix={<SearchOutlined />}
          placeholder="Search reference, package, method or status..."
          className="search-input"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <Select
          placeholder="Method"
          style={{ width: 160 }}
          allowClear
          value={methodFilter || undefined}
          onChange={(v) => setMethodFilter(v || "")}
          options={[
            { value: "Bank Transfer", label: "Bank Transfer" },
            { value: "GCash", label: "GCash" },
            { value: "Credit Card", label: "Credit Card" }
          ]}
        />

        <Select
          placeholder="Status"
          style={{ width: 140 }}
          allowClear
          value={statusFilter || undefined}
          onChange={(v) => setStatusFilter(v || "")}
          options={[
            { value: "Paid", label: "Paid" },
            { value: "Pending", label: "Pending" },
            { value: "Unpaid", label: "Unpaid" }
          ]}
        />

        <DatePicker
          placeholder="Payment Date"
          value={paymentDateFilter}
          onChange={(d) => setPaymentDateFilter(d)}
          allowClear
        />

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