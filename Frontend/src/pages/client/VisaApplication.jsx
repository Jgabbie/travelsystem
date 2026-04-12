import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Steps, Card, Spin, message, Upload, Button, Tag, Descriptions, ConfigProvider, Radio, Modal, Image } from 'antd';
import { UploadOutlined, ArrowLeftOutlined, FilePdfOutlined, DownloadOutlined } from '@ant-design/icons';
import apiFetch from '../../config/fetchConfig';
import '../../style/client/visaapplication.css';
import dayjs from 'dayjs';

//PLACE HOLDER FOR VISA PROCESS STEPS - these should ideally come from the backend based on the service
const VISA_STEPS = [
    { title: 'Application submitted', description: 'Application submitted', },
    { title: 'Application approved', description: 'Application approved', },
    { title: 'Payment complete', description: 'Payment complete', },
    { title: 'Documents uploaded', description: 'Documents uploaded', },
    { title: 'Documents approved', description: 'Documents approved', },
    { title: 'Documents received', description: 'Documents received', },
    { title: 'Documents submitted', description: 'Documents submitted', },
    { title: 'Processing DFA', description: 'Processing | DFA', },
];

export default function VisaApplication() {
    const location = useLocation();
    const navigate = useNavigate();
    const { applicationId } = location.state || {};

    const id = applicationId;

    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [uploading, setUploading] = useState(false);
    // Dynamic requirements
    const [requirements, setRequirements] = useState([]);
    const [requirementFiles, setRequirementFiles] = useState({});
    const [servicePrice, setServicePrice] = useState(0);
    const [process, setProcess] = useState(VISA_STEPS.map(s => ({ ...s, status: 'pending' })));

    const [method, setMethod] = useState('paymongo'); // default selected payment method
    const [fileList, setFileList] = useState([]);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [isConfirmDocumentsOpen, setIsConfirmDocumentsOpen] = useState(false);

    console.log('VisaApplication component rendered with application ID:', id);

    const fetchVisaApplication = `/visa/applications/${id}`;

    //IF NO ID IN URL, GO BACK TO USER APPLICATIONS
    useEffect(() => {
        if (!id) {
            navigate('/user-applications');
        }
    }, [id, navigate]);


    //FETCH APPLICATION DETAILS
    useEffect(() => {
        const fetchApplication = async () => {
            setLoading(true);
            try {
                const res = await apiFetch.get(fetchVisaApplication);
                setApplication(res);
                // If the application has a serviceId, fetch the service for requirements
                if (res && res.serviceId) {
                    try {
                        const serviceId = res.serviceId._id || res.serviceId;
                        const serviceResEndpoint = `/services/get-service/${serviceId}`;
                        const serviceRes = await apiFetch.get(serviceResEndpoint);
                        console.log('Service details for requirements:', serviceRes);
                        setRequirements(serviceRes.visaRequirements || []);
                        setServicePrice(serviceRes.visaPrice || 0);
                        setProcess(serviceRes.visaProcessSteps.map((step, idx) => ({
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

    // FIND CURRENT STEP INDEX BASED ON APPLICATION STATUS
    const statusValue = Array.isArray(application?.status) ? application.status[0] : application?.status;
    const currentStep = statusValue
        ? Math.max(
            0,
            process.findIndex(
                s => String(s.title || '').toLowerCase() === String(statusValue || '').toLowerCase()
            )
        )
        : 0;

    const beforeUpload = (file) => {
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('Image/PDF must be smaller than 5MB!');
        }
        return isLt5M || Upload.LIST_IGNORE;
    };

    //SUBMIT DOCUMENTS
    const handleSubmitDocuments = async () => {
        if (uploading) {
            message.warning("Please wait until uploads finish");
            return;
        }

        try {
            setUploading(true);

            const formData = new FormData();
            const orderedRequirements = requirements.map((req, idx) => ({
                key: req.key || `${req.label}-${idx}`,
                label: req.label || `Requirement ${idx + 1}`
            }));

            orderedRequirements.forEach((req) => {
                const fileItem = requirementFiles[req.key]?.[0];
                if (fileItem?.originFileObj) {
                    formData.append("files", fileItem.originFileObj);
                }
            });

            if (!formData.has("files")) {
                message.warning("Please upload at least one document.");
                return;
            }

            const uploadRes = await apiFetch.post(
                '/upload/upload-visa-requirements',
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            const uploaded = uploadRes.urls || [];
            const submittedDocuments = {};
            let uploadIndex = 0;

            orderedRequirements.forEach((req) => {
                if (requirementFiles[req.key]?.length) {
                    submittedDocuments[req.key] = uploaded[uploadIndex] || null;
                    uploadIndex += 1;
                } else {
                    submittedDocuments[req.key] = null;
                }
            });

            await apiFetch.put(`/visa/applications/${id}/documents`, {
                submittedDocuments
            });

            const documentsStatus = process.find(
                step => String(step.title || '').toLowerCase() === 'documents uploaded'
            )?.title || 'Documents uploaded';

            await apiFetch.put(`/visa/applications/${id}/status`, {
                status: documentsStatus
            });

            message.success("Documents submitted successfully");

            const refreshed = await apiFetch.get(`/visa/applications/${id}`);
            setApplication(refreshed);
        } catch (err) {
            console.error(err);
            message.error("Failed to submit documents");
        } finally {
            setUploading(false);
        }
    };

    // DYNAMIC UPLOAD HANDLER FOR REQUIREMENTS
    const handleUploadChange = ({ fileList: newFileList }) => {
        if (newFileList.length > 1) {
            newFileList = [newFileList[newFileList.length - 1]];
        }

        newFileList = newFileList.map(file => {
            if (!file.preview && file.originFileObj) {
                file.preview = URL.createObjectURL(file.originFileObj);
            }
            return file;
        });

        setFileList(newFileList);
    };

    // HANDLE PAYMENT SUBMISSION
    const handleSubmitPayment = async () => {
        if (method === 'manual' && fileList.length === 0) {
            message.warning('Please upload a receipt first.');
            return;
        }

        try {
            setPaymentLoading(true);

            if (method === 'manual') {
                const file = fileList[0].originFileObj;

                console.log("Selected file:", file);

                const formData = new FormData();
                formData.append("file", file);

                const uploadRes = await apiFetch.post('/upload/upload-receipt', formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                const imageUrl = uploadRes.url;

                console.log("Uploaded receipt URL:", imageUrl);

                const paymentRes = await apiFetch.post('/payment/manual-visa', {
                    applicationId: application._id,
                    applicationNumber: application.applicationNumber,
                    amount: 2000,
                    proofImage: imageUrl,
                });

                console.log("Manual payment response:", paymentRes);

                navigate(paymentRes.redirectUrl);
                message.success("Manual payment submitted successfully. Awaiting verification.");
                setPaymentCompleted(true);

            } else if (method === 'paymongo') {
                // Make sure application exists
                if (!application) {
                    message.error("Application not found.");
                    return;
                }

                const payload = {
                    applicationId: application._id,
                    applicationNumber: application.applicationNumber,
                    totalPrice: servicePrice, // make sure this field exists in your application
                    successUrl: `${window.location.origin}/user-applications/success/visa/${application._id}`, // redirect here after success
                    cancelUrl: `${window.location.origin}/visa-application/${application._id}`, // stay on same page if cancelled
                    email: application.email,
                };

                console.log("Creating checkout session with payload:", payload);

                // Send request to create checkout session
                const paymongoResponse = await apiFetch.post('/payment/create-checkout-session-visa', payload);
                const checkoutUrl = paymongoResponse?.data?.attributes?.checkout_url;
                // Redirect user to PayMongo checkout

                if (checkoutUrl) {
                    window.location.href = checkoutUrl;
                } else {
                    console.error("PayMongo Response Structure:", paymongoResponse);
                    throw new Error("Failed to create PayMongo checkout session - URL missing");
                }
            }

        } catch (err) {
            console.error(err);
            message.error("Payment failed");
        } finally {
            setPaymentLoading(false);
        }
    };

    // HANDLE FILE PREVIEW
    const handlePreview = async (file) => {
        // Get the source URL
        const src = file.url || (file.originFileObj && await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file.originFileObj);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
        }));

        const isPDF = file.name?.toLowerCase().endsWith('.pdf') ||
            file.url?.toLowerCase().endsWith('.pdf') ||
            (file.originFileObj && file.originFileObj.type === 'application/pdf');

        const previewWindow = window.open(src);

        if (previewWindow) {
            previewWindow.document.write('<html><head><title>Document Preview</title></head><body style="margin:0; display:flex; justify-content:center; align-items:center; background:#525659;">');

            if (isPDF) {
                previewWindow.document.write(`<iframe src="${src}" width="100%" height="100%" style="border:none;"></iframe>`);
            } else {
                previewWindow.document.write(`<img src="${src}" style="max-width:100%; max-height:100%; object-fit:contain;"/>`);
            }

            previewWindow.document.write('</body></html>');
            previewWindow.document.close();
        }
    };

    // CONFIRM DOCUMENT SUBMISSION
    const confirmSubmitDocuments = () => {
        setIsConfirmDocumentsOpen(true);
    };

    // HANDLE REQUIREMENT UPLOAD
    const handleUpload = (requirementKey) => async ({ file, onSuccess, onError }) => {
        setUploading(true);
        try {
            const originFileObj = file.originFileObj || file;
            const previewUrl = URL.createObjectURL(originFileObj);

            setRequirementFiles(prev => ({
                ...prev,
                [requirementKey]: [{
                    uid: file.uid,
                    name: file.name,
                    url: previewUrl,
                    originFileObj
                }],
            }));

            message.success('File ready for submission');
            onSuccess('ok');
        } catch (err) {
            console.error(err);
            message.error('Failed to process file');
            onError(err);
        } finally {
            setUploading(false);
        }
    };

    // MAP REQUIREMENT KEYS TO LABELS FOR DISPLAY
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

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            <div className="user-bookings-page">
                <div className="user-bookings-container" style={{ maxWidth: 1300, margin: '0 auto' }}>
                    <Button
                        className='visaapplication-back-button'
                        type='primary'
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
                                <div style={{ display: 'flex', flexDirection: 'row', gap: 24 }}>
                                    <Card style={{ marginBottom: 32, width: '100%' }}>
                                        <Descriptions title="Application Info" bordered column={1}>
                                            <Descriptions.Item label="Reference">{application.applicationNumber || application._id}</Descriptions.Item>
                                            <Descriptions.Item label="Status">
                                                <Tag>{application?.status || 'N/A'}</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Date Submitted">{dayjs(application.createdAt).format('MMM D, YYYY')}</Descriptions.Item>
                                            <Descriptions.Item label="Applicant Name">{application.applicantName || application.user?.name}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Date">{dayjs(application.preferredDate).format('MMM D, YYYY')}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Time">{application.preferredTime}</Descriptions.Item>
                                            <Descriptions.Item label="Application Type">{application.serviceName}</Descriptions.Item>
                                            <Descriptions.Item label="Total Price">₱{servicePrice.toFixed(2)}</Descriptions.Item>
                                        </Descriptions>
                                    </Card>

                                    <Card title="Progress Tracker" style={{ marginBottom: 32, minHeight: 180 }}>
                                        <div style={{ overflowX: 'auto', paddingBottom: 24 }}>
                                            <Steps
                                                direction="vertical"
                                                size="default"
                                                current={currentStep}
                                                style={{ minWidth: 350, width: 'max-content' }}
                                                items={process.map((step, idx) => ({
                                                    title: (
                                                        <span style={{
                                                            fontWeight: currentStep === idx ? 'bold' : 'normal',
                                                            fontSize: 16,
                                                            color: "#305797",
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
                                </div>


                                {statusValue && statusValue.toLowerCase() === 'payment complete' && (
                                    <Card title="Upload Requirements">
                                        {requirements.length === 0 && (
                                            <div>No requirements found for this service.</div>
                                        )}
                                        {requirements.map((req, idx) => {
                                            const requirementKey = req.key || `${req.label}-${idx}`;
                                            const uploadedFile = requirementFiles[requirementKey]?.[0];

                                            return (
                                                <div style={{ marginBottom: 24 }} key={requirementKey}>
                                                    <b>{req.label || `Requirement ${idx + 1}`}</b>
                                                    <div style={{ marginTop: 8 }}>
                                                        {!uploadedFile && (
                                                            <Upload
                                                                beforeUpload={beforeUpload}
                                                                key={requirementKey}
                                                                name={requirementKey}
                                                                customRequest={handleUpload(requirementKey)}
                                                                fileList={requirementFiles[requirementKey] || []}
                                                                listType="text"
                                                                accept="image/*,application/pdf"
                                                                disabled={uploading}
                                                                onPreview={handlePreview}
                                                                maxCount={1}
                                                                showUploadList={false}
                                                            >
                                                                <Button icon={<UploadOutlined />} className='visaapplication-upload-button' type='primary'>
                                                                    Upload {req.label || `Requirement ${idx + 1}`}
                                                                </Button>
                                                            </Upload>
                                                        )}

                                                        {uploadedFile?.url && (
                                                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                {uploadedFile.name?.toLowerCase().endsWith('.pdf') || (uploadedFile.originFileObj?.type === 'application/pdf') ? (
                                                                    <Button
                                                                        onClick={() => handlePreview(uploadedFile)}
                                                                        icon={<UploadOutlined />}
                                                                    >
                                                                        Preview PDF: {uploadedFile.name}
                                                                    </Button>
                                                                ) : (
                                                                    <Image
                                                                        src={uploadedFile.url}
                                                                        alt={req.label || `Requirement ${idx + 1}`}
                                                                        style={{ maxWidth: 220, cursor: 'pointer' }}
                                                                        preview={false}
                                                                        onClick={() => handlePreview(uploadedFile)}
                                                                    />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <Button style={{ marginTop: 20 }} type="primary" className='visaapplication-submit-button' onClick={confirmSubmitDocuments}>
                                            Submit Documents
                                        </Button>
                                    </Card>
                                )}

                            </>
                        )}

                        {statusValue && statusValue.toLowerCase() === 'application approved' && (
                            <Card title="Payment" style={{ marginBottom: 32 }}>
                                <div className='payment-methods-container payment-section'>
                                    <div className="payment-methods-wrapper">
                                        <div className="payment-section-header">
                                            <div>
                                                <h2 className="payment-methods-title payment-section-title">Payment Methods</h2>
                                                <p className="payment-methods-subtitle payment-section-subtitle">
                                                    Select a payment method to complete your booking.
                                                </p>
                                            </div>
                                        </div>

                                        <Radio.Group
                                            onChange={(e) => setMethod(e.target.value)}
                                            value={method}
                                            className="payment-methods-cards"
                                            style={{ width: '100%', display: 'flex', gap: '16px' }}
                                        >
                                            <Radio.Button
                                                value="paymongo"
                                                className={`payment-card ${method === "paymongo" ? "selected" : ""}`}
                                                style={{ flex: 1, height: 'auto', padding: '20px' }}
                                            >
                                                <div className="card-content">
                                                    <h3>Paymongo</h3>
                                                    <p>Pay securely via Credit Card, GCash, or Maya. Rates depend on the transaction method.</p>
                                                    <p style={{ color: "#FF4D4F", fontWeight: "500", fontStyle: "italic" }}>Note: The rate for usinhg this payment method is 3.5%.</p>
                                                </div>
                                            </Radio.Button>

                                            <Radio.Button
                                                value="manual"
                                                className={`payment-card ${method === "manual" ? "selected" : ""}`}
                                                style={{ flex: 1, height: 'auto', padding: '20px' }}
                                            >
                                                <div className="card-content">
                                                    <h3>Manual Payment</h3>
                                                    <p>Direct deposit. You will need to upload proof of payment for manual verification by our team.</p>
                                                    <p style={{ color: "#FF4D4F", fontWeight: "500", fontStyle: "italic" }}>Note: The verification of your payment may take up to 1-2 business days.</p>
                                                </div>
                                            </Radio.Button>
                                        </Radio.Group>
                                    </div>

                                    {method === 'manual' && (
                                        <div className="manual-transfer-details">
                                            <div className="bank-accounts-section">
                                                <h4 className="section-subtitle">Available Bank Accounts</h4>
                                                <div className="bank-grid">
                                                    <div className="bank-item">
                                                        <span className="bank-name">BDO Unibank</span>
                                                        <span className="account-number">0012-3456-7890</span>
                                                        <span className="account-holder">M&RC Travel and Tours</span>
                                                    </div>
                                                    <div className="bank-item">
                                                        <span className="bank-name">BPI</span>
                                                        <span className="account-number">9876-5432-10</span>
                                                        <span className="account-holder">M&RC Travel and Tours</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bank-accounts-section">
                                                <div className="bank-grid">
                                                    <div className="bank-item">
                                                        <span className="bank-name">Metro Bank</span>
                                                        <span className="account-number">0012-3456-7890</span>
                                                        <span className="account-holder">M&RC Travel and Tours</span>
                                                    </div>
                                                    <div className="bank-item">
                                                        <span className="bank-name">Land Bank</span>
                                                        <span className="account-number">9876-5432-10</span>
                                                        <span className="account-holder">M&RC Travel and Tours</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="upload-section">
                                                <h4 className="section-subtitle">Upload Proof of Payment</h4>
                                                <p className="upload-hint">Please upload a clear screenshot or photo of your deposit slip or transfer confirmation.</p>
                                                <p className="upload-hint">Accepted formats: JPG or PNG. Max size: 2MB.</p>

                                                <p className="upload-note">Note: Our team will manually verify your payment, which may take 1-2 business days. You will receive a confirmation email once your payment is verified.</p>

                                                <Upload
                                                    listType="picture"
                                                    maxCount={1}
                                                    fileList={fileList}
                                                    onChange={handleUploadChange}
                                                    beforeUpload={() => false}
                                                    customRequest={({ onSuccess }) => onSuccess("ok")}
                                                    action={undefined}
                                                    accept=".jpg,.jpeg,.png,.pdf"
                                                >
                                                    <Button icon={<UploadOutlined />} className="visaapplication-uploadreceipt-button" type="primary">
                                                        Select Receipt Image
                                                    </Button>
                                                </Upload>

                                                {fileList.length > 0 && (
                                                    <div className="upload-preview-container">
                                                        <h4 className="section-subtitle">Preview</h4>

                                                        <div className="upload-preview-box">
                                                            <Image
                                                                src={fileList[0].preview}
                                                                alt="Receipt Preview"
                                                                className="upload-preview-image"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        style={{ marginTop: 20 }}
                                        className='visaapplication-submit-button'
                                        type="primary"
                                        onClick={handleSubmitPayment}
                                        disabled={paymentLoading || (method === 'manual' && fileList.length === 0)}
                                    >
                                        {method === 'manual' ? 'Submit Payment' : 'Proceed Paymongo'}
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {statusValue && statusValue.toLowerCase() === 'documents uploaded' && (
                            <Card title="Uploaded Documents" style={{ marginBottom: 32 }}>
                                {application.submittedDocuments && (
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: 50, flexWrap: 'wrap' }}>
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
                                )}
                            </Card>
                        )}
                    </Spin>
                </div>
            </div>

            <Modal
                open={isConfirmDocumentsOpen}
                className="signup-success-modal"
                closable={{ 'aria-label': 'Close modal' }}
                footer={null}
                onCancel={() => setIsConfirmDocumentsOpen(false)}
                style={{ top: 200 }}
            >
                <div className="signup-success-container">
                    <h1 className="signup-success-heading">Submit Documents</h1>
                    <p className="signup-success-text">
                        Make sure that these documents are not tampered with or fake. Our team will verify their legitimacy.
                        Make sure that the image is clear and your face and details are clearly captured.
                    </p>
                </div>

                <div className="signup-actions">
                    <Button
                        id="signup-success-button"
                        onClick={async () => {
                            setIsConfirmDocumentsOpen(false);
                            await handleSubmitDocuments();
                        }}
                    >
                        Submit
                    </Button>

                    <Button
                        id="signup-success-button-cancel"
                        onClick={() => setIsConfirmDocumentsOpen(false)}
                    >
                        Cancel
                    </Button>
                </div>
            </Modal>
        </ConfigProvider>
    );
}
