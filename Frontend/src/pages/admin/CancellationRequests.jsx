import React, { useEffect, useMemo, useState } from 'react'
import { Card, Table, Button, Space, Row, Col, Statistic, Input, DatePicker, ConfigProvider } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, CheckOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import axiosInstance from '../../config/axiosConfig'
import '../../style/admin/cancellationrequests.css'

export default function CancellationRequests() {
    const [requests, setRequests] = useState([])

    const [searchText, setSearchText] = useState('')
    const [dateFilter, setDateFilter] = useState(null)

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
            title: 'Cancellation Date',
            dataIndex: 'cancellationDate',
            key: 'cancellationDate',
            render: (d) => d ? dayjs(d).format('MMM DD, YYYY') : '--'
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

                </div>

                <Card style={{ marginTop: 20 }}>
                    <Table
                        columns={columns}
                        dataSource={filteredRequests}
                        pagination={{ pageSize: 6 }}
                    />
                </Card>
            </div>
        </ConfigProvider>
    )
}
