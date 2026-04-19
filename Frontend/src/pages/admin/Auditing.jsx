import React, { useEffect, useMemo, useState } from 'react';
import { Tag, Table, Input, ConfigProvider, Select } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import apiFetch from '../../config/fetchConfig';

export default function Auditing() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    //get audit logs from backend and map to state
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await apiFetch.get('/logs/get-audits', {
                    withCredentials: true
                });

                setLogs(response || []);
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
            title: 'Date/Time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 170,
            sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
            render: (text) => new Date(text).toLocaleString(),
        },
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            width: 160,
            onFilter: (value, record) => record.action?.includes(value),
            render: (text) => <Tag color="purple">{text}</Tag>
        },
        {
            title: 'Performed By',
            dataIndex: 'performedBy',
            key: 'performedBy',
            width: 220,
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
            width: 100,
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
            width: 360,
            render: (details, record) => {

                if (!details || typeof details !== 'object') {
                    return <div style={{ fontSize: '12px', color: '#888' }}>No details</div>;
                }

                const entries = Object.entries(details);
                if (entries.length === 0) {
                    return <div style={{ fontSize: '12px', color: '#888' }}>No details</div>;
                }

                return (
                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: '12px', color: '#555' }}>
                        {entries.map(([key, value]) => (
                            <li key={key}>
                                <strong>{key}:</strong> {String(value ?? 'N/A')}
                            </li>
                        ))}
                    </ul>
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
                    tableLayout="fixed"
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                />
            </div>
        </ConfigProvider>
    );
}