import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, Spin, Descriptions, Upload, Button, ConfigProvider, Tag, Input, Modal, notification } from "antd";
import { UploadOutlined, SendOutlined, ArrowLeftOutlined, ArrowRightOutlined, CheckCircleFilled } from "@ant-design/icons";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import dayjs from "dayjs";
import apiFetch from "../../config/fetchConfig";
import QuotationFormDetails from "../../components/quotationform/QuotationFormDetails";
import QuotationFormInEx from "../../components/quotationform/QuotationFormInEx";
import QuotationFormTermsConditions from "../../components/quotationform/QuotationFormTermsConditions";
import QuotationFormItineraries from "../../components/quotationform/QuotationFormItineraries";
import '../../style/components/mrcquotation.css';
import '../../style/admin/quotationrequest.css';



export default function QuotationRequest() {
    const location = useLocation();
    const navigate = useNavigate()
    const { quotationId } = location.state || {};
    const id = quotationId;

    const [quotation, setQuotation] = useState(null);
    const [adminName, setAdminName] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isQuotationSentModalOpen, setIsQuotationSentModalOpen] = useState(false);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const [previewStep, setPreviewStep] = useState(0);
    const pdfContainerRef = useRef(null);
    const [viewMode, setViewMode] = useState("form");

    const [formData, setFormData] = useState({
        roomType: '',
        travelDates: '',
        hotel: '',
        airline: '',
        inclusionsText: '',
        exclusionsText: '',
        itineraryRows: [],
        baggageAllowance: '',
        travelers: '',
        totalRate: '',
        totalChildRate: '0',
        totalInfantRate: '0',
        totalPrice: '',
        totalDeposit: '',
        flightImageA: '',
        flightImageB: ''
    });

    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        const fetchQuotation = async () => {
            setLoading(true);
            try {
                const response = await apiFetch.get(`/quotation/get-quotation/${id}`);
                setQuotation(response);
            } catch (error) {
                console.error("Error fetching quotation:", error);
            } finally {
                setLoading(false);
            }
        };

        const getAdminName = async () => {
            try {
                const response = await apiFetch.get(`/user/data`, { withCredentials: true })
                const adminNameFirstName = response.userData.firstname;
                const adminNameLastName = response.userData.lastname;
                const adminName = `${adminNameFirstName} ${adminNameLastName}`;

                setAdminName(adminName);
                // Do something with the admin name if needed
            } catch (error) {
                console.error("Error fetching admin name:", error);
            }
        };

        fetchQuotation();
        getAdminName();
    }, [id]);

    const formatDateValue = (value) => {
        const parsed = dayjs(value);
        if (!parsed.isValid()) {
            return value;
        }
        return parsed.format('MMM DD, YYYY');
    };

    const formatTravelDates = (value) => {
        if (!value) return 'N/A';

        if (Array.isArray(value)) {
            if (value.length === 2) {
                return `${formatDateValue(value[0])} - ${formatDateValue(value[1])}`;
            }
            return value.map((item) => formatDateValue(item)).join(', ');
        }

        if (typeof value === 'object') {
            const start = value.startDate || value.startdaterange || value.start;
            const end = value.endDate || value.enddaterange || value.end;
            if (start && end) {
                return `${formatDateValue(start)} - ${formatDateValue(end)}`;
            }
        }

        return formatDateValue(value);
    };

    const formatTravelers = (value) => {
        if (typeof value === 'number') return String(value);
        if (!value || typeof value !== 'object') return 'N/A';

        const adult = Number(value.adult) || 0;
        const child = Number(value.child) || 0;
        const infant = Number(value.infant) || 0;
        const parts = [];

        parts.push(`Adult: ${adult}`);
        if (child > 0) parts.push(`Child: ${child}`);
        if (infant > 0) parts.push(`Infant: ${infant}`);

        return parts.join(', ');
    };

    const parseTravelerCounts = (value) => {
        if (!value) return { adult: 0, child: 0, infant: 0, total: 0 };

        if (typeof value === 'number') {
            return { adult: value, child: 0, infant: 0, total: value };
        }

        if (typeof value === 'object') {
            const adult = Number(value.adult) || 0;
            const child = Number(value.child) || 0;
            const infant = Number(value.infant) || 0;
            return { adult, child, infant, total: adult + child + infant };
        }

        const raw = String(value).trim();
        if (!raw) return { adult: 0, child: 0, infant: 0, total: 0 };

        if (/^\d+$/.test(raw)) {
            const total = Number(raw) || 0;
            return { adult: total, child: 0, infant: 0, total };
        }

        const adultMatch = raw.match(/adult\s*:\s*(\d+)/i);
        const childMatch = raw.match(/child\s*:\s*(\d+)/i);
        const infantMatch = raw.match(/infant\s*:\s*(\d+)/i);
        const adult = adultMatch ? Number(adultMatch[1]) : 0;
        const child = childMatch ? Number(childMatch[1]) : 0;
        const infant = infantMatch ? Number(infantMatch[1]) : 0;

        return { adult, child, infant, total: adult + child + infant };
    };

    const calculateTotalPrice = (data) => {
        const totalRate = parseFloat(data.totalRate) || 0;
        const totalChildRate = parseFloat(data.totalChildRate) || 0;
        const totalInfantRate = parseFloat(data.totalInfantRate) || 0;
        const counts = parseTravelerCounts(data.travelers);

        return (totalRate * counts.adult)
            + (totalChildRate * counts.child)
            + (totalInfantRate * counts.infant);
    };

    const normalizeBullets = (value) => {
        if (!value) return '';
        return value
            .split('\n')
            .map((line) => {
                const trimmed = line.trim();
                if (!trimmed) return '';
                return trimmed.startsWith('-') || trimmed.startsWith('•')
                    ? trimmed
                    : `• ${trimmed}`;
            })
            .filter(Boolean)
            .join('\n');
    };

    const parseBulletLines = (value) =>
        String(value || '')
            .split('\n')
            .map((line) => line.replace(/^[-•]\s*/, '').trim())
            .filter(Boolean);

    const packageName = quotation?.packageId?.packageName || "N/A";
    const customerName = quotation?.userId?.username || "N/A";
    const hotel = quotation?.quotationDetails?.preferredHotels || "N/A";
    const airline = quotation?.quotationDetails?.preferredAirlines || "N/A";
    const travelDates = quotation?.quotationDetails?.preferredDates || quotation?.quotationDetails?.preferredDates || "N/A";
    const budgetRange = Array.isArray(quotation?.quotationDetails?.budgetRange)
        ? `₱${quotation.quotationDetails.budgetRange.join(" - ")}`
        : "N/A";
    const travelers = quotation?.quotationDetails?.travelers || "N/A";
    const inclusions = quotation?.packageId?.packageInclusions || [];
    const exclusions = quotation?.packageId?.packageExclusions || [];
    const itinerary = quotation?.packageId?.packageItineraries || {};
    const quotationReference = quotation?.reference || "N/A";
    const packageCategory = quotation?.quotationDetails?.packageCategory || quotation?.packageId?.packageType || "";

    const coordinatorName = adminName || "N/A";

    const quotationData = {
        packageName,
        customerName,
        hotel,
        airline,
        travelDates,
        travelers,
        inclusions,
        exclusions,
        itinerary,
        coordinatorName,
        packageCategory
    };

    const isBooked = quotation?.status?.toLowerCase() === 'booked';
    const details = quotation?.quotationDetails || {};
    const itineraryNotes = details.itineraryNotes || [];
    const flightDetails = details.flightDetails || {};

    useEffect(() => {
        if (!quotation) return;

        setFormData((prev) => {
            const next = { ...prev };

            if (!prev.travelDates?.trim()) {
                const formattedDates = formatTravelDates(travelDates);
                next.travelDates = formattedDates === 'N/A' ? '' : formattedDates;
            }

            if (!prev.hotel?.trim()) {
                next.hotel = hotel && hotel !== 'N/A' ? String(hotel) : '';
            }

            if (!prev.airline?.trim()) {
                next.airline = airline && airline !== 'N/A' ? String(airline) : '';
            }

            if (!prev.travelers?.trim()) {
                const formattedTravelers = formatTravelers(travelers);
                next.travelers = formattedTravelers === 'N/A' ? '' : formattedTravelers;
            }

            if (!prev.inclusionsText?.trim()) {
                next.inclusionsText = inclusions.length ? inclusions.map((item) => `• ${item}`).join('\n') : '';
            }

            if (!prev.exclusionsText?.trim()) {
                next.exclusionsText = exclusions.length ? exclusions.map((item) => `• ${item}`).join('\n') : '';
            }

            const tourDays = Math.max(1, Object.keys(itinerary || {}).length || itineraryNotes.length || 1);
            if (!Array.isArray(prev.itineraryRows) || prev.itineraryRows.length !== tourDays) {
                const nextRows = Array.from({ length: tourDays }, (_, index) => {
                    const key = Object.keys(itinerary || {})[index];
                    const items = key ? itinerary[key] : [];
                    const list = items.map((item) => {
                        if (typeof item === 'string') return item;
                        return item.activity;
                    });

                    return list.length ? list.map((item) => `• ${item}`).join('\n') : '';
                });
                next.itineraryRows = nextRows;
            }

            return next;
        });
    }, [quotation, travelDates, hotel, airline, inclusions, exclusions, itinerary, itineraryNotes]);

    useEffect(() => {
        const computed = calculateTotalPrice(formData);
        const computedValue = Number.isFinite(computed) ? String(computed) : '';
        if (computedValue && formData.totalPrice !== computedValue) {
            setFormData((prev) => ({ ...prev, totalPrice: computedValue }));
        }
    }, [formData.totalRate, formData.totalChildRate, formData.totalInfantRate, formData.travelers]);

    const [editableItinerary, setEditableItinerary] = useState(
        Object.entries(quotationData.itinerary || {}).map(([dayKey, activities], index) => ({
            day: dayKey || `Day ${index + 1}`,
            date: quotationData.itineraryDate || '',
            text: Array.isArray(activities) ? activities.map(item => {
                if (typeof item === 'string') return item;
                return item.activity || item.optionalActivity || item.item || '';
            }).join('\n') : '',
        }))
    );

    useEffect(() => {
        if (!quotation) return;

        const itineraryObj = quotation.packageId?.packageItineraries || {};
        const newEditableItinerary = Object.entries(itineraryObj).map(([dayKey, activities], index) => ({
            day: dayKey || `Day ${index + 1}`,
            date: quotation.quotationDetails?.itineraryDate || '',
            text: Array.isArray(activities)
                ? activities.map(item => (typeof item === 'string' ? item : item.activity || item.optionalActivity || item.item || '')).join('\n')
                : '',
        }));

        setEditableItinerary(newEditableItinerary);
    }, [quotation]);

    const previewItems = [
        {
            title: "Quotation Form Preview",
            content: <QuotationFormDetails
                quotationData={quotationData}
                formData={formData}
                setFormData={setFormData}
                formErrors={formErrors}
            />,
        },
        {
            title: "Quotation Inclusions & Itinerary",
            content: <QuotationFormInEx
                quotationData={quotationData}
                formData={formData}
                setFormData={setFormData}
                formErrors={formErrors}
                pdfMode={previewStep === 2}
            />,
        },
        {
            title: "Quotation Inclusions & Itinerary",
            content: <QuotationFormItineraries
                quotationData={quotationData}
                formData={formData}
                setFormData={setFormData}
                setEditableItinerary={setEditableItinerary}
                editableItinerary={editableItinerary}
                formErrors={formErrors}
                pdfMode={previewStep === 3}
            />,
        },
        {
            title: "Quotation Terms & Conditions",
            content: <QuotationFormTermsConditions
                quotationData={quotationData}
            />,
        },
    ];

    const validateForm = () => {
        const errors = {};
        const travelerCounts = parseTravelerCounts(formData.travelers);
        const isUploadMode = viewMode === "upload";
        const computedTotalPrice = calculateTotalPrice(formData);

        if (!formData.roomType.trim()) {
            errors.roomType = "Room/Type is required.";
        }

        if (!formData.travelDates.trim()) {
            errors.travelDates = "Travel dates are required.";
        }

        if (!formData.hotel.trim()) {
            errors.hotel = "Hotel is required.";
        }

        if (!formData.airline.trim()) {
            errors.airline = "Airline is required.";
        }

        if (!formData.totalRate.trim()) {
            errors.totalRate = "Total rate is required.";
        }

        if (travelerCounts.child > 0 && !formData.totalChildRate.trim()) {
            errors.totalChildRate = "Total child rate is required.";
        }

        if (travelerCounts.infant > 0 && !formData.totalInfantRate.trim()) {
            errors.totalInfantRate = "Total infant rate is required.";
        }

        if (!formData.totalPrice.trim()) {
            if (!(Number.isFinite(computedTotalPrice) && computedTotalPrice > 0)) {
                errors.totalPrice = "Total price is required.";
            }
        }

        if (!formData.travelers.trim()) {
            errors.travelers = "Travelers information is required.";
        }

        if (!formData.totalDeposit.trim()) {
            errors.totalDeposit = "Total deposit is required.";
        }

        if (isUploadMode) {
            if (!formData.inclusionsText.trim()) {
                errors.inclusionsText = "Inclusions are required.";
            }

            if (!formData.exclusionsText.trim()) {
                errors.exclusionsText = "Exclusions are required.";
            }

            if (!formData.itineraryRows.length || formData.itineraryRows.some((row) => !row.trim())) {
                errors.itineraryRows = "Itinerary for each day is required.";
            }
        }

        if (!isUploadMode) {
            if (!formData.flightImageA) {
                errors.flightImageA = "Flight image 1 is required.";
            }

            if (!formData.flightImageB) {
                errors.flightImageB = "Flight image 2 is required.";
            }
        }

        if (formData.dynamicRows && formData.dynamicRows.length > 0) {
            const rowErrors = formData.dynamicRows.map((row) => {
                const rowError = {};
                if (!row.label || !row.label.trim()) {
                    rowError.label = "Label is required.";
                }
                if (!row.value || !row.value.trim()) {
                    rowError.value = "Value is required.";
                }
                return rowError;
            });

            if (rowErrors.some((rowError) => Object.keys(rowError).length > 0)) {
                errors.dynamicRows = rowErrors;
            }
        }

        setFormErrors(errors);

        return Object.keys(errors).length === 0;
    };

    // When a file is selected
    const handleFileSelect = (file) => {
        if (file.type !== "application/pdf") {
            notification.error({ message: "Only PDF files are allowed.", placement: "topRight" });
            return Upload.LIST_IGNORE;
        }

        setSelectedFile(file);
        setPreviewURL(URL.createObjectURL(file));

        return Upload.LIST_IGNORE; // prevent default upload
    };

    // Upload when "Send" button is clicked
    const handleSend = async () => {
        const isValid = validateForm();
        if (!isValid) {
            notification.error({ message: "Please complete required fields.", placement: "topRight" });
            return;
        }

        if (!selectedFile) {
            notification.warning({ message: "Please select a PDF first.", placement: "topRight" });
            return;
        }

        const pdfFormData = new FormData();
        pdfFormData.append("pdf", selectedFile);

        setUploading(true);
        try {
            await apiFetch.post(`/quotation/${id}/upload-pdf`, pdfFormData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const computedTotalPrice = calculateTotalPrice(formData);
            const resolvedTotalPrice = formData.totalPrice?.trim()
                ? formData.totalPrice
                : String(computedTotalPrice);

            const itineraryRows = Array.isArray(formData.itineraryRows) ? formData.itineraryRows : [];
            const itineraryPayload = itineraryRows.reduce((acc, text, index) => {
                acc[`day${index + 1}`] = parseBulletLines(text);
                return acc;
            }, {});

            const travelDetails = {
                roomType: formData.roomType,
                travelDates: formData.travelDates,
                hotel: formData.hotel,
                airline: formData.airline,
                inclusions: parseBulletLines(formData.inclusionsText),
                exclusions: parseBulletLines(formData.exclusionsText),
                itinerary: itineraryPayload,
                dynamicRows: formData.dynamicRows,
                baggageAllowance: formData.baggageAllowance,
                travelers: travelers,
                totalRate: formData.totalRate,
                totalChildRate: formData.totalChildRate,
                totalInfantRate: formData.totalInfantRate,
                totalPrice: resolvedTotalPrice,
                totalDeposit: formData.totalDeposit
            };

            await apiFetch.put(`/quotation/${id}/upload-travel-details`, { travelDetails });

            notification.success({ message: `${selectedFile.name} uploaded successfully!`, placement: "topRight" });

            setFormData({
                roomType: '',
                travelDates: '',
                hotel: '',
                airline: '',
                inclusionsText: '',
                exclusionsText: '',
                itineraryRows: [],
                baggageAllowance: '',
                travelers: '',
                totalRate: '',
                totalChildRate: '0',
                totalInfantRate: '0',
                totalPrice: '',
                totalDeposit: '',
                flightImageA: '',
                flightImageB: ''
            });
            setIsQuotationSentModalOpen(true);
            setSelectedFile(null);
            setPreviewURL(null);
        } catch (error) {
            console.error("Upload error:", error);
            notification.error({ message: "Failed to upload PDF.", placement: "topRight" });
        } finally {
            setUploading(false);
        }
    };

    const generateAndUploadPdf = async () => {
        if (!pdfContainerRef.current) return;

        setUploading(true);

        try {
            const element = pdfContainerRef.current;
            const pages = element.querySelectorAll("[data-quotation-page]");

            const pdf = new jsPDF("p", "pt", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();

            for (let i = 0; i < pages.length; i += 1) {
                const pageEl = pages[i];
                const canvas = await html2canvas(pageEl, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                });
                const imgData = canvas.toDataURL("image/jpeg", 1.0);
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;

                if (i > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, imgHeight);
            }

            // SAVE AND UPLOAD PDF
            const pdfBlob = pdf.output("blob");
            const pdfFormData = new FormData();
            pdfFormData.append("pdf", pdfBlob, `quotation-${quotationReference}.pdf`);

            await apiFetch.post(`/quotation/${id}/upload-pdf`, pdfFormData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `quotation-${quotationReference}.pdf`;
            link.click();
            URL.revokeObjectURL(url);

            const computedTotalPrice = calculateTotalPrice(formData);
            const resolvedTotalPrice = formData.totalPrice?.trim()
                ? formData.totalPrice
                : String(computedTotalPrice);

            const travelDetails = {
                roomType: formData.roomType,
                travelDates: formData.travelDates,
                hotel: formData.hotel,
                airline: formData.airline,
                inclusions: formData.inclusions,
                exclusions: formData.exclusions,
                itinerary: formData.itinerary,
                dynamicRows: formData.dynamicRows,
                baggageAllowance: formData.baggageAllowance,
                travelers: quotation.quotationDetails.travelers,
                totalRate: formData.totalRate,
                totalChildRate: formData.totalChildRate,
                totalInfantRate: formData.totalInfantRate,
                totalPrice: resolvedTotalPrice,
                totalDeposit: formData.totalDeposit
            };

            if (!formData.totalPrice?.trim()) {
                setFormData((prev) => ({
                    ...prev,
                    totalPrice: resolvedTotalPrice
                }));
            }

            await apiFetch.put(`/quotation/${id}/upload-travel-details`, { travelDetails });

            setIsQuotationSentModalOpen(true);
            notification.success({ message: "Quotation has been sent successfully!", placement: "topRight" });
        } catch (err) {
            console.error(err);
            notification.error({ message: "Quotation did not send", placement: "topRight" });
        } finally {
            setUploading(false);
        }
    };

    const handleNextPreview = () => {
        if (previewStep === 0) {
            const isValid = validateForm();

            if (!isValid) {
                notification.error({ message: "Please complete required fields.", placement: "topRight" });
                return;
            }
        }

        setPreviewStep((prev) => Math.min(previewItems.length - 1, prev + 1));
    };


    //add rows in quotation form details
    if (!formData.dynamicRows) setFormData(prev => ({ ...prev, dynamicRows: [] }));

    const addPackageRow = () => {
        setFormData(prev => ({
            ...prev,
            dynamicRows: [...(prev.dynamicRows || []), { label: '', value: '' }]
        }));
    };

    const updateDynamicRow = (index, field, value) => {
        setFormData(prev => {
            const newRows = [...(prev.dynamicRows || [])];
            newRows[index][field] = value;
            return { ...prev, dynamicRows: newRows };
        });
    };



    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            {loading || !quotation ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
                    <Spin description={"Loading quotation..."} size="large" />
                </div>
            ) : (
                <div>
                    {uploading && (
                        <div className="booking-loading-overlay">
                            <Spin description={"Uploading quotation..."} size="large" />
                        </div>
                    )}

                    <Button onClick={() => navigate(-1)} style={{ marginBottom: 16, marginLeft: 20 }} type="primary" className="viewvisaapplication-back-button">
                        <ArrowLeftOutlined />
                        Back
                    </Button>
                    <h1 style={{ margin: 20 }}>Initial Quotation Request</h1>
                    {/* BOOKED OR COMPLETE STATUS */}
                    {quotation?.status && ['booked', 'complete', 'completed'].includes(quotation.status.toLowerCase()) ? (
                        <Card
                            style={{ margin: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed' }}
                            className={`quotationrequest-status-card${isBooked ? ' is-booked' : ''}`}
                            title={<Tag color="green">Quotation {quotation.status}</Tag>}
                        >
                            <p style={{ margin: 0, fontSize: 14 }}>
                                This quotation has been successfully booked.
                            </p>
                        </Card>
                    ) : null}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20, margin: 20 }}>
                        <Card
                            title={`Quotation Details - ${quotation.reference || "N/A"}`}
                            style={{ margin: 0 }}
                        >
                            <Descriptions bordered column={1}>
                                <Descriptions.Item label="Package Name">{packageName}</Descriptions.Item>
                                <Descriptions.Item label="Customer Name">{customerName}</Descriptions.Item>
                                <Descriptions.Item label="Travelers">
                                    {formatTravelers(travelers)}
                                </Descriptions.Item>
                                <Descriptions.Item label="Preferred Airlines">{airline || "N/A"}</Descriptions.Item>
                                <Descriptions.Item label="Preferred Hotels">{hotel || "N/A"}</Descriptions.Item>
                                <Descriptions.Item label="Preferred Date">{travelDates || "N/A"}</Descriptions.Item>
                                <Descriptions.Item label="Budget Range">{budgetRange}</Descriptions.Item>
                                <Descriptions.Item label="Itinerary Notes">
                                    {itineraryNotes.length === 0
                                        ? "N/A"
                                        : itineraryNotes.map((note, index) => (
                                            <div key={index}><strong>Day {index + 1}:</strong> {note}</div>
                                        ))
                                    }
                                </Descriptions.Item>
                                <Descriptions.Item label="Package Category">{details.packageCategory || "N/A"}</Descriptions.Item>
                                {["flightAirline", "flightDate", "flightTime"].map((key) => {
                                    const value = flightDetails[key];
                                    if (!value || value === "N/A") return null; // skip N/A or empty values

                                    // Convert key to readable label
                                    const label = key
                                        .replace(/([A-Z])/g, " $1") // add space before capital letters
                                        .replace(/^./, (str) => str.toUpperCase()); // capitalize first letter

                                    return (
                                        <Descriptions.Item key={key} label={label}>
                                            {value}
                                        </Descriptions.Item>
                                    );
                                })}
                                <Descriptions.Item label="Additional Comments">{details.additionalComments || "N/A"}</Descriptions.Item>
                                <Descriptions.Item label="Status">{quotation.status || "N/A"}</Descriptions.Item>
                            </Descriptions>
                        </Card>
                    </div>

                    {!isBooked && (
                        <div style={{ margin: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
                            <Card
                                hoverable
                                onClick={() => setViewMode("form")}
                                className={`quotationrequest-selection-card ${viewMode === "form" ? "selected" : ""}`}
                            >
                                <h3 style={{ margin: 0 }}>Quotation Form</h3>
                                <p style={{ marginTop: 8, color: "#6b7280" }}>Create and preview the quotation form.</p>
                            </Card>
                            <Card
                                hoverable
                                onClick={() => setViewMode("upload")}
                                className={`quotationrequest-selection-card ${viewMode === "upload" ? "selected" : ""}`}
                            >
                                <h3 style={{ margin: 0 }}>Upload Quotation</h3>
                                <p style={{ marginTop: 8, color: "#6b7280" }}>Upload a prepared quotation PDF.</p>
                            </Card>
                        </div>
                    )}


                    {viewMode === "form" && !isBooked && (
                        <Card title={previewItems[previewStep].title} style={{ margin: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                {previewStep > 0 ? (
                                    <Button
                                        className="quotationrequest-form-button"
                                        onClick={() => setPreviewStep((prev) => prev - 1)}
                                        style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
                                    >
                                        <ArrowLeftOutlined />
                                    </Button>
                                ) : (
                                    <div style={{ width: 48, height: 48, flexShrink: 0 }} />
                                )}

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {previewItems[previewStep].content}

                                    {previewStep === 0 && (
                                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 16 }}>
                                            <Button className="quotationrequest-form-button" type="primary" onClick={addPackageRow}>
                                                Add Row
                                            </Button>

                                            {formData.dynamicRows && formData.dynamicRows.length > 0 && (
                                                <Button
                                                    className="quotationrequest-formremove-button"
                                                    type="primary"
                                                    onClick={() =>
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            dynamicRows: prev.dynamicRows.slice(0, -1),
                                                        }))
                                                    }
                                                >
                                                    Remove Last Row
                                                </Button>
                                            )}
                                        </div>
                                    )}

                                    {previewStep === previewItems.length - 1 && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                            <Button className="quotationrequest-formgenerate-button" type="primary" onClick={generateAndUploadPdf} loading={uploading}>
                                                Generate & Upload PDF
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {previewStep < previewItems.length - 1 ? (
                                    <Button
                                        className="quotationrequest-form-button"
                                        type="primary"
                                        onClick={handleNextPreview}
                                        style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
                                    >
                                        <ArrowRightOutlined />
                                    </Button>
                                ) : (
                                    <div style={{ width: 48, height: 48, flexShrink: 0 }} />
                                )}
                            </div>
                        </Card>
                    )}

                    {viewMode === "form" && !isBooked && (
                        <div style={{
                            display: 'flex', gap: 16, alignItems: 'center'
                        }}>




                            <div
                                ref={pdfContainerRef}
                                style={{ position: "absolute", left: -9999, top: 0, width: 800 }}
                            >

                                <div className="pdf-content">
                                    <QuotationFormDetails
                                        quotationData={quotationData}
                                        formData={formData}
                                        setFormData={setFormData}
                                        formErrors={formErrors}
                                        dynamicRows={formData.dynamicRows}
                                        updateDynamicRow={updateDynamicRow}
                                    />
                                    <QuotationFormInEx
                                        quotationData={quotationData}
                                        formData={formData}
                                        setFormData={setFormData}
                                        formErrors={formErrors}
                                        pdfMode={true}
                                    />
                                    <QuotationFormItineraries
                                        quotationData={quotationData}
                                        editableItinerary={editableItinerary}
                                        setEditableItinerary={setEditableItinerary}
                                        formData={formData}
                                        setFormData={setFormData}
                                        formErrors={formErrors}
                                        pdfMode={true}
                                    />
                                    <QuotationFormTermsConditions quotationData={quotationData} />
                                </div>
                            </div>


                        </div>
                    )}

                    {viewMode === "upload" && !isBooked && (
                        <Card title="Upload Quotation PDF" style={{ margin: 20 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label className="quotationrequest-label">Travel Dates</label>
                                    <Input
                                        placeholder="Travel dates"
                                        value={formData.travelDates}
                                        disabled
                                        onChange={(e) => setFormData(prev => ({ ...prev, travelDates: e.target.value }))}
                                    />
                                    {formErrors.travelDates && <div className="quotationrequest-error">{formErrors.travelDates}</div>}
                                </div>
                                <div>
                                    <label className="quotationrequest-label">Hotel</label>
                                    <Input
                                        placeholder="Hotel"
                                        value={formData.hotel}
                                        onChange={(e) => setFormData(prev => ({ ...prev, hotel: e.target.value }))}
                                    />
                                    {formErrors.hotel && <div className="quotationrequest-error">{formErrors.hotel}</div>}
                                </div>
                                <div>
                                    <label className="quotationrequest-label">Room/Type</label>
                                    <Input
                                        placeholder="Room/Type"
                                        value={formData.roomType}
                                        onChange={(e) => setFormData(prev => ({ ...prev, roomType: e.target.value }))}
                                    />
                                    {formErrors.roomType && <div className="quotationrequest-error">{formErrors.roomType}</div>}
                                </div>
                                <div>
                                    <label className="quotationrequest-label">Airline</label>
                                    <Input
                                        placeholder="Airline"
                                        value={formData.airline}
                                        onChange={(e) => setFormData(prev => ({ ...prev, airline: e.target.value }))}
                                    />
                                    {formErrors.airline && <div className="quotationrequest-error">{formErrors.airline}</div>}
                                </div>
                                <div>
                                    <label className="quotationrequest-label">Baggage Allowance</label>
                                    <Input
                                        placeholder="Baggage allowance"
                                        value={formData.baggageAllowance}
                                        onChange={(e) => setFormData(prev => ({ ...prev, baggageAllowance: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="quotationrequest-label">Travelers</label>
                                    <Input
                                        placeholder="Travelers"
                                        value={formData.travelers}
                                        disabled
                                        onChange={(e) => setFormData(prev => ({ ...prev, travelers: e.target.value }))}
                                    />
                                    {formErrors.travelers && <div className="quotationrequest-error">{formErrors.travelers}</div>}
                                </div>
                                <div>
                                    <label className="quotationrequest-label">Total Rate per Adult</label>
                                    <Input
                                        placeholder="Total rate per adult"
                                        value={formData.totalRate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, totalRate: e.target.value.replace(/[^0-9.]/g, '') }))}
                                    />
                                    {formErrors.totalRate && <div className="quotationrequest-error">{formErrors.totalRate}</div>}
                                </div>
                                {parseTravelerCounts(formData.travelers).child > 0 && (
                                    <div>
                                        <label className="quotationrequest-label">Total Rate per Child</label>
                                        <Input
                                            placeholder="Total rate per child"
                                            value={formData.totalChildRate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, totalChildRate: e.target.value.replace(/[^0-9.]/g, '') }))}
                                        />
                                        {formErrors.totalChildRate && <div className="quotationrequest-error">{formErrors.totalChildRate}</div>}
                                    </div>
                                )}
                                {parseTravelerCounts(formData.travelers).infant > 0 && (
                                    <div>
                                        <label className="quotationrequest-label">Total Rate per Infant</label>
                                        <Input
                                            placeholder="Total rate per infant"
                                            value={formData.totalInfantRate}
                                            onChange={(e) => setFormData(prev => ({ ...prev, totalInfantRate: e.target.value.replace(/[^0-9.]/g, '') }))}
                                        />
                                        {formErrors.totalInfantRate && <div className="quotationrequest-error">{formErrors.totalInfantRate}</div>}
                                    </div>
                                )}
                                <div>
                                    <label className="quotationrequest-label">Total Price</label>
                                    <Input
                                        placeholder="Total price"
                                        value={formData.totalPrice}
                                        readOnly
                                    />
                                    {formErrors.totalPrice && <div className="quotationrequest-error">{formErrors.totalPrice}</div>}
                                </div>
                                <div>
                                    <label className="quotationrequest-label">Deposit Per PAX</label>
                                    <Input
                                        placeholder="Deposit"
                                        value={formData.totalDeposit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, totalDeposit: e.target.value.replace(/[^0-9.]/g, '') }))}
                                    />
                                    {formErrors.totalDeposit && <div className="quotationrequest-error">{formErrors.totalDeposit}</div>}
                                </div>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                                <div>
                                    <label className="quotationrequest-label">Inclusions</label>
                                    <Input.TextArea
                                        autoSize={{ minRows: 6, maxRows: 12 }}
                                        placeholder="Inclusions (one per line)"
                                        value={formData.inclusionsText}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            inclusionsText: e.target.value
                                        }))}
                                        onBlur={(e) => setFormData(prev => ({
                                            ...prev,
                                            inclusionsText: normalizeBullets(e.target.value)
                                        }))}
                                    />
                                    {formErrors.inclusionsText && <div className="quotationrequest-error">{formErrors.inclusionsText}</div>}
                                </div>
                                <div>
                                    <label className="quotationrequest-label">Exclusions</label>
                                    <Input.TextArea
                                        autoSize={{ minRows: 6, maxRows: 12 }}
                                        placeholder="Exclusions (one per line)"
                                        value={formData.exclusionsText}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            exclusionsText: e.target.value
                                        }))}
                                        onBlur={(e) => setFormData(prev => ({
                                            ...prev,
                                            exclusionsText: normalizeBullets(e.target.value)
                                        }))}
                                    />
                                    {formErrors.exclusionsText && <div className="quotationrequest-error">{formErrors.exclusionsText}</div>}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                                {(formData.itineraryRows || []).map((row, index) => (
                                    <div key={`itinerary-${index}`}>
                                        <label className="quotationrequest-label">Day {index + 1} Itinerary</label>
                                        <Input.TextArea
                                            autoSize={{ minRows: 6, maxRows: 12 }}
                                            placeholder={`Day ${index + 1} itinerary (one per line)`}
                                            value={row}
                                            onChange={(e) => {
                                                const nextRows = [...(formData.itineraryRows || [])];
                                                nextRows[index] = e.target.value;
                                                setFormData(prev => ({ ...prev, itineraryRows: nextRows }));
                                            }}
                                            onBlur={(e) => {
                                                const nextRows = [...(formData.itineraryRows || [])];
                                                nextRows[index] = normalizeBullets(e.target.value);
                                                setFormData(prev => ({ ...prev, itineraryRows: nextRows }));
                                            }}
                                        />
                                    </div>
                                ))}
                                {formErrors.itineraryRows && <div className="quotationrequest-error">{formErrors.itineraryRows}</div>}
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                                    <Button className="quotationrequest-form-button" type="primary" onClick={addPackageRow}>
                                        Add Row
                                    </Button>
                                    {formData.dynamicRows && formData.dynamicRows.length > 0 && (
                                        <Button
                                            className="quotationrequest-formremove-button"
                                            type="primary"
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    dynamicRows: prev.dynamicRows.slice(0, -1),
                                                }))
                                            }
                                        >
                                            Remove Last Row
                                        </Button>
                                    )}
                                </div>

                                {formData.dynamicRows && formData.dynamicRows.length > 0 && (
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        {formData.dynamicRows.map((row, index) => (
                                            <React.Fragment key={`upload-row-${index}`}>
                                                <div>
                                                    <Input
                                                        placeholder="Label"
                                                        value={row.label}
                                                        onChange={(e) => updateDynamicRow(index, 'label', e.target.value)}
                                                    />
                                                    {formErrors.dynamicRows?.[index]?.label && (
                                                        <div className="quotationrequest-error">{formErrors.dynamicRows[index].label}</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <Input
                                                        placeholder="Value"
                                                        value={row.value}
                                                        onChange={(e) => updateDynamicRow(index, 'value', e.target.value)}
                                                    />
                                                    {formErrors.dynamicRows?.[index]?.value && (
                                                        <div className="quotationrequest-error">{formErrors.dynamicRows[index].value}</div>
                                                    )}
                                                </div>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <Upload
                                name="pdf"
                                showUploadList={false}
                                allowedFileTypes={["application/pdf"]}
                                beforeUpload={handleFileSelect}
                            >
                                <Button icon={<UploadOutlined />} className="quotationrequest-upload-button" type="primary">
                                    Select PDF
                                </Button>
                            </Upload>

                            {previewURL && (
                                <div style={{ marginTop: 16 }}>
                                    <iframe
                                        src={previewURL}
                                        title="PDF Preview"
                                        width="100%"
                                        height="450px"
                                        style={{ border: "1px solid #ddd", borderRadius: 8 }}
                                    />

                                    <Button
                                        className="quotationrequest-sendquotation-button"
                                        type="primary"
                                        icon={<SendOutlined />}
                                        onClick={handleSend}
                                        loading={uploading}
                                        style={{ marginTop: 12 }}
                                    >
                                        Send Quotation
                                    </Button>
                                </div>
                            )}

                        </Card>
                    )}
                    <div flexDirection="column" gap={20} style={{ display: "flex", marginBottom: 20 }}>
                        <Card title="Quotation Revision History" style={{ margin: 20, width: 600 }}>
                            {quotation.pdfRevisions?.filter((rev) => rev?.url)?.length === 0 ? (
                                <p>No PDF revisions uploaded yet.</p>
                            ) : (
                                quotation.pdfRevisions
                                    .filter((rev) => rev?.url)
                                    .map((rev, index) => (
                                        <div key={index} style={{ marginBottom: "10px" }}>
                                            <p><strong>Version {rev.version}:</strong> Uploaded by {rev.uploaderName} on {new Date(rev.uploadedAt).toLocaleString()}</p>
                                            <Button
                                                href={rev.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="quotationrequest-viewpdf-button"
                                                type="primary"
                                            >
                                                View PDF
                                            </Button>
                                        </div>
                                    ))
                            )}
                        </Card>


                        <Card title="Revision Comments" style={{ margin: 20, width: 600 }}>
                            {quotation.revisionComments?.length === 0 ? (
                                <p>No revision comments.</p>
                            ) : (
                                quotation.revisionComments.map((comment, index) => (
                                    <div key={index} style={{ marginBottom: 15 }}>
                                        <strong>{comment.authorName}</strong> ({comment.role}) - {comment.comments}
                                        <br />
                                        <small>{new Date(comment.createdAt).toLocaleString()}</small>
                                    </div>
                                ))
                            )}
                        </Card>
                    </div>

                    {/* QUOTATION HAS BEEN SENT */}
                    <Modal
                        open={isQuotationSentModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        centered={true}
                        onCancel={() => {
                            setIsQuotationSentModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Quotation Sent Successfully!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                            </div>

                            <p className='signup-success-text'>The quotation has been sent.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsQuotationSentModalOpen(false);
                                        window.location.reload();
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>
                </div>
            )
            }
        </ConfigProvider >
    );
}
