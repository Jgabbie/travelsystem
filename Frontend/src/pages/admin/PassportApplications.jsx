import React, { useEffect, useState } from "react";
import { Card, Table, Button, Row, Col, Statistic, Tag, Empty, Space, ConfigProvider } from "antd";
import { FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, CheckOutlined, CloseOutlined, EyeOutlined } from "@ant-design/icons";
import axiosInstance from "../../config/axiosConfig";
import "../../style/admin/passportapplications.css";

export default function PassportApplications() {

    const [passportApplications, setPassportApplications] = useState([]);

    const columns = [
        {
            title: "Application ID",
            dataIndex: "applicationId",
            key: "applicationId",
        },
        {
            title: "Applicant Name",
            dataIndex: "username",
            key: "username",
        },
        {
            title: "Passport Type",
            dataIndex: "applicationType",
            key: "applicationType",
            render: (type) => (
                <Tag color="blue">{type || "N/A"}</Tag>
            ),
        },
        {
            title: "Submission Date",
            dataIndex: "createdAt",
            key: "createdAt",
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
            render: (text, record) => (
                <>
                    <Space>
                        <Button
                            className='viewbutton-passport-application'
                            type="primary"
                            icon={<EyeOutlined />}
                        />
                        <Button
                            className="approve-passport-application"
                            type="primary"
                            icon={<CheckOutlined />}
                        />
                        <Button
                            className="reject-passport-application"
                            type="primary"
                            icon={<CloseOutlined />}
                        />
                    </Space>
                </>
            ),
        },
    ];

    useEffect(() => {
        const getPassportApplications = async () => {
            try {
                const response = await axiosInstance.get('/passport/applications');
                console.log('Fetched passport applications:', response.data);

                const formattedApplications = response.data.map((data) => ({
                    applicationId: data.applicationId,
                    username: data.username,
                    applicationType: data.applicationType,
                    createdAt: new Date(data.createdAt).toLocaleDateString(),
                    status: data.status,
                }));

                console.log('Formatted passport applications:', formattedApplications);

                setPassportApplications(formattedApplications);

            } catch (error) {
                console.error("Error fetching passport applications:", error);
            }
        }
        getPassportApplications();
    }, []);


    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div>

                <h1 className="page-header">Passport Applications</h1>

                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={6}>
                        <Card className="passportapps-management-card">
                            <Statistic
                                title="Total Applications"
                                value={passportApplications.length}
                                prefix={<FileTextOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Card className="passportapps-management-card">
                            <Statistic
                                title="Pending"
                                value={passportApplications.filter(app => app.status === "Pending").length}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Card className="passportapps-management-card">
                            <Statistic
                                title="Approved"
                                value={passportApplications.filter(app => app.status === "Approved").length}
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Card className="passportapps-management-card">
                            <Statistic
                                title="Rejected"
                                value={passportApplications.filter(app => app.status === "Rejected").length}
                                prefix={<CloseCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={passportApplications}
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
        </ConfigProvider>
    );
};


