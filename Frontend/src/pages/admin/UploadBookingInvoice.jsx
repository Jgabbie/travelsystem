import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Card, Col, ConfigProvider, Divider, Row, Space, Spin, Tag, Typography, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Document, Image, Page, PDFViewer, StyleSheet, Text, View } from "@react-pdf/renderer";
import dayjs from "dayjs";
import axiosInstance from "../../config/axiosConfig";
import "../../style/admin/uploadbookinginvoice.css";

const { Title, Text: AntText } = Typography;

const getFrequencyWeeks = (value) => {
    if (value === "Every week") return 1;
    if (value === "Every 3 weeks") return 3;
    return 2;
};

const runInstallmentLogic = (invoice, bookingDetails, paidAmount = 0) => {
    const items = invoice?.items || [];
    const subtotal = items.reduce((sum, item) => {
        const qty = Number(item.qty) || 0;
        const rate = Number(item.rate) || 0;
        return sum + (qty * rate);
    }, 0);

    const totalAmount = subtotal;
    const today = dayjs();
    const travelDateValue = bookingDetails?.travelDate?.startDate;
    const travelDateComputation = travelDateValue ? dayjs(travelDateValue) : today;
    const maxAllowedDate = today.add(45, "day");
    const dueCutoffDate = travelDateComputation.isBefore(maxAllowedDate)
        ? travelDateComputation
        : maxAllowedDate;

    const depositAmount = Number(bookingDetails?.paymentDetails?.depositAmount) || 0;
    const remainingAmount = Math.max(totalAmount - depositAmount, 0);

    const frequencyWeeks = getFrequencyWeeks(bookingDetails?.paymentDetails?.frequency);
    const paymentDates = [];
    let nextDate = dayjs(today).add(frequencyWeeks, "week");

    while (nextDate.isBefore(dueCutoffDate) || nextDate.isSame(dueCutoffDate)) {
        paymentDates.push(nextDate);
        nextDate = nextDate.add(frequencyWeeks, "week");
    }

    if (paymentDates.length === 0) {
        paymentDates.push(dueCutoffDate.subtract(1, "day"));
    }

    const installmentCount = paymentDates.length;
    const installmentAmount = installmentCount
        ? remainingAmount / installmentCount
        : 0;

    const paymentSchedule = [
        {
            label: "Deposit",
            amount: depositAmount,
            date: today,
            status: paidAmount >= (depositAmount - 0.01) ? "PAID" : "PENDING"
        },
        ...paymentDates.map((date, index) => {
            const cumulativeTarget = depositAmount + (installmentAmount * (index + 1));
            return {
                label: `Installment ${index + 1}`,
                amount: installmentAmount,
                date: date,
                status: paidAmount >= (cumulativeTarget - 0.01) ? "PAID" : "PENDING"
            };
        })
    ];

    const nextUnpaid = paymentSchedule.find((item) => item.status === "PENDING");
    return { paymentSchedule, totalAmount, subtotal, nextUnpaid };
};

