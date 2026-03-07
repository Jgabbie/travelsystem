import React, { useEffect, useState, useRef } from "react";
import { Modal, message, Button, Input, Card, ConfigProvider } from "antd"
import { useLocation, useNavigate, useParams } from "react-router-dom";
import BookingRegistrationModal from "../../components/modals/BookingRegistrationModal";
import DisplayInvoiceModal from "../../components/modals/DisplayInvoiceModal";
import PaymentMethodsModal from "../../components/modals/PaymentMethodsModal";
import axiosInstance from "../../config/axiosConfig";
import '../../style/client/userquotationrequest.css'



export default function UserQuotationRequest() {
    const [notes, setNotes] = useState("");
    const [quotation, setQuotation] = useState(null);
    const { id } = useParams();
    const fetchCalled = useRef(false);

    const navigate = useNavigate();
    const location = useLocation();

    const [isBookingSuccessOpen, setIsBookingSuccessOpen] = useState(false);
    const [isBookingRegistrationOpen, setIsBookingRegistrationOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false);
    // console.log("Quotation ID from URL:", id);

    useEffect(() => {
        const fetchQuotationDetails = async () => {
            try {
                const response = await axiosInstance.get(`/quotation/get-quotation/${id}`);
                const quotationData = response.data;
                setQuotation({
                    packageName: quotationData.packageName,
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
            }
        }
        fetchQuotationDetails();
    }, []);


    useEffect(() => {
        if (fetchCalled.current) return; // skip if already called
        fetchCalled.current = true;

        const searchParams = new URLSearchParams(location.search);
        const checkoutToken = searchParams.get("checkoutToken");
        const bookingStatus = searchParams.get("booking");

        if (bookingStatus === "success" && checkoutToken) {
            // Optional: could call backend to finalize booking here
            setIsBookingSuccessOpen(true);

            //temp booking data, to check if booking creation works
            const bookingData = {
                packageName: "Boracay Tour Package",
                travelDetails: "2 travelers, 3 days, 2 nights",
            };

            axiosInstance.post("/booking/create-booking", {
                bookingDetails: bookingData,
                checkoutToken
            })
                .then(res => {
                    console.log("Booking created successfully:", res.data);
                    const bookingId = res.data._id;
                    const amount = 29000; //temporary price, can get from quotation details later
                    const method = "Online Payment"; //temporary method, can get from payment details later
                    const status = "Completed"; //temporary status, can get from payment details later
                    const packageName = res.data.bookingDetails.packageName || "N/A";

                    axiosInstance.post("/transaction/create-transaction", {
                        bookingId,
                        amount,
                        method,
                        status,
                        packageName
                    })
                        .then(transactionRes => {
                            console.log("Transaction created successfully:", transactionRes.data);
                        })
                        .catch(transactionErr => {
                            console.error("Error creating transaction:", transactionErr.response?.data || transactionErr.message);
                            message.error("Booking was successful, but there was an issue creating the transaction.");
                        });

                })
                .catch(err => {
                    console.error("Error creating booking:", err.response?.data || err.message);
                    message.error("Booking was successful, but there was an issue finalizing it. Please contact support.");
                });

            window.history.replaceState({}, '', location.pathname); //can replace with a thank you page
        }
    }, [location.search, location.pathname]);


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
                    setIsBookingRegistrationOpen(true);
                } catch (error) {
                    message.error("Unable to accept quotation");
                }
            }
        });
    };

    const successUrl = id
        ? `${window.location.origin}/user-quotation-request/${id}?booking=success`
        : `${window.location.origin}/user-quotation-request?booking=success`;
    const cancelUrl = id
        ? `${window.location.origin}/user-quotation-request/${id}?booking=cancel`
        : `${window.location.origin}/user-quotation-request?booking=return`;

    // console.log("Current quotation state:", quotation);

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

    if (!quotation) {
        return <p>Loading quotation details...</p>;
    }

    const bookingRegistrationProceed = () => {
        setIsBookingRegistrationOpen(false);
        setIsInvoiceModalOpen(true);
    }

    const invoiceProceed = () => {
        setIsInvoiceModalOpen(false);
        setIsPaymentMethodsOpen(true);
    }

    const paymentProceed = () => {
        setIsPaymentMethodsOpen(false);
        handleCheckout();
    }


    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div style={{ padding: "20px" }}>
                <div className="quotation-header-container">
                    <div>
                        <h2>{quotation.packageName}</h2>
                        <p>
                            <strong>Reference:</strong> {quotation.reference} |{" "}
                            <strong>Status:</strong> {quotation.status}
                        </p>
                    </div>

                    <Button
                        className="quotation-backbutton"
                        style={{ marginBottom: "15px" }}
                        onClick={() => navigate("/user-package-quotation")}
                    >
                        Back
                    </Button>
                </div>


                <div style={{ marginBottom: "20px" }}>
                    <Card title="Quotation Revision History">
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
                </div>

                <h1>Latest Revision</h1>
                <div
                    style={{
                        border: "1px solid #ccc",
                        height: "600px",
                        marginBottom: "20px",
                    }}
                >
                    {quotation.pdfRevisions && quotation.pdfRevisions.length > 0 ? (
                        <iframe
                            src={quotation.pdfRevisions[quotation.pdfRevisions.length - 1].url}
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


            {/* Booking Process when package is accepted */}

            <BookingRegistrationModal
                open={isBookingRegistrationOpen}
                onCancel={() => setIsBookingRegistrationOpen(false)}
                onProceed={bookingRegistrationProceed}
                packageData={{
                    packageName: quotation.packageName,
                    packageDuration: quotation.travelDetails?.duration || "N/A",
                    packagePricePerPax: quotation.travelDetails?.pricePerPax || 0
                }}
            />

            <DisplayInvoiceModal
                open={isInvoiceModalOpen}
                onCancel={() => { setIsInvoiceModalOpen(false); }}
                onProceed={invoiceProceed}
                summary={{
                    packageName: quotation.packageName,
                    travelDetails: quotation.travelDetails,
                    amount: 29000,
                    method: "Online Payment",
                    status: "Completed"
                }}
            />

            <PaymentMethodsModal
                open={isPaymentMethodsOpen}
                onCancel={() => { setIsPaymentMethodsOpen(false); }}
                onProceed={paymentProceed}
            />

        </ConfigProvider>
    );
}