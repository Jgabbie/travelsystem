import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, Spin, Descriptions, Upload, Button, message, ConfigProvider } from "antd";
import { UploadOutlined, SendOutlined } from "@ant-design/icons";
import axiosInstance from "../../config/axiosConfig";

export default function QuotationRequest() {
    const { id } = useParams(); // quotation ID from URL
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);

    useEffect(() => {
        const fetchQuotation = async () => {
            try {
                const response = await axiosInstance.get(`/quotation/get-quotation/${id}`);
                setQuotation(response.data);
            } catch (error) {
                console.error("Error fetching quotation:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchQuotation();
    }, [id]);

    if (loading)
        return <Spin size="large" style={{ margin: "50px auto", display: "block" }} />;

    if (!quotation) return <p>Quotation not found.</p>;

    const details = quotation.travelDetails || {};
    const itineraryNotes = details.itineraryNotes || [];

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

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div>
                <h1 style={{ margin: 20 }}>Initial Quotation Request</h1>
                <Card title={`Quotation Details - ${quotation.reference}`} style={{ margin: 20 }}>
                    <Descriptions bordered column={1}>
                        <Descriptions.Item label="Package Name">{quotation.packageName}</Descriptions.Item>
                        <Descriptions.Item label="Customer Name">{quotation.userName}</Descriptions.Item>
                        <Descriptions.Item label="Travelers">{details.travelers || "N/A"}</Descriptions.Item>
                        <Descriptions.Item label="Preferred Airlines">{details.preferredAirlines || "N/A"}</Descriptions.Item>
                        <Descriptions.Item label="Preferred Hotels">{details.preferredHotels || "N/A"}</Descriptions.Item>
                        <Descriptions.Item label="Budget Range">{details.budgetRange ? `₱${details.budgetRange.join(" - ")}` : "N/A"}</Descriptions.Item>
                        <Descriptions.Item label="Itinerary Notes">
                            {itineraryNotes.length === 0
                                ? "N/A"
                                : itineraryNotes.map((note, index) => (
                                    <div key={index}><strong>Day {index + 1}:</strong> {note}</div>
                                ))
                            }
                        </Descriptions.Item>
                        <Descriptions.Item label="Additional Comments">{details.additionalComments || "N/A"}</Descriptions.Item>
                        <Descriptions.Item label="Status">{quotation.status}</Descriptions.Item>
                    </Descriptions>
                </Card>

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
                    {quotation.pdfRevisions?.length === 0 ? (
                        <p>No PDF revisions uploaded yet.</p>
                    ) : (
                        quotation.pdfRevisions.map((rev, index) => (
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
            </div>
        </ConfigProvider>
    );
}
