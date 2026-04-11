import React, { useEffect, useState } from 'react';
import { Table, Tag, Input, Select, DatePicker, Button, Space, ConfigProvider, message } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosInstance from '../../config/axiosConfig';
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
                const passportRes = await axiosInstance.get('/passport/user-applications');
                const passportApps = (passportRes.data || []).map(app => ({
                    key: app._id,
                    ref: app.applicationNumber,
                    type: 'Passport',
                    name: app.applicationType,
                    status: app.status,
                    date: app.createdAt,
                    details: app,
                }));
                // Fetch visa applications
                const visaRes = await axiosInstance.get('/visa/user-applications');
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
    // Status color mapping

    const columns = [
        { title: 'Reference', dataIndex: 'ref', key: 'ref' },
        { title: 'Name', dataIndex: 'name', key: 'name' },
        {
            title: 'Type', dataIndex: 'type', key: 'type'
        },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (value) => <Tag>{value}</Tag> },
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
                    <div className="userapplications-actions">
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="Search reference, type or status..."
                            className="search-input"
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            allowClear
                        />
                        <Select
                            className="userapplications-select"
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
                            className="userapplications-select"
                            placeholder="Status"
                            style={{ width: 140 }}
                            allowClear
                            value={statusFilter || undefined}
                            onChange={v => setStatusFilter(v || "")}
                            options={Array.from(new Set(applications.map(a => a.status))).map(s => ({ value: s, label: s }))}
                        />
                        <DatePicker
                            className="userapplications-date-filter"
                            placeholder="Application Date"
                            value={dateFilter}
                            onChange={d => setDateFilter(d)}
                            allowClear
                        />
                    </div>
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
