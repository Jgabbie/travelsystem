import React, { useMemo, useState } from "react";
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
    Statistic
} from "antd";
import {
    SearchOutlined,
    EyeOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    FileTextOutlined
} from "@ant-design/icons";
import "../style/quotationmanagement.css";

export default function QuotationManagement() {
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [data] = useState([
        {
            key: 1,
            ref: "QR-10021",
            packageName: "Boracay 4D3N Getaway",
            customerName: "Liam Santos",
            travelers: 3,
            status: "Pending"
        },
        {
            key: 2,
            ref: "QR-10022",
            packageName: "Seoul City Explorer",
            customerName: "Amara Cruz",
            travelers: 2,
            status: "Approved"
        },
        {
            key: 3,
            ref: "QR-10023",
            packageName: "Baguio Highlands Tour",
            customerName: "Noah Lim",
            travelers: 4,
            status: "Pending"
        },
        {
            key: 4,
            ref: "QR-10024",
            packageName: "Kyoto Cultural Getaway",
            customerName: "Mia Reyes",
            travelers: 1,
            status: "Rejected"
        }
    ]);

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
            render: () => (
                <Space>
                    <Button
                        className="quotation-view"
                        type="primary"
                        icon={<EyeOutlined />}
                    />
                    <Button
                        className="quotation-approve"
                        type="primary"
                        icon={<CheckCircleOutlined />}
                    />
                    <Button
                        className="quotation-reject"
                        danger
                        icon={<CloseCircleOutlined />}
                    />
                </Space>
            )
        }
    ];

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
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    pagination={{ pageSize: 6 }}
                    scroll={{ x: "max-content" }}
                />
            </Card>
        </div>
    );
}
