import React, { useCallback, useEffect, useState } from "react";
import { Descriptions, Tag, Steps, Button, Spin, Divider, Typography, Image, ConfigProvider, Switch, Checkbox, DatePicker, TimePicker, Modal, notification } from "antd";
import { ArrowLeftOutlined, DownloadOutlined, FilePdfOutlined, CheckCircleFilled, EyeOutlined } from "@ant-design/icons";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/viewpassportapplication.css";
import dayjs from "dayjs";

const { Title } = Typography;

//STATUS STEPS FOR PASSPORT APPLICATION
const statusSteps = [
    { title: "Application Submitted", summary: "Application Submitted" },
    { title: "Application Approved", summary: "Application Approved" },
    { title: "Payment Completed", summary: "Payment Completed" },
    { title: "Documents Uploaded", summary: "Documents Uploaded" },
    { title: "Documents Approved", summary: "Documents Approved" },
    { title: "Documents Received", summary: "Documents Received" },
    { title: "Documents Submitted", summary: "Documents Submitted" },
    { title: "Processing by DFA", summary: "Processing by DFA" },
    { title: "DFA Approved", summary: "DFA Approved" },
    { title: "Passport Released", summary: "Passport Released" },
];

export default function ViewPassportApplication() {
    const location = useLocation();
    const { applicationId } = location.state || {};
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
    const [hasProcessedRejection, setHasProcessedRejection] = useState(false);

    const fetchApplication = useCallback(async () => {
        try {
            setLoading(true);
            const response = await apiFetch.get(`/passport/applications/${applicationId}`);


            setApplication(response);
            // Determine step based on status
            const statusMap = statusSteps.reduce((acc, step, idx) => {
                acc[step.title] = idx;
                return acc;
            }, {});
            setCurrentStep(statusMap[response.status] ?? 0);
        } catch (error) {
            notification.error({ message: "Failed to load application details.", placement: "topRight" });
            navigate(-1);
        } finally {
            setLoading(false);
        }
    }, [applicationId, navigate]);

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


    const applicantName = `${application?.userId?.firstname || ''} ${application?.userId?.lastname || ''}`.trim();

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

            await apiFetch.put(`/passport/applications/${applicationId}/suggest-appointments`, { slots });

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

    const handleResubmitDocuments = async (documentKey) => {
        if (isUpdatingStatus) return;

        if (!documentKey) {
            notification.warning({ message: "Please select a document to resubmit.", placement: "topRight" });
            return;
        }

        try {
            setIsUpdatingStatus(true);
            const response = await apiFetch.put(`/passport/applications/${applicationId}/resubmit-documents`, {
                documentKey
            });
            await fetchApplication();

            setIsResubmitDocumentsSentModalOpen(true);
        } catch (error) {
            notification.error({ message: "Failed to update status", placement: "topRight" });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    //GET PASSPORT APPLICATION DETAILS ON COMPONENT MOUNT ------------------------------------------------------
    useEffect(() => {
        fetchApplication();
    }, [fetchApplication]);



    // Compute when the current status was set and a deadline (days) for action
    const statusDeadlineDaysMap = {
        'Payment Completed': 5,
    };

    const appointmentDate = application?.preferredDate
        ? dayjs(application.preferredDate)
        : application?.suggestedAppointmentScheduleChosen && application.suggestedAppointmentScheduleChosen.date
            ? dayjs(application.suggestedAppointmentScheduleChosen.date)
            : null;

    // Use backend-provided processSteps if available
    const getProcessStepInfo = (stepTitle) => {
        if (!application?.processSteps || !application.processSteps[stepTitle]) {
            return { setDate: null, deadlineDate: null };
        }
        const step = application.processSteps[stepTitle];
        return {
            setDate: step.setDate ? dayjs(step.setDate) : null,
            deadlineDate: step.deadlineDate ? dayjs(step.deadlineDate) : null,
        };
    };
    const getStatusSetDate = (app) => {
        if (!app) return null;
        // prefer explicit status history entry
        const history = app.statusHistory;
        if (Array.isArray(history) && history.length > 0) {
            // find last entry matching current status
            for (let i = history.length - 1; i >= 0; i--) {
                const h = history[i];
                if (String(h.status).toLowerCase() === String(app.status).toLowerCase()) {
                    return dayjs(h.changedAt);
                }
            }
        }
        // fallback to explicit timestamp fields
        if (app.statusUpdatedAt) return dayjs(app.statusUpdatedAt);
        if (app.updatedAt) return dayjs(app.updatedAt);
        if (app.createdAt) return dayjs(app.createdAt);
        return null;
    };

    const currentStatusSetDate = getStatusSetDate(application);
    const deadlineDays = application?.statusDeadlineDays ?? statusDeadlineDaysMap[application?.status] ?? null;
    const statusDeadlineDate = application?.statusDeadlineDate
        ? dayjs(application.statusDeadlineDate)
        : appointmentDate && Number.isFinite(deadlineDays)
            ? appointmentDate.subtract(deadlineDays, 'day').startOf('day')
            : null;
    const penaltyStateLabel = application?.reachedSecondDeadline
        ? 'Penalty Expired'
        : application?.secondChance
            ? 'Penalty Paid'
            : application?.onPenalty
                ? 'On Penalty'
                : null;
    // Auto-reject application if deadline is passed
    useEffect(() => {
        if (!application || !statusDeadlineDate || hasProcessedRejection) return;

        const terminalStatuses = ['Rejected', 'Passport Released'];
        if (terminalStatuses.includes(application.status)) return;

        const isDeadlinePassed = statusDeadlineDate.isBefore(dayjs(), 'day');
        if (isDeadlinePassed) {
            setHasProcessedRejection(true);
            const updateStatus = async () => {
                try {
                    await apiFetch.put(
                        `/passport/applications/${applicationId}/status`,
                        { status: 'Rejected' },
                        { withCredentials: true }
                    );
                    notification.warning({
                        message: 'Application Rejected',
                        description: 'Application has been auto-rejected due to missed deadline.',
                        placement: 'topRight'
                    });
                    setApplication(prev => ({ ...prev, status: 'Rejected' }));
                } catch (err) {
                    console.error('Failed to auto-reject application:', err);
                }
            };
            updateStatus();
        }
    }, [statusDeadlineDate, application, hasProcessedRejection, applicationId]);

    // Helper: get when a particular step/status was set from statusHistory (fallback none)
    const getStepSetDateForTitle = (app, title) => {
        if (!app || !title) return null;
        const history = app.statusHistory;
        if (Array.isArray(history) && history.length > 0) {
            for (let i = history.length - 1; i >= 0; i--) {
                const h = history[i];
                if (String(h.status).toLowerCase() === String(title).toLowerCase()) {
                    return dayjs(h.changedAt);
                }
            }
        }
        return null;
    };

    // Get the most recent staff/admin who changed the status (if available)
    const getManagerName = (app) => {
        try {
            if (!app) return null;
            const history = app.statusHistory;
            if (Array.isArray(history) && history.length > 0) {
                const applicantId = String(app.userId?._id || app.userId || '');
                const applicantName = String(app.username || '').trim().toLowerCase();

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

    //RENDER UPLOAD DOCUMENTS
    const renderReadOnlyFile = (url, label) => {
        // Check if the URL contains '.pdf' (case insensitive)
        const isPdf = typeof url === 'string' && url.toLowerCase().split(/[?#]/)[0].endsWith('.pdf');

        const handleDownload = () => {
            if (!url) return;
            const downloadUrl = url.includes('cloudinary.com')
                ? url.replace('/upload/', '/upload/fl_attachment/')
                : url;
            window.location.href = downloadUrl;
        };

        if (!url) return <div style={{ fontSize: 13, color: '#6b7280' }}>No file</div>;

        return (
            <div className="application-doc-item" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch' }}>
                <Button
                    className="viewpassport-preview-button"
                    size="small"
                    type="default"
                    icon={<EyeOutlined />}
                    onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                >
                    {isPdf ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <FilePdfOutlined style={{ color: '#ff4d4f' }} /> Preview File
                        </span>
                    ) : (
                        'Preview File'
                    )}
                </Button>

                <Button
                    className='viewpassportapplication-download-button application-doc-download'
                    type="primary"
                    icon={<DownloadOutlined />}
                    size="small"
                    onClick={handleDownload}
                >
                    Download {isPdf ? 'PDF' : 'File'}
                </Button>
            </div>
        );
    };

    const normalizeLabel = (value) => (
        String(value)
            .replace(/_/g, " ")
            .replace(/([A-Z])/g, " $1")
            .trim()
    );

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
            Object.entries(docs).forEach(([key, value]) => {
                if (!value) return;

                if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        if (!item) return;
                        if (typeof item === "string") {
                            list.push({ url: item, name: `${normalizeLabel(key)} ${index + 1}` });
                            return;
                        }
                        if (item.url) {
                            list.push({
                                url: item.url,
                                name: item.name || item.label || `${normalizeLabel(key)} ${index + 1}`
                            });
                        }
                    });
                    return;
                }

                if (typeof value === "string") {
                    list.push({ url: value, name: normalizeLabel(key) });
                    return;
                }

                if (value.url) {
                    list.push({
                        url: value.url,
                        name: value.name || value.label || normalizeLabel(key)
                    });
                }
            });
        }

        return list;
    };

    const submittedDocuments = buildDocumentList(application?.submittedDocuments || application?.documents);

    // STATUS UPDATE HANDLER ------------------------------------------------------
    const handleStepChange = async (stepIdx) => {
        if (!progressEditable || isUpdatingStatus) return;
        // Map step index to status string
        const statusArr = statusSteps.map(step => step.title);
        const newStatus = statusArr[stepIdx];
        if (!newStatus || newStatus === application.status) return;
        try {
            setIsUpdatingStatus(true);
            // You should update this endpoint to PATCH/PUT to your backend for real update
            await apiFetch.put(`/passport/applications/${applicationId}/status`, { status: newStatus });
            await fetchApplication();
            notification.success({ message: `Status updated to ${newStatus}`, placement: "topRight" });
        } catch (err) {
            notification.error({ message: "Failed to update status", placement: "topRight" });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    //DFA REJECTED HANDLER ------------------------------------------------------
    const handleDFARejected = async () => {
        try {
            setIsUpdatingStatus(true);
            await apiFetch.put(`/passport/applications/${applicationId}/status`, { status: "Rejected" });
            await fetchApplication();
            notification.success({ message: "Application marked as DFA Rejected", placement: "topRight" });
        } catch (err) {
            notification.error({ message: "Failed to update status", placement: "topRight" });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleDFAApproved = async () => {
        try {
            setIsUpdatingStatus(true);
            await apiFetch.put(`/passport/applications/${applicationId}/status`, { status: "DFA Approved" });
            await fetchApplication();
            notification.success({ message: "Application marked as DFA Approved", placement: "topRight" });
        } catch (err) {
            notification.error({ message: "Failed to update status", placement: "topRight" });
        } finally {
            setIsUpdatingStatus(false);
        }
    }


    // DISABLE PAST DATES AND WEEKENDS IN DATE PICKER -----------------------------------------------------
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
        <ConfigProvider
            theme={{ token: { colorPrimary: "#305797" } }}>
            {loading || isSubmittingSlots || isUpdatingStatus ? (
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
                </div>
            ) : (
                <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
                    <Button type="primary" onClick={() => navigate(-1)} style={{ marginBottom: 16 }} className="viewpassportapplication-back-button">
                        <ArrowLeftOutlined />
                        Back
                    </Button>
                    <div className="app-detail-header">
                        <div className="app-detail-titleblock">
                            <Title level={2} style={{ marginBottom: 4 }}>Passport Application Details</Title>
                            <p className="app-detail-subtitle">Review submissions, manage status, and handle appointment actions.</p>
                        </div>
                    </div>

                    {/* WAITING FOR APPLICANT TO CHOOSE SUGGESTED APPOINTMENT OPTION */}
                    {application.status && application.status.toLowerCase() === "application submitted" &&
                        application.suggestedAppointmentScheduleChosen.date === "" && application.suggestedAppointmentScheduleChosen.time === "" &&
                        application.suggestedAppointmentSchedules !== null && application.suggestedAppointmentSchedules.length > 0 &&
                        (
                            <div className="viewpassportapplication-tag-yellow-container">
                                <h2 className="viewpassportapplication-tag-yellow">AWAITING APPLICANT RESPONSE</h2>
                                <p style={{ fontSize: 14, marginBottom: 8 }}>
                                    You have suggested appointment schedules for this application. Kindly wait for the applicant's response. We will notify you once they have chosen an option.
                                </p>
                            </div>
                        )}

                    {/* APPLICANT HAS CHOSEN A SUGGESTED APPOINTMENT OPTION */}
                    {application.status && application.status.toLowerCase() === "application submitted" &&
                        application.suggestedAppointmentScheduleChosen.date !== "" && application.suggestedAppointmentScheduleChosen.time !== "" && (
                            <div className="viewpassportapplication-tag-green-container">
                                <h2 className="viewpassportapplication-tag-green">APPLICANT RESPONSE RECEIVED</h2>
                                <p style={{ fontSize: 14, marginBottom: 8 }}>
                                    The applicant has chosen their preferred appointment schedule.
                                </p>
                                <strong style={{ fontSize: 16 }}>
                                    {dayjs(application.suggestedAppointmentScheduleChosen?.date).format("MMM DD, YYYY")} at {application.suggestedAppointmentScheduleChosen?.time}
                                </strong>
                            </div>
                        )}



                    <div className="app-detail-shell" style={{ marginTop: 24, border: '1px solid #dde4ef', borderRadius: 12, padding: 20, background: '#ffffff', boxShadow: '0 6px 20px rgba(18, 24, 38, 0.06)', display: "flex", flexDirection: "column", gap: 24 }}>

                        {/* APPLICATION DETAILS */}
                        <div style={{ minWidth: 280 }}>
                            <div style={{ display: "flex", flexDirection: "row", gap: 24, flexWrap: "wrap" }}>
                                <div style={{ flex: "1 1 620px", minWidth: 320 }}>
                                    <Descriptions bordered column={descriptionColumn} size="middle">
                                        <Descriptions.Item label="Application Number">{application?.applicationNumber}</Descriptions.Item>
                                        <Descriptions.Item label="Applicant Name">{applicantName || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="DFA Location">{application?.dfaLocation}</Descriptions.Item>
                                        <Descriptions.Item label="Preferred Date">{application.preferredDate ? dayjs(application.preferredDate).format("MMM DD, YYYY") : "Not Set"}</Descriptions.Item>
                                        <Descriptions.Item label="Preferred Time">{application.preferredTime || "Not Set"}</Descriptions.Item>
                                        <Descriptions.Item label="Passport Type">
                                            <Tag color="blue">{application.applicationType}</Tag>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Date Submitted">{application.createdAt ? dayjs(application.createdAt).format("MMM DD, YYYY hh:mm A") : "N/A"}</Descriptions.Item>
                                        <Descriptions.Item label="Managed by">{managerName || 'N/A'}</Descriptions.Item>
                                        <Descriptions.Item label="Progress Editable">
                                            <Switch checked={progressEditable} onChange={setProgressEditable} />
                                        </Descriptions.Item>
                                    </Descriptions>

                                    {/* DFA APPROVE OR REJECT OPTION WHEN STATUS IS PROCESSING BY DFA */}
                                    {application.status && application.status.toLowerCase() === "processing by dfa" && (
                                        <div style={{ minWidth: 280, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                                            <h3 style={{ marginTop: 0 }}>DFA Processing Actions</h3>
                                            <Button type="primary" onClick={handleDFAApproved} className="viewpassportapplication-dfa-processing-approve-button">
                                                DFA Approved
                                            </Button>
                                            <Button type="primary" onClick={handleDFARejected} className="viewpassportapplication-dfa-processing-reject-button" style={{ marginLeft: 8 }}>
                                                DFA Rejected
                                            </Button>
                                        </div>
                                    )}


                                    {/* SUGGEST APPOINTMENT DATES AND TIMES IF APPLICATION IS STILL SUBMITTED */}
                                    {application.status && application.status.toLowerCase() === "application submitted" && (
                                        <div>
                                            <div style={{ minWidth: 280, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff', marginTop: 16 }}>
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
                                                        <Button type="primary" onClick={handleSubmitAlternateSlots} className="viewpassportapplication-submit-button">
                                                            Submit Options
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    )}




                                    {/* VIEW SUBMITTED DOCUMENTS */}
                                    <div style={{ minWidth: 280, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, marginTop: 16, background: '#ffffff' }}>
                                        <h3 style={{ marginTop: 0 }}>Submitted Documents</h3>
                                        {submittedDocuments.length > 0 ? (
                                            <div className="application-documents-grid">
                                                {(() => {
                                                    const docs = application.submittedDocuments || {
                                                        birthCertificate: application.birthCertificate,
                                                        applicationForm: application.applicationForm,
                                                        govId: application.govId
                                                    };

                                                    return (
                                                        <>
                                                            {docs.birthCertificate && (
                                                                <div style={{ width: "320px" }}>
                                                                    <b style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>PSA Birth Certificate:</b>
                                                                    {renderReadOnlyFile(docs.birthCertificate, "Birth Certificate")}
                                                                    <div style={{ marginTop: 8 }}>
                                                                        <Button
                                                                            type="default"
                                                                            onClick={() => handleResubmitDocuments('birthCertificate')}
                                                                            disabled={isUpdatingStatus}
                                                                        >
                                                                            Resubmit
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {docs.applicationForm && (
                                                                <div style={{ width: "320px" }}>
                                                                    <b style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>Application Form:</b>
                                                                    {renderReadOnlyFile(docs.applicationForm, "Application Form")}
                                                                    <div style={{ marginTop: 8 }}>
                                                                        <Button
                                                                            type="default"
                                                                            onClick={() => handleResubmitDocuments('applicationForm')}
                                                                            disabled={isUpdatingStatus}
                                                                        >
                                                                            Resubmit
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {docs.govId && (
                                                                <div style={{ width: "320px" }}>
                                                                    <b style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>Government-issued ID:</b>
                                                                    {renderReadOnlyFile(docs.govId, "Government ID")}
                                                                    <div style={{ marginTop: 8 }}>
                                                                        <Button
                                                                            type="default"
                                                                            onClick={() => handleResubmitDocuments('govId')}
                                                                            disabled={isUpdatingStatus}
                                                                        >
                                                                            Resubmit
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}


                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
                                                No documents submitted.
                                            </div>
                                        )}
                                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                                            <div style={{ fontSize: 13, color: '#6b7280' }}>Use the Resubmit button on the specific document that needs to be reuploaded.</div>
                                        </div>
                                    </div>

                                </div>

                                <div style={{ flex: "1 1 300px", minWidth: 280 }}>
                                    <div style={{ marginBottom: 16, border: "1px solid #dde4ef", borderRadius: 10, padding: 12, background: "#f9fbff" }}>
                                        <p className="app-detail-kicker" style={{ marginBottom: 6 }}>Overview</p>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                            <span>Status</span>
                                            <Tag color="blue">{application?.status || "N/A"}</Tag>
                                            {penaltyStateLabel && (
                                                <Tag color={application?.reachedSecondDeadline ? 'red' : 'volcano'}>{penaltyStateLabel}</Tag>
                                            )}
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span>Service</span>
                                            <strong>{application?.applicationType || "N/A"}</strong>
                                        </div>
                                    </div>

                                    <div style={{ border: "1px solid #dde4ef", borderRadius: 10, padding: 12, background: "#ffffff", minWidth: 280 }}>
                                        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Progress Tracker</h3>
                                        {currentStatusSetDate && (
                                            <div style={{ marginBottom: 10, padding: 10, borderRadius: 8, background: 'rgba(48,87,151,0.06)', borderLeft: '4px solid #305797' }}>
                                                <div style={{ fontSize: 12, color: '#333' }}><strong>Current status set on:</strong> {currentStatusSetDate.format('MMM D, YYYY')}</div>
                                            </div>
                                        )}
                                        <Steps
                                            className="passport-progress-steps"
                                            orientation="vertical"
                                            current={currentStep}
                                            // This single handler manages everything
                                            onChange={progressEditable && !isUpdatingStatus ? handleStepChange : undefined}
                                            items={statusSteps.map((step, idx) => {
                                                // Prefer processSteps data from backend
                                                const processStepInfo = getProcessStepInfo(step.title);
                                                const stepSetDate = processStepInfo.setDate || getStepSetDateForTitle(application, step.title);
                                                const daysAgo = stepSetDate ? dayjs().diff(stepSetDate, 'day') : null;
                                                const stepDeadlineDays = statusDeadlineDaysMap[step.title] ?? null;

                                                let stepDeadlineDate = processStepInfo.deadlineDate || null;

                                                // If backend didn't provide deadline, fall back to previous client logic
                                                if (!stepDeadlineDate) {
                                                    if (application?.statusDeadlineDate && String(application.status) === String(step.title)) {
                                                        stepDeadlineDate = dayjs(application.statusDeadlineDate);
                                                    } else if (stepSetDate && Number.isFinite(stepDeadlineDays)) {
                                                        stepDeadlineDate = stepSetDate.add(stepDeadlineDays, 'day').startOf('day');
                                                    } else if (appointmentDate && Number.isFinite(stepDeadlineDays)) {
                                                        if (step.title === 'Processing by DFA' || stepDeadlineDays === 0) {
                                                            stepDeadlineDate = appointmentDate.startOf('day');
                                                        } else {
                                                            stepDeadlineDate = appointmentDate.subtract(stepDeadlineDays, 'day').startOf('day');
                                                        }
                                                    }
                                                }

                                                const daysLeft = stepDeadlineDate ? stepDeadlineDate.diff(dayjs(), 'day') : null;
                                                const hoursLeft = stepDeadlineDate ? stepDeadlineDate.diff(dayjs(), 'hour') : null;
                                                const isOverdue = stepDeadlineDate ? stepDeadlineDate.isBefore(dayjs()) : false;

                                                return {
                                                    title: (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '6px 8px 10px 0', width: '100%', maxWidth: '100%' }}>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, width: '100%' }}>
                                                                <span style={{
                                                                    fontWeight: currentStep === idx ? 'bold' : 'normal',
                                                                    fontSize: 15,
                                                                    color: "#305797",
                                                                    textAlign: 'left',
                                                                    whiteSpace: 'normal',
                                                                    lineHeight: 1.25,
                                                                    wordBreak: 'break-word',
                                                                    maxWidth: '100%',
                                                                }}>
                                                                    {step.title}
                                                                </span>
                                                            </div>

                                                            <p style={{ fontSize: 11, color: '#555', margin: 0, textAlign: 'left', whiteSpace: 'normal', lineHeight: 1.4, maxWidth: '100%' }}>{step.summary || `Status: ${step.title}`}</p>

                                                            <div style={{ fontSize: 11, color: '#444', textAlign: 'left', lineHeight: 1.45, maxWidth: '100%' }}>
                                                                {currentStep === idx && stepSetDate && (
                                                                    <div>Set on: {stepSetDate.format('MMM D, YYYY')}{daysAgo !== null ? ` • ${daysAgo} days ago` : ''}</div>
                                                                )}

                                                                {stepDeadlineDate && (
                                                                    <div style={{ color: isOverdue ? '#ff4d4f' : '#333' }}>
                                                                        Deadline: {stepDeadlineDate.format('MMM D, YYYY')} ({isOverdue ? 'Deadline overdue' : (daysLeft === 0 ? (hoursLeft > 1 ? `${hoursLeft} hours left` : hoursLeft === 1 ? '1 hour left' : 'Less than 1 hour left') : `${daysLeft} days left`)})
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <Checkbox
                                                                checked={idx <= currentStep}
                                                                disabled={!progressEditable}
                                                                style={{ fontSize: 14, pointerEvents: 'none' }}
                                                            >
                                                                Done
                                                            </Checkbox>
                                                        </div>
                                                    )
                                                };
                                            })}
                                        />
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

        </ConfigProvider >
    );
}
