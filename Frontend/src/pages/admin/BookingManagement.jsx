import React, { useEffect, useState } from "react";
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

  const [editForm] = Form.useForm();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

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
          pkg: b.packageId?.packageName || "Package",
          travelDate: b.travelDate ? dayjs(b.travelDate.split(' - ')[0]).format('MMM DD, YYYY') : dayjs(b.travelDate).format('MMM DD, YYYY'), //get start date
          bookingDate: dayjs(b.createdAt).format('MMM DD, YYYY'),
          qty: b.travelers || 0,
          status: (() => {
            const rawStatus = b.status || "";
            const formatted = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
            const normalized = formatted.toLowerCase();
            if (normalized === "successful" || normalized === "fully paid") {
              return "Fully Paid";
            }
            return formatted || "Pending";
          })(),

          bookingDetails: b.bookingDetails || {} //no booking details for now
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
      doc.addImage(imgData, "PNG", 14, 12, 30, 22);
    } catch (e) {
      console.warn("Logo not found at /public/images/Logo.png");
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("M&RC TRAVEL AND TOURS", 50, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1, Brgy", 50, 23);
    doc.text("San Antonio, Paranaque City, Philippines, 1709 PHL", 50, 27);
    doc.text("+639690554806 | info1@mrctravels.com", 50, 31);

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

  const edit = (record) => {
    setEditingBooking(record);
    editForm.setFieldsValue({
      pkg: record.pkg,
      travelDate: record.travelDate ? dayjs(record.travelDate) : null,
      bookingDate: record.bookingDate ? dayjs(record.bookingDate) : null,
      qty: record.qty,
      status: record.status
    });
    setIsEditModalOpen(true);
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

  const save = async () => {
    try {
      if (!editingBooking) {
        return;
      }

      const values = await editForm.validateFields();
      const travelDate = dayjs.isDayjs(values.travelDate)
        ? values.travelDate.format("YYYY-MM-DD")
        : values.travelDate;
      const bookingDate = dayjs.isDayjs(values.bookingDate)
        ? values.bookingDate.format("YYYY-MM-DD")
        : values.bookingDate;
      const qtyValue = Number(values.qty) || 0;
      const statusValue = values.status || undefined;

      const payload = {
        status: statusValue,
        bookingDetails: {
          packageName: values.pkg,
          travelDate,
          bookingDate,
          travelers: { total: qtyValue }
        }
      };

      const response = await axiosInstance.put(`/booking/${editingBooking.key}`, payload);
      const saved = response.data;
      const savedDetails = saved.bookingDetails || {};
      const statusRaw = saved.status || values.status || "pending";
      const statusFormatted = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

      setData((prev) =>
        prev.map((item) =>
          item.key === editingBooking.key
            ? {
              ...item,
              pkg: savedDetails.packageName || values.pkg,
              travelDate: savedDetails.travelDate || travelDate,
              bookingDate: savedDetails.bookingDate || bookingDate,
              qty: qtyValue,
              status: statusFormatted
            }
            : item
        )
      );

      message.success("Booking updated");
      setIsEditModalOpen(false);
      setEditingBooking(null);
      editForm.resetFields();
    } catch {
      message.error("Please fix validation errors");
    }
  };

  const columns = [
    { title: "Booking Reference", dataIndex: "ref" },
    { title: "Travel Package", dataIndex: "pkg" },
    { title: "Customer Name", dataIndex: "username" },
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
    { title: "Travelers", dataIndex: "qty" },
    {
      title: "Status",
      dataIndex: "status",
      render: s => {
        const normalized = (s || "").toLowerCase();
        const displayStatus = normalized === "confirmed" || normalized === "successful" || normalized === "fully paid"
          ? "Fully Paid"
          : s;
        const color = displayStatus === "Fully Paid" ? "green" :
          displayStatus === "Pending" ? "orange" :
            "red";
        return <Tag color={color}>{displayStatus}</Tag>;
      }
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button
            className='viewbutton-bookingmanagement'
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleView(record.key)}
          />
          <Button
            className='editbutton-bookingmanagement'
            type="primary"
            icon={<EditOutlined />}
            onClick={() => edit(record)}
          />
          <Button
            className='deletebutton-bookingmanagement'
            type='primary'
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.key)}
          />
        </Space>
      )
    }
  ];

  const totalBookings = filteredData.length;
  const totalFullyPaid = filteredData.filter(b => b.status === "Fully Paid" || b.status === "Confirmed").length;
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
              <Statistic title="Fully Paid" value={totalFullyPaid} prefix={<CheckCircleOutlined />} />
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
              { value: "Fully Paid", label: "Fully Paid" },
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
          <Table
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            pagination={{ pageSize: 6 }}
            scroll={{ x: "max-content" }}
          />
        </Card>

        <Modal
          title="Edit Booking"
          open={isEditModalOpen}
          onCancel={() => {
            setIsEditModalOpen(false);
            setEditingBooking(null);
          }}
          onOk={save}
          okText="Save Changes"
          style={{ top: 120 }}
          className="booking-edit-modal"
          okButtonProps={{ className: "booking-edit-save-btn" }}
          cancelButtonProps={{ className: "booking-edit-cancel-btn" }}
        >
          <Form form={editForm} layout="vertical" className="booking-edit-form">
            <Form.Item
              name="pkg"
              label="Package"
              rules={[{ required: true, message: "Package is required" }]}
            >
              <Input />
            </Form.Item>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="travelDate"
                  label="Travel Date"
                  rules={[{ required: true, message: "Travel date is required" }]}
                >
                  <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="bookingDate"
                  label="Booking Date"
                  rules={[{ required: true, message: "Booking date is required" }]}
                >
                  <DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="qty"
                  label="Travelers"
                  rules={[{ required: true, message: "Travelers is required" }]}
                >
                  <Input type="number" min={1} />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="status"
                  label="Status"
                  rules={[{ required: true, message: "Status is required" }]}
                >
                  <Select
                    options={[
                      { value: "Fully Paid", label: "Fully Paid" },
                      { value: "Pending", label: "Pending" },
                      { value: "Cancelled", label: "Cancelled" }
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
}