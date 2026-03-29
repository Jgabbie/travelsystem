import React, { useEffect, useState } from "react";
import { Modal, message, Button, Input, Card, ConfigProvider, Spin } from "antd"
import { ArrowLeftOutlined } from "@ant-design/icons"
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../config/axiosConfig";
import { useBooking } from "../../context/BookingContext";
import '../../style/client/userquotationrequest.css'

export default function UserQuotationRequest() {
    const [notes, setNotes] = useState("");
    const [quotation, setQuotation] = useState(null);
    const { id } = useParams();
    const { setBookingData } = useBooking();

    const navigate = useNavigate();

    const [isBookingSuccessOpen, setIsBookingSuccessOpen] = useState(false);
    const [loading, setLoading] = useState(false);


    useEffect(() => {
        const fetchQuotationDetails = async () => {
            setLoading(true);
            try {
                console.log("Calling API for quotation ID:", id);
                const response = await axiosInstance.get(`/quotation/get-quotation/${id}`);
                const quotationData = response.data;

                console.log("Quotation data received from API:", quotationData);

                setQuotation({
                    packageName: quotationData.packageId.packageName || "N/A",
                    travelDetails: quotationData.travelDetails || {},
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


    const handleCheckout = async () => {
        if (!quotation) return;

        try {
            const tokenRes = await axiosInstance.post("/payment/create-checkout-token", {
                quotationId: id,
                travelers: quotation.travelDetails?.travelers || 1
            });
            const checkoutToken = tokenRes.data.token;

            const checkoutRes = await axiosInstance.post("/payment/create-checkout-session", {
                checkoutToken,
                totalPrice: 29000,
                packageName: quotation.packageName,
                successUrl: `${window.location.origin}/user-quotation-request/${id}?booking=success&checkoutToken=${checkoutToken}`,
                cancelUrl: `${window.location.origin}/user-quotation-request/${id}?booking=cancel`
            });

            const checkoutUrl = checkoutRes.data.data.attributes.checkout_url;
            window.location.href = checkoutUrl;
        } catch (err) {
            console.error(err.response?.data || err.message);
            message.error("Unable to proceed to payment");
        }
    };

    const handleAccept = (key) => {
        Modal.confirm({
            className: "accept-confirm-modal",
            icon: null,
            title: (
                <div className="accept-confirm-title" style={{ textAlign: "center" }}>
                    Confirm Accept
                </div>
            ),
            content: (
                <div className="accept-confirm-content" style={{ textAlign: "center" }}>
                    <p className="accept-confirm-text">Are you sure you want to accept this quotation? By accepting this quotation, you will be taken to the payment page.</p>
                </div>
            ),
            okText: "Accept",
            cancelText: "Cancel",
            okButtonProps: { className: "accept-confirm-btn" },
            cancelButtonProps: { className: "accept-cancel-btn" },
            onOk: async () => {
                try {
                    const details = quotation?.travelDetails || {};
                    setBookingData(prev => ({
                        ...prev,
                        packageName: quotation?.packageName,
                        travelDate: details.travelDate || details.date || null,
                        travelDatePrice: details.pricePerPax || details.totalPrice || 0,
                        travelersCount: details.travelers || 1,
                        travelers: Array.from({ length: details.travelers || 1 }, (_, index) => ({
                            id: index + 1
                        })),
                        hotelOptions: details.preferredHotels ? [{ name: details.preferredHotels }] : [],
                        airlineOptions: details.preferredAirlines ? [{ name: details.preferredAirlines }] : [],
                        inclusions: details.inclusions || [],
                        exclusions: details.exclusions || [],
                        itinerary: details.itinerary || {},
                        images: details.images || []
                    }));
                    navigate("/quotation-booking-process");
                } catch (error) {
                    message.error("Unable to accept quotation");
                }
            }
        });
    };

    const handleRevise = () => {
        if (notes === "" || notes.trim() === "" || notes.length > 50) {
            message.error("Please provide notes for revision.");
            return;
        }
        console.log("Revision requested with notes:", notes);
        axiosInstance.post(`/quotation/${id}/request-revision`, {
            notes
        }).then(res => {
            message.success("Revision requested successfully.");
            setNotes("");
        }).catch(err => {
            console.error(err.response?.data || err.message);
            message.error("Failed to request revision.");
        });
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
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
                            className="quotation-backbutton"
                            style={{ marginBottom: "15px" }}
                            onClick={() => navigate("/user-package-quotation")}
                        >
                            <ArrowLeftOutlined />
                            Back
                        </Button>
                        <div className="quotation-header-container">
                            <div>
                                <h2>{quotation.packageName}</h2>
                                <p>
                                    <strong>Reference:</strong> {quotation.reference} |{" "}
                                    <strong>Status:</strong> {quotation.status}
                                </p>
                            </div>
                        </div>


                        <div style={{ marginBottom: "20px" }}>
                            <Card title="Quotation Revision History">
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
                        </div>

                        <h1>Latest Revision</h1>
                        <div
                            style={{
                                border: "1px solid #ccc",
                                height: "600px",
                                marginBottom: "20px",
                            }}
                        >
                            {quotation.pdfRevisions && quotation.pdfRevisions.some((rev) => rev?.url) ? (
                                <iframe
                                    src={quotation.pdfRevisions.filter((rev) => rev?.url).slice(-1)[0].url}
                                    title="Quotation PDF"
                                    width="100%"
                                    height="100%"
                                    style={{ border: "none" }}
                                />
                            ) : (
                                <p style={{ padding: 20 }}>No PDF uploaded yet.</p>
                            )}
                        </div>

                        <Card title="Revision Notes History" style={{ marginBottom: 20 }}>
                            {quotation.revisionComments.length === 0 ? (
                                <p>No revision comments yet.</p>
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

                        <Input.TextArea
                            maxLength={200}
                            rows={3}
                            placeholder={`Kindly provide any notes for revision (max 200 characters). Please be detailed as possible.`}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="quotation-input-request"
                            disabled={quotation.status === "Revision Requested" || quotation.status === "Approved"}
                            required
                        />

                        <div className="buttons-container-userquotationrequest">
                            <Button
                                className="acceptbutton-userquotationrequest"
                                type="primary"
                                onClick={handleAccept}
                            >
                                Accept
                            </Button>
                            <Button
                                className="revisebutton-userquotationrequest"
                                onClick={handleRevise}
                                disabled={quotation.status === "Revision Requested" || quotation.status === "Approved"}
                            >
                                Request Revision
                            </Button>
                        </div>


                        {/* booking success modal */}
                        <Modal
                            className="package-wishlist-modal"
                            open={isBookingSuccessOpen}
                            footer={null}
                            onCancel={() => setIsBookingSuccessOpen(false)}
                        >
                            <h2 className="package-wishlist-title">Booking Successful</h2>
                            <p className="package-wishlist-text">Your booking has been confirmed.</p>
                            <div className="package-wishlist-actions">
                                <Button className="package-action-secondary" onClick={() => {
                                    setIsBookingSuccessOpen(false)
                                }}>
                                    OK
                                </Button>
                            </div>
                        </Modal>
                    </div>
                ))
            }

        </ConfigProvider >
    );
}