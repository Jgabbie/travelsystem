import React, { useState } from "react";
import { Input, Select, Button, Table, Tag, Space, DatePicker } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import "../style/booking.css";

export default function BookingManagement() {

  const [searchText, setSearchText] = useState("");

  const data = [
    {
      key: 1,
      ref: "BKRF-101",
      pkg: "Boracay Beach Tour",
      travelDate: "Jan 10, 2025",
      bookingDate: "Dec 28, 2024 10:30 AM",
      qty: 2,
      status: "Paid"
    },
    {
      key: 2,
      ref: "BKRF-102",
      pkg: "Palawan Island Hopping",
      travelDate: "Feb 5, 2025",
      bookingDate: "Jan 1, 2025 3:15 PM",
      qty: 4,
      status: "Pending"
    },
    {
      key: 3,
      ref: "BKRF-103",
      pkg: "Bohol Countryside Tour",
      travelDate: "Mar 20, 2025",
      bookingDate: "Feb 10, 2025 9:00 AM",
      qty: 1,
      status: "Cancelled"
    },
    {
      key: 4,
      ref: "BKRF-104",
      pkg: "Cebu City Adventure",
      travelDate: "Apr 2, 2025",
      bookingDate: "Mar 12, 2025 1:45 PM",
      qty: 3,
      status: "Paid"
    },
    {
      key: 5,
      ref: "BKRF-105",
      pkg: "Siargao Surf Trip",
      travelDate: "May 15, 2025",
      bookingDate: "Apr 1, 2025 11:20 AM",
      qty: 2,
      status: "Pending"
    }
  ];


  const filteredData = data.filter(item =>
    item.ref.toLowerCase().includes(searchText.toLowerCase()) ||
    item.pkg.toLowerCase().includes(searchText.toLowerCase()) ||
    item.status.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    { title: "Reference", dataIndex: "ref" },
    { title: "Package", dataIndex: "pkg" },
    { title: "Travel Date", dataIndex: "travelDate" },
    { title: "Booking Date & Time", dataIndex: "bookingDate" },
    { title: "Travellers", dataIndex: "qty" },
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

  return (
    <>
      <h1 className="page-header">Booking Management</h1>

      <div className="booking-actions">


        <Input
          prefix={<SearchOutlined />}
          placeholder="Search reference, package or status..."
          className="search-input"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />

        <Select placeholder="Status" style={{ width: 140 }} />

        <DatePicker placeholder="Booking Date" />

        <DatePicker placeholder="Travel Date" />

        <Button type="primary">Export</Button>
      </div>

      <Table
        columns={columns}
        dataSource={filteredData}
        pagination={{ pageSize: 6 }}
      />
    </>
  );
}