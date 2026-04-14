import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Col, ConfigProvider, Radio, Row, Space, Tag, Typography, message, Steps, Form, Upload, Spin, Modal } from "antd";
import { ArrowLeftOutlined, UploadOutlined } from "@ant-design/icons";
import { Page, Text, View, Document, StyleSheet, PDFViewer, Image } from "@react-pdf/renderer";
import dayjs from "dayjs";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import "../../style/client/userbookinginvoice.css";
import "../../style/client/paymentprocees.css";
import "../../style/components/modals/displayinvoicemodal.css";
import apiFetch from "../../config/fetchConfig";
import BookingRegistrationTravelersInvoice from "../../components/form_bookinginvoice/BookingRegistrationTravelersInvoice";
import BookingRegistrationDietInvoice from "../../components/form_bookinginvoice/BookingRegistrationDietInvoice";
import BookingRegistrationTermsInvoicePart1 from "../../components/form_bookinginvoice/BookingRegistrationTermsInvoicePart1";
import BookingRegistrationTermsInvoicePart2 from "../../components/form_bookinginvoice/BookingRegistrationTermsInvoicePart2";


const { Title, Text: AntText } = Typography;

//INSTALLMENT AND PAYMENT COMPUTATION LOGIC
const getFrequencyWeeks = (value) => {
    if (value === 'Every week') return 1;
    if (value === 'Every 3 weeks') return 3;
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
    const maxAllowedDate = today.add(45, 'day');
    const dueCutoffDate = travelDateComputation.isBefore(maxAllowedDate)
        ? travelDateComputation
        : maxAllowedDate;

    const depositAmount = Number(bookingDetails?.paymentDetails?.depositAmount) || 0;
    const remainingAmount = Math.max(totalAmount - depositAmount, 0);

    const frequencyWeeks = getFrequencyWeeks(bookingDetails?.paymentDetails?.frequency);
    const paymentDates = [];
    let nextDate = dayjs(today).add(frequencyWeeks, 'week');

    while (nextDate.isBefore(dueCutoffDate) || nextDate.isSame(dueCutoffDate)) {
        paymentDates.push(nextDate);
        nextDate = nextDate.add(frequencyWeeks, 'week');
    }

    if (paymentDates.length === 0) {
        paymentDates.push(dueCutoffDate.subtract(1, 'day'));
    }

    const installmentCount = paymentDates.length;
    const installmentAmount = installmentCount
        ? remainingAmount / installmentCount
        : 0;

    const paymentSchedule = [
        {
            label: 'Deposit',
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

    const nextUnpaid = paymentSchedule.find(item => item.status === "PENDING");
    return { paymentSchedule, totalAmount, subtotal, nextUnpaid };
};

//CONVERT FILE TO BASE64 STRING
const getBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

export default function UserBookingInvoice() {
    const location = useLocation();
    const navigate = useNavigate();

    const initialBooking = location.state?.booking || null;
    const [booking, setBooking] = useState(initialBooking);
    const [transactions, setTransactions] = useState([]);
    const bookingDetails = booking?.bookingDetails || {};
    const [method, setMethod] = useState(null);
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [fileList, setFileList] = useState([]);

    const [loading, setLoading] = useState(true);

    const stepsToCapture = [0, 1, 2, 3];

    //PAYMENT STATUS COMPUTATION
    const formatCurrency = useMemo(
        () => new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }),
        []
    );

    const totalPrice = (Math.round(Number(booking?.totalPrice || booking?.bookingDetails?.totalPrice || 0) * 100) / 100).toFixed(2);
    const paidAmount = (Math.round(transactions
        .filter(txn => txn.status === "Paid" || txn.status === "Successful" || txn.status === "Fully Paid")
        .reduce((sum, txn) => {
            const amount = Number(txn.amount || 0);
            return sum + amount;
        }, 0) * 100) / 100).toFixed(2); // Round to 2 decimal places


    const transactionStatus = transactions.length === 0
        ? "Pending"
        : paidAmount >= totalPrice
            ? "Fully Paid"
            : "Partial";


    const getPaymentStatus = () => {
        if (transactionStatus === "Fully Paid" || transactionStatus === "Paid") {
            return { label: "Fully Paid", color: "green" };
        }
        if (transactionStatus === "Pending") {
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
        bookingDetails.travelDate ||
        booking?.travelDate ||
        bookingDetails.packageTravelDate;
    const travelStart = travelDateValue?.startDate
        || (typeof travelDateValue === 'string' ? travelDateValue.split(' - ')[0] : null)
        || travelDateValue
        || null;
    const travelEnd = travelDateValue?.endDate || null;
    const travelDate = travelStart && dayjs(travelStart).isValid()
        ? (travelEnd && dayjs(travelEnd).isValid()
            ? `${dayjs(travelStart).format("MMM D, YYYY")} - ${dayjs(travelEnd).format("MMM D, YYYY")}`
            : dayjs(travelStart).format("MMM D, YYYY"))
        : "--";

    const issueDate = booking?.createdAt ? dayjs(booking.createdAt) : dayjs();
    const customerName = bookingDetails.leadFullName || booking?.leadFullName || "Customer";
    const customerPhone = bookingDetails.leadContact || booking?.leadContact || "--";
    const remainingBalance = (Math.round(Math.max(totalPrice - paidAmount, 0) * 100) / 100).toFixed(2);
    const paymentMode = bookingDetails?.paymentMode || (bookingDetails?.paymentDetails?.paymentType === 'deposit' ? 'Deposit' : 'Full Payment');

    const summaryInvoice = bookingDetails

    //DOCUMENTS
    const travelersWithDocs = bookingDetails?.travelers?.length
        ? bookingDetails.travelers
        : booking?.travelers || []
    const passportFiles = booking.passportFiles || [];
    const photoFiles = booking.photoFiles || [];

    //REGISTRATION FORM
    const [form] = Form.useForm();
    const pdfStepRef = useRef(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    //GO NEXT PAGE
    const next = async () => {
        try {
            await form.validateFields();

            setCurrentStep(prev => prev + 1);
        } catch (error) {
            message.error("Please complete required fields.");
        }
    };

    //GO PREVIOUS PAGE
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


    //PAYMENT FUNCTIONS
    const handleSelectPaymentMethod = (selectedMethod) => {
        setMethod(selectedMethod);
    };

    const disablePayment = useMemo(() => {
        if (!transactions || transactions.length === 0) return false; // No transactions yet
        return transactions[0].status === "Pending";
    }, [transactions]);


    const handleUploadChange = async ({ fileList: newFileList }) => {
        const file = newFileList[0];

        if (file && file.originFileObj) {
            file.preview = await getBase64(file.originFileObj);
        }

        setFileList(newFileList.slice(-1));
    };

    const beforeUpload = (file) => {
        const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isImage) {
            message.error('Only JPG/PNG files are allowed');
            return Upload.LIST_IGNORE;
        }

        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('Image must be smaller than 2MB');
            return Upload.LIST_IGNORE;
        }
        return false;
    };

    //CHECKOUT FUNCTION
    const proceedBooking = async () => {

        if (!method) {
            message.warning("Please select a payment method.");
            return;
        }

        if (method === 'manual' && fileList.length === 0) {
            message.warning("Please upload proof of payment.");
            return;
        }

        try {
            setLoading(true);

            if (method === 'manual') {
                const file = fileList?.[0]?.originFileObj;

                if (!file) {
                    message.error("Invalid file.");
                    setLoading(false);
                    return;
                }

                const formData = new FormData();
                formData.append("file", file); // 

                const uploadRes = await apiFetch.post(
                    "/upload/upload-receipt",
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    }
                );

                const imageUrl = uploadRes?.url;

                if (!imageUrl) {
                    message.error("Image upload failed.");
                    setLoading(false);
                    return;
                }

                const manualDepositRes = await apiFetch.post('/payment/manual-deposit', {
                    bookingId: booking?._id,
                    packageId: booking?.packageId._id,
                    amount: paymentMode === 'Deposit'
                        ? currentUnpaidInstallment
                        : { amount: Number(totalPrice) },
                    proofImage: imageUrl,
                    proofImageType: file?.type,
                    proofFileName: file?.name
                });
                setLoading(false);

                if (manualDepositRes?.redirectUrl) {
                    navigate(manualDepositRes.redirectUrl);
                    return;
                }
            }

            const paymentPayload = {
                bookingId: booking?._id,
                bookingReference: reference,
                packageId: booking?.packageId._id,
                totalPrice: paymentMode === 'Deposit'
                    ? currentUnpaidInstallment?.amount
                    : Number(totalPrice),
            };

            const paymongoResponse = await apiFetch.post(
                '/payment/create-checkout-session-deposit',
                { paymentPayload }
            );

            const checkoutUrl = paymongoResponse?.data?.attributes?.checkout_url;
            setLoading(false);

            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                console.error("PayMongo Response Structure:", paymongoResponse);
                throw new Error("Failed to create PayMongo checkout session - URL missing");
            }

        } catch (error) {
            console.error('Booking failed:', error);
            Modal.error({
                title: 'Booking Failed',
                content: 'An error occurred while processing your booking. Please try again later.',
            });
        }
    }


    //BOOKING INVOICE NUMBER LOGIC
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

        const fetchAllData = async () => {
            setLoading(true);
            try {

                const bookingRes = await apiFetch.get(`/booking/by-reference/${reference}`);
                const fetchedBooking = bookingRes?.booking || null;
                const fetchedTransactions = bookingRes?.transactions || [];

                setBooking(fetchedBooking);
                setTransactions(fetchedTransactions);


                if (fetchedBooking?._id) {
                    try {
                        const allBookingsRes = await apiFetch.get("/booking/all-bookings");
                        const number = buildInvoiceNumber(allBookingsRes || [], fetchedBooking);

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

            } catch (err) {
                message.error("Failed to load booking details.");
                console.error("Primary fetch error:", err);
            } finally {

                setLoading(false);
            }
        };

        fetchAllData();
    }, [reference]);

    //INSTALLMENT COMPUTATION
    const [currentUnpaidInstallment, setCurrentUnpaidInstallment] = useState(null);
    const paymentFrequency = bookingDetails?.paymentDetails?.frequency || "Monthly";

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

    const installmentData = useMemo(() => {
        return runInstallmentLogic(invoice, bookingDetails, paidAmount);
    }, [invoice, bookingDetails, paidAmount]);

    const installmentsOnly = installmentData.paymentSchedule?.filter(
        (item) => item.label.toLowerCase().includes("installment")
    );

    const lastInstallment = installmentsOnly?.length
        ? installmentsOnly[installmentsOnly.length - 1]
        : null;

    const lastInstallmentDate = lastInstallment
        ? dayjs(lastInstallment.date).format("MMMM D, YYYY")
        : null;

    invoice.invoice.dueDate = lastInstallmentDate ? dayjs(lastInstallmentDate).format("MMMM D, YYYY") : null;

    useEffect(() => {
        if (paymentMode !== 'Deposit') {
            const fullPayment = {
                label: 'Full Payment',
                amount: Number(totalPrice),
                status: 'PENDING',
                dueDate: lastInstallmentDate
            };

            const shouldUpdate =
                !currentUnpaidInstallment ||
                currentUnpaidInstallment.label !== fullPayment.label ||
                Number(currentUnpaidInstallment.amount || 0) !== fullPayment.amount ||
                currentUnpaidInstallment.status !== fullPayment.status ||
                currentUnpaidInstallment.dueDate !== fullPayment.dueDate;

            if (shouldUpdate) {
                setCurrentUnpaidInstallment(fullPayment);
            }
            return;
        }

        const next = installmentData.nextUnpaid;

        if (!next && !currentUnpaidInstallment) return;

        if (
            next?.label !== currentUnpaidInstallment?.label ||
            next?.amount !== currentUnpaidInstallment?.amount ||
            next?.status !== currentUnpaidInstallment?.status
        ) {
            setCurrentUnpaidInstallment(
                next
                    ? {
                        ...next,
                        dueDate: lastInstallmentDate,
                    }
                    : null
            );
        }
    }, [currentUnpaidInstallment, installmentData.nextUnpaid, lastInstallmentDate, paymentMode, totalPrice])

    const calculateTotals = (items) => {
        const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
        const tax = 0;
        const total = subtotal + tax;
        return { subtotal, tax, total };
    };

    const totals = calculateTotals(invoice.items);


    //INVOICE DOCUMENT
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

                        <View style={[styles.tableHeader, { backgroundColor: '#F3F4F6' }]}>
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
                                <Text style={[styles.cell, { flex: 2, textAlign: "right" }]}>
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
                                        fontFamily: 'Helvetica-Bold'
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
                            <Text style={styles.totalDueLabel}>TOTAL PRICE</Text>
                            <Text style={styles.totalDueValue}>PHP {Number(totalPrice).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</Text>
                        </View>
                        <View style={styles.totalDueRow}>
                            <Text style={styles.totalDueLabel}>PAID TO DATE</Text>
                            <Text style={styles.totalDueValue}>PHP {Number(paidAmount).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</Text>
                        </View>
                        {/* Highlighting the Remaining Balance */}
                        <View style={[styles.totalDueRow, { backgroundColor: '#f3f4f6', padding: 5 }]}>
                            <Text style={[styles.totalDueLabel, { color: '#b91c1c' }]}>REMAINING BAL.</Text>
                            <Text style={[styles.totalDueValue, { color: '#b91c1c' }]}>PHP {Number(remainingBalance).toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            })}</Text>
                        </View>
                        <Text style={styles.thankYou}>THANK YOU.</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );

    //INVOICE STYLES
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
                {(loading || isGeneratingPdf) && (
                    <div className="booking-loading-overlay">
                        <Spin
                            description={isGeneratingPdf ? "Preparing your PDF..." : "Loading invoice..."}
                            size="large"
                        />
                    </div>
                )}
                <div className="user-invoice-header">


                    <div>
                        <Button className="user-invoice-back-button" type="primary" onClick={() => navigate("/user-bookings")}>
                            <ArrowLeftOutlined />
                            Back
                        </Button>
                        <Title level={2} className="page-header">Booking Invoice</Title>
                        <AntText className="user-invoice-subtitle">
                            Review your balance and download the booking invoice.
                        </AntText>
                    </div>

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
                            <Card className="user-invoice-stat" variant={false}>
                                <AntText type="secondary">Total Price</AntText>
                                <div className="user-invoice-amount">
                                    {Number(totalPrice).toLocaleString('en-PH', {
                                        style: 'currency',
                                        currency: 'PHP',
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}</div>
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card className="user-invoice-stat" variant={false}>
                                <AntText type="secondary">Paid Amount</AntText>
                                <div className="user-invoice-amount">
                                    {Number(paidAmount).toLocaleString('en-PH', {
                                        style: 'currency',
                                        currency: 'PHP',
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}</div>
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card className="user-invoice-stat user-invoice-highlight" variant={false}>
                                <Space orientation="vertical" size={4}>
                                    <AntText type="secondary">Remaining Balance</AntText>
                                    <div className="user-invoice-amount">
                                        {Number(remainingBalance).toLocaleString('en-PH', {
                                            style: 'currency',
                                            currency: 'PHP',
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </div>
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
                            <div></div>
                            <PDFViewer style={{ width: "100%", height: 727 }}>
                                <MyDocument />
                            </PDFViewer>
                        </div>
                    </div>
                </div>

                <Card className="user-invoice-card" title="Transaction History" style={{ marginBottom: 24, marginTop: 24 }}>
                    <div style={{
                        backgroundColor: '#f0f5ff',
                        border: '1px solid #adc6ff',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: '#2f54eb'
                    }}>
                        <AntText data-info>
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
                                            <div><strong>
                                                {txn.amount.toLocaleString('en-PH', {
                                                    style: 'currency',
                                                    currency: 'PHP',
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </strong></div>
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


                {remainingBalance > 0 && (
                    <div className='payment-methods-container payment-section' style={{ marginTop: 24 }}>
                        <div className="payment-methods-wrapper">
                            <div className="payment-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 className="payment-methods-title payment-section-title">Payment Methods</h2>
                                    <p className="payment-section-subtitle">
                                        Select a payment method to complete your booking.
                                    </p>
                                </div>
                                {/* Displaying balance here for clarity during checkout */}
                                <div style={{ textAlign: 'right' }}>
                                    <AntText type="secondary">Amount to Pay:</AntText>
                                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#b91c1c' }}>
                                        {disablePayment ? "Pending Payments..." : currentUnpaidInstallment?.amount
                                            ? formatCurrency.format(currentUnpaidInstallment.amount)
                                            : "Calculating..."}
                                    </div>
                                </div>
                            </div>

                            <Radio.Group
                                onChange={(e) => handleSelectPaymentMethod(e.target.value)}
                                value={method}
                                className="payment-methods-cards"
                                style={{ width: '100%', display: 'flex', gap: '16px', marginBottom: '24px' }}
                            >
                                <Radio.Button
                                    value="paymongo"
                                    disabled={remainingBalance <= 0 || disablePayment}
                                    className={`payment-card ${method === "paymongo" ? "selected" : ""}`}
                                    style={{ flex: 1, height: 'auto', padding: '20px' }}
                                >
                                    <div className="card-content">
                                        <h3>Paymongo</h3>
                                        <p>Pay securely via Credit Card, GCash, or Maya. (3.5% + ₱15 fee applies)</p>
                                    </div>
                                </Radio.Button>

                                <Radio.Button
                                    value="manual"
                                    disabled={remainingBalance <= 0 || disablePayment}
                                    className={`payment-card ${method === "manual" ? "selected" : ""}`}
                                    style={{ flex: 1, height: 'auto', padding: '20px' }}
                                >
                                    <div className="card-content">
                                        <h3>Manual Payment</h3>
                                        <p>Direct bank deposit. Requires manual verification of receipt.</p>
                                    </div>
                                </Radio.Button>
                            </Radio.Group>

                            {/* Proceed Button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                    type="primary"
                                    size="large"
                                    style={{ padding: '0 50px', height: '50px', fontSize: '16px', fontWeight: 'bold', margin: 30 }}
                                    onClick={proceedBooking}
                                    disabled={remainingBalance <= 0 || disablePayment}
                                >
                                    Proceed to Checkout
                                </Button>
                            </div>
                        </div>

                        {method === 'manual' && (
                            <div className="manual-transfer-details">
                                <div className="bank-accounts-section">
                                    <h4 className="section-subtitle">Available Bank Accounts</h4>
                                    <div className="bank-grid">
                                        <div className="bank-item">
                                            <span className="bank-name">BDO Unibank</span>
                                            <span className="account-number">0012-3456-7890</span>
                                            <span className="account-holder">M&RC Travel and Tours</span>
                                        </div>
                                        <div className="bank-item">
                                            <span className="bank-name">BPI</span>
                                            <span className="account-number">9876-5432-10</span>
                                            <span className="account-holder">M&RC Travel and Tours</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bank-accounts-section">
                                    <div className="bank-grid">
                                        <div className="bank-item">
                                            <span className="bank-name">Metro Bank</span>
                                            <span className="account-number">0012-3456-7890</span>
                                            <span className="account-holder">M&RC Travel and Tours</span>
                                        </div>
                                        <div className="bank-item">
                                            <span className="bank-name">Land Bank</span>
                                            <span className="account-number">9876-5432-10</span>
                                            <span className="account-holder">M&RC Travel and Tours</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="upload-section">
                                    <h4 className="section-subtitle">Upload Proof of Payment</h4>
                                    <p className="upload-hint">Please upload a clear screenshot or photo of your deposit slip or transfer confirmation.</p>
                                    <p className="upload-hint">Accepted formats: JPG or PNG. Max size: 2MB.</p>

                                    <p className="upload-note">Note: Our team will manually verify your payment, which may take 1-2 business days. You will receive a confirmation email once your payment is verified.</p>

                                    <Upload
                                        listType="picture"
                                        maxCount={1}
                                        fileList={fileList}
                                        onChange={handleUploadChange}
                                        beforeUpload={beforeUpload}
                                        accept=".jpg,.jpeg,.png"
                                    >
                                        <Button icon={<UploadOutlined />} className="upload-btn">
                                            Select Receipt Image
                                        </Button>
                                    </Upload>

                                    {fileList.length > 0 && (
                                        <div className="upload-preview-container">
                                            <h4 className="section-subtitle">Preview</h4>

                                            <div className="upload-preview-box">
                                                <img
                                                    src={fileList[0].preview}
                                                    alt="Receipt Preview"
                                                    className="upload-preview-image"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}


                <Card className="user-invoice-card" title="Documents" style={{ marginTop: 24 }}>
                    {travelersWithDocs.length === 0 && passportFiles.length === 0 && photoFiles.length === 0 ? (
                        <AntText type="secondary">No documents uploaded yet.</AntText>
                    ) : travelersWithDocs.length ? (
                        <div>
                            {travelersWithDocs.map((traveler, index) => (
                                <div key={index} style={{ marginBottom: 24 }}>
                                    <h4 style={{ marginBottom: 8 }}>
                                        Traveler {index + 1}: {traveler?.firstName} {traveler?.lastName}
                                    </h4>
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                                        <div><strong>Title:</strong> {traveler?.title || 'N/A'}</div>
                                        <div><strong>Room:</strong> {traveler?.roomType || 'N/A'}</div>
                                        <div><strong>Birthday:</strong> {traveler?.birthday ? dayjs(traveler.birthday).format('MMM D, YYYY') : 'N/A'}</div>
                                        <div><strong>Age:</strong> {traveler?.age ?? 'N/A'}</div>
                                        <div><strong>Passport #:</strong> {traveler?.passportNo || 'N/A'}</div>
                                        <div><strong>Expiry:</strong> {traveler?.passportExpiry ? dayjs(traveler.passportExpiry).format('MMM D, YYYY') : 'N/A'}</div>
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
                                                            width: 380,
                                                            height: 450,
                                                            objectFit: 'cover',
                                                            borderRadius: 8,
                                                            border: '1px solid #ccc'
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
                                                            objectFit: 'cover',
                                                            borderRadius: 8,
                                                            border: '1px solid #ccc'
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
                                        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                                            {passportFiles.map((url, index) => (
                                                <img
                                                    key={index}
                                                    src={url}
                                                    alt={`Traveler Passport ${index + 1}`}
                                                    style={{
                                                        width: 350,
                                                        height: 340,
                                                        objectFit: 'cover',
                                                        borderRadius: 8,
                                                        border: '1px solid #ccc'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {photoFiles.length > 0 && (
                                    <div style={{ marginBottom: 16 }}>
                                        <AntText strong>Photo Files:</AntText>
                                        <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                                            {photoFiles.map((url, index) => (
                                                <img
                                                    key={index}
                                                    src={url}
                                                    alt={`Traveler Photo ${index + 1}`}
                                                    style={{
                                                        width: 200,
                                                        height: 200,
                                                        objectFit: 'cover',
                                                        borderRadius: 8,
                                                        border: '1px solid #ccc'
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

                {/* BOOKING REGISTRATION SECTION */}
                <Card className="user-invoice-card" style={{ marginTop: 25 }}>
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

                        {/* BUTTONS FOR BOOKING REGISTRATION */}
                        {!isGeneratingPdf && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                                <div>
                                    {currentStep > 0 && (
                                        <Button type="primary"
                                            className="user-invoice-form-button"
                                            onClick={prev}>
                                            Back
                                        </Button>
                                    )}
                                </div>

                                <div>
                                    {currentStep < 3 ? (
                                        <Button
                                            type="primary"
                                            className="user-invoice-form-button"
                                            onClick={next}>
                                            Next Step
                                        </Button>
                                    ) : (
                                        <Button
                                            type="primary"
                                            className="user-invoice-form-button"
                                            onClick={handleFinalSubmit}
                                            loading={isGeneratingPdf}
                                        >
                                            Download
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </Card>


            </div>
        </ConfigProvider >
    );
}
