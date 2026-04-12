import React, { useEffect, useRef, useState } from 'react'
import { Button, message, Upload, Form, Steps, ConfigProvider, Modal, Input, Select, DatePicker } from 'antd'
import { useNavigate } from 'react-router-dom';
import { useQuotationBooking } from '../../context/BookingQuotationContext';
import apiFetch from '../../config/fetchConfig';
import dayjs from 'dayjs';
import '../../style/components/modals/bookingsummarymodal.css'
import '../../style/components/modals/uploadpassportmodal.css'
import '../../style/components/modals/travelersmodal.css'
import '../../style/components/modals/soloorgroupedmodal.css'
import '../../style/client/bookingprocess.css'
import BookingRegistrationDietQuote from '../../components/form_quotationbooking/BookingRegistrationDietQuote';
import BookingRegistrationTermsQuotePart1 from '../../components/form_quotationbooking/BookingRegistrationTermsQuotePart1';
import BookingRegistrationTermsQuotePart2 from '../../components/form_quotationbooking/BookingRegistrationTermsQuotePart2';
import BookingRegistrationTravelersQuote from '../../components/form_quotationbooking/BookingRegistrationTravelersQuote';

const toBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

const computeAge = (birthDate) => {
    if (!birthDate || !dayjs(birthDate).isValid()) return ''
    const today = dayjs()
    const normalized = dayjs(birthDate)
    let age = today.diff(normalized, 'year')
    if (normalized.add(age, 'year').isAfter(today)) {
        age -= 1
    }
    return age < 0 ? '' : age
}

