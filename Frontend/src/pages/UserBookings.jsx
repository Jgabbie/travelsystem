import React, { useEffect, useMemo, useState } from 'react'
import { Table, Tag, Button, Space, message, Modal, Select, Input } from 'antd'
import dayjs from 'dayjs'
import axiosInstance from '../config/axiosConfig'
import TopNavUser from '../components/TopNavUser'
import '../style/userbookings.css'


export default function UserBookings() {
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(false)
    const [cancelModalOpen, setCancelModalOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState('')
    const [cancelOtherReason, setCancelOtherReason] = useState('')
    const [cancelTargetKey, setCancelTargetKey] = useState(null)

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
        const travelerCounts = details.travelers || {}
        const travelersTotal = Object.values(travelerCounts)
            .reduce((sum, value) => sum + (Number(value) || 0), 0)

        const travelDate = details.travelDate
        const formattedDate = travelDate ? dayjs(travelDate).format('MMM D, YYYY') : '--'

        return {
            key: booking._id,
            reference: booking.reference || booking._id,
            destination: details.packageName || 'Package',
            date: formattedDate,
            travelers: travelersTotal || '--',
            bookingType: details.packageType
                ? `${details.packageType.charAt(0).toUpperCase()}${details.packageType.slice(1)}`
                : '--',
            status: booking.status || 'Complete'
        }
    }), [bookings])

    const openCancelModal = (key) => {
        setCancelTargetKey(key)
        setCancelReason('')
        setCancelOtherReason('')
        setCancelModalOpen(true)
    }

    const closeCancelModal = () => {
        setCancelModalOpen(false)
        setCancelTargetKey(null)
        setCancelReason('')
        setCancelOtherReason('')
    }

    const confirmCancelBooking = async () => {
        if (!cancelReason) {
            message.warning('Please select a cancellation reason')
            return
        }

        if (cancelReason === 'Other' && !cancelOtherReason.trim()) {
            message.warning('Please provide a cancellation reason')
            return
        }

        try {
            const finalReason = cancelReason === 'Other' ? cancelOtherReason.trim() : cancelReason
            await axiosInstance.post(`/booking/cancel/${cancelTargetKey}`, { reason: finalReason })
            setBookings((prev) => prev.filter((item) => item._id !== cancelTargetKey))
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
            title: 'Date',
            dataIndex: 'date',
            key: 'date'
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
                if (value === 'Confirmed') color = 'green'
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
                    <Button className="user-bookings-action user-bookings-action-primary">View</Button>
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
        <div className="user-bookings-page">
            <TopNavUser />
            <div className="user-bookings-container">
                <div className="user-bookings-header">
                    <h2>My Bookings</h2>
                    <p>Track your latest reservations and payment status.</p>
                </div>
                <div className="user-bookings-table">
                    <Table
                        columns={columns}
                        dataSource={dataSource}
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
                </div>
            </Modal>
        </div>

    )
}
