
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Steps, Card, Spin, message, Upload, Tag, Descriptions, ConfigProvider, Button, Radio, Image } from 'antd';
import { UploadOutlined, ArrowLeftOutlined, FilePdfOutlined, DeleteOutlined } from '@ant-design/icons';
import axiosInstance from '../../config/axiosConfig';
import '../../style/client/passportapplication.css';
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
    const location = useLocation();
    const { applicationId } = location.state || {};
    const navigate = useNavigate();

    const id = applicationId; // Use applicationId from location state instead of URL params

    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [birthCertList, setBirthCertList] = useState([]);
    const [govIdList, setGovIdList] = useState([]);
    const [additionalDocsList, setAdditionalDocsList] = useState([]);
    const [applicationFormList, setApplicationFormList] = useState([]);

    const [method, setMethod] = useState(null); // default selected payment method  
    const [fileList, setFileList] = useState([]);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [selectedSuggestedIndex, setSelectedSuggestedIndex] = useState(null);
    const [confirmingSuggested, setConfirmingSuggested] = useState(false);

    const fetchPassportApplication = `/passport/applications/${id}`;

    useEffect(() => {
        if (!id) {
            navigate('/user-applications');
        }
    }, [id, navigate]);

    useEffect(() => {
        const fetchApplication = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(fetchPassportApplication);
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
                console.log("Submitting manual payment with receipt...");

                const file = fileList[0].originFileObj;

                console.log("Selected file:", file);

                const formData = new FormData();
                formData.append("file", file);

                const uploadRes = await axiosInstance.post('/upload/upload-receipt', formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                const imageUrl = uploadRes.data.url;

                console.log("Uploaded receipt URL:", imageUrl);

                const paymentRes = await axiosInstance.post('/payment/manual-passport', {
                    applicationId: application._id,
                    applicationNumber: application.applicationNumber,
                    amount: 2000,
                    proofImage: imageUrl,
                });

                console.log("Manual payment response:", paymentRes.data);

                navigate(paymentRes.data.redirectUrl);
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
                    totalPrice: 2000,
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

    //RENDER PREVIEW OF UPLOADED DOCUMENTS
    const renderFilePreview = (fileList, setter) => {
        if (fileList.length === 0) return null;

        const file = fileList[0];
        const isPDF = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');

        return (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                {isPDF ? (
                    <Button
                        icon={<FilePdfOutlined />}
                        onClick={() => window.open(file.preview || file.url, '_blank')}
                    >
                        View PDF: {file.name}
                    </Button>
                ) : (
                    <Image
                        src={file.preview || file.url}
                        alt="Preview"
                        style={{ maxWidth: 220, borderRadius: '8px', border: '1px solid #d9d9d9', cursor: 'pointer' }}
                    />
                )}

                {/* The Remove Button */}
                <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setter([])} // Clears the specific list
                    size="small"
                >
                    Remove file
                </Button>
            </div>
        );
    };

    //RENDER UPLOAD DOCUMENTS
    const renderReadOnlyFile = (url, label) => {
        // Check if the URL contains '.pdf' (case insensitive)
        const isPdf = typeof url === 'string' && url.toLowerCase().split(/[?#]/)[0].endsWith('.pdf');

        return (
            <div style={{ width: 150 }}>
                {isPdf ? (
                    <Button
                        type="dashed"
                        icon={<FilePdfOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />}
                        onClick={() => window.open(url, '_blank')}
                        style={{
                            height: 150, width: 150,
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
                        alt={label}
                        width={150}
                        height={150}
                        style={{
                            borderRadius: 8,
                            objectFit: 'cover',
                            border: '1px solid #f0f0f0'
                        }}
                        placeholder={<div style={{ width: 150, height: 150, background: '#eee' }} />}
                    />
                )}
            </div>
        );
    };

    //HANDLE PREVIEW FOR UPLOADED FILES
    const handlePreview = (file) => {
        const src = file.url;
        if (src) {
            window.open(src);
        }
    };

    //ADD PREVIEW URL TO FILES FOR UPLOADED DOCUMENTS
    const withPreview = (newList) =>
        newList.map((file) => {
            if (!file.preview && file.originFileObj) {
                file.preview = URL.createObjectURL(file.originFileObj);
            }
            return file;
        });

    //HANDLE SUBMISSION OF UPLOADED DOCUMENTS
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

    //HANDLE CONFIRMATION OF SUGGESTED APPOINTMENT
    const handleConfirmSuggested = async () => {
        if (!application?.suggestedAppointmentSchedules || selectedSuggestedIndex === null) {
            message.warning('Please select an appointment option first.');
            return;
        }

        const selected = application.suggestedAppointmentSchedules[selectedSuggestedIndex];
        if (!selected?.date || !selected?.time) {
            message.error('Selected option is missing date or time.');
            return;
        }

        try {
            setConfirmingSuggested(true);
            await axiosInstance.put(`/passport/applications/${id}/choose-appointment`, {
                date: selected.date,
                time: selected.time
            });

            const refreshed = await axiosInstance.get(`/passport/applications/${id}`);
            setApplication(refreshed.data);
            message.success('Appointment schedule confirmed.');
        } catch (error) {
            message.error('Failed to confirm appointment schedule.');
        } finally {
            setConfirmingSuggested(false);
        }
    };


    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            <div className="user-bookings-page">

                <div className="user-bookings-container" style={{ maxWidth: 1300, margin: '0 auto' }}>
                    <Button
                        type='primary'
                        className='passportapplication-back-button'
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
                                            <Descriptions.Item label="Reference">{application.applicationNumber || application._id}</Descriptions.Item>
                                            <Descriptions.Item label="Status">
                                                <Tag color={getStatusColor(application.status)}>{application.status}</Tag>
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Date Submitted">{dayjs(application.createdAt).format('MMM D, YYYY')}</Descriptions.Item>
                                            <Descriptions.Item label="Applicant Name">{application.username}</Descriptions.Item>
                                            <Descriptions.Item label="DFA Location">{application.dfaLocation}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Date">{dayjs(application.preferredDate).format('MMM D, YYYY')}</Descriptions.Item>
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

                                {application.status && application.status.toLowerCase() === 'application submitted' && (
                                    <Card title="Suggested Appointment Options" style={{ marginBottom: 32 }}>
                                        {Array.isArray(application.suggestedAppointmentSchedules) && application.suggestedAppointmentSchedules.length > 0 ? (
                                            <>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                                                    {application.suggestedAppointmentSchedules.map((slot, index) => {
                                                        const isSelected = selectedSuggestedIndex === index;

                                                        return (
                                                            <Card
                                                                key={`${slot.date || 'date'}-${slot.time || 'time'}-${index}`}
                                                                hoverable
                                                                onClick={() => setSelectedSuggestedIndex(index)}
                                                                style={{
                                                                    border: isSelected ? '2px solid #305797' : '1px solid #f0f0f0',
                                                                    boxShadow: isSelected ? '0 0 0 2px rgba(48,87,151,0.15)' : 'none'
                                                                }}
                                                            >
                                                                <Tag color="blue">Option {index + 1}</Tag>
                                                                <div style={{ marginTop: 8, fontWeight: 600 }}>
                                                                    {dayjs(slot.date).format("MMM DD, YYYY") || 'Date TBD'}
                                                                </div>
                                                                <div style={{ color: '#6b7280' }}>{slot.time || 'Time TBD'}</div>
                                                            </Card>
                                                        );
                                                    })}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                                    <Button
                                                        type="primary"
                                                        onClick={handleConfirmSuggested}
                                                        loading={confirmingSuggested}
                                                        disabled={selectedSuggestedIndex === null}
                                                    >
                                                        Confirm selected date
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <p style={{ margin: 0, color: '#6b7280' }}>No suggested dates yet. Please check back later.</p>
                                        )}
                                    </Card>
                                )}

                                {application ? (
                                    <>
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
                                                                    className='passportapplication-upload-button'
                                                                    type='primary'
                                                                    listType="picture"
                                                                    maxCount={1}
                                                                    fileList={fileList}
                                                                    onChange={handleUploadChange}
                                                                    accept=".jpg,.jpeg,.png,.pdf"
                                                                    beforeUpload={() => false}
                                                                    customRequest={({ onSuccess }) => onSuccess("ok")}
                                                                    action={undefined}
                                                                >
                                                                    <Button icon={<UploadOutlined />} className='passportapplication-uploadreceipt-button' type='primary'>
                                                                        Select Receipt Image
                                                                    </Button>
                                                                </Upload>

                                                                {fileList.length > 0 && (
                                                                    <div className="upload-preview-container">
                                                                        <h4 className="section-subtitle">Preview</h4>

                                                                        <div className="upload-preview-box">
                                                                            <Image.PreviewGroup>
                                                                                <Image
                                                                                    src={fileList[0].preview}
                                                                                    alt="Receipt Preview"
                                                                                    className="upload-preview-image"
                                                                                    style={{ borderRadius: '8px', border: '1px solid #d9d9d9' }}
                                                                                />
                                                                            </Image.PreviewGroup>
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
                                    </>
                                ) : null}

                                {/* //view documents section */}
                                {application ? (
                                    <>
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
                                    </>
                                ) : null}

                                {/* Only show upload requirements if status is "pending" */}
                                {application ? (
                                    <>
                                        {application?.status && application.status?.toLowerCase() === 'payment complete' && (
                                            <Card title="Upload Requirements">

                                                {/* 1. PSA Birth Certificate */}
                                                <div style={{ marginBottom: 24 }}>
                                                    <b>PSA-issued Birth Certificate</b>
                                                    <div style={{ marginTop: 8 }}>
                                                        {birthCertList.length === 0 ? (
                                                            <Upload
                                                                name="birthCert"
                                                                fileList={birthCertList}
                                                                onPreview={handlePreview}
                                                                onChange={({ fileList: newList }) => setBirthCertList(withPreview(newList))}
                                                                showUploadList={false}
                                                                accept="image/*,application/pdf"
                                                                maxCount={1}
                                                                disabled={uploading}
                                                                beforeUpload={() => false}
                                                                customRequest={({ onSuccess }) => onSuccess("ok")}
                                                            >
                                                                <Button icon={<UploadOutlined />} className='passportapplication-upload-button' type='primary'>
                                                                    Upload Birth Certificate
                                                                </Button>
                                                            </Upload>
                                                        ) : (
                                                            renderFilePreview(birthCertList, setBirthCertList)
                                                        )}


                                                    </div>
                                                </div>

                                                {/* 2. Application Form */}
                                                <div style={{ marginBottom: 24 }}>
                                                    <b>Application Form</b>
                                                    <div style={{ marginTop: 8 }}>
                                                        {applicationFormList.length === 0 ? (
                                                            <Upload
                                                                name="applicationForm"
                                                                fileList={applicationFormList}
                                                                onPreview={handlePreview}
                                                                onChange={({ fileList: newList }) => setApplicationFormList(withPreview(newList))}
                                                                showUploadList={false}
                                                                accept="image/*,application/pdf"
                                                                maxCount={1}
                                                                disabled={uploading}
                                                                beforeUpload={() => false}
                                                                customRequest={({ onSuccess }) => onSuccess("ok")}
                                                            >
                                                                <Button icon={<UploadOutlined />} className='passportapplication-upload-button' type='primary'>
                                                                    Upload Application Form
                                                                </Button>
                                                            </Upload>
                                                        ) : (
                                                            renderFilePreview(applicationFormList, setApplicationFormList)
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 3. Government ID */}
                                                <div style={{ marginBottom: 24 }}>
                                                    <b>One Government-issued ID</b>
                                                    <div style={{ marginTop: 8 }}>
                                                        {govIdList.length === 0 ? (
                                                            <Upload
                                                                name="govId"
                                                                fileList={govIdList}
                                                                onPreview={handlePreview}
                                                                onChange={({ fileList: newList }) => setGovIdList(withPreview(newList))}
                                                                showUploadList={false}
                                                                accept="image/*,application/pdf"
                                                                maxCount={1}
                                                                disabled={uploading}
                                                                beforeUpload={() => false}
                                                                customRequest={({ onSuccess }) => onSuccess("ok")}
                                                            >
                                                                <Button icon={<UploadOutlined />} className='passportapplication-upload-button' type='primary'>
                                                                    Upload Government ID
                                                                </Button>
                                                            </Upload>
                                                        ) : (
                                                            renderFilePreview(govIdList, setGovIdList)
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 4. Additional Documents */}
                                                <div style={{ marginBottom: 24 }}>
                                                    <b>Additional Documents (optional)</b>
                                                    <div style={{ marginTop: 8 }}>
                                                        {additionalDocsList.length === 0 ? (
                                                            <Upload
                                                                name="additionalDocs"
                                                                fileList={additionalDocsList}
                                                                onPreview={handlePreview}
                                                                onChange={({ fileList: newList }) => setAdditionalDocsList(withPreview(newList))}
                                                                showUploadList={false}
                                                                accept="image/*,application/pdf"
                                                                maxCount={1}
                                                                disabled={uploading}
                                                                beforeUpload={() => false}
                                                                customRequest={({ onSuccess }) => onSuccess("ok")}
                                                            >
                                                                <Button icon={<UploadOutlined />} className='passportapplication-upload-button' type='primary'>
                                                                    Upload Additional Document
                                                                </Button>
                                                            </Upload>
                                                        ) : (
                                                            renderFilePreview(additionalDocsList, setAdditionalDocsList)
                                                        )}
                                                    </div>
                                                </div>

                                                <Button style={{ marginTop: 20 }} type="primary" className="passportapplication-submit-button" onClick={handleSubmit}>
                                                    Submit Documents
                                                </Button>
                                            </Card>
                                        )}
                                    </>
                                ) : null}

                                {/* Only show this section if status is 'Documents Uploaded' or beyond */}
                                {application.status && application.status.toLowerCase() !== 'application submitted' &&
                                    application.status.toLowerCase() !== 'application approved' &&
                                    application.status.toLowerCase() !== 'payment complete' && (
                                        <Card title="Uploaded Documents" style={{ marginBottom: 32 }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                                {(() => {
                                                    const docs = application.submittedDocuments || {
                                                        birthCertificate: application.birthCertificate,
                                                        applicationForm: application.applicationForm,
                                                        govId: application.govId,
                                                        additionalDocs: application.additionalDocs
                                                    };

                                                    return (
                                                        <>
                                                            {docs.birthCertificate && (
                                                                <div>
                                                                    <b style={{ display: 'block', marginBottom: 8 }}>PSA Birth Certificate:</b>
                                                                    {renderReadOnlyFile(docs.birthCertificate, "Birth Certificate")}
                                                                </div>
                                                            )}

                                                            {docs.govId && (
                                                                <div>
                                                                    <b style={{ display: 'block', marginBottom: 8 }}>Government-issued ID:</b>
                                                                    {renderReadOnlyFile(docs.govId, "Government ID")}
                                                                </div>
                                                            )}

                                                            {docs.applicationForm && (
                                                                <div>
                                                                    <b style={{ display: 'block', marginBottom: 8 }}>Application Form:</b>
                                                                    {renderReadOnlyFile(docs.applicationForm, "Application Form")}
                                                                </div>
                                                            )}

                                                            {Array.isArray(docs.additionalDocs) && docs.additionalDocs.length > 0 && (
                                                                <div>
                                                                    <b style={{ display: 'block', marginBottom: 8 }}>Additional Documents:</b>
                                                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                                                        <Image.PreviewGroup>
                                                                            {docs.additionalDocs.map((url, idx) => (
                                                                                <div key={`extra-${idx}`}>
                                                                                    {renderReadOnlyFile(url, `Additional Doc ${idx + 1}`)}
                                                                                </div>
                                                                            ))}
                                                                        </Image.PreviewGroup>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </Card>
                                    )}
                            </>
                        )}

                    </Spin>
                </div>
            </div>
        </ConfigProvider>
    );
}
