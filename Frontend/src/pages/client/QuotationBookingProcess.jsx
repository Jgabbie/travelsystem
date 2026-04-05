import React, { useEffect, useRef, useState } from 'react'
import { Button, message, Upload, Form, Steps, ConfigProvider } from 'antd'
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axiosInstance from '../../config/axiosConfig';
import '../../style/components/modals/bookingsummarymodal.css'
import '../../style/components/modals/uploadpassportmodal.css'
import '../../style/components/modals/travelersmodal.css'
import '../../style/components/modals/soloorgroupedmodal.css'
import '../../style/client/bookingprocess.css'
import BookingRegistrationDietQuote from '../../components/form_quotationbooking/BookingRegistrationDietQuote';
import BookingRegistrationTermsQuotePart1 from '../../components/form_quotationbooking/BookingRegistrationTermsQuotePart1';
import BookingRegistrationTermsQuotePart2 from '../../components/form_quotationbooking/BookingRegistrationTermsQuotePart2';
import BookingRegistrationTravelersQuote from '../../components/form_quotationbooking/BookingRegistrationTravelersQuote';

const getDisplayDate = (value) => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (value instanceof Date && !Number.isNaN(value.valueOf())) {
        return value.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }
    return String(value)
}

export default function QuotationBookingProcess() {
    const [form] = Form.useForm();
    const { bookingData, setBookingData } = useBooking();
    const navigate = useNavigate();
    const pdfStepRef = useRef(null);

    //get summary data
    const summary = bookingData || {}
    const data = summary
    const hotelOptions = data.hotelOptions?.length ? data.hotelOptions : []
    const airlineOptions = data.airlineOptions?.length ? data.airlineOptions : []
    const travelersCount = (() => {
        if (Array.isArray(data.travelers)) return data.travelers.length || 1;
        if (typeof data.travelersCount === 'number') return data.travelersCount;
        if (data.travelersCount && typeof data.travelersCount === 'object') {
            const adult = Number(data.travelersCount.adult) || 0;
            const child = Number(data.travelersCount.child) || 0;
            const infant = Number(data.travelersCount.infant) || 0;
            return Math.max(1, adult + child + infant);
        }
        return 1;
    })();
    const travelerCounts = { adult: travelersCount, child: 0, infant: 0 }

    const packagePricePerPax = data.travelDatePrice || 0
    const totalPrice = packagePricePerPax * travelersCount
    const packageName = data.packageName || 'Tour Package'
    const packageType = data.packageType || 'fixed'
    const bookingType = travelersCount === 1 ? 'Solo Booking' : 'Group Booking'
    const images = data.images || []

    //inclusions, exclusions and itinerary
    const inclusions = data.inclusions || []
    const exclusions = data.exclusions || []
    const itinerary = data.itinerary || {}

    console.log("Booking Data in QuotationBookingProcess:", data)

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

    const [photoFileLists, setPhotoFileLists] = useState(
        Array.from({ length: travelersCount || 1 }, () => [])
    );

    const [photoPreviews, setPhotoPreviews] = useState(
        Array.from({ length: travelersCount || 1 }, () => null)
    );


    const [fileLists, setFileLists] = useState(
        Array.from({ length: travelersCount || 1 }, () => [])
    );

    const [previews, setPreviews] = useState(
        Array.from({ length: travelersCount || 1 }, () => null)
    );

    const [currentStep, setCurrentStep] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        setFileLists(Array.from({ length: travelersCount || 1 }, () => []));
        setPreviews(Array.from({ length: travelersCount || 1 }, () => null));
        setPhotoFileLists(Array.from({ length: travelersCount || 1 }, () => []));
        setPhotoPreviews(Array.from({ length: travelersCount || 1 }, () => null));
    }, [travelersCount]);

    useEffect(() => {
        if (!bookingData?.quotationId) return;

        let isMounted = true;

        const fetchLatestTravelDetails = async () => {
            try {
                const response = await axiosInstance.get(`/quotation/get-quotation/${bookingData.quotationId}`);
                const latestDetails = response.data?.latestPdfRevision?.travelDetails;

                const packageId = response.data?.packageId?._id
                const packageResponse = await axiosInstance.get(`/package/get-package/${packageId}`);


                const quoteTravelers = latestDetails?.travelers || [];
                const computeTotalTravelers = typeof quoteTravelers === 'number'
                    ? quoteTravelers
                    : (Number(quoteTravelers?.adult) || 0)
                    + (Number(quoteTravelers?.child) || 0)
                    + (Number(quoteTravelers?.infant) || 0);

                console.log("Response from API:", response.data);
                console.log("Package Response:", packageResponse.data);
                console.log("Computed Total Travelers:", computeTotalTravelers);
                console.log("Quote Travelers Data:", quoteTravelers);

                const packageType = packageResponse.data?.packageType || 'fixed';
                const packageImages = packageResponse.data?.images || packageResponse.data?.packageImages || [];

                if (!latestDetails || !isMounted) return;

                const travelDateValue = latestDetails.travelDate || latestDetails.travelDates || latestDetails.date || null;
                const priceValue = latestDetails.totalPrice || "N/A"
                const travelersValue = latestDetails.travelers || bookingData.travelersCount || 1;
                const hotelValue = latestDetails.preferredHotels || latestDetails.hotel || "";
                const airlineValue = latestDetails.preferredAirlines || latestDetails.airline || "";

                const totalTravelers = typeof travelersValue === 'number'
                    ? travelersValue
                    : (Number(travelersValue?.adult) || 0)
                    + (Number(travelersValue?.child) || 0)
                    + (Number(travelersValue?.infant) || 0);

                setBookingData((prev) => ({
                    ...prev,
                    travelDate: prev.travelDate || travelDateValue,
                    travelDatePrice: prev.travelDatePrice || priceValue,
                    travelerCounts: prev.travelerCounts || travelersValue,
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
    }, [bookingData?.quotationId, bookingData?.travelersCount, setBookingData]);

    const next = async () => {
        try {
            await form.validateFields();

            const missingUploads = fileLists.some(list => !list || list.length === 0);
            const missingPhotos = photoFileLists.some(list => !list || list.length === 0);

            if (missingPhotos) {
                message.error("Please upload 2x2 photo for all travelers.");
                return;
            }

            if (missingUploads) {
                message.error("Please upload passport for all travelers.");
                return;
            }

            const currentFormValues = form.getFieldsValue();

            const photoFilesFormatted = photoFileLists.map((list) => {
                const fileObj = list?.[0]?.originFileObj;

                if (!fileObj) {
                    throw new Error("Invalid photo upload");
                }

                return {
                    name: fileObj.name,
                    type: fileObj.type,
                    file: fileObj,
                };
            });

            const passportFilesFormatted = fileLists.map((list) => {
                const fileObj = list?.[0]?.originFileObj;

                if (!fileObj) {
                    throw new Error("Invalid file upload");
                }

                return {
                    name: fileObj.name,
                    type: fileObj.type,
                    file: fileObj,
                };
            });

            setBookingData(prev => ({
                ...prev,
                ...currentFormValues,
                travelerCounts,
                totalPrice: totalPrice,
                passportFiles: passportFilesFormatted,
                photoFiles: photoFilesFormatted
            }));

            setCurrentStep(currentStep + 1);

            console.log('Current Form Values on Next:', currentFormValues);
            console.log('Updated Booking Data on Next:', {
                ...bookingData,
                ...currentFormValues,
                travelerCounts,
                totalPrice: totalPrice,
                passportFiles: passportFilesFormatted,
                photoFiles: photoFilesFormatted
            });
            console.log('Save Successful, moving to next step');


        } catch (error) {
            const firstError = error?.errorFields?.[0];
            if (firstError?.name) {
                form.scrollToField(firstError.name);
                message.error(firstError.errors?.[0] || "Please complete all required fields before proceeding.");
                return;
            }
            message.error("Please complete all required fields before proceeding.");
        }
    };

    const prev = () => setCurrentStep(currentStep - 1);

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

    const handleFinalSubmit = async () => {
        try {
            await form.validateFields();
            const finalFormValues = form.getFieldsValue();

            // Final save to context before navigating
            setBookingData(prev => ({
                ...prev,
                ...finalFormValues,
                status: 'pending_payment',
                submittedAt: new Date().toISOString()
            }));

            const stepsToCapture = [0, 1, 2, 3];
            const previousStep = currentStep;

            setIsGeneratingPdf(true);

            const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

            for (let i = 0; i < stepsToCapture.length; i += 1) {
                setCurrentStep(stepsToCapture[i]);

                await new Promise((resolve) => setTimeout(resolve, 300));

                if (!pdfStepRef.current) {
                    continue;
                }

                const canvas = await html2canvas(pdfStepRef.current, {
                    scale: 1,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;
                const renderHeight = Math.min(imgHeight, pdfHeight);

                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, renderHeight);

                if (i < stepsToCapture.length - 1) {
                    pdf.addPage();
                }
            }

            pdf.save(`booking-registration-${dayjs().format('YYYYMMDD-HHmmss')}.pdf`);

            setCurrentStep(previousStep);
            setIsGeneratingPdf(false);

            message.success("Registration details saved. Proceeding to payment...");
            navigate('/quotation-payment-process');
        } catch (error) {
            setIsGeneratingPdf(false);
            message.error("Please review the terms and conditions.");
        }
    };

    const handleValuesChange = (changedValues, allValues) => {
        console.log('Form values changed:', changedValues);
        console.log('All current form values:', allValues);
        console.log("Current Form Data:", allValues.travelers);
    };

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

    useEffect(() => {
        return () => {
            previews.forEach(url => {
                if (url) URL.revokeObjectURL(url);
            });
        };
    }, [previews]);

    useEffect(() => {
        if (!bookingData) {
            navigate('/home', { replace: true });
        }
    }, [bookingData, navigate]);

    if (!bookingData) return null;

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: '#305797' }
            }}
        >
            <div className='bookingprocess-container'>

                {/* booking summary section */}
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
                                        {bookingData.travelDate}
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
                                        {travelersCount === 1 ? '1 Person' : `${travelersCount} Person(s)`}
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

                {/* upload passport section */}
                <div className='upload-passport-container booking-section'>
                    <div className="booking-section-header">
                        <h2 className="upload-passport-title booking-section-title">Upload Passport</h2>
                        <p className="upload-passport-text booking-section-subtitle">
                            Please upload a clear image of your passport bio page for each traveler.
                        </p>
                    </div>
                    <div className="upload-passport-wrapper">
                        {Array.from({ length: travelersCount || 1 }).map((_, index) => (
                            <div key={index} className="upload-card">

                                <div className='upload-passport-left'>
                                    <h4>Traveler {index + 1}</h4>
                                    <p style={{ fontSize: 12, color: '#888' }}>
                                        Upload passport and 2x2 ID photo
                                    </p>
                                    <Upload
                                        fileList={fileLists[index]}
                                        beforeUpload={validateFile}
                                        onChange={(info) => handleChange(info, index)}
                                        accept="image/jpeg,image/png"
                                        maxCount={1}
                                        showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                                    >
                                        <Button type="default">
                                            {fileLists[index]?.length > 0 ? 'Change File' : 'Upload File'}
                                        </Button>
                                    </Upload>

                                    <Upload
                                        fileList={photoFileLists[index]}
                                        beforeUpload={validateFile}
                                        onChange={(info) => handlePhotoChange(info, index)}
                                        accept="image/jpeg,image/png"
                                        maxCount={1}
                                        style={{ marginTop: 10 }}
                                    >
                                        <Button>
                                            {photoFileLists[index]?.length > 0 ? 'Change 2x2 Photo' : 'Upload 2x2 Photo'}
                                        </Button>
                                    </Upload>
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

                                    {photoPreviews[index] && (
                                        <div style={{ marginTop: '10px' }}>
                                            <img
                                                src={photoPreviews[index]}
                                                alt={`2x2 Preview ${index + 1}`}
                                                style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '4px' }}
                                            />
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
                                <li>Upload a clear image of the passport bio page</li>
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

                {/* booking registration section */}
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

                    <div className="form-navigation-buttons" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                        {currentStep > 0 && (
                            <Button onClick={prev}>
                                Back
                            </Button>
                        )}

                        {currentStep < 3 ? (
                            <Button type="primary" onClick={next}>
                                Next Step
                            </Button>
                        ) : (
                            <Button type="primary" onClick={handleFinalSubmit} loading={isGeneratingPdf} disabled={isGeneratingPdf}>
                                Submit Final Booking
                            </Button>
                        )}
                    </div>
                </div>

            </div >
        </ConfigProvider>
    )
}
