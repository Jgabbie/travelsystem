import React, { useEffect, useState } from "react";
import { Card, Table, Button, Row, Col, Statistic, Tag, Empty, message, ConfigProvider, Space, Select, Input, DatePicker, Modal } from "antd";
import { FileTextOutlined, ClockCircleOutlined, IdcardOutlined, InboxOutlined, CheckCircleFilled, CheckCircleOutlined, CloseCircleOutlined, CheckOutlined, CloseOutlined, EyeOutlined, FilePdfOutlined, SearchOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import dayjs from "dayjs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/visaapplications.css";
import "../../style/components/modals/modaldesign.css";

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
    const { auth } = useAuth();
    const isEmployee = auth?.role === "Employee";
    const basePath = isEmployee ? "/employee" : "";

    const [applications, setApplications] = useState([])
    const [archivedApplications, setArchivedApplications] = useState([])
    const [showArchived, setShowArchived] = useState(false)
    const [isFetchingApplications, setIsFetchingApplications] = useState(false);

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [submissionDateFilter, setSubmissionDateFilter] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isVisaApplicationDeletedModalOpen, setIsVisaApplicationDeletedModalOpen] = useState(false);
    const [isVisaApplicationRestoredModalOpen, setIsVisaApplicationRestoredModalOpen] = useState(false);
    const [archivingApplication, setArchivingApplication] = useState(null);

    const loadApplications = async () => {
        try {
            setIsFetchingApplications(true);
            const response = await apiFetch.get('/visa/applications')

            const applications = response.map((a) => ({
                key: a.applicationItem,
                applicationNumber: a.applicationNumber,
                applicantName: a.applicantName,
                serviceName: a.serviceName,
                preferredDate: a.preferredDate ? dayjs(a.preferredDate).format('MMM DD, YYYY') : 'Not Set',
                preferredTime: a.preferredTime ? dayjs(a.preferredTime, 'HH:mm').format('hh:mm A') : 'Not Set',
                status: a.status,
            }))

            console.log("Fetched applications:", applications)

            setApplications(applications)
        } catch (error) {
            const errorMessage = error?.data?.message || 'Unable to load visa applications.'
            message.error(errorMessage)
            setApplications([])
        } finally {
            setIsFetchingApplications(false)
        }
    }

    const loadArchivedApplications = async () => {
        try {
            setIsFetchingApplications(true);
            const response = await apiFetch.get('/visa/archived-applications')

            const applications = response.map((a) => ({
                key: a._id,
                applicationNumber: a.applicationNumber,
                applicantName: a.applicantName,
                serviceName: a.serviceName,
                preferredDate: a.preferredDate ? dayjs(a.preferredDate).format('MMM DD, YYYY') : 'Not Set',
                preferredTime: a.preferredTime ? dayjs(a.preferredTime, 'HH:mm').format('hh:mm A') : 'Not Set',
                status: a.status,
            }))

            setArchivedApplications(applications)
        } catch (error) {
            const errorMessage = error?.data?.message || 'Unable to load archived visa applications.'
            message.error(errorMessage)
            setArchivedApplications([])
        } finally {
            setIsFetchingApplications(false)
        }
    }

    useEffect(() => {
        loadApplications()
    }, [])


    const currentData = showArchived ? archivedApplications : applications

    const filteredData = currentData.filter(item => {
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
            doc.addImage(imgData, "PNG", 14, 12, 35, 22);
        } catch (e) {
            console.warn("Logo not found at /public/images/Logo.png");
        }

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("M&RC TRAVEL AND TOURS", 52, 18);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1, Brgy", 52, 23);
        doc.text("San Antonio, Paranaque City, Philippines, 1709 PHL", 52, 27);
        doc.text("+639690554806 | info1@mrctravels.com", 52, 31);

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

    const handleArchive = async (key) => {
        try {
            await apiFetch.delete(`/visa/applications/${key}/archive`)
            setIsVisaApplicationDeletedModalOpen(true);
            setApplications((prev) => prev.filter((item) => item.key !== key))
        } catch (error) {
            console.error("Error archiving visa application:", error)
            message.error("Visa application archived unsuccessfully")
        }
    }

    const handleRestore = async (key) => {
        try {
            await apiFetch.post(`/visa/archived-applications/${key}/restore`)
            setIsVisaApplicationRestoredModalOpen(true);
            setArchivedApplications((prev) => prev.filter((item) => item.key !== key))
        } catch (error) {
            console.error("Error restoring visa application:", error)
            message.error("Visa application restore unsuccessfully")
        }

    }

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
                const statusColorMap = {
                    Pending: 'orange',
                    Approved: 'green',
                    Rejected: 'red',
                    'Payment complete': 'blue',
                    'Documents uploaded': 'gold',
                    'Documents approved': 'green',
                    'Documents received': 'cyan',
                    'Documents submitted': 'purple',
                    'Processing DFA': 'geekblue'
                };

                const fallbackColors = ['magenta', 'volcano', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];
                const getStatusColor = (value) => {
                    if (!value) return 'default';
                    if (statusColorMap[value]) return statusColorMap[value];
                    let hash = 0;
                    for (let i = 0; i < value.length; i += 1) {
                        hash = (hash * 31 + value.charCodeAt(i)) % fallbackColors.length;
                    }
                    return fallbackColors[hash];
                };

                return (
                    <Tag color={getStatusColor(String(currentStatus || ''))}>
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
                            onClick={() => navigate(`${basePath}/visa-applications/view`, { state: { applicationItem: record.key } })}
                        >
                        </Button>
                        {showArchived ? (
                            <Button
                                icon={<CheckCircleOutlined />}
                                className='visaapplications-restore-button'
                                type="primary"
                                onClick={() => {
                                    setArchivingApplication(record);
                                    setIsRestoreModalOpen(true);
                                }}
                            >
                            </Button>
                        ) : (
                            <Button
                                icon={<DeleteOutlined />}
                                className='visaapplications-archive-button'
                                type="primary"
                                onClick={() => {
                                    setArchivingApplication(record);
                                    setIsDeleteModalOpen(true);
                                }}
                            >
                            </Button>
                        )}
                    </Space>
                </>
            ),
        },
    ];

    const archivedColumns = columns.map((col) => {
        if (col.title !== "Actions") {
            return col;
        }

        return {
            ...col,
            render: (text, record) => (
                <Space>
                    <Button
                        icon={<CheckCircleOutlined />}
                        className='visaapplications-restore-button'
                        type="primary"
                        onClick={() => {
                            setArchivingApplication(record);
                            setIsRestoreModalOpen(true);
                        }}
                    >
                        Restore
                    </Button>
                </Space>
            )
        };
    });

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

                {!showArchived && (
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
                )}

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
                        <Button
                            icon={showArchived ? <IdcardOutlined /> : <InboxOutlined />}
                            className='visaapplications-archive'
                            type="primary"
                            onClick={() => {
                                const nextValue = !showArchived
                                setShowArchived(nextValue)
                                setSearchText("")
                                setStatusFilter("")
                                setSubmissionDateFilter(null)
                                if (nextValue) {
                                    loadArchivedApplications()
                                } else {
                                    loadApplications()
                                }
                            }}
                        >
                            {showArchived ? 'Back' : 'Archives'}
                        </Button>
                    </Space>
                </div>

                <Card>
                    <Table
                        columns={showArchived ? archivedColumns : columns}
                        dataSource={filteredData}
                        rowKey="key"
                        loading={isFetchingApplications}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        locale={{
                            emptyText: (
                                <Empty description="No data" />
                            ),
                        }}

                    />
                </Card>
            </div>


            {/* ARCHIVE VISA APPLICATION CONFIRMATION MODAL */}
            <Modal
                open={isDeleteModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Archive Visa Application?</h1>
                    <p className='modal-text'>Are you sure you want to archive this visa application?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleArchive(archivingApplication.key);
                                setIsDeleteModalOpen(false);
                            }}
                        >
                            Archive
                        </Button>
                        <Button
                            type='primary'
                            className='modal-button-cancel'
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setArchivingApplication(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>


            {/* RESTORE VISA APPLICATION CONFIRMATION MODAL */}
            <Modal
                open={isRestoreModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsRestoreModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Restore Visa Application?</h1>
                    <p className='modal-text'>Are you sure you want to restore this visa application?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleRestore(archivingApplication.key);
                                setIsRestoreModalOpen(false);
                            }}
                        >
                            Restore
                        </Button>
                        <Button
                            type='primary'
                            className='modal-button-cancel'
                            onClick={() => {
                                setIsRestoreModalOpen(false);
                                setArchivingApplication(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>



            {/* VISA APPLICATION HAS BEEN ARCHIVED MODAL */}
            <Modal
                open={isVisaApplicationDeletedModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsVisaApplicationDeletedModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Visa Application Archived Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='modal-text'>The visa application has been archived.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsVisaApplicationDeletedModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>

            {/* VISA APPLICATION HAS BEEN RESTORED MODAL */}
            <Modal
                open={isVisaApplicationRestoredModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsVisaApplicationRestoredModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Visa Application Restored Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='modal-text'>The visa application has been restored.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsVisaApplicationRestoredModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>










        </ConfigProvider>
    );
};