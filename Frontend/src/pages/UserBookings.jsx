import React from 'react'
import { Table, Tag, Button, Space } from 'antd'
import TopNavUser from '../components/TopNavUser'
import '../style/userbookings.css'


export default function UserBookings() {
    const dataSource = [
        {
            key: 'BK-10231',
            reference: 'BK-10231',
            destination: 'Cebu City Heritage Tour',
            date: 'Feb 1, 2026',
            guests: 2,
            amount: '₱3,500',
            status: 'Confirmed'
        },
        {
            key: 'BK-10189',
            reference: 'BK-10189',
            destination: 'Siargao Surf Adventure',
            date: 'Jan 18, 2026',
            guests: 1,
            amount: '₱6,200',
            status: 'Pending'
        },
        {
            key: 'BK-10102',
            reference: 'BK-10102',
            destination: 'Vigan Day Trip',
            date: 'Dec 30, 2025',
            guests: 4,
            amount: '₱2,400',
            status: 'Completed'
        }
    ]

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
            title: 'Guests',
            dataIndex: 'guests',
            key: 'guests'
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
                if (value === 'Confirmed') color = 'green'
                if (value === 'Pending') color = 'gold'
                if (value === 'Completed') color = 'blue'
                return <Tag color={color}>{value}</Tag>
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: () => (
                <Space>
                    <Button className="user-bookings-action user-bookings-action-primary">View</Button>
                    <Button className="user-bookings-action user-bookings-action-danger">Cancel</Button>
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
                        pagination={{ pageSize: 5 }}
                    />
                </div>
            </div>
        </div>

    )
}
