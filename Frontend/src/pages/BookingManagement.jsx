import { Input, Select, Button, Table, Tag, Space, DatePicker } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import "../style/booking.css";

export default function BookingManagement() {

  const columns = [
    { title: "Reference", dataIndex: "ref" },
    { title: "Package", dataIndex: "pkg" },
    { title: "Travel Date", dataIndex: "travelDate" },
    { title: "Booking Date & Time", dataIndex: "bookingDate" },
    { title: "Travellers", dataIndex: "qty" },

    {
      title: "Status",
      dataIndex: "status",
      render: s => <Tag color="green">{s}</Tag>
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
    ref: `BKRF-${100 + i}`,
    pkg: "Boracay Tour",
    travelDate: "Jan 10, 2025",
    bookingDate: "Dec 28, 2024 10:30 AM",
    qty: 2,
    status: "Paid"
  }));

  return (
    <>
      <h1 className="page-header">Booking Management</h1>

      <div className="booking-actions">

        <Input
          prefix={<SearchOutlined />}
          placeholder="Search booking..."
          className="search-input"
        />

        <Select placeholder="Status" style={{ width: 140 }} />

        <DatePicker placeholder="Booking Date" />

        <DatePicker placeholder="Travel Date" />

        <Button type="primary">Export</Button>
      </div>

      <Table columns={columns} dataSource={data} pagination={{ pageSize: 6 }} />
    </>
  );
}
