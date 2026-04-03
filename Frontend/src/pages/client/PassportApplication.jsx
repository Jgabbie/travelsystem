
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Steps, Card, Spin, message, Upload, Tag, Descriptions, ConfigProvider, Button, Radio } from 'antd';
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import axiosInstance from '../../config/axiosConfig';
import TopNavUser from '../../components/TopNavUser';
import dayjs from 'dayjs';

// Status color mapping for passport application statuses
const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
        case 'application submitted':
            return 'blue';
        case 'application approved':
            return 'purple';
        case 'payment complete':
            return 'cyan';
        case 'documents uploaded':
            return 'orange';
        case 'documents approved':
            return 'geekblue';
        case 'documents received':
            return 'gold';
        case 'documents submitted':
            return 'magenta';
        case 'processing by dfa':
            return 'volcano';
        case 'dfa approved':
            return 'green';
        case 'passport released':
            return 'success';
        default:
            return 'default';
    }
};

const PASSPORT_STEPS = [
    { title: 'Application submitted', description: 'Application submitted' },
    { title: 'Application approved', description: 'Application approved' },
    { title: 'Payment complete', description: 'Payment complete' },
    { title: 'Documents uploaded', description: 'Documents uploaded' },
    { title: 'Documents approved', description: 'Documents approved' },
    { title: 'Documents received', description: 'Documents received' },
    { title: 'Documents submitted', description: 'Documents submitted' },
    { title: 'Processing by DFA', description: 'Processing by DFA' },
    { title: 'DFA approved', description: 'DFA approved' },
    { title: 'Passport released', description: 'Passport released' },
];



