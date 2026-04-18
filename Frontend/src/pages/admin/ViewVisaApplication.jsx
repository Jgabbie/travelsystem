import React, { useEffect, useState } from "react";
import { Card, Descriptions, Tag, Steps, Button, Spin, Divider, Typography, Image, ConfigProvider, message, Switch, Checkbox, DatePicker, TimePicker } from "antd";
import { ArrowLeftOutlined, DownloadOutlined, FilePdfOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import "../../style/admin/viewvisaapplication.css"
import apiFetch from "../../config/fetchConfig";
import dayjs from "dayjs";

const { Title } = Typography;

export default function ViewVisaApplication() {
    const { id } = useParams();
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

    const isBusy = loading || isSubmittingSlots || isUpdatingStatus;

    useEffect(() => {
        const fetchApplicationAndService = async () => {
            try {
                setLoading(true);
                // 1. Fetch the application first
                const appData = await apiFetch.get(`/visa/applications/${id}`);

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
    }, [id, navigate]);

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

            await apiFetch.put(`/visa/applications/${id}/suggest-appointments`, { slots });

            setIsSubmittingSlots(false);
            message.success("Suggested appointment options submitted.");
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
            await apiFetch.put(`/visa/applications/${id}/status`, { status: newStatus });
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
            await apiFetch.put(`/visa/applications/${id}/resubmit-documents`);

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

            message.success("Status updated to Payment complete");
        } catch (error) {
            message.error("Failed to update status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    //EMBASSY REJECTED HANDLER ------------------------------------------------------
    const handleEmbassyRejected = async () => {
        try {
            setIsUpdatingStatus(true);
            await apiFetch.put(`/visa/applications/${id}/status`, { status: "Rejected" });
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
            await apiFetch.put(`/visa/applications/${id}/status`, { status: "Embassy Approved" });
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
                        <Title level={2} style={{ marginBottom: 16 }}>Visa Application Details</Title>

                        {/* WAITING FOR APPLICANT TO CHOOSE SUGGESTED APPOINTMENT OPTION */}
                        {statusText && statusText.toLowerCase() === "application submitted" &&
                            application.suggestedAppointmentScheduleChosen.date === "" && application.suggestedAppointmentScheduleChosen.time === "" &&
                            application.suggestedAppointmentSchedules !== null && application.suggestedAppointmentSchedules.length > 0 &&
                            (
                                <Card style={{ marginTop: 16, borderLeft: '4px solid #faad14', backgroundColor: '#fffbe6' }}>
                                    <Tag color="gold"><h2>AWAITING APPLICANT RESPONSE</h2></Tag>
                                    <p style={{ margin: 0, fontSize: 14 }}>
                                        You have suggested appointment schedules for this application. Kindly wait for the applicant's response. We will notify you once they have chosen an option.
                                    </p>
                                </Card>
                            )}

                        {/* APPLICANT HAS CHOSEN A SUGGESTED APPOINTMENT OPTION */}
                        {statusText && statusText.toLowerCase() === "application submitted" &&
                            application.suggestedAppointmentScheduleChosen.date !== "" && application.suggestedAppointmentScheduleChosen.time !== "" && (
                                <Card style={{ marginTop: 16, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed' }}>
                                    <Tag color="green"><h2>APPLICANT RESPONSE RECEIVED</h2></Tag>
                                    <p style={{ margin: 0, fontSize: 14 }}>
                                        The applicant has chosen their preferred appointment schedule.
                                    </p>
                                    <strong>
                                        {dayjs(application.suggestedAppointmentScheduleChosen?.date).format("MMM DD, YYYY")} at {application.suggestedAppointmentScheduleChosen?.time}
                                    </strong>
                                </Card>
                            )}

                        {/* PASSPORT RELEASE PASSPORT OPTION CHOSEN BY THE APPLICANT */}
                        {statusText && statusText.toLowerCase() === "passport released" && (
                            <Card style={{ marginTop: 16, borderLeft: '4px solid #354ad8', backgroundColor: '#edf2ff' }}>
                                <Tag color="blue"><h2>APPLICANT'S RELEASE PASSPORT OPTION</h2></Tag>
                                <p style={{ margin: 0, fontSize: 14 }}>
                                    This is the chosen release passport option of the applicant.
                                </p>
                                <strong>
                                    {application.passportReleaseOption === "pickup" ? "Pickup at MRC Travel and Tours office" : `Delivery to ${application.deliveryAddress || "N/A"}`}
                                </strong>
                            </Card>
                        )}

                        <div style={{ display: "flex", flexDirection: "row", gap: 32, marginTop: 24, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 800 }}>
                                <Card>
                                    <Descriptions bordered column={2} size="middle">
                                        <Descriptions.Item label="Application Number">{application.applicationNumber}</Descriptions.Item>
                                        <Descriptions.Item label="Applicant Name">{application.applicantName}</Descriptions.Item>
                                        <Descriptions.Item label="Purpose of Travel">{application.purposeOfTravel}</Descriptions.Item>
                                        <Descriptions.Item label="Preferred Date">{application.preferredDate ? dayjs(application.preferredDate).format("MMM DD, YYYY") : "Not Set"}</Descriptions.Item>
                                        <Descriptions.Item label="Preferred Time">{application.preferredTime || "Not Set"} </Descriptions.Item>
                                        <Descriptions.Item label="Visa Type">
                                            <Tag color="blue">{application.serviceName}</Tag>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Status">
                                            <Tag color={
                                                statusText === "Pending" ? "orange" :
                                                    statusText === "Approved" ? "green" :
                                                        statusText === "Rejected" ? "red" :
                                                            statusText === "Processing" ? "blue" : "default"
                                            }>
                                                {statusText}
                                            </Tag>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Date Submitted">{application.createdAt ? dayjs(application.createdAt).format("MMM DD, YYYY hh:mm A") : "N/A"}</Descriptions.Item>
                                        <Descriptions.Item label="Progress Editable">
                                            <Switch checked={progressEditable} onChange={setProgressEditable} />
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>

                                {/* DFA APPROVE OR REJECT OPTION WHEN STATUS IS PROCESSING BY DFA */}
                                {statusText && String(statusText).toLowerCase() === "processing by embassy" && (
                                    <Card title="Embassy Processing Actions" style={{ minWidth: 280, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                                        <Button type="primary" onClick={handleEmbassyApproved} className="viewpassportapplication-dfa-processing-approve-button">
                                            Embassy Approved
                                        </Button>
                                        <Button type="primary" onClick={handleEmbassyRejected} className="viewpassportapplication-dfa-processing-reject-button" style={{ marginLeft: 8 }}>
                                            Embassy Rejected
                                        </Button>
                                    </Card>
                                )}

                                {statusText && String(statusText).toLowerCase() === "application submitted" && (
                                    <Card title="Suggested Appointment Options" style={{ marginTop: 16 }}>
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
                                    </Card>
                                )}

                                <Card title="Submitted Documents" style={{ marginTop: 16, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                                    {submittedDocuments.length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
                                                        <div key={identifier} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <div style={{
                                                                width: 250,
                                                                height: 250,
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
                                                                        type="dashed"
                                                                        icon={<FilePdfOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />}
                                                                        onClick={() => window.open(url, '_blank')}
                                                                        style={{
                                                                            height: 250, width: 250,
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
                                                                        src={url}
                                                                        alt={`${label}-${identifier}`}
                                                                        width="100%"
                                                                        height="100%"
                                                                        style={{ objectFit: 'cover' }}
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* DOWNLOAD BUTTON */}
                                                            <Button
                                                                className='visaapplication-download-button'
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
                                                    <div key={key}>
                                                        <b style={{ display: 'block', marginBottom: 8 }}>{label}:</b>
                                                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
                                            disabled={statusText?.toLowerCase() === "payment complete" || isUpdatingStatus}
                                        >
                                            Resubmit Documents
                                        </Button>
                                    </div>
                                </Card>

                            </div>

                            <div style={{ display: "flex", flexDirection: "column", minWidth: 300 }}>
                                <div style={{ maxWidth: 300, margin: "0 auto 0 auto", paddingBottom: 12 }}>
                                    <Card title="Progress Tracker" style={{ minWidth: 280, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
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
                                                                Description for {step}
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

                                    </Card>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

        </ConfigProvider>
    );
}
