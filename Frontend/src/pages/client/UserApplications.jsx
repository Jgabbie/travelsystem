import React, { useEffect, useState } from 'react';
import { Table, Tag, Input, Select, DatePicker, Button, Space, ConfigProvider, notification, Card } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import apiFetch from '../../config/fetchConfig';
import '../../style/client/userapplications.css'
import { useNavigate } from 'react-router-dom';
import TopNavUser from '../../components/topnav/TopNavUser';

export default function UserApplications() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFilter, setDateFilter] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchApplications = async () => {
            setLoading(true);
            try {
                // Fetch passport applications
                const passportRes = await apiFetch.get('/passport/user-applications');
                const passportApps = (passportRes || []).map(app => ({
                    key: app._id,
                    ref: app.applicationNumber,
                    type: 'Passport',
                    name: app.applicationType,
                    status: app.status,
                    date: app.createdAt,
                    details: app,
                }));
                // Fetch visa applications
                const visaRes = await apiFetch.get('/visa/user-applications');
                const visaApps = (visaRes || []).map(app => ({
                    key: app._id,
                    ref: app.applicationNumber || app._id,
                    type: 'Visa',
                    name: app.serviceName || 'Visa',
                    status: app.status,
                    date: app.createdAt,
                    details: app,
                }));
                const combined = [...passportApps, ...visaApps].sort((a, b) => {
                    const aDate = a.date ? new Date(a.date).getTime() : 0;
                    const bDate = b.date ? new Date(b.date).getTime() : 0;
                    return bDate - aDate;
                });
                setApplications(combined);
            } catch (err) {
                notification.error({ message: 'Unable to load applications', placement: 'topRight' });
                setApplications([]);
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, []);

    const filteredData = applications.filter(item => {
        const search = searchText.toLowerCase();

        const statusStr = item.status ? String(item.status) : '';
        const typeStr = item.type ? String(item.type) : '';
        const refStr = item.ref ? String(item.ref) : '';
        const nameStr = item.name ? String(item.name) : '';

        const matchesSearch =
            refStr.toLowerCase().includes(search) ||
            typeStr.toLowerCase().includes(search) ||
            statusStr.toLowerCase().includes(search) ||
            nameStr.toLowerCase().includes(search);

        const matchesType = !typeFilter || typeStr.toLowerCase() === typeFilter.toLowerCase();
        const matchesStatus = !statusFilter || statusStr.toLowerCase() === statusFilter.toLowerCase();
        const matchesDate = !dateFilter || dayjs(item.date).isSame(dayjs(dateFilter), 'day');

        return matchesSearch && matchesType && matchesStatus && matchesDate;
    });

    const statusColorMap = {
        Pending: 'orange',
        Approved: 'green',
        Disapproved: 'red',
        'Payment Complete': 'blue',
        'Documents Uploaded': 'gold',
        'Documents Approved': 'green',
        'Documents Received': 'cyan',
        'Documents Submitted': 'purple',
        'Processing DFA': 'geekblue'
    };

    const fallbackColors = ['magenta', 'volcano', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];
    const getStatusColor = (value) => {
        if (!value) return 'default';
        if (statusColorMap[value]) return statusColorMap[value];
        let hash = 0;
        for (let i = 0; i < value.length; i += 1) {
            hash = (hash * 31 + value.charCodeAt(i)) % fallbackColors.length;
        }
        return fallbackColors[hash];
    };

    const columns = [
        { title: 'Reference', dataIndex: 'ref', key: 'ref' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        {
            title: 'Type', dataIndex: 'type', key: 'type'
        },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag color={getStatusColor(String(value || ''))}>{value}</Tag> },
        { title: 'Application Date', dataIndex: 'date', key: 'date', render: (value) => dayjs(value).format('MMM D, YYYY') },
        {
            title: 'Actions', key: 'actions', render: (_, record) => (
                <Space>
                    <Button
                        className='userapplications-view-button'
                        icon={<EyeOutlined />}
                        type='primary'
                        onClick={() => {
                            if (record.type === 'Passport') {
                                navigate('/passport-application', { state: { applicationId: record.key } });
                            } else if (record.type === 'Visa') {
                                navigate('/visa-application', { state: { applicationId: record.key } });
                            }
                        }}

                    >
                        View
                    </Button>
                </Space>
            )
        },
    ];

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            <div className="userapplications-page">
                <div className="userapplications-container">
                    <div className="userapplications-header">
                        <h2>My Applications</h2>
                        <p>Track your latest visa and passport applications.</p>
                    </div>
                    <Card className="userapplications-actions">
                        <div className="userapplications-actions-row">
                            <div className="userapplications-actions-filters">
                                <div className="userapplications-actions-field userapplications-actions-field--search">
                                    <label className="userapplications-label">Search</label>
                                    <Input
                                        prefix={<SearchOutlined />}
                                        placeholder="Search reference, type or status..."
                                        className="userapplications-search-input"
                                        value={searchText}
                                        onChange={e => setSearchText(e.target.value)}
                                        allowClear
                                    />
                                </div>

                                <div className="userapplications-actions-field">
                                    <label className="userapplications-label">Type</label>
                                    <Select
                                        className="userapplications-select"
                                        placeholder="Type"
                                        allowClear
                                        value={typeFilter || undefined}
                                        onChange={v => setTypeFilter(v || "")}
                                        options={[
                                            { value: 'Passport', label: 'Passport' },
                                            { value: 'Visa', label: 'Visa' },
                                        ]}
                                    />
                                </div>

                                <div className="userapplications-actions-field">
                                    <label className="userapplications-label">Status</label>
                                    <Select
                                        className="userapplications-select"
                                        placeholder="Status"
                                        allowClear
                                        value={statusFilter || undefined}
                                        onChange={v => setStatusFilter(v || "")}
                                        options={Array.from(new Set(applications.map(a => a.status))).map(s => ({ value: s, label: s }))}
                                    />
                                </div>

                                <div className="userapplications-actions-field">
                                    <label className="userapplications-label">Application Date</label>
                                    <DatePicker
                                        className="userapplications-date-filter"
                                        placeholder="Application Date"
                                        value={dateFilter}
                                        onChange={d => setDateFilter(d)}
                                        allowClear
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>
                    <div className="userapplications-table">
                        <Table
                            columns={columns}
                            dataSource={filteredData}
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}
