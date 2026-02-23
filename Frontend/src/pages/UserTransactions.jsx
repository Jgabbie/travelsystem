import React from 'react'
import { Table, Tag, Button, Space } from 'antd'
import TopNavUser from '../components/TopNavUser'
import '../style/usertransactions.css'

export default function UserTransactions() {
    const dataSource = [
        {
            key: 'TX-20451',
            reference: 'TX-20451',
            date: 'Feb 2, 2026',
            method: 'GCash',
            amount: '₱3,500',
            status: 'Paid'
        },
        {
            key: 'TX-20402',
            reference: 'TX-20402',
            date: 'Jan 20, 2026',
            method: 'Card',
            amount: '₱6,200',
            status: 'Processing'
        },
        {
            key: 'TX-20318',
            reference: 'TX-20318',
            date: 'Dec 30, 2025',
            method: 'Bank Transfer',
            amount: '₱2,400',
            status: 'Refunded'
        }
    ]

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
                        pagination={{ pageSize: 5 }}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </div>
        </div>
    )
}
