import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Steps, Card, Spin, message, Upload, Button, Tag, Descriptions, ConfigProvider } from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axiosInstance from '../../config/axiosConfig';
import TopNavUser from '../../components/TopNavUser';
import dayjs from 'dayjs';

const VISA_STEPS = [
    {
        title: 'Application submitted',
        description: 'Application submitted',
    },
    {
        title: 'Application approved',
        description: 'Application approved',
    },
    {
        title: 'Payment complete',
        description: 'Payment complete',
    },
    {
        title: 'Documents uploaded',
        description: 'Documents uploaded',
    },
    {
        title: 'Documents approved',
        description: 'Documents approved',
    },
    {
        title: 'Documents received',
        description: 'Documents received',
    },
    {
        title: 'Documents submitted',
        description: 'Documents submitted',
    },
    {
        title: 'Processing DFA',
        description: 'Processing | DFA',
    },
];

export default function VisaApplication() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [uploading, setUploading] = useState(false);
    // Dynamic requirements
    const [requirements, setRequirements] = useState([]);
    const [requirementFiles, setRequirementFiles] = useState({});
    const [process, setProcess] = useState(VISA_STEPS.map(s => ({ ...s, status: 'pending' })));

    useEffect(() => {
        const fetchApplication = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(`/visa/applications/${id}`);
                setApplication(res.data);
                // If the application has a serviceId, fetch the service for requirements
                if (res.data && res.data.serviceId) {
                    try {
                        const serviceId = res.data.serviceId._id || res.data.serviceId;
                        const serviceRes = await axiosInstance.get(`/services/get-service/${serviceId}`);
                        console.log('Service details for requirements:', serviceRes.data);
                        setRequirements(serviceRes.data.visaRequirements || []);
                        setProcess(serviceRes.data.visaProcessSteps.map((step, idx) => ({
                            title: step,
                            description: step,
                            status: idx < VISA_STEPS.length ? 'process' : 'pending',
                        })));
                    } catch (err) {
                        setRequirements([]);
                        setProcess(VISA_STEPS.map(s => ({ ...s, status: 'pending' })));
                    }
                } else {
                    setRequirements([]);
                }
            } catch (err) {
                message.error('Failed to load visa application details');
            } finally {
                setLoading(false);
            }
        };
        fetchApplication();
    }, [id]);

    // Find the current step index based on status
    const currentStep = application
        ? Math.max(
            0,
            VISA_STEPS.findIndex(
                s =>
                    (s.title || '').toLowerCase() === (application.status || '').toLowerCase()
            )
        )
        : 0;

    // Generalized upload handler for dynamic requirements
    const handleUpload = (requirementKey) => async ({ file, onSuccess, onError }) => {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', requirementKey); // Pass the requirement key/type to backend
        try {
            await axiosInstance.post(`/visa/applications/${id}/upload-requirement`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            message.success('File uploaded successfully');
            onSuccess('ok');
        } catch (err) {
            message.error('Upload failed');
            onError(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            <div className="user-bookings-page">
                <TopNavUser />
                <div className="user-bookings-container" style={{ maxWidth: 900, margin: '0 auto' }}>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        style={{ marginTop: 24, marginBottom: 8 }}
                        onClick={() => navigate('/user-applications')}
                    >
                        Back
                    </Button>
                    <h2 style={{ marginTop: 24 }}>Visa Application Details</h2>
                    <Spin spinning={loading}>
                        {application && (
                            <>
                                <Card style={{ marginBottom: 32 }}>
                                    <Descriptions title="Application Info" bordered column={1}>
                                        <Descriptions.Item label="Reference">{application.applicationNumber || application._id}</Descriptions.Item>
                                        <Descriptions.Item label="Status"><Tag color="blue">{application.status}</Tag></Descriptions.Item>
                                        <Descriptions.Item label="Date Submitted">{dayjs(application.createdAt).format('MMM D, YYYY')}</Descriptions.Item>
                                        <Descriptions.Item label="Applicant Name">{application.applicantName || application.user?.name}</Descriptions.Item>
                                        {/* Add more fields as needed */}
                                    </Descriptions>
                                </Card>
                                <Card title="Progress Tracker" style={{ marginBottom: 32, height: 180 }}>
                                    <div style={{ overflowX: 'auto', paddingBottom: 24 }}>
                                        <Steps
                                            direction="horizontal"
                                            size="default"
                                            current={currentStep}
                                            style={{ minWidth: 1100, width: 'max-content' }}
                                            items={process.map((step, idx) => ({
                                                title: (
                                                    <span style={{
                                                        fontWeight: currentStep === idx ? 'bold' : 'normal',
                                                        color: currentStep === idx ? '#305797' : 'inherit',
                                                        fontSize: 16,
                                                        textAlign: 'center',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {step.title.charAt(0).toUpperCase() + step.title.slice(1)}
                                                    </span>
                                                ),
                                                description: (
                                                    <span style={{ fontSize: 13, color: '#888', whiteSpace: 'nowrap' }}>{step.description}</span>
                                                ),
                                            }))}
                                        />
                                    </div>
                                </Card>
                                <Card title="Upload Requirements">
                                    {requirements.length === 0 && (
                                        <div>No requirements found for this service.</div>
                                    )}
                                    {requirements.map((req, idx) => (
                                        <div style={{ marginBottom: 24 }} key={req.key || req.name || idx}>
                                            <b>{req.label || req.name || `Requirement ${idx + 1}`}</b>
                                            <Upload.Dragger
                                                name={req.key || req.name || `requirement-${idx}`}
                                                customRequest={handleUpload(req.key || req.name || `requirement-${idx}`)}
                                                fileList={requirementFiles[req.key || req.name || `requirement-${idx}`] || []}
                                                onChange={({ fileList: newList }) => setRequirementFiles(prev => ({ ...prev, [req.key || req.name || `requirement-${idx}`]: newList }))}
                                                showUploadList={true}
                                                accept="image/*"
                                                disabled={uploading}
                                                style={{ marginTop: 8 }}
                                            >
                                                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                                                <p className="ant-upload-text">Upload {req.label || req.name || `Requirement ${idx + 1}`}</p>
                                            </Upload.Dragger>
                                        </div>
                                    ))}
                                </Card>
                            </>
                        )}
                    </Spin>
                </div>
            </div>
        </ConfigProvider>
    );
}
