import React from "react";
import {
    Card,
    Table,
    Button,
    Row,
    Col,
    Statistic,
    Tag,
    Empty,
} from "antd";
import {
    StarOutlined,
    MessageOutlined,
    ClockCircleOutlined,
} from "@ant-design/icons";

export default function ReviewRatings() {
    const columns = [
        {
            title: "User",
            dataIndex: "user",
            key: "user",
        },
        {
            title: "Rating",
            dataIndex: "rating",
            key: "rating",
            render: (rating) =>
                rating ? `${rating} ⭐` : <Tag color="default">—</Tag>,
        },
        {
            title: "Comment",
            dataIndex: "comment",
            key: "comment",
            ellipsis: true,
        },
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status) => (
                <Tag color="blue">{status || "N/A"}</Tag>
            ),
        },
        {
            title: "Actions",
            key: "actions",
            render: () => (
                <>
                    <Button size="small" disabled>
                        Approve
                    </Button>
                    <Button
                        size="small"
                        danger
                        disabled
                        style={{ marginLeft: 8 }}
                    >
                        Delete
                    </Button>
                </>
            ),
        },
    ];

    return (
        <div >

            <h1 className="page-header">Reviews & Ratings</h1>

            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Average Rating"
                            value="—"
                            prefix={<StarOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Total Reviews"
                            value="—"
                            prefix={<MessageOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Pending Approval"
                            value="—"
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Table
                    columns={columns}
                    dataSource={[]}
                    rowKey="id"
                    pagination={false}
                    locale={{
                        emptyText: (
                            <Empty
                                description="No reviews available yet"
                            />
                        ),
                    }}
                />
            </Card>
        </div>
    );
};


