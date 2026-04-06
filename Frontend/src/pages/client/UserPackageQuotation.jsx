import React, { useState } from 'react'
import { Table, Tag, Button, Space, Input, Select, ConfigProvider, DatePicker } from 'antd'
import { SearchOutlined, EyeOutlined } from '@ant-design/icons'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import TopNavUser from '../../components/TopNavUser'
import axiosInstance from '../../config/axiosConfig'
import '../../style/client/userquotation.css'

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
                const response = await axiosInstance.get('/quotation/my-quotations');

                const quotations = response.data.map(q => {
                    const travelersValue = q.quotationDetails?.travelers;
                    const totalTravelers = typeof travelersValue === 'number'
                        ? travelersValue
                        : (Number(travelersValue?.adult) || 0)
                        + (Number(travelersValue?.child) || 0)
                        + (Number(travelersValue?.infant) || 0);

                    return {
                        key: q._id || q.id,
                        reference: q.reference,
                        packageName: q.packageId?.packageName || "N/A",
                        travelers: totalTravelers,
                        requestedDate: new Date(q.createdAt).toLocaleDateString() ? dayjs(q.createdAt).format("MMM DD, YYYY") : "Not Set",
                        status: q.status,
                        createdAt: q.createdAt
                    };
                });

                console.log('Fetched quotations:', quotations);

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
        console.log('View quotation with ID:', id)
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
                if (value === 'Approved') color = 'green'
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
                    <Button className="user-quotation-action user-quotation-action-primary" icon={<EyeOutlined />} onClick={() => viewQuotation(record.key)}>
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
                <TopNavUser />
                <div className="user-quotation-container">
                    <div className="user-quotation-header">
                        <h2>My Quotation Requests</h2>
                        <p>Review your customized package quotation requests.</p>
                    </div>

                    <div className="booking-actions">
                        <Input
                            prefix={<SearchOutlined />}
                            placeholder="Search reference, package or status..."
                            className="search-input"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />

                        <Select
                            className="booking-select"
                            placeholder="Status"
                            style={{ width: 140 }}
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

                        <DatePicker
                            className="booking-date-filter"
                            placeholder="Booking Date"
                            value={quotationDateFilter}
                            onChange={(d) => setQuotationDateFilter(d)}
                            allowClear
                        />

                    </div>

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
