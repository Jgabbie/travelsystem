import React, { useState } from 'react'
import { Table, Tag, Button, Space, Input, Select, ConfigProvider, DatePicker, Card } from 'antd'
import { SearchOutlined, EyeOutlined } from '@ant-design/icons'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import apiFetch from '../../config/fetchConfig'
import '../../style/client/userquotation.css'
import TopNavUser from '../../components/topnav/TopNavUser'

export default function UserPackageQuotation() {
    const [searchText, setSearchText] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const [quotations, setQuotations] = useState([])
    const [loading, setLoading] = useState(false)
    const [quotationDateFilter, setQuotationDateFilter] = useState(null);

    const navigate = useNavigate()

    useEffect(() => {
        const fetchQuotations = async () => {
            setLoading(true);
            try {
                const response = await apiFetch.get('/quotation/my-quotations');

                const quotations = response.map(q => {
                    const travelersValue = q.quotationDetails?.travelers;
                    const totalTravelers = typeof travelersValue === 'number'
                        ? travelersValue
                        : (Number(travelersValue?.adult) || 0)
                        + (Number(travelersValue?.child) || 0)
                        + (Number(travelersValue?.infant) || 0);

                    return {
                        key: q._id || q.id,
                        reference: q.reference,
                        packageType: q.packageId?.packageType.toUpperCase() || "N/A",
                        packageName: q.packageId?.packageName || "N/A",
                        travelers: totalTravelers,
                        requestedDate: new Date(q.createdAt).toLocaleDateString() ? dayjs(q.createdAt).format("MMM DD, YYYY") : "Not Set",
                        status: q.status,
                        createdAt: q.createdAt
                    };
                });

                setQuotations(quotations);
            } catch (error) {
                console.error('Error fetching quotations:', error);
                setQuotations([]);
            } finally {
                setLoading(false);
            }
        }
        fetchQuotations();
    }, [])

    const viewQuotation = (id) => {
        navigate(`/user-quotation-request`, { state: { quotationId: id } });
    }

    const filteredDataSource = quotations.filter(item => {
        const matchesSearch =
            (item.reference?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.packageName?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.status?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.travelers.toString().includes(searchText)) ||
            (dayjs(item.createdAt).format('MMM D, YYYY').toLowerCase().includes(searchText.toLowerCase()))

        const matchesStatus = !statusFilter || item.status === statusFilter;

        const matchesDate = !quotationDateFilter || dayjs(item.createdAt).isSame(quotationDateFilter, 'day');

        return matchesSearch && matchesStatus && matchesDate;
    })

    const columns = [
        {
            title: 'Quotation Request No.',
            dataIndex: 'reference',
            key: 'reference'
        },
        {
            title: 'Package Name',
            dataIndex: 'packageName',
            key: 'packageName'
        },
        {
            title: 'Package Type',
            dataIndex: 'packageType',
            key: 'packageType'
        },
        {
            title: 'Travelers',
            dataIndex: 'travelers',
            key: 'travelers'
        },
        {
            title: 'Requested Date',
            dataIndex: 'requestedDate',
            key: 'requestedDate'
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value) => {
                let color = 'default'
                if (value === 'Booked') color = 'green'
                if (value === 'Pending') color = 'gold'
                if (value === 'Rejected') color = 'red'
                if (value === 'Under Review') color = 'blue'
                if (value === 'Revision Requested') color = 'purple'
                return <Tag color={color}>{value}</Tag>
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="primary" className="user-quotation-view-button" icon={<EyeOutlined />} onClick={() => viewQuotation(record.key)}>
                        View
                    </Button>
                </Space>
            )
        }
    ]

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div className="user-quotation-page">
                <div className="user-quotation-container">
                    <div className="user-quotation-header">
                        <h2>My Quotation Requests</h2>
                        <p>Review your customized package quotation requests.</p>
                    </div>

                    <Card className="user-quotation-actions">
                        <div className="user-quotation-actions-row">
                            <div className="user-quotation-actions-filters">
                                <div className="user-quotation-actions-field user-quotation-actions-field--search">
                                    <label className="user-quotation-label">Search</label>
                                    <Input
                                        prefix={<SearchOutlined />}
                                        placeholder="Search reference, package or status..."
                                        className="user-quotation-search-input"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        allowClear
                                    />
                                </div>

                                <div className="user-quotation-actions-field">
                                    <label className="user-quotation-label">Status</label>
                                    <Select
                                        className="user-quotation-select"
                                        placeholder="Status"
                                        allowClear
                                        value={statusFilter || undefined}
                                        onChange={(v) => setStatusFilter(v || "")}
                                        options={[
                                            { value: "Successful", label: "Successful" },
                                            { value: "Pending", label: "Pending" },
                                            { value: "Cancelled", label: "Cancelled" },
                                            { value: "Approved", label: "Approved" },
                                            { value: "Rejected", label: "Rejected" },
                                            { value: "Under Review", label: "Under Review" },
                                            { value: "Revision Requested", label: "Revision Requested" }
                                        ]}
                                    />
                                </div>

                                <div className="user-quotation-actions-field">
                                    <label className="user-quotation-label">Requested Date</label>
                                    <DatePicker
                                        className="user-quotation-date-filter"
                                        placeholder="Requested Date"
                                        value={quotationDateFilter}
                                        onChange={(d) => setQuotationDateFilter(d)}
                                        allowClear
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>

                    <div className="user-quotation-table">
                        <Table
                            columns={columns}
                            dataSource={filteredDataSource}
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                </div>
            </div>
        </ConfigProvider>
    )
}
