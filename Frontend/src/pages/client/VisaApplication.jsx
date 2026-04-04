import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Steps, Card, Spin, message, Upload, Button, Tag, Descriptions, ConfigProvider, Radio } from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axiosInstance from '../../config/axiosConfig';
import TopNavUser from '../../components/TopNavUser';
import dayjs from 'dayjs';

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
    const { id } = useParams();
    const navigate = useNavigate();

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
                        setServicePrice(serviceRes.data.visaPrice || 0);
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
    const currentStep = application?.status
        ? Math.max(
            0,
            process.findIndex(
                s => String(s.title || '').toLowerCase() === String(application?.status || '').toLowerCase()
            )
        )
        : 0;


    const handleSubmitDocuments = async () => {
        if (uploading) return message.warning("Please wait until uploads finish");

        const payload = {};
        requirements.forEach(req => {
            payload[req.key] = requirementFiles[req.key]?.[0]?.url || null;
        });

        try {
            await axiosInstance.put(`/visa/applications/${id}/documents`, payload);
            message.success("Documents submitted successfully");
        } catch (err) {
            console.error(err);
            message.error("Failed to submit documents");
        }
    };



    //for payment
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

                const uploadRes = await axiosInstance.post('/upload/upload-receipt', formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                const imageUrl = uploadRes.data.url;

                console.log("Uploaded receipt URL:", imageUrl);

                const paymentRes = await axiosInstance.post('/payment/manual-visa', {
                    applicationId: application._id,
                    applicationNumber: application.applicationNumber,
                    amount: 2000,
                    proofImage: imageUrl,
                });

                console.log("Manual payment response:", paymentRes.data);

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
                const paymongoResponse = await axiosInstance.post('/payment/create-checkout-session-visa', payload);
                const checkoutUrl = paymongoResponse.data?.data?.attributes?.checkout_url;
                // Redirect user to PayMongo checkout

                if (checkoutUrl) {
                    window.location.href = checkoutUrl;
                } else {
                    console.error("PayMongo Response Structure:", paymongoResponse.data);
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

    const handlePreview = async (file) => {
        const src = file.url || (file.originFileObj && await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file.originFileObj);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
        }));
        const imgWindow = window.open(src);
        if (imgWindow) {
            imgWindow.document.write(`<img src="${src}" style="width:100%"/>`);
        }
    };


    const handleSubmit = async () => {
        if (uploading) {
            message.warning("Please wait until uploads finish");
            return;
        }

        try {
            setUploading(true);

            const payload = {
                submittedDocuments: Object.fromEntries(
                    requirements.map(req => [
                        req.key,
                        req.files[0]?.url || null
                    ])
                )
            };

            await axiosInstance.put(`/visa/applications/${id}/documents`, payload);
            message.success("Documents submitted successfully");

            // Refresh application
            const res = await axiosInstance.get(`/visa/applications/${id}`);
            setApplication(res.data);

        } catch (err) {
            console.error(err);
            message.error("Failed to submit documents");
        } finally {
            setUploading(false);
        }
    };

    // Generalized upload handler for dynamic requirements
    const handleUpload = (requirementKey) => async ({ file, onSuccess, onError }) => {
        setUploading(true);

        const getBase64 = (file) =>
            new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
            });

        try {
            const base64File = await getBase64(file.originFileObj || file);

            setRequirementFiles(prev => ({
                ...prev,
                [requirementKey]: [{ uid: file.uid, name: file.name, url: base64File }],
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

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            <div className="user-bookings-page">
                <TopNavUser />
                <div className="user-bookings-container" style={{ maxWidth: 1300, margin: '0 auto' }}>
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
                                <div style={{ display: 'flex', flexDirection: 'row', gap: 24 }}>
                                    <Card style={{ marginBottom: 32, width: '100%' }}>
                                        <Descriptions title="Application Info" bordered column={1}>
                                            <Descriptions.Item label="Reference">{application.applicationNumber || application._id}</Descriptions.Item>
                                            <Descriptions.Item label="Status">
                                                <Tag>{application?.status || 'N/A'}</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Date Submitted">{dayjs(application.createdAt).format('MMM D, YYYY')}</Descriptions.Item>
                                            <Descriptions.Item label="Applicant Name">{application.applicantName || application.user?.name}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Date">{application.preferredDate}</Descriptions.Item>
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


                                {application.status[0] && application?.status[0].toLowerCase() === 'payment complete' && (
                                    <Card title="Upload Requirements">
                                        {requirements.length === 0 && (
                                            <div>No requirements found for this service.</div>
                                        )}
                                        {requirements.map((req, idx) => {
                                            const requirementKey = req.key || `${req.label}-${idx}`;

                                            return (
                                                <div style={{ marginBottom: 24 }} key={requirementKey}>
                                                    <b>{req.label || `Requirement ${idx + 1}`}</b>

                                                    <Upload.Dragger
                                                        key={requirementKey} // 🔥 VERY IMPORTANT (forces isolation)
                                                        name={requirementKey}
                                                        customRequest={handleUpload(requirementKey)}
                                                        fileList={requirementFiles[requirementKey] || []}
                                                        listType="text"
                                                        accept="image/*"
                                                        disabled={uploading}
                                                        onPreview={handlePreview}
                                                        maxCount={1}
                                                        showUploadList={{
                                                            showPreviewIcon: true,
                                                            showRemoveIcon: true,
                                                        }}
                                                        onRemove={() => {
                                                            setRequirementFiles(prev => {
                                                                const updated = { ...prev };
                                                                delete updated[requirementKey];
                                                                return updated;
                                                            });
                                                        }}
                                                    >
                                                        <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                                                        <p className="ant-upload-text">
                                                            Upload {req.label || `Requirement ${idx + 1}`}
                                                        </p>
                                                    </Upload.Dragger>

                                                    <p style={{ fontSize: 12, color: '#999' }}>
                                                        Click on the file to preview
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </Card>
                                )}

                            </>
                        )}

                        {application?.status[0] && application?.status[0].toLowerCase() === 'application approved' && (
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
                                                    accept=".jpg,.jpeg,.png"
                                                >
                                                    <Button icon={<UploadOutlined />} className="upload-btn">
                                                        Select Receipt Image
                                                    </Button>
                                                </Upload>

                                                {fileList.length > 0 && (
                                                    <div className="upload-preview-container">
                                                        <h4 className="section-subtitle">Preview</h4>

                                                        <div className="upload-preview-box">
                                                            <img
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

                                    <Button style={{ marginTop: 20 }}
                                        type="primary"
                                        onClick={handleSubmitPayment}
                                        disabled={paymentLoading || (method === 'manual' && fileList.length === 0)}
                                    >
                                        {method === 'manual' ? 'Submit Payment' : 'Proceed Paymongo'}
                                    </Button>
                                </div>
                            </Card>
                        )}
                    </Spin>
                </div>
            </div>
        </ConfigProvider>
    );
}
