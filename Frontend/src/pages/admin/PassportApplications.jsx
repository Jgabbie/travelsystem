import React, { useEffect, useState } from "react";
import { Card, Table, Button, Row, Col, Statistic, Tag, Empty, Space, ConfigProvider, message } from "antd";
import { FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, CheckOutlined, CloseOutlined, EyeOutlined, FilePdfOutlined } from "@ant-design/icons";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axiosInstance from "../../config/axiosConfig";
import "../../style/admin/passportapplications.css";

const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute("crossOrigin", "anonymous");
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = (error) => reject(error);
        img.src = url;
    });
};

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

    const generatePDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const tableColumn = ["Application ID", "Applicant Name", "Passport Type", "Submission Date", "Status"];
        const tableRows = passportApplications.map(item => [
            item.applicationId,
            item.username,
            item.applicationType,
            item.createdAt,
            item.status
        ]);

        try {
            const imgData = await getBase64ImageFromURL("/images/Logo.png");
            doc.addImage(imgData, "PNG", 14, 12, 22, 22);
        } catch (e) {
            console.warn("Logo not found at /public/images/Logo.png");
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("M&RC TRAVEL AND TOURS", 40, 18);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1, Brgy", 40, 23);
        doc.text("San Antonio, Paranaque City, Philippines, 1709 PHL", 40, 27);
        doc.text("+639690554806 | info1@mrctravels.com", 40, 31);

        doc.setDrawColor(48, 87, 151);
        doc.line(14, 38, 196, 38);

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(48, 87, 151);
        doc.text("PASSPORT APPLICATIONS REPORT", 14, 48);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`Date Generated: ${new Date().toLocaleString()}`, 14, 55);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 62,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [48, 87, 151] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: 14, right: 14 }
        });

        doc.save(`Passport_Applications_Report_${new Date().toLocaleDateString()}.pdf`);
        message.success("Report exported to PDF successfully.");
    };


    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div className="passport-applications-container">

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

                <div className="passport-actions" style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    <Space>
                        <Button 
                            className='export-pdf-button' 
                            type="primary" 
                            icon={<FilePdfOutlined />} 
                            onClick={generatePDF}
                        >
                            Export to PDF
                        </Button>
                    </Space>
                </div>

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