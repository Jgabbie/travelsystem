import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Tag, Table, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export default function Logging() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/logs/get-logs', {
                    withCredentials: true
                });
                setLogs(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch logs", err);
            }
        };
        fetchLogs();
    }, []);

    // Filter logic for Search Bar
    const filteredLogs = logs.filter(log => {
        const searchLower = searchText.toLowerCase();
        return (
            log.action.toLowerCase().includes(searchLower) ||
            log.performedBy?.username?.toLowerCase().includes(searchLower) ||
            log.performedBy?.email?.toLowerCase().includes(searchLower)
        );
    });

    const columns = [
        {
            title: 'Date/Time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
            render: (text) => new Date(text).toLocaleString(),
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            filters: [
                { text: 'Login (User)', value: 'USER_LOGIN' },
                { text: 'Login (Admin)', value: 'ADMIN_LOGIN' },
                { text: 'Logout', value: 'USER_LOGOUT' },
                { text: 'Failed Login', value: 'LOGIN_FAILED' },
            ],
            onFilter: (value, record) => record.action.includes(value),
            render: (text) => {
                let color = 'default';
                if (text.includes('LOGIN')) color = 'green';
                if (text.includes('LOGOUT')) color = 'orange';
                if (text.includes('FAILED')) color = 'red';
                return <Tag color={color}>{text}</Tag>;
            }

            
        },
        {
            title: 'Performed By',
            dataIndex: 'performedBy',
            key: 'performedBy',
            render: (user) => user ? (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{user.username}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{user.email}</div>
                </div>
            ) : "Unknown"
        },
        {
            title: 'Role',
            key: 'role',
            filters: [
                { text: 'Admin', value: 'Admin' },
                { text: 'User', value: 'User' },
            ],
            onFilter: (value, record) => record.performedBy?.role === value,
            render: (_, record) => {
                const role = record.performedBy?.role || "N/A";
                const color = role === 'Admin' ? 'gold' : 'blue';
                return <Tag color={color}>{role.toUpperCase()}</Tag>;
            }
        },
        {
            title: 'Details',
            dataIndex: 'details',
            key: 'details',
            render: (details) => (
                <div style={{ fontSize: '12px', color: '#555' }}>
                    {JSON.stringify(details).replace(/["{}]/g, '').replace(/:/g, ': ')}
                </div>
            )
        },
    ];

    return (
        <div style={{ padding: "20px" }}>
            <h1 className="page-header">System Logs</h1>
            
            <Input
                placeholder="Search logs by action, username, or email..."
                prefix={<SearchOutlined />}
                style={{ marginBottom: 20, width: 300 }}
                onChange={(e) => setSearchText(e.target.value)}
            />

            <Table 
                columns={columns} 
                dataSource={filteredLogs} 
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 8 }}
            />
        </div>
    );
}