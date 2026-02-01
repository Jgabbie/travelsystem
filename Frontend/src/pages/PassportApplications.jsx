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
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";

export default function PassportApplications() {
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
            title: "Passport Type",
            dataIndex: "passportType",
            key: "passportType",
            render: (type) => (
                <Tag color="blue">{type || "N/A"}</Tag>
            ),
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
                    Approved: "green",
                    Rejected: "red",
                    Processing: "blue",
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

            <h1 className="page-header">Passport Applications</h1>

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

            <Card>
                <Table
                    columns={columns}
                    dataSource={[]}
                    rowKey="applicationId"
                    pagination={{ pageSize: 10 }}
                    locale={{
                        emptyText: (
                            <Empty description="No passport applications found" />
                        ),
                    }}
                />
            </Card>
        </div>
    );
};


