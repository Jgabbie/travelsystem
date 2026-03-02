import React, { useMemo, useState } from 'react'
import { Table, Tag, Button, Space, Input, Select, Row, Col, Card, Statistic } from 'antd'
import { SearchOutlined, EyeOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopNavUser from '../../components/TopNavUser'
import axiosInstance from '../../config/axiosConfig'
import '../../style/client/userquotation.css'



export default function UserPackageQuotation() {
    const [searchText, setSearchText] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [quotations, setQuotations] = useState([])
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()

    useEffect(() => {
        const fetchQuotations = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get('/quotation/my-quotations');
                setQuotations(response.data || []);
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
        // Implement view logic, e.g. navigate to detail page
        navigate(`/user-quotation-request/${id}`);
        console.log('View quotation with ID:', id)

    }

    const dataSource = useMemo(() => quotations.map((quotation) => {
        const travelDetails = quotation.travelDetails || {}

        return {
            key: quotation._id,
            reference: quotation.reference || quotation._id,
            packageName: quotation.packageName || "N/A",
            travelers: travelDetails.travelers || 0,
            status: quotation.status || "Pending"
        }
    }), [quotations])

    const filteredData = useMemo(() => (
        quotations.filter((item) => {
            const matchesSearch =
                item.reference.toLowerCase().includes(searchText.toLowerCase()) ||
                item.packageName.toLowerCase().includes(searchText.toLowerCase()) ||
                item.status.toLowerCase().includes(searchText.toLowerCase())

            const matchesStatus =
                statusFilter === '' || item.status === statusFilter

            return matchesSearch && matchesStatus
        })
    ), [quotations, searchText, statusFilter])

    const totalRequests = filteredData.length
    const totalPending = filteredData.filter((item) => item.status === 'Pending').length
    const totalApproved = filteredData.filter((item) => item.status === 'Approved').length
    const totalRejected = filteredData.filter((item) => item.status === 'Rejected').length

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
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value) => {
                let color = 'default'
                if (value === 'Approved') color = 'green'
                if (value === 'Pending') color = 'gold'
                if (value === 'Rejected') color = 'red'
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
        <div className="user-quotation-page">
            <TopNavUser />
            <div className="user-quotation-container">
                <div className="user-quotation-header">
                    <h2>My Quotation Requests</h2>
                    <p>Review your customized package quotation requests.</p>
                </div>

                <div className="user-quotation-table">
                    <Table
                        columns={columns}
                        dataSource={dataSource}
                        loading={loading}
                        pagination={{ pageSize: 5 }}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </div>
        </div>
    )
}
