import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Spin, Descriptions, Upload, Button, message, ConfigProvider, Input } from "antd";
import { UploadOutlined, SendOutlined } from "@ant-design/icons";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import axiosInstance from "../../config/axiosConfig";
import QuotationFormDetails from "../../components/quotationform/QuotationFormDetails";
import QuotationFormInEx from "../../components/quotationform/QuotationFormInEx";
import QuotationFormTermsConditions from "../../components/quotationform/QuotationFormTermsConditions";

export default function QuotationRequest() {
    const { id } = useParams(); // quotation ID from URL
    const [quotation, setQuotation] = useState(null);
    const [adminName, setAdminName] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const [previewStep, setPreviewStep] = useState(0);
    const [autoUploaded, setAutoUploaded] = useState(false);
    const pdfContainerRef = useRef(null);

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
    const travelDates = quotation?.quotationDetails?.preferredDates || "N/A";
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
            />,
        },
        {
            title: "Quotation Inclusions & Itinerary",
            content: <QuotationFormInEx
                quotationData={quotationData}

            />,
        },
        {
            title: "Quotation Terms & Conditions",
            content: <QuotationFormTermsConditions
                quotationData={quotationData}
            />,
        },
    ];

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

        const pages = Array.from(pdfContainerRef.current.querySelectorAll("[data-quotation-page]"));
        if (!pages.length) return;

        setUploading(true);
        try {
            const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

            for (let i = 0; i < pages.length; i += 1) {
                const canvas = await html2canvas(pages[i], {
                    scale: 1,
                    useCORS: true,
                    backgroundColor: "#ffffff"
                });

                const imgData = canvas.toDataURL("image/jpeg", 1.0);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;
                const renderHeight = Math.min(imgHeight, pdfHeight);

                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, pdfWidth, pdfHeight, "F");
                pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, renderHeight);

                if (i < pages.length - 1) {
                    pdf.addPage();
                }
            }

            const pdfBlob = pdf.output("blob");
            const formData = new FormData();
            formData.append("pdf", pdfBlob, `quotation-${id}.pdf`);

            await axiosInstance.post(`/quotation/${id}/upload-pdf`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setAutoUploaded(true);
            message.success("Quotation PDF generated and uploaded.");
        } catch (error) {
            console.error("Auto upload error:", error);
            message.error("Failed to auto-upload PDF.");
        } finally {
            setUploading(false);
        }
    };

    const handleNextPreview = async () => {
        const nextStep = Math.min(previewItems.length - 1, previewStep + 1);

        if (nextStep === previewItems.length - 1 && !autoUploaded) {
            await generateAndUploadPdf();
        }

        setPreviewStep(nextStep);
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
                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", margin: 20 }}>
                            <Card
                                title={`Quotation Details - ${quotation.reference}`}
                                style={{ flex: "1 1 360px", margin: 0 }}
                            >
                                <Descriptions bordered column={1}>
                                    <Descriptions.Item label="Package Name">{packageName}</Descriptions.Item>
                                    <Descriptions.Item label="Customer Name">{customerName}</Descriptions.Item>
                                    <Descriptions.Item label="Travelers">{travelers || "N/A"}</Descriptions.Item>
                                    <Descriptions.Item label="Preferred Airlines">{airline || "N/A"}</Descriptions.Item>
                                    <Descriptions.Item label="Preferred Hotels">{hotel || "N/A"}</Descriptions.Item>
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
                                    <Descriptions.Item label="Flight Airline">{flightDetails.flightAirline || "N/A"}</Descriptions.Item>
                                    <Descriptions.Item label="Flight Date">{flightDetails.flightDate || "N/A"}</Descriptions.Item>
                                    <Descriptions.Item label="Flight Time">{flightDetails.flightTime || "N/A"}</Descriptions.Item>
                                    <Descriptions.Item label="Additional Comments">{details.additionalComments || "N/A"}</Descriptions.Item>
                                    <Descriptions.Item label="Status">{quotation.status}</Descriptions.Item>
                                </Descriptions>
                            </Card>

                            <Card
                                title="Package Details"
                                style={{ flex: "1 1 360px", margin: 0 }}
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
                            </Card>
                        </div>

                        <Card title="Quotation Input" style={{ margin: 20 }}>
                            <div>
                                <Input.TextArea placeholder="Enter quotation details..." rows={4} />
                                <Input placeholder="Bag in allowance" rows={4} style={{ marginTop: 10 }} />
                                <Upload>
                                    <Button icon={<UploadOutlined />} style={{ marginTop: 10 }}>
                                        Upload Ticket Images
                                    </Button>
                                </Upload>
                            </div>
                        </Card>


                        <Card title={previewItems[previewStep].title} style={{ margin: 20 }}>
                            {previewItems[previewStep].content}
                            <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
                                <Button
                                    onClick={() => setPreviewStep((prev) => Math.max(0, prev - 1))}
                                    disabled={previewStep === 0}
                                >
                                    Previous
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={handleNextPreview}
                                    disabled={previewStep === previewItems.length - 1}
                                >
                                    Next
                                </Button>
                            </div>
                        </Card>
                    </div>

                    <div
                        ref={pdfContainerRef}
                        style={{ position: "absolute", left: -9999, top: 0, width: 800 }}
                    >
                        <div data-quotation-page>
                            <QuotationFormDetails quotationData={quotationData} />
                        </div>
                        <div data-quotation-page>
                            <QuotationFormInEx quotationData={quotationData} />
                        </div>
                        <div data-quotation-page>
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
