import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Table, Tag, Button, Space, message, Modal, Select, Input, Upload, DatePicker, ConfigProvider } from 'antd'
import { UploadOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import axiosInstance from '../../config/axiosConfig'
import TopNavUser from '../../components/TopNavUser'
import '../../style/client/userbookings.css'
import { useNavigate } from 'react-router-dom'


export default function UserBookings() {
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(false)
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
                const response = await axiosInstance.get('/booking/my-bookings')
                setBookings(response.data || [])
            } catch (error) {
                message.error('Unable to load bookings')
                setBookings([])
            } finally {
                setLoading(false)
            }
        }
        fetchBookings()
    }, [])

    const dataSource = useMemo(() => bookings.map((booking) => {
        const details = booking.bookingDetails || {}
        const travelerCounts = details.travelersCount || {}
        const travelersTotal = Object.values(travelerCounts)
            .reduce((sum, value) => sum + (Number(value) || 0), 0)

        const travelDate = details.travelDate
        const formattedDate = travelDate ? dayjs(travelDate).format('MMM D, YYYY') : '--'
        const bookedDate = booking.createdAt
        const formattedBookedDate = bookedDate ? dayjs(bookedDate).format('MMM D, YYYY') : '--'
        const status = booking.status || 'Complete'


        return {
            key: booking._id,
            reference: booking.reference || booking._id,
            destination: details.packageName || 'Package',
            date: formattedDate,
            bookedDate: formattedBookedDate,
            travelers: travelerCounts || '--',
            bookingType: details.packageType
                ? `${details.packageType.charAt(0).toUpperCase()}${details.packageType.slice(1)}`
                : '--',
            status: status.charAt(0).toUpperCase() + status.slice(1)
        }
    }), [bookings])


    const filteredData = dataSource.filter(item => {
        const matchesSearch =
            (item.reference.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.destination.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.status.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.bookingType.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.travelers && item.travelers.toString().includes(searchText)) ||
            (dayjs(item.date).format('MMM D, YYYY').toLowerCase().includes(searchText.toLowerCase())) ||
            (dayjs(item.bookedDate).format('MMM D, YYYY').toLowerCase().includes(searchText.toLowerCase()));

        const matchesStatus =
            statusFilter === "" || item.status === statusFilter;

        const matchesBookingDate =
            !bookingDateFilter ||
            dayjs(item.bookedDate, 'MMM D, YYYY').isSame(bookingDateFilter, "day");

        const matchesTravelDate =
            !travelDateFilter ||
            dayjs(item.date, 'MMM D, YYYY').isSame(travelDateFilter, "day");

        return matchesSearch && matchesStatus && matchesBookingDate && matchesTravelDate;
    });

    const viewBookingInvoice = () => {
        navigate('/user-booking-invoice')
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

        setCancelImages([{ file, name: file.name }]);


        const reader = new FileReader();
        reader.onload = () => setPreviewImage(reader.result);
        reader.readAsDataURL(file);
    };


    const confirmCancelBooking = async () => {
        if (!cancelReason) {
            message.warning('Please select a cancellation reason')
            return
        }

        if (cancelReason === 'Other' && !cancelOtherReason.trim()) {
            message.warning('Please provide a cancellation reason')
            return
        }

        if (!cancelImages.length) {
            message.warning('Please upload a supporting file')
            return
        }

        try {
            const formData = new FormData();
            formData.append('reason', cancelReason === 'Other' ? cancelOtherReason : cancelReason);
            formData.append('comments', cancelComments || '');
            cancelImages.forEach((item) => {
                if (item?.file) {
                    formData.append('files', item.file);
                }
            });

            await axiosInstance.post(`/booking/cancel/${cancelTargetKey}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            message.success('Booking cancelled')
            closeCancelModal()
        } catch (error) {
            message.error('Unable to cancel booking')
        }
    }

    const columns = [
        {
            title: 'Reference',
            dataIndex: 'reference',
            key: 'reference'
        },
        {
            title: 'Destination',
            dataIndex: 'destination',
            key: 'destination'
        },
        {
            title: 'Travel Date',
            dataIndex: 'date',
            key: 'date'
        },
        {
            title: 'Booked Date',
            dataIndex: 'bookedDate',
            key: 'bookedDate'
        },
        {
            title: 'Travelers',
            dataIndex: 'travelers',
            key: 'travelers'
        },
        {
            title: 'Booking Type',
            dataIndex: 'bookingType',
            key: 'bookingType'
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value) => {
                let color = 'default'
                if (value === 'Successful') color = 'green'
                if (value === 'Pending') color = 'gold'
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
                        className="user-bookings-action user-bookings-action-primary"
                        onClick={viewBookingInvoice}
                    >View</Button>
                    <Button
                        className="user-bookings-action user-bookings-action-danger"
                        onClick={() => openCancelModal(record.key)}
                    >
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
            <div className="user-bookings-page">
                <TopNavUser />
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
                    </div>

                    <div className="user-bookings-table">
                        <Table
                            columns={columns}
                            dataSource={filteredData}
                            loading={loading}
                            pagination={{ pageSize: 5 }}
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
                >
                    <div className="logout-confirm-content" style={{ textAlign: 'center' }}>
                        <p className="logout-confirm-text">Are you sure you want to cancel this booking?</p>
                        <Select
                            value={cancelReason || undefined}
                            onChange={(value) => setCancelReason(value)}
                            placeholder="Select a reason"
                            style={{ width: '100%', marginTop: 12 }}
                            options={[
                                { value: 'Change of plans', label: 'Change of plans' },
                                { value: 'Found a better price', label: 'Found a better price' },
                                { value: 'Scheduling conflict', label: 'Scheduling conflict' },
                                { value: 'Booking mistake', label: 'Booking mistake' },
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
        </ConfigProvider>
    )
}
