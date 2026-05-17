
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Steps, Spin, notification, Upload, Tag, ConfigProvider, Button, Radio, Image, DatePicker, TimePicker, Space, Input, Modal, Descriptions } from 'antd';
import { UploadOutlined, ArrowLeftOutlined, FilePdfOutlined, DeleteOutlined, DownloadOutlined, CheckCircleFilled, EyeOutlined } from '@ant-design/icons';
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
        case 'payment completed':
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
    { title: 'Payment Completed', description: 'Payment Completed' },
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
    const [applicationFormList, setApplicationFormList] = useState([]);

    const [method, setMethod] = useState(null); // default selected payment method  
    const [fileList, setFileList] = useState([]);
    const [paymentCompleted, setPaymentCompleted] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);

    const [pendingManualPayment, setPendingManualPayment] = useState(false);
    const [servicePendingManualPayment, setServicePendingManualPayment] = useState(false);

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
        const checkPendingManualPayment = async () => {
            try {
                const transactionsRes = await apiFetch.get(`/transaction/application/${id}`);
                const transactions = Array.isArray(transactionsRes) ? transactionsRes : (transactionsRes?.transactions || []);
                const hasPendingPenalty = transactions.some(
                    (tx) => tx.status === 'Pending' &&
                        tx.method === 'Manual' &&
                        (tx.applicationType === 'Passport Penalty Fee')
                );

                const hasPendingRegularPayment = transactions.some(
                    (tx) => tx.status === 'Pending' &&
                        tx.method === 'Manual' &&
                        (tx.applicationType === 'Passport Application')
                );

                setPendingManualPayment(hasPendingPenalty);
                setServicePendingManualPayment(hasPendingRegularPayment);
            } catch (err) {
                console.error('Could not fetch transactions:', err);
            }
        };
        const getUserEmail = async () => {
            setLoading(true);
            try {
                const res = await apiFetch.get('/user/data')
                setApplication(prev => ({ ...prev, email: res.userData.email }));
            } catch (err) {
                notification.error({ message: 'Failed to load user data', placement: 'topRight' });
            } finally {
                setLoading(false);
            }
        }
        getUserEmail();
        fetchApplication();
        checkPendingManualPayment();
    }, [id]);

    const normalizeResubmissionTarget = (target) => {
        switch (target) {
            case 'birthCertificate':
                return 'birthCert';
            case 'applicationForm':
            case 'govId':
                return target;
            default:
                return null;
        }
    };

    const requestedResubmissionTargets = (() => {
        const targets = [];

        if (Array.isArray(application?.resubmissionTargets)) {
            application.resubmissionTargets.forEach((target) => {
                const normalized = normalizeResubmissionTarget(target);
                if (normalized) {
                    targets.push(normalized);
                }
            });
        }

        const legacyTarget = normalizeResubmissionTarget(application?.resubmissionTarget);
        if (legacyTarget) {
            targets.push(legacyTarget);
        }

        return [...new Set(targets)];
    })();

    const resubmissionRequested = Boolean(
        application &&
        (application.status || '').toLowerCase() === 'payment completed' &&
        requestedResubmissionTargets.length > 0
    );

    const isRequestedResubmissionTarget = (target) => !resubmissionRequested || requestedResubmissionTargets.includes(target);

    const hasSelectedFileForTarget = (target) => {
        switch (target) {
            case 'birthCert':
                return Boolean(birthCertList[0]);
            case 'applicationForm':
                return Boolean(applicationFormList[0]);
            case 'govId':
                return Boolean(govIdList[0]);
            default:
                return false;
        }
    };

    // Find the current step index based on status
    const currentStep = application
        ? Math.max(
            0,
            PASSPORT_STEPS.findIndex(
                s => (s.title || '').toLowerCase() === (application.status || '').toLowerCase()
            )
        )
        : 0;

    // Get deadline and set date from processSteps object
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

    // Compute status set date and deadline for client view
    const statusDeadlineDaysMap = {
        'Payment Completed': 5,
    };

    const appointmentDate = application?.preferredDate
        ? dayjs(application.preferredDate)
        : application?.suggestedAppointmentScheduleChosen && application.suggestedAppointmentScheduleChosen.date
            ? dayjs(application.suggestedAppointmentScheduleChosen.date)
            : null;

    const getStatusSetDate = (app) => {
        if (!app) return null;
        const history = app.statusHistory;
        if (Array.isArray(history) && history.length > 0) {
            for (let i = history.length - 1; i >= 0; i--) {
                const h = history[i];
                if (String(h.status).toLowerCase() === String(app.status).toLowerCase()) {
                    return dayjs(h.changedAt);
                }
            }
        }
        if (app.statusUpdatedAt) return dayjs(app.statusUpdatedAt);
        if (app.updatedAt) return dayjs(app.updatedAt);
        if (app.createdAt) return dayjs(app.createdAt);
        return null;
    };

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

    const currentStatusSetDate = getStatusSetDate(application);
    const deadlineDays = application?.statusDeadlineDays ?? statusDeadlineDaysMap[application?.status] ?? null;
    let statusDeadlineDate = application?.statusDeadlineDate
        ? dayjs(application.statusDeadlineDate)
        : appointmentDate && Number.isFinite(deadlineDays)
            ? appointmentDate.subtract(deadlineDays, 'day').startOf('day')
            : null;

    if (String(application?.status || '').toLowerCase() === 'payment completed' && application?.secondChance && application?.secondDeadline) {
        statusDeadlineDate = dayjs(application.secondDeadline);
    }
    const penaltyStateLabel = application?.reachedSecondDeadline
        ? 'Penalty Expired'
        : application?.secondChance
            ? 'Penalty Paid'
            : application?.onPenalty
                ? 'On Penalty'
                : null;

    const [hasProcessedRejection, setHasProcessedRejection] = useState(false);

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
                        `/passport/applications/${id}/status`,
                        { status: 'Rejected' },
                        { withCredentials: true }
                    );
                    notification.warning({
                        message: 'Application Rejected',
                        description: 'Your application has been rejected due to missed deadline.',
                        placement: 'topRight'
                    });
                    setApplication(prev => ({ ...prev, status: 'Rejected' }));
                } catch (err) {
                    console.error('Failed to auto-reject application:', err);
                }
            };
            updateStatus();
        }
    }, [statusDeadlineDate, application, hasProcessedRejection, id]);

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


    //SUBMIT PAYMENT
    const handleSubmitPayment = async () => {
        if (method === 'manual' && fileList.length === 0) {
            notification.warning({ message: 'Please upload a receipt first.', placement: 'topRight' });
            return;
        }

        try {
            setPaymentLoading(true);

            if (method === 'manual') {

                const file = fileList[0].originFileObj;


                const formData = new FormData();
                formData.append("file", file);

                const uploadRes = await apiFetch.post('/upload/upload-receipt', formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                const imageUrl = uploadRes.url;

                const amountToPay = application?.onPenalty ? 1500 : 2000;
                const endpoint = application?.onPenalty ? '/payment/manual-passport-penalty' : '/payment/manual-passport';
                const paymentRes = await apiFetch.post(endpoint, {
                    applicationId: application._id,
                    applicationNumber: application.applicationNumber,
                    amount: amountToPay,
                    proofImage: imageUrl,
                });


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
                };


                // Send request to create checkout session
                const endpoint = application?.onPenalty ? '/payment/create-checkout-session-passport-penalty' : '/payment/create-checkout-session-passport';
                const paymongoResponse = await apiFetch.post(endpoint, payload);
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

        if (!url) {
            return <div style={{ fontSize: 13, color: '#6b7280' }}>No file</div>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 320 }}>
                <Button
                    className='passportapplication-preview-button'
                    size="small"
                    type="default"
                    onClick={() => handlePreview(url)}
                >
                    Preview File
                </Button>

                <Button
                    className='passportapplication-download-button'
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

    const getRequirementPreviewFile = (key) => {
        const submittedDocuments = application?.submittedDocuments || application?.documents || {};

        switch (key) {
            case 'birthCert':
                return birthCertList[0] || submittedDocuments.birthCertificate || application?.birthCertificate || null;
            case 'applicationForm':
                return applicationFormList[0] || submittedDocuments.applicationForm || application?.applicationForm || null;
            case 'govId':
                return govIdList[0] || submittedDocuments.govId || application?.govId || null;
            default:
                return null;
        }
    };

    //HANDLE PREVIEW FOR UPLOADED FILES
    const handlePreview = (file) => {
        const src = typeof file === 'string'
            ? file
            : file.preview || file.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj) : null);
        if (src) {
            window.open(src, '_blank', 'noopener,noreferrer');
            return;
        }
        notification.error({ message: 'Preview unavailable', placement: 'topRight' });
    };

    //ADD PREVIEW URL TO FILES FOR UPLOADED DOCUMENTS
    const withPreview = (newList) =>
        newList.map((file) => {
            if (!file.preview && file.originFileObj) {
                file.preview = URL.createObjectURL(file.originFileObj);
            }
            return file;
        });

    const beforeRequirementUpload = (file) => {
        const isLt3M = file.size / 1024 / 1024 < 3;
        if (!isLt3M) {
            notification.error({ message: 'Image/PDF must be smaller than 3MB!', placement: 'topRight' });
        }
        return isLt3M || Upload.LIST_IGNORE;
    };

    //HANDLE SUBMISSION OF UPLOADED DOCUMENTS
    const handleSubmit = async () => {
        if (uploading) {
            notification.warning({ message: "Please wait until uploads finish", placement: 'topRight' });
            return;
        }

        if (!resubmissionRequested) {
            if (!birthCertList[0] || !applicationFormList[0] || !govIdList[0]) {
                notification.warning({ message: "Please upload the required documents before submitting.", placement: 'topRight' });
                return;
            }
        } else {
            if (requestedResubmissionTargets.length === 0) {
                notification.warning({ message: "No document is currently marked for resubmission.", placement: 'topRight' });
                return;
            }
            if (!requestedResubmissionTargets.some(hasSelectedFileForTarget)) {
                notification.warning({ message: "Please upload the requested document before submitting.", placement: 'topRight' });
                return;
            }
        }
        try {
            setUploading(true);

            const formData = new FormData();

            const appendedOrder = [];
            if (birthCertList[0] && isRequestedResubmissionTarget('birthCert')) {
                formData.append("files", birthCertList[0].originFileObj);
                appendedOrder.push('birthCertificate');
            }

            if (applicationFormList[0] && isRequestedResubmissionTarget('applicationForm')) {
                formData.append("files", applicationFormList[0].originFileObj);
                appendedOrder.push('applicationForm');
            }

            if (govIdList[0] && isRequestedResubmissionTarget('govId')) {
                formData.append("files", govIdList[0].originFileObj);
                appendedOrder.push('govId');
            }



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
            // Map uploaded urls back to the fields we appended in order
            const payload = {};
            let urlIndex = 0;
            appendedOrder.forEach((key) => {
                const url = uploaded[urlIndex];
                if (!url) return;
                payload[key] = url;
                urlIndex += 1;
            });

            await apiFetch.put(`/passport/applications/${id}/documents`, payload);

            // reset
            setBirthCertList([]);
            setApplicationFormList([]);
            setGovIdList([]);

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


    //UPLOAD DOCUMENTS SECTION STATUS CONDITION
    const status = application?.status?.toLowerCase();

    const shouldShow =
        status === 'payment completed' ||
        application?.secondChance === true;


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

                    {/* Status timeline banner */}

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
                                        <Descriptions
                                            className="app-info-card"
                                            bordered
                                            column={1}
                                            size="small"
                                            style={{ background: '#fff' }}
                                        >
                                            <Descriptions.Item label="Reference" labelStyle={{ color: '#305797', fontWeight: 700 }}>
                                                {application.applicationNumber || application._id}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Managed By" labelStyle={{ color: '#305797', fontWeight: 700 }}>
                                                {(() => {
                                                    const mgr = getManagerName(application);
                                                    return mgr ? (
                                                        <Tag color="blue" style={{ fontWeight: 700, fontSize: 13 }}>{mgr}</Tag>
                                                    ) : (
                                                        'N/A'
                                                    );
                                                })()}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Date Submitted" labelStyle={{ color: '#305797', fontWeight: 700 }}>
                                                {dayjs(application.createdAt).format('MMM D, YYYY')}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Applicant Name" labelStyle={{ color: '#305797', fontWeight: 700 }}>
                                                {application.username}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="DFA Location" labelStyle={{ color: '#305797', fontWeight: 700 }}>
                                                {application.dfaLocation || 'N/A'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Preferred Date" labelStyle={{ color: '#305797', fontWeight: 700 }}>
                                                {application.preferredDate ? dayjs(application.preferredDate).format('MMM D, YYYY') : 'N/A'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Preferred Time" labelStyle={{ color: '#305797', fontWeight: 700 }}>
                                                {application.preferredTime || 'N/A'}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Description" labelStyle={{ color: '#305797', fontWeight: 700 }}>
                                                {application.description || application.applicationType || 'N/A'}
                                            </Descriptions.Item>
                                        </Descriptions>


                                        {application?.status && application.status?.toLowerCase() === 'application submitted' && application?.suggestedAppointmentScheduleChosen?.date === "" && application?.suggestedAppointmentScheduleChosen?.time === "" && (
                                            <div style={{ marginBottom: 32, marginTop: 32, padding: 4 }}>
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
                                                                    padding: 16,
                                                                    borderRadius: 16,
                                                                    border: selectedSuggestedIndex === 'others' ? '2px solid #305797' : '1px solid #f0f0f0',
                                                                    boxShadow: selectedSuggestedIndex === 'others' ? '0 0 0 2px rgba(48,87,151,0.15)' : 'none'

                                                                }}
                                                            >
                                                                <Tag color="orange">Others</Tag>
                                                                <div className='passportapplication-suggestedoptions-group' style={{ marginTop: 8 }}>
                                                                    <Space orientation="vertical" style={{ width: '100%' }}>
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


                                        {/* PAYMENT SERVICE */}
                                        {application?.status && application?.status?.toLowerCase() === 'application approved' && !paymentCompleted && (
                                            <div style={{ marginBottom: 32, marginTop: 32, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                                                <h3 style={{ marginTop: 0 }}>Payment {servicePendingManualPayment && <Tag color="orange">Pending Payment</Tag>}</h3>

                                                {servicePendingManualPayment ? (
                                                    <div style={{ padding: '16px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', marginBottom: '16px' }}>
                                                        <p style={{ margin: 0, color: '#8b6914' }}>
                                                            Your manual payment for the service fee is currently pending verification. Our team will review your proof of payment within 1-2 business days. You will receive a confirmation email once verified.
                                                        </p>
                                                    </div>
                                                ) : null}
                                                <div className="payment-methods-wrapper">
                                                    <Radio.Group
                                                        onChange={(e) => setMethod(e.target.value)}
                                                        value={method}
                                                        className="payment-methods-cards"
                                                        style={{ width: '100%', display: 'flex', gap: '16px' }}
                                                        disabled={servicePendingManualPayment}

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
                                                                    <span className="bank-name">GCASH</span>
                                                                    <span className="account-number">09690554806</span>
                                                                    <span className="account-holder">MA****R C.</span>
                                                                    <img
                                                                        src="/images/QRCode_GCash_Maricar.jpg"
                                                                        alt="GCash QR Maricar"
                                                                        style={{ width: 300, height: 'auto', marginTop: 8 }}
                                                                    />
                                                                </div>
                                                                <div className="bank-item">
                                                                    <span className="bank-name">GCASH</span>
                                                                    <span className="account-number">09688880405</span>
                                                                    <span className="account-holder">RH*N C.</span>
                                                                    <img
                                                                        src="/images/QRCode_GCash_Rhon.jpg"
                                                                        alt="GCash QR Rhon"
                                                                        style={{ width: 300, height: 'auto', marginTop: 8 }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 12, color: '#6b7280', fontSize: 16 }}>
                                                                Or Without QR Code, you may also deposit to the following account and upload your receipt as proof of payment:
                                                            </div>

                                                            <div className="bank-item" style={{ height: 120 }}>
                                                                <span className="bank-name">BDO</span>
                                                                <span className="account-number">006838032692</span>
                                                                <span className="account-holder">M&RC TRAVEL AND TOURS</span>
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
                                                    disabled={paymentLoading || (method === 'manual' && fileList.length === 0) || servicePendingManualPayment}
                                                >
                                                    {servicePendingManualPayment ? 'Payment Pending Verification' : (method === 'manual' ? 'Submit Payment' : 'Proceed Paymongo')}
                                                </Button>

                                            </div>
                                        )}



                                        {/* PAYMENT PENALTY*/}
                                        {application?.status && application?.onPenalty === true && application?.status.toLowerCase() !== 'rejected' && (
                                            <div style={{ marginBottom: 32, marginTop: 32, border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff' }}>
                                                <h3 style={{ marginTop: 0 }}>Payment {pendingManualPayment && <Tag color="orange">Pending Payment</Tag>}</h3>

                                                {pendingManualPayment ? (
                                                    <div style={{ padding: '16px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', marginBottom: '16px' }}>
                                                        <p style={{ margin: 0, color: '#8b6914' }}>
                                                            Your manual payment for the penalty fee is currently pending verification. Our team will review your proof of payment within 1-2 business days. You will receive a confirmation email once verified.
                                                        </p>
                                                    </div>
                                                ) : null}

                                                {application?.secondChance && application?.onPenalty && (
                                                    <div style={{ padding: '16px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '8px', marginBottom: '16px' }}>
                                                        <p style={{ margin: 0, color: '#0050b3' }}>
                                                            Your penalty payment has been approved. You now have a grace period to complete your application.
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="payment-methods-wrapper" style={{ opacity: application?.secondChance || pendingManualPayment ? 0.6 : 1, pointerEvents: application?.secondChance || pendingManualPayment ? 'none' : 'auto' }}>
                                                    <Radio.Group
                                                        onChange={(e) => setMethod(e.target.value)}
                                                        value={method}
                                                        className="payment-methods-cards"
                                                        style={{ width: '100%', display: 'flex', gap: '16px' }}
                                                        disabled={application?.secondChance || pendingManualPayment}
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
                                                                    <span className="bank-name">GCASH</span>
                                                                    <span className="account-number">09690554806</span>
                                                                    <span className="account-holder">MA****R C.</span>
                                                                    <img
                                                                        src="/images/QRCode_GCash_Maricar.jpg"
                                                                        alt="GCash QR Maricar"
                                                                        style={{ width: 300, height: 'auto', marginTop: 8 }}
                                                                    />
                                                                </div>
                                                                <div className="bank-item">
                                                                    <span className="bank-name">GCASH</span>
                                                                    <span className="account-number">09688880405</span>
                                                                    <span className="account-holder">RH*N C.</span>
                                                                    <img
                                                                        src="/images/QRCode_GCash_Rhon.jpg"
                                                                        alt="GCash QR Rhon"
                                                                        style={{ width: 300, height: 'auto', marginTop: 8 }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 12, color: '#6b7280', fontSize: 16 }}>
                                                                Or Without QR Code, you may also deposit to the following account and upload your receipt as proof of payment:
                                                            </div>

                                                            <div className="bank-item" style={{ height: 120 }}>
                                                                <span className="bank-name">BDO</span>
                                                                <span className="account-number">006838032692</span>
                                                                <span className="account-holder">M&RC TRAVEL AND TOURS</span>
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
                                                    disabled={paymentLoading || (method === 'manual' && fileList.length === 0) || application?.secondChance || pendingManualPayment}
                                                >
                                                    {application?.secondChance ? 'Grace Period Active' : (pendingManualPayment ? 'Payment Pending Verification' : (method === 'manual' ? 'Submit Payment' : 'Proceed Paymongo'))}
                                                </Button>

                                            </div>
                                        )}


                                        {/* UPLOAD DOCUMENTS AND PAYMENT COMPLETE */}
                                        {shouldShow && (
                                            <div style={{ border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff', marginTop: 32, marginBottom: 32 }}>
                                                <h3 style={{ marginTop: 0 }}>Upload Requirements</h3>

                                                <div className="passport-requirements-grid">
                                                    <div className="passport-requirement-card">
                                                        <b style={{ fontSize: 12 }}>PSA-issued Birth Certificate</b>
                                                        {getRequirementPreviewFile('birthCert') ? (
                                                            (() => {
                                                                const file = getRequirementPreviewFile('birthCert');
                                                                return (
                                                                    <Button
                                                                        className='passport-requirement-file-preview-button'
                                                                        icon={<EyeOutlined />}
                                                                        onClick={() => handlePreview(file)}
                                                                        type="default"
                                                                    >
                                                                        Preview File
                                                                    </Button>
                                                                );
                                                            })()
                                                        ) : (
                                                            <div className="passport-requirement-placeholder">
                                                                <span className="passport-requirement-placeholder-text">No file</span>
                                                            </div>
                                                        )}
                                                        <div style={{ marginTop: 8 }}>
                                                            {isRequestedResubmissionTarget('birthCert') ? (
                                                                birthCertList.length === 0 ? (
                                                                    <Upload
                                                                        name="birthCert"
                                                                        fileList={birthCertList}
                                                                        onPreview={handlePreview}
                                                                        onChange={({ fileList: newList }) => setBirthCertList(withPreview(newList))}
                                                                        showUploadList={false}
                                                                        accept="image/*,application/pdf"
                                                                        maxCount={1}
                                                                        disabled={uploading}
                                                                        beforeUpload={beforeRequirementUpload}
                                                                        customRequest={({ onSuccess }) => onSuccess("ok")}
                                                                    >
                                                                        <Button icon={<UploadOutlined />} className='passportapplication-upload-button' type='primary'>
                                                                            Upload Requirement
                                                                        </Button>
                                                                    </Upload>
                                                                ) : (
                                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                                        <Button
                                                                            className='passportapplication-removefile-button'
                                                                            icon={<DeleteOutlined />}
                                                                            type="primary"
                                                                            onClick={() => setBirthCertList([])}
                                                                        >
                                                                            Remove
                                                                        </Button>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <div style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 6, fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
                                                                    <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />
                                                                    Valid Requirement
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="passport-requirement-card" >
                                                        <b style={{ fontSize: 12 }}>Application Form</b>
                                                        {getRequirementPreviewFile('applicationForm') ? (
                                                            (() => {
                                                                const file = getRequirementPreviewFile('applicationForm');
                                                                return (
                                                                    <Button
                                                                        className='passport-requirement-file-preview-button'
                                                                        icon={<EyeOutlined />}
                                                                        type="default"
                                                                        onClick={() => handlePreview(file)}
                                                                    >
                                                                        Preview
                                                                    </Button>
                                                                );
                                                            })()
                                                        ) : (
                                                            <div className="passport-requirement-placeholder">
                                                                <span className="passport-requirement-placeholder-text">No file</span>
                                                            </div>
                                                        )}
                                                        <div style={{ marginTop: 8 }}>
                                                            {isRequestedResubmissionTarget('applicationForm') ? (
                                                                applicationFormList.length === 0 ? (
                                                                    <Upload
                                                                        name="applicationForm"
                                                                        fileList={applicationFormList}
                                                                        onPreview={handlePreview}
                                                                        onChange={({ fileList: newList }) => setApplicationFormList(withPreview(newList))}
                                                                        showUploadList={false}
                                                                        accept="image/*,application/pdf"
                                                                        maxCount={1}
                                                                        disabled={uploading}
                                                                        beforeUpload={beforeRequirementUpload}
                                                                        customRequest={({ onSuccess }) => onSuccess("ok")}
                                                                    >
                                                                        <Button icon={<UploadOutlined />} className='passportapplication-upload-button' type='primary'>
                                                                            Upload Requirement
                                                                        </Button>
                                                                    </Upload>
                                                                ) : (
                                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                                        <Button
                                                                            className='passportapplication-removefile-button'
                                                                            icon={<DeleteOutlined />}
                                                                            type="primary"
                                                                            onClick={() => setApplicationFormList([])}
                                                                        >
                                                                            Remove
                                                                        </Button>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                <div style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 6, fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
                                                                    <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />
                                                                    Valid Requirement
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="passport-requirement-card">
                                                        <b style={{ fontSize: 12 }}>One Government-issued ID</b>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                            {getRequirementPreviewFile('govId') ? (
                                                                (() => {
                                                                    const file = getRequirementPreviewFile('govId');
                                                                    return (
                                                                        <Button
                                                                            className='passport-requirement-file-preview-button'
                                                                            icon={<EyeOutlined />}
                                                                            onClick={() => handlePreview(file)}
                                                                            type="default"
                                                                        >
                                                                            Preview
                                                                        </Button>
                                                                    );
                                                                })()
                                                            ) : (
                                                                <div className="passport-requirement-placeholder">
                                                                    <span className="passport-requirement-placeholder-text">No file</span>
                                                                </div>
                                                            )}
                                                            <div style={{ marginTop: 8 }}>
                                                                {isRequestedResubmissionTarget('govId') ? (
                                                                    govIdList.length === 0 ? (
                                                                        <Upload
                                                                            name="govId"
                                                                            fileList={govIdList}
                                                                            onPreview={handlePreview}
                                                                            onChange={({ fileList: newList }) => setGovIdList(withPreview(newList))}
                                                                            showUploadList={false}
                                                                            accept="image/*,application/pdf"
                                                                            maxCount={1}
                                                                            disabled={uploading}
                                                                            beforeUpload={beforeRequirementUpload}
                                                                            customRequest={({ onSuccess }) => onSuccess("ok")}
                                                                        >
                                                                            <Button icon={<UploadOutlined />} className='passportapplication-upload-button' type='primary'>
                                                                                Upload Requirement
                                                                            </Button>
                                                                        </Upload>
                                                                    ) : (
                                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                                            <Button
                                                                                className='passportapplication-removefile-button'
                                                                                icon={<DeleteOutlined />}
                                                                                type="primary"
                                                                                onClick={() => setGovIdList([])}
                                                                            >
                                                                                Remove
                                                                            </Button>
                                                                        </div>
                                                                    )
                                                                ) : (
                                                                    <div style={{ display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: 6, fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>
                                                                        <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />
                                                                        Valid Requirement
                                                                    </div>
                                                                )}
                                                            </div>
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
                                            application?.status?.toLowerCase() !== 'payment completed' &&
                                            application?.status?.toLowerCase() !== 'rejected' && (
                                                <div className='passport-document-uploaded-section'>
                                                    <h3 style={{ marginTop: 0 }}>Uploaded Documents</h3>
                                                    <div className='passport-uploaded-documents-container'>
                                                        {(() => {
                                                            const docs = application.submittedDocuments || {
                                                                birthCertificate: application.birthCertificate,
                                                                applicationForm: application.applicationForm,
                                                                govId: application.govId
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
                                                {penaltyStateLabel && (
                                                    <Tag color={application?.reachedSecondDeadline ? 'red' : 'volcano'}>{penaltyStateLabel}</Tag>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Type</span>
                                                <strong>{application.applicationType || 'N/A'}</strong>
                                            </div>
                                        </div>

                                        {application?.status && application?.status?.toLowerCase() !== 'rejected' && (
                                            <div style={{ border: '1px solid #dde4ef', borderRadius: 10, padding: 12, background: '#ffffff', minHeight: 180 }}>
                                                <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Progress Tracker</h3>
                                                {currentStatusSetDate && (
                                                    <div style={{ marginBottom: 16, borderLeft: '4px solid #305797', backgroundColor: 'rgba(48,87,151,0.06)', padding: 12, borderRadius: 8 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                {currentStatusSetDate && (
                                                                    <div style={{ fontSize: 13 }}><strong>Current status set on:</strong> {currentStatusSetDate.format('MMM D, YYYY')}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div style={{ overflowX: 'auto', paddingBottom: 24 }}>
                                                    <Steps
                                                        orientation="vertical"
                                                        size="default"
                                                        current={currentStep}
                                                        style={{ minWidth: 290, width: 'max-content' }}
                                                        items={PASSPORT_STEPS.map((step, idx) => {
                                                            const processStepInfo = getProcessStepInfo(step.title);
                                                            const stepSetDate = processStepInfo.setDate || getStepSetDateForTitle(application, step.title);
                                                            const daysAgo = stepSetDate ? dayjs().diff(stepSetDate, 'day') : null;
                                                            const stepDeadlineDays = statusDeadlineDaysMap[step.title] ?? null;

                                                            // Prefer processSteps data from backend
                                                            let stepDeadlineDate = processStepInfo.deadlineDate || null;

                                                            return {
                                                                title: (
                                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
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
                                                                    </div>
                                                                ),
                                                                description: (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                        <span style={{ fontSize: 13, color: '#888', whiteSpace: 'nowrap' }}>{step.description}</span>
                                                                        <span style={{ fontSize: 12, color: '#555' }}>
                                                                            {currentStep === idx && stepSetDate && (
                                                                                <>Set on: {stepSetDate.format('MMM D, YYYY')} {daysAgo !== null ? `• ${daysAgo} days ago` : ''}</>
                                                                            )}
                                                                        </span>
                                                                        {stepDeadlineDate && (
                                                                            <span style={{ fontSize: 12, color: stepDeadlineDate.isBefore(dayjs()) ? '#ff4d4f' : '#333' }}>
                                                                                Deadline: {stepDeadlineDate.format('MMM D, YYYY')} ({stepDeadlineDate.isBefore(dayjs()) ? 'Deadline overdue' : (stepDeadlineDate.diff(dayjs(), 'day') === 0 ? (() => {
                                                                                    const hoursLeft = stepDeadlineDate.diff(dayjs(), 'hour');
                                                                                    return hoursLeft > 1 ? `${hoursLeft} hours left` : hoursLeft === 1 ? '1 hour left' : 'Less than 1 hour left';
                                                                                })() : `${stepDeadlineDate.diff(dayjs(), 'day')} days left`)})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ),
                                                            };
                                                        })}
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
                        centered={true}
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
                        centered={true}
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
                        centered={true}
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
                        centered={true}
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
                        centered={true}
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

