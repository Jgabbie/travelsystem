import React, { useEffect, useState } from "react";
import { Card, Descriptions, Tag, Steps, Button, Spin, Divider, Typography, Image, ConfigProvider, message, Switch, Checkbox, DatePicker, TimePicker } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useParams, useNavigate } from "react-router-dom";
import "../../style/admin/viewvisaapplication.css"
import axiosInstance from "../../config/axiosConfig";
import dayjs from "dayjs";

const { Title } = Typography;

export default function ViewVisaApplication() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [progressEditable, setProgressEditable] = useState(false);
    const [alternateSlots, setAlternateSlots] = useState([
        { date: null, time: null },
        { date: null, time: null },
        { date: null, time: null }
    ]);

    const handleSubmitAlternateSlots = () => {
        message.success("Suggested appointment options submitted.");
    };


    useEffect(() => {
        const fetchApplicationAndService = async () => {
            try {
                setLoading(true);
                // 1. Fetch the application first
                const appResponse = await axiosInstance.get(`/visa/applications/${id}`);
                const appData = appResponse.data;

                // 2. Determine current step
                const visaProcessSteps = appData.visaProcessSteps || []; // might be undefined if service not fetched yet

                // if visaProcessSteps already exist in appData
                const statusMap = visaProcessSteps.reduce((acc, step, idx) => {
                    acc[step.title] = idx;
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
                        const serviceResponse = await axiosInstance.get(`/services/get-service/${serviceId}`);
                        const serviceData = serviceResponse.data;

                        console.log("Fetched visa service details:", serviceData);

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

    console.log("Fetched application details:", application);

    const statusText = Array.isArray(application?.status)
        ? application.status[application.status.length - 1]
        : application?.status;

    const normalizeLabel = (value) => (
        String(value)
            .replace(/_/g, " ")
            .replace(/([A-Z])/g, " $1")
            .trim()
    );

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
        if (!progressEditable) return;
        // Map step index to status string
        const statusArr = application.visaProcessSteps.map(step => step);
        const newStatus = statusArr[stepIdx];

        console.log("Attempting to update visa application status to:", newStatus);

        try {
            // You should update this endpoint to PATCH/PUT to your backend for real update
            await axiosInstance.put(`/visa/applications/${id}/status`, { status: newStatus });
            setApplication((prev) => ({ ...prev, status: newStatus }));
            setCurrentStep(stepIdx);
            message.success(`Status updated to ${newStatus}`);
        } catch (err) {
            message.error("Failed to update status");
        }
    };

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
            {loading ? (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "80vh"
                    }}
                >
                    <Spin size="large" description="Loading application details..." />
                </div>) :
                (
                    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
                        <Button onClick={() => navigate(-1)} style={{ marginBottom: 16 }} className="viewvisaapplication-back-button">
                            <ArrowLeftOutlined />
                            Back
                        </Button>
                        <Title level={2} style={{ marginBottom: 16 }}>Visa Application Details</Title>
                        <div style={{ display: "flex", flexDirection: "row", gap: 32 }}>
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
                                                <Button type="primary" onClick={handleSubmitAlternateSlots}>
                                                    Submit Options
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                <Divider orientation="left">Submitted Documents</Divider>
                                <Card>
                                    {submittedDocuments.length > 0 ? (
                                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                            {submittedDocuments.map((doc, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        gap: 16
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 600 }}>
                                                        {doc.name || `Document ${idx + 1}`}
                                                    </div>
                                                    <Image
                                                        src={doc.url}
                                                        alt={doc.name || `Document ${idx + 1}`}
                                                        width={180}
                                                        style={{ borderRadius: 8 }}
                                                        fallback="/images/file-placeholder.png"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div>No documents submitted.</div>
                                    )}
                                </Card>

                            </div>

                            <div style={{ display: "flex", flexDirection: "column", minWidth: 300 }}>
                                <div style={{ maxWidth: 300, margin: "0 auto 0 auto", paddingBottom: 12 }}>
                                    <Card title="Progress Tracker" style={{ minWidth: 280, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                                        <div className="steps-vertical-line">
                                            <Steps
                                                direction="vertical"
                                                current={currentStep}
                                                onChange={progressEditable ? handleStepChange : undefined}
                                                items={
                                                    application.visaProcessSteps.map((step, idx) => ({
                                                        title: (
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '0 8px' }}>
                                                                <span style={{
                                                                    fontWeight: currentStep === idx ? 'bold' : 'normal',
                                                                    fontSize: 16,
                                                                    color: "#305797",
                                                                    textAlign: 'center',
                                                                    whiteSpace: 'nowrap',
                                                                }}>
                                                                    {step}
                                                                </span>

                                                                <p style={{ fontSize: 10, color: '#555' }}>Description for {step}</p>

                                                                <Checkbox
                                                                    checked={idx <= currentStep}
                                                                    disabled={!progressEditable}
                                                                    style={{ fontSize: 14 }}
                                                                    onChange={(e) => {
                                                                        if (!progressEditable) return;
                                                                        if (e.target.checked) {
                                                                            if (idx === currentStep + 1) {
                                                                                handleStepChange(idx);
                                                                            }
                                                                        } else {
                                                                            if (idx === currentStep) {
                                                                                handleStepChange(idx - 1 >= 0 ? idx - 1 : 0);
                                                                            }
                                                                        }
                                                                    }}
                                                                >Done
                                                                </Checkbox>
                                                            </div>
                                                        )
                                                    }))
                                                }
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
