import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { Tag, Table, Input, ConfigProvider, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export default function Auditing() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    //get audit logs from backend and map to state
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/logs/get-audits', {
                    withCredentials: true
                });

                setLogs(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch audit logs", err);
            }
        };
        fetchLogs();
    }, []);

    //use memo - code only runs when logs changes
    //filters the logs by action
    //this just basically gets the unique actions for better filtering like "CREATE_USER", "DELETE_PACKAGE", etc.
    const actionFilters = useMemo(() => {
        const uniqueActions = Array.from(new Set(logs.map((log) => log.action))).filter(Boolean);
        return uniqueActions.map((action) => ({ text: action, value: action }));
    }, [logs]);

    // Filter logic for Search Bar
    const filteredLogs = logs.filter(log => {
        const searchLower = searchText.toLowerCase();
        const matchesSearch = log.action?.toLowerCase().includes(searchLower) ||
            log.performedBy?.username?.toLowerCase().includes(searchLower) ||
            log.performedBy?.email?.toLowerCase().includes(searchLower);

        const matchesRole = roleFilter ? log.performedBy?.role === roleFilter : true;

        return matchesSearch && matchesRole;
    });

    //columns for the audit logs table
    const columns = [
        {
            title: 'Date',
            dataIndex: 'timestamp',
            key: 'timestamp',
            sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
            render: (text) => new Date(text).toLocaleString(),
        },
        {
            title: 'Audit Event',
            dataIndex: 'action',
            key: 'action',
            filters: actionFilters,
            onFilter: (value, record) => record.action?.includes(value),
            render: (text) => <Tag color="purple">{text}</Tag>
        },
        {
            title: 'User Affected / Performed By',
            dataIndex: 'performedBy',
            key: 'performedBy',
            render: (user) => user ? (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{user.username} ({user.role})</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>{user.email}</div>
                </div>
            ) : "System/Unknown"
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
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div>
                <h1 className="page-header">Security Audit Trail</h1>

                <Input
                    placeholder="Search logs by action, username, or email..."
                    prefix={<SearchOutlined />}
                    className="logs-search-input"
                    style={{ marginBottom: 20, width: 500 }}
                    onChange={(e) => setSearchText(e.target.value)}
                />

                <Table
                    columns={columns}
                    dataSource={filteredLogs}
                    rowKey="_id"
                    loading={loading}
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                />
            </div>
        </ConfigProvider>
    );
}