import React, { useEffect, useState } from 'react'
import { Modal, Button, ConfigProvider, Radio, Select, Upload, Space, message, Spin } from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Page, Text, View, Document, StyleSheet, PDFViewer, Image } from '@react-pdf/renderer';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuotationBooking } from '../../context/BookingQuotationContext';
import dayjs from "dayjs";
import '../../style/components/modals/displayinvoicemodal.css';
import '../../style/client/paymentprocees.css';
import apiFetch from '../../config/fetchConfig';

const getBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });

export default function QuotationsPaymentProcess() {
    const { quotationBookingData } = useQuotationBooking();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [paymentType, setPaymentType] = useState(null); // 'deposit' or 'full'
    const [frequency, setFrequency] = useState('Every 2 weeks');
    const [method, setMethod] = useState(null);
    const [loading, setLoading] = useState(false);

    const [isProceedModalOpen, setIsProceedModalOpen] = useState(false);

    const onCancelModal = () => {
        setIsProceedModalOpen(false);
    };

    const [monthBookingsCount, setMonthBookingsCount] = useState(0);

    const [fileList, setFileList] = useState([]);

    const passportFiles = quotationBookingData?.passportFiles || [];
    const photoFiles = quotationBookingData?.photoFiles || [];

    console.log("Passport Files:", passportFiles);
    console.log("Photo Files:", photoFiles);

    //REDIRECT IF NO BOOKING DATA
    useEffect(() => {
        if (!quotationBookingData) {
            navigate('/home', { replace: true });
        }
        const methodParam = searchParams.get('method');
        if (methodParam === 'manual' || methodParam === 'paymongo') {
            setMethod(methodParam);
        }
    }, [quotationBookingData, navigate, searchParams]);


    //CONVERT THE BASE64 BACK TO FILE OBJECT
    const base64ToFile = (base64Data, fileName, fileType) => {
        const arr = base64Data.split(',');
        const mime = arr[0].match(/:(.*?);/)[1] || fileType;
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new File([u8arr], fileName, { type: mime });
    };

    //HANDLE UPLOAD CHANGE FOR PROOF OF PAYMENT
    const handleUploadChange = async ({ fileList: newFileList }) => {
        const file = newFileList[0];

        if (file && file.originFileObj) {
            file.preview = await getBase64(file.originFileObj);
        }

        setFileList(newFileList.slice(-1));
    };

    //VALIDATE FILE BEFORE UPLOAD
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

    //UPLOAD ALL FILES (PASSPORT, PHOTO, PROOF) AND RETURN THEIR URLS
    const uploadAllFiles = async (passportFiles, photoFiles) => {
        const formData = new FormData();

        // Helper to process arrays
        const processFiles = (fileArray, label) => {
            fileArray.forEach((file, index) => {
                // Check if it's already a File object or needs conversion
                let fileToAppend;
                if (file.originFileObj) {
                    fileToAppend = file.originFileObj;
                } else if (file.base64) {
                    fileToAppend = base64ToFile(file.base64, file.name || `${label}_${index}.jpg`, file.type);
                }

                if (fileToAppend) {
                    // IMPORTANT: Ensure the key matches what your backend expects (e.g., "files")
                    formData.append("files", fileToAppend);
                }
            });
        };

        processFiles(passportFiles, 'passport');
        processFiles(photoFiles, 'photo');

        // DEBUG: Check if FormData is actually populated before sending
        for (let pair of formData.entries()) {
            console.log(pair[0] + ': ' + pair[1]);
        }

        // If no files were added, don't even make the request
        if (!formData.has("files")) {
            throw new Error("No files selected for upload");
        }

        const res = await apiFetch.post(
            "/upload/upload-booking-documents",
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
        );

        return res.urls;
    };


    //GET THE INVOICE NUMBER
    useEffect(() => {
        const fetchMonthBookings = async () => {
            try {
                const response = await apiFetch.get('/booking/bookings-total-month');
                setMonthBookingsCount(response.totalBookings || 0);
            } catch (error) {
                console.error('Failed to fetch month bookings count', error);
            }
        };
        fetchMonthBookings();
    }, []);

    const invoiceNumber = `${dayjs().format("MM")}${String(monthBookingsCount + 1).padStart(2, "0")}`;
    const issueDate = dayjs().format("MMMM D, YYYY");

    console.log("Booking Data in PaymentProcess:", quotationBookingData);

    //COMPUTATION OF AMOUNT FOR INVOICE DISPLAY AND PAYMENT PAYLOAD
    const travelerCountAdult = quotationBookingData?.travelersCount?.adult || 0;
    const travelerCountChild = quotationBookingData?.travelersCount?.child || 0;
    const travelerCountInfant = quotationBookingData?.travelersCount?.infant || 0;
    const travelerTotal = travelerCountAdult + travelerCountChild + travelerCountInfant || 0;

    const packagePricePerPax = quotationBookingData?.adultRate || 0;
    const soloRate = quotationBookingData?.adultRate || 0;
    const childRate = quotationBookingData?.childRate || 0;
    const infantRate = quotationBookingData?.infantRate || 0;

    console.log("Rates - Adult:", packagePricePerPax, "Child:", childRate, "Infant:", infantRate);

    const bookingType = quotationBookingData?.bookingType || 'Group Booking';
    const computedTotalAmount =
        travelerCountAdult * packagePricePerPax +
        travelerCountChild * childRate +
        travelerCountInfant * infantRate;

    const totalAmount = bookingType === 'Solo Booking'
        ? travelerCountAdult * soloRate
        : quotationBookingData?.totalPrice ?? computedTotalAmount;

    const packageId = quotationBookingData?.packageId;
    const packageName = quotationBookingData?.packageName || 'Tour Package';

    const startTravelDate = dayjs(quotationBookingData?.travelDate?.startDate).format("MMM D, YYYY") || 'TBD';
    const endTravelDate = dayjs(quotationBookingData?.travelDate?.endDate).add(4, 'day').format("MMM D, YYYY") || 'TBD';

    const travelDate = startTravelDate === 'TBD' ? 'TBD' : `${startTravelDate} - ${endTravelDate}`;

    console.log("Booking Data in PaymentProcess:", travelDate);

    const name = quotationBookingData?.leadFullName || 'Customer';
    const email = quotationBookingData?.leadEmail || 'Email'
    const phone = quotationBookingData?.leadContact || 'Phone Number';

    //PAYLOAD FOR PAYMENT
    const paymentDetails = {
        paymentType,
        frequency,
        depositAmount: quotationBookingData?.deposit ? (quotationBookingData.deposit * travelerTotal) : 0,
    }

    //PAYLOAD FOR BOOKINGS
    const bookingDetails = {
        dateOfRegistration: quotationBookingData.dateOfRegistration,
        travelDate: quotationBookingData?.travelDate,
        tourPackageTitle: quotationBookingData.tourPackageTitle,
        tourPackageVia: quotationBookingData.tourPackageVia,
        leadTitle: quotationBookingData.leadTitle,
        leadFullName: quotationBookingData.leadFullName,
        leadEmail: quotationBookingData.leadEmail,
        leadContact: quotationBookingData.leadContact,
        leadAddress: quotationBookingData.leadAddress,
        travelers: quotationBookingData.travelers,
        dietaryDetails: quotationBookingData.dietaryDetails,
        dietaryRequest: quotationBookingData.dietaryRequest,
        medicalDetails: quotationBookingData.medicalDetails,
        medicalRequest: quotationBookingData.medicalRequest,
        ownInsurance: quotationBookingData.ownInsurance,
        purchaseInsurance: quotationBookingData.purchaseInsurance,
        totalPrice: totalAmount,
        emergencyContact: quotationBookingData.emergencyContact,
        emergencyEmail: quotationBookingData.emergencyEmail,
        emergencyName: quotationBookingData.emergencyName,
        emergencyRelation: quotationBookingData.emergencyRelation,
        emergencyTitle: quotationBookingData.emergencyTitle,
        paymentDetails: paymentDetails
    }

    console.log("Booking Details for Payment Payload:", bookingDetails);

    //checkout
    const proceedBooking = async () => {

        setIsProceedModalOpen(false);
        if (!paymentType) {
            message.warning("Please select a payment type.");
            return;
        }

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

            const amountToCharge = paymentType === 'deposit'
                ? depositAmount
                : totalAmount;

            const allUrls = await uploadAllFiles(passportFiles, photoFiles);

            const passportUrls = allUrls.slice(0, passportFiles.length);
            const photoUrls = allUrls.slice(passportFiles.length);

            const travelersWithUrls = (quotationBookingData?.travelers || []).map((traveler, index) => ({
                ...traveler,
                passportFile: passportUrls[index] || traveler?.passportFile || null,
                photoFile: photoUrls[index] || traveler?.photoFile || null
            }))

            const bookingDetailsWithUrls = {
                ...bookingDetails,
                travelers: travelersWithUrls
            }

            const startDate = quotationBookingData?.travelDate.split(" - ")?.[0] || dayjs().format("MMM D, YYYY");
            const endDate = quotationBookingData?.travelDate.split(" - ")?.[1] || dayjs().format("MMM D, YYYY");


            const paymentMode = paymentType === 'deposit' ? 'Deposit' : 'Full Payment';

            const bookingRes = await apiFetch.post('/booking/create-booking', {
                bookingPayload: {
                    packageId,
                    travelDate: {
                        startDate,
                        endDate
                    },
                    travelers: quotationBookingData?.travelersCount.adult + quotationBookingData?.travelersCount.child + quotationBookingData?.travelersCount.infant || 0,
                    bookingDetails: bookingDetailsWithUrls,
                    paymentType,
                    paymentMode,
                    passportFiles: passportUrls,
                    photoFiles: photoUrls,
                    amount: amountToCharge //for checkoutToken
                }
            });

            const { paymentToken, expiresAt } = bookingRes;

            // Expiry check (extra safety)
            if (dayjs().isAfter(dayjs(expiresAt))) {
                setLoading(false);
                message.error("Booking session expired. Please try again.");
                return;
            }

            if (method === 'manual') {
                const file = fileList?.[0]?.originFileObj;

                if (!file) {
                    message.error("Invalid file.");
                    setLoading(false);
                    return;
                }

                const formData = new FormData();
                formData.append("file", file); // 

                console.log("Uploading file:", file);
                console.log("FormData file:", formData.get("file"));

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

                console.log("Booking data from new booking:", bookingRes);

                const manualDepositRes = await apiFetch.post('/payment/manual-quotation', {
                    bookingId: bookingRes.booking._id,
                    quotationId: quotationBookingData.quotationId,
                    packageId,
                    amount: amountToCharge,
                    proofImage: imageUrl,
                    proofImageType: file?.type,
                    proofFileName: file?.name
                });
                setLoading(false);
                if (manualDepositRes?.redirectUrl) {
                    navigate(manualDepositRes.redirectUrl);
                    return;
                }
                return;
            }

            const paymongoPayload = {
                quotationId: quotationBookingData.quotationId,
                paymentToken: paymentToken
            }

            console.log(paymongoPayload)

            const paymongoResponse = await apiFetch.post(
                '/payment/create-checkout-session-quotation',
                paymongoPayload
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


    const formatCurrency = (value) => `PHP ${value.toFixed(2)}`;

    const getFrequencyWeeks = (value) => {
        if (value === 'Every week') return 1;
        if (value === 'Every 3 weeks') return 3;
        return 2;
    };

    const frequencyWeeks = getFrequencyWeeks(frequency);

    const today = dayjs();

    const travelDateStart = quotationBookingData?.travelDate.split(" - ")?.[0] || today;
    const travelDateComputation = travelDateStart ? dayjs(travelDateStart, "MMM D, YYYY") : today;

    console.log("Travel Date for Computation:", travelDateComputation);

    const maxAllowedDate = today.add(45, 'day');

    const dueCutoffDate = travelDateComputation.isBefore(maxAllowedDate)
        ? travelDateComputation
        : maxAllowedDate;

    const depositAmount = (quotationBookingData?.deposit || 0) * travelerTotal;
    const remainingAmount = Math.max(totalAmount - depositAmount, 0);

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

    const formatScheduleAmount = (value) =>
        value == null ? 'PHP TBD' : formatCurrency(value);

    const paymentSchedule = [
        {
            label: 'Deposit',
            amount: depositAmount,
            date: today,
        },
        ...paymentDates.map((date, index) => ({
            label: `Installment ${index + 1}`,
            amount: installmentAmount,
            date,
        })),
    ];

    const lastInstallmentDate = paymentDates.length > 0
        ? paymentDates[paymentDates.length - 1]
        : today;

    const Invoice = {
        company: {
            name: 'M&RC Travel and Tours',
            address: '2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1',
            city: 'Parañaque City, Philippines',
            code: '1709 PHL',
            phone: '+63 9690554806',
            email: 'info1@mrctravels.com',
        },
        invoice: {
            number: invoiceNumber,
            issueDate: issueDate,
            dueDate: lastInstallmentDate.format("MMMM D, YYYY"),
            status: 'Pending'
        },
        customer: {
            name: name,
            email: email,
            phone: phone
        },
        booking: {
            packageName: packageName || 'Tour Package',
            travelDates: `${startTravelDate} - ${endTravelDate}`,
            travelers: travelerTotal,
            bookingType: bookingType
        },
        items: [
            travelerCountAdult
                ? { date: issueDate, activity: 'Adult', description: packageName || 'Tour Package', qty: travelerCountAdult, rate: bookingType === 'Solo Booking' ? soloRate : packagePricePerPax }
                : null,
            travelerCountChild
                ? { date: issueDate, activity: 'Child', description: packageName || 'Tour Package', qty: travelerCountChild, rate: childRate }
                : null,
            travelerCountInfant
                ? { date: issueDate, activity: 'Infant', description: packageName || 'Tour Package', qty: travelerCountInfant, rate: infantRate }
                : null,
        ].filter(Boolean),
        notes: 'Thank you for booking with M&RC Travel and Tours. Safe travels!'
    };



    const MyDocument = () => (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Section: Logo and Company Info */}
                <View style={styles.header}>
                    <View style={styles.headerCompany}>
                        <Image src={"images/Logo.png"} style={styles.logo} />
                        <View>
                            <Text style={styles.brand}>{Invoice.company.name}</Text>
                            <Text style={styles.muted}>{Invoice.company.address}</Text>
                            <Text style={styles.muted}>{Invoice.company.city}</Text>
                            <Text style={styles.muted}>{Invoice.company.code}</Text>
                            <Text style={styles.muted}>{Invoice.company.phone}</Text>
                            <Text style={styles.muted}>{Invoice.company.email}</Text>
                        </View>
                    </View>
                    <View style={styles.invoiceTitleContainer}>
                        <Text style={styles.invoiceTitleText}>Invoice {Invoice.invoice.number}</Text>
                    </View>
                </View>

                {/* Billing and Payment Summary Row */}
                <View style={styles.divider}></View>

                <View style={styles.billRow}>
                    <View style={styles.billToSection}>
                        <Text style={styles.label}>BILL TO</Text>
                        <Text style={styles.customerName}>{Invoice.customer.name.toUpperCase()}</Text>
                        <Text style={styles.muted}>{Invoice.customer.phone}</Text>
                    </View>

                    <View style={styles.summaryTable}>
                        <View style={styles.summaryCol}>
                            <Text style={styles.label}>DATE</Text>
                            <Text style={styles.summaryValue}>{dayjs(Invoice.invoice.issueDate).format('MM/DD/YYYY')}</Text>
                        </View>
                        <View style={[styles.summaryCol, styles.darkBg]}>
                            <Text style={[styles.label, { color: '#FFF' }]}>PLEASE PAY</Text>
                            <Text style={[styles.summaryValue, { color: '#FFF' }]}>{totalAmount}</Text>
                        </View>
                        <View style={styles.summaryCol}>
                            <Text style={styles.label}>DUE DATE</Text>
                            <Text style={styles.summaryValue}>{dayjs(Invoice.invoice.dueDate).format('MM/DD/YYYY')}</Text>
                        </View>
                    </View>
                </View>

                {/* Main Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.cell, { flex: 1.5 }]}>DATE</Text>
                        <Text style={[styles.cell, { flex: 2 }]}>ACTIVITY</Text>
                        <Text style={[styles.cell, { flex: 4 }]}>DESCRIPTION</Text>
                        <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                        <Text style={[styles.cell, { flex: 1.5, textAlign: 'right' }]}>RATE</Text>
                        <Text style={[styles.cell, { flex: 1.5, textAlign: 'right' }]}>AMOUNT</Text>
                    </View>

                    {Invoice.items.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.cell, { flex: 1.5 }]}>{dayjs(item.date).format('MM/DD/YYYY')}</Text>
                            <Text style={[styles.cell, { flex: 2 }]}>{item.activity}</Text>
                            <Text style={[styles.cell, { flex: 4 }]}>{item.description}</Text>
                            <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{item.qty}</Text>
                            <Text style={[styles.cell, { flex: 1.5, textAlign: 'right' }]}>{item.rate.toLocaleString()}</Text>
                            <Text style={[styles.cell, { flex: 1.5, textAlign: 'right' }]}>{(item.qty * item.rate).toLocaleString()}</Text>
                        </View>
                    ))}
                </View>

                {/* Footer with Bank Details */}
                <View style={styles.footerSection}>
                    <View style={styles.bankInfo}>
                        <Text style={styles.muted}>Payment to be deposited in below bank details:</Text>
                        <Text style={[styles.label, { marginTop: 10 }]}>PESO ACCOUNT:</Text>
                        <Text style={styles.muted}>BANK: BDO UNIBANK - TRIDENT TOWER BRANCH</Text>
                        <Text style={styles.muted}>ACCOUNT NAME: {Invoice.company.name.toUpperCase()}</Text>
                        <Text style={styles.muted}>ACCOUNT NUMBER: 006830132692</Text>
                    </View>
                    <View style={styles.totalDueContainer}>
                        <View style={styles.totalDueRow}>
                            <Text style={styles.totalDueLabel}>TOTAL DUE</Text>
                            <Text style={styles.totalDueValue}>{formatCurrency(totalAmount)}</Text>
                        </View>
                        <Text style={styles.thankYou}>THANK YOU.</Text>
                    </View>
                </View>

                {paymentType === 'deposit' && (
                    <View style={styles.scheduleSection}>
                        <Text style={styles.scheduleTitle}>Payment Schedule</Text>
                        {paymentSchedule.map((entry) => (
                            <View key={entry.label} style={styles.scheduleRow}>
                                <View>
                                    <Text style={styles.scheduleLabel}>{entry.label}</Text>
                                    <Text style={styles.scheduleDate}>{entry.date.format('MM/DD/YYYY')}</Text>
                                </View>
                                <Text style={styles.scheduleAmount}>{formatScheduleAmount(entry.amount)}</Text>
                            </View>
                        ))}
                        <Text style={styles.scheduleNote}>Note: A penalty of PHP 500 applies for late deposit payments.</Text>
                    </View>
                )}
            </Page>
        </Document>
    );

    const styles = StyleSheet.create({
        page: { padding: 40, fontSize: 9, color: '#333', fontFamily: 'Helvetica' },
        logo: { width: 85, height: 60 },
        header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
        headerCompany: { flexDirection: 'row', alignItems: 'center', gap: 15 },
        brand: { fontSize: 12, fontWeight: 'bold' },
        muted: { color: '#555' },
        invoiceTitleContainer: { justifyContent: 'center' },
        invoiceTitleText: { fontSize: 16, color: '#333' },

        divider: { height: 3, backgroundColor: '#374151', marginVertical: 5 },

        billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, alignItems: 'flex-start' },
        billToSection: { flex: 1 },
        label: { fontSize: 8, color: '#777', fontWeight: 'bold', marginBottom: 4 },
        customerName: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },

        summaryTable: { flexDirection: 'row', border: '1pt solid #E5E7EB', flex: 1.5, marginLeft: 20 },
        summaryCol: { flex: 1, padding: 8, alignItems: 'center', justifyContent: 'center' },
        summaryValue: { fontSize: 10, fontWeight: 'bold' },
        darkBg: { backgroundColor: '#374151' },

        table: { marginTop: 10 },
        tableHeader: { flexDirection: 'row', borderBottom: '1pt solid #333', paddingBottom: 5, marginBottom: 5 },
        tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottom: '0.5pt solid #E5E7EB' },
        cell: { fontSize: 8 },

        footerSection: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' },
        bankInfo: { flex: 2 },
        totalDueContainer: { flex: 1, alignItems: 'flex-end' },
        totalDueRow: { flexDirection: 'row', borderTop: '1pt solid #333', borderBottom: '1pt solid #333', paddingVertical: 10, width: '100%', justifyContent: 'space-between', marginBottom: 10 },
        totalDueLabel: { fontSize: 10, fontWeight: 'bold' },
        totalDueValue: { fontSize: 10, fontWeight: 'bold' },
        thankYou: { fontSize: 9, fontWeight: 'bold', color: '#555' },
        scheduleSection: { marginTop: 18, paddingTop: 10, borderTop: '1pt solid #E5E7EB' },
        scheduleTitle: { fontSize: 10, fontWeight: 'bold', marginBottom: 6, color: '#333' },
        scheduleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottom: '0.5pt dashed #E5E7EB' },
        scheduleLabel: { fontSize: 8, fontWeight: 'bold', color: '#333' },
        scheduleDate: { fontSize: 8, color: '#555' },
        scheduleAmount: { fontSize: 8, fontWeight: 'bold', color: '#305797' },
        scheduleNote: { marginTop: 6, fontSize: 8, color: '#8a4b1b' }
    });


    return (
        <div>
            <ConfigProvider
                theme={{
                    token: {
                        colorPrimary: '#305797',
                    }
                }}
            >
                <div className="payment-process-container">
                    {loading && (
                        <div className="payment-loading-overlay">
                            <Spin size="large" description="Processing payment..." />
                        </div>
                    )}

                    <Space style={{ marginLeft: "auto" }}>
                        <Button
                            type='primary'
                            className='payment-process-back-button'
                            onClick={() => navigate(-1)}
                            style={{ display: 'flex', alignItems: 'center' }}
                        >
                            <ArrowLeftOutlined />
                            Back
                        </Button>
                    </Space>

                    <div className="payment-top-grid">
                        <div className='payment-mode-container payment-section'>
                            <div className="payment-methods-wrapper">
                                <div className="payment-section-header">
                                    <div>
                                        <h2 className="payment-methods-title payment-section-title">Mode of Payment</h2>
                                        <p className="payment-methods-subtitle payment-section-subtitle">
                                            Select your mode of payment.
                                        </p>
                                    </div>
                                </div>

                                <Radio.Group
                                    onChange={(e) => setPaymentType(e.target.value)}
                                    value={paymentType}
                                    className="payment-methods-cards"
                                >
                                    <div className='payment-cards-group'>
                                        <Radio.Button value="deposit" className={`payment-card ${paymentType === "deposit" ? "selected" : ""}`}>
                                            <div style={{ width: '100%' }}>
                                                <h3>Deposit</h3>
                                                <p>Make a partial payment to secure your booking. Choose this option to pay a portion of the total amount.</p>

                                                {paymentType === 'deposit' && (
                                                    <div style={{ marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                                                        <p style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                                                            Payment Schedule:
                                                        </p>
                                                        <Select
                                                            defaultValue="Every 2 weeks"
                                                            style={{ width: '100%' }}
                                                            onChange={(value) => setFrequency(value)}
                                                            options={[
                                                                { value: 'Every week', label: 'Every week' },
                                                                { value: 'Every 2 weeks', label: 'Every 2 weeks' },
                                                                { value: 'Every 3 weeks', label: 'Every 3 weeks' },
                                                            ]}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </Radio.Button>

                                        <Radio.Button value="full" className={`payment-card ${paymentType === "full" ? "selected" : ""}`}>
                                            <div>
                                                <h3>Full Payment</h3>
                                                <p>Pay the full amount to secure your booking and not worry about future payment deadlines.</p>
                                            </div>
                                        </Radio.Button>
                                    </div>

                                </Radio.Group>
                            </div>
                            {paymentType === 'deposit' && (
                                <div style={{ marginTop: '16px', padding: '16px 20px', borderRadius: '14px', background: '#f7f9ff', border: '1px dashed #cfd8ee' }}>
                                    <p style={{ marginBottom: '8px', fontSize: '28px', fontWeight: 500, color: '#1f2a44' }}>
                                        Payment Schedule
                                    </p>
                                    <div className="payment-schedule-list">
                                        {paymentSchedule.map((entry) => (
                                            <div
                                                key={entry.label}
                                                className="payment-schedule-item"
                                            >
                                                <div>
                                                    <div className="payment-schedule-label">{entry.label}</div>
                                                    <div className="payment-schedule-date">
                                                        {entry.date.format('MMM D, YYYY')}
                                                    </div>
                                                </div>
                                                <div className="payment-schedule-amount">
                                                    {formatScheduleAmount(entry.amount)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="payment-schedule-note">
                                        Note: A penalty of PHP 500 applies for late deposit payments.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className='display-invoice-container payment-section'>
                            <div className="payment-section-header">
                                <div>
                                    <h2 className="display-invoice-title payment-section-title">Booking Invoice</h2>
                                    <p className="display-invoice-subtitle payment-section-subtitle">
                                        Please review your booking invoice before proceeding to payment.
                                    </p>
                                </div>


                            </div>
                            <div className="display-invoice-wrapper">
                                <div className="display-invoice-card">
                                    <div className="pdf-viewer-wrapper">
                                        <div className="pdf-toolbar-mask"></div>
                                        <PDFViewer style={{ width: '100%', height: 727 }}>
                                            <MyDocument />
                                        </PDFViewer>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>

                    <div className='payment-methods-container payment-section'>
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
                                onChange={(e) => setMethod(e.target.value)}
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
                                        <p style={{ color: "#FF4D4F", fontWeight: "500", fontStyle: "italic" }}>Note: The rate for using this payment method is 3.5%.</p>
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
                                        <p style={{ color: "#FF4D4F", fontWeight: "500", fontStyle: "italic" }}>Note: The verification of your payment may take up to 1-2 business days.</p>
                                    </div>
                                </Radio>
                            </Radio.Group>
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
                                        <Button type='primary' icon={<UploadOutlined />} className="payment-process-upload-button">
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



                    <div className="payment-process-actions" style={{ paddingRight: 40, display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 20 }}>
                        <Button
                            type='primary'
                            className='payment-process-proceed-button'
                            onClick={() => setIsProceedModalOpen(true)}
                            disabled={
                                !paymentType ||
                                !method ||
                                (method === 'manual' && fileList.length === 0)
                            }
                        >
                            Proceed
                        </Button>
                    </div>

                </div>

                <Modal
                    open={isProceedModalOpen}
                    className='signup-success-modal'
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    footer={null}
                    onCancel={() => { setIsProceedModalOpen(false) }}
                    style={{ top: 200 }}
                >
                    <div className='signup-success-container'>
                        <h1 className='signup-success-heading'>Proceed to Payment</h1>
                        <p className='signup-success-text'>Are you sure you want to proceed with the payment?</p>

                    </div>

                    <div className='signup-actions'>
                        <Button
                            id='signup-success-button'
                            type='primary'
                            onClick={proceedBooking}
                        >
                            Proceed
                        </Button>

                        <Button
                            type='primary'
                            id='signup-success-button-cancel'
                            onClick={() => setIsProceedModalOpen(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </Modal>
            </ConfigProvider>
        </div>
    )
}

