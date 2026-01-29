import {
  Input,
  Button,
  Space,
  Select,
  Table,
  Tag,
  Pagination,
} from "antd";
import {
  SearchOutlined,
  ExportOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
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
      title: "Transaction Status",
      dataIndex: "status",
      render: (status) => <Tag color="green">{status}</Tag>,
    },
    {
      title: "Actions",
      render: () => (
        <Space>
          <Button icon={<InfoCircleOutlined />} />
          <Button danger icon={<DeleteOutlined />} />
        </Space>
      ),
    },
  ];

  const data = Array.from({ length: 8 }).map((_, i) => ({
    key: i,
    ref: "BKRF-87HDW82QJD",
    package: "Boracay4D2N",
    date: "November 25, 2024 10:02:00",
    price: "₱21,000",
    method: "Bank Transfer",
    status: "Paid",
  }));

  return (
    <div className="transaction-page">

      <h1>Transaction Management</h1>

      <Space className="filters" wrap>
        <Input
          placeholder="Enter Transaction Reference..."
          prefix={<SearchOutlined />}
          className="search"
        />

        <Select placeholder="Price" />
        <Select placeholder="Type" />
        <Select placeholder="Status" />

        <Button type="primary" icon={<ExportOutlined />}>
          Export
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        pagination={false}
        className="transaction-table"
      />

      <div className="pagination-area">
        <Pagination total={140} pageSize={8} showSizeChanger />
      </div>

    </div>
  );
}
