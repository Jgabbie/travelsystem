import React, { useEffect, useState } from "react";
import { Input, Select, Button, Table, Tag, Space, Row, Col, Card, Statistic, Form, Modal, ConfigProvider, DatePicker, Tabs, notification } from "antd";
import { SearchOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined, FilePdfOutlined, CheckCircleFilled, InboxOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf';
import dayjs from "dayjs";
import autoTable from 'jspdf-autotable';
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/quotationmanagement.css";
import "../../style/components/modals/modaldesign.css";
import { useAuth } from "../../hooks/useAuth";


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

export default function QuotationManagement() {
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [dateFilter, setDateFilter] = useState(null)
    const [packageTypeFilter, setPackageTypeFilter] = useState("");

    const [form] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [archivedData, setArchivedData] = useState([]);
    const [showArchived, setShowArchived] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isQuotationDeletedModalOpen, setIsQuotationDeletedModalOpen] = useState(false);
    const [isQuotationRestoredModalOpen, setIsQuotationRestoredModalOpen] = useState(false);
    const [editingQuotation, setEditingQuotation] = useState(null);

    const navigate = useNavigate()
    const { auth } = useAuth()
    const isEmployee = auth?.role === 'Employee'
    const basePath = isEmployee ? '/employee' : ''

    const sumTravelers = (travelers) => {
        if (typeof travelers === "number") return travelers;
        if (!travelers || typeof travelers !== "object") return 0;
        const adult = Number(travelers.adult) || 0;
        const child = Number(travelers.child) || 0;
        const infant = Number(travelers.infant) || 0;
        return adult + child + infant;
    };

    const fetchQuotations = async () => {
        setLoading(true);
        try {
            const response = await apiFetch.get("/quotation/all-quotations")
            const quotations = response.map((q) => ({
                key: q._id,
                ref: q.reference,
                packageName: q.packageId?.packageName || "Package",
                packageType: q.packageId?.packageType?.toUpperCase() || "N/A",
                customerName: q.userId?.username || "Unknown",
                dateRequested: q.createdAt ? dayjs(q.createdAt).format("MMM DD, YYYY") : "Not Set",
                travelers: sumTravelers(q.quotationDetails?.travelers),
                status: q.status
            }))

            setData(quotations);
        } catch (error) {
            console.error("Error fetching quotations:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotations();
    }, []);

    const fetchArchivedQuotations = async () => {
        setLoading(true);
        try {
            const response = await apiFetch.get("/quotation/archived-quotations")
            const quotations = response.map((q) => ({
                key: q._id,
                ref: q.reference,
                packageName: q.packageId?.packageName || "Package",
                packageType: q.packageId?.packageType?.toUpperCase() || "N/A",
                customerName: q.userId?.username || "Unknown",
                dateRequested: q.createdAt ? dayjs(q.createdAt).format("MMM DD, YYYY") : "Not Set",
                travelers: sumTravelers(q.quotationDetails?.travelers),
                status: q.status
            }))

            setArchivedData(quotations)
        } catch (error) {
            console.error("Error fetching archived quotations:", error)
        } finally {
            setLoading(false)
        }
    }

    const currentData = showArchived ? archivedData : data

    const filteredData = currentData.filter(item => {
        const matchesSearch =
            (item.ref?.toString().toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.customerName?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.packageName?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.status?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.travelers?.toString().toLowerCase() || "").includes(searchText.toLowerCase()) ||
            (item.packageType?.toLowerCase() || "").includes(searchText.toLowerCase()) ||
            dayjs(item.dateRequested).format('MMM DD, YYYY').toLowerCase().includes(searchText.toLowerCase());

        const matchesStatus = statusFilter === "" || item.status === statusFilter;

        const matchesDate = !dateFilter ||
            (item.dateRequested && dayjs(item.dateRequested).isSame(dateFilter, "day"));

        const normalizedFilter = (packageTypeFilter || '').toLowerCase();
        const normalizedType = (item.packageType || '').toLowerCase();
        const matchesPackageType = normalizedFilter === "" || normalizedFilter === "all types" || normalizedType === normalizedFilter;

        return matchesSearch && matchesStatus && matchesDate && matchesPackageType;
    });


    const generatePDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');

        // Headers updated to match your screenshot exactly
        const tableColumn = [
            "Quotation Request No.",
            "Package Name",
            "Date Requested",
            "Customer Name",
            "Travelers",
            "Status"
        ];

        const tableRows = filteredData.map(item => [
            item.ref,
            item.packageName,
            item.dateRequested,
            item.customerName,
            item.travelers,
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
        doc.text("QUOTATION MANAGEMENT REPORT", 14, 48);

        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont("helvetica", "normal");
        doc.text(`Date Generated: ${new Date().toLocaleString()}`, 14, 55);

        let tableStartY = 62;
        if (searchText) {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text(`Search Criteria: "${searchText}"`, 14, 62);
            tableStartY = 68;
        }

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: tableStartY,
            styles: { fontSize: 7.5 },
            headStyles: { fillColor: [48, 87, 151] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            margin: { left: 14, right: 14 }
        });

        doc.save(`Quotation_Report_${new Date().toLocaleDateString()}.pdf`);
        notification.success({ message: "Report exported to PDF successfully.", placement: "topRight" });
    };

    const handleView = (key) => {
        const quotation = data.find((item) => item.key === key);
        if (quotation) {
            navigate(`${basePath}/quotation`, { state: { quotationId: key } });
        }
    }

    const handleArchive = async (key) => {
        if (!key) {
            notification.error({ message: "Quotation not found", placement: "topRight" });
            return
        }
        try {
            await apiFetch.delete(`/quotation/${key}`)
            setIsQuotationDeletedModalOpen(true)
            setData((prev) => prev.filter((item) => item.key !== key))
        } catch (error) {
            console.error("Error archiving quotation:", error)
            notification.error({ message: "Quotation archived unsuccessfully", placement: "topRight" });
        }
    }

    const handleRestore = async (key) => {
        if (!key) {
            notification.error({ message: "Quotation not found", placement: "topRight" });
            return
        }
        try {
            await apiFetch.post(`/quotation/archived-quotations/${key}/restore`)
            setIsQuotationRestoredModalOpen(true)
            setArchivedData((prev) => prev.filter((item) => item.key !== key))
        } catch (error) {
            console.error("Error restoring quotation:", error)
            notification.error({ message: error?.response?.data?.message || "Quotation restore failed", placement: "topRight" });
        }

    }

    const columns = [
        {
            title: "Quotation Request No.",
            dataIndex: "ref",
            key: "ref"
        },
        {
            title: "Travel Package",
            dataIndex: "packageName",
            key: "packageName"
        },
        {
            title: "Package Type",
            dataIndex: "packageType",
            key: "packageType"
        },
        {
            title: "Customer Name",
            dataIndex: "customerName",
            key: "customerName"
        },
        {
            title: "Date Requested",
            dataIndex: "dateRequested",
            key: "dateRequested"
        },
        {
            title: "Travelers",
            dataIndex: "travelers",
            key: "travelers"
        },
        {
            title: "Status",
            dataIndex: "status",
            render: (status) => {
                const color =
                    status === "Booked" ? "green" :
                        status === "Pending" ? "orange" :
                            status === "Under Review" ? "blue" :
                                status === "Revision Requested" ? "purple" :
                                    "red";

                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: "Actions",
            render: (_text, record) => (
                <Space>
                    <Button
                        className="quotation-view"
                        type="primary"
                        icon={<EyeOutlined />}
                        onClick={() => handleView(record.key)}
                    >
                    </Button>
                    {showArchived ? (
                        <Button
                            className="quotation-restore"
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            onClick={() => {
                                setEditingQuotation(record);
                                setIsRestoreModalOpen(true);
                            }}
                        >
                        </Button>
                    ) : (
                        <Button
                            className="quotation-remove"
                            type="primary"
                            icon={<DeleteOutlined />}
                            onClick={() => {
                                setEditingQuotation(record);
                                setIsDeleteModalOpen(true);
                            }}
                        >
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    const archivedColumns = columns

    const totalRequests = filteredData.length;
    const totalUnderReview = filteredData.filter(item => item.status === "Under Review").length;
    const totalAccepted = filteredData.filter(item => item.status === "Accepted").length;
    const totalExpired = filteredData.filter(item => item.status === "Expired").length;

    const EditableCell = ({
        editing,
        dataIndex,
        children,
        ...restProps
    }) => {
        return (
            <td {...restProps}>
                {editing ? (
                    <Form.Item
                        name={dataIndex}
                        style={{ margin: 0 }}
                        rules={[{ required: true, message: `Please enter ${dataIndex}` }]}
                    >
                        <Input />
                    </Form.Item>
                ) : (
                    children
                )}
            </td>
        );
    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div className="quotation-management-container">
                <h1 className="page-header">Quotation Management</h1>

                {!showArchived && (
                    <Row gutter={16} style={{ marginBottom: 20 }}>
                        <Col xs={24} sm={6}>
                            <Card className="quotation-management-card">
                                <Statistic
                                    title="Total Requests"
                                    value={totalRequests}
                                    prefix={<FileTextOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card className="quotation-management-card">
                                <Statistic
                                    title="Under Review"
                                    value={totalUnderReview}
                                    prefix={<FileTextOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card className="quotation-management-card">
                                <Statistic
                                    title="Accepted"
                                    value={totalAccepted}
                                    prefix={<CheckCircleOutlined />}
                                />
                            </Card>
                        </Col>
                        <Col xs={24} sm={6}>
                            <Card className="quotation-management-card">
                                <Statistic
                                    title="Expired"
                                    value={totalExpired}
                                    prefix={<CloseCircleOutlined />}
                                />
                            </Card>
                        </Col>
                    </Row>
                )}

                <Card className="quotation-management-actions">
                    <div className="quotation-management-actions-row">
                        <div className="quotation-management-actions-filters">
                            <div className="quotation-management-actions-field quotation-management-actions-field--search">
                                <label className="quotationmanagement-label">Search</label>
                                <Input
                                    prefix={<SearchOutlined />}
                                    placeholder="Search request, package, customer or status..."
                                    className="quotationmanagement-search-input"
                                    value={searchText}
                                    onChange={(event) => setSearchText(event.target.value)}
                                    allowClear
                                />
                            </div>

                            <div className="quotation-management-actions-field">
                                <label className="quotationmanagement-label">Status</label>
                                <Select
                                    className="quotation-select"
                                    placeholder="Status"
                                    allowClear
                                    value={statusFilter || undefined}
                                    onChange={(value) => setStatusFilter(value || "")}
                                    options={[
                                        { value: "Pending", label: "Pending" },
                                        { value: "Under Review", label: "Under Review" },
                                        { value: "Booked", label: "Booked" },
                                        { value: "Revision Requested", label: "Revision Requested" },
                                        { value: "Expired", label: "Expired" }
                                    ]}
                                />
                            </div>

                            <div className="quotation-management-actions-field">
                                <label className="quotationmanagement-label">Package Type</label>
                                <Select
                                    className="quotation-select"
                                    placeholder="Package Type"
                                    allowClear
                                    value={packageTypeFilter || undefined}
                                    onChange={(value) => setPackageTypeFilter(value || "")}
                                    options={[
                                        { value: "All Types", label: "All Types" },
                                        { value: "Domestic", label: "Domestic" },
                                        { value: "International", label: "International" },
                                    ]}
                                />
                            </div>

                            <div className="quotation-management-actions-field">
                                <label className="quotationmanagement-label">Request Date</label>
                                <DatePicker
                                    className="quotation-date-filter"
                                    placeholder="Request Date"
                                    value={dateFilter}
                                    onChange={(date) => setDateFilter(date)}
                                    allowClear
                                />
                            </div>
                        </div>

                        <div className="quotation-management-actions-buttons">
                            <Button
                                className='quotation-export'
                                type="primary"
                                icon={<FilePdfOutlined />}
                                onClick={generatePDF}
                            >
                                Export to PDF
                            </Button>
                            <Button
                                icon={showArchived ? <FileTextOutlined /> : <InboxOutlined />}
                                className='quotation-archive'
                                type="primary"
                                onClick={() => {
                                    const nextValue = !showArchived
                                    setShowArchived(nextValue)
                                    setSearchText("")
                                    setStatusFilter("")
                                    setDateFilter(null)
                                    setPackageTypeFilter("")
                                    if (nextValue) {
                                        fetchArchivedQuotations()
                                    } else {
                                        fetchQuotations()
                                    }
                                }}
                            >
                                {showArchived ? 'Back' : 'Archives'}
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card className="quotation-management-table-card">
                    <Form form={form} component={false}>
                        <Table
                            components={{
                                body: {
                                    cell: EditableCell
                                }
                            }}
                            columns={showArchived ? archivedColumns : columns}
                            dataSource={filteredData}
                            loading={loading}
                            pagination={{ pageSize: 10, showSizeChanger: false }}
                            rowClassName={"editable-row"}
                        />
                    </Form>
                </Card>
            </div>


            {/* ARCHIVE QUOTATION CONFIRMATION MODAL */}
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
                    <h1 className='modal-heading'>Archive Quotation?</h1>
                    <p className='modal-text'>Are you sure you want to archive this quotation?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleArchive(editingQuotation?.key);
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
                                setEditingQuotation(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>


            {/* RESTORE QUOTATION CONFIRMATION MODAL */}
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
                    <h1 className='modal-heading'>Restore Quotation?</h1>
                    <p className='modal-text'>Are you sure you want to restore this quotation?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleRestore(editingQuotation?.key);
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
                                setEditingQuotation(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>



            {/* QUOTATION HAS BEEN ARCHIVED MODAL */}
            <Modal
                open={isQuotationDeletedModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsQuotationDeletedModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Quotation Archived Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='modal-text'>The quotation has been archived.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsQuotationDeletedModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>

            {/* QUOTATION HAS BEEN RESTORED MODAL */}
            <Modal
                open={isQuotationRestoredModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsQuotationRestoredModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Quotation Restored Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='modal-text'>The quotation has been restored.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsQuotationRestoredModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>

        </ConfigProvider>
    );
}