export default function PassportApplication() {
    const { id } = useParams();
    const navigate = useNavigate();


    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [birthCertList, setBirthCertList] = useState([]);
    const [govIdList, setGovIdList] = useState([]);
    const [additionalDocsList, setAdditionalDocsList] = useState([]);
    const [applicationFormList, setApplicationFormList] = useState([]);

    const [method, setMethod] = useState('paymongo'); // default selected payment method
    const [fileList, setFileList] = useState([]);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);

    useEffect(() => {
        const fetchApplication = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(`/passport/applications/${id}`);
                setApplication(res.data);
            } catch (err) {
                message.error('Failed to load passport application details');
            } finally {
                setLoading(false);
            }
        };
        const getUserEmail = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get('/user/data')
                console.log("User data:", res.data);
                console.log("User email:", res.data.userData.email);
                setApplication(prev => ({ ...prev, email: res.data.userData.email }));
            } catch (err) {
                message.error('Failed to load user data');
            } finally {
                setLoading(false);

            }
        }
        getUserEmail();
        fetchApplication();
    }, [id]);

    // Find the current step index based on status
    const currentStep = application
        ? Math.max(
            0,
            PASSPORT_STEPS.findIndex(
                s => (s.title || '').toLowerCase() === (application.status || '').toLowerCase()
            )
        )
        : 0;

    //for payment
    const handleUploadChange = ({ fileList: newFileList }) => {
        if (newFileList.length > 1) {
            newFileList = [newFileList[newFileList.length - 1]];
        }
        setFileList(newFileList);
    };

    const beforeUpload = (file) => {
        const isValidType = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isValidType) message.error('Only JPG/PNG files are allowed!');
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) message.error('File must be smaller than 2MB!');
        return isValidType && isLt2M;
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

                const formData = new FormData();
                formData.append("file", file);

                const uploadRes = await axiosInstance.post('/upload', formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                const imageUrl = uploadRes.data.url;

                await axiosInstance.put(
                    `/passport/applications/${application._id}/payment-proof`,
                    { file: imageUrl }
                );


            } else if (method === 'paymongo') {
                // Make sure application exists


                if (!application) {
                    message.error("Application not found.");
                    return;
                }


                const payload = {
                    applicationId: application._id,
                    applicationNumber: application.applicationId,
                    totalPrice: 2000, // make sure this field exists in your application
                    successUrl: `${window.location.origin}/user-applications/success/${application._id}`, // redirect here after success
                    cancelUrl: `${window.location.origin}/passport-application/${application._id}`, // stay on same page if cancelled
                    email: application.email,
                };

                console.log("Creating checkout session with payload:", payload);

                // Send request to create checkout session
                const paymongoResponse = await axiosInstance.post('/payment/create-checkout-session-passport', payload);
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


    // for documents
    const handlePreview = (file) => {
        const src = file.url;
        if (src) {
            window.open(src);
        }
    };

    const handleSubmit = async () => {
        if (uploading) {
            message.warning("Please wait until uploads finish");
            return;
        }

        try {
            setUploading(true);

            const formData = new FormData();

            if (birthCertList[0]) {
                formData.append("files", birthCertList[0].originFileObj);
            }

            if (applicationFormList[0]) {
                formData.append("files", applicationFormList[0].originFileObj);
            }

            if (govIdList[0]) {
                formData.append("files", govIdList[0].originFileObj);
            }

            additionalDocsList.forEach(file => {
                formData.append("files", file.originFileObj);
            });

            // 🔥 ONE request only
            const res = await axiosInstance.post(
                '/upload/upload-passport-requirements',
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            const uploaded = res.data.urls;

            console.log("Uploaded document URLs:", uploaded);

            // Save URLs to your application
            await axiosInstance.put(`/passport/applications/${id}/documents`, {
                birthCertificate: uploaded[0],
                applicationForm: uploaded[1],
                govId: uploaded[2],
                additionalDocs: uploaded.slice(3),
            });

            message.success("Documents submitted successfully");

            // reset
            setBirthCertList([]);
            setApplicationFormList([]);
            setGovIdList([]);
            setAdditionalDocsList([]);

            const refreshed = await axiosInstance.get(`/passport/applications/${id}`);
            setApplication(refreshed.data);

        } catch (err) {
            console.error(err);
            message.error("Failed to submit documents");
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
                    <h2 style={{ marginTop: 24 }}>Passport Application Details</h2>
                    <Spin spinning={loading}>
                        {application && (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'row', gap: 24 }}>
                                    <Card style={{ marginBottom: 32, width: '100%' }}>
                                        <Descriptions title="Application Info" bordered column={1}>
                                            <Descriptions.Item label="Reference">{application.applicationId || application._id}</Descriptions.Item>
                                            <Descriptions.Item label="Status">
                                                <Tag color={getStatusColor(application.status)}>{application.status}</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Date Submitted">{dayjs(application.createdAt).format('MMM D, YYYY')}</Descriptions.Item>
                                            <Descriptions.Item label="Applicant Name">{application.username}</Descriptions.Item>
                                            <Descriptions.Item label="DFA Location">{application.dfaLocation}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Date">{application.preferredDate}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Time">{application.preferredTime}</Descriptions.Item>
                                            <Descriptions.Item label="Application Type">{application.applicationType}</Descriptions.Item>
                                            <Descriptions.Item label="Total Price">₱2,000</Descriptions.Item>
                                        </Descriptions>
                                    </Card>

                                    <Card title="Progress Tracker" style={{ marginBottom: 32, minHeight: 180 }}>
                                        <div style={{ overflowX: 'auto', paddingBottom: 24 }}>
                                            <Steps
                                                direction="vertical"
                                                size="default"
                                                current={currentStep}
                                                style={{ minWidth: 350, width: 'max-content' }}
                                                items={PASSPORT_STEPS.map((step, idx) => ({
                                                    title: (
                                                        <span
                                                            style={{
                                                                fontWeight: currentStep === idx ? 'bold' : 'normal',
                                                                color: currentStep === idx ? '#305797' : 'inherit',
                                                                fontSize: 16,
                                                                textAlign: 'center',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
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


                                {application?.status && application.status.toLowerCase() === 'application approved' && !paymentCompleted && (
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
                                                            beforeUpload={beforeUpload}
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

                                {application?.status && application.status?.toLowerCase() === 'documents approved' && (
                                    <Card
                                        style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed' }}
                                        title={<Tag color="green">Documents Approved</Tag>}
                                    >
                                        <p style={{ margin: 0, fontSize: 14 }}>
                                            Your documents have now been approved, kindly deliver your documents to us immediately.
                                        </p>
                                    </Card>
                                )}

                                {/* Only show upload requirements if status is "pending" */}
                                {application?.status && application.status?.toLowerCase() === 'payment complete' && (
                                    <Card title="Upload Requirements">
                                        <div style={{ marginBottom: 24 }}>
                                            <b>PSA-issued Birth Certificate</b>
                                            <Upload.Dragger
                                                name="birthCert"
                                                fileList={birthCertList}
                                                onPreview={handlePreview}
                                                onChange={({ fileList: newList }) => setBirthCertList(newList)}
                                                showUploadList
                                                accept="image/*"
                                                maxCount={1}
                                                disabled={uploading}
                                                style={{ marginTop: 8 }}
                                                beforeUpload={() => false}
                                                customRequest={({ onSuccess }) => onSuccess("ok")}
                                            >
                                                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                                                <p className="ant-upload-text">Upload PSA-issued Birth Certificate</p>
                                            </Upload.Dragger>
                                            <p style={{ fontSize: 12, color: '#999' }}>Click on the file to preview</p>
                                        </div>
                                        {/* Repeat for other uploads */}
                                        <div style={{ marginBottom: 24 }}>
                                            <b>Application Form</b>
                                            <Upload.Dragger
                                                name="applicationForm"
                                                fileList={applicationFormList}
                                                onPreview={handlePreview}
                                                onChange={({ fileList: newList }) => setApplicationFormList(newList)}
                                                showUploadList
                                                accept="image/*"
                                                maxCount={1}
                                                disabled={uploading}
                                                style={{ marginTop: 8 }}
                                                beforeUpload={() => false}
                                                customRequest={({ onSuccess }) => onSuccess("ok")}
                                            >
                                                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                                                <p className="ant-upload-text">Upload Accomplished Application Form</p>
                                            </Upload.Dragger>
                                            <p style={{ fontSize: 12, color: '#999' }}>Click on the file to preview</p>
                                        </div>
                                        <div style={{ marginBottom: 24 }}>
                                            <b>One Government-issued ID</b>
                                            <Upload.Dragger
                                                name="govId"
                                                fileList={govIdList}
                                                onPreview={handlePreview}
                                                onChange={({ fileList: newList }) => setGovIdList(newList)}
                                                showUploadList
                                                accept="image/*"
                                                maxCount={1}
                                                disabled={uploading}
                                                style={{ marginTop: 8 }}
                                                beforeUpload={() => false}
                                                customRequest={({ onSuccess }) => onSuccess("ok")}
                                            >
                                                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                                                <p className="ant-upload-text">Upload Government-issued ID</p>
                                            </Upload.Dragger>
                                            <p style={{ fontSize: 12, color: '#999' }}>Click on the file to preview</p>
                                        </div>
                                        <div>
                                            <b>Additional Documents (optional)</b>
                                            <Upload.Dragger
                                                name="additionalDocs"
                                                fileList={additionalDocsList}
                                                onPreview={handlePreview}
                                                onChange={({ fileList: newList }) => setAdditionalDocsList(newList)}
                                                showUploadList
                                                accept="image/*"
                                                maxCount={1}
                                                disabled={uploading}
                                                style={{ marginTop: 8 }}
                                                beforeUpload={() => false}
                                                customRequest={({ onSuccess }) => onSuccess("ok")}
                                            >
                                                <p className="ant-upload-drag-icon"><UploadOutlined /></p>
                                                <p className="ant-upload-text">Upload Additional Documents (optional)</p>
                                            </Upload.Dragger>
                                            <p style={{ fontSize: 12, color: '#999' }}>Click on the file to preview</p>
                                        </div>

                                        <Button style={{ marginTop: 20 }} type="primary" onClick={handleSubmit}>
                                            Submit Documents
                                        </Button>
                                    </Card>
                                )}
                            </>
                        )}


                        {application?.status && application.status?.toLowerCase() === 'documents uploaded' && (
                            <Card title="Uploaded Documents" style={{ marginBottom: 32 }}>
                                {application.submittedDocuments && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {application.submittedDocuments.birthCertificate && (
                                            <div>
                                                <b>PSA-issued Birth Certificate:</b>
                                                <div>
                                                    <img
                                                        src={application.submittedDocuments.birthCertificate}
                                                        alt="Birth Certificate"
                                                        style={{ maxWidth: '200px', marginTop: 8, cursor: 'pointer' }}
                                                        onClick={() => window.open(application.submittedDocuments.birthCertificate)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {application.submittedDocuments.applicationForm && (
                                            <div>
                                                <b>Application Form:</b>
                                                <div>
                                                    <img
                                                        src={application.submittedDocuments.applicationForm}
                                                        alt="Application Form"
                                                        style={{ maxWidth: '200px', marginTop: 8, cursor: 'pointer' }}
                                                        onClick={() => window.open(application.submittedDocuments.applicationForm)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {application.submittedDocuments.govId && (
                                            <div>
                                                <b>Government-issued ID:</b>
                                                <div>
                                                    <img
                                                        src={application.submittedDocuments.govId}
                                                        alt="Government ID"
                                                        style={{ maxWidth: '200px', marginTop: 8, cursor: 'pointer' }}
                                                        onClick={() => window.open(application.submittedDocuments.govId)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {application.submittedDocuments.additionalDocs && Array.isArray(application.submittedDocuments.additionalDocs) && (
                                            <div>
                                                <b>Additional Documents:</b>
                                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                                    {application.submittedDocuments.additionalDocs.map((url, idx) => (
                                                        <img
                                                            key={idx}
                                                            src={url}
                                                            alt={`Additional Document ${idx + 1}`}
                                                            style={{ maxWidth: '150px', cursor: 'pointer' }}
                                                            onClick={() => window.open(url)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )}
                    </Spin>
                </div>
            </div>
        </ConfigProvider>
    );
}