export default function UploadBookingInvoice() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [booking, setBooking] = useState(location.state?.booking || null);
    const [loading, setLoading] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [transactions, setTransactions] = useState([]);
    const reference = booking?.reference || booking?.ref || booking?._id || "--";

    useEffect(() => {
        if (!id) return;
        if (booking && booking.bookingDetails) return;

        const fetchBooking = async () => {
            setLoading(true);
            try {
                const bookingRes = await axiosInstance.get(`/booking/by-reference/${reference}`);
                const fetchedBooking = bookingRes.data?.booking || null;
                const fetchedTransactions = bookingRes.data?.transactions || [];

                setBooking(fetchedBooking);
                setTransactions(fetchedTransactions);

                console.log("Fetched booking for invoice:", fetchedBooking);

                if (fetchedBooking?._id) {
                    try {
                        const allBookingsRes = await axiosInstance.get("/booking/all-bookings");
                        const number = buildInvoiceNumber(allBookingsRes.data || [], fetchedBooking);

                        if (number) {
                            setInvoiceNumber(number);
                        } else {

                            const createdAtValue = fetchedBooking.createdAt || fetchedBooking.bookingDate;
                            const createdAt = createdAtValue ? dayjs(createdAtValue) : null;
                            if (createdAt?.isValid()) {
                                setInvoiceNumber(`${createdAt.format("MM")}01`);
                            }
                        }
                    } catch (err) {
                        console.error("Error fetching invoice number list:", err);

                    }
                }

            } catch (error) {
                message.error("Unable to load booking details");
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [reference]);


    const formatCurrency = useMemo(
        () => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }),
        []
    );

    const bookingDetails = booking?.bookingDetails || {};
    const totalPrice = Number(
        bookingDetails.totalPrice || bookingDetails.amount || booking?.totalPrice || 0
    );
    const paidAmountFromTransactions = Math.round(transactions
        .filter((txn) => txn.status === "Paid" || txn.status === "Successful" || txn.status === "Fully Paid")
        .reduce((sum, txn) => sum + Number(txn.amount || 0), 0) * 100) / 100;
    const paidAmountFallback = Number(bookingDetails.paidAmount || bookingDetails.amountPaid || 0);
    const paidAmount = paidAmountFromTransactions > 0 ? paidAmountFromTransactions : paidAmountFallback;
    const remainingBalance = Math.max(totalPrice - paidAmount, 0);
    const packageName =
        bookingDetails.tourPackageTitle ||
        bookingDetails.packageName ||
        booking?.packageId?.packageName ||
        booking?.pkg ||
        "Package";
    const travelDateValue =
        bookingDetails.travelDate ||
        booking?.travelDate ||
        bookingDetails.packageTravelDate;
    const travelStart = travelDateValue?.startDate
        || (typeof travelDateValue === "string" ? travelDateValue.split(" - ")[0] : null)
        || travelDateValue
        || null;
    const travelEnd = travelDateValue?.endDate || null;
    const travelDate = travelStart && dayjs(travelStart).isValid()
        ? (travelEnd && dayjs(travelEnd).isValid()
            ? `${dayjs(travelStart).format("MMM D, YYYY")} - ${dayjs(travelEnd).format("MMM D, YYYY")}`
            : dayjs(travelStart).format("MMM D, YYYY"))
        : "--";
    const issueDate = booking?.createdAt ? dayjs(booking.createdAt) : dayjs();
    const paymentMode = bookingDetails?.paymentMode
        || (bookingDetails?.paymentDetails?.paymentType === "deposit" ? "Deposit" : "Full Payment");
    const paymentFrequency = bookingDetails?.paymentDetails?.frequency || "Monthly";

    const buildInvoiceNumber = (allBookings, currentBooking) => {
        if (!currentBooking) return "";
        const createdAtValue = currentBooking.createdAt || currentBooking.bookingDate;
        const createdAt = createdAtValue ? dayjs(createdAtValue) : null;
        if (!createdAt || !createdAt.isValid()) return "";

        const monthKey = createdAt.format("MM");
        const monthBookings = (allBookings || [])
            .map((item) => ({
                ...item,
                _createdAt: item.createdAt || item.bookingDate
            }))
            .filter((item) => item._createdAt && dayjs(item._createdAt).isValid())
            .filter((item) => dayjs(item._createdAt).isSame(createdAt, "month"));

        monthBookings.sort((a, b) => new Date(a._createdAt) - new Date(b._createdAt));
        const index = monthBookings.findIndex((item) => String(item._id) === String(currentBooking._id));
        const sequence = index >= 0 ? index + 1 : monthBookings.length + 1;
        return `${monthKey}${String(sequence).padStart(2, "0")}`;
    };

    useEffect(() => {
        if (!booking?._id) return;

        const fetchInvoiceNumber = async () => {
            try {
                const response = await axiosInstance.get("/booking/all-bookings");
                const number = buildInvoiceNumber(response.data || [], booking);
                if (number) {
                    setInvoiceNumber(number);
                    return;
                }
            } catch {
                // Fallback to month + 01 if list cannot be loaded.
            }

            const createdAtValue = booking.createdAt || booking.bookingDate;
            const createdAt = createdAtValue ? dayjs(createdAtValue) : null;
            if (createdAt && createdAt.isValid()) {
                setInvoiceNumber(`${createdAt.format("MM")}01`);
            }
        };

        fetchInvoiceNumber();
    }, [booking]);

    useEffect(() => {
        if (!reference || reference === "--") return;

        const fetchBookingWithTransactions = async () => {
            try {
                const bookingRes = await axiosInstance.get(`/booking/by-reference/${reference}`);
                const fetchedBooking = bookingRes.data?.booking || null;
                const fetchedTransactions = bookingRes.data?.transactions || [];

                if (fetchedBooking?._id) {
                    setBooking(fetchedBooking);
                }
                setTransactions(fetchedTransactions);
            } catch (error) {
                message.error("Failed to load booking transactions.");
            }
        };

        fetchBookingWithTransactions();
    }, [reference]);

    console.log("Booking details for invoice:", booking);

    const invoice = {
        company: {
            name: "M&RC Travel and Tours",
            address: "2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1",
            city: "Parañaque City, Philippines",
            code: "1709 PHL",
            phone: "+63 9690554806",
            email: "info1@mrctravels.com"
        },
        invoice: {
            number: invoiceNumber || "----",
            issueDate: issueDate.format("MMMM D, YYYY"),
            dueDate: null
        },
        customer: {
            name: bookingDetails.leadFullName || booking?.leadFullName || "Customer",
            phone: bookingDetails.leadContact || booking?.leadContact || "--"
        },
        booking: {
            packageName,
            travelDate
        },
        items: [
            {
                date: issueDate.format("MMMM D, YYYY"),
                activity: "Package",
                description: packageName,
                qty: 1,
                rate: totalPrice
            }
        ]
    };

    const calculateTotals = (items) => {
        const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
        const tax = 0;
        const total = subtotal + tax;
        return { subtotal, tax, total };
    };

    const totals = calculateTotals(invoice.items);

    const installmentData = useMemo(() => {
        return runInstallmentLogic(invoice, bookingDetails, paidAmount);
    }, [invoice, bookingDetails, paidAmount]);

    const installmentsOnly = installmentData.paymentSchedule?.filter((item) =>
        item.label.toLowerCase().includes("installment")
    );

    const lastInstallment = installmentsOnly?.length
        ? installmentsOnly[installmentsOnly.length - 1]
        : null;

    const lastInstallmentDate = lastInstallment
        ? dayjs(lastInstallment.date).format("MMMM D, YYYY")
        : null;

    invoice.invoice.dueDate = lastInstallmentDate
        ? dayjs(lastInstallmentDate).format("MMMM D, YYYY")
        : null;

    const styles = StyleSheet.create({
        page: { padding: 40, fontSize: 9, color: "#333", fontFamily: "Helvetica" },
        logo: { width: 85, height: 60 },
        header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 40 },
        headerCompany: { flexDirection: "row", alignItems: "center", gap: 15 },
        brand: { fontSize: 12, fontWeight: "bold" },
        muted: { color: "#555" },
        invoiceTitleContainer: { justifyContent: "center" },
        invoiceTitleText: { fontSize: 16, color: "#333" },
        divider: { height: 3, backgroundColor: "#374151", marginVertical: 5 },
        billRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, alignItems: "flex-start" },
        billToSection: { flex: 1 },
        label: { fontSize: 8, color: "#777", fontWeight: "bold", marginBottom: 4 },
        customerName: { fontSize: 11, fontWeight: "bold", marginBottom: 2 },
        summaryTable: { flexDirection: "row", border: "1pt solid #E5E7EB", flex: 1.5, marginLeft: 20 },
        summaryCol: { flex: 1, padding: 8, alignItems: "center", justifyContent: "center" },
        summaryValue: { fontSize: 10, fontWeight: "bold" },
        darkBg: { backgroundColor: "#374151" },
        paidRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
        table: { marginTop: 10 },
        tableHeader: { flexDirection: "row", borderBottom: "1pt solid #333", paddingBottom: 5, marginBottom: 5 },
        tableRow: { flexDirection: "row", paddingVertical: 8, borderBottom: "0.5pt solid #E5E7EB" },
        cell: { fontSize: 8 },
        footerSection: { marginTop: 30, flexDirection: "row", justifyContent: "space-between" },
        bankInfo: { flex: 2 },
        totalDueContainer: { flex: 1, alignItems: "flex-end" },
        totalDueRow: { flexDirection: "row", borderTop: "1pt solid #333", borderBottom: "1pt solid #333", paddingVertical: 10, width: "100%", justifyContent: "space-between", marginBottom: 10 },
        totalDueLabel: { fontSize: 10, fontWeight: "bold" },
        totalDueValue: { fontSize: 10, fontWeight: "bold" },
        thankYou: { fontSize: 9, fontWeight: "bold", color: "#555" }
    });

    const MyDocument = () => (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.headerCompany}>
                        <Image src={"images/Logo.png"} style={styles.logo} />
                        <View>
                            <Text style={styles.brand}>{invoice.company.name}</Text>
                            <Text style={styles.muted}>{invoice.company.address}</Text>
                            <Text style={styles.muted}>{invoice.company.city}</Text>
                            <Text style={styles.muted}>{invoice.company.code}</Text>
                            <Text style={styles.muted}>{invoice.company.phone}</Text>
                            <Text style={styles.muted}>{invoice.company.email}</Text>
                        </View>
                    </View>
                    <View style={styles.invoiceTitleContainer}>
                        <Text style={styles.invoiceTitleText}>Invoice {invoice.invoice.number}</Text>
                    </View>
                </View>

                <View style={styles.divider}></View>

                <View style={styles.billRow}>
                    <View style={styles.billToSection}>
                        <Text style={styles.label}>BILL TO</Text>
                        <Text style={styles.customerName}>{invoice.customer.name.toUpperCase()}</Text>
                        <Text style={styles.muted}>{invoice.customer.phone}</Text>
                        <Text style={styles.muted}>Reference: {reference}</Text>
                        <Text style={styles.muted}>Travel Date: {invoice.booking.travelDate}</Text>
                    </View>

                    <View style={styles.summaryTable}>
                        <View style={styles.summaryCol}>
                            <Text style={styles.label}>DATE</Text>
                            <Text style={styles.summaryValue}>{dayjs(invoice.invoice.issueDate).format("MM/DD/YYYY")}</Text>
                        </View>
                        <View style={[styles.summaryCol, styles.darkBg]}>
                            <Text style={[styles.label, { color: "#FFF" }]}>TOTAL PRICE</Text>
                            <Text style={[styles.summaryValue, { color: "#FFF" }]}>{formatCurrency.format(totals.subtotal)}</Text>
                        </View>
                        <View style={styles.summaryCol}>
                            <Text style={styles.label}>DUE DATE</Text>
                            <Text style={styles.summaryValue}>{dayjs(invoice.invoice.dueDate).format("MM/DD/YYYY")}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.paidRow}>
                    <Text style={styles.label}>PAID AMOUNT</Text>
                    <Text style={styles.summaryValue}>{formatCurrency.format(paidAmount)}</Text>
                </View>

                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.cell, { flex: 1.5 }]}>DATE</Text>
                        <Text style={[styles.cell, { flex: 2 }]}>ACTIVITY</Text>
                        <Text style={[styles.cell, { flex: 4 }]}>DESCRIPTION</Text>
                        <Text style={[styles.cell, { flex: 1, textAlign: "center" }]}>QTY</Text>
                        <Text style={[styles.cell, { flex: 1.5, textAlign: "right" }]}>RATE</Text>
                        <Text style={[styles.cell, { flex: 1.5, textAlign: "right" }]}>AMOUNT</Text>
                    </View>

                    {invoice.items.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.cell, { flex: 1.5 }]}>{dayjs(item.date).format("MM/DD/YYYY")}</Text>
                            <Text style={[styles.cell, { flex: 2 }]}>{item.activity}</Text>
                            <Text style={[styles.cell, { flex: 4 }]}>{item.description}</Text>
                            <Text style={[styles.cell, { flex: 1, textAlign: "center" }]}>{item.qty}</Text>
                            <Text style={[styles.cell, { flex: 1.5, textAlign: "right" }]}>{formatCurrency.format(item.rate)}</Text>
                            <Text style={[styles.cell, { flex: 1.5, textAlign: "right" }]}>{formatCurrency.format(item.qty * item.rate)}</Text>
                        </View>
                    ))}
                </View>

                {paymentMode === "Deposit" && (
                    <View style={{ marginTop: 20 }}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>
                            PAYMENT SCHEDULE ({paymentFrequency.toUpperCase()})
                        </Text>

                        <View style={[styles.tableHeader, { backgroundColor: "#F3F4F6" }]}
                        >
                            <Text style={[styles.cell, { flex: 2 }]}>DESCRIPTION</Text>
                            <Text style={[styles.cell, { flex: 2 }]}>DUE DATE</Text>
                            <Text style={[styles.cell, { flex: 2, textAlign: "right" }]}>AMOUNT</Text>
                            <Text style={[styles.cell, { flex: 1.5, textAlign: "right" }]}>STATUS</Text>
                        </View>

                        {installmentData.paymentSchedule.map((item, index) => (
                            <View key={index} style={styles.tableRow}>
                                <Text style={[styles.cell, { flex: 2 }]}>{item.label}</Text>
                                <Text style={[styles.cell, { flex: 2 }]}>
                                    {item.date.format("MMM D, YYYY")}
                                </Text>
                                <Text style={[styles.cell, { flex: 2, textAlign: "right" }]}
                                >
                                    {formatCurrency.format(item.amount)}
                                </Text>
                                <Text style={[
                                    styles.cell,
                                    {
                                        flex: 1.5,
                                        textAlign: "right",
                                        color: item.status === "PAID" ? "#059669" : "#D97706",
                                        fontFamily: "Helvetica-Bold"
                                    }
                                ]}>
                                    {item.status}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.footerSection}>
                    <View style={styles.bankInfo}>
                        <Text style={styles.muted}>Payment to be deposited in below bank details:</Text>
                        <Text style={[styles.label, { marginTop: 10 }]}>PESO ACCOUNT:</Text>
                        <Text style={styles.muted}>BANK: BDO UNIBANK - TRIDENT TOWER BRANCH</Text>
                        <Text style={styles.muted}>ACCOUNT NAME: {invoice.company.name.toUpperCase()}</Text>
                        <Text style={styles.muted}>ACCOUNT NUMBER: 006830132692</Text>
                    </View>
                    <View style={styles.totalDueContainer}>
                        <View style={styles.totalDueRow}>
                            <Text style={styles.totalDueLabel}>TOTAL DUE</Text>
                            <Text style={styles.totalDueValue}>{formatCurrency.format(totals.subtotal)}</Text>
                        </View>
                        <Text style={styles.thankYou}>THANK YOU.</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );

    const passportFiles = booking?.passportFiles || [];
    const photoFiles = booking?.photoFiles || [];

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div className="upload-invoice-page">
                <Button className="upload-invoice-back-button" onClick={() => navigate("/bookings")}>
                    <ArrowLeftOutlined />
                    Back
                </Button>
                <div className="upload-invoice-header">
                    <div>
                        <Title level={2} className="page-header">Upload Booking Invoice</Title>
                        <AntText className="upload-invoice-subtitle">
                            Review the remaining balance and attach the final invoice for this booking.
                        </AntText>
                    </div>
                </div>

                {loading ? (
                    <div className="upload-invoice-loading">
                        <Spin />
                    </div>
                ) : (
                    <>
                        <Card className="upload-invoice-card" style={{ marginBottom: 40 }}>
                            <div className="upload-invoice-meta">
                                <div>
                                    <AntText type="secondary">Reference</AntText>
                                    <div className="upload-invoice-value">
                                        {booking?.reference || booking?.ref || booking?._id || "--"}
                                    </div>
                                </div>
                                <div>
                                    <AntText type="secondary">Package</AntText>
                                    <div className="upload-invoice-value">
                                        {packageName || "Package"}
                                    </div>
                                </div>
                                <div>
                                    <AntText type="secondary">Travel Date</AntText>
                                    <div className="upload-invoice-value">{travelDate}</div>
                                </div>
                            </div>

                            <Divider className="upload-invoice-divider" />

                            <Row gutter={[16, 16]} className="upload-invoice-summary">
                                <Col xs={24} md={8}>
                                    <Card className="upload-invoice-stat" bordered={false}>
                                        <AntText type="secondary">Total Price</AntText>
                                        <div className="upload-invoice-amount">{formatCurrency.format(totalPrice)}</div>
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card className="upload-invoice-stat" bordered={false}>
                                        <AntText type="secondary">Paid Amount</AntText>
                                        <div className="upload-invoice-amount">{formatCurrency.format(paidAmount)}</div>
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card className="upload-invoice-stat upload-invoice-highlight" bordered={false}>
                                        <Space direction="vertical" size={4}>
                                            <AntText type="secondary">Remaining Balance</AntText>
                                            <div className="upload-invoice-amount">{formatCurrency.format(remainingBalance)}</div>
                                            <Tag color={remainingBalance > 0 ? "orange" : "green"}>
                                                {remainingBalance > 0 ? "Balance Due" : "Fully Paid"}
                                            </Tag>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>
                        </Card>

                        <div className="display-invoice-wrapper">
                            <div className="display-invoice-card">
                                <div className="pdf-viewer-wrapper">
                                    <div className="pdf-toolbar-mask"></div>
                                    <PDFViewer style={{ width: "100%", height: 727 }}>
                                        <MyDocument />
                                    </PDFViewer>
                                </div>
                            </div>
                        </div>

                        <Card title="Transaction History" style={{ marginBottom: 24, marginTop: 24 }}>
                            <div style={{
                                backgroundColor: "#f0f5ff",
                                border: "1px solid #adc6ff",
                                padding: "8px 12px",
                                borderRadius: "6px",
                                marginBottom: "16px",
                                fontSize: "13px",
                                color: "#2f54eb"
                            }}>
                                <AntText>
                                    <strong>Note:</strong> Using a Paymongo gateway has a convenience fee of 3.5% and ₱15.
                                </AntText>
                            </div>

                            {transactions.length === 0 ? (
                                <AntText type="secondary">No transactions yet.</AntText>
                            ) : (
                                <Space direction="vertical" style={{ width: "100%" }}>
                                    {transactions.map((txn, index) => (
                                        <Card key={index} size="small">
                                            <Row justify="space-between">
                                                <Col>
                                                    <div><strong>Date:</strong> {dayjs(txn.createdAt).format("MMM D, YYYY")}</div>
                                                    <div><strong>Method:</strong> {txn.method || "N/A"}</div>
                                                </Col>
                                                <Col style={{ textAlign: "right" }}>
                                                    <div><strong>₱{txn.amount}</strong></div>
                                                    <Tag color={txn.status === "Successful" || txn.status === "Fully Paid" ? "green" : "orange"}>
                                                        {txn.status}
                                                    </Tag>
                                                </Col>
                                            </Row>
                                        </Card>
                                    ))}
                                </Space>
                            )}
                        </Card>

                        <Card title="Documents" style={{ marginTop: 24 }}>
                            {passportFiles.length === 0 && photoFiles.length === 0 ? (
                                <AntText type="secondary">No documents uploaded yet.</AntText>
                            ) : (
                                <div>
                                    <h4>Traveler 1</h4>

                                    <div style={{ display: "flex", flexDirection: "row", gap: 40, flexWrap: "wrap" }}>
                                        {passportFiles.length > 0 && (
                                            <div style={{ marginBottom: 16 }}>
                                                <AntText strong>Passport Files:</AntText>
                                                <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                                                    {passportFiles.map((url, index) => (
                                                        <img
                                                            key={index}
                                                            src={url}
                                                            alt={`Traveler 1 Passport ${index + 1}`}
                                                            style={{
                                                                width: 350,
                                                                height: 340,
                                                                objectFit: "cover",
                                                                borderRadius: 8,
                                                                border: "1px solid #ccc"
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {photoFiles.length > 0 && (
                                            <div style={{ marginBottom: 16 }}>
                                                <AntText strong>Photo Files:</AntText>
                                                <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                                                    {photoFiles.map((url, index) => (
                                                        <img
                                                            key={index}
                                                            src={url}
                                                            alt={`Traveler 1 Photo ${index + 1}`}
                                                            style={{
                                                                width: 200,
                                                                height: 200,
                                                                objectFit: "cover",
                                                                borderRadius: 8,
                                                                border: "1px solid #ccc"
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </Card>
                    </>
                )}
            </div>
        </ConfigProvider>
    );
}
