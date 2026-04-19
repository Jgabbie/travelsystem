import React, { useEffect, useRef, useState } from 'react'
import { Table, Tag, Button, Space, message, Modal, Select, Input, DatePicker, ConfigProvider, Spin } from 'antd'
import { UploadOutlined, SearchOutlined, EyeOutlined, CloseCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import apiFetch from '../../config/fetchConfig'
import '../../style/client/userbookings.css'
import { useNavigate } from 'react-router-dom'
import TopNavUser from '../../components/topnav/TopNavUser'


export default function UserBookings() {
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingCancel, setLoadingCancel] = useState(false)

    const [cancelModalOpen, setCancelModalOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState('')
    const [cancelOtherReason, setCancelOtherReason] = useState('')
    const [cancelTargetKey, setCancelTargetKey] = useState(null)
    const [cancelImages, setCancelImages] = useState([])
    const [cancelComments, setCancelComments] = useState('')
    const [previewImage, setPreviewImage] = useState(null)

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [bookingDateFilter, setBookingDateFilter] = useState(null);
    const [travelDateFilter, setTravelDateFilter] = useState(null);

    const navigate = useNavigate()
    const fileInputRef = useRef()

    useEffect(() => {
        const fetchBookings = async () => {
            setLoading(true)
            try {
                const response = await apiFetch.get('/booking/my-bookings')
                const bookings = response.map((b) => ({
                    key: b._id,
                    ref: b.reference || b._id,
                    reference: b.reference || b._id,
                    packageName: b.packageId?.packageName || 'Tour Package',
                    packageType: b.packageId?.packageType?.toUpperCase() || 'Package Type',
                    travelDate: b.travelDate ? `${dayjs(b.travelDate.startDate).format('MMM D, YYYY')} - ${dayjs(b.travelDate.endDate).format('MMM D, YYYY')}` : 'TBD',
                    bookingDate: dayjs(b.createdAt).format('MMM D, YYYY'),
                    travelersCount: b.travelers || {},
                    paidAmount: Number(b.paidAmount || 0),
                    status: (() => {
                        const rawStatus = b.status || '';
                        const formatted = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);
                        const normalized = formatted.toLowerCase();
                        if (normalized === 'cancelled' || normalized === 'cancellation requested') {
                            return formatted || 'Cancelled';
                        }
                        if (Number(b.paidAmount || 0) <= 0) {
                            return 'Not Paid';
                        }
                        if (normalized === 'successful' || normalized === 'fully paid') {
                            return 'Fully Paid';
                        }
                        return formatted || 'No Status';
                    })(),
                }))

                setBookings(bookings)
            } catch (error) {
                message.error('Unable to load bookings')
                setBookings([])
            } finally {
                setLoading(false)
            }
        }
        fetchBookings()
    }, [])

    const filteredData = bookings.filter(item => {
        const matchesSearch =
            (item.reference?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.packageType?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.packageName?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.status?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.travelersCount && item.travelersCount.toString().includes(searchText)) ||
            (dayjs(item.travelDate).format('MMM D, YYYY').toLowerCase().includes(searchText.toLowerCase())) ||
            (dayjs(item.bookingDate).format('MMM D, YYYY').toLowerCase().includes(searchText.toLowerCase()));

        const matchesStatus =
            statusFilter === "" || item.status === statusFilter;

        const matchesBookingDate =
            !bookingDateFilter ||
            dayjs(item.bookingDate, 'MMM D, YYYY').isSame(bookingDateFilter, "day");

        const matchesTravelDate =
            !travelDateFilter ||
            dayjs(item.travelDate, 'MMM D, YYYY').isSame(travelDateFilter, "day");

        return matchesSearch && matchesStatus && matchesBookingDate && matchesTravelDate;
    });

    const viewBookingInvoice = (booking) => {
        navigate('/user-booking-invoice', { state: { booking } })
    }

    const openCancelModal = (key) => {
        setCancelTargetKey(key)
        setCancelReason('')
        setCancelOtherReason('')
        setCancelImages([])
        setCancelComments('')
        setCancelModalOpen(true)
    }

    const closeCancelModal = () => {
        setCancelModalOpen(false)
        setCancelTargetKey(null)
        setPreviewImage(null);
        setCancelReason('')
        setCancelOtherReason('')
        setCancelImages([])
        setCancelComments('')
    }

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            message.error("Please select a valid image file.");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            message.error("Image must be 2MB or less.");
            return;
        }

        // Just store file for later upload
        setCancelImages([file]);
        setPreviewImage(URL.createObjectURL(file));
    };

    const confirmCancelBooking = async () => {
        setCancelModalOpen(false)
        setLoadingCancel(true)

        if (!cancelReason) {
            message.warning('Please select a cancellation reason');
            return;
        }

        if (cancelReason === 'Other' && !cancelOtherReason.trim()) {
            message.warning('Please provide a cancellation reason');
            return;
        }

        if (!cancelImages.length) {
            message.warning('Please upload a supporting file');
            return;
        }

        try {
            let imageUrl = null;

            // Upload image to Cloudinary
            if (cancelImages[0]) {
                const formData = new FormData();
                formData.append("file", cancelImages[0]);

                const res = await apiFetch.post(
                    "/upload/upload-cancel-proof",
                    formData,
                    {
                        headers: { "Content-Type": "multipart/form-data" },
                        withCredentials: true
                    }
                );

                imageUrl = res.url;
                console.log('Image uploaded to Cloudinary:', res);
            }

            // Send cancellation payload
            const payload = {
                reason: cancelReason === 'Other' ? cancelOtherReason : cancelReason,
                comments: cancelComments || '',
                imageProof: imageUrl
            };

            console.log('Cancel payload:', payload);

            const cancelEndpoint = `/booking/cancel/${cancelTargetKey}`;
            await apiFetch.post(cancelEndpoint, payload);

            setLoadingCancel(false)
            message.success('Booking cancelled');
        } catch (error) {
            console.error(error);
            message.error('Unable to cancel booking');
        }
    };

    const columns = [
        {
            title: 'Reference',
            dataIndex: 'ref',
            key: 'ref'
        },
        {
            title: 'Travel Package',
            dataIndex: 'packageName',
            key: 'packageName'
        },
        {
            title: 'Travel Date',
            dataIndex: 'travelDate',
            key: 'travelDate'
        },
        {
            title: 'Booking Date',
            dataIndex: 'bookingDate',
            key: 'bookingDate'
        },
        {
            title: 'Travelers',
            dataIndex: 'travelersCount',
            key: 'travelersCount'
        },
        {
            title: 'Package Type',
            dataIndex: 'packageType',
            key: 'packageType'
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value) => {
                let color = 'default'
                if (value === 'Fully Paid') color = 'green'
                if (value === 'Pending') color = 'gold'
                if (value === 'Not Paid') color = 'red'
                if (value === 'Completed') color = 'blue'
                return <Tag color={color}>{value}</Tag>
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        className="user-bookings-view-button"
                        type='primary'
                        onClick={() => viewBookingInvoice(record)}
                    >
                        <EyeOutlined />
                        View
                    </Button>
                    <Button
                        className="user-bookings-cancel-button"
                        type='primary'
                        onClick={() => openCancelModal(record.key)}
                    >
                        <CloseCircleOutlined />
                        Cancel
                    </Button>
                </Space>
            )
        }
    ]

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            {loadingCancel ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <Spin size="large" description="Cancelling booking..." />
                </div>
            ) : (


                <div className="user-bookings-page">
                    <div className="user-bookings-container">
                        <div className="user-bookings-header">
                            <h2>My Bookings</h2>
                            <p>Track your latest reservations and payment status.</p>
                        </div>

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
                                    { value: "Not Paid", label: "Not Paid" },
                                    { value: "Pending", label: "Pending" },
                                    { value: "Fully Paid", label: "Fully Paid" },
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
                        </div>

                        <div className="user-bookings-table">
                            <Table
                                columns={columns}
                                dataSource={filteredData}
                                loading={loading}
                                pagination={{ pageSize: 10 }}
                                scroll={{ x: 'max-content' }}
                            />
                        </div>
                    </div>



                    <Modal
                        className="logout-confirm-modal"
                        open={cancelModalOpen}
                        onCancel={closeCancelModal}
                        onOk={confirmCancelBooking}
                        okText="Cancel Booking"
                        cancelText="Keep Booking"
                        okButtonProps={{ className: 'logout-confirm-btn' }}
                        cancelButtonProps={{ className: 'logout-cancel-btn' }}
                        title={(
                            <div className="logout-confirm-title" style={{ textAlign: 'center' }}>
                                Confirm Cancellation
                            </div>
                        )}
                        style={{ top: 65 }}
                    >
                        <div className="logout-confirm-content" style={{ textAlign: 'center' }}>
                            <p className="logout-confirm-text">Are you sure you want to cancel this booking?</p>
                            <Select
                                value={cancelReason || undefined}
                                onChange={(value) => setCancelReason(value)}
                                placeholder="Select a reason"
                                style={{ width: '100%', marginTop: 12 }}
                                options={[
                                    { value: 'Medical Concern', label: 'Medical Concern' },
                                    { value: 'Schedule Conflict', label: 'Schedule Conflict' },
                                    { value: 'Other', label: 'Other' }
                                ]}
                            />
                            {cancelReason === 'Other' && (
                                <Input
                                    value={cancelOtherReason}
                                    onChange={(event) => setCancelOtherReason(event.target.value)}
                                    placeholder="Please specify"
                                    style={{ width: '100%', marginTop: 12 }}
                                />
                            )}
                            <Input.TextArea
                                value={cancelComments}
                                onChange={(event) => setCancelComments(event.target.value)}
                                placeholder="Additional comments (optional)"
                                autoSize={{ minRows: 3, maxRows: 5 }}
                                className="user-bookings-comments"
                            />
                            <div className="user-bookings-upload">
                                <input
                                    ref={fileInputRef}
                                    className="package-image-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    style={{ display: "none" }}
                                />
                                <Button
                                    className="user-bookings-upload-btn"
                                    onClick={() => fileInputRef.current.click()}
                                    icon={<UploadOutlined />}
                                    block
                                >
                                    Upload file
                                </Button>

                                {previewImage && (
                                    <div style={{ marginTop: 12, textAlign: 'center' }}>
                                        <img
                                            src={previewImage}
                                            alt="Preview"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '150px',
                                                borderRadius: '8px',
                                                border: '1px solid #d9d9d9',
                                                padding: '4px'
                                            }}
                                        />
                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                                            {cancelImages[0]?.name}
                                        </div>
                                    </div>
                                )}

                                <div className="user-bookings-upload-note">
                                    Uploading at least one file is required.
                                </div>
                            </div>
                        </div>
                    </Modal>
                </div>
            )}
        </ConfigProvider>
    )
}
