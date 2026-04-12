import React, { useEffect, useState } from "react";
import { Card, Table, Button, Row, Col, Statistic, Tag, Empty, message, ConfigProvider, Space, Select, Input, DatePicker } from "antd";
import { FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined, CheckOutlined, CloseOutlined, EyeOutlined, FilePdfOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiFetch from "../../config/fetchConfig";
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
    const navigate = useNavigate();

    const [applications, setApplications] = useState([])

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [submissionDateFilter, setSubmissionDateFilter] = useState(null);

    useEffect(() => {
        const loadApplications = async () => {
            try {
                const response = await apiFetch.get('/visa/applications')

                const applications = response.map((a) => ({
                    key: a._id,
                    applicationNumber: a.applicationNumber,
                    applicantName: a.applicantName,
                    serviceName: a.serviceName,
                    preferredDate: a.preferredDate ? dayjs(a.preferredDate).format('MMM DD, YYYY') : 'Not Set',
                    preferredTime: a.preferredTime ? dayjs(a.preferredTime, 'HH:mm').format('hh:mm A') : 'Not Set',
                    status: a.status,
                }))

                setApplications(applications)
            } catch (error) {
                const errorMessage = error?.data?.message || 'Unable to load visa applications.'
                message.error(errorMessage)
                setApplications([])
            }
        }
        loadApplications()
    }, [])


    const filteredData = applications.filter(item => {
        const matchesSearch =
            (item.applicationNumber?.toString().toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.applicantName?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.serviceName?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (dayjs(item.preferredDate).format('MMM DD, YYYY').toLowerCase().includes(searchText.toLowerCase())) ||
            (item.status?.toLowerCase() || "").includes(searchText.toLowerCase());


        const matchesStatus = statusFilter === "" || item.status === statusFilter;

        const matchesDate = !submissionDateFilter ||
            (item.preferredDate && dayjs(item.preferredDate).isSame(submissionDateFilter, "day"));

        return matchesSearch && matchesStatus && matchesDate;
    });

    const totals = applications.length
    const pending = applications.filter((item) => item.status === 'Pending').length
    const approved = applications.filter((item) => item.status === 'Approved').length
    const rejected = applications.filter((item) => item.status === 'Rejected').length


    const generatePDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const tableColumn = ["Application Number", "Applicant Name", "Visa Type", "Submission Date", "Status"];
        const tableRows = filteredData.map(item => [
            item.applicationNumber,
            item.applicantName,
            item.serviceName,
            item.preferredDate,
            item.status
        ]);

        try {
            const imgData = await getBase64ImageFromURL("/images/Logo.png");
            doc.addImage(imgData, "PNG", 14, 12, 30, 22);
        } catch (e) {
            console.warn("Logo not found at /public/images/Logo.png");
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("M&RC TRAVEL AND TOURS", 50, 18);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1, Brgy", 50, 23);
        doc.text("San Antonio, Paranaque City, Philippines, 1709 PHL", 50, 27);
        doc.text("+639690554806 | info1@mrctravels.com", 50, 31);

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
            dataIndex: "applicantName",
            key: "applicantName",
        },
        {
            title: "Visa Type",
            dataIndex: "serviceName",
            key: "serviceName",
            render: (type) => <Tag color="blue">{type || "N/A"}</Tag>,
        },
        {
            title: "Preferred Date",
            dataIndex: "preferredDate",
            key: "preferredDate",
        },
        {
            title: "Preferred Time",
            dataIndex: "preferredTime",
            key: "preferredTime",
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => {
                const currentStatus = Array.isArray(status) ? status[status.length - 1] : status;

                return (
                    <Tag >
                        {currentStatus || "Unknown"}
                    </Tag>
                );
            }
        },
        {
            title: "Actions",
            key: "actions",
            render: (text, record) => (
                <>
                    <Space>
                        <Button
                            className='viewbutton-visa-application'
                            type="primary"
                            icon={<EyeOutlined />}
                            onClick={() => navigate(`/visa-applications/view/${record.key}`)}
                        >
                            View
                        </Button>
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
                                value={totals}
                                prefix={<FileTextOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Card className="visaapps-management-card">
                            <Statistic
                                title="Pending"
                                value={pending}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Card className="visaapps-management-card">
                            <Statistic
                                title="Approved"
                                value={approved}
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Card className="visaapps-management-card">
                            <Statistic
                                title="Rejected"
                                value={rejected}
                                prefix={<CloseCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                <div className="visaapplications-actions">
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Search reference, package, method or status..."
                        className="search-input"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                    />

                    <Select
                        className="transaction-select"
                        placeholder="Status"
                        style={{ width: 140 }}
                        allowClear
                        value={statusFilter || undefined}
                        onChange={(v) => setStatusFilter(v || "")}
                        options={[
                            { value: "Successful", label: "Successful" },
                            { value: "Pending", label: "Pending" },
                            { value: "Failed", label: "Failed" }
                        ]}
                    />

                    <DatePicker
                        className="transaction-date-filter"
                        placeholder="Preferred Date"
                        value={submissionDateFilter}
                        onChange={(d) => setSubmissionDateFilter(d)}
                        allowClear
                        showToday={false}
                    />

                    <Space style={{ marginLeft: "auto" }}>
                        <Button
                            className='visaapplications-export'
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
                        dataSource={filteredData}
                        rowKey="key"
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