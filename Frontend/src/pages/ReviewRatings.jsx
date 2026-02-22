import React, { useEffect, useMemo, useState } from "react";
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
import axiosInstance from "../config/axiosConfig";
import dayjs from "dayjs";

export default function ReviewRatings() {
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRatings = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get("/rating/all-ratings");
                const mapped = (response.data || []).map((rating) => {
                    const user = rating.userId || {};
                    const pkg = rating.packageId || {};
                    const fullName = [user.firstname, user.lastname].filter(Boolean).join(" ");
                    const name = fullName || user.username || "User";

                    return {
                        id: rating._id,
                        user: name,
                        packageName: pkg.packageName || "Package",
                        rating: rating.rating,
                        comment: rating.review || "",
                        date: rating.createdAt
                            ? dayjs(rating.createdAt).format("MMM D, YYYY")
                            : "—"
                    };
                });
                setRatings(mapped);
            } catch {
                setRatings([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRatings();
    }, []);
    const columns = [
        {
            title: "User",
            dataIndex: "user",
            key: "user",
        },
        {
            title: "Package",
            dataIndex: "packageName",
            key: "packageName",
        },
        {
            title: "Rating",
            dataIndex: "rating",
            key: "rating",
            render: (rating) =>
                rating ? `${rating} Stars` : <Tag color="default">—</Tag>,
        },
        {
            title: "Comment",
            dataIndex: "comment",
            key: "comment",
            ellipsis: true,
        },
        {
            title: "Date",
            dataIndex: "date",
            key: "date",
            render: (date) => (
                <span>{date || "—"}</span>
            )
        },
        {
            title: "Actions",
            key: "actions",
            render: () => (
                <>
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

    const averageRating = useMemo(() => {
        if (!ratings.length) return null;
        const total = ratings.reduce((sum, item) => sum + (item.rating || 0), 0);
        return (total / ratings.length).toFixed(1);
    }, [ratings]);

    const latestReview = useMemo(() => {
        if (!ratings.length) return "—";
        return ratings[0]?.date || "—";
    }, [ratings]);

    return (
        <div >

            <h1 className="page-header">Reviews & Ratings</h1>

            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Average Rating"
                            value={averageRating ?? "—"}
                            prefix={<StarOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Total Reviews"
                            value={ratings.length || "—"}
                            prefix={<MessageOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card>
                        <Statistic
                            title="Latest Review"
                            value={latestReview}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                <Table
                    columns={columns}
                    dataSource={ratings}
                    rowKey="id"
                    loading={loading}
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


