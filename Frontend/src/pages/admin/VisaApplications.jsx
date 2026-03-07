import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Button, Row, Col, Statistic, Tag, Empty, message, ConfigProvider, Space } from "antd";
import { FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, CheckOutlined, CloseOutlined, EyeOutlined } from "@ant-design/icons";
import axiosInstance from "../../config/axiosConfig";
import "../../style/admin/visaapplications.css";

export default function VisaApplications() {
    const [applications, setApplications] = useState([])

    useEffect(() => {
        const loadApplications = async () => {
            try {
                const response = await axiosInstance.get('/visa/applications')
                setApplications(response.data || [])
            } catch (error) {
                const errorMessage = error?.response?.data?.message || 'Unable to load visa applications.'
                message.error(errorMessage)
                setApplications([])
            }
        }
        loadApplications()
    }, [])

    const tableData = useMemo(() => applications.map((item) => ({
        key: item._id,
        applicationNumber: item.applicationNumber || 'N/A',
        name: item.applicantName || `${item.userId?.firstname || ''} ${item.userId?.lastname || ''}`.trim() || item.userId?.username || 'N/A',
        visaType: item.serviceId?.visaName || 'Visa',
        submittedAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A',
        status: item.status || 'Pending'
    })), [applications])

    const totals = useMemo(() => ({
        total: applications.length,
        pending: applications.filter((item) => item.status === 'Pending').length,
        approved: applications.filter((item) => item.status === 'Approved').length,
        rejected: applications.filter((item) => item.status === 'Rejected').length
    }), [applications])

    const columns = [
        {
            title: "Application Number",
            dataIndex: "applicationNumber",
            key: "applicationNumber",
        },
        {
            title: "Applicant Name",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Visa Type",
            dataIndex: "visaType",
            key: "visaType",
            render: (type) => <Tag color="blue">{type || "N/A"}</Tag>,
        },
        {
            title: "Submission Date",
            dataIndex: "submittedAt",
            key: "submittedAt",
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => {
                const colorMap = {
                    Pending: "orange",
                    Processing: "blue",
                    Approved: "green",
                    Rejected: "red",
                };

                return (
                    <Tag color={colorMap[status] || "default"}>
                        {status || "Unknown"}
                    </Tag>
                );
            },
        },
        {
            title: "Actions",
            key: "actions",
            render: () => (
                <>
                    <Space>
                        <Button
                            className='viewbutton-visa-application'
                            type="primary"
                            icon={<EyeOutlined />}
                        />
                        <Button
                            className="approve-visa-application"
                            type="primary"
                            icon={<CheckOutlined />}
                        />
                        <Button
                            className="reject-visa-application"
                            type="primary"
                            icon={<CloseOutlined />}
                        />
                    </Space>
                </>
            ),
        },
    ];

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div>
                <h1 className="page-header">Visa Applications</h1>

                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={6}>
                        <Card className="visaapps-management-card">
                            <Statistic
                                title="Total Applications"
                                value={totals.total}
                                prefix={<FileTextOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Card className="visaapps-management-card">
                            <Statistic
                                title="Pending"
                                value={totals.pending}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Card className="visaapps-management-card">
                            <Statistic
                                title="Approved"
                                value={totals.approved}
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Card className="visaapps-management-card">
                            <Statistic
                                title="Rejected"
                                value={totals.rejected}
                                prefix={<CloseCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={tableData}
                        rowKey="applicationId"
                        pagination={{ pageSize: 10 }}
                        locale={{
                            emptyText: (
                                <Empty description="No visa applications found" />
                            ),
                        }}
                    />
                </Card>
            </div>
        </ConfigProvider>
    );
};