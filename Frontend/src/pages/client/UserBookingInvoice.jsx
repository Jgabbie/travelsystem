import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Col, ConfigProvider, Radio, Row, Space, Tag, Typography, notification, Steps, Form, Upload, Spin, Modal } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, UploadOutlined, CheckCircleOutlined, InfoCircleOutlined, CheckCircleFilled } from "@ant-design/icons";
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

const runInstallmentLogic = (invoice, bookingDetails, paidAmount = 0, bookingDate = null) => {
    const items = invoice?.items || [];
    const subtotal = items.reduce((sum, item) => {
        const qty = Number(item.qty) || 0;
        const rate = Number(item.rate) || 0;
        return sum + (qty * rate);
    }, 0);

    const totalAmount = subtotal;
    const baseDate = bookingDate && dayjs(bookingDate).isValid()
        ? dayjs(bookingDate)
        : dayjs();

    const travelDateValue = bookingDetails?.travelDate?.startDate;
    const travelDateComputation = travelDateValue ? dayjs(travelDateValue) : baseDate;
    const maxAllowedDate = baseDate.add(45, 'day');
    const dueCutoffDate = travelDateComputation.isBefore(maxAllowedDate)
        ? travelDateComputation
        : maxAllowedDate;

    const depositAmount = Number(bookingDetails?.paymentDetails?.depositAmount) || 0;
    const remainingAmount = Math.max(totalAmount - depositAmount, 0);

    const frequencyWeeks = getFrequencyWeeks(bookingDetails?.paymentDetails?.frequency);
    const paymentDates = [];
    let nextDate = dayjs(baseDate).add(frequencyWeeks, 'week');

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
            date: baseDate,
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
    const [passportUploadLists, setPassportUploadLists] = useState([]);
    const [photoUploadLists, setPhotoUploadLists] = useState([]);

    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [submittingTravelerIndex, setSubmittingTravelerIndex] = useState(null);

    const stepsToCapture = [0, 1, 2, 3];
    const documentsResubmissionRequired = Boolean(booking?.documentsResubmissionRequired);
    const reference = booking?.reference || booking?.ref || booking?._id || "--";


    useEffect(() => {
        if (!reference || reference === "--") return;

        const fetchAllData = async () => {
            setLoading(true);
            try {

                const bookingRes = await apiFetch.get(`/booking/by-reference/${reference}`);
                const fetchedBooking = bookingRes?.booking || null;
                const fetchedTransactions = bookingRes?.transactions || [];

                console.log("Fetched Booking:", bookingRes.booking);

                setBooking(fetchedBooking);
                setTransactions(fetchedTransactions);


                if (fetchedBooking) {
                    try {
                        const invoiceRes = await apiFetch.get('/booking/bookings-total-month', { params: { reference } });
                        const number = invoiceRes?.data?.invoiceNumber || invoiceRes?.invoiceNumber;
                        if (number) {
                            setInvoiceNumber(number);
                        } else {
                            const total = Number(invoiceRes?.data?.totalBookings ?? invoiceRes?.totalBookings ?? 0);
                            const createdAtValue = fetchedBooking.bookingDate || fetchedBooking.createdAt || new Date();
                            const createdAt = createdAtValue ? dayjs(createdAtValue) : null;
                            const monthKey = createdAt && createdAt.isValid() ? createdAt.format('MM') : dayjs().format('MM');
                            const sequence = total + 1;
                            setInvoiceNumber(`${monthKey}${String(sequence).padStart(2, '0')}`);
                        }
                    } catch (err) {
                        console.error("Error fetching monthly bookings total for invoice number:", err);
                        const createdAtValue = fetchedBooking.bookingDate || fetchedBooking.createdAt || new Date();
                        const createdAt = dayjs(createdAtValue);
                        if (createdAt?.isValid()) setInvoiceNumber(`${createdAt.format('MM')}01`);
                    }
                }

            } catch (err) {
                notification.error({ message: "Failed to load booking details.", placement: 'topRight' });
                console.error("Primary fetch error:", err);
            } finally {

                setLoading(false);
            }
        };

        fetchAllData();
    }, [reference]);

    //PAYMENT STATUS COMPUTATION
    const formatCurrency = useMemo(
        () => new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
        }),
        []
    );

    const totalPrice = Math.round(Number(booking?.totalPrice || booking?.bookingDetails?.totalPrice || 0) * 100) / 100;
    const paidAmount = Math.round(transactions
        .filter(txn => txn.status === "Paid" || txn.status === "Successful" || txn.status === "Fully Paid")
        .reduce((sum, txn) => {
            const amount = Number(txn.amount || 0);
            return sum + amount;
        }, 0) * 100) / 100; // Round to 2 decimal places


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
    const packageName =
        bookingDetails.tourPackageTitle ||
        bookingDetails.packageName ||
        booking?.pkg ||
        "Package";
    const bookingType = bookingDetails?.bookingType
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

    const adultRate = bookingDetails?.paymentDetails?.adultRate
    const childRate = bookingDetails?.paymentDetails?.childRate
    const infantRate = bookingDetails?.paymentDetails?.infantRate

    const travelerCountAdult = booking?.travelers?.[0]?.adult
    const travelerCountChild = booking?.travelers?.[0]?.child
    const travelerCountInfant = booking?.travelers?.[0]?.infant

    const issueDate = booking?.bookingDate ? dayjs(booking.bookingDate) : dayjs();
    const customerName = bookingDetails.leadFullName || booking?.leadFullName || "Customer";
    const customerPhone = bookingDetails.leadContact || booking?.leadContact || "--";
    const persistedPenalty = Number(booking?.paymentPenaltyTotal || 0);
    const paymentMode = bookingDetails?.paymentMode || (bookingDetails?.paymentDetails?.paymentType === 'deposit' ? 'Deposit' : 'Full Payment');

    const summaryInvoice = bookingDetails



    //DOCUMENTS
    const travelersWithDocs = bookingDetails?.travelers?.length
        ? bookingDetails.travelers
        : booking?.travelers || []
    const passportFiles = booking.passportFiles || [];
    const photoFiles = booking.photoFiles || [];
    const resubmissionTravelerIndexes = useMemo(() => {
        const normalizedIndexes = new Set();

        if (Array.isArray(booking?.documentsResubmissionTravelerIndexes)) {
            booking.documentsResubmissionTravelerIndexes.forEach((index) => {
                const numericIndex = Number(index);
                if (Number.isInteger(numericIndex)) {
                    normalizedIndexes.add(numericIndex);
                }
            });
        }

        travelersWithDocs.forEach((traveler, index) => {
            if (traveler?.documentsResubmissionRequired) {
                normalizedIndexes.add(index);
            }
        });

        // Fallback: if booking-level resubmission is true but traveler-level flags are missing,
        // request resubmission only for travelers with missing document images.
        if (!normalizedIndexes.size && booking?.documentsResubmissionRequired) {
            travelersWithDocs.forEach((traveler, index) => {
                const hasPassport = Boolean(traveler?.passportFile || passportFiles?.[index]);
                const hasPhoto = Boolean(traveler?.photoFile || photoFiles?.[index]);
                if (!hasPassport || !hasPhoto) {
                    normalizedIndexes.add(index);
                }
            });
        }

        return Array.from(normalizedIndexes).sort((a, b) => a - b);
    }, [
        booking?.documentsResubmissionRequired,
        booking?.documentsResubmissionTravelerIndexes,
        travelersWithDocs,
        passportFiles,
        photoFiles
    ]);

    //REGISTRATION FORM
    const [form] = Form.useForm();
    const pdfStepRef = useRef(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const enhanceFilePreviews = async (files) => {
        const updated = await Promise.all(
            files.map(async (file) => {
                if (file.originFileObj && !file.preview) {
                    file.preview = await getBase64(file.originFileObj);
                }
                return file;
            })
        );
        return updated;
    };

    const handlePassportUploadChange = async (index, { fileList: newFileList }) => {
        const updated = await enhanceFilePreviews(newFileList);
        setPassportUploadLists((prev) => {
            const next = [...prev];
            next[index] = updated;
            return next;
        });
    };

    const handlePhotoUploadChange = async (index, { fileList: newFileList }) => {
        const updated = await enhanceFilePreviews(newFileList);
        setPhotoUploadLists((prev) => {
            const next = [...prev];
            next[index] = updated;
            return next;
        });
    };

    const beforeDocumentUpload = (file) => {
        const isImage = file.type === "image/jpeg" || file.type === "image/png";
        if (!isImage) {
            notification.error({ message: "Only JPG/PNG files are allowed", placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }

        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            notification.error({ message: "Image must be smaller than 2MB", placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }
        return false;
    };

    const uploadBookingDocuments = async (files) => {
        if (!files.length) return [];
        const formData = new FormData();
        files.forEach((file) => {
            if (file.originFileObj) {
                formData.append("files", file.originFileObj);
            }
        });

        const uploadRes = await apiFetch.post("/upload/upload-booking-documents", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return uploadRes?.urls || [];
    };

    const handleSubmitTravelerResubmission = async (index) => {
        if (!booking?._id) {
            notification.error({ message: "Booking ID not found.", placement: 'topRight' });
            return;
        }

        const passportList = passportUploadLists[index] || [];
        const photoList = photoUploadLists[index] || [];

        if (passportList.length === 0 && photoList.length === 0) {
            notification.warning({ message: "Please upload passport/ID or 2x2 photo.", placement: 'topRight' });
            return;
        }

        setSubmittingTravelerIndex(index);
        try {
            const [passportUrls, photoUrls] = await Promise.all([
                uploadBookingDocuments(passportList),
                uploadBookingDocuments(photoList)
            ]);

            const updatedTravelers = (travelersWithDocs || []).map((traveler, travelerIndex) => {
                if (travelerIndex !== index) return traveler;
                return {
                    ...traveler,
                    documentsResubmissionRequired: false,
                    passportFile: passportUrls[0] || traveler?.passportFile || null,
                    photoFile: photoUrls[0] || traveler?.photoFile || null
                };
            });

            const updatedPassportFiles = [...(passportFiles || [])];
            const updatedPhotoFiles = [...(photoFiles || [])];
            if (passportUrls[0]) {
                updatedPassportFiles[index] = passportUrls[0];
            }
            if (photoUrls[0]) {
                updatedPhotoFiles[index] = photoUrls[0];
            }

            const response = await apiFetch.post(`/booking/${booking._id}/resubmit-documents`, {
                passportFiles: updatedPassportFiles,
                photoFiles: updatedPhotoFiles,
                travelers: updatedTravelers,
                travelerIndex: index
            });

            const updatedBooking = response?.booking || booking;
            setBooking(updatedBooking);
            setPassportUploadLists((prev) => {
                const next = [...prev];
                next[index] = [];
                return next;
            });
            setPhotoUploadLists((prev) => {
                const next = [...prev];
                next[index] = [];
                return next;
            });
            notification.success({ message: "Documents submitted successfully.", placement: 'topRight' });
        } catch (error) {
            notification.error({ message: error?.data?.message || "Unable to submit documents.", placement: 'topRight' });
        } finally {
            setSubmittingTravelerIndex(null);
        }
    };

    //GO NEXT PAGE
    const next = async () => {
        try {
            await form.validateFields();

            setCurrentStep(prev => prev + 1);
        } catch (error) {
            notification.error({ message: "Please complete required fields.", placement: 'topRight' });
        }
    };

    //GO PREVIOUS PAGE
    const prev = () => setCurrentStep(currentStep - 1);


    //DOWNLOAD BOOKING REGISTRATION PDF
    const handleFinalSubmit = async () => {
        try {
            setDownloading(true);
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
            notification.success({ message: "Booking Registration PDF downloaded successfully.", placement: 'topRight' });

        } catch (err) {
            notification.error({ message: "Submission failed.", placement: 'topRight' });
            console.error("Error during PDF generation:", err);
        } finally {
            setDownloading(false);
            setIsGeneratingPdf(false);
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
            notification.error({ message: 'Only JPG/PNG files are allowed', placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }

        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            notification.error({ message: 'Image must be smaller than 2MB', placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }
        return false;
    };

    //CHECKOUT FUNCTION
    const proceedBooking = async () => {

        if (!method) {
            notification.warning({ message: "Please select a payment method.", placement: 'topRight' });
            return;
        }

        if (method === 'manual' && fileList.length === 0) {
            notification.warning({ message: "Please upload proof of payment.", placement: 'topRight' });
            return;
        }

        try {
            setLoading(true);

            if (method === 'manual') {
                const file = fileList?.[0]?.originFileObj;

                if (!file) {
                    notification.error({ message: "Invalid file.", placement: 'topRight' });
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
                    notification.error({ message: "Image upload failed.", placement: 'topRight' });
                    setLoading(false);
                    return;
                }


                const manualDepositRes = await apiFetch.post('/payment/manual-deposit', {
                    bookingId: booking?.bookingItem,
                    packageId: booking?.packageItem,
                    amount: paymentMode === 'Deposit'
                        ? {
                            ...(currentUnpaidInstallment || {}),
                            amount: amountToPayNow,
                        }
                        : { amount: amountToPayNow },
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
                bookingId: booking?.bookingItem,
                bookingReference: reference,
                packageId: booking?.packageItem,
                totalPrice: amountToPayNow,
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
        const createdAtValue = currentBooking.bookingDate || currentBooking.createdAt;
        const createdAt = createdAtValue ? dayjs(createdAtValue) : null;
        if (!createdAt || !createdAt.isValid()) return "";

        const getIdentity = (item) =>
            String(item?._id || item?.id || item?.reference || item?.ref || "");

        const currentIdentity = getIdentity(currentBooking);
        const monthKey = createdAt.format("MM");

        const monthBookings = (allBookings || [])
            .map((item) => ({
                ...item,
                _createdAt: item.bookingDate || item.createdAt,
                _identity: getIdentity(item)
            }))
            .filter((item) => item._createdAt && dayjs(item._createdAt).isValid())
            .filter((item) => dayjs(item._createdAt).isSame(createdAt, "month"));

        monthBookings.sort((a, b) => {
            const timeDiff = dayjs(a._createdAt).valueOf() - dayjs(b._createdAt).valueOf();
            if (timeDiff !== 0) return timeDiff;
            return a._identity.localeCompare(b._identity);
        });

        let index = monthBookings.findIndex((item) => item._identity === currentIdentity);

        if (index < 0) {
            const currentRef = String(currentBooking.reference || currentBooking.ref || "");
            if (currentRef) {
                index = monthBookings.findIndex(
                    (item) => String(item.reference || item.ref || "") === currentRef
                );
            }
        }

        const sequence = index >= 0 ? index + 1 : monthBookings.length + 1;
        return `${monthKey}${String(sequence).padStart(2, "0")}`;
    };



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
            travelerCountAdult
                ? { date: issueDate, activity: 'Adult', description: packageName || 'Tour Package', qty: travelerCountAdult, rate: bookingType === "Solo Booking" ? totalPrice : adultRate }
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

    const installmentData = useMemo(() => {
        return runInstallmentLogic(invoice, bookingDetails, paidAmount, issueDate);
    }, [invoice, bookingDetails, paidAmount, issueDate]);

    const installmentsOnly = installmentData.paymentSchedule?.filter(
        (item) => item.label.toLowerCase().includes("installment")
    );

    const lastInstallment = installmentsOnly?.length
        ? installmentsOnly[installmentsOnly.length - 1]
        : null;

    const lastInstallmentDate = lastInstallment
        ? dayjs(lastInstallment.date).format("MMMM D, YYYY")
        : null;

    const totalPriceWithPenalty = totalPrice + persistedPenalty;
    const remainingBalance = Math.max(totalPriceWithPenalty - paidAmount, 0);
    const amountToPayNow = paymentMode === "Deposit"
        ? (Number(currentUnpaidInstallment?.amount || 0) + persistedPenalty)
        : totalPriceWithPenalty;

    const paymentStatusWithPenalty = remainingBalance <= 0
        ? { label: "Fully Paid", color: "green" }
        : { label: "Balance Due", color: "orange" };

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
                        <Text style={styles.muted}>ACCOUNT NUMBER: 006838032692</Text>
                    </View>
                    <View style={styles.totalDueContainer}>
                        <View style={styles.totalDueRow}>
                            <Text style={styles.totalDueLabel}>TOTAL PRICE</Text>
                            <Text style={styles.totalDueValue}>PHP {Number(totalPriceWithPenalty).toLocaleString('en-PH', {
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

            {loading || downloading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh" }}>
                    <Spin description={loading ? "Loading Booking Details..." : "Downloading Registration Form..."} size="large" />
                </div>
            ) : (
                <div className="user-invoice-container">
                    <div className="user-invoice-page">
                        <Button className="user-invoice-back-button" type="primary" onClick={() => navigate("/user-bookings")}>
                            <ArrowLeftOutlined />
                            Back
                        </Button>

                        <div className="user-invoice-header">
                            <div>
                                <h2>Booking Invoice</h2>
                                <p>
                                    Review your balance and download the booking invoice.
                                </p>
                            </div>
                        </div>

                        {/* RESUBMISSION NOTE */}
                        {documentsResubmissionRequired && (
                            <div className="user-invoice-resubmission-alert">
                                Document Resubmission is required, kindly comply immediately!
                            </div>
                        )}

                        <Card className="user-invoice-card" style={{ marginBottom: 40 }}>
                            <div className="user-invoice-meta">
                                <div className="user-invoice-meta-item">
                                    <AntText type="secondary">Reference</AntText>
                                    <div className="user-invoice-value">{reference}</div>
                                </div>
                                <div className="user-invoice-meta-item">
                                    <AntText type="secondary">Package</AntText>
                                    <div className="user-invoice-value">{packageName}</div>
                                </div>
                                <div className="user-invoice-meta-item">
                                    <AntText type="secondary">Travel Date</AntText>
                                    <div className="user-invoice-value">{travelDate}</div>
                                </div>
                            </div>

                            <Row gutter={[16, 16]} className="user-invoice-summary">
                                <Col xs={24} md={8}>
                                    <Card className="user-invoice-stat" variant={false} style={{ paddingBottom: 30 }}>
                                        <AntText type="secondary">Total Price</AntText>
                                        <div className="user-invoice-amount">
                                            {Number(totalPriceWithPenalty).toLocaleString('en-PH', {
                                                style: 'currency',
                                                currency: 'PHP',
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </div>
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card className="user-invoice-stat" variant={false} style={{ paddingBottom: 30 }}>
                                        <AntText type="secondary">Paid Amount</AntText>
                                        <div className="user-invoice-amount">
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
                                            <Tag color={paymentStatusWithPenalty.color}>
                                                {paymentStatusWithPenalty.label}
                                            </Tag>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>

                            {remainingBalance <= 0 && (
                                <div style={{ marginBottom: 24, marginTop: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8, fontFamily: 'Montserrat, sans-serif' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 26, lineHeight: 1 }} />
                                        </span>
                                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#52c41a', lineHeight: 1.1 }}>YOU CAN NOW SUBMIT A REVIEW FOR THIS PACKAGE</h2>
                                    </div>

                                    <p style={{ margin: 0, fontSize: 14 }}>
                                        M&RC Travel and Tours values your feedback!
                                        Now that your booking is fully paid, we invite you to share your experience by submitting a review for the package you booked.
                                        Your insights help us improve our services and assist fellow travelers in making informed decisions.
                                        Thank you for choosing M&RC Travel and Tours, and we look forward to hearing about your journey with us!
                                    </p>
                                </div>
                            )}


                            <div className="user-invoice-columns">
                                <div className="user-invoice-column">
                                    <div className="display-invoice-wrapper">

                                        <div className="pdf-viewer-wrapper">
                                            <div></div>
                                            <PDFViewer style={{ width: "100%", height: 727 }}>
                                                <MyDocument />
                                            </PDFViewer>
                                        </div>

                                    </div>
                                </div>

                                <div className="user-invoice-column" style={{ marginTop: 10 }}>
                                    <h2>Transaction History</h2>
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

                                    {persistedPenalty > 0 && (
                                        <div style={{
                                            backgroundColor: '#fff7e6',
                                            border: '1px solid #ffd591',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            marginBottom: '16px',
                                            fontSize: '13px',
                                            color: '#ad4e00'
                                        }}>
                                            <AntText>
                                                <strong>Penalty Notice:</strong> PHP {Number(persistedPenalty).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} has been added to your balance for late payment beyond the allowed timeframe.
                                            </AntText>
                                        </div>
                                    )}

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
                                                            <Tag color={txn.status === "Successful" || txn.status === "Fully Paid" ? "green" : txn.status === "Pending" ? "yellow" : "red"}>
                                                                {txn.status}
                                                            </Tag>
                                                        </Col>
                                                    </Row>
                                                </Card>
                                            ))}
                                        </Space>
                                    )}

                                </div>
                            </div>

                            {/* DEPOSIT PAYMENT */}
                            {remainingBalance > 0 && (
                                <div style={{ marginTop: 24, maxWidth: 1300 }}>
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
                                                    {disablePayment ? "Pending Payments..." : amountToPayNow
                                                        ? formatCurrency.format(amountToPayNow)
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
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 0, margin: 0 }}>
                                            <Button
                                                className="user-invoice-checkout-button"
                                                type="primary"
                                                size="large"
                                                style={{ padding: '0 50px', height: '50px', fontSize: '16px', fontWeight: 'bold' }}
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
                                                        <span className="bank-name">BDO</span>
                                                        <span className="account-number">006838032692</span>
                                                        <span className="account-holder">M&RC TRAVEL AND TOURS</span>
                                                    </div>
                                                    <div className="bank-item">
                                                        <span className="bank-name">GCASH</span>
                                                        <span className="account-number">09690554806</span>
                                                        <span className="account-holder">MA****R C.</span>
                                                        <img
                                                            src="/images/QRCode_GCash_Maricar.jpg"
                                                            alt="GCash QR Maricar"
                                                            style={{ width: 300, height: 300, marginTop: 8 }}
                                                        />
                                                    </div>
                                                    <div className="bank-item">
                                                        <span className="bank-name">GCASH</span>
                                                        <span className="account-number">09688880405</span>
                                                        <span className="account-holder">RH*N C.</span>
                                                        <img
                                                            src="/images/QRCode_GCash_Rhon.jpg"
                                                            alt="GCash QR Rhon"
                                                            style={{ width: 300, height: 300, marginTop: 8 }}
                                                        />
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
                                                    <Button type="primary" icon={<UploadOutlined />} className="user-invoice-receipt-button">
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


                            {/* DOCUMENTS SECTION */}
                            <div style={{ marginBottom: 30 }}>
                                <h2 className="payment-methods-title payment-section-title">Travelers Information</h2>
                                <p className="payment-section-subtitle">
                                    Review and update traveler information as needed.
                                </p>
                            </div>
                            {travelersWithDocs.length === 0 && passportFiles.length === 0 && photoFiles.length === 0 ? (
                                <AntText type="secondary">No documents uploaded yet.</AntText>
                            ) : travelersWithDocs.length ? (
                                <div>
                                    {travelersWithDocs.map((traveler, index) => (
                                        <div key={index} style={{ marginBottom: 24 }}>
                                            {(() => {
                                                const needsResubmission = traveler?.documentsResubmissionRequired || resubmissionTravelerIndexes.includes(index);

                                                return (
                                                    <>
                                                        <h2 className="user-invoice-travler-header">
                                                            Traveler {index + 1}: {traveler?.firstName} {traveler?.lastName}
                                                        </h2>

                                                        <div style={{ marginBottom: 8 }}>
                                                            <AntText type="secondary">Please confirm the traveler's details below. Update any incorrect information before finalizing.</AntText>
                                                        </div>

                                                        <div className="user-invoice-traveler-section">
                                                            <h1 className="user-invoice-section-header">Traveler Information</h1>
                                                            <div className="user-invoice-traveler-info">
                                                                <div style={{ minWidth: 120 }}>
                                                                    <AntText type="secondary">Title</AntText>
                                                                    <div style={{ fontWeight: 600 }}>{traveler?.title || 'N/A'}</div>
                                                                </div>

                                                                <div style={{ minWidth: 120 }}>
                                                                    <AntText type="secondary">Room</AntText>
                                                                    <div>{traveler?.roomType || 'N/A'}</div>
                                                                </div>

                                                                <div style={{ minWidth: 120 }}>
                                                                    <AntText type="secondary">Birthday</AntText>
                                                                    <div>{traveler?.birthday ? dayjs(traveler.birthday).format('MMM D, YYYY') : 'N/A'}</div>
                                                                </div>

                                                                <div style={{ minWidth: 120 }}>
                                                                    <AntText type="secondary">Age</AntText>
                                                                    <div>{traveler?.age ?? 'N/A'}</div>
                                                                </div>

                                                                <div style={{ minWidth: 120 }}>
                                                                    <AntText type="secondary">Passenger Type</AntText>
                                                                    <div>{traveler?.ageCategory ?? 'N/A'}</div>
                                                                </div>

                                                                <div style={{ minWidth: 120 }}>
                                                                    <AntText type="secondary">Passport #</AntText>
                                                                    <div>{traveler?.passportNo || 'N/A'}</div>
                                                                </div>

                                                                <div style={{ minWidth: 120 }}>
                                                                    <AntText type="secondary">Expiry</AntText>
                                                                    <div>{traveler?.passportExpiry === 'N/A' ? 'N/A' : dayjs(traveler.passportExpiry).format('MMM D, YYYY')}</div>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: "flex", flexDirection: "row", gap: 50, flexWrap: "wrap", marginTop: 24 }}>
                                                                {(needsResubmission
                                                                    ? passportUploadLists[index]?.[0]?.preview || passportUploadLists[index]?.[0]?.thumbUrl
                                                                    : traveler?.passportFile) && (
                                                                        <div style={{ marginBottom: 16 }}>
                                                                            <h1 className="user-invoice-section-header">Passport / Valid ID</h1>
                                                                            <div>
                                                                                <a
                                                                                    href={needsResubmission
                                                                                        ? (passportUploadLists[index]?.[0]?.preview || passportUploadLists[index]?.[0]?.thumbUrl)
                                                                                        : traveler.passportFile}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    style={{ color: '#305797', textDecoration: 'underline', cursor: 'pointer' }}
                                                                                >
                                                                                    View Passport
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                {(needsResubmission
                                                                    ? photoUploadLists[index]?.[0]?.preview || photoUploadLists[index]?.[0]?.thumbUrl
                                                                    : traveler?.photoFile) && (
                                                                        <div style={{ marginBottom: 16 }}>
                                                                            <h1 className="user-invoice-section-header">2 X 2 PHOTO:</h1>
                                                                            <div>
                                                                                <a
                                                                                    href={needsResubmission
                                                                                        ? (photoUploadLists[index]?.[0]?.preview || photoUploadLists[index]?.[0]?.thumbUrl)
                                                                                        : traveler.photoFile}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    style={{ color: '#305797', textDecoration: 'underline', cursor: 'pointer' }}
                                                                                >
                                                                                    View Photo
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                            </div>
                                                            {needsResubmission && (
                                                                <div className="user-invoice-doc-actions">
                                                                    <Upload
                                                                        listType="picture"
                                                                        fileList={passportUploadLists[index] || []}
                                                                        beforeUpload={beforeDocumentUpload}
                                                                        onChange={(info) => handlePassportUploadChange(index, info)}
                                                                        accept="image/jpeg,image/png"
                                                                        maxCount={1}
                                                                    >
                                                                        <Button type="primary" className="user-invoice-form-button">
                                                                            Upload Passport/ID
                                                                        </Button>
                                                                    </Upload>
                                                                    <Upload
                                                                        listType="picture"
                                                                        fileList={photoUploadLists[index] || []}
                                                                        beforeUpload={beforeDocumentUpload}
                                                                        onChange={(info) => handlePhotoUploadChange(index, info)}
                                                                        accept="image/jpeg,image/png"
                                                                        maxCount={1}
                                                                    >
                                                                        <Button type="primary" className="user-invoice-form-button">
                                                                            Upload 2x2 Photo
                                                                        </Button>
                                                                    </Upload>
                                                                    <Button
                                                                        type="primary"
                                                                        className="user-invoice-form-button"
                                                                        onClick={() => handleSubmitTravelerResubmission(index)}
                                                                        loading={submittingTravelerIndex === index}
                                                                    >
                                                                        Submit Traveler {index + 1}
                                                                    </Button>
                                                                </div>
                                                            )}

                                                        </div>


                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: "flex", flexDirection: "row", gap: 40, flexWrap: "wrap" }}>
                                        {(documentsResubmissionRequired ? passportUploadLists.length > 0 : passportFiles.length > 0) && (
                                            <div style={{ marginBottom: 16 }}>
                                                <AntText strong>Passport Files:</AntText>
                                                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                                                    {(documentsResubmissionRequired
                                                        ? passportUploadLists.flatMap((list) => (list || []).map((file) => file.preview || file.thumbUrl))
                                                        : passportFiles)
                                                        .filter(Boolean)
                                                        .map((url, index) => (
                                                            <div key={index} style={{ marginBottom: 8 }}>
                                                                <a
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: '#305797', textDecoration: 'underline', cursor: 'pointer' }}
                                                                >
                                                                    View Passport {index + 1}
                                                                </a>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {(documentsResubmissionRequired ? photoUploadLists.length > 0 : photoFiles.length > 0) && (
                                            <div style={{ marginBottom: 16 }}>
                                                <AntText strong>Photo Files:</AntText>
                                                <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                                                    {(documentsResubmissionRequired
                                                        ? photoUploadLists.flatMap((list) => (list || []).map((file) => file.preview || file.thumbUrl))
                                                        : photoFiles)
                                                        .filter(Boolean)
                                                        .map((url, index) => (
                                                            <div key={index} style={{ marginBottom: 8 }}>
                                                                <a
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: '#305797', textDecoration: 'underline', cursor: 'pointer' }}
                                                                >
                                                                    View Photo {index + 1}
                                                                </a>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}


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
                                                flex: 1,
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
                                                className="user-invoice-form-button"
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
                </div >
            )}

        </ConfigProvider >
    );
}
