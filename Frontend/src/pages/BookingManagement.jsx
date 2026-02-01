import React, { useState } from "react";
import {
  Input, Select, Button, Table,
  Tag, Space, DatePicker, Row,
  Col, Card, Statistic
} from "antd";
import {
  SearchOutlined, EditOutlined,
  DeleteOutlined, CalendarOutlined,
  ClockCircleOutlined, CheckCircleOutlined,
  CloseCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import "../style/booking.css";

export default function BookingManagement() {

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bookingDateFilter, setBookingDateFilter] = useState(null);
  const [travelDateFilter, setTravelDateFilter] = useState(null);

  const data = [
    {
      key: 1,
      ref: "BKRF-101",
      pkg: "Boracay Beach Tour",
      travelDate: "2025-01-10",
      bookingDate: "2024-12-28",
      qty: 2,
      status: "Confirmed"
    },
    {
      key: 2,
      ref: "BKRF-102",
      pkg: "Palawan Island Hopping",
      travelDate: "2025-02-05",
      bookingDate: "2025-01-01",
      qty: 4,
      status: "Pending"
    },
    {
      key: 3,
      ref: "BKRF-103",
      pkg: "Bohol Countryside Tour",
      travelDate: "2025-03-20",
      bookingDate: "2025-02-10",
      qty: 1,
      status: "Confirmed"
    },
    {
      key: 4,
      ref: "BKRF-104",
      pkg: "Cebu City Adventure",
      travelDate: "2025-04-02",
      bookingDate: "2025-03-12",
      qty: 3,
      status: "Cancelled"
    },
    {
      key: 5,
      ref: "BKRF-105",
      pkg: "Siargao Surf Trip",
      travelDate: "2025-05-15",
      bookingDate: "2025-04-01",
      qty: 2,
      status: "Pending"
    }
  ];

  // ================= FILTER LOGIC =================

  const filteredData = data.filter(item => {

    const matchesSearch =
      item.ref.toLowerCase().includes(searchText.toLowerCase()) ||
      item.pkg.toLowerCase().includes(searchText.toLowerCase()) ||
      item.status.toLowerCase().includes(searchText.toLowerCase());

    const matchesStatus =
      statusFilter === "" || item.status === statusFilter;

    const matchesBookingDate =
      !bookingDateFilter ||
      dayjs(item.bookingDate).isSame(bookingDateFilter, "day");

    const matchesTravelDate =
      !travelDateFilter ||
      dayjs(item.travelDate).isSame(travelDateFilter, "day");

    return (
      matchesSearch &&
      matchesStatus &&
      matchesBookingDate &&
      matchesTravelDate
    );
  });

  // ================= TABLE =================

  const columns = [
    { title: "Reference", dataIndex: "ref" },
    { title: "Package", dataIndex: "pkg" },
    {
      title: "Travel Date",
      dataIndex: "travelDate",
      render: d => dayjs(d).format("MMM DD, YYYY")
    },
    {
      title: "Booking Date",
      dataIndex: "bookingDate",
      render: d => dayjs(d).format("MMM DD, YYYY")
    },
    { title: "Travellers", dataIndex: "qty" },
    {
      title: "Status",
      dataIndex: "status",
      render: s => (
        <Tag
          color={
            s === "Confirmed" ? "green" :
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

  // ================= STATS =================

  const totalBookings = filteredData.length;
  const totalConfirmed = filteredData.filter(b => b.status === "Confirmed").length;
  const totalPending = filteredData.filter(b => b.status === "Pending").length;
  const totalCancelled = filteredData.filter(b => b.status === "Cancelled").length;

  return (
    <div>
      <h1 className="page-header">Booking Management</h1>

      {/* 📊 STATS */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total"
              value={totalBookings}
              prefix={<CalendarOutlined />}
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
              title="Confirmed"
              value={totalConfirmed}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Cancelled"
              value={totalCancelled}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 🔧 FILTER BAR */}
      <div className="booking-actions">

        <Input
          prefix={<SearchOutlined />}
          placeholder="Search reference, package or status..."
          className="search-input"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <Select
          placeholder="Status"
          style={{ width: 140 }}
          allowClear
          value={statusFilter || undefined}
          onChange={(v) => setStatusFilter(v || "")}
          options={[
            { value: "Confirmed", label: "Confirmed" },
            { value: "Pending", label: "Pending" },
            { value: "Cancelled", label: "Cancelled" }
          ]}
        />

        <DatePicker
          placeholder="Booking Date"
          value={bookingDateFilter}
          onChange={(d) => setBookingDateFilter(d)}
          allowClear
        />

        <DatePicker
          placeholder="Travel Date"
          value={travelDateFilter}
          onChange={(d) => setTravelDateFilter(d)}
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