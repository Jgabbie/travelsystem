import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Col, ConfigProvider, Divider, Row, Space, Spin, Form, Tag, Typography, message, Steps } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { Document, Image, Page, PDFViewer, StyleSheet, Text, View } from "@react-pdf/renderer";
import dayjs from "dayjs";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "../../style/admin/uploadbookinginvoice.css";
import apiFetch from "../../config/fetchConfig";
import BookingRegistrationTravelersInvoice from "../../components/form_bookinginvoice/BookingRegistrationTravelersInvoice";
import BookingRegistrationDietInvoice from "../../components/form_bookinginvoice/BookingRegistrationDietInvoice";
import BookingRegistrationTermsInvoicePart1 from "../../components/form_bookinginvoice/BookingRegistrationTermsInvoicePart1";
import BookingRegistrationTermsInvoicePart2 from "../../components/form_bookinginvoice/BookingRegistrationTermsInvoicePart2";

const { Title, Text: AntText } = Typography;

//INSTALLMENT AND PAYMENT COMPUTATION LOGIC
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
    const location = useLocation();
    const navigate = useNavigate();

    const [booking, setBooking] = useState(location.state?.booking || null);
    const [loading, setLoading] = useState(false);
    const bookingDetails = booking?.bookingDetails || {};
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [transactions, setTransactions] = useState([]);
    const [isRequestingResubmission, setIsRequestingResubmission] = useState(false);
    const reference = booking?.reference || booking?.ref || booking?._id;
    const handleBackNavigation = () => {
        const fromState = location.state?.from;
        if (typeof fromState === "string" && fromState.trim()) {
            navigate(fromState);
            return;
        }

        const isEmployeeRoute = location.pathname.startsWith("/employee");
        navigate(isEmployeeRoute ? "/employee/bookings" : "/bookings");
    };

    const logoUrl = typeof window !== "undefined"
        ? `${window.location.origin}/images/Logo.png`
        : "/images/Logo.png";

    const stepsToCapture = [0, 1, 2, 3];
    const documentsResubmissionRequired = Boolean(booking?.documentsResubmissionRequired);

    //FETCH BOOKING DETAILS
    useEffect(() => {
        if (!reference) return;
        setLoading(true);
        const fetchBooking = async () => {
            try {
                const bookingRes = await apiFetch.get(`/booking/by-reference/${reference}`);
                const fetchedBooking = bookingRes?.booking || null;
                const fetchedTransactions = bookingRes?.transactions || [];

                if (fetchedBooking) {
                    setBooking(fetchedBooking);
                }
                setTransactions(fetchedTransactions);
            } catch (error) {
                message.error("Unable to load booking details");
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [reference]);


    //DOCUMENTS
    const summaryInvoice = bookingDetails

    const [form] = Form.useForm();
    const pdfStepRef = useRef(null);
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

    const handleFinalSubmit = async () => {
        try {

            setIsGeneratingPdf(true);

            const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

            const waitForRender = (ms = 450) => new Promise((resolve) => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, ms);
                });
            });

            for (let i = 0; i < stepsToCapture.length; i += 1) {
                const step = stepsToCapture[i];
                setCurrentStep(step);
                await waitForRender();

                if (!pdfStepRef.current) {
                    continue;
                }

                const canvas = await html2canvas(pdfStepRef.current, {
                    scale: 1.5,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;
                const renderHeight = Math.min(imgHeight, pdfHeight);


                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, renderHeight);

                if (i < stepsToCapture.length - 1) {
                    pdf.addPage();
                }
            }

            pdf.save(`Booking_${reference}.pdf`);
            message.success("Booking Registration PDF downloaded successfully.");

            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (err) {
            message.error("Submission failed.");
            console.error("Error during PDF generation:", err);
        }
    };

    const handleRequestDocumentsResubmission = async (travelerIndex = null) => {
        if (!booking?._id) {
            message.error("Booking ID not found.");
            return;
        }

        setIsRequestingResubmission(true);
        try {
            const response = await apiFetch.post(`/booking/${booking._id}/request-document-resubmission`,
                Number.isInteger(travelerIndex) ? { travelerIndex } : {}
            );
            const updatedBooking = response?.booking || booking;
            setBooking(updatedBooking);
            message.success("Document resubmission request sent to customer.");
        } catch (error) {
            message.error(error?.data?.message || "Unable to request resubmission.");
        } finally {
            setIsRequestingResubmission(false);
        }
    };


    const formatCurrency = useMemo(
        () => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }),
        []
    );


    const totalPrice = Number(
        bookingDetails.totalPrice || bookingDetails.amount || booking?.totalPrice || 0
    );
    const paidAmountFromTransactions = Math.round(transactions
        .filter((txn) => {
            const status = String(txn.status || "").toLowerCase();
            return status === "paid" || status === "successful" || status === "fully paid" || status === "fully_paid";
        })
        .reduce((sum, txn) => {
            const rawAmount = txn.amount ?? txn.totalAmount ?? txn.paidAmount ?? 0;
            const parsedAmount = Number(String(rawAmount).replace(/[^0-9.-]/g, ""));
            return sum + (Number.isFinite(parsedAmount) ? parsedAmount : 0);
        }, 0) * 100) / 100;
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
        if (!reference) return;
        const fetchInvoiceNumber = async () => {

            try {
                const response = await apiFetch.get("/booking/all-bookings");
                const allBookings = response?.bookings || response || [];

                const number = buildInvoiceNumber(allBookings, booking);

                if (number) {
                    setInvoiceNumber(number);
                    return;
                }
            } catch (err) {
                console.error(err);
            }

            // fallback
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
                        <Image src={logoUrl} style={styles.logo} />
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
                            <Text style={[styles.summaryValue, { color: "#FFF" }]}>
                                PHP {Number(totals.subtotal).toLocaleString('en-PH', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </Text>
                        </View>
                        <View style={styles.summaryCol}>
                            <Text style={styles.label}>DUE DATE</Text>
                            <Text style={styles.summaryValue}>{dayjs(invoice.invoice.dueDate).format("MM/DD/YYYY")}</Text>
                        </View>
                    </View>
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
                            <Text style={[styles.cell, { flex: 1.5, textAlign: "right" }]}>
                                PHP {Number(item.rate).toLocaleString('en-PH', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </Text>
                            <Text style={[styles.cell, { flex: 1.5, textAlign: "right" }]}>
                                PHP {Number(item.qty * item.rate).toLocaleString('en-PH', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </Text>
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
                                    PHP {Number(item.amount).toLocaleString('en-PH', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    })}
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
                            <Text style={styles.totalDueValue}>
                                PHP {Number(totals.subtotal).toLocaleString('en-PH', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </Text>
                        </View>
                        <Text style={styles.thankYou}>THANK YOU.</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );

    const travelersWithDocs = bookingDetails?.travelers?.length
        ? bookingDetails.travelers
        : booking?.travelers || []
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
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '75vh' }}>
                    <Spin description="Loading booking details..." size="large" />
                </div>
            ) : (
                <div className="user-invoice-container">
                    <div className="upload-invoice-page">
                        <Button type="primary" className="upload-invoice-back-button" onClick={handleBackNavigation}>
                            <ArrowLeftOutlined />
                            Back
                        </Button>

                        <div className="upload-invoice-header">
                            <div>
                                <Title level={2} className="page-header">Booking Invoice</Title>
                                <AntText className="upload-invoice-subtitle">
                                    Review the remaining balance and attach the final invoice for this booking.
                                </AntText>
                            </div>
                        </div>

                        <Card className="upload-invoice-card" style={{ marginBottom: 40 }}>
                            <div className="upload-invoice-meta">
                                <div className="user-invoice-meta-item">
                                    <AntText type="secondary">Reference</AntText>
                                    <div className="upload-invoice-value">{booking?.reference || booking?.ref || booking?._id || "--"}</div>
                                </div>
                                <div className="user-invoice-meta-item">
                                    <AntText type="secondary">Package</AntText>
                                    <div className="upload-invoice-value">{packageName}</div>
                                </div>
                                <div className="user-invoice-meta-item">
                                    <AntText type="secondary">Travel Date</AntText>
                                    <div className="upload-invoice-value">{travelDate}</div>
                                </div>
                            </div>

                            <Row gutter={[16, 16]} className="upload-invoice-summary">
                                <Col xs={24} md={8}>
                                    <Card className="upload-invoice-stat" variant={false} style={{ paddingBottom: 30 }}>
                                        <AntText type="secondary">Total Price</AntText>
                                        <div className="upload-invoice-amount">
                                            {Number(totalPrice).toLocaleString('en-PH', {
                                                style: 'currency',
                                                currency: 'PHP',
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </div>
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card className="upload-invoice-stat" variant={false} style={{ paddingBottom: 30 }}>
                                        <AntText type="secondary">Paid Amount</AntText>
                                        <div className="upload-invoice-amount">
                                            {Number(paidAmount).toLocaleString('en-PH', {
                                                style: 'currency',
                                                currency: 'PHP',
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </div>
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card className="upload-invoice-stat upload-invoice-highlight" variant={false}>
                                        <Space orientation="vertical" size={4}>
                                            <AntText type="secondary">Remaining Bal.</AntText>
                                            <div className="upload-invoice-amount">
                                                {Number(remainingBalance).toLocaleString('en-PH', {
                                                    style: 'currency',
                                                    currency: 'PHP',
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </div>
                                            <Tag color={remainingBalance > 0 ? "orange" : "green"}>
                                                {remainingBalance > 0 ? "Balance Due" : "Fully Paid"}
                                            </Tag>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>


                            <Row gutter={[24, 24]} style={{ marginTop: 24, marginBottom: 24 }}>
                                <Col xs={24} lg={16}>
                                    <div className="display-invoice-wrapper" style={{ marginBottom: 0 }}>

                                        <div className="pdf-viewer-wrapper">
                                            <PDFViewer style={{ width: "100%", height: 727 }}>
                                                <MyDocument />
                                            </PDFViewer>
                                        </div>

                                    </div>
                                </Col>

                                <Col style={{ marginTop: 10 }} xs={24} lg={8}>
                                    <h2>Transaction History</h2>
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
                                        <Space orientation="vertical" style={{ width: "100%" }}>
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

                                </Col>
                            </Row>

                            {/* DOCUMENTS SECTION */}
                            <div>
                                <div style={{ marginBottom: 30 }}>
                                    <h2 className="booking-form-stepper-title" style={{ textAlign: "left" }}>Travelers Information</h2>
                                    <p className="booking-form-stepper-text" style={{ textAlign: "left" }}>
                                        Review and request update traveler information as needed.
                                    </p>
                                </div>

                                {travelersWithDocs.length === 0 && passportFiles.length === 0 && photoFiles.length === 0 ? (
                                    <AntText type="secondary">No documents uploaded yet.</AntText>
                                ) : travelersWithDocs.length ? (
                                    <div>
                                        {travelersWithDocs.map((traveler, index) => (
                                            <div key={index} style={{ marginBottom: 24 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                                                    <h4 style={{ marginBottom: 0 }}>
                                                        Traveler {index + 1}: {traveler?.firstName} {traveler?.lastName}
                                                    </h4>
                                                    <Button
                                                        type="primary"
                                                        className="upload-invoice-form-button"
                                                        onClick={() => handleRequestDocumentsResubmission(index)}
                                                        loading={isRequestingResubmission}
                                                        disabled={!booking?._id || isRequestingResubmission}
                                                    >
                                                        Resubmit Traveler
                                                    </Button>
                                                </div>
                                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
                                                    <div><strong>Title:</strong> {traveler?.title || "N/A"}</div>
                                                    <div><strong>Room:</strong> {traveler?.roomType || "N/A"}</div>
                                                    <div><strong>Birthday:</strong> {traveler?.birthday ? dayjs(traveler.birthday).format("MMM D, YYYY") : "N/A"}</div>
                                                    <div><strong>Age:</strong> {traveler?.age ?? "N/A"}</div>
                                                    <div><strong>Passport #:</strong> {traveler?.passportNo || "N/A"}</div>
                                                    <div><strong>Expiry:</strong> {traveler?.passportExpiry ? dayjs(traveler.passportExpiry).format("MMM D, YYYY") : "N/A"}</div>
                                                </div>

                                                <div style={{ display: "flex", flexDirection: "row", gap: 40, flexWrap: "wrap", marginTop: 12 }}>
                                                    {traveler?.passportFile && (
                                                        <div style={{ marginBottom: 16 }}>
                                                            <AntText strong>Passport / Valid ID:</AntText>
                                                            <div style={{ marginTop: 8 }}>
                                                                <img
                                                                    src={traveler.passportFile}
                                                                    alt={`Traveler ${index + 1} Passport`}
                                                                    style={{
                                                                        width: 350,
                                                                        height: 340,
                                                                        objectFit: "cover",
                                                                        borderRadius: 8,
                                                                        border: "1px solid #ccc"
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {traveler?.photoFile && (
                                                        <div style={{ marginBottom: 16 }}>
                                                            <AntText strong>2x2 Photo:</AntText>
                                                            <div style={{ marginTop: 8 }}>
                                                                <img
                                                                    src={traveler.photoFile}
                                                                    alt={`Traveler ${index + 1} Photo`}
                                                                    style={{
                                                                        width: 200,
                                                                        height: 200,
                                                                        objectFit: "cover",
                                                                        borderRadius: 8,
                                                                        border: "1px solid #ccc"
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ display: "flex", flexDirection: "row", gap: 40, flexWrap: "wrap" }}>
                                            {passportFiles.length > 0 && (
                                                <div style={{ marginBottom: 16 }}>
                                                    <AntText strong>Passport Files:</AntText>
                                                    <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
                                                        {passportFiles.map((url, index) => (
                                                            <img
                                                                key={index}
                                                                src={url}
                                                                alt={`Traveler Passport ${index + 1}`}
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
                                                                alt={`Traveler Photo ${index + 1}`}
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

                                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                                    <Button
                                        type="primary"
                                        className="upload-invoice-form-button"
                                        onClick={() => handleRequestDocumentsResubmission()}
                                        loading={isRequestingResubmission}
                                        disabled={!booking?._id || isRequestingResubmission}
                                    >
                                        Resubmit All
                                    </Button>
                                </div>

                            </div>


                            {/* BOOKING REGISTRATION SECTION */}
                            <div>

                                <div className="booking-form-stepper-container">
                                    <div style={{ marginBottom: 30 }}>
                                        <h2 className="booking-form-stepper-title" style={{ textAlign: "left" }}>Booking Registration</h2>
                                        <p className="booking-form-stepper-text" style={{ textAlign: "left" }}>
                                            The form below is a summary of the traveler's booking registration details.
                                        </p>
                                    </div>
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

                                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>

                                        {currentStep > 0 && (
                                            <Button
                                                type="primary"
                                                className="user-invoice-form-button"
                                                onClick={prev}
                                                aria-label="Previous step"
                                                style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                            >
                                                <ArrowLeftOutlined />
                                            </Button>
                                        )}


                                        {/* PAGES FOR PDF GENERATION */}
                                        <div
                                            className="form-content-wrapper pdf-capture"
                                            ref={pdfStepRef}
                                            style={{
                                                position: isGeneratingPdf ? "absolute" : "relative",
                                                left: isGeneratingPdf ? "-9999px" : "0"
                                            }}
                                        >
                                            {currentStep === 0 && (
                                                <BookingRegistrationTravelersInvoice
                                                    form={form}
                                                    summaryInvoice={summaryInvoice}
                                                    totalCount={bookingDetails?.travelerCounts?.total || 1}
                                                />
                                            )}

                                            {currentStep === 1 && (
                                                <BookingRegistrationDietInvoice
                                                    form={form}
                                                    summaryInvoice={summaryInvoice}
                                                />
                                            )}

                                            {currentStep === 2 && (
                                                <BookingRegistrationTermsInvoicePart1
                                                    form={form}
                                                    summaryInvoice={summaryInvoice}
                                                />
                                            )}

                                            {currentStep === 3 && (
                                                <BookingRegistrationTermsInvoicePart2
                                                    form={form}
                                                    summaryInvoice={summaryInvoice}
                                                />
                                            )}
                                        </div>

                                        {currentStep < 3 && (
                                            <Button
                                                type="primary"
                                                className="user-invoice-form-button"
                                                onClick={next}
                                                aria-label="Next step"
                                                style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                            >
                                                <ArrowRightOutlined />
                                            </Button>
                                        )}

                                    </div>


                                    {!isGeneratingPdf && currentStep === 3 && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                            <Button
                                                type="primary"
                                                className="upload-invoice-form-button"
                                                onClick={handleFinalSubmit}
                                                loading={isGeneratingPdf}
                                            >
                                                Download
                                            </Button>
                                        </div>
                                    )}


                                </div>

                            </div>


                        </Card>


                    </div>
                </div>
            )}
        </ConfigProvider>
    );
}
