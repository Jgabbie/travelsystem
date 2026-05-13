import React, { useEffect, useMemo, useState } from "react";
import { Card, Table, Button, Row, Col, Statistic, Tag, Empty, Input, Select, DatePicker, Modal, ConfigProvider, Space, notification } from "antd";
import { StarOutlined, MessageOutlined, FundOutlined, ClockCircleOutlined, CheckCircleOutlined, DeleteOutlined, SearchOutlined, FilePdfOutlined, CheckCircleFilled, InboxOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/reviewratings.css";
import "../../style/components/modals/modaldesign.css";

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
    const [archivedRatings, setArchivedRatings] = useState([]);
    const [showArchived, setShowArchived] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [ratingFilter, setRatingFilter] = useState(null);
    const [dateFilter, setDateFilter] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isRatingDeletedModalOpen, setIsRatingDeletedModalOpen] = useState(false);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [isRatingRestoredModalOpen, setIsRatingRestoredModalOpen] = useState(false);
    const [deletingRating, setDeletingRating] = useState(null);

    // GET ALL RATINGS FOR ADMIN ----------------------------------------------------------------------------
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
            notification.error({ message: "Failed to fetch reviews", placement: "topRight" });
        } finally {
            setLoading(false);
        }
    };

    const fetchArchivedRatings = async () => {
        setLoading(true);
        try {
            const response = await apiFetch.get("/rating/archived-ratings");
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
            setArchivedRatings(mapped);
        } catch (error) {
            setArchivedRatings([]);
            notification.error({ message: "Failed to fetch archived reviews", placement: "topRight" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRatings();
    }, []);

    // FILTERING RATINGS ----------------------------------------------------------------------------
    const currentRatings = showArchived ? archivedRatings : ratings;

    const filteredRatings = currentRatings.filter((item) => {
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
        notification.success({ message: "Report exported to PDF successfully.", placement: "topRight" });
    };


    // DELETE RATING ----------------------------------------------------------------------------
    const handleArchive = async (key) => {
        if (!key) {
            notification.error({ message: "Rating not found", placement: "topRight" });
            return
        }
        try {
            await apiFetch.delete(`/rating/delete/${key}`);
            setRatings((prev) => prev.filter((r) => r.id !== key));
            setIsRatingDeletedModalOpen(true);
        } catch {
            notification.error({ message: "Failed to archive review", placement: "topRight" });
        }

    };

    const handleRestore = async (key) => {
        if (!key) {
            notification.error({ message: "Rating not found", placement: "topRight" });
            return
        }
        try {
            await apiFetch.post(`/rating/archived-ratings/${key}/restore`)
            setIsRatingRestoredModalOpen(true);
            setArchivedRatings((prev) => prev.filter((item) => item.id !== key))
        } catch (error) {
            console.error("Error restoring rating:", error)
            notification.error({ message: "Rating restore unsuccessfully", placement: "topRight" });
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
                !showArchived && (
                    <Button
                        className='reviewratings-remove-button'
                        type='primary'
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            setDeletingRating(record);
                            setIsDeleteModalOpen(true);
                        }}
                    >
                    </Button>
                )
            ),
        },
    ];

    const archivedColumns = [
        ...columns.filter((col) => col.title !== "Actions"),
        {
            title: "Actions",
            key: "actions",
            render: (_, record) => (
                <Button
                    className='reviewratings-restore-button'
                    type='primary'
                    icon={<CheckCircleOutlined />}
                    onClick={() => {
                        setDeletingRating(record);
                        setIsRestoreModalOpen(true);
                    }}
                >
                    Restore
                </Button>
            )
        }
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

                {!showArchived && (
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
                )}

                <Card className="reviewratings-actions">
                    <div className="reviewratings-actions-row">
                        <div className="reviewratings-actions-filters">
                            <div className="reviewratings-actions-field reviewratings-actions-field--search">
                                <label className="reviewratings-label">Search</label>
                                <Input
                                    className="reviewratings-search-input"
                                    placeholder="Search by user or package"
                                    prefix={<SearchOutlined />}
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    allowClear
                                />
                            </div>

                            <div className="reviewratings-actions-field">
                                <label className="reviewratings-label">Rating</label>
                                <Select
                                    className="reviewratings-select"
                                    placeholder="Rating"
                                    allowClear
                                    value={ratingFilter}
                                    onChange={(value) => setRatingFilter(value)}
                                    options={[1, 2, 3, 4, 5].map((r) => ({ label: `${r} Stars`, value: r }))}
                                />
                            </div>

                            <div className="reviewratings-actions-field">
                                <label className="reviewratings-label">Review Date</label>
                                <DatePicker
                                    className="reviewratings-date-filter"
                                    placeholder="Review Date"
                                    value={dateFilter}
                                    onChange={(date) => setDateFilter(date)}
                                    allowClear
                                />
                            </div>
                        </div>

                        <div className="reviewratings-actions-buttons">
                            <Button
                                className='reviewratings-export-button'
                                type="primary"
                                icon={<FilePdfOutlined />}
                                onClick={generatePDF}
                            >
                                Export to PDF
                            </Button>
                            <Button
                                icon={showArchived ? <FundOutlined /> : <InboxOutlined />}
                                className='reviewratings-archive-button'
                                type="primary"
                                onClick={() => {
                                    const nextValue = !showArchived;
                                    setShowArchived(nextValue);
                                    setSearchText("");
                                    setRatingFilter(null);
                                    setDateFilter(null);
                                    if (nextValue) {
                                        fetchArchivedRatings();
                                    } else {
                                        fetchRatings();
                                    }
                                }}
                            >
                                {showArchived ? 'Back' : 'Archives'}
                            </Button>
                        </div>
                    </div>
                </Card>

                <Card className="reviewratings-table-card">
                    <Table
                        columns={showArchived ? archivedColumns : columns}
                        dataSource={filteredRatings}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 10, showSizeChanger: false }}
                        locale={{
                            emptyText: <Empty description="No reviews available yet" />,
                        }}
                    />
                </Card>
            </div>

            {/* DELETE RATING CONFIRMATION MODAL */}
            <Modal
                open={isDeleteModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsDeleteModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Archive Rating?</h1>
                    <p className='modal-text'>Are you sure you want to archive this rating?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleArchive(deletingRating?.id);
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
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsRatingDeletedModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Rating Archived Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='modal-text'>The rating has been archived.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsRatingDeletedModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>

            {/* RESTORE RATING CONFIRMATION MODAL */}
            <Modal
                open={isRestoreModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsRestoreModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Restore Rating?</h1>
                    <p className='modal-text'>Are you sure you want to restore this rating?</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                handleRestore(deletingRating?.id);
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
                                setDeletingRating(null);
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* RATING HAS BEEN RESTORED MODAL */}
            <Modal
                open={isRatingRestoredModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                centered={true}
                onCancel={() => {
                    setIsRatingRestoredModalOpen(false);
                }}
            >
                <div className='modal-container'>
                    <h1 className='modal-heading'>Rating Restored Successfully!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='modal-text'>The rating has been restored.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='modal-button'
                            onClick={() => {
                                setIsRatingRestoredModalOpen(false);
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