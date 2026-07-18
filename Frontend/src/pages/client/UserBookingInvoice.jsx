import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Card, Col, ConfigProvider, Radio, Row, Space, Tag, Typography, notification, Steps, Form, Upload, Spin, Modal } from "antd";
import { ArrowLeftOutlined, ArrowRightOutlined, UploadOutlined, CheckCircleOutlined, DownloadOutlined } from "@ant-design/icons";
import { Page, Text, View, Document, StyleSheet, PDFViewer, Image, pdf } from "@react-pdf/renderer";
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


const { Text: AntText } = Typography;

//installment and payment logic
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

//function to convert image to base64
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

    const [notificationApi, notificationContextHolder] =
        notification.useNotification();

    const initialBooking = location.state?.booking || null;
    const [booking, setBooking] = useState(initialBooking);
    const [transactions, setTransactions] = useState([]);
    const bookingDetails = booking?.bookingDetails || {};
    const [method, setMethod] = useState(null);
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [fileList, setFileList] = useState([]);
    const [passportUploadLists, setPassportUploadLists] = useState([]);
    const [photoUploadLists, setPhotoUploadLists] = useState([]);
    const [visaUploadLists, setVisaUploadLists] = useState([]);

    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [invoiceDownloading, setInvoiceDownloading] = useState(false);
    const [submittingTravelerIndex, setSubmittingTravelerIndex] = useState(null);

    const [packageDetails, setPackageDetails] = useState(null);

    const documentsResubmissionRequired = Boolean(
        booking?.documentsResubmissionRequired
    );
    const reference = booking?.reference || booking?.ref || booking?._id || "--";
    const bookingId = booking?.bookingItem ?? booking?._id ?? booking?.id ?? booking?.bookingId ?? booking?.reference ?? booking?.ref ?? null;


    const bookingStatus = String(
        booking?.status ||
        booking?.bookingStatus ||
        bookingDetails?.status ||
        ""
    ).trim().toLowerCase();


    //fetch booking data
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

                // Fetch the package to determine whether a visa is required
                const packageIdentifier =
                    typeof fetchedBooking?.packageItem === "object"
                        ? fetchedBooking.packageItem?._id ||
                        fetchedBooking.packageItem?.packageItem
                        : fetchedBooking?.packageItem ||
                        fetchedBooking?.packageId ||
                        fetchedBooking?.packageCode;

                if (packageIdentifier) {
                    try {
                        const packageResponse = await apiFetch.get(
                            `/package/get-package/${packageIdentifier}`
                        );

                        setPackageDetails(packageResponse?.data || packageResponse || null);
                    } catch (packageError) {
                        console.error(
                            "Unable to fetch package visa requirement:",
                            packageError
                        );

                        setPackageDetails(null);
                    }
                }


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
                notificationApi.error({ title: "Failed to load booking details.", placement: 'topRight' });
                console.error("Primary fetch error:", err);
            } finally {

                setLoading(false);
            }
        };

        fetchAllData();
    }, [reference]);


    //payment status computation
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

    // Check the actual visa requirement configured for the package
    const rawVisaRequired =
        packageDetails?.visaRequired ??
        booking?.visaRequired ??
        bookingDetails?.visaRequired ??
        (
            typeof booking?.packageItem === "object"
                ? booking.packageItem?.visaRequired
                : undefined
        ) ??
        false;

    const requiresVisa =
        rawVisaRequired === true ||
        String(rawVisaRequired).toLowerCase() === "true" ||
        String(rawVisaRequired).toLowerCase() === "yes";



    //documents
    const travelersWithDocs = bookingDetails?.travelers?.length
        ? bookingDetails.travelers
        : booking?.travelers || []
    const passportFiles = booking.passportFiles || [];
    const photoFiles = booking.photoFiles || [];
    const visaFiles = booking.visaFiles || [];
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
        photoFiles,
        visaFiles
    ]);


    //register form
    const [form] = Form.useForm();
    const [captureForm] = Form.useForm();
    const pdfContainerRef = useRef(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


    //enhance file previews for uploaded documents
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


    //handle file uploads for passport, photo, and visa
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

    const handleVisaUploadChange = async (index, { fileList: newFileList }) => {
        const updated = await enhanceFilePreviews(newFileList);
        setVisaUploadLists((prev) => {
            const next = [...prev];
            next[index] = updated;
            return next;
        });
    };


    //file upload validation
    const beforeDocumentUpload = (file) => {
        const isImage = file.type === "image/jpeg" || file.type === "image/png";
        if (!isImage) {
            notificationApi.error({ title: "Invalid File Type", message: "Only JPG/PNG files are allowed", placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }

        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            notificationApi.error({ title: "File Too Large", message: "Image must be smaller than 2MB", placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }
        return false;
    };

    const beforeVisaUpload = (file) => {
        const isAllowed = file.type === "image/jpeg" || file.type === "image/png" || file.type === "application/pdf";
        if (!isAllowed) {
            notificationApi.error({ title: "Invalid File Type", message: "Only JPG/PNG/PDF files are allowed for visa.", placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }

        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            notificationApi.error({ title: "File Too Large", message: "File must be smaller than 2MB", placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }
        return false;
    };


    //handle traveler document uploads
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


    //handle traveler document resubmission
    const handleSubmitTravelerResubmission = async (index) => {
        if (!bookingId) {
            notificationApi.error({ title: "Booking ID not found.", placement: 'topRight' });
            return;
        }

        const passportList = passportUploadLists[index] || [];
        const photoList = photoUploadLists[index] || [];
        const visaList = visaUploadLists[index] || [];

        const hasDocumentToUpload =
            passportList.length > 0 ||
            photoList.length > 0 ||
            (requiresVisa && visaList.length > 0);

        if (!hasDocumentToUpload) {
            notificationApi.warning({
                title: "No Documents to Upload",
                message: requiresVisa
                    ? "Please upload passport/ID, 2x2 photo, or visa file."
                    : "Please upload passport/ID or 2x2 photo.",
                placement: "topRight"
            });

            return;
        }

        setSubmittingTravelerIndex(index);
        try {
            const [passportUrls, photoUrls, visaUrls] = await Promise.all([
                uploadBookingDocuments(passportList),
                uploadBookingDocuments(photoList),
                requiresVisa
                    ? uploadBookingDocuments(visaList)
                    : Promise.resolve([])
            ]);

            const updatedTravelers = (travelersWithDocs || []).map((traveler, travelerIndex) => {
                if (travelerIndex !== index) return traveler;
                return {
                    ...traveler,
                    documentsResubmissionRequired: false,
                    passportFile: passportUrls[0] || traveler?.passportFile || null,
                    photoFile: photoUrls[0] || traveler?.photoFile || null,
                    visaFile: visaUrls[0] || traveler?.visaFile || null
                };
            });

            const updatedPassportFiles = [...(passportFiles || [])];
            const updatedPhotoFiles = [...(photoFiles || [])];
            const updatedVisaFiles = [...(visaFiles || [])];
            if (passportUrls[0]) {
                updatedPassportFiles[index] = passportUrls[0];
            }
            if (photoUrls[0]) {
                updatedPhotoFiles[index] = photoUrls[0];
            }
            if (visaUrls[0]) {
                updatedVisaFiles[index] = visaUrls[0];
            }

            const response = await apiFetch.post(`/booking/${bookingId}/resubmit-documents`, {
                passportFiles: updatedPassportFiles,
                photoFiles: updatedPhotoFiles,
                visaFiles: updatedVisaFiles,
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
            setVisaUploadLists((prev) => {
                const next = [...prev];
                next[index] = [];
                return next;
            });
            notificationApi.success({ title: "Documents submitted successfully.", placement: 'topRight' });
        } catch (error) {
            notificationApi.error({ title: "Failed to submit documents.", message: error?.data?.message || "Unable to submit documents.", placement: 'topRight' });
        } finally {
            setSubmittingTravelerIndex(null);
        }
    };


    //go to next page
    const next = async () => {
        try {
            await form.validateFields();

            setCurrentStep(prev => prev + 1);
        } catch (error) {
            notificationApi.error({ title: "Required Fields Missing", message: "Please complete required fields.", placement: 'topRight' });
        }
    };

    //go to previous page
    const prev = () => setCurrentStep(currentStep - 1);


    //download booking registration pdf
    //download booking registration pdf
    const handleFinalSubmit = async () => {
        try {
            setDownloading(true);
            setIsGeneratingPdf(true);

            if (!pdfContainerRef.current) {
                throw new Error("PDF container not found");
            }

            const element = pdfContainerRef.current;
            const pages = element.querySelectorAll("[data-booking-page]");

            if (!pages.length) {
                throw new Error("No pages were captured in the PDF");
            }

            const pdf = new jsPDF("p", "pt", "a4");

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Fixed footer positioning
            const footerMarginX = 28;
            const footerTextY = pdfHeight - 18;
            const footerLineY = footerTextY - 11;

            // Prevent page content from overlapping the footer
            const maxContentHeight = footerLineY - 6;

            for (let i = 0; i < pages.length; i += 1) {
                const pageEl = pages[i];

                /*
                 * Hide the existing HTML footer during capture because
                 * the footer will be drawn directly through jsPDF.
                 */
                const htmlFooters = pageEl.querySelectorAll(
                    ".mrc-booking-invoice-footer"
                );

                const previousFooterVisibility = Array.from(htmlFooters).map(
                    (footer) => footer.style.visibility
                );

                htmlFooters.forEach((footer) => {
                    footer.style.visibility = "hidden";
                });

                let canvas;

                try {
                    canvas = await html2canvas(pageEl, {
                        scale: 2,
                        useCORS: true,
                        backgroundColor: "#ffffff"
                    });
                } finally {
                    // Restore footer visibility after capturing
                    htmlFooters.forEach((footer, footerIndex) => {
                        footer.style.visibility =
                            previousFooterVisibility[footerIndex];
                    });
                }

                if (i > 0) {
                    pdf.addPage();
                }

                /*
                 * Scale the captured page so that it fits inside the
                 * available space above the fixed PDF footer.
                 */
                const scale = Math.min(
                    pdfWidth / canvas.width,
                    maxContentHeight / canvas.height
                );

                const imgWidth = canvas.width * scale;
                const imgHeight = canvas.height * scale;
                const imgX = (pdfWidth - imgWidth) / 2;

                const imgData = canvas.toDataURL("image/jpeg", 1.0);

                pdf.addImage(
                    imgData,
                    "JPEG",
                    imgX,
                    0,
                    imgWidth,
                    imgHeight
                );

                // Footer separator line
                pdf.setDrawColor(210, 210, 210);
                pdf.setLineWidth(0.5);

                pdf.line(
                    footerMarginX,
                    footerLineY,
                    pdfWidth - footerMarginX,
                    footerLineY
                );

                // Footer text
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                pdf.setTextColor(85, 85, 85);

                pdf.text(
                    "M&RC Travel and Tours",
                    footerMarginX,
                    footerTextY
                );

                pdf.text(
                    `Page ${i + 1} of ${pages.length}`,
                    pdfWidth - footerMarginX,
                    footerTextY,
                    {
                        align: "right"
                    }
                );
            }

            const date = dayjs().format("YYYY-MM-DD");

            const pdfBlob = pdf.output("blob");
            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");

            link.href = url;
            link.download =
                `Booking_Registration_${reference}_${date}.pdf`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(url);

            notificationApi.success({
                title: "PDF Downloaded Successfully",
                message: "Booking Registration PDF downloaded successfully.",
                placement: "topRight"
            });
        } catch (err) {
            console.error("PDF generation error:", err);

            notificationApi.error({
                title: "Failed to download PDF",
                message:
                    "Failed to download PDF: " +
                    (err?.message || "Unknown error"),
                placement: "topRight"
            });
        } finally {
            setDownloading(false);
            setIsGeneratingPdf(false);
        }
    };


    //payment method selection
    const handleSelectPaymentMethod = (selectedMethod) => {
        setMethod(selectedMethod);
    };


    //disable payment button if there are pending transactions
    const disablePayment = useMemo(() => {
        if (!transactions || transactions.length === 0) return false; // No transactions yet
        return transactions[0].status === "Pending";
    }, [transactions]);


    //handle file upload for proof of payment
    const handleUploadChange = async ({ fileList: newFileList }) => {
        const file = newFileList[0];

        if (file && file.originFileObj) {
            file.preview = await getBase64(file.originFileObj);
        }

        setFileList(newFileList.slice(-1));
    };


    //validate proof of payment file upload
    const beforeUpload = (file) => {
        const isImage = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isImage) {
            notificationApi.error({ title: "Invalid File Type", message: 'Only JPG/PNG files are allowed', placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }

        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            notificationApi.error({ title: "File Size Exceeded", message: 'Image must be smaller than 2MB', placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }
        return false;
    };


    //handle booking and payment processing
    const proceedBooking = async () => {

        if (!method) {
            notificationApi.warning({ title: "No Payment Method Selected", message: "Please select a payment method.", placement: 'topRight' });
            return;
        }

        if (method === 'manual' && fileList.length === 0) {
            notificationApi.warning({ title: "Proof of Payment Required", message: "Please upload proof of payment.", placement: 'topRight' });
            return;
        }

        try {
            setLoading(true);

            if (method === 'manual') {
                const file = fileList?.[0]?.originFileObj;

                if (!file) {
                    notificationApi.error({ title: "Invalid File", message: "Invalid file.", placement: 'topRight' });
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
                    notificationApi.error({ title: "Image Upload Failed", placement: 'topRight' });
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


    //installment and payment logic
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


    //invoice document
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
                        <Text style={styles.invoiceTitleText}>Booking {invoice.invoice.number}</Text>
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
                        {persistedPenalty > 0 && (
                            <>
                                <View style={styles.totalBreakdownRow}>
                                    <Text style={styles.totalBreakdownLabel}>ORIGINAL PRICE</Text>
                                    <Text style={styles.totalBreakdownValue}>
                                        PHP {Number(totalPrice).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </Text>
                                </View>

                                <View style={styles.penaltyBreakdownRow}>
                                    <Text style={styles.penaltyBreakdownLabel}>
                                        LATE PAYMENT PENALTY
                                    </Text>

                                    <Text style={styles.penaltyBreakdownValue}>
                                        + PHP {Number(persistedPenalty).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </Text>
                                </View>
                            </>
                        )}

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


    //invoice document styles
    const styles = StyleSheet.create({
        page: {
            padding: 40,
            fontSize: 9,
            color: "#333",
            fontFamily: "Helvetica"
        },

        logo: {
            width: 80,
            height: 80
        },

        header: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 40
        },

        headerCompany: {
            flexDirection: "row",
            alignItems: "center",
            gap: 15
        },

        brand: {
            fontSize: 12,
            fontWeight: "bold"
        },
        muted: {
            color: "#555"
        },

        invoiceTitleContainer: {
            justifyContent: "center"
        },

        invoiceTitleText: {
            fontSize: 16,
            color: "#333"
        },

        divider: {
            height: 3,
            backgroundColor: "#374151",
            marginVertical: 5
        },

        billRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 18,
            alignItems: "flex-start"
        },

        billToSection: {
            flex: 1
        },

        label: {
            fontSize: 8,
            color: "#777",
            fontWeight: "bold",
            marginBottom: 4
        },

        customerName: {
            fontSize: 11,
            fontWeight: "bold",
            marginBottom: 2
        },

        summaryTable: {
            flexDirection: "row",
            border: "1pt solid #E5E7EB",
            flex: 1.5,
            marginLeft: 20
        },

        summaryCol: {
            flex: 1,
            padding: 8,
            alignItems: "center",
            justifyContent: "center"
        },

        summaryValue: {
            fontSize: 10,
            fontWeight: "bold"
        },

        darkBg: {
            backgroundColor: "#374151"
        },

        paidRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 12
        },

        table: {
            marginTop: 10
        },

        tableHeader: {
            flexDirection: "row",
            borderBottom: "1pt solid #333",
            paddingBottom: 5,
            marginBottom: 5
        },

        tableRow: {
            flexDirection: "row",
            paddingVertical: 8,
            borderBottom: "0.5pt solid #E5E7EB"
        },

        cell: {
            fontSize: 8
        },

        footerSection: {
            marginTop: 30,
            flexDirection: "row",
            justifyContent: "space-between"
        },

        bankInfo: {
            flex: 2
        },

        totalDueContainer: {
            flex: 1,
            alignItems: "flex-end"
        },

        totalDueRow: {
            flexDirection: "row",
            borderTop: "1pt solid #333",
            borderBottom: "1pt solid #333",
            paddingVertical: 10,
            width: "100%",
            justifyContent: "space-between",
            marginBottom: 10
        },

        totalDueLabel: {
            fontSize: 10,
            fontWeight: "bold"
        },

        totalDueValue: {
            fontSize: 10,
            fontWeight: "bold"
        },

        thankYou: {
            fontSize: 9,
            fontWeight: "bold",
            color: "#555"
        },

        totalBreakdownRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            width: "100%",
            paddingVertical: 5
        },

        totalBreakdownLabel: {
            fontSize: 8,
            color: "#555"
        },

        totalBreakdownValue: {
            fontSize: 8,
            color: "#555"
        },

        penaltyBreakdownRow: {
            flexDirection: "row",
            justifyContent: "space-between",
            width: "100%",
            paddingVertical: 6,
            paddingHorizontal: 5,
            marginBottom: 6,
            backgroundColor: "#FFF7E6",
            borderLeft: "2pt solid #D97706"
        },

        penaltyBreakdownLabel: {
            fontSize: 8,
            fontWeight: "bold",
            color: "#AD4E00"
        },

        penaltyBreakdownValue: {
            fontSize: 8,
            fontWeight: "bold",
            color: "#B91C1C"
        },
    });


    const handleDownloadBookingInvoice = async () => {
        try {
            setInvoiceDownloading(true);

            const invoiceBlob = await pdf(<MyDocument />).toBlob();
            const invoiceUrl = URL.createObjectURL(invoiceBlob);
            const link = document.createElement("a");
            const date = dayjs().format("YYYY-MM-DD");

            link.href = invoiceUrl;
            link.download = `Booking_Invoice_${reference}_${date}.pdf`;

            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(invoiceUrl);

            notificationApi.success({ title: "Booking Invoice Downloaded", message: "Booking invoice downloaded successfully.", placement: "topRight" });
        } catch (error) {
            console.error("Booking invoice download error:", error);

            notificationApi.error({
                title: "Failed to download the booking invoice.",
                placement: "topRight"
            });
        } finally {
            setInvoiceDownloading(false);
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
            {notificationContextHolder}
            {loading ? (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "75vh"
                    }}
                >
                    <Spin
                        description="Loading Booking Details..."
                        size="large"
                    />
                </div>
            ) : (
                <div
                    className="user-invoice-container"
                    style={{ position: "relative" }}
                >
                    {downloading && (
                        <div
                            style={{
                                position: "fixed",
                                inset: 0,
                                zIndex: 9999,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "rgba(255, 255, 255, 0.82)",
                                width: "100vw",
                                height: "100vh"
                            }}
                        >
                            <Spin
                                description="Downloading Registration Form..."
                                size="large"
                            />
                        </div>
                    )}
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

                        {bookingStatus === "cancellation requested" && (
                            <div
                                style={{
                                    marginBottom: 24,
                                    borderLeft: "4px solid #faad14",
                                    backgroundColor: "#fffbe6",
                                    padding: 16,
                                    paddingBottom: 40,
                                    paddingTop: 40,
                                    borderRadius: 8
                                }}
                            >
                                <h2
                                    style={{
                                        marginBottom: 10,
                                        fontSize: 20,
                                        fontWeight: 600,
                                        color: "#d48806"
                                    }}
                                >
                                    CANCELLATION REQUESTED
                                </h2>

                                <p style={{ margin: 0, fontSize: 14 }}>
                                    Your cancellation request has been submitted and is currently under
                                    review. Kindly wait for further updates regarding your booking.
                                </p>
                            </div>
                        )}

                        {bookingStatus === "cancelled" && (
                            <div
                                style={{
                                    marginBottom: 24,
                                    borderLeft: "4px solid #ff4d4f",
                                    backgroundColor: "#fff1f0",
                                    padding: 16,
                                    paddingBottom: 40,
                                    paddingTop: 40,
                                    borderRadius: 8
                                }}
                            >
                                <h2
                                    style={{
                                        marginBottom: 10,
                                        fontSize: 20,
                                        fontWeight: 600,
                                        color: "#cf1322"
                                    }}
                                >
                                    BOOKING CANCELLED
                                </h2>

                                <p style={{ margin: 0, fontSize: 14 }}>
                                    This booking has been cancelled. Payment and refund updates, when
                                    applicable, will be provided through your booking details.
                                </p>
                            </div>
                        )}

                        <Card className="user-invoice-card" style={{ marginBottom: 40 }}>
                            <div className="user-invoice-meta">
                                <div className="user-invoice-meta-item">
                                    <h1 className="user-invoice-label">Reference</h1>
                                    <div className="user-invoice-value">{reference}</div>
                                </div>
                                <div className="user-invoice-meta-item">
                                    <h1 className="user-invoice-label">Package</h1>
                                    <div className="user-invoice-value">{packageName}</div>
                                </div>
                                <div className="user-invoice-meta-item">
                                    <h1 className="user-invoice-label">Travel Date</h1>
                                    <div className="user-invoice-value">{travelDate}</div>
                                </div>
                            </div>

                            <Row gutter={[16, 16]} className="user-invoice-summary">
                                <Col xs={24} md={8}>
                                    <Card
                                        className={`user-invoice-stat ${persistedPenalty > 0 ? "user-invoice-penalty-stat" : ""
                                            }`}
                                        variant={false}
                                        style={{ paddingBottom: 30 }}
                                    >
                                        <h1 className="user-invoice-label">Total Price</h1>

                                        {persistedPenalty > 0 && (
                                            <div className="user-invoice-price-breakdown">
                                                <div className="user-invoice-price-row">
                                                    <span>Original Price</span>
                                                    <strong>
                                                        {Number(totalPrice).toLocaleString("en-PH", {
                                                            style: "currency",
                                                            currency: "PHP",
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </strong>
                                                </div>

                                                <div className="user-invoice-penalty-row">
                                                    <span>Late Payment Penalty</span>
                                                    <strong>
                                                        +{Number(persistedPenalty).toLocaleString("en-PH", {
                                                            style: "currency",
                                                            currency: "PHP",
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </strong>
                                                </div>
                                            </div>
                                        )}

                                        <div className="user-invoice-amount">
                                            {Number(totalPriceWithPenalty).toLocaleString("en-PH", {
                                                style: "currency",
                                                currency: "PHP",
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </div>

                                        {persistedPenalty > 0 && (
                                            <div className="user-invoice-penalty-added-label">
                                                ₱200 penalty included in total
                                            </div>
                                        )}
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card className="user-invoice-stat" variant={false} style={{ paddingBottom: 30 }}>
                                        <h1 className="user-invoice-label">Paid Amount</h1>
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
                                        <Space orientation="vertical" size={1}>
                                            <h1 className="user-invoice-label">Remaining Balance</h1>
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
                                <div style={{ marginBottom: 24, marginTop: 24, borderLeft: '4px solid #00bf63', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8, fontFamily: 'Montserrat, sans-serif' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CheckCircleOutlined style={{ color: '#00bf63', fontSize: 26, lineHeight: 1 }} />
                                        </span>
                                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#00bf63', lineHeight: 1.1 }}>YOU CAN NOW SUBMIT A REVIEW FOR THIS PACKAGE</h2>
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
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    marginBottom: 12
                                                }}
                                            >
                                                <Button
                                                    type="primary"
                                                    className="user-invoice-form-button"
                                                    icon={<DownloadOutlined />}
                                                    onClick={handleDownloadBookingInvoice}
                                                    loading={invoiceDownloading}
                                                >
                                                    Download Invoice
                                                </Button>
                                            </div>

                                            <PDFViewer style={{ width: "100%", height: 727 }}>
                                                <MyDocument />
                                            </PDFViewer>
                                        </div>

                                    </div>
                                </div>

                                <div className="user-invoice-column" style={{ marginTop: 10 }}>
                                    <h2 className="user-invoice-heading">Transaction History</h2>
                                    <div style={{
                                        backgroundColor: '#f7f9ff',
                                        border: '2px solid rgba(48, 87, 151, 0.2)',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        marginBottom: '16px',
                                        fontSize: '13px',
                                    }}>
                                        <p className="user-invoice-note-text" style={{ margin: 0 }}>
                                            <strong>Note:</strong> Using a Paymongo gateway has a convenience fee of 3.5% and ₱15.
                                        </p>
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
                                                            <div className="user-invoice-transactiontext"><strong>Date:</strong> {dayjs(txn.createdAt).format("MMM D, YYYY")}</div>
                                                            <div className="user-invoice-transactiontext"><strong>Method:</strong> {txn.method || "N/A"}</div>
                                                        </Col>
                                                        <Col style={{ textAlign: "right" }}>
                                                            <div className="user-invoice-transactiontext"><strong>
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
                                <div className="user-invoice-payment-methods-container" style={{ marginTop: 24, maxWidth: 1300 }}>
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
                                                <div className="payment-amount-to-pay">
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
                                                        <span className="bank-name">GCASH</span>
                                                        <span className="account-number">09690554806</span>
                                                        <span className="account-holder">MA****R C.</span>
                                                        <img
                                                            src="/images/QRCode_GCash_Maricar.jpg"
                                                            alt="GCash QR Maricar"
                                                            style={{ width: 300, height: 'auto', marginTop: 8 }}
                                                        />
                                                    </div>
                                                    <div className="bank-item">
                                                        <span className="bank-name">GCASH</span>
                                                        <span className="account-number">09688880405</span>
                                                        <span className="account-holder">RH*N C.</span>
                                                        <img
                                                            src="/images/QRCode_GCash_Rhon.jpg"
                                                            alt="GCash QR Rhon"
                                                            style={{ width: 300, height: 'auto', marginTop: 8 }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="bank-item-noqr">
                                                    <span className="bank-name">BDO</span>
                                                    <span className="account-number">006838032692</span>
                                                    <span className="account-holder">M&RC TRAVEL AND TOURS</span>
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
                                <h2 className="user-invoice-booking-form-stepper-title">Travelers Information</h2>
                                <p className="user-invoice-booking-form-stepper-text">
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
                                                            <p className="user-invoice-travler-secondary" >Please confirm the traveler's details below. Update any incorrect information before finalizing.</p>
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
                                                                                    className="user-invoice-file-link"
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
                                                                                    className="user-invoice-file-link"
                                                                                >
                                                                                    View Photo
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                {traveler?.visaFile && (
                                                                    <div style={{ marginBottom: 16 }}>
                                                                        <h1 className="user-invoice-section-header">Visa File</h1>
                                                                        <div>
                                                                            <a
                                                                                href={traveler.visaFile}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="user-invoice-file-link"
                                                                            >
                                                                                View Visa
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
                                                                    {requiresVisa && (
                                                                        <Upload
                                                                            listType="picture"
                                                                            fileList={visaUploadLists[index] || []}
                                                                            beforeUpload={beforeVisaUpload}
                                                                            onChange={(info) => handleVisaUploadChange(index, info)}
                                                                            accept="image/jpeg,image/png,application/pdf"
                                                                            maxCount={1}
                                                                        >
                                                                            <Button
                                                                                type="primary"
                                                                                className="user-invoice-form-button"
                                                                            >
                                                                                Upload Visa File
                                                                            </Button>
                                                                        </Upload>
                                                                    )}
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
                                    <div
                                        ref={pdfContainerRef}
                                        className="pdf-capture pdf-generating"
                                        aria-hidden="true"
                                        style={{
                                            position: "fixed",
                                            left: "-10000px",
                                            top: 0,
                                            width: "850px",
                                            pointerEvents: "none",
                                            zIndex: -9999
                                        }}
                                    >
                                        <div data-booking-page>
                                            <BookingRegistrationTravelersInvoice
                                                form={captureForm}
                                                summaryInvoice={summaryInvoice}
                                                totalCount={
                                                    bookingDetails?.travelerCounts?.total || 1
                                                }
                                            />
                                        </div>

                                        <div data-booking-page>
                                            <BookingRegistrationDietInvoice
                                                form={captureForm}
                                                summaryInvoice={summaryInvoice}
                                            />
                                        </div>

                                        <div data-booking-page>
                                            <BookingRegistrationTermsInvoicePart1
                                                form={captureForm}
                                                summaryInvoice={summaryInvoice}
                                            />
                                        </div>

                                        <div data-booking-page>
                                            <BookingRegistrationTermsInvoicePart2
                                                form={captureForm}
                                                summaryInvoice={summaryInvoice}
                                            />
                                        </div>
                                    </div>


                                    <div style={{ marginBottom: 30 }}>
                                        <h2 className="user-invoice-booking-form-stepper-title">Booking Registration</h2>
                                        <p className="user-invoice-booking-form-stepper-text" >
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
                                        className="steps-text"
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
                                            style={{
                                                flex: 1,
                                                position: "relative",
                                                overflow: "visible",
                                                backgroundColor: "#ffffff",
                                                padding: "20px",
                                                borderRadius: "8px"
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
            )
            }

        </ConfigProvider >
    );
}
