import React, { useEffect, useMemo, useState } from 'react'
import { Card, Table, Button, Space, Row, Col, Statistic } from 'antd'
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    CheckOutlined,
    CloseOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import axiosInstance from '../config/axiosConfig'
import '../style/users.css'

export default function CancellationRequests() {
    const [requests, setRequests] = useState([])

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
                    status: item.status || 'pending'
                }
            })

            setRequests(mapped)
        } catch (err) {
            console.error('Error fetching cancellation requests:', err)
        }
        return []
    }

    const handleAction = (key, status) => {
        setRequests((prev) =>
            prev.map((item) => (item.key === key ? { ...item, status } : item))
        )
    }

    const totalRequests = requests.length
    const approvedRequests = requests.filter((item) => item.status === 'approved').length
    const disapprovedRequests = requests.filter((item) => item.status === 'disapproved').length

    const columns = useMemo(() => [
        {
            title: 'Username',
            dataIndex: 'username',
            key: 'username'
        },
        {
            title: 'Package',
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
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        className="approve-cancellation"
                        icon={<CheckOutlined />}
                        onClick={() => handleAction(record.key, 'approved')}
                    />
                    <Button
                        className="reject-cancellation"
                        icon={<CloseOutlined />}
                        onClick={() => handleAction(record.key, 'disapproved')}
                    />
                </Space>
            )
        }
    ], [])

    return (
        <div className="user-management-container">
            <h1 className="page-header">Cancellation Requests</h1>

            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Total Requests"
                            value={totalRequests}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Approved"
                            value={approvedRequests}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Disapproved"
                            value={disapprovedRequests}
                            prefix={<CloseCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card style={{ marginTop: 20 }}>
                <Table
                    columns={columns}
                    dataSource={requests}
                    pagination={{ pageSize: 6 }}
                />
            </Card>
        </div>
    )
}