export default function QuotationBookingProcess() {
    const [form] = Form.useForm();
    const { quotationBookingData, setQuotationBookingData, clearQuotationBookingData } = useQuotationBooking();
    const navigate = useNavigate();
    const pdfStepRef = useRef(null);

    const [isProceedModalOpen, setIsProceedModalOpen] = useState(false);

    //CLOSE MODAL
    const onCancelModal = () => {
        setIsProceedModalOpen(false);
    }

    //GET SUMMARY DATA FROM BOOKING QUOTATION CONTEXT
    const summary = quotationBookingData || {}
    const data = summary
    const hotelOptions = data.hotelOptions?.length ? data.hotelOptions : []
    const airlineOptions = data.airlineOptions?.length ? data.airlineOptions : []
    const travelersCount = (() => {
        if (data.travelersCount && typeof data.travelersCount === 'object') {
            return {
                adult: Number(data.travelersCount.adult) || 0,
                child: Number(data.travelersCount.child) || 0,
                infant: Number(data.travelersCount.infant) || 0
            };
        }

        if (typeof data.travelersCount === 'number') {
            return { adult: Math.max(1, data.travelersCount), child: 0, infant: 0 };
        }

        if (Array.isArray(data.travelers)) {
            const count = Math.max(1, data.travelers.length || 1);
            return { adult: count, child: 0, infant: 0 };
        }

        return { adult: 1, child: 0, infant: 0 };
    })();

    const travelersTotal = travelersCount.adult + travelersCount.child + travelersCount.infant
    const uploadTravelerCount = travelersTotal || 1

    const totalTravelersCount = Math.max(
        1,
        (Number(travelersCount.adult) || 0)
        + (Number(travelersCount.child) || 0)
        + (Number(travelersCount.infant) || 0)
    );

    const rawPrice = data?.travelDatePrice;
    const totalPrice = Number(rawPrice) || 0;
    const packageName = data.packageName || 'Tour Package'
    const packageType = data.packageType || 'fixed'
    const isDomesticPackage = String(packageType || '').toLowerCase().includes('domestic')
    const travelDocumentLabel = isDomesticPackage ? 'Valid ID' : 'Passport'
    const travelDocumentShortLabel = isDomesticPackage ? 'valid ID' : 'passport'
    const bookingType = totalTravelersCount === 1 ? 'Solo Booking' : 'Group Booking'
    const images = data.images || []

    //INCLUSIONS, EXCLUSIONS, ITINERARY
    const inclusions = data.inclusions || []
    const exclusions = data.exclusions || []
    const itinerary = data.itinerary || {}

    const itineraryEntries = (() => {
        const formatItineraryItem = (item) => {
            if (typeof item === 'string') return item;
            if (!item) return '';

            const activity = item.activity || item.optionalActivity || item.item || '';
            const optionalPrice = Number.isFinite(Number(item.optionalPrice))
                ? Number(item.optionalPrice).toLocaleString()
                : null;

            if (item.isOptional && item.optionalActivity) {
                return `${activity} (Optional: ${item.optionalActivity}${optionalPrice ? ` - ₱${optionalPrice}` : ''})`;
            }

            return activity;
        };

        if (Array.isArray(itinerary)) {
            return itinerary.map((items, index) => ({
                key: `day-${index + 1}`,
                label: `Day ${index + 1}`,
                items: Array.isArray(items)
                    ? items.map(formatItineraryItem).filter(Boolean)
                    : items
                        ? [formatItineraryItem(items)].filter(Boolean)
                        : []
            }))
        }

        if (!itinerary || typeof itinerary !== 'object') return []

        return Object.keys(itinerary)
            .sort((a, b) => {
                const aNum = Number(String(a).replace(/\D/g, ''))
                const bNum = Number(String(b).replace(/\D/g, ''))
                return (Number.isNaN(aNum) ? 0 : aNum) - (Number.isNaN(bNum) ? 0 : bNum)
            })
            .map((dayKey) => ({
                key: dayKey,
                label: String(dayKey).replace('day', 'Day '),
                items: Array.isArray(itinerary[dayKey])
                    ? itinerary[dayKey].map(formatItineraryItem).filter(Boolean)
                    : itinerary[dayKey]
                        ? [formatItineraryItem(itinerary[dayKey])].filter(Boolean)
                        : []
            }))
    })()

    //FETCH DETAILS FROM QUOTATION
    useEffect(() => {
        if (!quotationBookingData?.quotationId) return;

        let isMounted = true;

        const fetchLatestTravelDetails = async () => {
            try {
                const response = await apiFetch.get(`/quotation/get-quotation/${quotationBookingData.quotationId}`);
                const latestDetails = response?.latestPdfRevision?.travelDetails;

                const packageId = response?.packageId?._id
                const packageResponse = await apiFetch.get(`/package/get-package/${packageId}`);

                const quoteTravelers = latestDetails?.travelers || [];
                const computeTotalTravelers = typeof quoteTravelers === 'number'
                    ? quoteTravelers
                    : (Number(quoteTravelers?.adult) || 0)
                    + (Number(quoteTravelers?.child) || 0)
                    + (Number(quoteTravelers?.infant) || 0);

                console.log("Response from API:", response);
                console.log("Package Response:", packageResponse);
                console.log("Computed Total Travelers:", computeTotalTravelers);
                console.log("Quote Travelers Data:", quoteTravelers);

                const packageType = packageResponse?.packageType || 'fixed';
                const packageImages = packageResponse?.images || packageResponse?.packageImages || [];

                if (!latestDetails || !isMounted) return;

                const travelDateValue = latestDetails.travelDate || latestDetails.travelDates || latestDetails.date || null;
                const priceValue = latestDetails.totalPrice || "N/A"
                const travelersValue = latestDetails.travelers || 0;
                const hotelValue = latestDetails.preferredHotels || latestDetails.hotel || "";
                const airlineValue = latestDetails.preferredAirlines || latestDetails.airline || ""

                const deposit = latestDetails.totalDeposit || 0;
                const adultRate = latestDetails.totalRate || 0;
                const childRate = latestDetails.totalChildRate || 0;
                const infantRate = latestDetails.totalInfantRate || 0;

                const quotationId = quotationBookingData.quotationId


                const totalTravelers = typeof travelersValue === 'number'
                    ? travelersValue
                    : (Number(travelersValue?.adult) || 0)
                    + (Number(travelersValue?.child) || 0)
                    + (Number(travelersValue?.infant) || 0);

                setQuotationBookingData((prev) => ({
                    ...prev,
                    packageId: packageId,
                    quotationId: quotationId,
                    travelDate: prev.travelDate || travelDateValue,
                    travelDatePrice: prev.travelDatePrice || priceValue,
                    travelersCount: prev.travelersCount || travelersValue,
                    deposit: prev.deposit || deposit,
                    adultRate: prev.adultRate || adultRate,
                    childRate: prev.childRate || childRate,
                    infantRate: prev.infantRate || infantRate,
                    travelers: prev.travelers?.length
                        ? prev.travelers
                        : Array.from({ length: totalTravelers || travelersValue || 1 }, (_, index) => ({ id: index + 1 })),
                    hotelOptions: prev.hotelOptions?.length
                        ? prev.hotelOptions
                        : hotelValue
                            ? [{ name: hotelValue }]
                            : [],
                    airlineOptions: prev.airlineOptions?.length
                        ? prev.airlineOptions
                        : airlineValue
                            ? [{ name: airlineValue }]
                            : [],
                    inclusions: prev.inclusions?.length ? prev.inclusions : latestDetails.inclusions || [],
                    exclusions: prev.exclusions?.length ? prev.exclusions : latestDetails.exclusions || [],
                    packageType: prev.packageType || packageType,
                    itinerary: Object.keys(prev.itinerary || {}).length
                        ? prev.itinerary
                        : latestDetails.itinerary || {},
                    images: prev.images?.length
                        ? prev.images
                        : (latestDetails.images && latestDetails.images.length)
                            ? latestDetails.images
                            : packageImages
                }));
            } catch (error) {
                console.error("Failed to load latest travel details:", error);
            }
        };
        fetchLatestTravelDetails();
        return () => {
            isMounted = false;
        };
    }, [quotationBookingData?.quotationId, quotationBookingData?.travelersCount, setQuotationBookingData]);

    console.log("Booking Data in QuotationBookingProcess:", data)

    //ROOM OPTIONS BASED ON BOOKING TYPE AND TRAVELER COUNT
    const groupRoomOptions = (() => {
        if (travelersTotal === 2) {
            return [
                { value: 'TWIN', label: 'TWIN' },
                { value: 'DOUBLE', label: 'DOUBLE' }
            ]
        }

        if (travelersTotal === 3) {
            return [{ value: 'TRIPLE', label: 'TRIPLE' }]
        }

        if (travelersTotal === 4) {
            return [
                { value: 'TWIN', label: 'TWIN' },
                { value: 'DOUBLE', label: 'DOUBLE' }
            ]
        }

        return [
            { value: 'TWIN', label: 'TWIN' },
            { value: 'DOUBLE', label: 'DOUBLE' },
            { value: 'TRIPLE', label: 'TRIPLE' }
        ]
    })()

    const roomOptions = bookingType === 'Solo Booking'
        ? [{ value: 'SINGLE', label: 'SINGLE' }]
        : bookingType === 'Group Booking'
            ? groupRoomOptions
            : [
                { value: 'TWIN', label: 'TWIN' },
                { value: 'DOUBLE', label: 'DOUBLE' },
                { value: 'SINGLE', label: 'SINGLE' },
                { value: 'TRIPLE', label: 'TRIPLE' },
            ]

    //TRAVELER TYPE LABELS FOR DISPLAY
    const travelerTypeLabels = (() => {
        const labels = []
        labels.push(...Array(travelersCount.adult).fill('Adult'))
        labels.push(...Array(travelersCount.child).fill('Child'))
        labels.push(...Array(travelersCount.infant).fill('Infant'))
        return labels
    })()


    //STATE FOR UPLOADED FILES AND PREVIEWS
    const [photoFileLists, setPhotoFileLists] = useState(
        Array.from({ length: totalTravelersCount || 1 }, () => [])
    );

    const [photoPreviews, setPhotoPreviews] = useState(
        Array.from({ length: totalTravelersCount || 1 }, () => null)
    );

    const [fileLists, setFileLists] = useState(
        Array.from({ length: totalTravelersCount || 1 }, () => [])
    );

    const [previews, setPreviews] = useState(
        Array.from({ length: totalTravelersCount || 1 }, () => null)
    );

    //STATE FOR CURRENT STEP AND PDF GENERATION
    const [currentStep, setCurrentStep] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        setFileLists(Array.from({ length: totalTravelersCount || 1 }, () => []));
        setPreviews(Array.from({ length: totalTravelersCount || 1 }, () => null));
        setPhotoFileLists(Array.from({ length: totalTravelersCount || 1 }, () => []));
        setPhotoPreviews(Array.from({ length: totalTravelersCount || 1 }, () => null));
    }, [totalTravelersCount]);

    useEffect(() => {
        const currentTravelers = form.getFieldValue('travelers') || []
        if (currentTravelers.length === uploadTravelerCount) return

        const nextTravelers = [...currentTravelers]
        if (nextTravelers.length < uploadTravelerCount) {
            nextTravelers.push(...Array(uploadTravelerCount - nextTravelers.length).fill({}))
        } else {
            nextTravelers.length = uploadTravelerCount
        }
        form.setFieldsValue({ travelers: nextTravelers })
        setQuotationBookingData(prev => ({ ...prev, travelers: nextTravelers }))
    }, [form, uploadTravelerCount, setQuotationBookingData])

    //IF SOLO BOOKING, SET ALL TRAVELERS TO SINGLE ROOM
    useEffect(() => {
        if (bookingType !== 'Solo Booking') return
        const travelers = form.getFieldValue('travelers') || []
        if (!travelers.length) return

        const nextTravelers = travelers.map((traveler) => ({
            ...traveler,
            roomType: 'SINGLE'
        }))
        form.setFieldsValue({ travelers: nextTravelers })
        setQuotationBookingData(prev => ({ ...prev, travelers: nextTravelers }))
    }, [bookingType, form, setQuotationBookingData])

    //GO TO THE NEXT PAGE OF REGISTRATION
    const next = async () => {
        try {
            await form.validateFields();

            if (currentStep === 2) {
                const missingUploads = fileLists.some(list => !list || list.length === 0);
                const missingPhotos = photoFileLists.some(list => !list || list.length === 0);

                if (missingPhotos) {
                    message.error("Please upload 2x2 photo for all travelers.");
                    return;
                }

                if (missingUploads) {
                    message.error(`Please upload ${travelDocumentShortLabel} for all travelers.`);
                    return;
                }
            }

            let currentFormValues = form.getFieldsValue();
            const currentTravelers = form.getFieldValue('travelers') || []
            const fallbackTravelers = quotationBookingData?.travelers || []
            const baseTravelers = currentTravelers.length
                ? currentTravelers
                : Array.isArray(currentFormValues.travelers) && currentFormValues.travelers.length
                    ? currentFormValues.travelers
                    : fallbackTravelers

            if (bookingType === 'Solo Booking') {
                currentFormValues.travelers = (baseTravelers || []).map(t => ({
                    ...t,
                    roomType: 'SINGLE'
                }));
            } else {
                currentFormValues.travelers = baseTravelers
            }

            let photoFilesFormatted = quotationBookingData?.photoFiles || [];
            let passportFilesFormatted = quotationBookingData?.passportFiles || [];

            if (currentStep === 2) {
                photoFilesFormatted = await Promise.all(
                    photoFileLists.map(async (list) => {
                        const fileObj = list?.[0]?.originFileObj;

                        if (!fileObj) {
                            throw new Error("Invalid photo upload");
                        }

                        return {
                            name: fileObj.name,
                            type: fileObj.type,
                            base64: await toBase64(fileObj),
                        };
                    })
                );

                passportFilesFormatted = await Promise.all(
                    fileLists.map(async (list) => {
                        const fileObj = list?.[0]?.originFileObj;

                        if (!fileObj) {
                            throw new Error("Invalid file upload");
                        }

                        return {
                            name: fileObj.name,
                            type: fileObj.type,
                            base64: await toBase64(fileObj),
                        };
                    })
                );
            }

            const travelersWithDocuments = (currentFormValues.travelers || []).map((traveler, index) => ({
                ...traveler,
                passportFile: passportFilesFormatted[index] || null,
                photoFile: photoFilesFormatted[index] || null
            }));

            form.setFieldsValue({ travelers: travelersWithDocuments });

            setQuotationBookingData(prev => ({
                ...prev,
                ...currentFormValues,
                travelers: travelersWithDocuments.length ? travelersWithDocuments : prev.travelers,
                travelerCounts: travelersCount,
                bookingType: bookingType,
                totalPrice: totalPrice,
                passportFiles: passportFilesFormatted,
                photoFiles: photoFilesFormatted
            }));

            setCurrentStep(currentStep + 1);

            console.log('Current Form Values on Next:', currentFormValues);
            console.log('Updated Booking Data on Next:', {
                ...quotationBookingData,
                ...currentFormValues,
                travelerCounts: travelersCount,
                bookingType: bookingType,
                totalPrice: totalPrice,
                passportFiles: passportFilesFormatted,
                photoFiles: photoFilesFormatted
            });
            console.log('Save Successful, moving to next step');


        } catch (error) {
            console.error('Validation error:', error);
            const firstError = error?.errorFields?.[0];
            if (firstError?.name) {
                form.scrollToField(firstError.name);
                const fieldPath = Array.isArray(firstError.name)
                    ? firstError.name.join(' > ')
                    : String(firstError.name)
                const errorMessage = firstError.errors?.[0]
                    ? `${firstError.errors[0]} (${fieldPath})`
                    : `Please complete all required fields before proceeding. (${fieldPath})`
                message.error(errorMessage);
                return;
            }
            message.error("Please complete all required fields before proceeding. Check the console for details.");
        }
    };


    //GO TO THE PREVIOUS PAGE OF REGISTRATION
    const prev = () => setCurrentStep(currentStep - 1);

    //VALIDATE UPLOADED FILES
    const validateFile = (file) => {
        const isValidType =
            file.type === 'image/jpeg' ||
            file.type === 'image/png'

        if (!isValidType) {
            message.error('Only JPG or PNG');
            return Upload.LIST_IGNORE;
        }

        const isValidSize = file.size / 1024 / 1024 < 5;
        if (!isValidSize) {
            message.error('File must be smaller than 5MB');
            return Upload.LIST_IGNORE;
        }

        return false;
    };

    //FINAL SUBMISSION OF REGISTRATION
    const handleFinalSubmit = async () => {
        try {
            await form.validateFields();
            const finalFormValues = form.getFieldsValue();

            // Final save to context before navigating
            setQuotationBookingData(prev => ({
                ...prev,
                ...finalFormValues,
                status: 'pending_payment',
                submittedAt: new Date().toISOString()
            }));

            const previousStep = currentStep;

            setCurrentStep(previousStep);
            setIsGeneratingPdf(false);

            message.success("Registration details saved. Proceeding to payment...");
            navigate('/quotation-payment-process');

        } catch (error) {
            setIsGeneratingPdf(false);
            message.error("Please review the terms and conditions.");
        }
    };

    //HANDLE FORM VALUE CHANGES
    const handleValuesChange = (changedValues, allValues) => {
        console.log('Form values changed:', changedValues);
        console.log('All current form values:', allValues);
        console.log("Current Form Data:", allValues.travelers);
    };

    //HANDLE FILE UPLOAD CHANGES
    const handleChange = (info, index) => {
        const newFileLists = [...fileLists];
        newFileLists[index] = info.fileList;
        setFileLists(newFileLists);

        const file = info.file;
        const newPreviews = [...previews];

        if (file.status === 'removed') {
            newPreviews[index] = null;
        } else {
            if (file instanceof File || (file.originFileObj instanceof File)) {
                const previewUrl = URL.createObjectURL(file.originFileObj || file);
                newPreviews[index] = previewUrl;
            }
        }
        setPreviews(newPreviews);
    };

    //HANDLE 2BY2 PHOTO UPLOAD CHANGES
    const handlePhotoChange = (info, index) => {
        const newFileLists = [...photoFileLists];
        newFileLists[index] = info.fileList;
        setPhotoFileLists(newFileLists);

        const file = info.file;
        const newPreviews = [...photoPreviews];

        if (file.status === 'removed') {
            newPreviews[index] = null;
        } else {
            if (file instanceof File || (file.originFileObj instanceof File)) {
                const previewUrl = URL.createObjectURL(file.originFileObj || file);
                newPreviews[index] = previewUrl;
            }
        }
        setPhotoPreviews(newPreviews);
    };

    //HANDLE RESET OF UPLOADED FILES
    const handleResetUploads = (index) => {
        const newFileLists = [...fileLists];
        newFileLists[index] = [];
        setFileLists(newFileLists);

        const newPhotoFileLists = [...photoFileLists];
        newPhotoFileLists[index] = [];
        setPhotoFileLists(newPhotoFileLists);

        const newPreviews = [...previews];
        newPreviews[index] = null;
        setPreviews(newPreviews);

        const newPhotoPreviews = [...photoPreviews];
        newPhotoPreviews[index] = null;
        setPhotoPreviews(newPhotoPreviews);
    };

    const updateTravelerField = (index, field, value, extras = {}) => {
        const travelers = form.getFieldValue('travelers') || []
        const nextTravelers = travelers.map((traveler, travelerIndex) =>
            travelerIndex === index
                ? { ...traveler, [field]: value, ...extras }
                : traveler
        )
        form.setFieldsValue({ travelers: nextTravelers })
        setQuotationBookingData(prev => ({ ...prev, travelers: nextTravelers }))
    }


    useEffect(() => {
        return () => {
            previews.forEach(url => {
                if (url) URL.revokeObjectURL(url);
            });
        };
    }, [previews]);

    //REDIRECT TO HOME IF NO QUOTATION DATA
    useEffect(() => {
        if (!quotationBookingData) {
            navigate('/home', { replace: true });
        }
    }, [quotationBookingData, navigate]);

    if (!quotationBookingData) return null;

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: '#305797' }
            }}
        >
            <div className='bookingprocess-container'>

                {/* BOOKING SUMMARY SECTION */}
                <div className="booking-summary-container booking-section">
                    <div className="booking-section-header">
                        <h2 className='booking-summary-title booking-section-title'>Booking Summary</h2>
                        <p className="upload-passport-text booking-section-subtitle">
                            Kindly check the details of your booking before proceeding.
                        </p>
                    </div>
                    <div className="booking-summary-wrapper">

                        {/* Images Row */}
                        <div className="booking-summary-images">
                            {images.map((img, index) => (
                                <img key={index} className="booking-summary-image" src={img} alt="tour" />
                            ))}
                        </div>

                        {/* New Split Content Grid */}
                        <div className="booking-summary-content-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 350px',
                            gap: '24px',
                            marginTop: '24px',
                            alignItems: 'start'
                        }}>

                            {/* Left Column: Detailed Info */}
                            <div className="booking-summary-card" style={{ margin: 0 }}>
                                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                                    Booking Details
                                </h3>

                                <div className="booking-summary-row">
                                    <span className="booking-summary-label">Tour Package</span>
                                    <span className="booking-summary-value"><strong>{packageName}</strong></span>
                                </div>

                                <div className="booking-summary-row">
                                    <span className="booking-summary-label">Booking Type</span>
                                    <span className="booking-summary-value">
                                        {bookingType}
                                    </span>
                                </div>

                                <div className="booking-summary-row">
                                    <span className="booking-summary-label">Travel Date</span>
                                    <span className="booking-summary-value">
                                        {quotationBookingData.travelDate}
                                    </span>
                                </div>

                                <div className='booking-summary-row'>
                                    <span className="booking-summary-label">Airline / Hotel</span>
                                    <span className="booking-summary-value">
                                        {airlineOptions[0]?.name || 'N/A'} • {hotelOptions[0]?.name || 'N/A'}
                                    </span>
                                </div>

                                <div className="booking-summary-row">
                                    <span className="booking-summary-label">Travelers</span>
                                    <span className="booking-summary-value">
                                        {totalTravelersCount === 1 ? '1 Person' : `${totalTravelersCount} Person(s)`}
                                    </span>
                                </div>
                            </div>

                            {/* Right Column: Pricing Summary Card */}
                            <div className="booking-summary-card price-highlight-card" >
                                <span className='booking-summary-total-amount-label'>
                                    Total Amount
                                </span>
                                <h2 className='booking-summary-total-amount-value'>
                                    ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </h2>
                                <div className='booking-summary-total-amount-note'>
                                    *All inclusions fees are already factored in the total price.
                                </div>

                                <div className='booking-summary-package-type-card' >
                                    <span style={{ fontSize: '13px' }}>Package Type:</span><br />
                                    <strong style={{ color: '#305797' }}>{packageType?.toUpperCase()}</strong>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* ITINERARY, INCLUSIONS, EXCLUSIONS */}
                <div className='itinerary-inclusions-exclusions'>
                    <div className='itinerary-section-header'>
                        <h2 className='itinerary-section-title'>Itinerary, Inclusions & Exclusions</h2>
                        <p className='itinerary-section-subtitle'>Review the day-by-day schedule and what your package covers.</p>
                    </div>

                    <div className='itinerary-inclusions-grid'>
                        <div className='itinerary-card'>
                            <div className='card-title'>
                                <span className='card-pill'>Itinerary</span>
                                <h3>Day-by-day plan</h3>
                                <p className='card-subtitle'>Activities and highlights for each day.</p>
                            </div>

                            {itineraryEntries.length ? (
                                <div className='itinerary-list'>
                                    {itineraryEntries.map((day) => (
                                        <div key={day.key} className='itinerary-day'>
                                            <div className='itinerary-day-label'>{day.label}</div>
                                            {day.items.length ? (
                                                <ul className='itinerary-items'>
                                                    {day.items.map((item, index) => (
                                                        <li key={`${day.key}-${index}`}>{item}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className='itinerary-empty'>No activities listed.</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className='itinerary-empty'>No itinerary details available.</p>
                            )}
                        </div>

                        <div className='inclusions-exclusions-card'>
                            <div className='card-title'>
                                <span className='card-pill'>Package</span>
                                <h3>Inclusions & Exclusions</h3>
                                <p className='card-subtitle'>Know what is covered and what is not.</p>
                            </div>

                            <div className='inclusions-exclusions-grid'>
                                <div className='inclusions-card'>
                                    <h4>Inclusions</h4>
                                    {inclusions.length ? (
                                        <ul className='inclusions-list'>
                                            {inclusions.map((item, index) => (
                                                <li key={`inc-${index}`}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className='itinerary-empty'>No inclusions listed.</p>
                                    )}
                                </div>

                                <div className='exclusions-card'>
                                    <h4>Exclusions</h4>
                                    {exclusions.length ? (
                                        <ul className='exclusions-list'>
                                            {exclusions.map((item, index) => (
                                                <li key={`exc-${index}`}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className='itinerary-empty'>No exclusions listed.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* UPLOAD PASSPORT AND 2BY2 PHOTO */}
                <div className='upload-passport-container booking-section'>
                    <div className="booking-section-header">
                        <h2 className="upload-passport-title booking-section-title">Upload {travelDocumentLabel}</h2>
                        <p className="upload-passport-text booking-section-subtitle">
                            Please upload a clear image of your {travelDocumentShortLabel} for each traveler.
                        </p>
                    </div>
                    <div className="upload-passport-wrapper">
                        {Array.from({
                            length: uploadTravelerCount
                        }).map((_, index) => (
                            <div key={index} className="upload-card">

                                <div className='upload-passport-left'>
                                    <h4>
                                        Traveler {index + 1} - {travelerTypeLabels[index] || 'Traveler'}
                                    </h4>
                                    <p style={{ fontSize: 12, color: '#888' }}>
                                        Upload {travelDocumentShortLabel} and 2x2 ID photo
                                    </p>
                                    <div className="upload-passport-traveler-fields">
                                        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '90px 1fr 1fr' }}>
                                            <Select
                                                size="small"
                                                placeholder="Title"
                                                value={form.getFieldValue(['travelers', index, 'title'])}
                                                onChange={(value) => updateTravelerField(index, 'title', value)}
                                                options={[
                                                    { value: 'MR', label: 'MR' },
                                                    { value: 'MS', label: 'MS' },
                                                ]}
                                            />
                                            <Input
                                                maxLength={50}
                                                size="small"
                                                placeholder="First name"
                                                value={form.getFieldValue(['travelers', index, 'firstName'])}
                                                onChange={(event) => updateTravelerField(index, 'firstName', event.target.value)}
                                                onKeyDown={(e) => {
                                                    const regex = /^[A-Za-z\s'-]$/;

                                                    if (
                                                        e.key.length === 1 &&
                                                        !regex.test(e.key)
                                                    ) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                            />
                                            <Input
                                                maxLength={50}
                                                size="small"
                                                placeholder="Last name"
                                                value={form.getFieldValue(['travelers', index, 'lastName'])}
                                                onChange={(event) => updateTravelerField(index, 'lastName', event.target.value)}
                                                onKeyDown={(e) => {
                                                    const regex = /^[A-Za-z\s'-]$/;

                                                    if (
                                                        e.key.length === 1 &&
                                                        !regex.test(e.key)
                                                    ) {
                                                        e.preventDefault();
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
                                            <Select
                                                size="small"
                                                placeholder="Room type"
                                                value={form.getFieldValue(['travelers', index, 'roomType'])}
                                                onChange={(value) => updateTravelerField(index, 'roomType', value)}
                                                options={roomOptions}
                                                disabled={bookingType === 'Solo Booking'}
                                            />
                                            <DatePicker
                                                size="small"
                                                placeholder="Birthdate"
                                                defaultPickerValue={dayjs('2000-01-01')}
                                                format="MMMM D, YYYY"
                                                value={form.getFieldValue(['travelers', index, 'birthday'])}
                                                onChange={(date) => {
                                                    const age = date ? computeAge(date) : ''
                                                    updateTravelerField(index, 'birthday', date, { age })
                                                }}
                                                disabledDate={(current) => current && current >= dayjs().startOf('day')}
                                            />
                                        </div>
                                        {!isDomesticPackage && (
                                            <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
                                                <Input
                                                    maxLength={7}
                                                    size="small"
                                                    placeholder="Passport number"
                                                    value={form.getFieldValue(['travelers', index, 'passportNo'])}
                                                    onChange={(event) => updateTravelerField(index, 'passportNo', event.target.value)}
                                                    onKeyDown={(e) => {
                                                        const regex = /^[0-9]$/;

                                                        if (
                                                            e.key.length === 1 &&
                                                            !regex.test(e.key)
                                                        ) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                />
                                                <DatePicker
                                                    size="small"
                                                    placeholder="Passport expiry"
                                                    format="MMMM D, YYYY"
                                                    value={form.getFieldValue(['travelers', index, 'passportExpiry'])}
                                                    onChange={(date) => updateTravelerField(index, 'passportExpiry', date)}
                                                    disabledDate={(current) => {
                                                        if (!current) return false
                                                        return current.isBefore(dayjs().endOf('year').add(1, 'day'), 'day')
                                                    }}
                                                    defaultPickerValue={dayjs().add(1, 'year')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

                                        {/* PASSPORT UPLOAD - Hidden if file exists */}
                                        {(!fileLists[index] || fileLists[index].length === 0) && (
                                            <Upload
                                                fileList={fileLists[index]}
                                                beforeUpload={validateFile}
                                                onChange={(info) => handleChange(info, index)}
                                                accept="image/jpeg,image/png"
                                                maxCount={1}
                                                showUploadList={false} // Hidden because you have a custom preview
                                            >
                                                <Button className='upload-passport-button' type='primary'>Upload {travelDocumentLabel}</Button>
                                            </Upload>
                                        )}

                                        {/* 2X2 PHOTO UPLOAD - Hidden if file exists */}
                                        {(!photoFileLists[index] || photoFileLists[index].length === 0) && (
                                            <Upload
                                                fileList={photoFileLists[index]}
                                                beforeUpload={validateFile}
                                                onChange={(info) => handlePhotoChange(info, index)}
                                                accept="image/jpeg,image/png"
                                                maxCount={1}
                                                showUploadList={false}
                                            >
                                                <Button className='upload-passport-button' type='primary'>Upload 2x2 Photo</Button>
                                            </Upload>
                                        )}

                                        {(fileLists[index]?.length > 0 || photoFileLists[index]?.length > 0) && (
                                            <Button
                                                type='primary'
                                                className='upload-passport-remove-button'
                                                size="small"
                                                onClick={() => handleResetUploads(index)}
                                            >
                                                Remove/Change Photos
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="upload-passport-right">
                                    {previews[index] && (
                                        <div className="passport-preview" style={{ marginTop: '10px' }}>
                                            <img
                                                src={previews[index]}
                                                alt={`Passport Preview ${index + 1}`}
                                                className="passport-preview-image"
                                            />
                                        </div>
                                    )}
                                    {!previews[index] && (
                                        <div className="passport-preview image-placeholder" aria-hidden="true">
                                            <span>{travelDocumentLabel} preview</span>
                                        </div>
                                    )}

                                    {photoPreviews[index] && (
                                        <div className="photo-preview">
                                            <img
                                                src={photoPreviews[index]}
                                                alt={`2x2 Preview ${index + 1}`}
                                                className="photo-preview-image"
                                            />
                                        </div>
                                    )}
                                    {!photoPreviews[index] && (
                                        <div className="photo-preview image-placeholder" aria-hidden="true">
                                            <span>2x2 photo</span>
                                        </div>
                                    )}
                                </div>

                            </div>
                        ))}
                    </div>
                    <div className='upload-passport-notes'>
                        <div>
                            <strong>Note:</strong>
                            <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>

                                {isDomesticPackage ? (
                                    <li>Upload a clear image of the valid ID</li>
                                ) : (
                                    <li>Upload a clear image of the passport bio page</li>
                                )}
                                <li>Accepted formats: JPG, PNG</li>
                                <li>Maximum file size: 5MB</li>
                                <li>Blurry or cropped images may delay booking confirmation</li>
                            </ul>
                        </div>

                        <div style={{ marginTop: 10 }}>
                            <strong >Note for 2x2 ID Photos:</strong>
                            <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
                                <li>Upload a clear image of the 2x2 ID photo</li>
                                <li>The photo must have a white plain background</li>
                                <li>Face should be clearly visible and not covered by any accessories (e.g., glasses, hat)</li>
                                <li>No Fullnames or any names printed in the photo</li>
                                <li>Accepted formats: JPG, PNG</li>
                                <li>Maximum file size: 5MB</li>
                                <li>Blurry or cropped images may delay booking confirmation</li>
                            </ul>
                        </div>

                    </div>
                </div>


                {/* BOOKING REGISTRATION */}
                <div className='booking-form-container booking-section'>
                    <div className="booking-form-stepper-container">
                        <h2 className="booking-form-stepper-title" style={{ textAlign: "left" }}>Booking Registration</h2>
                        <p className="booking-form-stepper-text" style={{ textAlign: "left" }}>
                            Please upload a clear image of your passport bio page for each traveler.
                        </p>
                        <Steps
                            current={currentStep}
                            items={[
                                { title: 'Traveler Info' },
                                { title: 'Dietary & Insurance' },
                                { title: 'General Package Disclaimer' },
                                { title: 'Terms & Conditions' }
                            ]}
                            style={{ marginBottom: '30px' }}
                        />

                        <div className="form-content-wrapper pdf-capture" ref={pdfStepRef}>
                            {currentStep === 0 && (
                                <BookingRegistrationTravelersQuote
                                    form={form}
                                    onValuesChange={handleValuesChange}
                                    summary={summary}
                                    totalCount={travelersCount}
                                />
                            )}

                            {currentStep === 1 && (
                                <BookingRegistrationDietQuote
                                    form={form}
                                    onValuesChange={handleValuesChange}
                                    summary={summary}
                                />
                            )}

                            {currentStep === 2 && (
                                <BookingRegistrationTermsQuotePart1
                                    form={form}
                                    onValuesChange={handleValuesChange}
                                    summary={summary}
                                />
                            )}

                            {currentStep === 3 && (
                                <BookingRegistrationTermsQuotePart2
                                    form={form}
                                    onValuesChange={handleValuesChange}
                                    summary={summary}
                                />
                            )}
                        </div>

                        <div className='booking-form-button-controls'>
                            {currentStep > 0 && (
                                <Button
                                    className='booking-form-button'
                                    size="large"
                                    onClick={prev}
                                    style={{ padding: '0 40px' }}
                                >
                                    Previous Page
                                </Button>
                            )}

                            {currentStep < 3 ? (
                                <Button
                                    className='booking-form-button'
                                    size="large"
                                    onClick={next}
                                    style={{ padding: '0 40px' }}
                                >
                                    Next Page
                                </Button>
                            ) : (
                                <Button
                                    className='booking-form-button-proceed'
                                    size="large"
                                    onClick={() => setIsProceedModalOpen(true)}
                                    style={{ padding: '0 40px' }}
                                >
                                    Proceed to Payment
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

            </div >

            <Modal
                open={isProceedModalOpen}
                className='signup-success-modal'
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onCancel={() => { setIsProceedModalOpen(false) }}
                style={{ top: 70 }}
                width={800}
            >
                <div className='signup-success-container' style={{ width: '100%' }}>
                    <h1 className='signup-success-heading'>Proceed to Booking</h1>
                    <p className='signup-success-text'>
                        Make sure that you have read the terms and conditions before proceeding. The travel agency will not be tolerating any type of tampering and modifications in the booking details.
                        Once, you have proceed with the booking, you will not be able to change or modify any of the booking details. If you have any concerns or questions regarding your booking, please contact our customer support for assistance.
                    </p>


                    <p className='signup-success-text'>By clicking the "Proceed" button, you acknowledge that you have read and understood the terms and conditions of your booking, and you agree to proceed with the booking process. Please ensure that all the information you provided is accurate and complete before confirming your booking.</p>
                    <p className='signup-success-text'>Thank you for choosing our travel services. We look forward to providing you with an unforgettable travel experience!</p>

                    <p className='signup-success-text' style={{ color: "#992A46", fontWeight: "500" }}>Note: Once you click the "Proceed" button, your booking will be submitted and cannot be modified. Please review all details carefully before proceeding.</p>
                    <p className='signup-success-text' style={{ color: "#992A46", fontWeight: "500" }}>If you have any questions or need further assistance, please contact our customer support team before proceeding.</p>



                </div>

                <div className='signup-actions'>
                    <Button
                        id='signup-success-button'
                        onClick={handleFinalSubmit}
                    >
                        Proceed
                    </Button>

                    <Button
                        id='signup-success-button-cancel'
                        onClick={onCancelModal}
                    >
                        Cancel
                    </Button>
                </div>
            </Modal>
        </ConfigProvider >
    )
}
