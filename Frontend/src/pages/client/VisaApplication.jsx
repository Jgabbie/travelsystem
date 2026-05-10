import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Steps, Spin, notification, Upload, Button, Tag, Descriptions, ConfigProvider, Radio, Modal, Image, Input, Space, DatePicker, TimePicker } from 'antd';
import { UploadOutlined, ArrowLeftOutlined, FilePdfOutlined, DownloadOutlined, DeleteOutlined, CheckCircleFilled, PictureOutlined, EyeOutlined } from '@ant-design/icons';
import apiFetch from '../../config/fetchConfig';
import '../../style/client/visaapplication.css';
import dayjs from 'dayjs';
import { buildVisaStatusTotalDaysMapFromSteps } from '../../utils/visaDeadlineUtils';

//PLACE HOLDER FOR VISA PROCESS STEPS - these should ideally come from the backend based on the service
const VISA_STEPS = [
    { title: 'Application Submitted', description: 'Application submitted', daysToBeCompleted: 0 },
    { title: 'Application Approved', description: 'Application approved', daysToBeCompleted: 0 },
    { title: 'Payment Completed', description: 'Payment completed', daysToBeCompleted: 0 },
    { title: 'Documents Uploaded', description: 'Documents uploaded', daysToBeCompleted: 0 },
    { title: 'Documents Approved', description: 'Documents approved', daysToBeCompleted: 0 },
    { title: 'Documents Received', description: 'Documents received', daysToBeCompleted: 0 },
    { title: 'Documents Submitted', description: 'Documents submitted', daysToBeCompleted: 0 },
    { title: 'Processing DFA', description: 'Processing | DFA', daysToBeCompleted: 0 },
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
    const [countdown, setCountdown] = useState(null);

    const fetchVisaApplication = `/visa/applications/${id}`;

    const normalizeVisaSteps = (steps = []) => {
        return steps
            .filter(Boolean)
            .map((step, idx) => ({
                title: String(step?.title || '').trim() || `Step ${idx + 1}`,
                description: step?.description || '',
                daysToBeCompleted: Number(step?.daysToBeCompleted ?? step?.days ?? 0) || 0
            }));
    };

    const statusText = Array.isArray(application?.status)
        ? application.status[application.status.length - 1]
        : application?.status;

    const normalizeResubmissionTarget = (target) => String(target || '').trim();

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

    const resubmissionRequested = requestedResubmissionTargets.length > 0;

    const terminalStatuses = new Set(['processing by embassy', 'embassy approved', 'passport released']);

    const appointmentDate = application?.preferredDate
        ? dayjs(application.preferredDate)
        : application?.suggestedAppointmentScheduleChosen && application.suggestedAppointmentScheduleChosen.date
            ? dayjs(application.suggestedAppointmentScheduleChosen.date)
            : null;

    const countdownStyle = {
        fontSize: 15,
        color: '#305797',
        fontWeight: 700,
        background: 'rgba(48,87,151,0.06)',
        padding: '6px 10px',
        borderRadius: 14,
        border: '1px solid rgba(48,87,151,0.12)',
        boxShadow: '0 6px 18px rgba(48,87,151,0.06)',
        minWidth: 96,
        textAlign: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        lineHeight: 1,
    };

    const getStatusSetDate = (app) => {
        if (!app) return null;
        const history = app.statusHistory;
        if (Array.isArray(history) && history.length > 0) {
            for (let i = history.length - 1; i >= 0; i--) {
                const h = history[i];
                if (String(h.status).toLowerCase() === String(statusText || '').toLowerCase()) {
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

    const statusSetDate = getStatusSetDate(application);
    const managerName = getManagerName(application);
    const deadlineDays = application?.statusDeadlineDays ?? null;
    const createdAt = application?.createdAt
        ? dayjs(application.createdAt).startOf('day')
        : null;
    const cumulativeStepDaysMap = React.useMemo(() => {
        return application?.visaStatusTotalDaysMap || buildVisaStatusTotalDaysMapFromSteps(process);
    }, [application?.visaStatusTotalDaysMap, process]);
    const statusDeadlineDate = !terminalStatuses.has(String(statusText || '').toLowerCase())
        ? (application?.statusDeadlineDate
            ? dayjs(application.statusDeadlineDate)
            : statusSetDate && Number.isFinite(deadlineDays)
                ? statusSetDate.add(deadlineDays, 'day').startOf('day')
                : appointmentDate && Number.isFinite(deadlineDays)
                    ? appointmentDate.add(deadlineDays, 'day').startOf('day')
                    : null)
        : null;



    //FETCH APPLICATION DETAILS
    useEffect(() => {
        if (!id) {
            return;
        }



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
                        setRequirements(serviceRes.visaRequirements || []);
                        setServicePrice(serviceRes.visaPrice || 0);
                        const stepsSource = serviceRes.visaProcessSteps || [];
                        const normalizedSteps = stepsSource.map((step, idx) => ({
                            title: typeof step === 'string' ? step : step?.title,
                            description: typeof step === 'string' ? step : (step?.description || step?.title || ''),
                            daysToBeCompleted: typeof step === 'object' && step !== null
                                ? (step.daysToBeCompleted ?? step.days ?? 0)
                                : 0,
                            status: idx < VISA_STEPS.length ? 'process' : 'pending',
                        }));
                        setProcess(normalizedSteps);
                        setApplication((prev) => ({
                            ...prev,
                            visaStatusTotalDaysMap: prev?.visaStatusTotalDaysMap || serviceRes.visaStatusTotalDaysMap || buildVisaStatusTotalDaysMapFromSteps(serviceRes.visaProcessSteps || prev?.visaProcessSteps || [])
                        }));
                    } catch (err) {
                        setRequirements([]);
                        setProcess(VISA_STEPS.map(s => ({ ...s, status: 'pending' })));
                    }
                } else {
                    setRequirements([]);
                }
            } catch (err) {
                notification.error({ message: 'Failed to load visa application details', placement: 'topRight' });
            } finally {
                setLoading(false);
            }
        };
        fetchApplication();
    }, [id]);

    // FIND CURRENT STEP INDEX BASED ON APPLICATION STATUS
    const statusValue = statusText;

    const currentStep = statusValue
        ? Math.max(
            0,
            process.findIndex(
                s => String(s.title || '').toLowerCase() === String(statusValue || '').toLowerCase()
            )
        )
        : 0;

    const isDeliveryFeeStage =
        String(statusValue || '').toLowerCase() === 'passport released' &&
        String(application?.passportReleaseOption || '').toLowerCase() === 'delivery';
    const deliveryFeeAmount = Number(application?.deliveryFee || 0);

    useEffect(() => {
        if (!statusDeadlineDate) {
            setCountdown(null);
            return;
        }

        const update = () => {
            const diffMs = statusDeadlineDate.diff(dayjs());
            if (diffMs <= 0) {
                setCountdown('Deadline passed');
                return;
            }
            let total = Math.floor(diffMs / 1000);
            const days = Math.floor(total / 86400);
            total = total % 86400;
            const hours = Math.floor(total / 3600);
            total = total % 3600;
            const minutes = Math.floor(total / 60);
            const seconds = total % 60;
            setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        };

        update();
        const timerId = setInterval(update, 1000);
        return () => clearInterval(timerId);
    }, [statusDeadlineDate]);

    const beforeUpload = (file) => {
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            notification.error({ message: 'Image/PDF must be smaller than 5MB!', placement: 'topRight' });
        }
        return isLt5M || Upload.LIST_IGNORE;
    };

    //SUBMIT DOCUMENTS
    const handleSubmitDocuments = async () => {
        if (uploading) {
            notification.warning({ message: "Please wait until uploads finish", placement: 'topRight' });
            return;
        }

        try {
            setUploading(true);

            const formData = new FormData();
            const orderedRequirements = visibleRequirements.map((req, idx) => ({
                key: req.key || req.req || `${req.label}-${idx}`,
                label: req.req || req.label || `Requirement ${idx + 1}`
            }));

            const missingRequirements = [];
            orderedRequirements.forEach((req) => {
                const fileItem = requirementFiles[req.key]?.[0];
                if (fileItem?.originFileObj) {
                    formData.append("files", fileItem.originFileObj);
                } else {
                    missingRequirements.push(req.label);
                }
            });

            if (missingRequirements.length > 0) {
                notification.warning({ message: "Please upload all required documents before submitting.", placement: 'topRight' });
                return;
            }

            if (resubmissionRequested && orderedRequirements.length === 0) {
                notification.warning({ message: "The requested document is not available for upload.", placement: 'topRight' });
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

            const refreshed = await apiFetch.get(`/visa/applications/${id}`);
            setApplication(refreshed);
            setIsDocumentsUploadedModalOpen(true);
        } catch (err) {
            console.error(err);
            notification.error({ message: "Failed to submit documents", placement: 'topRight' });
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
            notification.warning({ message: 'Please upload a receipt first.', placement: 'topRight' });
            return;
        }

        if (isDeliveryFeeStage && deliveryFeeAmount <= 0) {
            notification.warning({ message: 'Delivery fee is not available yet. Please wait for admin to send it.', placement: 'topRight' });
            return;
        }

        try {
            setPaymentLoading(true);

            if (method === 'manual') {
                const file = fileList[0].originFileObj;
                const amountToPay = isDeliveryFeeStage ? deliveryFeeAmount : servicePrice;

                const formData = new FormData();
                formData.append("file", file);

                const uploadRes = await apiFetch.post('/upload/upload-receipt', formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });

                const imageUrl = uploadRes.url;

                const paymentRes = await apiFetch.post('/payment/manual-visa', {
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
                    totalPrice: isDeliveryFeeStage ? deliveryFeeAmount : servicePrice,
                    successUrl: `${window.location.origin}/user-applications/success/visa/${application._id}`, // redirect here after success
                    cancelUrl: `${window.location.origin}/visa-application/${application._id}`, // stay on same page if cancelled
                    email: application.email,
                };

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
            notification.error({ message: "Payment failed", placement: 'topRight' });
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

            notification.success({ message: 'File ready for submission', placement: 'topRight' });
            onSuccess('ok');
        } catch (err) {
            console.error(err);
            notification.error({ message: 'Failed to process file', placement: 'topRight' });
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

    const isRequestedResubmissionTarget = (target) => {
        if (!resubmissionRequested) return true;
        return requestedResubmissionTargets.includes(normalizeResubmissionTarget(target));
    };

    // Always display all requirements; we'll mark which ones were requested for resubmission
    const visibleRequirements = requirements;

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

            await apiFetch.put(`/visa/applications/${id}/choose-appointment`, {
                date: dateToSend,
                time: timeToSend
            });

            // optional: sync UI state after success
            setSelectedDate(dateToSend);
            setSelectedTime(timeToSend);

            const refreshed = await apiFetch.get(`/visa/applications/${id}`);
            setApplication(refreshed);
            setIsDateSelectedModalOpen(true);
        } catch (error) {
            notification.error({ message: 'Failed to confirm appointment schedule.', placement: 'topRight' });
        } finally {
            setConfirmingSuggested(false);
        }
    };

    const handleReleaseOption = async () => {
        if (!releaseOption) {
            notification.warning({ message: 'Please select a release option first.', placement: 'topRight' });
            return
        }

        if (releaseOption === 'delivery' && deliveryAddress.trim() === "") {
            notification.warning({ message: 'Please provide a delivery address in your profile settings before choosing delivery option.', placement: 'topRight' });
            return;
        }

        try {
            await apiFetch.put(`/visa/applications/${id}/release-option`, {
                passportReleaseOption: releaseOption,
                deliveryAddress: releaseOption === 'delivery' ? deliveryAddress : ""
            });

            setDeliveryAddress("")
            setIsPassportReleaseOptionSelectedModalOpen(true);
            window.location.reload();
        } catch (error) {
            notification.error({ message: 'Failed to update release option.', placement: 'topRight' });
        }
    }

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
        if (!applicationId) {
            navigate('/home');
        }
    }, [applicationId, navigate]);

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#305797' } }}>

            {loading || uploading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                    <Spin size="large" description={uploading ? "Uploading Documents..." : "Loading..."} />
                </div>
            ) : (
                <div className='visaapplication-container'>
                    <div className='visaapplication-container'>
                        <Button
                            className='visaapplication-back-button'
                            type='primary'
                            icon={<ArrowLeftOutlined />}
                            style={{ marginTop: 24, marginBottom: 8 }}
                            onClick={() => navigate('/user-applications')}
                        >
                            Back
                        </Button>

                        <div className="app-detail-header">
                            <h2 >Visa Application Details</h2>
                            <p >Track every milestone and complete requirements in one place.</p>
                        </div>

                        {application && (
                            <>

                                {/* SUGGESTED APPOINTMENT */}
                                {statusValue && statusValue.toLowerCase() === 'application submitted' && application.suggestedAppointmentScheduleChosen.date !== "" && application.suggestedAppointmentScheduleChosen.time !== "" && (
                                    <div style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                                        <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>SUGGESTED APPOINTMENT</h2>
                                        <p style={{ margin: 0, fontSize: 14 }}>
                                            You have successfully chosen your appointment schedule.
                                            Kindly wait for its approval. We will notify you once the date is available.
                                        </p>
                                    </div>
                                )}


                                {/*APPROVED APPOINTMENT DATE AND TIME */}
                                {statusValue && statusValue.toLowerCase() === 'application approved' && (
                                    <div style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                                        <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>YOUR APPOINTMENT DATE AND TIME</h2>
                                        <p style={{ margin: 0, fontSize: 14 }}>
                                            Your appointment has been scheduled for <strong>{application.suggestedAppointmentScheduleChosen.date === "" && application.suggestedAppointmentScheduleChosen.time === "" ? (dayjs(application.preferredDate).format('MMM D, YYYY')) : (dayjs(application.suggestedAppointmentScheduleChosen.date).format("MMM DD, YYYY"))}</strong> at <strong>{application.suggestedAppointmentScheduleChosen.time || application.preferredTime}</strong>.
                                        </p>
                                    </div>
                                )}

                                {/* DOCUMENTS APPROVED */}
                                {statusValue && statusValue.toLowerCase() === 'documents approved' && (
                                    <div style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                                        <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>DOCUMENTS APPROVED</h2>
                                        <p style={{ margin: 0, fontSize: 14 }}>
                                            Your uploaded documents have been approved by our team.
                                            You may now submit or deliver the physical copies of your documents to our office.
                                        </p>
                                    </div>
                                )}

                                {/* THE REST OF THE PROCESS */}
                                {statusValue && (statusValue.toLowerCase() === 'documents received' ||
                                    statusValue?.toLowerCase() === 'documents submitted' ||
                                    statusValue?.toLowerCase() === 'processing by dfa') && (
                                        <div style={{ marginBottom: 24, borderLeft: '4px solid #faad14', backgroundColor: '#fffbe6', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                                            <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#faad14' }}>PROGRESS TRACKER</h2>
                                            <p style={{ margin: 0, fontSize: 14 }}>
                                                Kindly refer to the progress tracker for the remaining steps of the process.
                                                You will be also receiving email notifications and updates regarding the status of your application, so please stay tuned to your inbox.
                                            </p>
                                        </div>
                                    )}

                                {/* APPLICATION DENIED */}
                                {statusValue && statusValue.toLowerCase() === 'rejected' && (
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
                                {statusValue && statusValue.toLowerCase() === 'embassy approved' && (
                                    <div style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                                        <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>APPLICATION APPROVED</h2>
                                        <p style={{ margin: 0, fontSize: 14 }}>
                                            Congratulations! Your application has been approved.
                                            Your visa documents will be released and delivered to you once the process is complete.
                                        </p>
                                    </div>
                                )}

                                {/* DOCUMENTS FOR RELEASE */}
                                {statusValue && statusValue.toLowerCase() === 'passport released' && (
                                    <div style={{ marginBottom: 24, borderLeft: '4px solid #52c41a', backgroundColor: '#f6ffed', padding: 16, paddingBottom: 40, paddingTop: 40, borderRadius: 8 }}>
                                        <h2 style={{ marginBottom: 10, fontSize: 20, fontWeight: 600, color: '#52c41a' }}>DOCUMENTS FOR RELEASE</h2>
                                        <p style={{ margin: 0, fontSize: 14 }}>
                                            Your visa documents are ready for release.
                                            Please proceed to the office to collect them or wait for delivery if you chose the delivery option.
                                        </p>
                                        {application?.passportReleaseOption === 'delivery' && (
                                            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 14, fontWeight: 600 }}>
                                                Delivery details: PHP {Number(application?.deliveryFee || 0).toLocaleString()} on {application?.deliveryDate || 'To be announced'}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="app-detail-shell">
                                    <div style={{ marginBottom: 32, width: '100%' }}>
                                        <div style={{ display: 'flex', flexDirection: 'row', gap: 24, flexWrap: 'wrap' }}>
                                            <div style={{ flex: '1 1 620px', minWidth: 320 }}>
                                                <Descriptions title="Application Info" bordered column={1}>
                                                    <Descriptions.Item label="Reference">{application.applicationNumber || application._id}</Descriptions.Item>
                                                    <Descriptions.Item label="Managed By">
                                                        {managerName ? <Tag color="blue" style={{ fontWeight: 700, fontSize: 13 }}>{managerName}</Tag> : 'N/A'}
                                                    </Descriptions.Item>
                                                    <Descriptions.Item label="Date Submitted">{dayjs(application.createdAt).format('MMM D, YYYY')}</Descriptions.Item>
                                                    <Descriptions.Item label="Applicant Name">{application.applicantName || application.user?.name}</Descriptions.Item>
                                                    <Descriptions.Item label="Preferred Date">{dayjs(application.preferredDate).format('MMM D, YYYY')}</Descriptions.Item>
                                                    <Descriptions.Item label="Preferred Time">{application.preferredTime}</Descriptions.Item>
                                                    <Descriptions.Item label="Application Type">{application.serviceName}</Descriptions.Item>
                                                </Descriptions>

                                                {/* RELEASE OPTION */}
                                                {statusValue && statusValue.toLowerCase() === 'embassy approved' && (
                                                    <div style={{ marginTop: 20 }}>
                                                        <h3 style={{ fontSize: 16 }}>Choose Your Release Option</h3>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 16,
                                                                justifyContent: 'center',
                                                                flexWrap: 'wrap',
                                                                marginTop: 20,
                                                            }}
                                                        >

                                                            <div
                                                                onClick={() => setReleaseOption('pickup')}
                                                                style={{
                                                                    border: releaseOption === 'pickup'
                                                                        ? '2px solid #305797'
                                                                        : '1px solid #f0f0f0',
                                                                    flex: '1 1 220px', // ✅ responsive width instead of fixed
                                                                    maxWidth: 400,     // ✅ prevents cards from getting too wide
                                                                    padding: 16,
                                                                    textAlign: 'center',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    borderRadius: 12,
                                                                }}
                                                            >
                                                                <h3 style={{ marginBottom: 8, fontSize: 14 }}>PICK UP</h3>
                                                                <p style={{ color: '#305797', fontWeight: 500, fontSize: 13 }}>
                                                                    Claim your visa documents at our office
                                                                </p>
                                                            </div>

                                                            <div
                                                                onClick={() => setReleaseOption('delivery')}
                                                                style={{
                                                                    border: releaseOption === 'delivery'
                                                                        ? '2px solid #305797'
                                                                        : '1px solid #f0f0f0',
                                                                    flex: '1 1 220px',
                                                                    maxWidth: 400,
                                                                    padding: 16,
                                                                    textAlign: 'center',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s ease',
                                                                    borderRadius: 12,
                                                                }}
                                                            >
                                                                <h3 style={{ marginBottom: 8, fontSize: 14 }}>DELIVERY</h3>
                                                                <p style={{ color: '#305797', fontWeight: 500, fontSize: 13 }}>
                                                                    Have your visa documents delivered to you
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {releaseOption === 'delivery' && (
                                                            <div style={{ marginTop: 20 }}>
                                                                <p style={{ color: '#305797', fontWeight: 500, fontSize: 13 }}>
                                                                    Kindly enter your complete address as reference for delivery.
                                                                    Our team will contact you for confirmation and further details regarding your delivery.
                                                                </p>

                                                                <Input.TextArea
                                                                    placeholder="Enter your complete address"
                                                                    style={{ resize: 'none' }}
                                                                    rows={4}
                                                                    style={{ marginBottom: 12 }}
                                                                    maxLength={250}
                                                                    value={deliveryAddress}
                                                                    onChange={(e) => { setDeliveryAddress(e.target.value) }}
                                                                />
                                                            </div>
                                                        )}

                                                        <Button
                                                            onClick={handleReleaseOption}
                                                            type='primary'
                                                            className='passportapplication-submit-button'
                                                            style={{ marginTop: 15 }}
                                                        >
                                                            Submit
                                                        </Button>
                                                    </div>
                                                )}


                                                {statusValue && statusValue.toLowerCase() === 'application submitted' && application?.suggestedAppointmentScheduleChosen?.date === "" && application?.suggestedAppointmentScheduleChosen?.time === "" && (
                                                    <div style={{ marginBottom: 32, marginTop: 32, padding: 4 }}>
                                                        <h3 style={{ marginTop: 0 }}>Suggested Appointment Options</h3>
                                                        {Array.isArray(application.suggestedAppointmentSchedules) && application.suggestedAppointmentSchedules.length > 0 ? (
                                                            <>
                                                                <div className='visaapplication-suggestedoptions'>
                                                                    {application.suggestedAppointmentSchedules.map((slot, index) => {
                                                                        const isSelected = selectedSuggestedIndex === index;

                                                                        return (
                                                                            <div
                                                                                key={`${slot.date || 'date'}-${slot.time || 'time'}-${index}`}
                                                                                onClick={() => setSelectedSuggestedIndex(index)}
                                                                                className='visaapplication-suggestedoption-card'
                                                                                style={{
                                                                                    border: isSelected ? '2px solid #305797' : '1px solid #f0f0f0',
                                                                                    boxShadow: isSelected ? '0 0 0 2px rgba(48,87,151,0.15)' : 'none'
                                                                                }}
                                                                            >
                                                                                <Tag color="blue">Option {index + 1}</Tag>
                                                                                <div className='visaapplication-suggestedoptions-date' style={{ marginTop: 8, fontWeight: 600 }}>
                                                                                    {dayjs(slot.date).format("MMM DD, YYYY") || 'Date TBD'}
                                                                                </div>
                                                                                <div className='visaapplication-suggestedoptions-time' style={{ color: '#6b7280' }}>{slot.time || 'Time TBD'}</div>
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
                                                                        <div className='visaapplication-suggestedoptions-group' style={{ marginTop: 8 }}>
                                                                            <Space orientation="vertical" style={{ width: '100%' }}>
                                                                                <DatePicker
                                                                                    className='visaapplication-suggestedoptions-datepicker'
                                                                                    disabledDate={disableDates}
                                                                                    placeholder="Select Date"
                                                                                    onChange={(date) => setCustomDateTime(prev => ({ ...prev, date }))}
                                                                                    onClick={(e) => e.stopPropagation()} // Prevents card click trigger issues
                                                                                />
                                                                                <TimePicker
                                                                                    className='visaapplication-suggestedoptions-timepicker'
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
                                                                        className='visaapplication-submitdate-button'
                                                                        type="primary"
                                                                        onClick={() => {
                                                                            setIsSelectDateModalOpen(true)
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

                                                {statusValue && statusValue.toLowerCase() === 'application approved' && (
                                                    <div style={{ marginBottom: 32, marginTop: 32 }}>
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
                                                                    <div className="card-content" >
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
                                                )}




                                                {isDeliveryFeeStage && (
                                                    <div style={{ marginBottom: 32, marginTop: 32 }}>
                                                        <h3 style={{ marginTop: 0 }}>Delivery Fee Payment</h3>
                                                        <p style={{ marginTop: 0, color: '#305797', fontWeight: 600 }}>
                                                            Amount due: PHP {deliveryFeeAmount.toLocaleString()} | Target delivery date: {application?.deliveryDate || 'To be announced'}
                                                        </p>
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
                                                                    <div className="card-content" >
                                                                        <h3>Paymongo (Delivery Fee)</h3>
                                                                        <p>Pay your delivery fee securely via Credit Card, GCash, or Maya.</p>
                                                                        <p style={{ color: "#FF4D4F", fontWeight: "500", fontStyle: "italic" }}>Note: The rate for using this payment method is 3.5%.</p>
                                                                    </div>
                                                                </Radio.Button>

                                                                <Radio.Button
                                                                    value="manual"
                                                                    className={`payment-card ${method === "manual" ? "selected" : ""}`}
                                                                    style={{ flex: 1, height: 'auto', padding: '20px', borderRadius: 8 }}
                                                                >
                                                                    <div className="card-content">
                                                                        <h3>Manual Payment (Delivery Fee)</h3>
                                                                        <p>Direct deposit for your delivery fee. Upload proof of payment for manual verification by our team.</p>
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
                                                )}

                                                {/* UPLOAD DOCUMENTS AND PAYMENT COMPLETE */}
                                                {statusValue && statusValue.toLowerCase() === 'payment completed' && (
                                                    <div style={{ border: '1px solid #dde4ef', borderRadius: 12, padding: 16, background: '#ffffff', marginTop: 32, marginBottom: 32 }}>
                                                        <h3 style={{ marginTop: 0 }}>Upload Requirements</h3>
                                                        {requirements.length === 0 && (
                                                            <div>No requirements found for this service.</div>
                                                        )}
                                                        <div className="visa-requirements-grid">
                                                            {visibleRequirements.map((req, idx) => {
                                                                const requirementKey = req.key || req.req || `${req.label}-${idx}`;
                                                                const uploadedFile = requirementFiles[requirementKey]?.[0];

                                                                // existing submission from server
                                                                const submitted = application?.submittedDocuments || {};
                                                                const existingValue = submitted[requirementKey];
                                                                const existingUrl = Array.isArray(existingValue) ? existingValue[0] : existingValue || null;

                                                                const previewSource = uploadedFile || existingUrl;
                                                                const isPdf = (uploadedFile && (uploadedFile.type === 'application/pdf' || uploadedFile.originFileObj?.type === 'application/pdf' || uploadedFile.name?.toLowerCase().endsWith('.pdf'))) || (typeof existingUrl === 'string' && existingUrl.toLowerCase().split(/[?#]/)[0].endsWith('.pdf'));

                                                                const isRequested = isRequestedResubmissionTarget(requirementKey);

                                                                return (
                                                                    <div className="visa-requirement-card" key={requirementKey}>
                                                                        <b style={{ fontSize: 12, maxWidth: 220 }}>{req.req || req.label || `Requirement ${idx + 1}`}</b>

                                                                        {previewSource ? (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                                                <Button
                                                                                    className="visa-requirement-file-preview-button"
                                                                                    type="default"
                                                                                    icon={isPdf ? <FilePdfOutlined /> : <EyeOutlined />}
                                                                                    onClick={() => handlePreview(previewSource)}
                                                                                >
                                                                                    Preview
                                                                                </Button>

                                                                                {!isRequested && (
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', fontWeight: 700, marginTop: 6 }}>
                                                                                        <CheckCircleFilled style={{ color: '#16a34a', fontSize: 18 }} />
                                                                                        <span style={{ fontSize: 11, lineHeight: 1 }}>Valid Requirement</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="visa-requirement-placeholder">
                                                                                <span className="visa-requirement-placeholder-text">No file</span>
                                                                            </div>
                                                                        )}

                                                                        <div>
                                                                            {/* Only allow upload when admin requested this specific requirement */}
                                                                            {isRequested ? (
                                                                                !uploadedFile ? (
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
                                                                                            Upload Requirement
                                                                                        </Button>
                                                                                    </Upload>
                                                                                ) : (
                                                                                    <Button
                                                                                        className='visaapplication-removefile-button'
                                                                                        icon={<DeleteOutlined />}
                                                                                        type="primary"
                                                                                        onClick={() => {
                                                                                            const newFiles = { ...requirementFiles };
                                                                                            newFiles[requirementKey] = [];
                                                                                            setRequirementFiles(newFiles);
                                                                                        }}
                                                                                    >
                                                                                        Remove
                                                                                    </Button>
                                                                                )
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <Button style={{ marginTop: 20 }} type="primary" className='visaapplication-submit-button' onClick={confirmSubmitDocuments}>
                                                            Submit Documents
                                                        </Button>
                                                    </div>
                                                )}


                                                {false && statusValue && statusValue.toLowerCase() === 'passport released' && (
                                                    <div style={{ marginBottom: 32, marginTop: 32 }}>
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
                                                                    <div className="card-content" >
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
                                                )}

                                                {/* PAYMENT FOR DELIVERY FEE */}
                                                {false && statusValue && statusValue.toLowerCase() === 'passport released' && (
                                                    <div style={{ padding: 4, marginTop: 32, marginBottom: 32 }}>
                                                        <h3 style={{ marginTop: 0 }}>Upload Requirements</h3>
                                                        {requirements.length === 0 && (
                                                            <div>No requirements found for this service.</div>
                                                        )}
                                                        <div className="visa-requirements-grid">
                                                            {requirements.map((req, idx) => {
                                                                const requirementKey = req.key || req.req || `${req.label}-${idx}`;
                                                                const uploadedFile = requirementFiles[requirementKey]?.[0];
                                                                const isPdf = uploadedFile?.type === 'application/pdf' ||
                                                                    uploadedFile?.originFileObj?.type === 'application/pdf' ||
                                                                    uploadedFile?.name?.toLowerCase().endsWith('.pdf');

                                                                return (
                                                                    <div className="visa-requirement-card" key={requirementKey}>
                                                                        <b style={{ fontSize: 12, maxWidth: 220 }}>{req.req || req.label || `Requirement ${idx + 1}`}</b>
                                                                        {uploadedFile ? (
                                                                            isPdf ? (
                                                                                <Button
                                                                                    className="visa-requirement-file-preview-button"
                                                                                    type="dashed"
                                                                                    onClick={() => handlePreview(uploadedFile)}
                                                                                >
                                                                                    Open PDF
                                                                                </Button>
                                                                            ) : (
                                                                                <div className="visa-requirement-placeholder">
                                                                                    <Image
                                                                                        src={uploadedFile.url || uploadedFile.preview}
                                                                                        alt={req.req || req.label || `Requirement ${idx + 1}`}
                                                                                        preview={false}
                                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                                        onClick={() => handlePreview(uploadedFile)}
                                                                                    />
                                                                                </div>
                                                                            )
                                                                        ) : (
                                                                            <div className="visa-requirement-placeholder">
                                                                                <span className="visa-requirement-placeholder-text">No file</span>
                                                                            </div>
                                                                        )}
                                                                        <div style={{ marginTop: 2 }}>
                                                                            {!uploadedFile ? (
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
                                                                                        Upload Requirement
                                                                                    </Button>
                                                                                </Upload>
                                                                            ) : (
                                                                                <Button
                                                                                    className='visaapplication-removefile-button'
                                                                                    icon={<DeleteOutlined />}
                                                                                    type="primary"
                                                                                    onClick={() => {
                                                                                        const newFiles = { ...requirementFiles };
                                                                                        newFiles[requirementKey] = [];
                                                                                        setRequirementFiles(newFiles);
                                                                                    }}
                                                                                >
                                                                                    Remove
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <Button style={{ marginTop: 20 }} type="primary" className='visaapplication-submit-button' onClick={confirmSubmitDocuments}>
                                                            Submit Documents
                                                        </Button>
                                                    </div>
                                                )}


                                                {/* DOCUMENTS UPLOADED */}
                                                {statusValue && statusValue.toLowerCase() === 'documents uploaded' && (
                                                    <div style={{ marginTop: 32, marginBottom: 32 }}>
                                                        <h3 style={{ marginTop: 0 }}>Uploaded Documents</h3>
                                                        {application.submittedDocuments && (
                                                            <div style={{ display: 'flex', flexDirection: 'row', gap: 50, flexWrap: 'wrap', justifyContent: 'center' }}>
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
                                                                                {url ? (
                                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                                                                        <Button
                                                                                            className="visa-requirement-file-preview-button"
                                                                                            type="default"
                                                                                            icon={isPdfFile ? <FilePdfOutlined /> : <EyeOutlined />}
                                                                                            onClick={() => handlePreview(url)}
                                                                                        >
                                                                                            Preview
                                                                                        </Button>

                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a', fontWeight: 700, marginTop: 6 }}>
                                                                                            <CheckCircleFilled style={{ color: '#16a34a', fontSize: 18 }} />
                                                                                            <span>Valid Requirement</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <Button
                                                                                        className='visaapplication-download-button'
                                                                                        type="primary"
                                                                                        icon={<DownloadOutlined />}
                                                                                        style={{ width: '320px', maxWidth: '320px', height: '36px', margin: '0 auto' }}
                                                                                        onClick={() => {
                                                                                            const downloadUrl = getDownloadUrl(url);
                                                                                            window.location.href = downloadUrl; // Directly triggers the attachment download
                                                                                        }}
                                                                                    >
                                                                                        Download {isPdfFile ? 'PDF' : 'Image'}
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    };

                                                                    return (
                                                                        <div key={key}>
                                                                            <b style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{label}:</b>
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

                                                    </div>

                                                )}

                                            </div>

                                            <div style={{ flex: '1 1 300px', minWidth: 280 }}>
                                                <div style={{ marginBottom: 16, padding: 12, background: '#f9fbff' }}>
                                                    <p className="app-detail-kicker" style={{ marginBottom: 6 }}>Overview</p>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                        <span>Status</span>
                                                        <Tag color="blue">{application?.status || 'N/A'}</Tag>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>Service Fee</span>
                                                        <strong>PHP {servicePrice.toFixed(2)}</strong>
                                                    </div>
                                                </div>

                                                <div style={{ padding: 12, minHeight: 180 }}>
                                                    <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>Progress Tracker</h3>
                                                    {statusDeadlineDate && (
                                                        <div style={{ marginBottom: 10, padding: 10, borderRadius: 8, background: 'rgba(48,87,151,0.06)', borderLeft: '4px solid #305797' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                                                                <div style={{ flex: 1 }}>
                                                                    {statusSetDate && (
                                                                        <div style={{ fontSize: 12, color: '#333' }}><strong>Current status set on:</strong> {statusSetDate.format('MMM D, YYYY')}</div>
                                                                    )}
                                                                    <div style={{ fontSize: 12, color: '#333' }}>
                                                                        <strong>Action deadline:</strong> {statusDeadlineDate.format('MMM D, YYYY')} ({statusDeadlineDate.diff(dayjs(), 'day')} days left)
                                                                    </div>
                                                                    {countdown && (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                                                            <div style={{ fontSize: 12, color: '#305797', fontWeight: 700 }}>Time left:</div>
                                                                            <div style={countdownStyle}>{countdown}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    {statusDeadlineDate.isBefore(dayjs(), 'day') ? (
                                                                        <Tag color="red">Deadline passed</Tag>
                                                                    ) : (
                                                                        <Tag color="gold">Time-limited action</Tag>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div style={{ overflowX: 'auto', paddingTop: 8, paddingBottom: 32 }}>
                                                        <Steps
                                                            orientation="vertical"
                                                            size="default"
                                                            current={currentStep}
                                                            style={{ width: '100%', paddingTop: 4, paddingBottom: 8 }}
                                                            items={process.map((step, idx) => {
                                                                const stepSetDate = getStepSetDateForTitle(application, step.title);
                                                                const daysAgo = stepSetDate ? dayjs().diff(stepSetDate, 'day') : null;
                                                                const stepDeadlineDays = cumulativeStepDaysMap[step.title] ?? null;
                                                                const stepIsCurrent = currentStep === idx;

                                                                let stepDeadlineDate = null;
                                                                const isTerminalStep = terminalStatuses.has(String(step.title || '').toLowerCase());

                                                                if (!isTerminalStep && Number.isFinite(stepDeadlineDays) && createdAt) {
                                                                    stepDeadlineDate = createdAt.add(stepDeadlineDays, 'day').startOf('day');
                                                                }

                                                                if (!isTerminalStep && application?.statusDeadlineDate && String(statusText || '') === String(step.title)) {
                                                                    stepDeadlineDate = dayjs(application.statusDeadlineDate);
                                                                }

                                                                const daysLeft = stepDeadlineDate ? stepDeadlineDate.diff(dayjs(), 'day') : null;

                                                                return {
                                                                    title: (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '6px 8px 10px 0', width: '100%', maxWidth: '100%' }}>
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, width: '100%' }}>
                                                                                <span style={{
                                                                                    fontWeight: stepIsCurrent ? 'bold' : 'normal',
                                                                                    fontSize: 15,
                                                                                    color: "#305797",
                                                                                    textAlign: 'left',
                                                                                    whiteSpace: 'normal',
                                                                                    lineHeight: 1.25,
                                                                                    wordBreak: 'break-word',
                                                                                    maxWidth: '100%',
                                                                                }}>
                                                                                    {step.title.charAt(0).toUpperCase() + step.title.slice(1)}
                                                                                </span>
                                                                                {stepIsCurrent && countdown && (
                                                                                    <span style={{ ...countdownStyle, marginTop: 0 }}>{countdown}</span>
                                                                                )}
                                                                            </div>

                                                                            <p style={{ fontSize: 11, color: '#555', margin: 0, textAlign: 'left', whiteSpace: 'normal', lineHeight: 1.4, maxWidth: '100%' }}>{step.description}</p>

                                                                            {stepSetDate && (
                                                                                <div style={{ fontSize: 11, color: '#444', textAlign: 'left', lineHeight: 1.45, maxWidth: '100%' }}>
                                                                                    <div>Set on: {stepSetDate.format('MMM D, YYYY')}{daysAgo !== null ? ` • ${daysAgo} days ago` : ''}</div>
                                                                                    {stepIsCurrent && stepDeadlineDate && (
                                                                                        <div style={{ color: stepDeadlineDate.isBefore(dayjs(), 'day') ? '#ff4d4f' : '#333' }}>
                                                                                            Deadline: {stepDeadlineDate.format('MMM D, YYYY')} ({daysLeft} days left)
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
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
                            </>
                        )}


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

        </ConfigProvider>
    );
}
