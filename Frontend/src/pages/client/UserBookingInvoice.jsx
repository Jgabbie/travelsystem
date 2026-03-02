import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Col, ConfigProvider, Divider, Row, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import Invoice from "../../components/Invoice";
import "../../style/client/userbookinginvoice.css";

const { Title, Text } = Typography;

export default function UserBookingInvoice() {
    const location = useLocation();
    const navigate = useNavigate();
    const booking = location.state?.booking || null;
    const bookingDetails = booking?.bookingDetails || {};

    const formatCurrency = useMemo(
        () => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }),
        []
    );

    const totalPrice = Number(
        bookingDetails.totalPrice || bookingDetails.amount || booking?.totalPrice || 0
    );
    const paidAmount = Number(bookingDetails.paidAmount || bookingDetails.amountPaid || 0);
    const remainingBalance = Math.max(totalPrice - paidAmount, 0);
    const travelDateValue = bookingDetails.travelDate || booking?.travelDate;
    const travelDate = travelDateValue
        ? dayjs(travelDateValue).format("MMM D, YYYY")
        : "--";

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div className="user-invoice-page">
                <div className="user-invoice-header">
                    <div>
                        <Title level={2} className="page-header">Booking Invoice</Title>
                        <Text className="user-invoice-subtitle">
                            Review your balance and download the booking invoice.
                        </Text>
                    </div>
                    <Button onClick={() => navigate("/user-bookings")}>
                        Back to bookings
                    </Button>
                </div>

                <Card className="user-invoice-card">
                    <div className="user-invoice-meta">
                        <div>
                            <Text type="secondary">Reference</Text>
                            <div className="user-invoice-value">
                                {booking?.reference || booking?.ref || booking?._id || "--"}
                            </div>
                        </div>
                        <div>
                            <Text type="secondary">Package</Text>
                            <div className="user-invoice-value">
                                {bookingDetails.packageName || booking?.pkg || "Package"}
                            </div>
                        </div>
                        <div>
                            <Text type="secondary">Travel Date</Text>
                            <div className="user-invoice-value">{travelDate}</div>
                        </div>
                    </div>

                    <Divider className="user-invoice-divider" />

                    <Row gutter={[16, 16]} className="user-invoice-summary">
                        <Col xs={24} md={8}>
                            <Card className="user-invoice-stat" bordered={false}>
                                <Text type="secondary">Total Price</Text>
                                <div className="user-invoice-amount">{formatCurrency.format(totalPrice)}</div>
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card className="user-invoice-stat" bordered={false}>
                                <Text type="secondary">Paid Amount</Text>
                                <div className="user-invoice-amount">{formatCurrency.format(paidAmount)}</div>
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card className="user-invoice-stat user-invoice-highlight" bordered={false}>
                                <Space direction="vertical" size={4}>
                                    <Text type="secondary">Remaining Balance</Text>
                                    <div className="user-invoice-amount">{formatCurrency.format(remainingBalance)}</div>
                                    <Tag color={remainingBalance > 0 ? "orange" : "green"}>
                                        {remainingBalance > 0 ? "Balance Due" : "Fully Paid"}
                                    </Tag>
                                </Space>
                            </Card>
                        </Col>
                    </Row>
                </Card>

                <Row gutter={[20, 20]} className="user-invoice-body">
                    <Col xs={24}>
                        <Card className="user-invoice-card" title="Invoice Preview">
                            <div className="user-invoice-preview">
                                <Invoice />
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>
        </ConfigProvider>
    );
}
