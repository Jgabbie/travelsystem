import React, { useEffect, useMemo, useState } from 'react'
import { Table, Tag, Button, Space, message } from 'antd'
import dayjs from 'dayjs'
import TopNavUser from '../components/TopNavUser'
import '../style/usertransactions.css'
import axiosInstance from '../config/axiosConfig'

export default function UserTransactions() {
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(false)

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
            ? dayjs(transaction.createdAt).format('MMM D, YYYY')
            : '--',
        method: transaction.method || '--',
        amount: `₱${Number(transaction.amount || 0).toLocaleString()}`,
        status: transaction.status || '--'
    })), [transactions])

    const columns = [
        {
            title: 'Reference',
            dataIndex: 'reference',
            key: 'reference'
        },
        {
            title: 'Date',
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
                if (value === 'Paid') color = 'green'
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
        <div className="user-transactions-page">
            <TopNavUser />
            <div className="user-transactions-container">
                <div className="user-transactions-header">
                    <h2>My Transactions</h2>
                    <p>Review your payment history and status updates.</p>
                </div>
                <div className="user-transactions-table">
                    <Table
                        columns={columns}
                        dataSource={dataSource}
                        loading={loading}
                        pagination={{ pageSize: 5 }}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </div>
        </div>
    )
}
