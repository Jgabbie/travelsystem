import React, { useMemo, useState } from 'react'
import { Table, Tag, Button, Space, Input, Select, Row, Col, Card, Statistic } from 'antd'
import { SearchOutlined, EyeOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import TopNavUser from '../components/TopNavUser'
import '../style/userquotation.css'

export default function UserPackageQuotation() {
    const [searchText, setSearchText] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const [data] = useState([
        {
            key: 'QR-10021',
            reference: 'QR-10021',
            packageName: 'Boracay 4D3N Getaway',
            travelers: 3,
            status: 'Pending'
        },
        {
            key: 'QR-10022',
            reference: 'QR-10022',
            packageName: 'Seoul City Explorer',
            travelers: 2,
            status: 'Approved'
        },
        {
            key: 'QR-10023',
            reference: 'QR-10023',
            packageName: 'Baguio Highlands Tour',
            travelers: 4,
            status: 'Rejected'
        }
    ])

    const filteredData = useMemo(() => (
        data.filter((item) => {
            const matchesSearch =
                item.reference.toLowerCase().includes(searchText.toLowerCase()) ||
                item.packageName.toLowerCase().includes(searchText.toLowerCase()) ||
                item.status.toLowerCase().includes(searchText.toLowerCase())

            const matchesStatus =
                statusFilter === '' || item.status === statusFilter

            return matchesSearch && matchesStatus
        })
    ), [data, searchText, statusFilter])

    const totalRequests = filteredData.length
    const totalPending = filteredData.filter((item) => item.status === 'Pending').length
    const totalApproved = filteredData.filter((item) => item.status === 'Approved').length
    const totalRejected = filteredData.filter((item) => item.status === 'Rejected').length

    const columns = [
        {
            title: 'Quotation Request No.',
            dataIndex: 'reference',
            key: 'reference'
        },
        {
            title: 'Package Name',
            dataIndex: 'packageName',
            key: 'packageName'
        },
        {
            title: 'Travelers',
            dataIndex: 'travelers',
            key: 'travelers'
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value) => {
                let color = 'default'
                if (value === 'Approved') color = 'green'
                if (value === 'Pending') color = 'gold'
                if (value === 'Rejected') color = 'red'
                return <Tag color={color}>{value}</Tag>
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: () => (
                <Space>
                    <Button className="user-quotation-action user-quotation-action-primary" icon={<EyeOutlined />}>
                        View
                    </Button>
                </Space>
            )
        }
    ]

    return (
        <div className="user-quotation-page">
            <TopNavUser />
            <div className="user-quotation-container">
                <div className="user-quotation-header">
                    <h2>My Quotation Requests</h2>
                    <p>Review your customized package quotation requests.</p>
                </div>

                <div className="user-quotation-table">
                    <Table
                        columns={columns}
                        dataSource={filteredData}
                        pagination={{ pageSize: 5 }}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </div>
        </div>
    )
}
