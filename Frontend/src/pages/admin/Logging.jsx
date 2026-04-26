import React, { useEffect, useMemo, useState } from 'react';
import { Tag, Table, Input, ConfigProvider, Select, Card } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import apiFetch from '../../config/fetchConfig';
import '../../style/admin/logging-auditing.css';

export default function Logging() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [searchText, setSearchText] = useState('');

    const roleOptions = useMemo(() => {
        const uniqueRoles = Array.from(
            new Set(logs.map((log) => log?.performedBy?.role).filter(Boolean))
        );
        return uniqueRoles.map((role) => ({ label: role, value: role }));
    }, [logs]);

    const actionOptions = useMemo(() => {
        const uniqueActions = Array.from(new Set(logs.map((log) => log.action))).filter(Boolean);
        return uniqueActions.map((action) => ({ label: action, value: action }));
    }, [logs]);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await apiFetch.get('/logs/get-logs', {
                    withCredentials: true
                });
                setLogs(response || []);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch logs", err);
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    // Filter logic for Search Bar
    const filteredLogs = logs.filter(log => {
        const searchLower = searchText.toLowerCase();
        const matchesSearch = log.action?.toLowerCase().includes(searchLower) ||
            log.performedBy?.username?.toLowerCase().includes(searchLower) ||
            log.performedBy?.email?.toLowerCase().includes(searchLower);

        const matchesRole = roleFilter ? log.performedBy?.role === roleFilter : true;
        const matchesAction = actionFilter ? log.action === actionFilter : true;

        return matchesSearch && matchesRole && matchesAction;
    });

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
            width: 220,
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
            render: (details) => {
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
        },
    ];

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div className="logging-page">
                <h1 className="page-header">System Logs</h1>

                <Card className="logging-actions">
                    <div className="logging-actions-row">
                        <div className="logging-actions-filters">
                            <div className="logging-actions-field logging-actions-field--search">
                                <label className="logging-label">Search</label>
                                <Input
                                    placeholder="Search logs by action, username, or email..."
                                    prefix={<SearchOutlined />}
                                    className="logging-search-input"
                                    onChange={(e) => setSearchText(e.target.value)}
                                />
                            </div>

                            <div className="logging-actions-field">
                                <label className="logging-label">Role</label>
                                <Select
                                    allowClear
                                    placeholder="All roles"
                                    className="logging-select"
                                    value={roleFilter || undefined}
                                    onChange={(value) => setRoleFilter(value || '')}
                                    options={roleOptions}
                                />
                            </div>

                            <div className="logging-actions-field">
                                <label className="logging-label">Action</label>
                                <Select
                                    allowClear
                                    placeholder="All actions"
                                    className="logging-select"
                                    value={actionFilter || undefined}
                                    onChange={(value) => setActionFilter(value || '')}
                                    options={actionOptions}
                                    showSearch
                                    optionFilterProp="label"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <Table
                        className="logging-table"
                        columns={columns}
                        dataSource={filteredLogs}
                        rowKey="_id"
                        loading={loading}
                        tableLayout="fixed"
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                    />
                </Card>

            </div>
        </ConfigProvider>
    );
}