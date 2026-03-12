import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Button, Row, Col, Statistic, Tag, Empty, message, ConfigProvider, Space } from "antd";
import { FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, CheckOutlined, CloseOutlined, EyeOutlined, FilePdfOutlined } from "@ant-design/icons";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axiosInstance from "../../config/axiosConfig";
import "../../style/admin/visaapplications.css";

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

    const generatePDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const tableColumn = ["Application Number", "Applicant Name", "Visa Type", "Submission Date", "Status"];
        const tableRows = tableData.map(item => [
            item.applicationNumber,
            item.name,
            item.visaType,
            item.submittedAt,
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
        doc.text("VISA APPLICATIONS REPORT", 14, 48);

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

        doc.save(`Visa_Applications_Report_${new Date().toLocaleDateString()}.pdf`);
        message.success("Report exported to PDF successfully.");
    };

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
            <div className="visa-applications-container">
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

                <div className="visa-actions" style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
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
                        dataSource={tableData}
                        rowKey="applicationNumber"
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