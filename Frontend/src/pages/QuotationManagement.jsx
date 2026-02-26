import React, { useEffect, useMemo, useState } from "react";
import {
    Input,
    Select,
    Button,
    Table,
    Tag,
    Space,
    Row,
    Col,
    Card,
    Statistic,
    Form,
    message,
    Modal
} from "antd";
import {
    SearchOutlined,
    EyeOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    FileTextOutlined
} from "@ant-design/icons";
import "../style/quotationmanagement.css";
import axiosInstance from "../config/axiosConfig";
import { useNavigate } from 'react-router-dom'


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
                    Confirm Delete
                </div>
            ),
            content: (
                <div className="logout-confirm-content" style={{ textAlign: "center" }}>
                    <p className="logout-confirm-text">Are you sure you want to delete this booking?</p>
                </div>
            ),
            okText: "Delete",
            cancelText: "Cancel",
            okButtonProps: { className: "logout-confirm-btn" },
            cancelButtonProps: { className: "logout-cancel-btn" },
            onOk: async () => {
                try {
                    await axiosInstance.delete(`/quotations/${key}`);
                    setData((prev) => prev.filter((item) => item.key !== key));
                    message.success("Quotation deleted successfully");
                } catch (error) {
                    console.error("Error deleting quotation:", error);
                    message.error("Failed to delete quotation");
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



    //         ref: "QR-10021",
    //         packageName: "Boracay 4D3N Getaway",
    //         customerName: "Liam Santos",
    //         travelers: 3,
    //         status: "Pending"
    //     },
    //     {
    //         key: 2,
    //         ref: "QR-10022",
    //         packageName: "Seoul City Explorer",
    //         customerName: "Amara Cruz",
    //         travelers: 2,
    //         status: "Approved"
    //     },
    //     {
    //         key: 3,
    //         ref: "QR-10023",
    //         packageName: "Baguio Highlands Tour",
    //         customerName: "Noah Lim",
    //         travelers: 4,
    //         status: "Pending"
    //     },
    //     {
    //         key: 4,
    //         ref: "QR-10024",
    //         packageName: "Kyoto Cultural Getaway",
    //         customerName: "Mia Reyes",
    //         travelers: 1,
    //         status: "Rejected"
    //     }
    // ]);

    const save = async (key) => {
        try {
            const row = await form.validateFields();
            const newData = [...data];
            const index = newData.findIndex((item) => key === item.key);
            if (index > -1) {
                Modal.confirm({
                    className: "quotation-confirm-modal",
                    icon: null,
                    title:
                        (<div className="confirmation-title">
                            <h3>Confirm Update</h3>
                        </div>)
                    ,
                    content: (
                        <div className="confirmation-actions">
                            <p>Are you sure you want to update the status of this quotation request?</p>
                        </div>
                    ),
                    okText: "Save",
                    cancelText: "Cancel",
                    okButtonProsps: { className: "confirm-button" },
                    cancelButtonProps: { className: "cancel-button" },
                    onOk: async () => {
                        const updatedRow = { ...newData[index], ...row };

                        try {
                            const statusValue = updatedRow.status //make status lowercase
                                ? updatedRow.status.toLowerCase()
                                : undefined;

                            const payload = {
                                status: statusValue,
                                packageName: updatedRow.packageName,
                                customerName: updatedRow.customerName,
                                travelDetails: {
                                    travelers: updatedRow.travelers,
                                },
                            }

                            const response = await axiosInstance.put(`/quotations/${key}`, payload);
                            const saved = response.data
                            const statusRaw = saved.status || updatedRow.status || "pending";
                            const statusFormatted =
                                statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);

                            newData.splice(index, 1, {
                                ...updatedRow,
                                packageName: saved.packageName || updatedRow.packageName,
                                customerName: saved.customerName || updatedRow.customerName,
                                status: statusFormatted,
                                travelers: saved.travelDetails?.travelers || updatedRow.travelers,
                            });
                            setData(newData);
                            setEditingKey("");
                            message.success("Quotation updated successfully");
                        } catch (error) {
                            message.error("Error updating quotation:", error);
                        }
                    }
                });
            }
        } catch (error) {
            console.log("Validate Failed:", error);
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
    const totalApproved = filteredData.filter((item) => item.status === "Approved").length;
    const totalRejected = filteredData.filter((item) => item.status === "Rejected").length;

    const columns = [
        { title: "Quotation Request No.", dataIndex: "ref" },
        { title: "Package Name", dataIndex: "packageName" },
        { title: "Customer Name", dataIndex: "customerName" },
        { title: "Travelers", dataIndex: "travelers" },
        {
            title: "Status",
            dataIndex: "status",
            render: (status) => (
                <Tag
                    color={
                        status === "Approved" ? "green" :
                            status === "Pending" ? "orange" :
                                "red"
                    }
                >
                    {status}
                </Tag>
            )
        },
        {
            title: "Actions",
            render: (text, record) => (
                <Space>
                    {isEditing(record) ? (
                        <>
                            <Button
                                className="quotation-save"
                                type="primary"
                                onClick={() => save(record.key)}
                            >
                                Save
                            </Button>
                            <Button
                                className="quotation-cancel"
                                onClick={cancel}
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                className="quotation-view"
                                type="primary"
                                icon={<EyeOutlined />}
                                onClick={() => handleView(record.key)}
                                disabled={editingKey !== ""}
                            />
                            <Button
                                className="quotation-approve"
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={() => edit(record)}
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
                    )}

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
                        { value: "Approved", label: "Approved" },
                        { value: "Rejected", label: "Rejected" }
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
                            title="Pending"
                            value={totalPending}
                            prefix={<CloseCircleOutlined />}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Approved"
                            value={totalApproved}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={6}>
                    <Card>
                        <Statistic
                            title="Rejected"
                            value={totalRejected}
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
                        { value: "Approved", label: "Approved" },
                        { value: "Rejected", label: "Rejected" }
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
    );
}
