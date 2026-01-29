import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Table } from 'antd'; // Using Ant Design Table for better look

export default function Logging() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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
                // navigate('/login'); // Optional: redirect if error
            }
        };

        fetchLogs();
    }, [navigate]);

    // Ant Design Table Columns
    const columns = [
        {
            title: 'Date/Time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text) => new Date(text).toLocaleString(),
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            render: (text) => <strong>{text}</strong>
        },
        {
            title: 'Performed By',
            dataIndex: 'performedBy',
            key: 'performedBy',
            render: (user) => user ? (
                <div>
                    <div>{user.username}</div>
                    <small style={{ color: 'gray' }}>{user.email}</small>
                </div>
            ) : "Unknown"
        },
        {
            title: 'Role',
            key: 'role',
            render: (_, record) => {
                const role = record.performedBy?.role || "N/A";
                // Color code: Admin = Gold/Orange, User = Blue
                const color = role === 'Admin' ? 'gold' : 'blue';
                return (
                    <Tag color={color}>
                        {role.toUpperCase()}
                    </Tag>
                );
            }
        },
        {
            title: 'Details',
            dataIndex: 'details',
            key: 'details',
            render: (details) => (
                <pre style={{ margin: 0, fontSize: '11px', maxHeight: '100px', overflow: 'auto' }}>
                    {JSON.stringify(details, null, 2)}
                </pre>
            )
        },
        {
            title: 'IP Address',
            dataIndex: 'ipAddress',
            key: 'ipAddress',
        },
    ];

    return (
        <div style={{ padding: "20px" }}>
            <h1 className="page-header">System Logs</h1>
            <Table 
                columns={columns} 
                dataSource={logs} 
                rowKey="_id"
                loading={loading}
                pagination={{ pageSize: 8 }}
            />
        </div>
    );
}