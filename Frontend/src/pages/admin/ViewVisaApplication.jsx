import React, { useEffect, useState } from "react";
import { Card, Descriptions, Tag, Steps, Button, Spin, Divider, Typography, Image, ConfigProvider, message, Switch, Checkbox } from "antd";
import { useParams, useNavigate } from "react-router-dom";
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

                setCurrentStep(statusMap[appData.status] ?? 0);

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

    if (loading) {
        return <Spin style={{ marginTop: 60 }} size="large" />;
    }

    if (!application) {
        return null;
    }

    // Handler to update status (simulate backend update)
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

    // Improved custom progress dot renderer with better spacing and wrapping
    const customProgressDot = (dot, { index }) => (
        <div style={{ position: 'relative', textAlign: 'center', minWidth: 110, padding: '0 8px' }}>
            <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: index <= currentStep ? '#305797' : '#222',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 18,
                margin: '0 auto',
                border: index === currentStep ? '2.5px solid #1890ff' : '2.5px solid #bbb',
                boxShadow: index === currentStep ? '0 0 0 2px #e6f7ff' : undefined,
                zIndex: 2
            }}>
                {index < currentStep ? <span style={{ fontSize: 20 }}>✓</span> : index + 1}
            </div>
            <div style={{ marginTop: 10, fontWeight: index === currentStep ? 700 : 500, color: index === currentStep ? '#305797' : '#222', fontSize: 15, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.2 }}>
                {application.visaProcessSteps[index]}
            </div>
            <div style={{ color: '#888', fontSize: 13, marginTop: 2, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.2 }}>{application.visaProcessSteps[index]}</div>
            <div style={{ marginTop: 10, marginBottom: 8 }}>
                <Checkbox
                    checked={index <= currentStep}
                    disabled={!progressEditable}
                    style={{ fontSize: 14 }}
                    onChange={(e) => {
                        if (!progressEditable) return;
                        if (e.target.checked) {
                            if (index === currentStep + 1) {
                                handleStepChange(index);
                            }
                        } else {
                            if (index === currentStep) {
                                handleStepChange(index - 1 >= 0 ? index - 1 : 0);
                            }
                        }
                    }}
                >Done</Checkbox>
            </div>
        </div>
    );

    return (
        <ConfigProvider theme={{ token: { colorPrimary: "#305797" } }}>
            <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
                <Button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
                    Back
                </Button>
                <Title level={2} style={{ marginBottom: 16 }}>Visa Application Details</Title>
                <Card>
                    <Descriptions bordered column={2} size="middle">
                        <Descriptions.Item label="Application Number">{application.applicationNumber}</Descriptions.Item>
                        <Descriptions.Item label="Applicant Name">{application.applicantName}</Descriptions.Item>
                        <Descriptions.Item label="Purpose of Travel">{application.purposeOfTravel}</Descriptions.Item>
                        <Descriptions.Item label="Preferred Date">{application.preferredDate ? dayjs(application.preferredDate).format("MMM DD, YYYY") : "Not Set"}</Descriptions.Item>
                        <Descriptions.Item label="Preferred Time">{application.preferredTime || "Not Set"}</Descriptions.Item>
                        <Descriptions.Item label="Visa Type">
                            <Tag color="blue">{application.serviceName}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Status">
                            <Tag color={
                                application.status === "Pending" ? "orange" :
                                    application.status === "Approved" ? "green" :
                                        application.status === "Rejected" ? "red" :
                                            application.status === "Processing" ? "blue" : "default"
                            }>
                                {application.status}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Date Submitted">{application.createdAt ? dayjs(application.createdAt).format("MMM DD, YYYY hh:mm A") : "N/A"}</Descriptions.Item>
                        <Descriptions.Item label="Progress Editable">
                            <Switch checked={progressEditable} onChange={setProgressEditable} />
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                <Divider orientation="left" style={{ marginTop: 32 }}>Progress Tracker</Divider>
                <div style={{ maxWidth: 1200, margin: "0 auto 32px auto", overflowX: 'auto', paddingBottom: 12 }}>
                    <Steps
                        current={currentStep}
                        progressDot={customProgressDot}
                        onChange={progressEditable ? handleStepChange : undefined}
                        items={application.visaProcessSteps.map((step, idx) => ({ key: step.title }))}
                        style={{ minWidth: 1100 }}
                    />
                </div>

                <Divider orientation="left">Submitted Documents</Divider>
                <Card>
                    {application.documents && application.documents.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                            {application.documents.map((doc, idx) => (
                                <div key={idx} style={{ textAlign: "center" }}>
                                    <Image
                                        src={doc.url}
                                        alt={doc.name || `Document ${idx + 1}`}
                                        width={180}
                                        style={{ borderRadius: 8, marginBottom: 8 }}
                                        fallback="/images/file-placeholder.png"
                                    />
                                    <div>{doc.name || `Document ${idx + 1}`}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>No documents submitted.</div>
                    )}
                </Card>
            </div>
        </ConfigProvider>
    );
}
