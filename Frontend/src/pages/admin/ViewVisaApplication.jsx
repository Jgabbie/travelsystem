import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Descriptions, Tag, Steps, Button, Spin, Divider, Typography, Image, ConfigProvider, Switch, Modal, Checkbox, DatePicker, TimePicker, Input, InputNumber, notification } from "antd";
import { ArrowLeftOutlined, DownloadOutlined, FilePdfOutlined, CheckCircleFilled, PictureOutlined } from "@ant-design/icons";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "../../style/admin/viewvisaapplication.css"
import apiFetch from "../../config/fetchConfig";
import dayjs from "dayjs";
import { normalizeVisaProcessSteps } from "../../utils/visaDeadlineUtils";

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

    const applicantName = `${application?.applicantName || application?.firstName || ''} ${application?.lastName || ''}`.trim();

    const isBusy = loading || isSubmittingSlots || isUpdatingStatus;

    const fetchApplicationAndService = useCallback(async () => {
        try {
            setLoading(true);
            // 1. Fetch the application first
            const appData = await apiFetch.get(`/visa/applications/${applicationItem}`);

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
                        visaRequirements: serviceData.visaRequirements,
                        serviceName: serviceData.visaName // for your Tag
                    });
                } catch (err) {
                    console.error("Failed to fetch visa service:", err);
                    setApplication(appData); // fallback if no serviceId
                }
            } else {
                setApplication(appData); // fallback if no serviceId
            }
        } catch (err) {
            notification.error({ message: "Failed to load application details.", placement: "topRight" });
            navigate(-1);
        } finally {
            setLoading(false);
        }
    }, [applicationItem, navigate]);

    useEffect(() => {
        fetchApplicationAndService();
    }, [fetchApplicationAndService]);


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
                notification.error({ message: "Please select date and time for at least one option.", placement: "topRight" });
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
            notification.error({ message: "Failed to submit appointment options.", placement: "topRight" });
        }
    };


    const statusText = Array.isArray(application?.status)
        ? application.status[application.status.length - 1]
        : application?.status;

    const processStepEntries = useMemo(() => normalizeVisaProcessSteps(application?.processSteps), [application?.processSteps]);

    const terminalStatuses = new Set(['processing by embassy', 'embassy approved', 'passport released']);

    const statusSetDate = application?.statusUpdatedAt
        ? dayjs(application.statusUpdatedAt)
        : application?.updatedAt
            ? dayjs(application.updatedAt)
            : null;
    const penaltyStateLabel = application?.reachedSecondDeadline
        ? 'Penalty Expired'
        : application?.secondChance
            ? 'Penalty Paid'
            : application?.onPenalty
                ? 'On Penalty'
                : null;

    const getProcessStepInfoForTitle = (app, title) => app?.processSteps?.[title] || null;

    // Get the most recent staff/admin who changed the status (if available)
    const getManagerName = (app) => {
        try {
            if (!app) return null;
            const history = app.statusHistory;
            if (Array.isArray(history) && history.length > 0) {
                const applicantId = String(app.userId?._id || app.userId || '');
                const applicantName = String(app.applicantName || app.username || '').trim().toLowerCase();

                for (let i = history.length - 1; i >= 0; i -= 1) {
                    const entry = history[i];
                    const changedById = String(entry?.changedBy?._id || entry?.changedBy || '');
                    const changedByName = String(entry?.changedByName || '').trim();

                    if (applicantId && changedById && changedById === applicantId) {
                        continue;
                    }

                    if (changedByName && applicantName && changedByName.toLowerCase() === applicantName) {
                        continue;
                    }

                    if (entry?.changedBy && typeof entry.changedBy === 'object') {
                        const first = entry.changedBy.firstname || entry.changedBy.username || '';
                        const lastn = entry.changedBy.lastname || '';
                        const full = [first, lastn].map(s => (s || '').trim()).filter(Boolean).join(' ');
                        if (full) return full;
                    }

                    if (changedByName) return changedByName;
                    if (entry?.changedBy && typeof entry.changedBy === 'string') return entry.changedBy;
                }

                return null;
            }
            return null;
        } catch (e) {
            return null;
        }
    };

    const managerName = getManagerName(application);

    useEffect(() => {
        if (!processStepEntries.length || !statusText) return;

        const statusMap = processStepEntries.reduce((acc, step, idx) => {
            if (step?.title) {
                acc[String(step.title).toLowerCase()] = idx;
            }
            return acc;
        }, {});

        setCurrentStep(statusMap[String(statusText).toLowerCase()] ?? 0);
    }, [processStepEntries, statusText]);

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
        const statusArr = processStepEntries.map((step) => step?.title).filter(Boolean);
        const newStatus = statusArr[stepIdx];

        if (!newStatus || newStatus === statusText) return;

        try {
            setIsUpdatingStatus(true);
            // You should update this endpoint to PATCH/PUT to your backend for real update
            await apiFetch.put(`/visa/applications/${applicationItem}/status`, { status: newStatus });
            await fetchApplicationAndService();
            notification.success({ message: `Status updated to ${newStatus}`, placement: "topRight" });
        } catch (err) {
            notification.error({ message: "Failed to update status", placement: "topRight" });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleResubmitDocuments = async (documentKey) => {
        if (isUpdatingStatus) return;

        const documentKeys = documentKey
            ? [documentKey]
            : Object.keys(application?.submittedDocuments || application?.documents || {});

        if (documentKeys.length === 0) {
            notification.warning({ message: "Please select a document to resubmit.", placement: "topRight" });
            return;
        }

        try {
            setIsUpdatingStatus(true);
            await apiFetch.put(`/visa/applications/${applicationItem}/resubmit-documents`, {
                ...(documentKey ? { documentKey } : { documentKeys })
            });
            await fetchApplicationAndService();

            setIsResubmitDocumentsSentModalOpen(true);
        } catch (error) {
            notification.error({ message: "Failed to update status", placement: "topRight" });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleSubmitDeliveryDetails = async () => {
        const parsedFee = Number(deliveryFee);
        if (!Number.isFinite(parsedFee) || parsedFee <= 0) {
            notification.error({ message: "Please enter a valid delivery fee.", placement: "topRight" });
            return;
        }

        if (!deliveryDate) {
            notification.error({ message: "Please select a delivery date.", placement: "topRight" });
            return;
        }

        try {
            setIsSubmittingDeliveryDetails(true);
            const response = await apiFetch.put(`/visa/applications/${applicationItem}/delivery-details`, {
                deliveryFee: parsedFee,
                deliveryDate: dayjs(deliveryDate).format("YYYY-MM-DD")
            });

            setApplication((prev) => ({ ...prev, ...response.application }));
            notification.success({ message: "Delivery details sent to applicant.", placement: "topRight" });
        } catch (error) {
            notification.error({ message: error?.message || "Failed to send delivery details.", placement: "topRight" });
        } finally {
            setIsSubmittingDeliveryDetails(false);
        }
    };

    //EMBASSY REJECTED HANDLER ------------------------------------------------------
    const handleEmbassyRejected = async () => {
        try {
            setIsUpdatingStatus(true);
            await apiFetch.put(`/visa/applications/${applicationItem}/status`, { status: "Rejected" });
            await fetchApplicationAndService();
            notification.success({ message: "Application marked as Embassy Rejected", placement: "topRight" });
        } catch (err) {
            notification.error({ message: "Failed to update status", placement: "topRight" });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleEmbassyApproved = async () => {
        try {
            setIsUpdatingStatus(true);
            await apiFetch.put(`/visa/applications/${applicationItem}/status`, { status: "Embassy Approved" });
            await fetchApplicationAndService();
            notification.success({ message: "Application marked as Embassy Approved", placement: "topRight" });
        } catch (err) {
            notification.error({ message: "Failed to update status", placement: "topRight" });
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

    const disablePastDates = (current) => {
        return current && current < dayjs().startOf('day');
    };

    // Only allow digit keystrokes and numeric paste for delivery fee input
    const handleDeliveryFeeKeyDown = (e) => {
        const allowedKeys = [
            'Backspace',
            'Delete',
            'ArrowLeft',
            'ArrowRight',
            'Tab',
            'Home',
            'End',
            'Enter'
        ];

        // Allow control/meta combos (copy/paste/select all, etc.)
        if (e.ctrlKey || e.metaKey) return;

        if (allowedKeys.includes(e.key)) return;

        // Allow digits only
        if (/^\d$/.test(e.key)) return;

        e.preventDefault();
    };

    const handleDeliveryFeePaste = (e) => {
        e.preventDefault();
        const paste = (e.clipboardData && e.clipboardData.getData('Text')) || '';
        const digits = String(paste).replace(/\D/g, '');
        if (digits) {
            setDeliveryFee(String(digits));
        }
    };

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
                                <div className="viewvisaapplication-tag-yellow-container">
                                    <h2 className="viewvisaapplication-tag-yellow">AWAITING APPLICANT RESPONSE</h2>
                                    <p style={{ margin: 0, fontSize: 14 }}>
                                        You have suggested appointment schedules for this application. Kindly wait for the applicant's response. We will notify you once they have chosen an option.
                                    </p>
                                </div>
                            )}

                        {/* APPLICANT HAS CHOSEN A SUGGESTED APPOINTMENT OPTION */}
                        {statusText && statusText.toLowerCase() === "application submitted" &&
                            application.suggestedAppointmentScheduleChosen.date !== "" && application.suggestedAppointmentScheduleChosen.time !== "" && (
                                <div className="viewvisaapplication-tag-green-container">
                                    <h2 className="viewvisaapplication-tag-green">APPLICANT RESPONSE RECEIVED</h2>
                                    <p style={{ fontSize: 16, marginBottom: 8 }}>
                                        The applicant has chosen their preferred appointment schedule.
                                    </p>
                                    <strong style={{ fontSize: 14 }}>
                                        {dayjs(application.suggestedAppointmentScheduleChosen?.date).format("MMM DD, YYYY")} at {application.suggestedAppointmentScheduleChosen?.time}
                                    </strong>
                                </div>
                            )}

                        {/* RELEASE OPTION CHOSEN BY THE APPLICANT */}
                        {statusText && statusText.toLowerCase() === "passport released" && (
                            <div className="viewvisaapplication-tag-blue-container">
                                <h2 className="viewvisaapplication-tag-blue">APPLICANT'S RELEASE OPTION</h2>
                                <p style={{ fontSize: 16, marginBottom: 8 }}>
                                    This is the chosen release option of the applicant.
                                </p>
                                <strong style={{ fontSize: 14 }}>
                                    {application.passportReleaseOption === "pickup" ? "Pickup at MRC Travel and Tours office" : `Delivery to ${application.deliveryAddress || "N/A"}`}
                                </strong>
                            </div>
                        )}

                        <div className="app-detail-shell" style={{ marginTop: 24, border: '1px solid #dde4ef', borderRadius: 12, padding: 20, background: '#ffffff', boxShadow: '0 6px 20px rgba(18, 24, 38, 0.06)', display: "flex", flexDirection: "column", gap: 24 }}>
                            <div>
                                <div style={{ display: "flex", flexDirection: "row", gap: 24, flexWrap: "wrap" }}>
                                    <div style={{ flex: "1 1 620px", minWidth: 320 }}>
                                        <Descriptions bordered column={descriptionColumn} size="middle">
                                            <Descriptions.Item label="Application Number">{application?.applicationNumber}</Descriptions.Item>
                                            <Descriptions.Item label="Applicant Name">{applicantName || 'N/A'}</Descriptions.Item>
                                            <Descriptions.Item label="Purpose of Travel">{application?.purposeOfTravel}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Date">{application.preferredDate ? dayjs(application.preferredDate).format("MMM DD, YYYY") : "Not Set"}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Time">{application.preferredTime || "Not Set"} </Descriptions.Item>
                                            <Descriptions.Item label="Visa Type">
                                                <Tag color="blue">{application.serviceName}</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Date Submitted">{application.createdAt ? dayjs(application.createdAt).format("MMM DD, YYYY hh:mm A") : "N/A"}</Descriptions.Item>
                                            <Descriptions.Item label="Managed by">{managerName || 'N/A'}</Descriptions.Item>
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

                                                        const renderFilePreview = (url, identifier, documentKey) => {
                                                            const isPdfFile = isPdf(url);

                                                            return (
                                                                <div key={identifier} className="application-doc-item" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                                                                    {isPdfFile ? (
                                                                        <Button
                                                                            className="application-doc-preview-button application-doc-preview-media"
                                                                            type="default"
                                                                            icon={<FilePdfOutlined style={{ fontSize: '18px', color: '#305797' }} />}
                                                                            onClick={() => window.open(url, '_blank')}
                                                                            size="small"
                                                                            block
                                                                        >
                                                                            Preview File
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            className="application-doc-preview-button application-doc-preview-media"
                                                                            type="default"
                                                                            icon={<PictureOutlined style={{ fontSize: '18px', color: '#305797' }} />}
                                                                            onClick={() => window.open(url, '_blank')}
                                                                            size="small"
                                                                            block
                                                                        >
                                                                            Preview File
                                                                        </Button>
                                                                    )}


                                                                    {/* DOWNLOAD BUTTON */}
                                                                    <Button
                                                                        className='viewvisaapplication-download-button application-doc-download'
                                                                        type="primary"
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

                                                                    <Button
                                                                        type="default"
                                                                        onClick={() => handleResubmitDocuments(documentKey)}
                                                                        disabled={isUpdatingStatus}
                                                                        style={{ width: '50%', height: 36 }}
                                                                    >
                                                                        Resubmit {isPdfFile ? 'PDF' : 'Image'}
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
                                                                                    {renderFilePreview(url, idx, key)}
                                                                                </div>
                                                                            ))}
                                                                        </Image.PreviewGroup>
                                                                    ) : (
                                                                        renderFilePreview(value, 'single', key)
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
                                                    disabled={statusText?.toLowerCase() === "payment completed" || statusText?.toLowerCase() === "application approved" || statusText?.toLowerCase() === "application submitted" || isUpdatingStatus}
                                                >
                                                    Resubmit Documents
                                                </Button>
                                            </div>
                                        </div>

                                        {statusText && String(statusText).toLowerCase() === "passport released" && application.passportReleaseOption === "delivery" && (
                                            <div className="viewvisaapplication-delivery-details-card">
                                                <h3 className="viewvisaapplication-delivery-details-title">Delivery Details</h3>
                                                <label className="viewvisaapplication-delivery-details-label">Delivery Fee</label>
                                                <InputNumber
                                                    maxLength={6}
                                                    placeholder="Enter delivery fee"
                                                    value={deliveryFee}
                                                    onChange={(value) => setDeliveryFee(value ? String(value) : "")}
                                                    className="viewvisaapplication-delivery-details-input"
                                                    controls={false}
                                                    min={1}
                                                    stringMode
                                                    onKeyDown={handleDeliveryFeeKeyDown}
                                                    onPaste={handleDeliveryFeePaste}
                                                    formatter={(value) => {
                                                        const numericValue = String(value ?? "").replace(/\D/g, "");
                                                        if (!numericValue) return "";
                                                        const withSpaces = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                                                        return `₱ ${withSpaces}`;
                                                    }}
                                                    parser={(value) => String(value ?? "").replace(/\D/g, "")}
                                                />
                                                <label className="viewvisaapplication-delivery-details-label">Delivery Date</label>
                                                <DatePicker
                                                    showToday={false}
                                                    className="viewvisaapplication-delivery-details-date"
                                                    value={deliveryDate}
                                                    onChange={setDeliveryDate}
                                                    disabledDate={disablePastDates}
                                                />
                                                <Button
                                                    type="primary"
                                                    className="viewvisaapplication-delivery-details-button"
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
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                    <Tag color="blue">{statusText || "N/A"}</Tag>
                                                    {penaltyStateLabel && (
                                                        <Tag color={application?.reachedSecondDeadline ? 'red' : 'volcano'}>{penaltyStateLabel}</Tag>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span>Service</span>
                                                <strong>{application?.serviceName || "N/A"}</strong>
                                            </div>
                                        </div>


                                        <div style={{ border: "1px solid #dde4ef", borderRadius: 10, padding: 12, background: "#ffffff", minWidth: 280 }}>
                                            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Progress Tracker</h3>
                                            {statusSetDate && (
                                                <div style={{ marginBottom: 10, padding: 10, borderRadius: 8, background: 'rgba(48,87,151,0.06)', borderLeft: '4px solid #305797' }}>
                                                    <div style={{ fontSize: 12, color: '#333' }}>
                                                        <strong>Current status set on:</strong> {statusSetDate.format('MMM D, YYYY')}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="steps-vertical-line">
                                                <Steps
                                                    orientation="vertical"
                                                    current={currentStep}
                                                    // This is the only place that should handle the click
                                                    onChange={undefined}
                                                    items={processStepEntries.map((step, idx) => {
                                                        const stepTitle = step.title;
                                                        const stepDescription = step.description;

                                                        const stepIsCurrent = currentStep === idx;

                                                        const isTerminalStep = terminalStatuses.has(
                                                            String(stepTitle || '').toLowerCase()
                                                        );

                                                        const stepInfo = getProcessStepInfoForTitle(application, stepTitle);
                                                        const stepSetDate = stepInfo?.setDate ? dayjs(stepInfo.setDate) : null;
                                                        const stepDeadlineDate = stepInfo?.deadlineDate ? dayjs(stepInfo.deadlineDate) : null;
                                                        const daysAgo = stepSetDate ? dayjs().diff(stepSetDate, 'day') : null;
                                                        const daysLeft = stepDeadlineDate ? stepDeadlineDate.diff(dayjs(), 'day') : null;

                                                        return {
                                                            title: (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                                                        <span
                                                                            style={{
                                                                                fontWeight: stepIsCurrent ? 'bold' : 'normal',
                                                                                color: "#305797",
                                                                            }}
                                                                        >
                                                                            {stepTitle}
                                                                        </span>
                                                                    </div>

                                                                    <p style={{ fontSize: 10, color: '#555', margin: 0 }}>
                                                                        {stepDescription}
                                                                    </p>

                                                                    <div style={{ fontSize: 11, color: '#444' }}>
                                                                        {stepIsCurrent && stepSetDate && (
                                                                            <div>
                                                                                Set on: {stepSetDate.format('MMM D, YYYY')}
                                                                                {daysAgo !== null
                                                                                    ? ` • ${daysAgo} days ago`
                                                                                    : ''}
                                                                            </div>
                                                                        )}

                                                                        {stepDeadlineDate && (
                                                                            <div
                                                                                style={{
                                                                                    color: stepDeadlineDate.isBefore(dayjs(), 'day')
                                                                                        ? '#ff4d4f'
                                                                                        : '#333'
                                                                                }}
                                                                            >
                                                                                Deadline: {stepDeadlineDate.format('MMM D, YYYY')}
                                                                                ({daysLeft} days left)
                                                                            </div>
                                                                        )}
                                                                    </div>

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
                                                        };
                                                    })}
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
                centered={true}
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
                centered={true}
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
