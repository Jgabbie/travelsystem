import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Card, Spin, Descriptions, Upload, Button, message, ConfigProvider, Input } from "antd";
import { UploadOutlined, SendOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axiosInstance from "../../config/axiosConfig";
import QuotationFormDetails from "../../components/quotationform/QuotationFormDetails";
import QuotationFormInEx from "../../components/quotationform/QuotationFormInEx";
import QuotationFormTermsConditions from "../../components/quotationform/QuotationFormTermsConditions";
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
        baggageAllowance: '',
        totalRate: '',
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

    console.log("Fetched quotation:", quotation);

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

    const formatPackageItem = (item) => {
        if (typeof item === "string") return item;
        if (!item) return "N/A";
        return item.activity || item.optionalActivity || item.item || "N/A";
    };

    const getItineraryActivity = (item) => {
        if (typeof item === "string") {
            return { activity: item, optional: "" };
        }
        if (!item) {
            return { activity: "N/A", optional: "" };
        }

        const activity = item.activity || item.optionalActivity || item.item || "N/A";
        const optionalPrice = Number.isFinite(Number(item.optionalPrice))
            ? Number(item.optionalPrice).toLocaleString()
            : null;
        const optional = item.isOptional && item.optionalActivity
            ? `Optional: ${item.optionalActivity}${optionalPrice ? ` - ₱${optionalPrice}` : ""}`
            : "";

        return { activity, optional };
    };

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
                editableItinerary={editableItinerary}
                setEditableItinerary={setEditableItinerary}
                pdfMode={previewStep === 2}
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

        if (!formData.baggageAllowance.trim()) {
            errors.baggageAllowance = "Baggage allowance is required.";
        }

        if (!formData.totalRate.trim()) {
            errors.totalRate = "Total rate is required.";
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
            const formData = new FormData();
            formData.append("pdf", pdfBlob, `quotation-${id}.pdf`);

            await axiosInstance.post(`/quotation/${id}/upload-pdf`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const url = URL.createObjectURL(pdfBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `quotation-${id}.pdf`;
            link.click();
            URL.revokeObjectURL(url);

            message.success("PDF generated with auto page breaks!");
        } catch (err) {
            console.error(err);
            message.error("Failed to generate PDF");
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
                                    <Descriptions.Item label="Travelers">{travelers || "N/A"}</Descriptions.Item>
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
                                editableItinerary={editableItinerary}
                                setEditableItinerary={setEditableItinerary}
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
