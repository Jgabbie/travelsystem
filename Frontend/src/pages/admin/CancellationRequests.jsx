import React, { useEffect, useMemo, useState } from 'react'
import { Card, Table, Button, Space, Row, Col, Statistic, Input, DatePicker, ConfigProvider, Modal, Tag, notification, Select, Image } from 'antd'
import { CheckCircleOutlined, DeleteOutlined, SafetyCertificateOutlined, CloseCircleOutlined, CheckOutlined, CloseOutlined, SearchOutlined, EyeOutlined, FilePdfOutlined, CheckCircleFilled, InboxOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import apiFetch from '../../config/fetchConfig'
import '../../style/admin/cancellationrequests.css'
import "../../style/components/modals/modaldesign.css";
import { useAuth } from "../../hooks/useAuth";


//function to convert image to base64
const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
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
    const [archivedRequests, setArchivedRequests] = useState([])
    const [showArchived, setShowArchived] = useState(false)

    const [statusFilter, setStatusFilter] = useState("");
    const [searchText, setSearchText] = useState('')
    const [dateFilter, setDateFilter] = useState(null)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [loading, setLoading] = useState(false)

    const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false)
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
    const [isCancellationAcceptedModalOpen, setIsCancellationAcceptedModalOpen] = useState(false)
    const [isCancellationRejectedModalOpen, setIsCancellationRejectedModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
    const [isRequestDeletedModalOpen, setIsRequestDeletedModalOpen] = useState(false)
    const [isRequestRestoredModalOpen, setIsRequestRestoredModalOpen] = useState(false)
    const [editingRequest, setEditingRequest] = useState(null)
    const [pendingActionRequest, setPendingActionRequest] = useState(null); // Track which item is being clicked
    const [isFetchingRequests, setIsFetchingRequests] = useState(false)

    const { auth } = useAuth();

    const [notificationApi, notificationContextHolder] =
        notification.useNotification();

    //show confirm modal function
    const showConfirmModal = (record, type) => {
        setPendingActionRequest(record);
        if (type === 'Approve') setIsAcceptModalOpen(true);
        if (type === 'Reject') setIsRejectModalOpen(true);
    };


    //accept function
    const handleAccept = async () => {
        if (!pendingActionRequest) return;
        await handleAction(pendingActionRequest.key, 'Approved');
        setIsCancellationAcceptedModalOpen(true);
    };


    //reject function
    const handleReject = async () => {
        if (!pendingActionRequest) return;
        await handleAction(pendingActionRequest.key, 'Disapproved');
        setIsCancellationRejectedModalOpen(true);
    };

    useEffect(() => {
        getCancellationRequests()
    }, [])


    //fetch cancellation requests
    const getCancellationRequests = async () => {
        try {
            setIsFetchingRequests(true)
            const response = await apiFetch.get('/booking/cancellations')
            const cancellations = response.map((c) => ({
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
        } finally {
            setIsFetchingRequests(false)
        }
        return []
    }


    //fetch archived cancellation requests
    const getArchivedCancellationRequests = async () => {
        try {
            setIsFetchingRequests(true)
            const response = await apiFetch.get('/booking/archived-cancellations')
            const cancellations = response.map((c) => ({
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
            setArchivedRequests(cancellations)
        } catch (err) {
            console.error('Error fetching archived cancellation requests:', err)
        } finally {
            setIsFetchingRequests(false)
        }
        return []
    }

    const currentData = showArchived ? archivedRequests : requests


    //filtered functions
    const filteredData = currentData.filter(item => {
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


    //generate PDF function
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

        const generatedBy =
            [
                auth?.firstname || auth?.firstName,
                auth?.lastname || auth?.lastName
            ]
                .filter(Boolean)
                .join(" ")
                .trim() || "Administrator";

        try {
            const imgData = await getBase64ImageFromURL("/images/Logo.png");
            doc.addImage(imgData, "PNG", 14, 12, 24, 24);
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

        //add generated-by footer and page numbers
        const totalPages = doc.getNumberOfPages();

        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
            doc.setPage(pageNumber);

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const footerY = pageHeight - 8;

            doc.setDrawColor(210, 210, 210);
            doc.setLineWidth(0.2);
            doc.line(
                14,
                pageHeight - 14,
                pageWidth - 14,
                pageHeight - 14
            );

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);

            doc.text(
                `Generated by: ${generatedBy}`,
                14,
                footerY
            );

            doc.text(
                `Page ${pageNumber} of ${totalPages}`,
                pageWidth - 14,
                footerY,
                {
                    align: "right"
                }
            );
        }


        doc.save(`Cancellation_Report_${new Date().toLocaleDateString()}.pdf`);
        notificationApi.success({ title: 'Report exported to PDF successfully.', placement: 'topRight' });
    };


    //approve or reject function
    const handleAction = async (key, status) => {
        try {
            setLoading(true)
            const action = status === 'Approved' ? 'approve' : 'reject'
            await apiFetch.post(`/booking/cancellations/${key}/${action}`)
            setRequests((prev) =>
                prev.map((item) => (item.key === key ? { ...item, status } : item))
            )
            notificationApi.success({ title: `Cancellation ${status.toLowerCase()}.`, placement: 'topRight' })
        } catch (err) {
            console.error('Failed to update cancellation status:', err)
            notificationApi.error({ title: 'Failed to update cancellation status. Please try again.', placement: 'topRight' })
        } finally {
            setLoading(false)
        }
    }


    //view function
    const openViewModal = (record) => {
        setSelectedRequest(record)
        setIsViewModalOpen(true)
    }


    //archive function
    const handleArchive = async (key) => {

        try {
            await apiFetch.delete(`/booking/cancellations/${key}/archive`)
            setIsRequestDeletedModalOpen(true)
            setRequests((prev) => prev.filter((item) => item.key !== key))
        } catch (error) {
            console.error("Error archiving cancellation request:", error)
            notificationApi.error({ title: 'Cancellation request archived unsuccessfully', placement: 'topRight' })
        }

    }


    //restore function
    const handleRestore = async (key) => {

        try {
            await apiFetch.post(`/booking/archived-cancellations/${key}/restore`)
            setIsRequestRestoredModalOpen(true)
            setArchivedRequests((prev) => prev.filter((item) => item.key !== key))
        } catch (error) {
            console.error("Error restoring cancellation request:", error)
            notificationApi.error({ title: error?.response?.data?.message || 'Cancellation restore failed', placement: 'topRight' })
        }
    }


    //table columns
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
            title: 'Cancellation Date',
            dataIndex: 'cancellationDate',
            key: 'cancellationDate',
            render: (d) => d ? dayjs(d).format('MMM DD, YYYY') : '--'
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status) => {
                let color = 'orange';

                if (status === 'Approved') {
                    color = 'green';
                } else if (status === 'Disapproved') {
                    color = 'red';
                }

                return (
                    <Tag
                        color={color}
                        className="cancellationrequests-status-tag"
                    >
                        {status}
                    </Tag>
                );
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
                    </Button>
                    {showArchived ? (
                        <Button
                            className="cancellations-restore-button"
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => {
                                setEditingRequest(record)
                                setIsRestoreModalOpen(true)
                            }}
                        >
                        </Button>
                    ) : (
                        <>
                            <Button
                                className="cancellations-approve-button"
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={() => showConfirmModal(record, 'Approve')}
                            >
                            </Button>
                            <Button
                                className="cancellations-reject-button"
                                type="primary"
                                icon={<CloseOutlined />}
                                onClick={() => showConfirmModal(record, 'Reject')}
                            >
                            </Button>
                            <Button
                                className="cancellations-reject-button"
                                type="primary"
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                    setEditingRequest(record)
                                    setIsDeleteModalOpen(true)
                                }}
                            >
                            </Button>
                        </>
                    )}
                </Space>
            )
        }
    ], [showArchived])

    const archivedColumns = columns




    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            {notificationContextHolder}

            <div className="cancellations-container">
                <h1 className="page-header">Cancellation Requests</h1>

                {!showArchived && (
                    <Row gutter={16} className="cancellation-statistics">
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
                )}

                <Card className="cancel-actions">
                    <div className="cancel-actions-row">
                        <div className="cancel-actions-filters">
                            <div className="cancel-actions-field cancel-actions-field--search">
                                <label className="cancellationrequests-label">Search</label>
                                <Input
                                    maxLength={40}
                                    prefix={<SearchOutlined />}
                                    placeholder="Search username, package or reason..."
                                    className="cancellationrequests-search-input"
                                    value={searchText}
                                    onChange={(e) => {
                                        const cleanedValue = e.target.value
                                            .replace(/[^a-zA-Z0-9\s-]/g, '')
                                            .replace(/\s{2,}/g, ' ')
                                            .replace(/-{2,}/g, '-')
                                            .replace(/^\s+/, '');

                                        setSearchText(cleanedValue);
                                    }}
                                    allowClear
                                />
                            </div>

                            <div className="cancel-actions-field">
                                <label className="cancellationrequests-label">Status</label>
                                <Select
                                    className="cancellationrequests-select"
                                    placeholder="Status"
                                    allowClear
                                    value={statusFilter || undefined}
                                    onChange={(value) => setStatusFilter(value || "")}
                                    options={[
                                        { value: "Pending", label: "Pending" },
                                        { value: "Approved", label: "Approved" },
                                        { value: "Disapproved", label: "Disapproved" },
                                    ]}
                                />
                            </div>

                            <div className="cancel-actions-field">
                                <label className="cancellationrequests-label">Cancellation Date</label>
                                <DatePicker
                                    inputReadOnly
                                    className="cancellation-date-filter"
                                    placeholder="Cancellation Date"
                                    value={dateFilter}
                                    onChange={(date) => setDateFilter(date)}
                                    allowClear
                                />
                            </div>
                        </div>

                        <div className="cancel-actions-buttons">
                            <Button
                                className='cancellations-export-button'
                                type="primary"
                                icon={<FilePdfOutlined />}
                                onClick={generatePDF}
                            >
                                Export to PDF
                            </Button>
                            <Button
                                icon={showArchived ? <SafetyCertificateOutlined /> : <InboxOutlined />}
                                className='cancellations-archive-button'
                                type="primary"
                                onClick={() => {
                                    const nextValue = !showArchived
                                    setShowArchived(nextValue)
                                    setSearchText("")
                                    setStatusFilter("")
                                    setDateFilter(null)
                                    if (nextValue) {
                                        getArchivedCancellationRequests()
                                    } else {
                                        getCancellationRequests()
                                    }
                                }}
                            >
                                {showArchived ? 'Back' : 'Archives'}
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card className='cancel-table-card' style={{ marginTop: 20 }}>
                    <Table
                        columns={showArchived ? archivedColumns : columns}
                        loading={loading || isFetchingRequests}
                        dataSource={filteredData}
                        scroll={{ x: "max-content" }}
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: false
                        }}
                    />
                </Card>

                <Modal
                    open={isViewModalOpen}
                    onCancel={() => setIsViewModalOpen(false)}
                    className="transaction-view-modal"
                    width={720}
                    centered={true}
                    footer={null}
                    title={"Cancellation Request Proof - " + (selectedRequest?.ref || "")}
                >
                    {selectedRequest && (
                        <div className="receipt-container">
                            {selectedRequest.imageProof ? (
                                <div className="upload-preview-box" style={{ maxHeight: 520 }}>
                                    <Image
                                        src={selectedRequest.imageProof}
                                        alt={selectedRequest.proofFileName || "Proof of payment"}
                                        className="upload-preview-image"
                                        style={{ width: "100%", height: "auto" }}
                                    />
                                </div>
                            ) : (
                                <p>No proof image available.</p>
                            )}
                        </div>


                    )}

                    <Space style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                        <Button
                            className='cancellations-viewproof-button'
                            type="primary"
                            onClick={async () => {
                                try {
                                    const date = dayjs().format("YYYY-MM-DD");
                                    const response = await fetch(selectedRequest.imageProof, { mode: 'cors' });
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = 'Cancellation_Proof_' + selectedRequest.ref + '_' + date + '.png';
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    window.URL.revokeObjectURL(url);
                                } catch (err) {
                                    window.open(selectedRequest.imageProof, '_blank');
                                }
                            }}
                        >
                            Download Image
                        </Button>
                    </Space>
                </Modal>
            </div>

            {/* APPROVE CANCELLATION REQUEST MODAL */}
            <Modal
                open={isAcceptModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsAcceptModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Accept Cancellation Request?</h1>
                    <p className='modal-text'>Are you sure you want to accept this cancellation request?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleAccept();
                                setIsAcceptModalOpen(false);
                            }}
                        >
                            Accept
                        </Button>
                        <Button
                            type='primary'
                            className='modal-button-cancel'

                            onClick={() => {
                                setIsAcceptModalOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>


            {/* APPROVE CANCELLATION REQUEST MODAL */}
            <Modal
                open={isRejectModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsRejectModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Reject Cancellation Request?</h1>
                    <p className='modal-text'>Are you sure you want to reject this cancellation request?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleReject();
                                setIsRejectModalOpen(false);
                            }}
                        >
                            Reject
                        </Button>
                        <Button
                            type='primary'
                            className='modal-button-cancel'
                            onClick={() => {
                                setIsRejectModalOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>


            {/* CANCELLATION REQUEST HAS BEEN ACCEPTED MODAL */}
            <Modal
                open={isCancellationAcceptedModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsCancellationAcceptedModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Cancellation Request Accepted!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
                    </div>

                    <p className='modal-text'>The cancellation request has been accepted.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsCancellationAcceptedModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>


            {/* CANCELLATION REQUEST HAS BEEN REJECTED MODAL */}
            <Modal
                open={isCancellationRejectedModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsCancellationRejectedModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Cancellation Request Rejected!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
                    </div>

                    <p className='modal-text'>The cancellation request has been rejected.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsCancellationRejectedModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>


            {/* ARCHIVE REQUEST CONFIRMATION MODAL */}
            <Modal
                open={isDeleteModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Archive Cancellation Request?</h1>
                    <p className='modal-text'>Are you sure you want to archive this cancellation request?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleArchive(editingRequest.key);
                                setIsDeleteModalOpen(false);
                            }}
                        >
                            Archive
                        </Button>
                        <Button
                            type='primary'
                            className='modal-button-cancel'
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setEditingRequest(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>


            {/* RESTORE REQUEST CONFIRMATION MODAL */}
            <Modal
                open={isRestoreModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsRestoreModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Restore Cancellation Request?</h1>
                    <p className='modal-text'>Are you sure you want to restore this cancellation request?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleRestore(editingRequest.key);
                                setIsRestoreModalOpen(false);
                            }}
                        >
                            Restore
                        </Button>
                        <Button
                            type='primary'
                            className='modal-button-cancel'
                            onClick={() => {
                                setIsRestoreModalOpen(false);
                                setEditingRequest(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>



            {/* REQUEST HAS BEEN ARCHIVED MODAL */}
            <Modal
                open={isRequestDeletedModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsRequestDeletedModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Cancellation Request Archived Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
                    </div>

                    <p className='modal-text'>The cancellation request has been archived.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsRequestDeletedModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>

            {/* REQUEST HAS BEEN RESTORED MODAL */}
            <Modal
                open={isRequestRestoredModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsRequestRestoredModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Cancellation Request Restored Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
                    </div>

                    <p className='modal-text'>The cancellation request has been restored.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsRequestRestoredModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>
        </ConfigProvider>
    )
}