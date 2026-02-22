import React, { useState } from "react";
import {
  Input, Select, Button, Table,
  Tag, Space, DatePicker, Row, Col,
  Card, Statistic, Form, message, Modal
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

  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState("");

  const [data, setData] = useState([
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
  ]);

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

  const isEditing = (record) => record.key === editingKey;

  const edit = (record) => {
    form.setFieldsValue({
      package: record.package,
      date: dayjs(record.date),
      price: record.price,
      method: record.method,
      status: record.status
    });
    setEditingKey(record.key);
  };

  const cancel = () => {
    setEditingKey("");
  };

  const handleDelete = (key) => {
    Modal.confirm({
      className: "logout-confirm-modal",
      icon: null,
      title: (
        <div className="logout-confirm-title" style={{ textAlign: "center" }}>
          Confirm Delete
        </div>
      ),
      content: (
        <div className="logout-confirm-content" style={{ textAlign: "center" }}>
          <p className="logout-confirm-text">Are you sure you want to delete this transaction?</p>
        </div>
      ),
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { className: "logout-confirm-btn" },
      cancelButtonProps: { className: "logout-cancel-btn" },
      onOk: () => {
        setData((prev) => prev.filter((item) => item.key !== key));
        message.success("Transaction deleted");
      }
    });
  };

  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const newData = [...data];
      const index = newData.findIndex((item) => item.key === key);

      if (index > -1) {
        Modal.confirm({
          className: "logout-confirm-modal",
          icon: null,
          title: (
            <div className="logout-confirm-title" style={{ textAlign: "center" }}>
              Confirm Changes
            </div>
          ),
          content: (
            <div className="logout-confirm-content" style={{ textAlign: "center" }}>
              <p className="logout-confirm-text">Are you sure about these changes?</p>
            </div>
          ),
          okText: "Save",
          cancelText: "Cancel",
          okButtonProps: { className: "logout-confirm-btn" },
          cancelButtonProps: { className: "logout-cancel-btn" },
          onOk: () => {
            const updatedRow = { ...newData[index], ...row };
            if (dayjs.isDayjs(updatedRow.date)) {
              updatedRow.date = updatedRow.date.format("YYYY-MM-DD HH:mm");
            }
            newData.splice(index, 1, updatedRow);
            setData(newData);
            setEditingKey("");
            message.success("Transaction updated");
          }
        });
      }
    } catch {
      message.error("Please fix validation errors");
    }
  };

  const columns = [
    { title: "Transaction Reference", dataIndex: "ref" },
    { title: "Travel Package", dataIndex: "package", editable: true },
    {
      title: "Payment Date & Time",
      dataIndex: "date",
      editable: true,
      render: d => dayjs(d).format("MMM DD, YYYY hh:mm A")
    },
    { title: "Total Price", dataIndex: "price", editable: true },
    { title: "Transaction Method", dataIndex: "method", editable: true },
    {
      title: "Status",
      dataIndex: "status",
      editable: true,
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
      render: (_, record) => (
        <Space>
          {isEditing(record) ? (
            <>
              <Button
                className="savebutton-transactionmanagement"
                type="primary"
                onClick={() => save(record.key)}
              >
                Save
              </Button>
              <Button className="cancelbutton-transactionmanagement" onClick={cancel}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                className="editbutton-transactionmanagement"
                type="primary"
                icon={<EditOutlined />}
                onClick={() => edit(record)}
                disabled={editingKey !== ""}
              />
              <Button
                className="deletebutton-transactionmanagement"
                danger
                icon={<DeleteOutlined />}
                disabled={editingKey !== ""}
                onClick={() => handleDelete(record.key)}
              />
            </>
          )}
        </Space>
      )
    }
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }

    let inputType = "text";
    if (col.dataIndex === "method") inputType = "method";
    if (col.dataIndex === "status") inputType = "status";
    if (col.dataIndex === "date") inputType = "date";

    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record)
      })
    };
  });

  const EditableCell = ({
    editing,
    dataIndex,
    inputType,
    children,
    ...restProps
  }) => {
    let inputNode = <Input />;

    if (inputType === "method") {
      inputNode = (
        <Select
          options={[
            { value: "Bank Transfer", label: "Bank Transfer" },
            { value: "GCash", label: "GCash" },
            { value: "Credit Card", label: "Credit Card" }
          ]}
        />
      );
    }

    if (inputType === "status") {
      inputNode = (
        <Select
          options={[
            { value: "Paid", label: "Paid" },
            { value: "Pending", label: "Pending" },
            { value: "Unpaid", label: "Unpaid" }
          ]}
        />
      );
    }

    if (inputType === "date") {
      inputNode = <DatePicker showTime format="YYYY-MM-DD HH:mm" />;
    }

    return (
      <td {...restProps}>
        {editing ? (
          <Form.Item
            name={dataIndex}
            style={{ margin: 0 }}
            rules={[{ required: true, message: `Please enter ${dataIndex}` }]}
          >
            {inputNode}
          </Form.Item>
        ) : (
          children
        )}
      </td>
    );
  };



  const totalTransactions = filteredData.length;
  const totalSuccessful = filteredData.filter(t => t.status === "Paid").length;
  const totalPending = filteredData.filter(t => t.status === "Pending").length;
  const totalUnpaid = filteredData.filter(t => t.status === "Unpaid").length;

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

        <Select
          className="transaction-select"
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
          className="transaction-select"
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

        <Button className="exportbutton-transactionmanagement" type="primary">Export</Button>
      </div>

      <Card>
        <Form form={form} component={false}>
          <Table
            components={{
              body: {
                cell: EditableCell
              }
            }}
            columns={mergedColumns}
            dataSource={filteredData}
            pagination={{ pageSize: 6 }}
            rowClassName="editable-row"
          />
        </Form>
      </Card>
    </div>
  );
}