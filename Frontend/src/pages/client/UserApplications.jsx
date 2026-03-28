import React, { useEffect, useState } from 'react';
import { Table, Tag, Input, Select, DatePicker, Button, Space, ConfigProvider, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../config/axiosConfig';
import TopNavUser from '../../components/TopNavUser';
import { useNavigate } from 'react-router-dom';

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
                const passportRes = await axiosInstance.get('/passport/applications');
                const passportApps = (passportRes.data || []).map(app => ({
                    key: app._id,
                    ref: app.applicationId || app._id, // Use applicationId if present, fallback to _id
                    type: app.applicationType || 'Passport',
                    name: 'Passport',
                    status: app.status,
                    date: app.createdAt,
                    details: app,
                }));
                // Fetch visa applications
                const visaRes = await axiosInstance.get('/visa/applications');
                const visaApps = (visaRes.data || []).map(app => ({
                    key: app._id,
                    ref: app.applicationNumber || app._id,
                    type: 'Visa',
                    name: app.serviceName || 'Visa',
                    status: app.status,
                    date: app.createdAt,
                    details: app,
                }));
                setApplications([...passportApps, ...visaApps]);
            } catch (err) {
                message.error('Unable to load applications');
                setApplications([]);
            } finally {
                setLoading(false);
            }
        };
        fetchApplications();
    }, []);

    const filteredData = applications.filter(item => {
        const matchesSearch =
            item.ref?.toLowerCase().includes(searchText.toLowerCase()) ||
            item.type?.toLowerCase().includes(searchText.toLowerCase()) ||
            item.status?.toLowerCase().includes(searchText.toLowerCase());
        const matchesType = !typeFilter || item.type === typeFilter;
        const matchesStatus = !statusFilter || item.status === statusFilter;
        const matchesDate = !dateFilter || dayjs(item.date).isSame(dateFilter, 'day');
        return matchesSearch && matchesType && matchesStatus && matchesDate;
    });

    // Status color mapping
    const statusColor = (status) => {
        const s = (status || '').toLowerCase();
        if (s.includes('approved') || s.includes('released')) return 'green';
        if (s.includes('pending') || s.includes('submitted')) return 'blue';
        if (s.includes('processing')) return 'orange';
        if (s.includes('rejected') || s.includes('denied')) return 'red';
        if (s.includes('review')) return 'purple';
        if (s.includes('complete') || s.includes('verified')) return 'cyan';
        return 'default';
    };

    const columns = [
        { title: 'Reference', dataIndex: 'ref', key: 'ref' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        {
            title: 'Type', dataIndex: 'type', key: 'type', filters: [
                { text: 'Passport', value: 'Passport' },
                { text: 'Visa', value: 'Visa' },
            ],
            onFilter: (value, record) => record.type === value
        },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag color={statusColor(value)}>{value}</Tag> },
        { title: 'Application Date', dataIndex: 'date', key: 'date', render: (value) => dayjs(value).format('MMM D, YYYY') },
        {
            title: 'Actions', key: 'actions', render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        onClick={() => {
                            if (record.name === 'Passport') {
                                console.log("Navigating to passport application with ID:", record.key);
                                navigate(`/passport-application/${record.key}`);
                            } else if (record.type === 'Visa') {
                                navigate(`/visa-application/${record.key}`);
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
            <div className="user-bookings-page">
                <TopNavUser />
                <div className="user-bookings-container">
                    <div className="user-bookings-header">
                        <h2>My Applications</h2>
                        <p>Track your latest visa and passport applications.</p>
                    </div>
                    <div className="booking-actions">
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="Search reference, type or status..."
                            className="search-input"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            allowClear
                        />
                        <Select
                            className="booking-select"
                            placeholder="Type"
                            style={{ width: 120 }}
                            allowClear
                            value={typeFilter || undefined}
                            onChange={v => setTypeFilter(v || "")}
                            options={[
                                { value: 'Passport', label: 'Passport' },
                                { value: 'Visa', label: 'Visa' },
                            ]}
                        />
                        <Select
                            className="booking-select"
                            placeholder="Status"
                            style={{ width: 140 }}
                            allowClear
                            value={statusFilter || undefined}
                            onChange={v => setStatusFilter(v || "")}
                            options={Array.from(new Set(applications.map(a => a.status))).map(s => ({ value: s, label: s }))}
                        />
                        <DatePicker
                            className="booking-date-filter"
                            placeholder="Application Date"
                            value={dateFilter}
                            onChange={d => setDateFilter(d)}
                            allowClear
                        />
                    </div>
                    <div className="user-bookings-table">
                        <Table
                            columns={columns}
                            dataSource={filteredData}
                            loading={loading}
                            pagination={{ pageSize: 5 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
}
