import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Select, Button, Table, Tag, Space, DatePicker, Row, Col, Card, Statistic, Form, message, Modal, ConfigProvider } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, FilePdfOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axiosInstance from "../../config/axiosConfig";
import "../../style/admin/booking.css";
import { useAuth } from "../../hooks/useAuth";


const getBase64ImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

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
  const { auth } = useAuth();
  const isEmployee = auth?.role === 'Employee';
  const basePath = isEmployee ? '/employee' : '';

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const response = await axiosInstance.get("/booking/all-bookings");

        const bookings = response.data.map((b) => ({
          key: b._id,
          ref: b.reference || b._id,
          username: b.userId?.username || "Customer Name",
          pkg: b.bookingDetails?.packageName || "Package",
          travelDate: b.bookingDetails?.travelDate ? dayjs(b.bookingDetails.travelDate).format('MMM DD, YYYY') : dayjs(b.createdAt).format('MMM DD, YYYY'),
          bookingDate: dayjs(b.createdAt).format('MMM DD, YYYY'),
          qty: b.bookingDetails?.travelers?.total || 0,
          status: b.status?.charAt(0)?.toUpperCase() + b.status?.slice(1) || "Pending",
          bookingDetails: b.bookingDetails || {}
        }));

        setData(bookings);
      } catch (error) {
        message.error("Unable to load bookings");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);


  const filteredData = data.filter(item => {
    const matchesSearch =
      (item.username.toLowerCase().includes(searchText.toLowerCase())) ||
      (dayjs(item.travelDate).format('MMM DD, YYYY').toLowerCase().includes(searchText.toLowerCase())) ||
      (dayjs(item.bookingDate).format('MMM DD, YYYY').toLowerCase().includes(searchText.toLowerCase())) ||
      (item.qty.toString().toLowerCase().includes(searchText.toLowerCase())) ||
      (item.ref.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.pkg.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.status.toLowerCase().includes(searchText.toLowerCase()));

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
    )
  })


  const generatePDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');

    const tableColumn = ["Reference", "Package", "Travel Date", "Booking Date", "Travellers", "Status"];

    const tableRows = filteredData.map(item => [
      item.ref,
      item.pkg,
      dayjs(item.travelDate).format("MMM DD, YYYY"),
      dayjs(item.bookingDate).format("MMM DD, YYYY"),
      item.qty,
      item.status
    ]);

    try {
      const imgData = await getBase64ImageFromURL("/images/Logo.png");
      doc.addImage(imgData, "PNG", 14, 12, 22, 22);
    } catch (e) {
      console.warn("Logo not found at /public/images/Logo.png");
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("M&RC TRAVEL AND TOURS", 40, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1, Brgy", 40, 23);
    doc.text("San Antonio, Paranaque City, Philippines, 1709 PHL", 40, 27);
    doc.text("+639690554806 | info1@mrctravels.com", 40, 31);

    doc.setDrawColor(48, 87, 151);
    doc.line(14, 38, 196, 38); // Line width reset for Portrait

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(48, 87, 151);
    doc.text("BOOKING MANAGEMENT REPORT", 14, 48);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Date Generated: ${new Date().toLocaleString()}`, 14, 55);

    let tableStartY = 62;
    if (searchText) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Search Criteria: "${searchText}"`, 14, 62);
      tableStartY = 68;
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: tableStartY,
      styles: { fontSize: 7.5 }, // Slightly smaller font to fit 6 columns in Portrait
      headStyles: { fillColor: [48, 87, 151] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 }
    });

    doc.save(`Booking_Report_${new Date().toLocaleDateString()}.pdf`);
    message.success("Report exported to PDF successfully.");
  };

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

  const cancel = () => {
    setEditingKey("");
  };

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

  const handleView = (key) => {
    const booking = data.find((item) => item.key === key);
    if (booking) {
      navigate(`${basePath}/bookings/${key}/invoice`, { state: { booking } });
    }
  };

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
          onOk: async () => {
            const updatedRow = { ...newData[index], ...row };
            if (dayjs.isDayjs(updatedRow.travelDate)) {
              updatedRow.travelDate = updatedRow.travelDate.format("YYYY-MM-DD");
            }
            if (dayjs.isDayjs(updatedRow.bookingDate)) {
              updatedRow.bookingDate = updatedRow.bookingDate.format("YYYY-MM-DD");
            }

            try {
              const statusValue = updatedRow.status
                ? updatedRow.status.toLowerCase()
                : undefined;

              const payload = {
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

  const columns = [
    { title: "Booking Reference", dataIndex: "ref" },
    { title: "Travel Package", dataIndex: "pkg", editable: true },
    { title: "Customer Name", dataIndex: "username", editable: true },
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
    { title: "Travelers", dataIndex: "qty", editable: true },
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

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    let inputType = "text";
    if (col.dataIndex === "status") inputType = "select";
    if (col.dataIndex === "travelDate" || col.dataIndex === "bookingDate") inputType = "date";

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
              <Statistic title="Total" value={totalBookings} prefix={<CalendarOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card className="booking-management-card">
              <Statistic title="Pending" value={totalPending} prefix={<ClockCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card className="booking-management-card">
              <Statistic title="Successful" value={totalSuccessful} prefix={<CheckCircleOutlined />} />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card className="booking-management-card">
              <Statistic title="Cancelled" value={totalCancelled} prefix={<CloseCircleOutlined />} />
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
          <Space style={{ marginLeft: 'auto' }}>
            <Button className='export-pdf-button' type="primary" icon={<FilePdfOutlined />} onClick={generatePDF}>Export to PDF</Button>
          </Space>
        </div>

        <Card>
          <Form form={form} component={false}>
            <Table
              components={{ body: { cell: EditableCell } }}
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