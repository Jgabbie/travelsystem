import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Select, Button, Table, Tag, Space, DatePicker, Row, Col, Card, Statistic, Form, message, Modal, ConfigProvider } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined, CalendarOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, FilePdfOutlined, CheckCircleFilled } from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiFetch from "../../config/fetchConfig";
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isBookingEditedModalOpen, setIsBookingEditedModalOpen] = useState(false);
  const [isBookingDeletedModalOpen, setIsBookingDeletedModalOpen] = useState(false);

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
        const response = await apiFetch.get("/booking/all-bookings");

        const bookings = response.map((b) => {
          const rawTravel = b?.travelDate || b?.bookingDetails?.travelDate || null;
          const travelStart = rawTravel?.startDate
            || (typeof rawTravel === 'string' ? rawTravel.split(' - ')[0] : null)
            || rawTravel
            || null;
          const travelDateDisplay = travelStart && dayjs(travelStart).isValid()
            ? dayjs(travelStart).format('MMM DD, YYYY')
            : '--';

          const bookingDateDisplay = b?.createdAt && dayjs(b.createdAt).isValid()
            ? dayjs(b.createdAt).format('MMM DD, YYYY')
            : '--';

          return {
            key: b._id,
            ref: b.reference || b._id,
            username: b.userId?.username || "Customer Name",
            pkg: b.packageId?.packageName || "Package",
            travelDate: travelDateDisplay,
            travelDateRaw: travelStart,
            bookingDate: bookingDateDisplay,
            bookingDateRaw: b.createdAt || null,
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

            bookingDetails: b.bookingDetails || {}
          };
        });

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
      (String(item.travelDate || "").toLowerCase().includes(searchText.toLowerCase())) ||
      (String(item.bookingDate || "").toLowerCase().includes(searchText.toLowerCase())) ||
      (item.qty.toString().toLowerCase().includes(searchText.toLowerCase())) ||
      (item.ref.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.pkg.toLowerCase().includes(searchText.toLowerCase())) ||
      (item.status.toLowerCase().includes(searchText.toLowerCase()));

    const matchesStatus =
      statusFilter === "" || item.status === statusFilter;

    const matchesBookingDate =
      !bookingDateFilter ||
      (item.bookingDateRaw && dayjs(item.bookingDateRaw).isSame(bookingDateFilter, "day"));

    const matchesTravelDate =
      !travelDateFilter ||
      (item.travelDateRaw && dayjs(item.travelDateRaw).isSame(travelDateFilter, "day"));

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
      item.travelDate,
      item.bookingDate,
      item.qty,
      item.status
    ]);

    try {
      const imgData = await getBase64ImageFromURL("/images/Logo.png");
      doc.addImage(imgData, "PNG", 14, 12, 35, 22);
    } catch (e) {
      console.warn("Logo not found at /public/images/Logo.png");
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("M&RC TRAVEL AND TOURS", 52, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1, Brgy", 52, 23);
    doc.text("San Antonio, Paranaque City, Philippines, 1709 PHL", 52, 27);
    doc.text("+639690554806 | info1@mrctravels.com", 52, 31);

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
      travelDate: record.travelDateRaw ? dayjs(record.travelDateRaw) : null,
      bookingDate: record.bookingDateRaw ? dayjs(record.bookingDateRaw) : null,
      qty: record.qty,
      status: record.status
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = async (key) => {

    try {
      await apiFetch.delete(`/booking/${key}`);
      setData((prev) => prev.filter((item) => item.key !== key));
      setIsBookingDeletedModalOpen(true);
      message.success("Booking deleted");
    } catch (error) {
      message.error("Unable to delete booking");
    }

  };

  const handleView = (key) => {
    const booking = data.find((item) => item.key === key);
    if (booking) {
      const invoicePath = isEmployee
        ? `${basePath}/bookings/${key}/invoice`
        : `${basePath}/bookings/invoice`;
      navigate(invoicePath, { state: { booking } });
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

      const saved = await apiFetch.put(`/booking/${editingBooking.key}`, payload);
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
      setIsBookingEditedModalOpen(true);
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
      render: d => d || "--"
    },
    {
      title: "Booking Date",
      dataIndex: "bookingDate",
      render: d => d || "--"
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
            displayStatus === "Cancelled" ? "red" :
              displayStatus === "Not Paid" ? "pink" :
                "purple";
        return <Tag color={color}>{displayStatus}</Tag>;
      }
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button
            className='bookingmanagement-view-button'
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => handleView(record.key)}
          >
            View
          </Button>
          <Button
            className='bookingmanagement-edit-button'
            type="primary"
            icon={<EditOutlined />}
            onClick={() => edit(record)}
          >
            Edit
          </Button>
          <Button
            className='bookingmanagement-remove-button'
            type='primary'
            icon={<DeleteOutlined />}
            onClick={() => {
              setEditingBooking(record);
              setIsDeleteModalOpen(true);
            }}
          >
            Delete
          </Button>
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
            <Button className='bookingmanagement-export-button' type="primary" icon={<FilePdfOutlined />} onClick={generatePDF}>Export to PDF</Button>
          </Space>
        </div>

        <Card>
          <Table
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            pagination={{ pageSize: 10 }}
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
          footer={null}
          onOk={save}
          okText="Save Changes"
          style={{ top: 170 }}
          className="booking-edit-modal"
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button
              type='primary'
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingBooking(null);
              }}
              className="bookingmanagement-cancel-button">
              Cancel
            </Button>
            <Button
              type='primary'
              onClick={save}
              className="bookingmanagement-okmodal-button">
              Save
            </Button>
          </div>
        </Modal>

        <Modal
          open={isDeleteModalOpen}
          className='signup-success-modal'
          closable={{ 'aria-label': 'Custom Close Button' }}
          footer={null}
          style={{ top: 220 }}
          onCancel={() => {
            setIsDeleteModalOpen(false);
          }}
        >
          <div className='signup-success-container'>
            <h1 className='signup-success-heading'>Delete Booking?</h1>
            <p className='signup-success-text'>Are you sure you want to delete this booking?</p>

            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

              <Button
                type='primary'
                className='logout-confirm-btn'
                onClick={() => {
                  handleDelete(editingBooking.key);
                  setIsDeleteModalOpen(false);
                }}
              >
                Delete
              </Button>
              <Button
                type='primary'
                className='logout-cancel-btn'
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setEditingBooking(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>

        {/* BOOKING HAS BEEN EDITED MODAL */}
        <Modal
          open={isBookingEditedModalOpen}
          className='signup-success-modal'
          closable={{ 'aria-label': 'Custom Close Button' }}
          footer={null}
          style={{ top: 220 }}
          onCancel={() => {
            setIsBookingEditedModalOpen(false);
          }}
        >
          <div className='signup-success-container'>
            <h1 className='signup-success-heading'>Booking Edited Successfully!</h1>

            <div>
              <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
            </div>

            <p className='signup-success-text'>The booking has been edited.</p>

            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

              <Button
                type='primary'
                className='logout-confirm-btn'
                onClick={() => {
                  setIsBookingEditedModalOpen(false);
                }}
              >
                Continue
              </Button>
            </div>

          </div>
        </Modal>


        {/* BOOKING HAS BEEN DELETED MODAL */}
        <Modal
          open={isBookingDeletedModalOpen}
          className='signup-success-modal'
          closable={{ 'aria-label': 'Custom Close Button' }}
          footer={null}
          style={{ top: 220 }}
          onCancel={() => {
            setIsBookingDeletedModalOpen(false);
          }}
        >
          <div className='signup-success-container'>
            <h1 className='signup-success-heading'>Booking Deleted Successfully!</h1>

            <div>
              <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
            </div>

            <p className='signup-success-text'>The booking has been deleted.</p>

            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

              <Button
                type='primary'
                className='logout-confirm-btn'
                onClick={() => {
                  setIsBookingDeletedModalOpen(false);
                }}
              >
                Continue
              </Button>
            </div>

          </div>
        </Modal>


      </div>
    </ConfigProvider>
  );
}