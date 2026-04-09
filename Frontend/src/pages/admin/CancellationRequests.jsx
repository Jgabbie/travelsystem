import React, { useEffect, useMemo, useState } from 'react'
import { Card, Table, Button, Space, Row, Col, Statistic, Input, DatePicker, ConfigProvider, Modal, Tag, message, Select } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, CheckOutlined, CloseOutlined, SearchOutlined, EyeOutlined, FilePdfOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import axiosInstance from '../../config/axiosConfig'
import '../../style/admin/cancellationrequests.css'

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

export default function CancellationRequests() {
    const [requests, setRequests] = useState([])

    const [statusFilter, setStatusFilter] = useState("");
    const [searchText, setSearchText] = useState('')
    const [dateFilter, setDateFilter] = useState(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        getCancellationRequests()
    }, [])

    const getCancellationRequests = async () => {
        try {
            const response = await axiosInstance.get('/booking/cancellations')
            const cancellations = response.data.map((c) => ({
                key: c._id,
                ref: c.reference,
                username: c.userId?.username || c.userId?.email || 'Unknown',
                package: c.bookingId?.packageId?.packageName || 'Package',
                daysAfterBooking: c.bookingId?.createdAt && c.cancellationDate
                    ? dayjs(c.cancellationDate).diff(dayjs(c.bookingId?.createdAt), 'day')
                    : '--',
                reason: c.cancellationReason || '--',
                cancellationDate: c.cancellationDate,
                status: c.status || 'Pending',
                imageProof: c.imageProof || null
            }))
            setRequests(cancellations)
        } catch (err) {
            console.error('Error fetching cancellation requests:', err)
        }
        return []
    }

    const filteredData = requests.filter(item => {
        const matchesSearch =
            (item.ref.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.username.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.package?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.reason.toLowerCase().includes(searchText.toLowerCase())) ||
            (dayjs(item.cancellationDate).format('MMM DD, YYYY').toLowerCase().includes(searchText.toLowerCase())) ||
            (item.status.toLowerCase().includes(searchText.toLowerCase()))

        const matchesStatus = statusFilter === "" || item.status === statusFilter

        const matchesDate = !dateFilter ||
            (item.cancellationDate && dayjs(item.cancellationDate).isSame(dateFilter, 'day'))

        return matchesSearch && matchesStatus && matchesDate
    })

    const totalRequests = requests.length
    const approvedRequests = requests.filter((item) => item.status === 'Approved').length
    const disapprovedRequests = requests.filter((item) => item.status === 'Disapproved').length


    const generatePDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');

        // Column headers matching your screenshot table
        const tableColumn = [
            "Cancellation Request No.",
            "Customer Name",
            "Travel Package",
            "Reason",
            "Days after booking",
            "Status",
            "Cancellation Date"
        ];

        const tableRows = filteredData.map(item => [
            item.ref,
            item.username,
            item.package,
            item.reason,
            item.daysAfterBooking,
            item.status,
            item.cancellationDate ? dayjs(item.cancellationDate).format('MMM DD, YYYY') : '--'
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
        doc.line(14, 38, 196, 38);

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(48, 87, 151);
        doc.text("CANCELLATION REQUESTS REPORT", 14, 48);

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
            styles: { fontSize: 7.5 },
            headStyles: { fillColor: [48, 87, 151] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: 14, right: 14 }
        });

        doc.save(`Cancellation_Report_${new Date().toLocaleDateString()}.pdf`);
        message.success("Report exported to PDF successfully.");
    };

    const handleAction = async (key, status) => {
        try {
            setLoading(true)
            const action = status === 'Approved' ? 'approve' : 'reject'
            await axiosInstance.post(`/booking/cancellations/${key}/${action}`)
            setRequests((prev) =>
                prev.map((item) => (item.key === key ? { ...item, status } : item))
            )
            message.success(`Cancellation ${status.toLowerCase()}.`)
        } catch (err) {
            console.error('Failed to update cancellation status:', err)
            message.error('Failed to update cancellation status. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const openViewModal = (record) => {
        setSelectedRequest(record)
        setIsViewModalOpen(true)
    }

    const columns = useMemo(() => [
        {
            title: 'Cancellation Request No.',
            dataIndex: 'ref',
            key: 'ref'
        },
        {
            title: 'Travel Package',
            dataIndex: 'package',
            key: 'package'
        },
        {
            title: 'Customer Name',
            dataIndex: 'username',
            key: 'username'
        },
        {
            title: 'Reason',
            dataIndex: 'reason',
            key: 'reason'
        },
        {
            title: 'Days after booking date',
            dataIndex: 'daysAfterBooking',
            key: 'daysAfterBooking'
        },
        {
            title: 'Cancellation Date',
            dataIndex: 'cancellationDate',
            key: 'cancellationDate',
            render: (d) => d ? dayjs(d).format('MMM DD, YYYY') : '--'
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                let color = 'orange'
                if (status === 'Approved') color = 'green'
                else if (status === 'Disapproved') color = 'red'
                return (
                    <Tag color={color}>
                        {status}
                    </Tag>
                )
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        className='cancellations-view-button'
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={() => openViewModal(record)}
                    >
                        View
                    </Button>
                    <Button
                        className="cancellations-approve-button"
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => handleAction(record.key, 'Approved')}
                    >
                        Approve
                    </Button>
                    <Button
                        className="cancellations-reject-button"
                        type="primary"
                        icon={<CloseOutlined />}
                        onClick={() => handleAction(record.key, 'Disapproved')}
                    >
                        Reject
                    </Button>
                </Space>
            )
        }
    ], [])

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div className="cancellations-container">
                <h1 className="page-header">Cancellation Requests</h1>

                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={8}>
                        <Card className='cancellation-management-card'>
                            <Statistic
                                title="Total Requests"
                                value={totalRequests}
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={8}>
                        <Card className='cancellation-management-card'>
                            <Statistic
                                title="Approved"
                                value={approvedRequests}
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={8}>
                        <Card className='cancellation-management-card'>
                            <Statistic
                                title="Disapproved"
                                value={disapprovedRequests}
                                prefix={<CloseCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                <div className="cancel-actions">
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Search username, package or reason..."
                        className="search-input"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                    />

                    <Select
                        className="quotation-select"
                        placeholder="Status"
                        style={{ width: 160 }}
                        allowClear
                        value={statusFilter || undefined}
                        onChange={(value) => setStatusFilter(value || "")}
                        options={[
                            { value: "Pending", label: "Pending" },
                            { value: "Approved", label: "Approved" },
                            { value: "Disapproved", label: "Disapproved" },
                        ]}
                    />

                    <DatePicker
                        placeholder="Cancellation Date"
                        value={dateFilter}
                        onChange={(date) => setDateFilter(date)}
                        allowClear
                    />

                    <Space style={{ marginLeft: 'auto' }}>
                        <Button
                            className='cancellations-export-button'
                            type="primary"
                            icon={<FilePdfOutlined />}
                            onClick={generatePDF}
                        >
                            Export to PDF
                        </Button>
                    </Space>
                </div>

                <Card style={{ marginTop: 20 }}>
                    <Table
                        columns={columns}
                        loading={loading}
                        dataSource={filteredData}
                        pagination={{ pageSize: 6 }}
                    />
                </Card>

                <Modal
                    open={isViewModalOpen}
                    onCancel={() => setIsViewModalOpen(false)}
                    footer={null}
                    className="cancellation-view-modal"
                    width={680}
                    style={{ top: 35 }}
                >
                    {selectedRequest && (
                        <div className="cancellation-view-content">
                            <div className="cancellation-view-header">
                                <div>
                                    <h2 className="cancellation-view-title">Cancellation Request</h2>
                                    <div className="cancellation-view-subtitle">
                                        <span>{selectedRequest.username}</span>
                                        <Tag
                                            color={
                                                selectedRequest.status === 'Approved'
                                                    ? 'green'
                                                    : selectedRequest.status === 'Pending'
                                                        ? 'orange'
                                                        : 'red'
                                            }
                                        >
                                            {selectedRequest.status}
                                        </Tag>
                                    </div>
                                </div>
                            </div>

                            <div className="cancellation-view-grid">
                                <div className="cancellation-view-item">
                                    <span className="cancellation-view-label">Travel Package</span>
                                    <span className="cancellation-view-value">{selectedRequest.package}</span>
                                </div>
                                <div className="cancellation-view-item">
                                    <span className="cancellation-view-label">Reason</span>
                                    <span className="cancellation-view-value">{selectedRequest.reason}</span>
                                </div>
                                <div className="cancellation-view-item">
                                    <span className="cancellation-view-label">Days After Booking</span>
                                    <span className="cancellation-view-value">{selectedRequest.daysAfterBooking}</span>
                                </div>
                                <div className="cancellation-view-item">
                                    <span className="cancellation-view-label">Cancellation Date</span>
                                    <span className="cancellation-view-value">
                                        {selectedRequest.cancellationDate
                                            ? dayjs(selectedRequest.cancellationDate).format('MMM DD, YYYY')
                                            : '--'}
                                    </span>
                                </div>
                                {selectedRequest.imageProof && (
                                    <div className="cancellation-view-item" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
                                        <span className="cancellation-view-label">Proof Image</span>
                                        <img
                                            src={selectedRequest.imageProof}
                                            alt="Cancellation Proof"
                                            style={{ maxWidth: '100%', maxHeight: '300px', marginTop: 8, borderRadius: 6 }}
                                        />
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </Modal>
            </div>
        </ConfigProvider>
    )
}