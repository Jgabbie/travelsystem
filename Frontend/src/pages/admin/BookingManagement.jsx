import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Select, Button, Table, Tag, Space, DatePicker, Row, Col, Card, Statistic, Form, message, Modal, ConfigProvider } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../../config/axiosConfig";
import "../../style/admin/booking.css";

export default function BookingManagement() {

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bookingDateFilter, setBookingDateFilter] = useState(null);
  const [travelDateFilter, setTravelDateFilter] = useState(null);

  const [form] = Form.useForm();
  const [editingKey, setEditingKey] = useState("");

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get("/booking/all-bookings");
        const rows = (response.data || []).map((booking) => { //make sure that rows is always an array
          const details = booking.bookingDetails || {};
          const travelerCounts = details.travelers || {};
          const travelersTotal = Object.values(travelerCounts) //convert object values to array then sum it all up by using reduce to get the total number of travelers
            .reduce((sum, value) => sum + (Number(value) || 0), 0);

          const statusRaw = booking.status || "Pending"; //get status
          const statusFormatted =
            statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1); //capitalize first letter of status

          return { // create a new object for the table row
            key: booking._id,
            ref: booking.reference || booking._id,
            pkg: details.packageName || "Package",
            travelDate: details.travelDate || booking.createdAt,
            bookingDate: booking.createdAt,
            qty: travelersTotal || 0,
            status: statusFormatted
          };
        });
        setData(rows); //insert rows to data state
      } catch (error) {
        message.error("Unable to load bookings");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);


  //filter data
  const filteredData = useMemo(() => data.filter(item => {

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
  }), [data, searchText, statusFilter, bookingDateFilter, travelDateFilter]);

  // editing functions
  const isEditing = (record) => record.key === editingKey;

  const edit = (record) => {
    form.setFieldsValue({
      pkg: record.pkg,
      travelDate: dayjs(record.travelDate),
      bookingDate: dayjs(record.bookingDate),
      qty: record.qty,
      status: record.status
    });
    setEditingKey(record.key);
  };

  //cancel editing
  const cancel = () => {
    setEditingKey("");
  };


  //delete booking
  const handleDelete = (key) => {
    Modal.confirm({
      className: "booking-manage-confirm-modal",
      icon: null,
      title: (
        <div className="booking-manage-confirm-title" style={{ textAlign: "center" }}>
          Confirm Delete
        </div>
      ),
      content: (
        <div className="booking-manage-confirm-content" style={{ textAlign: "center" }}>
          <p className="booking-manage-confirm-text">Are you sure you want to delete this booking?</p>
        </div>
      ),
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { className: "booking-manage-confirm-btn" },
      cancelButtonProps: { className: "booking-manage-cancel-btn" },
      style: { top: 200 },
      onOk: async () => {
        try {
          await axiosInstance.delete(`/booking/${key}`);
          setData((prev) => prev.filter((item) => item.key !== key));
          message.success("Booking deleted");
        } catch (error) {
          message.error("Unable to delete booking");
        }
      }
    });
  };

  //handle view booking details
  const handleView = (key) => {
    const booking = data.find((item) => item.key === key);
    if (booking) {
      navigate(`/bookings/${key}/invoice`, { state: { booking } });
    }
  };

  //save edited booking
  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const newData = [...data];
      const index = newData.findIndex((item) => item.key === key);

      if (index > -1) {
        Modal.confirm({
          className: "booking-manage-confirm-modal",
          icon: null,
          title: (
            <div className="booking-manage-confirm-title" style={{ textAlign: "center" }}>
              Confirm Changes
            </div>
          ),
          content: (
            <div className="booking-manage-confirm-content" style={{ textAlign: "center" }}>
              <p className="booking-manage-confirm-text">Are you sure about these changes?</p>
            </div>
          ),
          okText: "Save",
          cancelText: "Cancel",
          okButtonProps: { className: "booking-manage-confirm-btn" },
          cancelButtonProps: { className: "booking-manage-cancel-btn" },
          style: { top: 200 },
          onOk: async () => { //merge the new values to the existing row data
            const updatedRow = { ...newData[index], ...row };
            if (dayjs.isDayjs(updatedRow.travelDate)) { //check if dates are dayjs objects and convert them to string format
              updatedRow.travelDate = updatedRow.travelDate.format("YYYY-MM-DD");
            }
            if (dayjs.isDayjs(updatedRow.bookingDate)) {
              updatedRow.bookingDate = updatedRow.bookingDate.format("YYYY-MM-DD");
            }

            try {
              const statusValue = updatedRow.status //make status lowercase
                ? updatedRow.status.toLowerCase()
                : undefined;

              const payload = { //object sent to the backend
                status: statusValue,
                bookingDetails: {
                  packageName: updatedRow.pkg,
                  travelDate: updatedRow.travelDate,
                  bookingDate: updatedRow.bookingDate,
                  travelers: { total: updatedRow.qty }
                }
              };

              const response = await axiosInstance.put(`/booking/${key}`, payload);
              const saved = response.data;
              const savedDetails = saved.bookingDetails || {};
              const statusRaw = saved.status || updatedRow.status || "pending";
              const statusFormatted =
                statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

              //replace old row with the updated one and update the table data
              //first parameter of splice is the index to start changing, second parameter is how many items to delete, third parameter is the new item to add
              newData.splice(index, 1, {
                ...updatedRow,
                pkg: savedDetails.packageName || updatedRow.pkg,
                travelDate: savedDetails.travelDate || updatedRow.travelDate,
                bookingDate: savedDetails.bookingDate || updatedRow.bookingDate,
                status: statusFormatted
              });

              setData(newData);
              setEditingKey("");
              message.success("Booking updated");
            } catch (error) {
              message.error("Unable to update booking");
            }
          }
        });
      }
    } catch {
      message.error("Please fix validation errors");
    }
  };

  //header columns
  const columns = [
    { title: "Reference", dataIndex: "ref" },
    { title: "Package", dataIndex: "pkg", editable: true },
    {
      title: "Travel Date",
      dataIndex: "travelDate",
      editable: true,
      render: d => dayjs(d).format("MMM DD, YYYY")
    },
    {
      title: "Booking Date",
      dataIndex: "bookingDate",
      editable: true,
      render: d => dayjs(d).format("MMM DD, YYYY")
    },
    { title: "Travellers", dataIndex: "qty", editable: true },
    {
      title: "Status",
      dataIndex: "status",
      editable: true,
      render: s => {
        const displayStatus = s === "Confirmed" ? "Successful" : s;
        const color = displayStatus === "Successful" ? "green" :
          displayStatus === "Pending" ? "orange" :
            "red";
        return <Tag color={color}>{displayStatus}</Tag>;
      }
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          {isEditing(record) ? (
            <>
              <Button
                className="savebutton-bookingmanagement"
                type="primary"
                onClick={() => save(record.key)}
              >
                Save
              </Button>
              <Button className="cancelbutton-bookingmanagement" onClick={cancel}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                className='viewbutton-bookingmanagement'
                type="primary"
                icon={<EyeOutlined />}
                onClick={() => handleView(record.key)}
                disabled={editingKey !== ""}
              />
              <Button
                className='editbutton-bookingmanagement'
                type="primary"
                icon={<EditOutlined />}
                onClick={() => edit(record)}
                disabled={editingKey !== ""}
              />
              <Button
                className='deletebutton-bookingmanagement'
                type="primary"
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



  //modify columns that can be editable
  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }

    //determine input type
    let inputType = "text";
    if (col.dataIndex === "status") inputType = "select";
    if (col.dataIndex === "travelDate" || col.dataIndex === "bookingDate") inputType = "date";

    //in every row, onCell is called to get current data(record), to determine inputType, and if the row is being edited
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

  //editable cell components
  const EditableCell = ({
    editing,
    dataIndex,
    inputType,
    children,
    ...restProps
  }) => {
    let inputNode = <Input />;

    if (inputType === "select") {
      inputNode = (
        <Select
          options={[
            { value: "Successful", label: "Successful" },
            { value: "Pending", label: "Pending" },
            { value: "Cancelled", label: "Cancelled" }
          ]}
        />
      );
    }

    if (inputType === "date") {
      inputNode = <DatePicker format="YYYY-MM-DD" />;
    }

    // if editing is true, render the input node, if not render the default cell value (children)
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


  const totalBookings = filteredData.length;
  const totalSuccessful = filteredData.filter(b => b.status === "Successful" || b.status === "Confirmed").length;
  const totalPending = filteredData.filter(b => b.status === "Pending").length;
  const totalCancelled = filteredData.filter(b => b.status === "Cancelled").length;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#305797"
        }
      }}
    >
      <div className="booking-management-container">
        <h1 className="page-header">Booking Management</h1>

        <Row gutter={16} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={6}>
            <Card className="booking-management-card">
              <Statistic
                title="Total"
                value={totalBookings}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={6}>
            <Card className="booking-management-card">
              <Statistic
                title="Pending"
                value={totalPending}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={6}>
            <Card className="booking-management-card">
              <Statistic
                title="Successful"
                value={totalSuccessful}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} sm={6}>
            <Card className="booking-management-card">
              <Statistic
                title="Cancelled"
                value={totalCancelled}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

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
            className="booking-select"
            placeholder="Status"
            style={{ width: 140 }}
            allowClear
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || "")}
            options={[
              { value: "Successful", label: "Successful" },
              { value: "Pending", label: "Pending" },
              { value: "Cancelled", label: "Cancelled" }
            ]}
          />

          <DatePicker
            className="booking-date-filter"
            placeholder="Booking Date"
            value={bookingDateFilter}
            onChange={(d) => setBookingDateFilter(d)}
            allowClear
          />

          <DatePicker
            className="booking-date-filter"
            placeholder="Travel Date"
            value={travelDateFilter}
            onChange={(d) => setTravelDateFilter(d)}
            allowClear
          />

          <Button className="exportbutton-bookingmanagement" type="primary">Export</Button>
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
              loading={loading}
              pagination={{ pageSize: 6 }}
              rowClassName="editable-row"
              scroll={{ x: "max-content" }}
            />
          </Form>
        </Card>
      </div>
    </ConfigProvider>
  );
}