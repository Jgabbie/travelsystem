import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Table, Button, Row, Col, Statistic, Tag, Empty, Space, ConfigProvider, Input, Select, DatePicker, Modal, notification } from "antd";
import { FileTextOutlined, TeamOutlined, InboxOutlined, DeleteOutlined, CheckCircleFilled, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EyeOutlined, FilePdfOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/passportapplications.css";
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

export default function PassportApplications() {
    const navigate = useNavigate();

    const [passportApplications, setPassportApplications] = useState([]);
    const [archivedApplications, setArchivedApplications] = useState([]);
    const [showArchived, setShowArchived] = useState(false);
    const [isFetchingApplications, setIsFetchingApplications] = useState(false);

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [submissionDateFilter, setSubmissionDateFilter] = useState(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isPassportApplicationArchivedModalOpen, setIsPassportApplicationArchivedModalOpen] = useState(false);
    const [isPassportApplicationRestoredModalOpen, setIsPassportApplicationRestoredModalOpen] = useState(false);
    const [archivingApplication, setArchivingApplication] = useState(null);


    const getPassportApplications = async () => {
        try {
            setIsFetchingApplications(true);
            const response = await apiFetch.get('/passport/applications');

            const applications = response.map((a) => ({
                key: a._id,
                applicationNumber: a.applicationNumber,
                applicantName: a.username,
                dfaLocation: a.dfaLocation,
                preferredDate: a.preferredDate ? dayjs(a.preferredDate).format("MMM DD, YYYY") : "Not Set",
                preferredTime: a.preferredTime || "Not Set",
                applicationType: a.applicationType,
                status: a.status,
            }));

            setPassportApplications(applications);

        } catch (error) {
            console.error("Error fetching passport applications:", error);
        } finally {
            setIsFetchingApplications(false);
        }
    }

    const getArchivedPassportApplications = async () => {
        try {
            setIsFetchingApplications(true);
            const response = await apiFetch.get('/passport/archived-applications');

            const applications = response.map((a) => ({
                key: a._id,
                applicationNumber: a.applicationNumber,
                applicantName: a.username,
                dfaLocation: a.dfaLocation,
                preferredDate: a.preferredDate ? dayjs(a.preferredDate).format("MMM DD, YYYY") : "Not Set",
                preferredTime: a.preferredTime || "Not Set",
                applicationType: a.applicationType,
                status: a.status,
            }));

            setArchivedApplications(applications);

        } catch (error) {
            console.error("Error fetching archived passport applications:", error);
        } finally {
            setIsFetchingApplications(false);
        }
    }

    useEffect(() => {
        getPassportApplications();
    }, []);

    const currentData = showArchived ? archivedApplications : passportApplications

    const filteredData = currentData.filter(item => {
        const matchesSearch =
            (item.applicationNumber?.toString().toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.applicantName?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.applicationType?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (dayjs(item.preferredDate).format('MMM DD, YYYY').toLowerCase().includes(searchText.toLowerCase())) ||
            (item.status?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.dfaLocation?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.preferredTime?.toLowerCase() || "").includes(searchText.toLowerCase());

        const matchesStatus = statusFilter === "" || item.status === statusFilter;

        const matchesDate = !submissionDateFilter ||
            (item.preferredDate && dayjs(item.preferredDate).isSame(submissionDateFilter, "day"));

        return matchesSearch && matchesStatus && matchesDate;
    });

    const totals = passportApplications.length
    const pending = passportApplications.filter((item) => item.status === 'Pending').length
    const approved = passportApplications.filter((item) => item.status === 'Approved').length
    const rejected = passportApplications.filter((item) => item.status === 'Rejected').length

    const generatePDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const tableColumn = ["Application Number", "Applicant Name", "Passport Type", "Submission Date", "Status"];
        const tableRows = filteredData.map(item => [
            item.applicationNumber,
            item.applicantName,
            item.applicationType,
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
        notification.success({ message: "Report exported to PDF successfully.", placement: "topRight" });
    };

    const handleArchive = async (key) => {
        if (!key) {
            notification.error({ message: "Passport application not found", placement: "topRight" });
            return
        }
        try {
            await apiFetch.delete(`/passport/applications/${key}/archive`)
            setIsPassportApplicationArchivedModalOpen(true);
            setPassportApplications((prev) => prev.filter((item) => item.key !== key))
        } catch (error) {
            console.error("Error archiving passport application:", error)
            notification.error({ message: "Passport application archived unsuccessfully", placement: "topRight" });
        }
    }

    const handleRestore = async (key) => {
        if (!key) {
            notification.error({ message: "Passport application not found", placement: "topRight" });
            return
        }
        try {
            await apiFetch.post(`/passport/archived-applications/${key}/restore`)
            setIsPassportApplicationRestoredModalOpen(true);
            setArchivedApplications((prev) => prev.filter((item) => item.key !== key))
        } catch (error) {
            console.error("Error restoring passport application:", error)
            notification.error({ message: "Passport application restore unsuccessfully", placement: "topRight" });
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
            title: "Passport Type",
            dataIndex: "applicationType",
            key: "applicationType",
            render: (type) => (
                <Tag color="blue">{type || "N/A"}</Tag>
            ),
        },
        {
            title: "DFA Location",
            dataIndex: "dfaLocation",
            key: "dfaLocation",
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
                const colorMap = {
                    Pending: "orange",
                    Approved: "green",
                    Rejected: "red",
                    Processing: "blue",
                };

                const fallbackColors = ['magenta', 'volcano', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'];
                const getStatusColor = (value) => {
                    if (!value) return 'default';
                    if (colorMap[value]) return colorMap[value];
                    let hash = 0;
                    for (let i = 0; i < value.length; i += 1) {
                        hash = (hash * 31 + value.charCodeAt(i)) % fallbackColors.length;
                    }
                    return fallbackColors[hash];
                };

                return (
                    <Tag color={getStatusColor(String(status || ''))}>
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
                            onClick={() => navigate(`view`, { state: { applicationId: record.key } })}
                        >
                        </Button>
                        {showArchived ? (
                            <Button
                                icon={<CheckCircleOutlined />}
                                className='passportapplications-restore-button'
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
                                className='passportapplications-archive-button'
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

                {!showArchived && (
                    <Row gutter={16} style={{ marginBottom: 20 }}>
                        <Col xs={24} sm={6}>
                            <Card className="passportapps-management-card">
                                <Statistic
                                    title="Total Applications"
                                    value={totals}
                                    prefix={<FileTextOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card className="passportapps-management-card">
                                <Statistic
                                    title="Pending"
                                    value={pending}
                                    prefix={<ClockCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card className="passportapps-management-card">
                                <Statistic
                                    title="Approved"
                                    value={approved}
                                    prefix={<CheckCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card className="passportapps-management-card">
                                <Statistic
                                    title="Rejected"
                                    value={rejected}
                                    prefix={<CloseCircleOutlined />}
                                />
                            </Card>
                        </Col>
                    </Row>
                )}

                <Card className="passportapplications-actions">
                    <div className="passportapplications-actions-row">
                        <div className="passportapplications-actions-filters">
                            <div className="passportapplications-actions-field passportapplications-actions-field--search">
                                <label className="passportapplications-label">Search</label>
                                <Input
                                    prefix={<SearchOutlined />}
                                    placeholder="Search reference, package, method or status..."
                                    className="passportapplications-search-input"
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    allowClear
                                />
                            </div>

                            <div className="passportapplications-actions-field">
                                <label className="passportapplications-label">Status</label>
                                <Select
                                    className="passportapplications-select"
                                    placeholder="Status"
                                    allowClear
                                    value={statusFilter || undefined}
                                    onChange={(v) => setStatusFilter(v || "")}
                                    options={[
                                        { value: "Successful", label: "Successful" },
                                        { value: "Pending", label: "Pending" },
                                        { value: "Failed", label: "Failed" }
                                    ]}
                                />
                            </div>

                            <div className="passportapplications-actions-field">
                                <label className="passportapplications-label">Preferred Date</label>
                                <DatePicker
                                    className="passportapplications-date-filter"
                                    placeholder="Preferred Date"
                                    value={submissionDateFilter}
                                    onChange={(d) => setSubmissionDateFilter(d)}
                                    allowClear
                                    showToday={false}
                                />
                            </div>
                        </div>

                        <div className="passportapplications-actions-buttons">
                            <Button
                                className='passportapplications-export'
                                type="primary"
                                icon={<FilePdfOutlined />}
                                onClick={generatePDF}
                            >
                                Export to PDF
                            </Button>
                            <Button
                                icon={showArchived ? <TeamOutlined /> : <InboxOutlined />}
                                className='passportapplications-archive'
                                type="primary"
                                onClick={() => {
                                    const nextValue = !showArchived
                                    setShowArchived(nextValue)
                                    setSearchText("")
                                    setStatusFilter("")
                                    setSubmissionDateFilter(null)
                                    if (nextValue) {
                                        getArchivedPassportApplications()
                                    } else {
                                        getPassportApplications()
                                    }
                                }}
                            >
                                {showArchived ? 'Back' : 'Archives'}
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card className="passportapplications-table-card">
                    <Table
                        columns={columns}
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


            {/* ARCHIVE PASSPORT APPLICATION CONFIRMATION MODAL */}
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
                    <h1 className='modal-heading'>Archive Passport Application?</h1>
                    <p className='modal-text'>Are you sure you want to archive this passport application?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleArchive(archivingApplication?.key);
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


            {/* RESTORE PASSPORT APPLICATION CONFIRMATION MODAL */}
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
                    <h1 className='modal-heading'>Restore Passport Application?</h1>
                    <p className='modal-text'>Are you sure you want to restore this passport application?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleRestore(archivingApplication?.key);
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



            {/* PASSPORT APPLICATION HAS BEEN ARCHIVED MODAL */}
            <Modal
                open={isPassportApplicationArchivedModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsPassportApplicationArchivedModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Passport Application Archived Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='modal-text'>The passport application has been archived.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsPassportApplicationArchivedModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>

            {/* PASSPORT APPLICATION HAS BEEN RESTORED MODAL */}
            <Modal
                open={isPassportApplicationRestoredModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsPassportApplicationRestoredModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Passport Application Restored Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='modal-text'>The passport application has been restored.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsPassportApplicationRestoredModalOpen(false);
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