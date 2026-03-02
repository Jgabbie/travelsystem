import React, { useEffect, useMemo, useState } from "react";
import { Input, Select, Button, Table, Tag, Space, Row, Col, Card, Statistic, Form, message, Modal, ConfigProvider } from "antd";
import { SearchOutlined, EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from "@ant-design/icons";
import { useNavigate } from 'react-router-dom'
import axiosInstance from "../../config/axiosConfig";
import "../../style/admin/quotationmanagement.css";



export default function QuotationManagement() {
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [editingKey, setEditingKey] = useState("");
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);

    const navigate = useNavigate()

    useEffect(() => {
        const fetchQuotations = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get("/quotation/all-quotations")
                const rows = (response.data || []).map((quote) => {
                    const details = quote.travelDetails || {};
                    const travelers = details.travelers || 0;
                    const preferredAirlines = details.preferredAirlines || "N/A";
                    const preferredHotels = details.preferredHotels || "N/A";
                    const budgetRange = details.budgetRange || "N/A";
                    const itineraryNotes = details.itineraryNotes || "N/A";
                    const additionalComments = details.additionalComments || "N/A";
                    const quoteStatus = quote.status || "Pending";
                    const quoteRef = quote.reference || "N/A";
                    const quotePackageName = quote.packageName || "N/A";
                    const quoteCustomerName = quote.userName || "N/A";

                    return {
                        key: quote._id,
                        ref: quoteRef,
                        travelers: travelers,
                        preferredAirlines: preferredAirlines,
                        preferredHotels: preferredHotels,
                        budgetRange: budgetRange,
                        itineraryNotes: itineraryNotes,
                        additionalComments: additionalComments,
                        status: quoteStatus,
                        customerName: quoteCustomerName,
                        packageName: quotePackageName,
                    };
                });
                setData(rows);
            } catch (error) {
                console.error("Error fetching quotations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuotations();
    }, []);

    const isEditing = (record) => record.key === editingKey;

    const edit = (record) => {
        form.setFieldsValue({
            pkgName: record.packageName,
            custName: record.customerName,
            travelers: record.travelers,
            status: record.status,
        })
    }

    const cancel = () => {
        setEditingKey("");
    }

    const handleDeleted = (key) => {
        Modal.confirm({
            className: "logout-confirm-modal",
            icon: null,
            title: (
                <div className="logout-confirm-title" style={{ textAlign: "center" }}>
                    Deny Quotation Request
                </div>
            ),
            content: (
                <div className="logout-confirm-content" style={{ textAlign: "center" }}>
                    <p className="logout-confirm-text">Are you sure you want to deny this quotation request?</p>
                </div>
            ),
            okText: "Deny",
            cancelText: "Cancel",
            okButtonProps: { className: "logout-confirm-btn" },
            cancelButtonProps: { className: "logout-cancel-btn" },
            onOk: async () => {
                try {
                    await axiosInstance.delete(`/quotations/${key}`);
                    setData((prev) => prev.filter((item) => item.key !== key));
                    message.success("Quotation denied successfully");
                } catch (error) {
                    console.error("Error denying quotation:", error);
                    message.error("Failed to deny quotation");
                }
            }
        });
    }

    const handleView = (key) => {
        const quotation = data.find((item) => item.key === key);
        if (quotation) {
            console.log("Viewing quotation:", quotation);
            console.log(key)
            navigate(`/quotation/${key}`);
        }
    }

    const filteredData = useMemo(() => (
        data.filter((item) => {
            const matchesSearch =
                item.ref.toLowerCase().includes(searchText.toLowerCase()) ||
                item.packageName.toLowerCase().includes(searchText.toLowerCase()) ||
                item.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
                item.status.toLowerCase().includes(searchText.toLowerCase());

            const matchesStatus =
                statusFilter === "" || item.status === statusFilter;

            return matchesSearch && matchesStatus;
        })
    ), [data, searchText, statusFilter]);

    const totalRequests = filteredData.length;
    const totalPending = filteredData.filter((item) => item.status === "Pending").length;
    const totalUnderReview = filteredData.filter(item => item.status === "Under Review").length;
    const totalAccepted = filteredData.filter(item => item.status === "Accepted").length;
    const totalExpired = filteredData.filter(item => item.status === "Expired").length;
    const totalRevisionRequested = filteredData.filter(item => item.status === "Revision Requested").length;


    const columns = [
        { title: "Quotation Request No.", dataIndex: "ref" },
        { title: "Package Name", dataIndex: "packageName" },
        { title: "Customer Name", dataIndex: "customerName" },
        { title: "Travelers", dataIndex: "travelers" },
        {
            title: "Status",
            dataIndex: "status",
            render: (status) => {
                const color =
                    status === "Accepted" ? "green" :
                        status === "Pending" ? "orange" :
                            status === "Under Review" ? "blue" :
                                status === "Revision Requested" ? "purple" :
                                    "red";

                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: "Actions",
            render: (text, record) => (
                <Space>
                    <>
                        <Button
                            className="quotation-view"
                            type="primary"
                            icon={<EyeOutlined />}
                            onClick={() => handleView(record.key)}
                            disabled={editingKey !== ""}
                        />
                        <Button
                            className="quotation-reject"
                            danger
                            icon={<CloseCircleOutlined />}
                            onClick={() => edit(record)}
                            disabled={editingKey !== ""}
                        />
                    </>
                </Space>
            )
        }
    ];

    const mergedColumns = columns.map((col) => {
        if (!col.editable) {
            return col;
        }

        let inputType = "text";
        if (col.dataIndex === "status") {
            inputType = "select";
        }
        if (col.dataIndex === "travelers") {
            inputType = "number";
        }

        return {
            ...col,
            onCell: (record) => ({
                record,
                inputType,
                dataIndex: col.dataIndex,
                title: col.title,
            })
        }
    });

    const EditableCell = ({
        editing,
        dataIndex,
        inputType,
        children,
        ...restProps
    }) => {
        let inputNode = <Input />;

        if (inputType === "select") {
            inputNode = (
                <Select
                    options={[
                        { value: "Pending", label: "Pending" },
                        { value: "Under Review", label: "Under Review" },
                        { value: "Accepted", label: "Accepted" },
                        { value: "Revision Requested", label: "Revision Requested" },
                        { value: "Expired", label: "Expired" }
                    ]}
                />
            );
        }

        if (inputType === "number") {
            inputNode = <Input type="number" />;
        }

        return (
            <td {...restProps}>
                {editing ? (
                    <Form.Item
                        name={dataIndex}
                        style={{ margin: 0 }}
                        rules={[{ required: true, message: `Please enter ${dataIndex}` }]}
                    >
                        {inputNode}
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
            <div>
                <h1 className="page-header">Quotation Management</h1>

                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={6}>
                        <Card>
                            <Statistic
                                title="Total Requests"
                                value={totalRequests}
                                prefix={<FileTextOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={6}>
                        <Card>
                            <Statistic
                                title="Under Review"
                                value={totalUnderReview}
                                prefix={<FileTextOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={6}>
                        <Card>
                            <Statistic
                                title="Accepted"
                                value={totalAccepted}
                                prefix={<CheckCircleOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={6}>
                        <Card>
                            <Statistic
                                title="Expired"
                                value={totalExpired}
                                prefix={<CloseCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                <div className="quotation-management-actions">
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Search request, package, customer or status..."
                        className="search-input"
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        allowClear
                    />

                    <Select
                        className="quotation-select"
                        placeholder="Status"
                        style={{ width: 160 }}
                        allowClear
                        value={statusFilter || undefined}
                        onChange={(value) => setStatusFilter(value || "")}
                        options={[
                            { value: "Pending", label: "Pending" },
                            { value: "Under Review", label: "Under Review" },
                            { value: "Accepted", label: "Accepted" },
                            { value: "Revision Requested", label: "Revision Requested" },
                            { value: "Expired", label: "Expired" }
                        ]}
                    />
                </div>

                <Card>
                    <Form form={form} component={false}>
                        <Table
                            components={{
                                body: {
                                    cell: EditableCell
                                }
                            }}
                            columns={mergedColumns}
                            dataSource={filteredData}
                            loading={loading}
                            pagination={{ pageSize: 6 }}
                            rowClassName={"editable-row"}
                            scroll={{ x: "max-content" }}
                        />
                    </Form>
                </Card>
            </div >
        </ConfigProvider>
    );
}
