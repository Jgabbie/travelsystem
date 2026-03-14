import React, { useEffect, useMemo, useState } from 'react'
import { Card, Table, Button, Space, Row, Col, Statistic, Input, DatePicker, ConfigProvider, Modal, Tag, message } from 'antd'
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

    const [searchText, setSearchText] = useState('')
    const [dateFilter, setDateFilter] = useState(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState(null)

    useEffect(() => {
        getCancellationRequests()
    }, [])

    const getCancellationRequests = async () => {
        try {
            const response = await axiosInstance.get('/booking/cancellations')
            const cancellations = response.data || []

            const mapped = cancellations.map((item) => {
                const booking = item.bookingId || {}
                const user = item.userId || {}
                const bookingDate = booking.createdAt || null
                const cancelDate = item.cancellationDate || null
                const daysAfterBooking = bookingDate && cancelDate
                    ? dayjs(cancelDate).diff(dayjs(bookingDate), 'day')
                    : '--'

                return {
                    key: item._id,
                    username: user.username || user.email || 'Unknown',
                    packageName: booking.bookingDetails?.packageName || booking.reference || 'Package',
                    reason: item.cancellationReason || '--',
                    daysAfterBooking,
                    cancellationDate: cancelDate,
                    status: item.status || 'Pending'
                }
            })

            setRequests(mapped)
        } catch (err) {
            console.error('Error fetching cancellation requests:', err)
        }
        return []
    }

    const generatePDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');

        // Column headers matching your screenshot table
        const tableColumn = [
            "Username",
            "Package",
            "Reason",
            "Days after booking",
            "Status",
            "Cancellation Date"
        ];

        const tableRows = filteredRequests.map(item => [
            item.username,
            item.packageName,
            item.reason,
            item.daysAfterBooking,
            item.status,
            item.cancellationDate ? dayjs(item.cancellationDate).format('MMM DD, YYYY') : '--'
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

    const handleAction = (key, status) => {
        setRequests((prev) =>
            prev.map((item) => (item.key === key ? { ...item, status } : item))
        )
    }

    const openViewModal = (record) => {
        setSelectedRequest(record)
        setIsViewModalOpen(true)
    }

    const totalRequests = requests.length
    const approvedRequests = requests.filter((item) => item.status === 'Approved').length
    const disapprovedRequests = requests.filter((item) => item.status === 'Disapproved').length

    const filteredRequests = useMemo(() => {
        return requests.filter(item => {

            const matchesSearch =
                item.username.toLowerCase().includes(searchText.toLowerCase()) ||
                item.packageName.toLowerCase().includes(searchText.toLowerCase()) ||
                item.reason.toLowerCase().includes(searchText.toLowerCase())

            const matchesDate =
                !dateFilter ||
                (item.cancellationDate &&
                    dayjs(item.cancellationDate).isSame(dateFilter, 'day'))

            return matchesSearch && matchesDate
        })
    }, [requests, searchText, dateFilter])


    const columns = useMemo(() => [
        {
            title: 'Customer Name',
            dataIndex: 'username',
            key: 'username'
        },
        {
            title: 'Travel Package',
            dataIndex: 'packageName',
            key: 'packageName'
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
                        className='viewbutton-cancellation'
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={() => openViewModal(record)}
                    />
                    <Button
                        className="approve-cancellation"
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => handleAction(record.key, 'Approved')}
                    />
                    <Button
                        className="reject-cancellation"
                        type="primary"
                        icon={<CloseOutlined />}
                        onClick={() => handleAction(record.key, 'Disapproved')}
                    />
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

                    <DatePicker
                        placeholder="Filter by date"
                        value={dateFilter}
                        onChange={(date) => setDateFilter(date)}
                        allowClear
                    />

                    <Space style={{ marginLeft: 'auto' }}>
                        <Button
                            className='export-pdf-button'
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
                        dataSource={filteredRequests}
                        pagination={{ pageSize: 6 }}
                    />
                </Card>

                <Modal
                    open={isViewModalOpen}
                    onCancel={() => setIsViewModalOpen(false)}
                    footer={null}
                    className="cancellation-view-modal"
                    width={680}
                    destroyOnClose
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
                                    <span className="cancellation-view-label">Package</span>
                                    <span className="cancellation-view-value">{selectedRequest.packageName}</span>
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
                            </div>
                        </div>
                    )}
                </Modal>
            </div>
        </ConfigProvider>
    )
}