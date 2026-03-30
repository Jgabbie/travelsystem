import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Col, ConfigProvider, Radio, Row, Space, Tag, Typography, message, Steps, Form, Upload } from "antd";
import { Page, Text, View, Document, StyleSheet, PDFViewer, Image } from "@react-pdf/renderer";
import dayjs from "dayjs";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "../../style/client/userbookinginvoice.css";
import "../../style/client/paymentprocees.css";
import "../../style/components/modals/displayinvoicemodal.css";
import axiosInstance from "../../config/axiosConfig";
import BookingRegistrationTravelers from "../../components/form/BookingRegistrationTravelers";
import BookingRegistrationDiet from "../../components/form/BookingRegistrationDiet";
import BookingRegistrationTermsPart1 from "../../components/form/BookingRegistrationTermsPart1";
import BookingRegistrationTermsPart2 from "../../components/form/BookingRegistrationTermsPart2";

const { Title, Text: AntText } = Typography;

export default function UserBookingInvoice() {
    const location = useLocation();
    const navigate = useNavigate();
    const initialBooking = location.state?.booking || null;
    const [booking, setBooking] = useState(initialBooking);
    const [transactions, setTransactions] = useState([]);
    const bookingDetails = booking?.bookingDetails || {};
    const [method, setMethod] = useState(null);
    const [invoiceNumber, setInvoiceNumber] = useState("");


    const formatCurrency = useMemo(
        () => new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }),
        []
    );

    const totalPrice = Number(bookingDetails.totalPrice || 0);
    const paidAmount = transactions
        .filter(txn => txn.status === "paid" || txn.status === "successful")
        .reduce((sum, txn) => sum + Number(txn.amount || 0), 0);

    const transactionStatus = transactions.length === 0
        ? "pending"
        : paidAmount >= totalPrice
            ? "successful"
            : "partial";

    const getPaymentStatus = () => {
        if (transactionStatus === "successful" || transactionStatus === "paid") {
            return { label: "Fully Paid", color: "green" };
        }
        if (transactionStatus === "pending") {
            return { label: "Not Paid", color: "red" };
        }
        return { label: "Balance Due", color: "orange" };
    };

    const paymentStatus = getPaymentStatus();

    const reference = booking?.reference || booking?.ref || booking?._id || "--";
    const packageName =
        bookingDetails.tourPackageTitle ||
        bookingDetails.packageName ||
        booking?.pkg ||
        "Package";
    const travelDateValue =
        bookingDetails.packageTravelDate ||
        bookingDetails.travelDate ||
        booking?.travelDate;
    const travelDate = travelDateValue ? dayjs(travelDateValue).format("MMM D, YYYY") : "--";

    const issueDate = booking?.createdAt ? dayjs(booking.createdAt) : dayjs();
    const dueDate = issueDate.add(45, "day");
    const customerName = bookingDetails.leadFullName || booking?.leadFullName || "Customer";
    const customerPhone = bookingDetails.leadContact || booking?.leadContact || "--";
    const remainingBalance = Math.max(totalPrice - paidAmount, 0);
    const handleSelectPaymentMethod = (selectedMethod) => {
        setMethod(selectedMethod);
    };

    const summary = bookingDetails

    console.log("Booking details used for invoice:", summary);

    //pdf registration section
    const [form] = Form.useForm();
    const pdfStepRef = useRef(null);

    const [fileLists, setFileLists] = useState([]);
    const [photoFileLists, setPhotoFileLists] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);



    const next = async () => {
        try {
            await form.validateFields();

            setCurrentStep(prev => prev + 1);
        } catch (error) {
            message.error("Please complete required fields.");
        }
    };

    //go to previous step
    const prev = () => setCurrentStep(currentStep - 1);


    const validateFile = (file) => {
        const isValidType =
            file.type === 'image/jpeg' ||
            file.type === 'image/png'

        if (!isValidType) {
            message.error('Only JPG or PNG');
            return Upload.LIST_IGNORE;
        }

        const isValidSize = file.size / 1024 / 1024 < 5;
        if (!isValidSize) {
            message.error('File must be smaller than 5MB');
            return Upload.LIST_IGNORE;
        }

        return false;
    };

    const handleValuesChange = (changedValues, allValues) => {
        console.log("Form updated:", allValues);
    };

    const handleFinalSubmit = async () => {
        try {
            const values = await form.validateFields();

            await axiosInstance.put(`/booking/${booking._id}`, {
                ...values,
                status: "pending_payment"
            });

            message.success("Booking updated. Proceed to payment.");
            navigate("/booking-payment");

        } catch (err) {
            message.error("Submission failed.");
        }
    };











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
        if (!reference || reference === "--") return;

        const fetchInvoiceData = async () => {
            try {
                const response = await axiosInstance.get(`/booking/by-reference/${reference}`)
                const fetchedBooking = response.data?.booking || null
                const fetchedTransactions = response.data?.transactions || [];

                console.log("Fetched transactions data:", fetchedTransactions);

                setBooking(fetchedBooking || booking)
                setTransactions(fetchedTransactions || []);
            } catch {
                // Keep fallback data from navigation state if fetch fails.
            }
        }

        fetchInvoiceData()
    }, [reference])

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
            dueDate: dueDate.format("MMMM D, YYYY")
        },
        customer: {
            name: customerName,
            phone: customerPhone
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
                            <Text style={[styles.summaryValue, { color: "#FFF" }]}> {formatCurrency.format(totals.subtotal)}</Text>
                        </View>
                        <View style={styles.summaryCol}>
                            <Text style={styles.label}>DUE DATE</Text>
                            <Text style={styles.summaryValue}>{dayjs(invoice.invoice.dueDate).format("MM/DD/YYYY")}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.paidRow}>
                    <Text style={styles.label}>PAID AMOUNT</Text>


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
                            <Text style={[styles.cell, { flex: 1.5, textAlign: "right" }]}> {formatCurrency.format(item.rate)}</Text>
                            <Text style={[styles.cell, { flex: 1.5, textAlign: "right" }]}> {formatCurrency.format(item.qty * item.rate)}</Text>
                        </View>
                    ))}
                </View>

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
                            <Text style={styles.totalDueValue}> {formatCurrency.format(totals.subtotal)}</Text>
                        </View>
                        <Text style={styles.thankYou}>THANK YOU.</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );

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
                        <AntText className="user-invoice-subtitle">
                            Review your balance and download the booking invoice.
                        </AntText>
                    </div>
                    <Button onClick={() => navigate("/user-bookings")}>Back to bookings</Button>
                </div>

                <Card className="user-invoice-card" style={{ marginBottom: 40 }}>
                    <div className="user-invoice-meta">
                        <div>
                            <AntText type="secondary">Reference</AntText>
                            <div className="user-invoice-value">{reference}</div>
                        </div>
                        <div>
                            <AntText type="secondary">Package</AntText>
                            <div className="user-invoice-value">{packageName}</div>
                        </div>
                        <div>
                            <AntText type="secondary">Travel Date</AntText>
                            <div className="user-invoice-value">{travelDate}</div>
                        </div>
                    </div>

                    <Row gutter={[16, 16]} className="user-invoice-summary">
                        <Col xs={24} md={8}>
                            <Card className="user-invoice-stat" bordered={false}>
                                <AntText type="secondary">Total Price</AntText>
                                <div className="user-invoice-amount"> ₱{totalPrice}</div>
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card className="user-invoice-stat" bordered={false}>
                                <AntText type="secondary">Paid Amount</AntText>
                                <div className="user-invoice-amount"> ₱{paidAmount}</div>
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card className="user-invoice-stat user-invoice-highlight" bordered={false}>
                                <Space direction="vertical" size={4}>
                                    <AntText type="secondary">Remaining Balance</AntText>
                                    <div className="user-invoice-amount"> ₱{remainingBalance}</div>
                                    <Tag color={paymentStatus.color}>
                                        {paymentStatus.label}
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
                                            <Tag color={txn.status === "paid" ? "green" : "orange"}>
                                                {txn.status}
                                            </Tag>
                                        </Col>
                                    </Row>
                                </Card>
                            ))}
                        </Space>
                    )}
                </Card>

                <div className='payment-methods-container payment-section' style={{ marginTop: 24 }}>
                    <div className="payment-methods-wrapper">
                        <div className="payment-section-header">
                            <div>
                                <h2 className="payment-methods-title payment-section-title">Payment Methods</h2>
                                <p className="payment-methods-subtitle payment-section-subtitle">
                                    Select a payment method to complete your booking.
                                </p>
                            </div>
                        </div>

                        <Radio.Group
                            onChange={(e) => handleSelectPaymentMethod(e.target.value)}
                            value={method}
                            className="payment-methods-cards"
                            style={{ width: '100%', display: 'flex', gap: '16px' }}
                        >
                            <Radio
                                value="paymongo"
                                className={`payment-card ${method === "paymongo" ? "selected" : ""}`}
                                style={{ flex: 1, height: 'auto', padding: '20px' }}
                            >
                                <div className="card-content">
                                    <h3>Paymongo</h3>
                                    <p>Pay securely via Credit Card, GCash, or Maya. Rates depend on the transaction method.</p>
                                </div>
                            </Radio>

                            <Radio
                                value="manual"
                                className={`payment-card ${method === "manual" ? "selected" : ""}`}
                                style={{ flex: 1, height: 'auto', padding: '20px' }}
                            >
                                <div className="card-content">
                                    <h3>Manual Payment</h3>
                                    <p>Direct deposit. You will need to upload proof of payment for manual verification by our team.</p>
                                </div>
                            </Radio>
                        </Radio.Group>
                    </div>
                </div>


                {/* booking registration section */}
                <div className="booking-form-stepper-container">
                    <h2 className="booking-form-stepper-title" style={{ textAlign: "left" }}>Booking Registration</h2>
                    <p className="booking-form-stepper-text" style={{ textAlign: "left" }}>
                        Please upload a clear image of your passport bio page for each traveler.
                    </p>
                    <Steps
                        current={currentStep}
                        items={[
                            { title: 'Traveler Info' },
                            { title: 'Dietary & Insurance' },
                            { title: 'General Package Disclaimer' },
                            { title: 'Terms & Conditions' }
                        ]}
                        style={{ marginBottom: '30px' }}
                    />

                    <div className="form-content-wrapper pdf-capture" ref={pdfStepRef}>
                        {currentStep === 0 && (
                            <BookingRegistrationTravelers
                                form={form}
                                summary={summary}
                                totalCount={bookingDetails?.travelerCounts?.total || 1}
                            />
                        )}

                        {currentStep === 1 && (
                            <BookingRegistrationDiet
                                form={form}
                                summary={summary}
                            />
                        )}

                        {currentStep === 2 && (
                            <BookingRegistrationTermsPart1
                                form={form}
                                summary={summary}
                            />
                        )}

                        {currentStep === 3 && (
                            <BookingRegistrationTermsPart2
                                form={form}
                                summary={summary}
                            />
                        )}
                    </div>

                    <div className="form-navigation-buttons" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                        {currentStep > 0 && (
                            <Button onClick={prev}>
                                Back
                            </Button>
                        )}

                        {currentStep < 3 ? (
                            <Button type="primary" onClick={next}>
                                Next Step
                            </Button>
                        ) : (
                            <Button type="primary" onClick={handleFinalSubmit} loading={isGeneratingPdf} disabled={isGeneratingPdf}>
                                Submit Final Booking
                            </Button>
                        )}
                    </div>
                </div>


            </div>
        </ConfigProvider>
    );
}
