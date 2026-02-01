import React from "react";
import {
    Card,
    Table,
    Button,
    Row,
    Col,
    Statistic,
    Tag,
    Empty,
} from "antd";
import {
    FileTextOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";

export default function VisaApplications() {
    const columns = [
        {
            title: "Application ID",
            dataIndex: "applicationId",
            key: "applicationId",
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
                    <Button size="small" type="primary" disabled>
                        Review
                    </Button>
                    <Button
                        size="small"
                        danger
                        disabled
                        style={{ marginLeft: 8 }}
                    >
                        Reject
                    </Button>
                </>
            ),
        },
    ];

    return (
        <div>
            {/* Header */}
            <h1 className="page-header">Visa Applications</h1>

            {/* Stats */}
            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Total Applications"
                            value="—"
                            prefix={<FileTextOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Pending"
                            value="—"
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Approved"
                            value="—"
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Rejected"
                            value="—"
                            prefix={<CloseCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Table */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={[]}
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
    );
};