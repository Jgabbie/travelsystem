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
    Input,
    Select,
    DatePicker,
    message,
    Modal,
} from "antd";
import {
    StarOutlined,
    MessageOutlined,
    ClockCircleOutlined,
    DeleteOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import axiosInstance from "../config/axiosConfig";
import dayjs from "dayjs";
import { ConfigProvider } from "antd";
import "../style/reviewratings.css";

const { RangePicker } = DatePicker;

export default function ReviewRatings() {
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [ratingFilter, setRatingFilter] = useState(null);
    const [dateRange, setDateRange] = useState([null, null]);

    // Fetch ratings
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
                        date: rating.createdAt ? dayjs(rating.createdAt) : null, // store as dayjs object
                    };
                });
                setRatings(mapped);
            } catch (error) {
                setRatings([]);
                message.error("Failed to fetch reviews");
            } finally {
                setLoading(false);
            }
        };

        fetchRatings();
    }, []);

    // Delete review
    const handleDelete = (id) => {
        Modal.confirm({
            title: "Confirm Delete",
            content: "Are you sure you want to delete this review?",
            okText: "Delete",
            okType: "danger",
            cancelText: "Cancel",
            onOk: async () => {
                try {
                    await axiosInstance.delete(`/rating/delete/${id}`);
                    message.success("Review deleted successfully");
                    setRatings((prev) => prev.filter((r) => r.id !== id));
                } catch {
                    message.error("Failed to delete review");
                }
            },
        });
    };

    // Filtered ratings
    const filteredRatings = ratings.filter((r) => {
        const matchesSearch =
            r.user.toLowerCase().includes(searchText.toLowerCase()) ||
            r.packageName.toLowerCase().includes(searchText.toLowerCase());

        const matchesRating = ratingFilter ? r.rating === ratingFilter : true;

        const matchesDate =
            dateRange[0] && dateRange[1]
                ? r.date && r.date.isBetween(dateRange[0], dateRange[1], null, "[]")
                : true;

        return matchesSearch && matchesRating && matchesDate;
    });

    // Table columns
    const columns = [
        { title: "User", dataIndex: "user", key: "user" },
        { title: "Package", dataIndex: "packageName", key: "packageName" },
        {
            title: "Rating",
            dataIndex: "rating",
            key: "rating",
            render: (rating) =>
                rating ? `${rating} Stars` : <Tag color="default">—</Tag>,
        },
        { title: "Comment", dataIndex: "comment", key: "comment", ellipsis: true },
        {
            title: "Date",
            dataIndex: "date",
            key: "date",
            render: (date) =>
                date ? (dayjs.isDayjs(date) ? date.format("MMM D, YYYY") : dayjs(date).format("MMM D, YYYY")) : "—"
        },
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(record.id)}
                >
                    Delete
                </Button>
            ),
        },
    ];

    const averageRating = useMemo(() => {
        if (!ratings.length) return null;
        const total = ratings.reduce((sum, r) => sum + (r.rating || 0), 0);
        return (total / ratings.length).toFixed(1);
    }, [ratings]);

    const latestReview = useMemo(() => {
        if (!ratings.length) return "—";

        // Find the most recent date
        const sortedByDate = ratings
            .filter(r => r.date) // only keep valid dates
            .sort((a, b) => b.date.valueOf() - a.date.valueOf()); // newest first

        const latest = sortedByDate[0]?.date;
        return latest ? dayjs(latest).format("MMM D, YYYY") : "—";
    }, [ratings]);

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div>
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

                <div className="reviewratings-actions">
                    <Input
                        className="search-input"
                        placeholder="Search by user or package"
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        allowClear
                    />

                    <Select
                        className="reviewratings-select"
                        placeholder="Filter by Rating"
                        style={{ width: 300 }}
                        allowClear
                        value={ratingFilter}
                        onChange={(value) => setRatingFilter(value)}
                        options={[1, 2, 3, 4, 5].map((r) => ({ label: `${r} Stars`, value: r }))}
                    />

                    <RangePicker
                        className="reviewratings-date-filter"
                        style={{ width: 300 }}
                        allowClear
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates || [null, null])}
                    />
                </div>

                <Card>
                    <Table
                        columns={columns}
                        dataSource={filteredRatings}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                        locale={{
                            emptyText: <Empty description="No reviews available yet" />,
                        }}
                    />
                </Card>
            </div>
        </ConfigProvider>
    );
}