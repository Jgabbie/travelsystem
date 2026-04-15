import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Button, Row, Col, Statistic, Tag, Empty, Input, Select, DatePicker, message, Modal, ConfigProvider, Space } from "antd";
import { StarOutlined, MessageOutlined, ClockCircleOutlined, DeleteOutlined, SearchOutlined, FilePdfOutlined, CheckCircleFilled } from "@ant-design/icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/reviewratings.css";

dayjs.extend(isBetween);

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

export default function ReviewRatings() {
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [ratingFilter, setRatingFilter] = useState(null);
    const [dateFilter, setDateFilter] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRatingDeletedModalOpen, setIsRatingDeletedModalOpen] = useState(false);
    const [deletingRating, setDeletingRating] = useState(null);

    // GET ALL RATINGS FOR ADMIN ----------------------------------------------------------------------------
    useEffect(() => {
        const fetchRatings = async () => {
            setLoading(true);
            try {
                const response = await apiFetch.get("/rating/all-ratings");
                const mapped = (response || []).map((rating) => {
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
                        date: rating.createdAt ? dayjs(rating.createdAt) : null,
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

    // FILTERING RATINGS ----------------------------------------------------------------------------
    const filteredRatings = ratings.filter((item) => {
        const matchesSearch =
            (item.user.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.packageName.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.comment.toLowerCase().includes(searchText.toLowerCase())) ||
            (dayjs(item.date).format('MMM DD, YYYY').toLowerCase().includes(searchText.toLowerCase())) ||
            (item.rating.toString().toLowerCase().includes(searchText.toLowerCase()));

        const matchesRating = ratingFilter ? item.rating === ratingFilter : true;

        const matchesDate = !dateFilter ||
            (item.date && dayjs(item.date).isSame(dateFilter, "day"));

        return matchesSearch && matchesRating && matchesDate;
    });


    // CALCULATE AVERAGE RATING AND LATEST REVIEW DATE ----------------------------------------------------------------------------
    const averageRating = useMemo(() => {
        if (!ratings.length) return null;
        const total = ratings.reduce((sum, item) => sum + (item.rating || 0), 0);
        return (total / ratings.length).toFixed(1);
    }, [ratings]);

    const latestReview = useMemo(() => {
        if (!ratings.length) return "—";
        const sortedByDate = ratings
            .filter(item => item.date)
            .sort((a, b) => b.date.valueOf() - a.date.valueOf());
        const latest = sortedByDate[0]?.date;
        return latest ? dayjs(latest).format("MMM D, YYYY") : "—";
    }, [ratings]);


    // GENERATE RATING REPORT PDF ----------------------------------------------------------------------------
    const generatePDF = async () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const tableColumn = ["User", "Package", "Rating", "Comment", "Date"];
        const tableRows = filteredRatings.map(item => [
            item.user,
            item.packageName,
            item.rating ? `${item.rating} Stars` : "--",
            item.comment,
            item.date ? item.date.format("MMM D, YYYY") : "--"
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
        doc.text("REVIEWS & RATINGS REPORT", 14, 48);

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

        doc.save(`Reviews_Report_${new Date().toLocaleDateString()}.pdf`);
        message.success("Report exported to PDF successfully.");
    };


    // DELETE RATING ----------------------------------------------------------------------------
    const handleDelete = async (id) => {

        try {
            await apiFetch.delete(`/rating/delete/${id}`);
            message.success("Review deleted successfully");
            setRatings((prev) => prev.filter((r) => r.id !== id));
            setIsRatingDeletedModalOpen(true);
        } catch {
            message.error("Failed to delete review");
        }

    };


    // TABLE COLUMNS ----------------------------------------------------------------------------
    const columns = [
        {
            title: "Customer Name",
            dataIndex: "user",
            key: "user"
        },
        {
            title: "Travel Package",
            dataIndex: "packageName",
            key: "packageName"
        },
        {
            title: "Customer Ratings",
            dataIndex: "rating",
            key: "rating",
            render: (rating) =>
                rating ? `${rating} Stars` : <Tag color="default">—</Tag>,
        },
        {
            title: "Customer Comments",
            dataIndex: "comment",
            key: "comment",
            ellipsis: true
        },
        {
            title: "Review Date",
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
                    className='reviewratings-remove-button'
                    type='primary'
                    icon={<DeleteOutlined />}
                    onClick={() => {
                        setDeletingRating(record);
                        setIsDeleteModalOpen(true);
                    }}
                >
                    Delete
                </Button>
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
            <div className="reviewratings-container">
                <h1 className="page-header">Reviews & Ratings</h1>

                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={8}>
                        <Card className="rating-management-card">
                            <Statistic
                                title="Average Rating"
                                value={averageRating ?? "—"}
                                prefix={<StarOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card className="rating-management-card">
                            <Statistic
                                title="Total Reviews"
                                value={ratings.length || "—"}
                                prefix={<MessageOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card className="rating-management-card">
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
                        placeholder="Rating"
                        style={{ width: 160 }}
                        allowClear
                        value={ratingFilter}
                        onChange={(value) => setRatingFilter(value)}
                        options={[1, 2, 3, 4, 5].map((r) => ({ label: `${r} Stars`, value: r }))}
                    />

                    <DatePicker
                        placeholder="Review Date"
                        value={dateFilter}
                        onChange={(date) => setDateFilter(date)}
                        allowClear
                    />

                    <Space style={{ marginLeft: 'auto' }}>
                        <Button
                            className='reviewratings-export-button'
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

            {/* DELETE RATING CONFIRMATION MODAL */}
            <Modal
                open={isDeleteModalOpen}
                className='signup-success-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                }}
            >
                <div className='signup-success-container'>
                    <h1 className='signup-success-heading'>Delete Rating?</h1>
                    <p className='signup-success-text'>Are you sure you want to delete this rating?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='logout-confirm-btn'
                            onClick={() => {
                                handleDelete(deletingRating.id);
                                setIsDeleteModalOpen(false);
                            }}
                        >
                            Delete
                        </Button>
                        <Button
                            type='primary'
                            className='logout-cancel-btn'
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setDeletingRating(null);
                            }}
                        >
                            Cancel
                        </Button>

                    </div>

                </div>
            </Modal>

            {/* RATING DELETED SUCCESSFULLY MODAL */}
            <Modal
                open={isRatingDeletedModalOpen}
                className='signup-success-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsRatingDeletedModalOpen(false);
                }}
            >
                <div className='signup-success-container'>
                    <h1 className='signup-success-heading'>Rating Deleted Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='signup-success-text'>The rating has been deleted.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='logout-confirm-btn'
                            onClick={() => {
                                setIsRatingDeletedModalOpen(false);
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