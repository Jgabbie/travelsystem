import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, Spin, Descriptions, Upload, Button, message, ConfigProvider, Input } from "antd";
import { UploadOutlined, SendOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import dayjs from "dayjs";
import axiosInstance from "../../config/axiosConfig";
import QuotationFormDetails from "../../components/quotationform/QuotationFormDetails";
import QuotationFormInEx from "../../components/quotationform/QuotationFormInEx";
import QuotationFormTermsConditions from "../../components/quotationform/QuotationFormTermsConditions";
import QuotationFormItineraries from "../../components/quotationform/QuotationFormItineraries";
import '../../style/components/mrcquotation.css';


export default function QuotationRequest() {
    const location = useLocation();
    const { quotationId } = location.state || {};
    const id = quotationId;

    const [quotation, setQuotation] = useState(null);
    const [adminName, setAdminName] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const [previewStep, setPreviewStep] = useState(0);
    const pdfContainerRef = useRef(null);

    const [formData, setFormData] = useState({
        roomType: '',
        travelDates: '',
        hotel: '',
        airline: '',
        inclusions: [],
        exclusions: [],
        itinerary: {},
        baggageAllowance: '',
        travelers: '',
        totalRate: '',
        totalChildRate: '',
        totalInfantRate: '',
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
                const response = await axiosInstance.get(`/quotation/get-quotation/${id}`);
                console.log("Fetched quotation data:", response.data); // Debug log to check fetched data
                setQuotation(response.data);
            } catch (error) {
                console.error("Error fetching quotation:", error);
            } finally {
                setLoading(false);
            }
        };

        const getAdminName = async () => {
            try {
                const response = await axiosInstance.get(`/user/data`, { withCredentials: true })
                const adminNameFirstName = response.data.userData.firstname;
                const adminNameLastName = response.data.userData.lastname;
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

    const packageName = quotation?.packageId?.packageName || "N/A";
    const customerName = quotation?.userId?.username || "N/A";
    const hotel = quotation?.quotationDetails?.preferredHotels || "N/A";
    const airline = quotation?.quotationDetails?.preferredAirlines || "N/A";
    const travelDates = quotation?.quotationDetails?.preferredDates || quotation?.quotationDetails?.prefferedDate || "N/A";
    const budgetRange = Array.isArray(quotation?.quotationDetails?.budgetRange)
        ? `₱${quotation.quotationDetails.budgetRange.join(" - ")}`
        : "N/A";
    const travelers = quotation?.quotationDetails?.travelers || "N/A";
    const inclusions = quotation?.packageId?.packageInclusions || [];
    const exclusions = quotation?.packageId?.packageExclusions || [];
    const itinerary = quotation?.packageId?.packageItineraries || {};
    const quotationReference = quotation?.reference || "N/A";

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
        coordinatorName
    };

    console.log("Fetched quotation:", quotation);

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

            return next;
        });
    }, [quotation, travelDates, hotel, airline]);

    console.log("Constructed quotationData for form components:", quotationData); // Debug log to check constructed data

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

    if (!quotation) return <p>Quotation not found.</p>;

    const details = quotation.quotationDetails || {};
    const itineraryNotes = details.itineraryNotes || [];
    const flightDetails = details.flightDetails || {};
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

        if (!formData.baggageAllowance.trim()) {
            errors.baggageAllowance = "Baggage allowance is required.";
        }

        if (!formData.travelers.trim()) {
            errors.travelers = "Travelers information is required.";
        }


        if (!formData.totalRate.trim()) {
            errors.totalRate = "Total rate is required.";
        }

        if (!formData.totalChildRate.trim()) {
            errors.totalChildRate = "Total child rate is required.";
        }

        if (!formData.totalInfantRate.trim()) {
            errors.totalInfantRate = "Total infant rate is required.";
        }

        if (!formData.totalDeposit.trim()) {
            errors.totalDeposit = "Total deposit is required.";
        }

        if (!formData.flightImageA) {
            errors.flightImageA = "Flight image 1 is required.";
        }

        if (!formData.flightImageB) {
            errors.flightImageB = "Flight image 2 is required.";
        }

        setFormErrors(errors);

        return Object.keys(errors).length === 0;
    };

    // When a file is selected
    const handleFileSelect = (file) => {
        if (file.type !== "application/pdf") {
            message.error("Only PDF files are allowed.");
            return Upload.LIST_IGNORE;
        }

        setSelectedFile(file);
        setPreviewURL(URL.createObjectURL(file));

        return Upload.LIST_IGNORE; // prevent default upload
    };

    // Upload when "Send" button is clicked
    const handleSend = async () => {
        if (!selectedFile) {
            message.warning("Please select a PDF first.");
            return;
        }

        const formData = new FormData();
        formData.append("pdf", selectedFile);

        setUploading(true);
        try {
            await axiosInstance.post(`/quotation/${id}/upload-pdf`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            message.success(`${selectedFile.name} uploaded successfully!`);
            setSelectedFile(null);
            setPreviewURL(null);
        } catch (error) {
            console.error("Upload error:", error);
            message.error("Failed to upload PDF.");
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

            // Save or upload
            const pdfBlob = pdf.output("blob");
            const pdfFormData = new FormData();
            pdfFormData.append("pdf", pdfBlob, `quotation-${quotationReference}.pdf`);

            await axiosInstance.post(`/quotation/${id}/upload-pdf`, pdfFormData, {
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

            await axiosInstance.put(`/quotation/${id}/upload-travel-details`, { travelDetails });


            message.success("Quotation has been sent successfully!");
        } catch (err) {
            console.error(err);
            message.error("Quotation did not send");
        } finally {
            setUploading(false);
        }
    };

    const handleNextPreview = () => {
        if (previewStep === 0) {
            const isValid = validateForm();

            if (!isValid) {
                message.error("Please complete required fields.");
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
            <div>
                <Spin
                    spinning={loading || uploading}
                    tip={loading ? "Loading quotation..." : "Uploading..."}
                    size="large">
                    <div>
                        <h1 style={{ margin: 20 }}>Initial Quotation Request</h1>
                        <div style={{ display: "flex", flexDirection: "column", gap: 20, margin: 20 }}>
                            <Card
                                title={`Quotation Details - ${quotation.reference}`}
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
                                    <Descriptions.Item label="Status">{quotation.status}</Descriptions.Item>
                                </Descriptions>
                            </Card>

                            {/* <Card
                                title="Package Details"
                                style={{ margin: 0 }}
                            >
                                <Descriptions bordered column={1}>
                                    <Descriptions.Item label="Itineraries">
                                        {quotation.packageId?.packageItineraries ? (
                                            Object.entries(quotation.packageId.packageItineraries).map(
                                                ([day, activities], index) => (
                                                    <div key={index}>
                                                        <strong>{day.toUpperCase()}:</strong>
                                                        {(activities || []).map((act, i) => {
                                                            const { activity, optional } = getItineraryActivity(act);
                                                            return (
                                                                <div key={i} style={{ marginLeft: "10px", marginTop: 6 }}>
                                                                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                                                                        <span style={{ minWidth: 16 }}>&bull;</span>
                                                                        <span>{activity}</span>
                                                                    </div>
                                                                    {optional && (
                                                                        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                                                                            <span style={{ minWidth: 16 }} />
                                                                            <span>{optional}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            "N/A"
                                        )}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Inclusions">
                                        {quotation.packageId?.packageInclusions?.length > 0 ? (
                                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                {quotation.packageId.packageInclusions.map((inclusion, index) => (
                                                    <li key={index}>{formatPackageItem(inclusion)}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            "N/A"
                                        )}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Exclusions">
                                        {quotation.packageId?.packageExclusions?.length > 0 ? (
                                            <ul style={{ margin: 0, paddingLeft: 18 }}>
                                                {quotation.packageId.packageExclusions.map((exclusion, index) => (
                                                    <li key={index}>{formatPackageItem(exclusion)}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            "N/A"
                                        )}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card> */}
                        </div>

                        <Card title={previewItems[previewStep].title} style={{ margin: 20 }}>
                            {previewItems[previewStep].content}

                            {previewStep === 0 && (
                                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                                    <Button type="dashed" onClick={addPackageRow}>
                                        Add Row
                                    </Button>

                                    {formData.dynamicRows && formData.dynamicRows.length > 0 && (
                                        <Button
                                            type="default"
                                            danger
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    dynamicRows: prev.dynamicRows.slice(0, -1), // removes last row
                                                }))
                                            }
                                        >
                                            Remove Last Row
                                        </Button>
                                    )}
                                </div>
                            )}

                            <div
                                style={{
                                    marginTop: 16,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    minHeight: 40,
                                }}
                            >
                                <div>
                                    {previewStep > 0 && (
                                        <Button onClick={() => setPreviewStep((prev) => prev - 1)}>
                                            Previous
                                        </Button>
                                    )}
                                </div>

                                <div>
                                    {previewStep < previewItems.length - 1 && (
                                        <Button type="primary" onClick={handleNextPreview}>
                                            Next
                                        </Button>
                                    )}
                                    {previewStep === previewItems.length - 1 && (
                                        <Button type="primary" onClick={generateAndUploadPdf} loading={uploading}>
                                            Generate & Upload PDF
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </div>

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


                    <Card title="Upload Quotation PDF" style={{ margin: 20 }}>

                        <Upload
                            name="pdf"
                            showUploadList={false}
                            beforeUpload={handleFileSelect}
                        >
                            <Button icon={<UploadOutlined />}>
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

                    <Card title="Quotation Revision History" style={{ margin: 20 }}>
                        {quotation.pdfRevisions?.filter((rev) => rev?.url)?.length === 0 ? (
                            <p>No PDF revisions uploaded yet.</p>
                        ) : (
                            quotation.pdfRevisions
                                .filter((rev) => rev?.url)
                                .map((rev, index) => (
                                    <div key={index} style={{ marginBottom: "10px" }}>
                                        <p><strong>Version {rev.version}:</strong> Uploaded by {rev.uploaderName} on {new Date(rev.uploadedAt).toLocaleString()}</p>
                                        <a href={rev.url} target="_blank" rel="noopener noreferrer">View PDF</a>
                                    </div>
                                ))
                        )}
                    </Card>


                    <Card title="Revision Comments" style={{ margin: 20 }}>
                        {quotation.revisionComments.length === 0 ? (
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
                </Spin>
            </div>
        </ConfigProvider>
    );
}
