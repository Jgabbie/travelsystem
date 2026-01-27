import { Input, Select, Button, Table, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import "../styles/booking.css";

export default function BookingManagement() {
  const columns = [
    { title: "Reference", dataIndex: "ref" },
    { title: "Package", dataIndex: "pkg" },
    { title: "Travel Date", dataIndex: "date" },
    {
      title: "Status",
      dataIndex: "status",
      render: s => <Tag color="green">{s}</Tag>
    }
  ];

  const data = Array.from({ length: 8 }).map((_, i) => ({
    key: i,
    ref: "BKRF-" + i,
    pkg: "Boracay Tour",
    date: "Jan 10, 2025",
    status: "Paid"
  }));

  return (
    <>
      <h1 className="page-header">Booking Management</h1>

      <div className="filter-bar">
        <Input prefix={<SearchOutlined />} placeholder="Search booking..." />
        <Select placeholder="Status" />
        <Button type="primary">Export</Button>
      </div>

      <Table columns={columns} dataSource={data} />
    </>
  );
}
