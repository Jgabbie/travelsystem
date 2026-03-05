import React, { useEffect, useMemo, useState } from 'react'
import { Table, Tag, Button, Space, message, Input, Select, DatePicker, ConfigProvider } from 'antd'
import { SearchOutlined } from '@ant-design/icons/lib/icons'
import dayjs from 'dayjs'
import TopNavUser from '../../components/TopNavUser'
import '../../style/client/usertransactions.css'
import axiosInstance from '../../config/axiosConfig'

export default function UserTransactions() {
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(false)

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [transactionDateFilter, setTransactionDateFilter] = useState(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true)
            try {
                const response = await axiosInstance.get('/transaction/user-transactions')
                setTransactions(response.data || [])
            } catch (error) {
                message.error('Unable to load transactions')
                setTransactions([])
            } finally {
                setLoading(false)
            }
        }

        fetchTransactions()
    }, [])

    const dataSource = useMemo(() => transactions.map((transaction) => ({
        key: transaction._id,
        reference: transaction.reference || transaction._id,
        date: transaction.createdAt
            ? dayjs(transaction.createdAt).format('MMM D, YYYY h:mm A')
            : '--',
        method: transaction.method || '--',
        amount: `₱${Number(transaction.amount || 0).toLocaleString()}`,
        status: transaction.status || '--'
    })), [transactions])

    const filteredData = useMemo(() => dataSource.filter(tx => {
        const matchesSearch =
            tx.reference?.toLowerCase().includes(searchText.toLowerCase()) ||
            tx.method?.toLowerCase().includes(searchText.toLowerCase()) ||
            tx.status?.toLowerCase().includes(searchText.toLowerCase());

        const matchesStatus = !statusFilter || tx.status === statusFilter;

        const matchesDate = !transactionDateFilter ||
            dayjs(tx.createdAt).isSame(transactionDateFilter, 'day');

        return matchesSearch && matchesStatus && matchesDate;
    }), [dataSource, searchText, statusFilter, transactionDateFilter]);

    const columns = [
        {
            title: 'Reference',
            dataIndex: 'reference',
            key: 'reference'
        },
        {
            title: 'Date and Time',
            dataIndex: 'date',
            key: 'date'
        },
        {
            title: 'Payment Method',
            dataIndex: 'method',
            key: 'method'
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount'
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value) => {
                let color = 'default'
                if (value === 'Successful') color = 'green'
                if (value === 'Processing') color = 'gold'
                if (value === 'Refunded') color = 'red'
                return <Tag color={color}>{value}</Tag>
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: () => (
                <Space>
                    <Button className="user-transactions-action user-transactions-action-primary">View</Button>
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
            <div className="user-transactions-page">
                <TopNavUser />
                <div className="user-transactions-container">
                    <div className="user-transactions-header">
                        <h2>My Transactions</h2>
                        <p>Review your payment history and status updates.</p>
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
                            value={transactionDateFilter}
                            onChange={(d) => setTransactionDateFilter(d)}
                            allowClear
                        />
                    </div>


                    <div className="user-transactions-table">
                        <Table
                            columns={columns}
                            dataSource={filteredData}
                            loading={loading}
                            pagination={{ pageSize: 5 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                </div>
            </div>
        </ConfigProvider>
    )
}
