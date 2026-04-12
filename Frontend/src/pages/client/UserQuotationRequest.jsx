import React, { useEffect, useState } from "react";
import { Modal, message, Button, Input, Card, ConfigProvider, Spin, Tag } from "antd"
import { ArrowLeftOutlined } from "@ant-design/icons"
import { useNavigate, useLocation } from "react-router-dom";
import apiFetch from "../../config/fetchConfig";
import { useQuotationBooking } from "../../context/BookingQuotationContext";
import '../../style/client/userquotationrequest.css'

export default function UserQuotationRequest() {
    const [notes, setNotes] = useState("");
    const [quotation, setQuotation] = useState(null);
    const location = useLocation();
    const { quotationId } = location.state || {};
    const id = quotationId;
    const { setQuotationBookingData } = useQuotationBooking();

    const navigate = useNavigate();

    const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
    const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [signedPdfUrl, setSignedPdfUrl] = useState(null);

    const isDisabled =
        quotation?.status === "Pending" ||
        quotation?.status === "Revision Requested" ||
        quotation?.status === "Approved";


    useEffect(() => {
        const fetchQuotationDetails = async () => {
            setLoading(true);
            try {
                console.log("Calling API for quotation ID:", id);
                const response = await apiFetch.get(`/quotation/get-quotation/${id}`);
                const quotationData = response;

                console.log("Quotation data received from API:", quotationData);

                setQuotation({
                    packageName: quotationData.packageId.packageName || "N/A",
                    travelDetails: quotationData.travelDetails || {},
                    latestPdfRevision: quotationData.latestPdfRevision || null,
                    reference: quotationData.reference || "N/A",
                    status: quotationData.status || "N/A",
                    pdfUrl: quotationData.pdfUrl || null,
                    pdfRevisions: quotationData.pdfRevisions || [],
                    revisionComments: quotationData.revisionComments || []
                })
                // console.log("Fetched quotation details:", response.data);
            } catch (error) {
                console.error("Error fetching quotation details:", error);
                setNotes("Unable to load quotation details.");
            } finally {
                setLoading(false);
            }

        }
        fetchQuotationDetails();
    }, []);


    const handleAccept = (key) => {
        setIsAcceptModalOpen(false);
        try {
            const latestDetails = quotation?.latestPdfRevision?.travelDetails;
            const details = latestDetails || quotation?.travelDetails || {};
            const travelDateValue = details.travelDate || details.travelDates || details.date || null;
            const priceValue = details.pricePerPax || details.totalPrice || details.totalRate || 0;
            const travelersValue = details.travelers || 1;
            const hotelValue = details.preferredHotels || details.hotel || "";
            const airlineValue = details.preferredAirlines || details.airline || "";
            setQuotationBookingData(prev => ({
                ...prev,
                quotationId: id,
                packageName: quotation?.packageName,
                travelDate: travelDateValue,
                travelDatePrice: priceValue,
                travelersCount: travelersValue,
                travelers: Array.from({ length: travelersValue }, (_, index) => ({
                    id: index + 1
                })),
                hotelOptions: hotelValue ? [{ name: hotelValue }] : [],
                airlineOptions: airlineValue ? [{ name: airlineValue }] : [],
                inclusions: details.inclusions || [],
                exclusions: details.exclusions || [],
                itinerary: details.itinerary || {},
                images: details.images || []
            }));
            navigate("/quotation-booking-process");
        } catch (error) {
            message.error("Unable to accept quotation");
        }
    };

    const handleRevise = () => {
        if (notes === "" || notes.trim() === "" || notes.length > 50) {
            message.error("Please provide notes for revision.");
            return;
        }
        console.log("Revision requested with notes:", notes);
        setActionLoading(true);
        apiFetch.post(`quotation/${id}/request-revision`, {
            notes
        }).then(res => {
            message.success("Revision requested successfully.");
            setNotes("");
        }).catch(err => {
            console.error(err.data || err.message);
            message.error("Failed to request revision.");
        }).finally(() => {
            setActionLoading(false);
        });
    };


    useEffect(() => {
        const latestRevision = quotation?.pdfRevisions?.filter(rev => rev?.url).slice(-1)[0];
        if (latestRevision) {
            setSignedPdfUrl(latestRevision.url); // directly use the URL from DB
        } else {
            setSignedPdfUrl(null);
        }
    }, [quotation]);

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <Spin spinning={loading || actionLoading} tip={loading ? "Loading quotation..." : "Processing..."} size="large">
                {loading && !quotation ? (
                    <div style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "90vh", // fill most of the viewport
                        flexDirection: "column",
                    }}>
                        <Spin spinning={true} description="Loading quotation..." size="large">
                        </Spin>
                    </div>

                ) : (
                    quotation && (
                        <div style={{ padding: "20px" }}>
                            <Button
                                className="userquotationrequest-back-button"
                                style={{ marginBottom: "15px" }}
                                onClick={() => navigate("/user-package-quotation")}
                            >
                                <ArrowLeftOutlined />
                                Back
                            </Button>

                            {/* BOOKED OR COMPLETE STATUS */}
                            {quotation?.status && ['booked', 'complete', 'completed'].includes(quotation.status.toLowerCase()) ? (
                                <Card
                                    style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed' }}
                                    title={<Tag color="green">Quotation {quotation.status}</Tag>}
                                >
                                    <p style={{ margin: 0, fontSize: 14 }}>
                                        Your quotation is marked as {quotation.status.toLowerCase()}. If you need help, contact support.
                                    </p>
                                </Card>
                            ) : null}

                            {/* HEADER */}
                            <div className="quotation-card">
                                <div className="quotation-content">
                                    <h2 className="quotation-title">{quotation.packageName}</h2>
                                    <p className="quotation-details">
                                        <strong>Reference:</strong> {quotation.reference} <span className="divider">|</span>{" "}
                                        <strong>Status:</strong> <span className="status-badge">{quotation.status}</span>
                                    </p>
                                </div>
                            </div>


                            {/* QUOTATION PDF REVISIONS HISTORY */}
                            <div className="history-grid-container">
                                <Card title="Quotation Revision History" className="custom-history-card">
                                    {quotation.pdfRevisions?.filter((rev) => rev?.url)?.length === 0 ? (
                                        <p className="empty-state">No PDF revisions uploaded yet.</p>
                                    ) : (
                                        <div className="history-list">
                                            {quotation.pdfRevisions
                                                .filter((rev) => rev?.url)
                                                .map((rev, index) => (
                                                    <div key={index} className="history-item">
                                                        <div className="history-header">
                                                            <strong>Version {rev.version}</strong>
                                                            <span className="history-date">{new Date(rev.uploadedAt).toLocaleString()}</span>
                                                        </div>
                                                        <p className="history-uploader">Uploaded by {rev.uploaderName}</p>
                                                        <a href={rev.url} target="_blank" rel="noopener noreferrer" className="history-link">
                                                            View PDF Document
                                                        </a>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </Card>

                                <Card title="Revision Notes History" className="custom-history-card">
                                    {quotation.revisionComments.length === 0 ? (
                                        <p className="empty-state">No revision comments yet.</p>
                                    ) : (
                                        <div className="history-list">
                                            {quotation.revisionComments.map((comment, index) => (
                                                <div key={index} className="history-item">
                                                    <div className="history-header">
                                                        <strong>{comment.authorName}</strong>
                                                        <span className="history-role">{comment.role}</span>
                                                    </div>
                                                    <p className="history-comment">"{comment.comments}"</p>
                                                    <div className="history-date">{new Date(comment.createdAt).toLocaleString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            </div>

                            {/* PDF VIEWER */}
                            <div >
                                <h1>Latest Revision</h1>
                                <div style={{ border: "1px solid #ccc", height: "600px", marginBottom: "20px", position: "relative" }}>
                                    {signedPdfUrl ? (
                                        <>
                                            {pdfLoading && (
                                                <div style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    background: "rgba(255, 255, 255, 0.8)",
                                                    zIndex: 1
                                                }}>
                                                    <Spin spinning={true} description="Loading PDF..." />
                                                </div>
                                            )}
                                            <iframe
                                                src={signedPdfUrl}
                                                title="Quotation PDF"
                                                width="100%"
                                                height="100%"
                                                style={{ border: "none" }}
                                                onLoad={() => setPdfLoading(false)}
                                                onError={() => setPdfLoading(false)}
                                            />
                                        </>
                                    ) : (
                                        <p style={{ padding: 20 }}>No PDF uploaded yet.</p>
                                    )}
                                </div>
                            </div>


                            {/* INPUT REVISION REQUEST AND BUTTONS */}
                            {quotation?.status && ['booked', 'complete', 'completed'].includes(quotation.status.toLowerCase()) ? null : (
                                <div className="quotation-feedback-section">
                                    <div className="input-wrapper">
                                        <Input.TextArea
                                            maxLength={200}
                                            rows={4}
                                            placeholder="Kindly provide any notes for revision (max 200 characters). Please be as detailed as possible."
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="quotation-input-request"
                                            disabled={isDisabled}
                                        />

                                        <div className={`char-counter ${notes.length >= 200 ? 'limit' : ''}`}>
                                            {notes.length}/200
                                        </div>
                                    </div>

                                    <div className="buttons-container-userquotationrequest">
                                        <Button
                                            className="acceptbutton-userquotationrequest"
                                            onClick={() => setIsAcceptModalOpen(true)}
                                            disabled={isDisabled}
                                        >
                                            Accept Quotation
                                        </Button>
                                        <Button
                                            className="revisebutton-userquotationrequest"
                                            onClick={handleRevise}
                                            disabled={isDisabled || !notes.trim()}
                                        >
                                            Request Revision
                                        </Button>
                                    </div>
                                </div>
                            )}


                            {/* REVISION REQUEST MODAL */}
                            <Modal
                                className="userquotationrequest-revision-modal"
                                open={isRevisionModalOpen}
                                footer={null}
                                onCancel={() => setIsRevisionModalOpen(false)}
                            >
                                <div className="userquotationrequest-revision-container">
                                    <h2 className="userquotationrequest-revision-heading">Revision Requested</h2>
                                    <p className="userquotationrequest-revision-text">Your revision request has been submitted.</p>
                                    <div className="userquotationrequest-revision-actions">
                                        <Button className="userquotationrequest-revision-button" onClick={() => {
                                            setIsRevisionModalOpen(false)
                                        }}>
                                            Continue
                                        </Button>
                                    </div>
                                </div>
                            </Modal>

                            {/* ACCEPT QUOTATION MODAL */}
                            <Modal
                                className="userquotationrequest-accept-modal"
                                open={isAcceptModalOpen}
                                footer={null}
                                onCancel={() => setIsAcceptModalOpen(false)}
                                style={{ top: 200 }}
                            >
                                <div className="userquotationrequest-accept-container">
                                    <h2 className="userquotationrequest-accept-heading">Accepting Quotation</h2>
                                    <p className="userquotationrequest-accept-text">Are you sure you want to proceed with this quotation?</p>
                                    <div className="userquotationrequest-accept-actions">
                                        <Button className="userquotationrequest-accept-button" onClick={handleAccept}>
                                            Proceed
                                        </Button>

                                        <Button className="userquotationrequest-accept-button-cancel" onClick={() => {
                                            setIsAcceptModalOpen(false)
                                        }}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </Modal>

                        </div>
                    ))
                }
            </Spin>

        </ConfigProvider >
    );
}