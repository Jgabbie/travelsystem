import React, { useEffect, useState } from "react";
import { Descriptions, Tag, Steps, Button, Spin, Divider, Typography, Image, ConfigProvider, message, Switch, Modal, Checkbox, DatePicker, TimePicker, Input } from "antd";
import { ArrowLeftOutlined, DownloadOutlined, FilePdfOutlined, CheckCircleFilled } from "@ant-design/icons";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "../../style/admin/viewvisaapplication.css"
import apiFetch from "../../config/fetchConfig";
import dayjs from "dayjs";

const { Title } = Typography;

export default function ViewVisaApplication() {
    const location = useLocation();
    const { applicationItem } = location.state
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isSubmittingSlots, setIsSubmittingSlots] = useState(false);
    const [application, setApplication] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [progressEditable, setProgressEditable] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [alternateSlots, setAlternateSlots] = useState([
        { date: null, time: null },
        { date: null, time: null },
        { date: null, time: null }
    ]);
    const [isSuggestedDatesSentModalOpen, setIsSuggestedDatesSentModalOpen] = useState(false);
    const [isResubmitDocumentsSentModalOpen, setIsResubmitDocumentsSentModalOpen] = useState(false);
    const [descriptionColumn, setDescriptionColumn] = useState(2);
    const [deliveryFee, setDeliveryFee] = useState("");
    const [deliveryDate, setDeliveryDate] = useState(null);
    const [isSubmittingDeliveryDetails, setIsSubmittingDeliveryDetails] = useState(false);

    useEffect(() => {
        const updateDescriptionColumn = () => {
            setDescriptionColumn(window.innerWidth <= 640 ? 1 : 2);
        };

        updateDescriptionColumn();
        window.addEventListener("resize", updateDescriptionColumn);

        return () => {
            window.removeEventListener("resize", updateDescriptionColumn);
        };
    }, []);

    const isBusy = loading || isSubmittingSlots || isUpdatingStatus;

    useEffect(() => {
        const fetchApplicationAndService = async () => {
            try {
                setLoading(true);
                // 1. Fetch the application first
                const appData = await apiFetch.get(`/visa/applications/${applicationItem}`);

                console.log("Fetched application data:", appData); // Debug log

                // 2. Determine current step
                const visaProcessSteps = appData.visaProcessSteps || []; // might be undefined if service not fetched yet

                // if visaProcessSteps already exist in appData
                const statusMap = visaProcessSteps.reduce((acc, step, idx) => {
                    const key = typeof step === "string" ? step : step?.title;
                    if (key) {
                        acc[key] = idx;
                    }
                    return acc;
                }, {});

                const normalizedStatus = Array.isArray(appData.status)
                    ? appData.status[appData.status.length - 1]
                    : appData.status;

                setCurrentStep(statusMap[normalizedStatus] ?? 0);

                // 3. Fetch the service using serviceId from application
                if (appData.serviceId) {
                    try {
                        const serviceId = typeof appData.serviceId === "object" ? appData.serviceId._id : appData.serviceId;
                        const serviceData = await apiFetch.get(`/services/get-service/${serviceId}`);

                        // Merge service info into application
                        setApplication({
                            ...appData,
                            visaName: serviceData.visaName,
                            visaPrice: serviceData.visaPrice,
                            visaProcessSteps: serviceData.visaProcessSteps,
                            visaRequirements: serviceData.visaRequirements,
                            serviceName: serviceData.visaName // for your Tag
                        });
                    } catch (err) {
                        console.error("Failed to fetch visa service:", err);
                        setApplication(appData); // fallback
                    }
                } else {
                    setApplication(appData); // fallback if no serviceId
                }
            } catch (err) {
                message.error("Failed to load application details.");
                navigate(-1);
            } finally {
                setLoading(false);
            }
        };

        fetchApplicationAndService();
    }, [applicationItem, navigate]);

    //SUBMIT SUGGESTED APPOINTMENT OPTIONS ------------------------------------------------------
    const handleSubmitAlternateSlots = async () => {
        setIsSubmittingSlots(true);
        try {
            const slots = alternateSlots
                .map((slot) => ({
                    date: slot.date ? dayjs(slot.date).format("YYYY-MM-DD") : null,
                    time: slot.time ? dayjs(slot.time).format("h:mm A") : null
                }))
                .filter((slot) => slot.date && slot.time);

            if (slots.length === 0) {
                setIsSubmittingSlots(false);
                message.error("Please select date and time for at least one option.");
                return;
            }

            await apiFetch.put(`/visa/applications/${applicationItem}/suggest-appointments`, { slots });

            setAlternateSlots([
                { date: null, time: null },
                { date: null, time: null },
                { date: null, time: null }
            ]);

            setIsSubmittingSlots(false);
            setIsSuggestedDatesSentModalOpen(true);
        } catch (error) {
            setIsSubmittingSlots(false);
            message.error("Failed to submit appointment options.");
        }
    };


    const statusText = Array.isArray(application?.status)
        ? application.status[application.status.length - 1]
        : application?.status;

    useEffect(() => {
        if (!application?.visaProcessSteps || !statusText) return;

        const statusMap = application.visaProcessSteps.reduce((acc, step, idx) => {
            const key = typeof step === "string" ? step : step?.title;
            if (key) {
                acc[key] = idx;
            }
            return acc;
        }, {});

        setCurrentStep(statusMap[statusText] ?? 0);
    }, [application?.visaProcessSteps, statusText]);

    useEffect(() => {
        if ((application?.passportReleaseOption || "").toLowerCase() !== "delivery") return;
        setDeliveryFee(application?.deliveryFee ? String(application.deliveryFee) : "");
        setDeliveryDate(application?.deliveryDate ? dayjs(application.deliveryDate) : null);
    }, [application?.passportReleaseOption, application?.deliveryFee, application?.deliveryDate]);

    const requirements = application?.visaRequirements || [];

    const requirementLabelMap = requirements.reduce((acc, req, idx) => {
        const mapKey = req.key || req.req || req.label || `Requirement ${idx + 1}`;
        acc[mapKey] = req.req || req.label || mapKey;
        return acc;
    }, {});

    const getRequirementLabel = (key, fallbackIndex) => {
        if (requirementLabelMap[key]) {
            return requirementLabelMap[key];
        }

        const keyMatch = String(key || '').match(/-(\d+)$/);
        const indexFromKey = keyMatch ? Number(keyMatch[1]) : Number(fallbackIndex);
        const requirementByIndex = requirements[indexFromKey];

        if (requirementByIndex?.req) {
            return requirementByIndex.req;
        }

        if (requirementByIndex?.label) {
            return requirementByIndex.label;
        }

        return key;
    };

    const buildDocumentList = (docs) => {
        if (!docs) return [];

        const list = [];

        if (Array.isArray(docs)) {
            docs.forEach((doc, index) => {
                if (!doc) return;
                if (typeof doc === "string") {
                    list.push({ url: doc, name: `Document ${index + 1}` });
                    return;
                }
                if (doc.url) {
                    list.push({ url: doc.url, name: doc.name || doc.label || `Document ${index + 1}` });
                }
            });
            return list;
        }

        if (typeof docs === "object") {
            Object.entries(docs).forEach(([key, value], entryIndex) => {
                if (!value) return;

                if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        if (!item) return;
                        if (typeof item === "string") {
                            list.push({ url: item, name: `${getRequirementLabel(key, entryIndex)} ${index + 1}` });
                            return;
                        }
                        if (item.url) {
                            list.push({
                                url: item.url,
                                name: item.name || item.label || `${getRequirementLabel(key, entryIndex)} ${index + 1}`
                            });
                        }
                    });
                    return;
                }

                if (typeof value === "string") {
                    list.push({ url: value, name: getRequirementLabel(key, entryIndex) });
                    return;
                }

                if (value.url) {
                    list.push({
                        url: value.url,
                        name: value.name || value.label || getRequirementLabel(key, entryIndex)
                    });
                }
            });
        }

        return list;
    };

    const submittedDocuments = buildDocumentList(application?.submittedDocuments || application?.documents);

    if (!application) {
        return null;
    }

    // STATUS UPDATE HANDLER ---------------------------------------------------------------
    const handleStepChange = async (stepIdx) => {
        if (!progressEditable || isUpdatingStatus) return;
        // Map step index to status string
        const statusArr = application.visaProcessSteps.map((step) =>
            typeof step === "string" ? step : step?.title
        );
        const newStatus = statusArr[stepIdx];

        if (!newStatus || newStatus === statusText) return;

        try {
            setIsUpdatingStatus(true);
            // You should update this endpoint to PATCH/PUT to your backend for real update
            await apiFetch.put(`/visa/applications/${applicationItem}/status`, { status: newStatus });
            setApplication((prev) => ({ ...prev, status: newStatus }));
            setCurrentStep(stepIdx);
            message.success(`Status updated to ${newStatus}`);
        } catch (err) {
            message.error("Failed to update status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleResubmitDocuments = async () => {
        if (isUpdatingStatus) return;

        try {
            setIsUpdatingStatus(true);
            await apiFetch.put(`/visa/applications/${applicationItem}/resubmit-documents`);

            setApplication((prev) => ({
                ...prev,
                status: "Payment complete"
            }));

            const statusMap = (application?.visaProcessSteps || []).reduce((acc, step, idx) => {
                const key = typeof step === "string" ? step : step?.title;
                if (key) {
                    acc[key] = idx;
                }
                return acc;
            }, {});

            if (statusMap["Payment complete"] !== undefined) {
                setCurrentStep(statusMap["Payment complete"]);
            }

            setIsResubmitDocumentsSentModalOpen(true);
        } catch (error) {
            message.error("Failed to update status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleSubmitDeliveryDetails = async () => {
        const parsedFee = Number(deliveryFee);
        if (!Number.isFinite(parsedFee) || parsedFee <= 0) {
            message.error("Please enter a valid delivery fee.");
            return;
        }

        if (!deliveryDate) {
            message.error("Please select a delivery date.");
            return;
        }

        try {
            setIsSubmittingDeliveryDetails(true);
            const response = await apiFetch.put(`/visa/applications/${applicationItem}/delivery-details`, {
                deliveryFee: parsedFee,
                deliveryDate: dayjs(deliveryDate).format("YYYY-MM-DD")
            });

            setApplication((prev) => ({ ...prev, ...response.application }));
            message.success("Delivery details sent to applicant.");
        } catch (error) {
            message.error(error?.message || "Failed to send delivery details.");
        } finally {
            setIsSubmittingDeliveryDetails(false);
        }
    };

    //EMBASSY REJECTED HANDLER ------------------------------------------------------
    const handleEmbassyRejected = async () => {
        try {
            setIsUpdatingStatus(true);
            await apiFetch.put(`/visa/applications/${applicationItem}/status`, { status: "Rejected" });
            setApplication((prev) => ({ ...prev, status: "Rejected" }));
            message.success("Application marked as Embassy Rejected");
        } catch (err) {
            message.error("Failed to update status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleEmbassyApproved = async () => {
        try {
            setIsUpdatingStatus(true);
            await apiFetch.put(`/visa/applications/${applicationItem}/status`, { status: "Embassy Approved" });
            setApplication((prev) => ({ ...prev, status: "Embassy Approved" }));
            message.success("Application marked as Embassy Approved");
        } catch (err) {
            message.error("Failed to update status");
        } finally {
            setIsUpdatingStatus(false);
        }
    }

    // DISABLE PAST DATES AND WEEKENDS IN DATE PICKER ------------------------------------------------------
    const disableDates = (current) => {
        const today = dayjs().startOf('day');
        const twoWeeksFromNow = today.add(14, 'day');

        return (
            current &&
            (
                current < twoWeeksFromNow ||
                current.day() === 0 ||
                current.day() === 6
            )
        );
    };

    const disabledHours = () => {
        const hours = [];
        for (let i = 0; i < 24; i++) {
            if (i < 8 || i > 17) {
                hours.push(i);
            }
        }
        return hours;
    }

    return (
        <ConfigProvider theme={{ token: { colorPrimary: "#305797" } }}>
            {isBusy ? (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "80vh"
                    }}
                >
                    <Spin
                        size="large"
                        description={
                            loading
                                ? "Loading application details..."
                                : isSubmittingSlots
                                    ? "Submitting suggested appointment options..."
                                    : "Updating application status..."
                        }
                    />
                </div>) :
                (
                    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
                        <Button type="primary" onClick={() => navigate(-1)} style={{ marginBottom: 16 }} className="viewvisaapplication-back-button">
                            <ArrowLeftOutlined />
                            Back
                        </Button>
                        <div className="app-detail-header">
                            <div className="app-detail-titleblock">
                                <Title level={2} style={{ marginBottom: 4 }}>Visa Application Details</Title>
                                <p className="app-detail-subtitle">Handle scheduling, status progression, and visa document review.</p>
                            </div>
                        </div>

                        {/* WAITING FOR APPLICANT TO CHOOSE SUGGESTED APPOINTMENT OPTION */}
                        {statusText && statusText.toLowerCase() === "application submitted" &&
                            application.suggestedAppointmentScheduleChosen.date === "" && application.suggestedAppointmentScheduleChosen.time === "" &&
                            application.suggestedAppointmentSchedules !== null && application.suggestedAppointmentSchedules.length > 0 &&
                            (
                                <div style={{ marginTop: 16, borderLeft: '4px solid #faad14', backgroundColor: '#fffbe6', padding: 16, borderRadius: 8 }}>
                                    <Tag color="gold"><h2>AWAITING APPLICANT RESPONSE</h2></Tag>
                                    <p style={{ margin: 0, fontSize: 14 }}>
                                        You have suggested appointment schedules for this application. Kindly wait for the applicant's response. We will notify you once they have chosen an option.
                                    </p>
                                </div>
                            )}

                        {/* APPLICANT HAS CHOSEN A SUGGESTED APPOINTMENT OPTION */}
                        {statusText && statusText.toLowerCase() === "application submitted" &&
                            application.suggestedAppointmentScheduleChosen.date !== "" && application.suggestedAppointmentScheduleChosen.time !== "" && (
                                <div style={{ marginTop: 16, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, borderRadius: 8 }}>
                                    <Tag color="green"><h2>APPLICANT RESPONSE RECEIVED</h2></Tag>
                                    <p style={{ margin: 0, fontSize: 14 }}>
                                        The applicant has chosen their preferred appointment schedule.
                                    </p>
                                    <strong>
                                        {dayjs(application.suggestedAppointmentScheduleChosen?.date).format("MMM DD, YYYY")} at {application.suggestedAppointmentScheduleChosen?.time}
                                    </strong>
                                </div>
                            )}

                        {/* RELEASE OPTION CHOSEN BY THE APPLICANT */}
                        {statusText && statusText.toLowerCase() === "passport released" && (
                            <div style={{ marginTop: 16, borderLeft: '4px solid #354ad8', backgroundColor: '#edf2ff', padding: 16, borderRadius: 8 }}>
                                <Tag color="blue"><h2>APPLICANT'S RELEASE OPTION</h2></Tag>
                                <p style={{ margin: 0, fontSize: 14 }}>
                                    This is the chosen release option of the applicant.
                                </p>
                                <strong>
                                    {application.passportReleaseOption === "pickup" ? "Pickup at MRC Travel and Tours office" : `Delivery to ${application.deliveryAddress || "N/A"}`}
                                </strong>
                            </div>
                        )}

                        <div className="app-detail-shell" style={{ marginTop: 24, border: '1px solid #dde4ef', borderRadius: 12, padding: 20, background: '#ffffff', boxShadow: '0 6px 20px rgba(18, 24, 38, 0.06)', display: "flex", flexDirection: "column", gap: 24 }}>
                            <div>
                                <div style={{ display: "flex", flexDirection: "row", gap: 24, flexWrap: "wrap" }}>
                                    <div style={{ flex: "1 1 620px", minWidth: 320 }}>
                                        <Descriptions bordered column={descriptionColumn} size="middle">
                                            <Descriptions.Item label="Application Number">{application.applicationNumber}</Descriptions.Item>
                                            <Descriptions.Item label="Applicant Name">{application.applicantName}</Descriptions.Item>
                                            <Descriptions.Item label="Purpose of Travel">{application.purposeOfTravel}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Date">{application.preferredDate ? dayjs(application.preferredDate).format("MMM DD, YYYY") : "Not Set"}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Time">{application.preferredTime || "Not Set"} </Descriptions.Item>
                                            <Descriptions.Item label="Visa Type">
                                                <Tag color="blue">{application.serviceName}</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Date Submitted">{application.createdAt ? dayjs(application.createdAt).format("MMM DD, YYYY hh:mm A") : "N/A"}</Descriptions.Item>
                                            <Descriptions.Item label="Progress Editable">
                                                <Switch checked={progressEditable} onChange={setProgressEditable} />
                                            </Descriptions.Item>
                                        </Descriptions>

                                        {/* DFA APPROVE OR REJECT OPTION WHEN STATUS IS PROCESSING BY DFA */}
                                        {statusText && String(statusText).toLowerCase() === "processing by embassy" && (
                                            <div style={{ minWidth: 280, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                                                <h3 style={{ marginTop: 0 }}>Embassy Processing Actions</h3>
                                                <Button type="primary" onClick={handleEmbassyApproved} className="viewpassportapplication-dfa-processing-approve-button">
                                                    Embassy Approved
                                                </Button>
                                                <Button type="primary" onClick={handleEmbassyRejected} className="viewpassportapplication-dfa-processing-reject-button" style={{ marginLeft: 8 }}>
                                                    Embassy Rejected
                                                </Button>
                                            </div>
                                        )}

                                        {statusText && String(statusText).toLowerCase() === "application submitted" && (
                                            <div style={{ marginTop: 16, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                                                <h3 style={{ marginTop: 0 }}>Suggested Appointment Options</h3>
                                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                                    {alternateSlots.map((slot, idx) => (
                                                        <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                                                            <span style={{ minWidth: 20 }}>{idx + 1}.</span>
                                                            <DatePicker
                                                                disabledDate={disableDates}
                                                                placeholder="Select date"
                                                                value={slot.date}
                                                                onChange={(date) => {
                                                                    const next = [...alternateSlots];
                                                                    next[idx] = { ...next[idx], date };
                                                                    setAlternateSlots(next);
                                                                }}
                                                            />
                                                            <TimePicker
                                                                format="h:mm A"
                                                                use12Hours
                                                                showNow={false}
                                                                minuteStep={30}
                                                                disabledTime={() => ({
                                                                    disabledHours
                                                                })}
                                                                placeholder="Select time"
                                                                value={slot.time}
                                                                onChange={(time) => {
                                                                    const next = [...alternateSlots];
                                                                    next[idx] = { ...next[idx], time };
                                                                    setAlternateSlots(next);
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                                        <Button type="primary" onClick={handleSubmitAlternateSlots} className="viewvisaapplication-submit-button">
                                                            Submit Options
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ marginTop: 16, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                                            <h3 style={{ marginTop: 0 }}>Submitted Documents</h3>
                                            {submittedDocuments.length > 0 ? (
                                                <div className="application-documents-grid">
                                                    {Object.entries(application.submittedDocuments).map(([key, value], entryIndex) => {
                                                        if (!value) return null;
                                                        const label = getRequirementLabel(key, entryIndex);

                                                        const isPdf = (url) => typeof url === 'string' && url.toLowerCase().endsWith('.pdf');
                                                        const getDownloadUrl = (originalUrl) => {
                                                            if (!originalUrl.includes('cloudinary.com')) return originalUrl;
                                                            return originalUrl.replace('/upload/', '/upload/fl_attachment/');
                                                        };

                                                        const renderFilePreview = (url, identifier) => {
                                                            const isPdfFile = isPdf(url);

                                                            return (
                                                                <div key={identifier} className="application-doc-item" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                    <div className="application-doc-preview-box" style={{
                                                                        border: '1px solid #d9d9d9',
                                                                        borderRadius: 8,
                                                                        overflow: 'hidden',
                                                                        backgroundColor: '#f5f5f5',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}>
                                                                        {isPdfFile ? (
                                                                            <Button
                                                                                className="application-doc-preview-media"
                                                                                type="dashed"
                                                                                icon={<FilePdfOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />}
                                                                                onClick={() => window.open(url, '_blank')}
                                                                                style={{
                                                                                    width: '100%',
                                                                                    display: 'flex', flexDirection: 'column',
                                                                                    alignItems: 'center', justifyContent: 'center',
                                                                                    borderRadius: 8,
                                                                                    backgroundColor: '#fafafa'
                                                                                }}
                                                                            >
                                                                                <span style={{ fontSize: '12px', marginTop: 8, color: '#305797 !important' }}>View PDF</span>
                                                                            </Button>
                                                                        ) : (
                                                                            <Image
                                                                                className="application-doc-preview-media"
                                                                                src={url}
                                                                                alt={`${label}-${identifier}`}
                                                                                width="100%"
                                                                                style={{ objectFit: 'cover' }}
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    {/* DOWNLOAD BUTTON */}
                                                                    <Button
                                                                        className='visaapplication-download-button application-doc-download'
                                                                        type="default"
                                                                        icon={<DownloadOutlined />}
                                                                        size="small"
                                                                        block
                                                                        onClick={() => {
                                                                            const downloadUrl = getDownloadUrl(url);
                                                                            window.location.href = downloadUrl; // Directly triggers the attachment download
                                                                        }}
                                                                    >
                                                                        Download {isPdfFile ? 'PDF' : 'Image'}
                                                                    </Button>
                                                                </div>
                                                            );
                                                        };

                                                        return (
                                                            <div key={key} style={{ minWidth: 0 }}>
                                                                <b style={{ display: 'block', marginBottom: 8, fontSize: 10 }}>{label}:</b>
                                                                <div style={{ gap: 12 }}>
                                                                    {Array.isArray(value) ? (
                                                                        <Image.PreviewGroup>
                                                                            {value.map((url, idx) => (
                                                                                <div key={`${key}-${idx}`}>
                                                                                    {renderFilePreview(url, idx)}
                                                                                </div>
                                                                            ))}
                                                                        </Image.PreviewGroup>
                                                                    ) : (
                                                                        renderFilePreview(value, 'single')
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                                                    No documents submitted.
                                                </div>
                                            )}
                                            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                                                <Button
                                                    className="viewvisaapplication-submitdocu-button"
                                                    type="primary"
                                                    onClick={handleResubmitDocuments}
                                                    disabled={statusText?.toLowerCase() === "payment complete" || statusText?.toLowerCase() === "application approved" || statusText?.toLowerCase() === "application submitted" || isUpdatingStatus}
                                                >
                                                    Resubmit Documents
                                                </Button>
                                            </div>
                                        </div>

                                        {statusText && String(statusText).toLowerCase() === "passport released" && application.passportReleaseOption === "delivery" && (
                                            <div style={{ minWidth: 280, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff', marginTop: 16 }}>
                                                <h3 style={{ marginTop: 0 }}>Delivery Details</h3>
                                                <label>Delivery Fee</label>
                                                <Input
                                                    placeholder="Enter delivery fee"
                                                    value={deliveryFee}
                                                    onChange={(e) => setDeliveryFee(e.target.value)}
                                                    style={{ marginBottom: 12 }}
                                                />
                                                <label>Delivery Date</label>
                                                <DatePicker
                                                    style={{ width: "100%", marginBottom: 12 }}
                                                    value={deliveryDate}
                                                    onChange={setDeliveryDate}
                                                />
                                                <Button
                                                    type="primary"
                                                    onClick={handleSubmitDeliveryDetails}
                                                    loading={isSubmittingDeliveryDetails}
                                                >
                                                    Send Delivery Details
                                                </Button>
                                                {(application.deliveryFee > 0 || application.deliveryDate) && (
                                                    <p style={{ marginTop: 12, marginBottom: 0, color: "#305797" }}>
                                                        Current details: PHP {Number(application.deliveryFee || 0).toLocaleString()} on {application.deliveryDate || "N/A"}
                                                    </p>
                                                )}
                                            </div>
                                        )}



                                    </div>

                                    <div style={{ flex: "1 1 300px", minWidth: 280 }}>
                                        <div style={{ marginBottom: 16, border: "1px solid #dde4ef", borderRadius: 10, padding: 12, background: "#f9fbff" }}>
                                            <p className="app-detail-kicker" style={{ marginBottom: 6 }}>Overview</p>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                                <span>Status</span>
                                                <Tag color="blue">{statusText || "N/A"}</Tag>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span>Service</span>
                                                <strong>{application?.serviceName || "N/A"}</strong>
                                            </div>
                                        </div>

                                        <div style={{ border: "1px solid #dde4ef", borderRadius: 10, padding: 12, background: "#ffffff", minWidth: 280 }}>
                                            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Progress Tracker</h3>
                                            <div className="steps-vertical-line">
                                                <Steps
                                                    orientation="vertical"
                                                    current={currentStep}
                                                    // This is the only place that should handle the click
                                                    onChange={undefined}
                                                    items={application.visaProcessSteps.map((step, idx) => ({
                                                        title: (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                <span style={{
                                                                    fontWeight: currentStep === idx ? 'bold' : 'normal',
                                                                    color: "#305797",
                                                                }}>
                                                                    {typeof step === "string" ? step : step?.title}
                                                                </span>
                                                                <p style={{ fontSize: 10, color: '#555', margin: 0 }}>
                                                                    {typeof step === 'object' && step?.description
                                                                        ? step.description
                                                                        : `Description for ${typeof step === 'string' ? step : step?.title || ''}`}
                                                                </p>
                                                                <Checkbox
                                                                    checked={idx <= currentStep}
                                                                    disabled={!progressEditable}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        handleStepChange(idx);
                                                                    }}
                                                                >
                                                                    Done
                                                                </Checkbox>
                                                            </div>
                                                        )
                                                    }))}
                                                    className="no-line"
                                                />
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>



                        </div>
                    </div>
                )}

            {/* SUGGESTED DATES SENT MODAL */}
            <Modal
                open={isSuggestedDatesSentModalOpen}
                className='signup-success-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsSuggestedDatesSentModalOpen(false);
                }}
            >
                <div className='signup-success-container'>
                    <h1 className='signup-success-heading'>Suggested Dates Sent!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='signup-success-text'>The suggested dates have been sent.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='logout-confirm-btn'
                            onClick={() => {
                                setIsSuggestedDatesSentModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>


            {/* RESUBMIT DOCUMENTS SENT MODAL */}
            <Modal
                open={isResubmitDocumentsSentModalOpen}
                className='signup-success-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                style={{ top: 220 }}
                onCancel={() => {
                    setIsResubmitDocumentsSentModalOpen(false);
                }}
            >
                <div className='signup-success-container'>
                    <h1 className='signup-success-heading'>Resubmit Documents Sent!</h1>

                    <div>
                        <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                    </div>

                    <p className='signup-success-text'>The requested document resubmission has been sent.</p>

                    <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                        <Button
                            type='primary'
                            className='logout-confirm-btn'
                            onClick={() => {
                                setIsResubmitDocumentsSentModalOpen(false);
                            }}
                        >
                            Continue
                        </Button>
                    </div>

                </div>
            </Modal>

        </ConfigProvider>
    );
}
