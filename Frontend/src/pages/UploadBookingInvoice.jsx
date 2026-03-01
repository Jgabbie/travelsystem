import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Card, Col, ConfigProvider, Divider, Row, Space, Spin, Tag, Typography, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import axiosInstance from "../config/axiosConfig";
import "../style/uploadbookinginvoice.css";

const { Title, Text } = Typography;

export default function UploadBookingInvoice() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [booking, setBooking] = useState(location.state?.booking || null);
    const [loading, setLoading] = useState(false);
    const [invoiceFile, setInvoiceFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        if (!id) return;
        if (booking && booking.bookingDetails) return;

        const fetchBooking = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get("/booking/all-bookings");
                const found = (response.data || []).find((item) => item._id === id);
                setBooking(found || null);
            } catch (error) {
                message.error("Unable to load booking details");
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [booking, id]);

    useEffect(() => {
        if (!invoiceFile) {
            setPreviewUrl("");
            return;
        }

        const url = URL.createObjectURL(invoiceFile);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [invoiceFile]);

    const formatCurrency = useMemo(
        () => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }),
        []
    );

    const bookingDetails = booking?.bookingDetails || {};
    const totalPrice = Number(
        bookingDetails.totalPrice || bookingDetails.amount || booking?.totalPrice || 0
    );
    const paidAmount = Number(bookingDetails.paidAmount || bookingDetails.amountPaid || 0);
    const remainingBalance = Math.max(totalPrice - paidAmount, 0);
    const travelDateValue = bookingDetails.travelDate || booking?.travelDate;
    const travelDate = travelDateValue
        ? dayjs(travelDateValue).format("MMM D, YYYY")
        : "--";

    const uploadProps = {
        accept: "application/pdf",
        maxCount: 1,
        beforeUpload: (file) => {
            if (file.type !== "application/pdf") {
                message.error("Please upload a PDF invoice");
                return Upload.LIST_IGNORE;
            }
            setInvoiceFile(file);
            return false;
        },
        onRemove: () => {
            setInvoiceFile(null);
            setPreviewUrl("");
        }
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div className="upload-invoice-page">
                <div className="upload-invoice-header">
                    <div>
                        <Title level={2} className="page-header">Upload Booking Invoice</Title>
                        <Text className="upload-invoice-subtitle">
                            Review the remaining balance and attach the final invoice for this booking.
                        </Text>
                    </div>
                    <Button onClick={() => navigate("/bookings")}>
                        Back to bookings
                    </Button>
                </div>

                {loading ? (
                    <div className="upload-invoice-loading">
                        <Spin />
                    </div>
                ) : (
                    <>
                        <Card className="upload-invoice-card">
                            <div className="upload-invoice-meta">
                                <div>
                                    <Text type="secondary">Reference</Text>
                                    <div className="upload-invoice-value">
                                        {booking?.reference || booking?.ref || booking?._id || "--"}
                                    </div>
                                </div>
                                <div>
                                    <Text type="secondary">Package</Text>
                                    <div className="upload-invoice-value">
                                        {bookingDetails.packageName || booking?.pkg || "Package"}
                                    </div>
                                </div>
                                <div>
                                    <Text type="secondary">Travel Date</Text>
                                    <div className="upload-invoice-value">{travelDate}</div>
                                </div>
                            </div>

                            <Divider className="upload-invoice-divider" />

                            <Row gutter={[16, 16]} className="upload-invoice-summary">
                                <Col xs={24} md={8}>
                                    <Card className="upload-invoice-stat" bordered={false}>
                                        <Text type="secondary">Total Price</Text>
                                        <div className="upload-invoice-amount">{formatCurrency.format(totalPrice)}</div>
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card className="upload-invoice-stat" bordered={false}>
                                        <Text type="secondary">Paid Amount</Text>
                                        <div className="upload-invoice-amount">{formatCurrency.format(paidAmount)}</div>
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card className="upload-invoice-stat upload-invoice-highlight" bordered={false}>
                                        <Space direction="vertical" size={4}>
                                            <Text type="secondary">Remaining Balance</Text>
                                            <div className="upload-invoice-amount">{formatCurrency.format(remainingBalance)}</div>
                                            <Tag color={remainingBalance > 0 ? "orange" : "green"}>
                                                {remainingBalance > 0 ? "Balance Due" : "Fully Paid"}
                                            </Tag>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>
                        </Card>

                        <Row gutter={[20, 20]} className="upload-invoice-body">
                            <Col xs={24} lg={10}>
                                <Card className="upload-invoice-card" title="Invoice Upload">
                                    <div className="upload-invoice-upload">
                                        <Upload {...uploadProps}>
                                            <Button icon={<UploadOutlined />} type="primary">
                                                Select PDF invoice
                                            </Button>
                                        </Upload>
                                        <Text type="secondary" className="upload-invoice-hint">
                                            Upload the final invoice PDF so the customer can confirm payment.
                                        </Text>
                                    </div>
                                </Card>
                            </Col>
                            <Col xs={24} lg={14}>
                                <Card className="upload-invoice-card" title="Invoice Preview">
                                    {previewUrl ? (
                                        <iframe
                                            className="upload-invoice-preview"
                                            src={previewUrl}
                                            title="Invoice preview"
                                        />
                                    ) : (
                                        <div className="upload-invoice-empty">
                                            <Text type="secondary">Select a PDF invoice to preview it here.</Text>
                                        </div>
                                    )}
                                </Card>
                            </Col>
                        </Row>
                    </>
                )}
            </div>
        </ConfigProvider>
    );
}
