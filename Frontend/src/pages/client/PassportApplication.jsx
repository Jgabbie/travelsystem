
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Steps, Spin, notification, Upload, Tag, Descriptions, ConfigProvider, Button, Radio, Image, DatePicker, TimePicker, Space, Input, Modal } from 'antd';
import { UploadOutlined, ArrowLeftOutlined, FilePdfOutlined, DeleteOutlined, DownloadOutlined, CheckCircleFilled } from '@ant-design/icons';
import apiFetch from '../../config/fetchConfig';
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
    { title: 'Application Submitted', description: 'Application Submitted' },
    { title: 'Application Approved', description: 'Application Approved' },
    { title: 'Payment Complete', description: 'Payment Complete' },
    { title: 'Documents Uploaded', description: 'Documents Uploaded' },
    { title: 'Documents Approved', description: 'Documents Approved' },
    { title: 'Documents Received', description: 'Documents Received' },
    { title: 'Documents Submitted', description: 'Documents Submitted' },
    { title: 'Processing by DFA', description: 'Processing by DFA' },
    { title: 'DFA Approved', description: 'DFA Approved' },
    { title: 'Passport Released', description: 'Passport Released' },
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
    const [customDateTime, setCustomDateTime] = useState({ date: null, time: null });
    const [confirmingSuggested, setConfirmingSuggested] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);

    const [releaseOption, setReleaseOption] = useState(null);
    const [deliveryAddress, setDeliveryAddress] = useState("");

    const [isConfirmDocumentsOpen, setIsConfirmDocumentsOpen] = useState(false);
    const [isSelectDateModalOpen, setIsSelectDateModalOpen] = useState(false);
    const [isDateSelectedModalOpen, setIsDateSelectedModalOpen] = useState(false);
    const [isDocumentsUploadedModalOpen, setIsDocumentsUploadedModalOpen] = useState(false);
    const [isPassportReleaseOptionSelectedModalOpen, setIsPassportReleaseOptionSelectedModalOpen] = useState(false);

    const fetchPassportApplication = `/passport/applications/${id}`;



    useEffect(() => {
        if (!id) {
            return
        }
        const fetchApplication = async () => {
            setLoading(true);
            try {
                const res = await apiFetch.get(fetchPassportApplication);
                setApplication(res);
            } catch (err) {
                notification.error({ message: 'Failed to load passport application details', placement: 'topRight' });
            } finally {
                setLoading(false);
            }
        };
        const getUserEmail = async () => {
            setLoading(true);
            try {
                const res = await apiFetch.get('/user/data')
                console.log("User data:", res);
                console.log("User email:", res.userData.email);
                setApplication(prev => ({ ...prev, email: res.userData.email }));
            } catch (err) {
                notification.error({ message: 'Failed to load user data', placement: 'topRight' });
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
            notification.warning({ message: 'Please upload a receipt first.', placement: 'topRight' });
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

                const uploadRes = await apiFetch.post('/upload/upload-receipt', formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                const imageUrl = uploadRes.url;

                console.log("Uploaded receipt URL:", imageUrl);

                const paymentRes = await apiFetch.post('/payment/manual-passport', {
                    applicationId: application._id,
                    applicationNumber: application.applicationNumber,
                    amount: 2000,
                    proofImage: imageUrl,
                });

                console.log("Manual payment response:", paymentRes);

                navigate(paymentRes.redirectUrl);
                notification.success({ message: "Manual payment submitted successfully. Awaiting verification.", placement: 'topRight' });
                setPaymentCompleted(true);

            } else if (method === 'paymongo') {
                // Make sure application exists


                if (!application) {
                    notification.error({ message: "Application not found.", placement: 'topRight' });
                    return;
                }


                const payload = {
                    applicationId: application._id,
                    applicationNumber: application.applicationNumber,
                    totalPrice: 1,
                };

                console.log("Creating checkout session with payload:", payload);

                // Send request to create checkout session
                const paymongoResponse = await apiFetch.post('/payment/create-checkout-session-passport', payload);
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
            notification.error({ message: "Payment failed", placement: 'topRight' });
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
                        type="dashed"
                        style={{ minWidth: 220 }}
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
                    className='passportapplication-removefile-button'
                    type="primary"
                    icon={<DeleteOutlined />}
                    onClick={() => setter([])} // Clears the specific list
                    size="small"
                >
                    Remove
                </Button>
            </div>
        );
    };

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

        return (
            <div style={{ width: 150 }}>
                {isPdf ? (
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
                        alt={label}
                        width={250}
                        height={250}
                        style={{
                            borderRadius: 8,
                            objectFit: 'cover',
                            border: '1px solid #f0f0f0'
                        }}
                        placeholder={<div style={{ width: 150, height: 150, background: '#eee' }} />}
                    />
                )}

                <Button
                    className='passportapplication-download-button'
                    type="primary"
                    icon={<DownloadOutlined />}
                    size="small"
                    onClick={handleDownload}
                >
                    Download {isPdf ? 'PDF' : 'Image'}
                </Button>
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
            notification.warning({ message: "Please wait until uploads finish", placement: 'topRight' });
            return;
        }

        if (!birthCertList[0] || !applicationFormList[0] || !govIdList[0]) {
            notification.warning({ message: "Please upload the required documents before submitting.", placement: 'topRight' });
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

            if (!formData.has("files")) {
                notification.warning({ message: "Please upload the required documents before submitting.", placement: 'topRight' });
                return;
            }

            const res = await apiFetch.post(
                '/upload/upload-passport-requirements',
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            const uploaded = res.urls;

            console.log("Uploaded document URLs:", uploaded);

            // Save URLs to your application
            await apiFetch.put(`/passport/applications/${id}/documents`, {
                birthCertificate: uploaded[0],
                applicationForm: uploaded[1],
                govId: uploaded[2],
                additionalDocs: uploaded.slice(3),
            });

            // reset
            setBirthCertList([]);
            setApplicationFormList([]);
            setGovIdList([]);
            setAdditionalDocsList([]);

            const refreshed = await apiFetch.get(`/passport/applications/${id}`);
            setApplication(refreshed);

            setIsDocumentsUploadedModalOpen(true);
        } catch (err) {
            console.error(err);
            notification.error({ message: "Failed to submit documents", placement: 'topRight' });
        } finally {
            setUploading(false);
        }
    };

    //HANDLE CONFIRMATION OF SUGGESTED APPOINTMENT
    const handleConfirmSuggested = async () => {
        if (!application?.suggestedAppointmentSchedules || selectedSuggestedIndex === null) {
            notification.warning({ message: 'Please select an appointment option first.', placement: 'topRight' });
            return;
        }

        let dateToSend = null;
        let timeToSend = null;

        if (selectedSuggestedIndex === 'others') {
            if (!customDateTime.date || !customDateTime.time) {
                notification.warning({ message: 'Please fill in all custom date and time fields.', placement: 'topRight' });
                return;
            }

            dateToSend = dayjs(customDateTime.date).format('YYYY-MM-DD');
            timeToSend = customDateTime.time.format('h:mm A');

        } else if (typeof selectedSuggestedIndex === 'number') {
            const selected = application.suggestedAppointmentSchedules[selectedSuggestedIndex];

            if (!selected?.date || !selected?.time) {
                notification.error({ message: 'Selected option is missing date or time.', placement: 'topRight' });
                return;
            }

            dateToSend = dayjs(selected.date).format('YYYY-MM-DD');
            timeToSend = selected.time;
        }

        try {
            setConfirmingSuggested(true);

            await apiFetch.put(`/passport/applications/${id}/choose-appointment`, {
                date: dateToSend,
                time: timeToSend
            });

            // optional: keep state in sync
            setSelectedDate(dateToSend);
            setSelectedTime(timeToSend);

            const refreshed = await apiFetch.get(`/passport/applications/${id}`);
            setApplication(refreshed);
            setIsDateSelectedModalOpen(true);
        } catch (error) {
            notification.error({ message: 'Failed to confirm appointment schedule.', placement: 'topRight' });
        } finally {
            setConfirmingSuggested(false);
        }
    };
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


    //IF NO ID IN URL, GO BACK TO USER APPLICATIONS
    useEffect(() => {
        if (!id) {
            navigate('/home');
        }
    }, [id, navigate]);


    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>
            {loading || uploading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <Spin size="large" description={uploading ? "Uploading Documents..." : "Loading..."} />
                </div>
            ) : (
                <div className='passportapplication-container'>

                    <Button
                        type='primary'
                        className='passportapplication-back-button'
                        icon={<ArrowLeftOutlined />}
                        style={{ marginTop: 24, marginBottom: 8 }}
                        onClick={() => navigate('/user-applications')}
                    >
                        Back
                    </Button>
                    <div className="app-detail-header">
                        <h2 >Passport Application Details</h2>
                        <p >Monitor progress, payment, and document actions with a cleaner workflow view.</p>
                    </div>

                    {/* SUGGESTED APPOINTMENT */}
                    {application?.status && application?.status?.toLowerCase() === 'application submitted' && application.suggestedAppointmentScheduleChosen.date !== "" && application.suggestedAppointmentScheduleChosen.time !== "" && (
                        <div style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                            <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>SUGGESTED APPOINTMENT</h2>
                            <p style={{ margin: 0, fontSize: 14 }}>
                                You have successfully chosen your appointment schedule.
                                Kindly wait for its approval. We will notify you once the date is available.
                            </p>
                        </div>
                    )}

                    {/*APPROVED APPOINTMENT DATE AND TIME */}
                    {application?.status && application?.status?.toLowerCase() === 'application approved' && (
                        <div style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                            <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>YOUR APPOINTMENT DATE AND TIME</h2>
                            <p style={{ margin: 0, fontSize: 14 }}>
                                Your appointment has been scheduled for <strong>{dayjs(application.preferredDate).format('MMM D, YYYY') || dayjs(application.suggestedAppointmentScheduleChosen.date).format("MMM DD, YYYY")}</strong> at <strong>{application.suggestedAppointmentScheduleChosen.time || application.preferredTime}</strong>.
                            </p>
                        </div>
                    )}

                    {/* DOCUMENTS APPROVED */}
                    {application?.status && application?.status?.toLowerCase() === 'documents approved' && (
                        <div style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                            <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>DOCUMENTS APPROVED</h2>
                            <p style={{ margin: 0, fontSize: 14 }}>
                                Your uploaded documents have been approved by our team.
                                You may now submit or deliver the physical copies of your documents to our office.
                            </p>
                        </div>
                    )}

                    {/* THE REST OF THE PROCESS */}
                    {application?.status && (application?.status?.toLowerCase() === 'documents received' ||
                        application?.status?.toLowerCase() === 'documents submitted' ||
                        application?.status?.toLowerCase() === 'processing by dfa') && (
                            <div style={{ marginBottom: 24, borderLeft: '4px solid #faad14', backgroundColor: '#fffbe6', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                                <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#faad14' }}>PROGRESS TRACKER</h2>
                                <p style={{ margin: 0, fontSize: 14 }}>
                                    Kindly refer to the progress tracker for the remaining steps of the process.
                                    You will be also receiving email notifications and updates regarding the status of your application, so please stay tuned to your inbox.
                                </p>
                            </div>
                        )}

                    {/* APPLICATION DENIED */}
                    {application?.status && application?.status?.toLowerCase() === 'rejected' && (
                        <div style={{ marginBottom: 24, borderLeft: '4px solid #ff4d4f', backgroundColor: '#fff1f0', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                            <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#ff4d4f' }}>APPLICATION DENIED</h2>
                            <p style={{ margin: 0, fontSize: 14 }}>
                                Unfortunately, your application has been denied.
                                You may contact our support team for further assistance or clarification regarding your application.
                                For now, your documents will be delivered back to you.
                                Please check your email for the details of the document return process.
                            </p>
                        </div>
                    )}

                    {/* APPLICATION SUCCESS */}
                    {application?.status && application?.status?.toLowerCase() === 'dfa approved' && (
                        <div style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                            <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>APPLICATION APPROVED</h2>
                            <p style={{ margin: 0, fontSize: 14 }}>
                                Congratulations! Your application has been approved.
                                Your passport has been released kindly pick it up in the DFA office.
                            </p>
                        </div>
                    )}

                    {/* PASSPORT FOR RELEASE */}
                    {application?.status && application?.status?.toLowerCase() === 'passport released' && (
                        <div style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                            <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>PASSPORT FOR RELEASE</h2>
                            <p style={{ margin: 0, fontSize: 14 }}>
                                Your passport is ready for release.
                                Please proceed to the DFA office to collect it.
                            </p>
                        </div>
                    )}


                    {application && (
                        <>
                            <div className="app-detail-shell">
                                <div style={{ display: 'flex', flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
                                    <div style={{ flex: '1 1 620px', minWidth: 320 }}>
                                        <Descriptions title="Application Info" bordered column={1}>
                                            <Descriptions.Item label="Reference">{application.applicationNumber || application._id}</Descriptions.Item>
                                            <Descriptions.Item label="Date Submitted">{dayjs(application.createdAt).format('MMM D, YYYY')}</Descriptions.Item>
                                            <Descriptions.Item label="Applicant Name">{application.username}</Descriptions.Item>
                                            <Descriptions.Item label="DFA Location">{application.dfaLocation}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Date">{dayjs(application.preferredDate).format('MMM D, YYYY')}</Descriptions.Item>
                                            <Descriptions.Item label="Preferred Time">{application.preferredTime}</Descriptions.Item>
                                            <Descriptions.Item label="Application Type">{application.applicationType}</Descriptions.Item>

                                        </Descriptions>


                                        {application?.status && application.status?.toLowerCase() === 'application submitted' && application?.suggestedAppointmentScheduleChosen?.date === "" && application?.suggestedAppointmentScheduleChosen?.time === "" && (
                                            <div style={{ marginBottom: 32, marginTop: 32, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                                                <h3 style={{ marginTop: 0 }}>Suggested Appointment Options</h3>
                                                {Array.isArray(application.suggestedAppointmentSchedules) && application.suggestedAppointmentSchedules.length > 0 ? (
                                                    <>
                                                        <div className='passportapplication-suggestedoptions'>
                                                            {application.suggestedAppointmentSchedules.map((slot, index) => {
                                                                const isSelected = selectedSuggestedIndex === index;

                                                                return (
                                                                    <div
                                                                        key={`${slot.date || 'date'}-${slot.time || 'time'}-${index}`}
                                                                        onClick={() => setSelectedSuggestedIndex(index)}
                                                                        className='passportapplication-suggestedoption-card'
                                                                        style={{
                                                                            border: isSelected ? '2px solid #305797' : '1px solid #f0f0f0',
                                                                            boxShadow: isSelected ? '0 0 0 2px rgba(48,87,151,0.15)' : 'none'
                                                                        }}
                                                                    >
                                                                        <Tag color="blue">Option {index + 1}</Tag>
                                                                        <div className='passportapplication-suggestedoptions-date' style={{ marginTop: 8, fontWeight: 600 }}>
                                                                            {dayjs(slot.date).format("MMM DD, YYYY") || 'Date TBD'}
                                                                        </div>
                                                                        <div className='passportapplication-suggestedoptions-time' style={{ color: '#6b7280' }}>
                                                                            {slot.time || 'Time TBD'}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                            {/* "Others" Option Card */}
                                                            <div
                                                                onClick={() => setSelectedSuggestedIndex('others')}
                                                                style={{
                                                                    border: selectedSuggestedIndex === 'others' ? '2px solid #305797' : '1px solid #f0f0f0',
                                                                    boxShadow: selectedSuggestedIndex === 'others' ? '0 0 0 2px rgba(48,87,151,0.15)' : 'none'
                                                                }}
                                                            >
                                                                <Tag color="orange">Others</Tag>
                                                                <div className='passportapplication-suggestedoptions-group'>
                                                                    <Space style={{ marginTop: 10 }} orientation="vertical">
                                                                        <DatePicker
                                                                            className='passportapplication-suggestedoptions-datepicker'
                                                                            disabledDate={disableDates}
                                                                            placeholder="Select Date"
                                                                            onChange={(date) => setCustomDateTime(prev => ({ ...prev, date }))}
                                                                            onClick={(e) => e.stopPropagation()} // Prevents card click trigger issues
                                                                        />
                                                                        <TimePicker
                                                                            className='passportapplication-suggestedoptions-timepicker'
                                                                            format="h:mm A"
                                                                            use12Hours
                                                                            showNow={false}
                                                                            minuteStep={30}
                                                                            disabledTime={() => ({
                                                                                disabledHours
                                                                            })}
                                                                            placeholder="Select Time"
                                                                            onChange={(time) => setCustomDateTime(prev => ({ ...prev, time }))}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </Space>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                                            <Button
                                                                className='passport-submitdate'
                                                                type="primary"
                                                                onClick={() => {
                                                                    setIsSelectDateModalOpen(true);
                                                                }}
                                                                loading={confirmingSuggested}
                                                                disabled={
                                                                    selectedSuggestedIndex === null ||
                                                                    (selectedSuggestedIndex === 'others' && (!customDateTime.date || !customDateTime.time))
                                                                }
                                                            >
                                                                Confirm selected date
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p style={{ margin: 0, color: '#6b7280' }}>No suggested dates yet. Please check back later.</p>
                                                )}
                                            </div>
                                        )}

                                        {application?.status && application?.status?.toLowerCase() === 'application approved' && !paymentCompleted && (
                                            <div style={{ marginBottom: 32, marginTop: 32, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                                                <h3 style={{ marginTop: 0 }}>Payment</h3>

                                                <div className="payment-methods-wrapper">
                                                    <Radio.Group
                                                        onChange={(e) => setMethod(e.target.value)}
                                                        value={method}
                                                        className="payment-methods-cards"
                                                        style={{ width: '100%', display: 'flex', gap: '16px' }}
                                                    >
                                                        <Radio.Button
                                                            value="paymongo"
                                                            className={`payment-card ${method === "paymongo" ? "selected" : ""}`}
                                                            style={{ flex: 1, height: 'auto', padding: '20px', borderRadius: 8 }}
                                                        >
                                                            <div className="card-content">
                                                                <h3>Paymongo</h3>
                                                                <p>Pay securely via Credit Card, GCash, or Maya. Rates depend on the transaction method.</p>
                                                                <p style={{ color: "#FF4D4F", fontWeight: "500", fontStyle: "italic" }}>Note: The rate for using this payment method is 3.5%.</p>
                                                            </div>
                                                        </Radio.Button>

                                                        <Radio.Button
                                                            value="manual"
                                                            className={`payment-card ${method === "manual" ? "selected" : ""}`}
                                                            style={{ flex: 1, height: 'auto', padding: '20px', borderRadius: 8 }}
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
                                                    className="passportapplication-submit-button"
                                                    onClick={handleSubmitPayment}
                                                    disabled={paymentLoading || (method === 'manual' && fileList.length === 0)}
                                                >
                                                    {method === 'manual' ? 'Submit Payment' : 'Proceed Paymongo'}
                                                </Button>

                                            </div>
                                        )}

                                        {/* UPLOAD DOCUMENTS AND PAYMENT COMPLETE */}
                                        {application?.status && application?.status?.toLowerCase() === 'payment complete' && (
                                            <div style={{ border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff', marginTop: 32, marginBottom: 32 }}>
                                                <h3 style={{ marginTop: 0 }}>Upload Requirements</h3>

                                                <div className="passport-requirements-grid">
                                                    <div className="passport-requirement-card">
                                                        <b style={{ fontSize: 12 }}>PSA-issued Birth Certificate</b>
                                                        {birthCertList[0] ? (
                                                            (() => {
                                                                const file = birthCertList[0];
                                                                const isPdf = file.type === 'application/pdf' ||
                                                                    file.originFileObj?.type === 'application/pdf' ||
                                                                    file.name?.toLowerCase().endsWith('.pdf');
                                                                return isPdf ? (
                                                                    <Button
                                                                        className='passport-requirement-file-preview-button'
                                                                        type="dashed"
                                                                        onClick={() => handlePreview(file)}
                                                                    >
                                                                        Open PDF
                                                                    </Button>
                                                                ) : (
                                                                    <div className="passport-requirement-placeholder">
                                                                        <Image
                                                                            src={file.preview || file.url}
                                                                            alt="PSA-issued Birth Certificate"
                                                                            preview={false}
                                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                            onClick={() => handlePreview(file)}
                                                                        />
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            <div className="passport-requirement-placeholder">
                                                                <span className="passport-requirement-placeholder-text">No file</span>
                                                            </div>
                                                        )}
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
                                                                        Upload Requirement
                                                                    </Button>
                                                                </Upload>
                                                            ) : (
                                                                <Button
                                                                    className='passportapplication-removefile-button'
                                                                    icon={<DeleteOutlined />}
                                                                    type="primary"
                                                                    onClick={() => setBirthCertList([])}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="passport-requirement-card" >
                                                        <b style={{ fontSize: 12 }}>Application Form</b>
                                                        {applicationFormList[0] ? (
                                                            (() => {
                                                                const file = applicationFormList[0];
                                                                const isPdf = file.type === 'application/pdf' ||
                                                                    file.originFileObj?.type === 'application/pdf' ||
                                                                    file.name?.toLowerCase().endsWith('.pdf');
                                                                return isPdf ? (
                                                                    <Button
                                                                        className='passport-requirement-file-preview-button'
                                                                        type="dashed"
                                                                        onClick={() => handlePreview(file)}
                                                                    >
                                                                        Open PDF
                                                                    </Button>
                                                                ) : (
                                                                    <div className="passport-requirement-placeholder">
                                                                        <Image
                                                                            src={file.preview || file.url}
                                                                            alt="Application Form"
                                                                            preview={false}
                                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                            onClick={() => handlePreview(file)}
                                                                        />
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            <div className="passport-requirement-placeholder">
                                                                <span className="passport-requirement-placeholder-text">No file</span>
                                                            </div>
                                                        )}
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
                                                                        Upload Requirement
                                                                    </Button>
                                                                </Upload>
                                                            ) : (
                                                                <Button
                                                                    className='passportapplication-removefile-button'
                                                                    icon={<DeleteOutlined />}
                                                                    type="primary"
                                                                    onClick={() => setApplicationFormList([])}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="passport-requirement-card">
                                                        <b style={{ fontSize: 12 }}>One Government-issued ID</b>
                                                        {govIdList[0] ? (
                                                            (() => {
                                                                const file = govIdList[0];
                                                                const isPdf = file.type === 'application/pdf' ||
                                                                    file.originFileObj?.type === 'application/pdf' ||
                                                                    file.name?.toLowerCase().endsWith('.pdf');
                                                                return isPdf ? (
                                                                    <Button
                                                                        className='passport-requirement-file-preview-button'
                                                                        type="dashed"
                                                                        onClick={() => handlePreview(file)}
                                                                    >
                                                                        Open PDF
                                                                    </Button>
                                                                ) : (
                                                                    <div className="passport-requirement-placeholder">
                                                                        <Image
                                                                            src={file.preview || file.url}
                                                                            alt="Government-issued ID"
                                                                            preview={false}
                                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                            onClick={() => handlePreview(file)}
                                                                        />
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            <div className="passport-requirement-placeholder">
                                                                <span className="passport-requirement-placeholder-text">No file</span>
                                                            </div>
                                                        )}
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
                                                                        Upload Requirement
                                                                    </Button>
                                                                </Upload>
                                                            ) : (
                                                                <Button
                                                                    className='passportapplication-removefile-button'
                                                                    icon={<DeleteOutlined />}
                                                                    type="primary"
                                                                    onClick={() => setGovIdList([])}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="passport-requirement-card">
                                                        <b style={{ fontSize: 12 }}>Additional Documents (optional)</b>
                                                        {additionalDocsList[0] ? (
                                                            (() => {
                                                                const file = additionalDocsList[0];
                                                                const isPdf = file.type === 'application/pdf' ||
                                                                    file.originFileObj?.type === 'application/pdf' ||
                                                                    file.name?.toLowerCase().endsWith('.pdf');
                                                                return isPdf ? (
                                                                    <Button
                                                                        className='passport-requirement-file-preview-button'
                                                                        type="dashed"
                                                                        onClick={() => handlePreview(file)}
                                                                    >
                                                                        Open PDF
                                                                    </Button>
                                                                ) : (
                                                                    <div className="passport-requirement-placeholder">
                                                                        <Image
                                                                            src={file.preview || file.url}
                                                                            alt="Additional Documents"
                                                                            preview={false}
                                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                            onClick={() => handlePreview(file)}
                                                                        />
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            <div className="passport-requirement-placeholder">
                                                                <span className="passport-requirement-placeholder-text">No file</span>
                                                            </div>
                                                        )}
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
                                                                        Upload Requirement
                                                                    </Button>
                                                                </Upload>
                                                            ) : (
                                                                <Button
                                                                    className='passportapplication-removefile-button'
                                                                    icon={<DeleteOutlined />}
                                                                    type="primary"
                                                                    onClick={() => setAdditionalDocsList([])}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button style={{ marginTop: 20 }} type="primary" className="passportapplication-submit-button" onClick={
                                                    () => setIsConfirmDocumentsOpen(true)
                                                }>
                                                    Submit Documents
                                                </Button>
                                            </div>
                                        )}


                                        {/* DOCUMENTS UPLOADED */}
                                        {application?.status && application?.status?.toLowerCase() !== 'application submitted' &&
                                            application?.status?.toLowerCase() !== 'application approved' &&
                                            application?.status?.toLowerCase() !== 'payment complete' &&
                                            application?.status?.toLowerCase() !== 'rejected' && (
                                                <div className='passport-document-uploaded-section'>
                                                    <h3 style={{ marginTop: 0 }}>Uploaded Documents</h3>
                                                    <div className='passport-uploaded-documents-container'>
                                                        {(() => {
                                                            const docs = application.submittedDocuments || {
                                                                birthCertificate: application.birthCertificate,
                                                                applicationForm: application.applicationForm,
                                                                govId: application.govId,
                                                                additionalDocs: application.additionalDocs
                                                            };

                                                            return (
                                                                <div className='passport-document-container-group'>
                                                                    {docs.birthCertificate && (
                                                                        <div className="passport-document-container">
                                                                            <b style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>PSA Birth Certificate:</b>
                                                                            {renderReadOnlyFile(docs.birthCertificate, "Birth Certificate")}
                                                                        </div>
                                                                    )}

                                                                    {docs.applicationForm && (
                                                                        <div className="passport-document-container">
                                                                            <b style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Application Form:</b>
                                                                            {renderReadOnlyFile(docs.applicationForm, "Application Form")}
                                                                        </div>
                                                                    )}

                                                                    {docs.govId && (
                                                                        <div className="passport-document-container">
                                                                            <b style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Government-issued ID:</b>
                                                                            {renderReadOnlyFile(docs.govId, "Government ID")}
                                                                        </div>
                                                                    )}

                                                                    {Array.isArray(docs.additionalDocs) && docs.additionalDocs.length > 0 && (
                                                                        <div className="passport-document-container">
                                                                            <b style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Additional Documents:</b>
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
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                    </div>

                                    <div style={{ flex: '1 1 300px', minWidth: 280 }}>
                                        <div style={{ marginBottom: 16, border: '1px solid #dde4ef', borderRadius: 10, padding: 12, background: '#f9fbff' }}>
                                            <p className="app-detail-kicker" style={{ marginBottom: 6 }}>Overview</p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span>Status</span>
                                                <Tag color={getStatusColor(application.status)}>{application.status}</Tag>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Type</span>
                                                <strong>{application.applicationType || 'N/A'}</strong>
                                            </div>
                                        </div>

                                        {application?.status && application?.status?.toLowerCase() !== 'rejected' && (
                                            <div style={{ border: '1px solid #dde4ef', borderRadius: 10, padding: 12, background: '#ffffff', minHeight: 180 }}>
                                                <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Progress Tracker</h3>
                                                <div style={{ overflowX: 'auto', paddingBottom: 24 }}>
                                                    <Steps
                                                        orientation="vertical"
                                                        size="default"
                                                        current={currentStep}
                                                        style={{ minWidth: 290, width: 'max-content' }}
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
                                            </div>
                                        )}
                                    </div>
                                </div>



                            </div>
                        </>
                    )}

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
                                    await handleSubmit();
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


                    {/* SELECT DATE CONFIRMATION */}
                    <Modal
                        open={isSelectDateModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        style={{ top: 220 }}
                        onCancel={() => {
                            setIsSelectDateModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Select Date</h1>
                            <p className='signup-success-text'>Are you sure you want to select this date?</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        handleConfirmSuggested();
                                        setIsSelectDateModalOpen(false);
                                    }}
                                >
                                    Select
                                </Button>
                                <Button
                                    type='primary'
                                    className='logout-cancel-btn'
                                    onClick={() => {
                                        setIsSelectDateModalOpen(false);
                                    }}
                                >
                                    Cancel
                                </Button>

                            </div>

                        </div>
                    </Modal>

                    {/* DATE SELECTED MODAL */}
                    <Modal
                        open={isDateSelectedModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        style={{ top: 220 }}
                        onCancel={() => {
                            setIsDateSelectedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Date Selected Successfully!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                            </div>

                            <p className='signup-success-text'>The date has been selected.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsDateSelectedModalOpen(false);
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>


                    {/* DOCUMENTS UPLOADED MODAL */}
                    <Modal
                        open={isDocumentsUploadedModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        style={{ top: 220 }}
                        onCancel={() => {
                            setIsDocumentsUploadedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Documents Uploaded Successfully!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                            </div>

                            <p className='signup-success-text'>The documents have been uploaded.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsDocumentsUploadedModalOpen(false);
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>





                    {/* PASSPORT RELEASE OPTION SELECTED MODAL */}
                    <Modal
                        open={isPassportReleaseOptionSelectedModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        style={{ top: 220 }}
                        onCancel={() => {
                            setIsPassportReleaseOptionSelectedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Passport Release Option Selected!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                            </div>

                            <p className='signup-success-text'>You have selected a passport release option.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsPassportReleaseOptionSelectedModalOpen(false);
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>

                </div>
            )}

        </ConfigProvider >
    );
}

