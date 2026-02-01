import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Tag, Table } from 'antd';

export default function Auditing() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/logs/get-logs', {
                    withCredentials: true
                });
                
                // FILTER: Only show Audit Events (Exclude Logins/Logouts)
                const auditEvents = response.data.filter(log => {
                    const action = log.action;
                    return ![
                        'USER_LOGIN', 
                        'ADMIN_LOGIN', 
                        'USER_LOGOUT', 
                        'ADMIN_LOGOUT', 
                        'LOGIN_FAILED'
                    ].includes(action);
                });

                setLogs(auditEvents);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch audit logs", err);
            }
        };
        fetchLogs();
    }, []);

    const columns = [
        {
            title: 'Date',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: (text) => new Date(text).toLocaleString(),
        },
        {
            title: 'Audit Event',
            dataIndex: 'action',
            key: 'action',
            render: (text) => <Tag color="purple">{text}</Tag>
        },
        {
            title: 'User Affected / Performed By',
            dataIndex: 'performedBy',
            key: 'performedBy',
            render: (user) => user ? (
                <span>{user.username} ({user.role})</span>
            ) : "System/Unknown"
        },
        {
            title: 'Change Details',
            dataIndex: 'details',
            key: 'details',
            render: (details, record) => {
                const isPackageCreate = record.action === 'PACKAGE_CREATED';
                if (isPackageCreate) {
                    return (
                        <div style={{ fontSize: '11px' }}>
                            <div><strong>Name:</strong> {details?.packageName || 'N/A'}</div>
                            <div><strong>Code:</strong> {details?.packageCode || 'N/A'}</div>
                        </div>
                    );
                }

                return (
                    <pre style={{ margin: 0, fontSize: '11px' }}>
                        {JSON.stringify(details, null, 2)}
                    </pre>
                );
            }
        }
    ];

    return (
        <div style={{ padding: "20px" }}>
            <h1 className="page-header">Security Audit Trail</h1>
            <p style={{color: 'gray', marginBottom: '20px'}}>
                Tracks sensitive account changes, creations, and security events.
            </p>

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