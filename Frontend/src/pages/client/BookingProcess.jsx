import React, { useEffect, useRef, useState } from 'react'
import { Button, message, Upload, Form, Steps, ConfigProvider, Space, Spin } from 'antd'
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../../style/components/modals/bookingsummarymodal.css'
import '../../style/components/modals/uploadpassportmodal.css'
import '../../style/components/modals/travelersmodal.css'
import '../../style/components/modals/soloorgroupedmodal.css'
import '../../style/client/bookingprocess.css'
import BookingRegistrationDiet from '../../components/form/BookingRegistrationDiet';
import BookingRegistrationTravelers from '../../components/form/BookingRegistrationTravelers';
import BookingRegistrationTermsPart1 from '../../components/form/BookingRegistrationTermsPart1';
import BookingRegistrationTermsPart2 from '../../components/form/BookingRegistrationTermsPart2';


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

const INITIAL_COUNTS = {
    adult: 2,
    child: 0,
    infant: 0,
}

const toBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

export default function BookingProcess() {
    const [form] = Form.useForm();
    const { bookingData, setBookingData } = useBooking();
    const navigate = useNavigate();
    const pdfStepRef = useRef(null);

    const [selectedSoloGrouped, setSelectedSoloGrouped] = useState("solo")
    const [counts, setCounts] = useState(INITIAL_COUNTS)

    console.log('Booking Data in BookingProcess:', bookingData);

    //get summary data
    const summary = bookingData || {}
    const data = summary
    const travelers = data.travelers?.length ? data.travelers : ['None selected']
    const hotelOptions = data.hotelOptions?.length ? data.hotelOptions : []
    const airlineOptions = data.airlineOptions?.length ? data.airlineOptions : []
    const travelDate = getDisplayDate(data.travelDate)
    const travelersCount = selectedSoloGrouped === 'solo'
        ? { adult: 1, child: 0, infant: 0 }
        : { adult: counts.adult, child: counts.child, infant: counts.infant }

    const bookingType = selectedSoloGrouped === 'solo' ? 'Solo Booking' : 'Group Booking'
    const soloRate = data.packageSoloRate || 0
    const soloExtraRate = Math.max(0, soloRate - (data.travelDatePrice || 0))
    const soloTotal = soloRate + soloExtraRate
    const dateSurcharge = data.travelDateRate || 0

    const childRate = data.packageChildRate || 0
    const infantRate = data.packageInfantRate || 0
    const packagePricePerPax = data.travelDatePrice || 0




    const totalPrice =
        travelersCount.adult * packagePricePerPax +
        travelersCount.child * childRate +
        travelersCount.infant * infantRate;
    const travelersTotal = travelersCount.adult + travelersCount.child + travelersCount.infant
    const travelerBreakdownParts = [
        travelersCount.adult ? `${travelersCount.adult} Adult${travelersCount.adult > 1 ? 's' : ''}` : null,
        travelersCount.child ? `${travelersCount.child} Child${travelersCount.child > 1 ? 'ren' : ''}` : null,
        travelersCount.infant ? `${travelersCount.infant} Infant${travelersCount.infant > 1 ? 's' : ''}` : null
    ].filter(Boolean)
    const travelersDisplay = selectedSoloGrouped === 'solo'
        ? '1 Person'
        : `${travelersTotal} Person(s)${travelerBreakdownParts.length ? ` (${travelerBreakdownParts.join(', ')})` : ''}`
    const packageName = data.packageName || 'Tour Package'
    const packageType = data.packageType || 'fixed'
    const images = data.images || []

    //inclusions, exclusions and itinerary
    const inclusions = data.inclusions || []
    const exclusions = data.exclusions || []
    const itinerary = data.itinerary || {}

    const itineraryEntries = (() => {
        if (Array.isArray(itinerary)) {
            return itinerary.map((items, index) => ({
                key: `day-${index + 1}`,
                label: `Day ${index + 1}`,
                items: Array.isArray(items)
                    ? items
                    : items
                        ? [String(items)]
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
                    ? itinerary[dayKey]
                    : itinerary[dayKey]
                        ? [String(itinerary[dayKey])]
                        : []
            }))
    })()

    //travelers
    const maxAdults = data.maxAdults || 10
    const maxChildren = data.maxChildren || 10
    const maxInfants = data.maxInfants || 10


    const [fileLists, setFileLists] = useState(
        Array.from({ length: travelers.length || 1 }, () => [])
    );

    const [previews, setPreviews] = useState(
        Array.from({ length: travelers.length || 1 }, () => null)
    );

    const [currentStep, setCurrentStep] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        setBookingData(prev => ({
            ...prev,
            bookingType: selectedSoloGrouped === 'solo' ? 'Solo Booking' : 'Group Booking'
        }));
    }, [selectedSoloGrouped]);

    const next = async () => {
        try {
            await form.validateFields();

            const missingUploads = fileLists.some(list => !list || list.length === 0);

            if (missingUploads) {
                message.error("Please upload passport for all travelers.");
                return;
            }

            let currentFormValues = form.getFieldsValue();

            if (bookingType === 'Solo Booking') {
                currentFormValues.travelers = (currentFormValues.travelers || []).map(t => ({
                    ...t,
                    roomType: 'SINGLE'
                }));
            }

            const passportFilesFormatted = await Promise.all(
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

            setBookingData(prev => ({
                ...prev,
                ...currentFormValues,
                travelerCounts: travelersCount,
                bookingType: bookingType,
                totalPrice: totalPrice,
                passportFiles: passportFilesFormatted
            }));

            setCurrentStep(currentStep + 1);

            console.log('Current Form Values on Next:', currentFormValues);
            console.log('Updated Booking Data on Next:', {
                ...bookingData,
                ...currentFormValues,
                travelerCounts: travelersCount,
                bookingType: bookingType,
                totalPrice: totalPrice,
                passportFiles: passportFilesFormatted
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

            const waitForRender = (ms = 250) => new Promise((resolve) => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, ms);
                });
            });

            for (let i = 0; i < stepsToCapture.length; i += 1) {
                const step = stepsToCapture[i];
                setCurrentStep(step);
                await waitForRender();

                if (!pdfStepRef.current) {
                    continue;
                }

                const canvas = await html2canvas(pdfStepRef.current, {
                    scale: 1.5,
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
            navigate('/booking-payment');
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

    const increaseAdult = () => setCounts(prev => ({ ...prev, adult: Math.min(prev.adult + 1, maxAdults) }));
    const decreaseAdult = () => setCounts(prev => ({ ...prev, adult: Math.max(2, prev.adult - 1) }));
    const increaseChild = () => setCounts(prev => ({ ...prev, child: Math.min(prev.child + 1, maxChildren) }));
    const decreaseChild = () => setCounts(prev => ({ ...prev, child: Math.max(0, prev.child - 1) }));
    const increaseInfant = () => setCounts(prev => ({ ...prev, infant: Math.min(prev.infant + 1, maxInfants) }));
    const decreaseInfant = () => setCounts(prev => ({ ...prev, infant: Math.max(0, prev.infant - 1) }));

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
            <Spin spinning={isGeneratingPdf} tip="Preparing your PDF..." size="large">
                <div className='bookingprocess-container'>

                    {/* Solo/Group Selection */}
                    <div className='bookingprocess-sologroup-container booking-section'>
                        <div className="solo-group-content">
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                            }}>

                                <div>
                                    <h1 className='solo-group-heading booking-section-title' style={{ textAlign: "left" }}>
                                        Select Your Package Arrangement
                                    </h1>
                                    <p className="upload-passport-text booking-section-subtitle" style={{ marginTop: 10, textAlign: "left" }}>
                                        Kindly select if you are traveling alone or with a group.
                                    </p>
                                </div>


                                <Space style={{ marginLeft: "auto" }}>
                                    <Button
                                        onClick={() => navigate(-1)}
                                        style={{ display: 'flex', alignItems: 'center' }}
                                    >
                                        Back
                                    </Button>
                                </Space>
                            </div>
                            <div className="solo-group-cards">
                                <button
                                    type="button"
                                    className={`solo-group-card${selectedSoloGrouped === 'solo' ? ' is-selected' : ''}`}
                                    onClick={() => setSelectedSoloGrouped('solo')}
                                >
                                    <div className="solo-group-image solo" />
                                    <h3>Single Supplement / Solo Booking</h3>
                                    <p>Book for yourself with a single traveler setup.</p>
                                    <p style={{ color: "#FF4D4F", fontWeight: "500" }}>Note: A single supplement fee may apply which can be more than the usual rate. The per pax rate only apply to group with minimum of 2 travelers.</p>
                                </button>

                                <button
                                    type="button"
                                    className={`solo-group-card${selectedSoloGrouped === 'group' ? ' is-selected' : ''}`}
                                    onClick={() => setSelectedSoloGrouped('group')}
                                >
                                    <div className="solo-group-image group" />
                                    <h3>Grouped Booking</h3>
                                    <p>Plan a trip for a group with shared activities.</p>
                                    <p style={{ color: "#FF4D4F", fontWeight: "500" }}>Note: Group booking should have a minimum of 2 travelers.</p>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Traveler Counters (conditionally rendered) */}
                    {selectedSoloGrouped === 'group' && (
                        <div className='travelers-container booking-section'>
                            <div className="travelers-content">
                                <h3 className="travelers-title booking-section-title" style={{ textAlign: "left" }}>
                                    Number of Travelers
                                </h3>
                                <p className="upload-passport-text booking-section-subtitle" style={{ textAlign: "left" }}>
                                    Kindly indicate the number of travelers in each category.
                                </p>
                                <div className="travelers-cards">
                                    <div className="traveler-card">
                                        <h3>Adult</h3>
                                        <p>
                                            Rates: ₱{packagePricePerPax.toLocaleString('en-PH', { minimumFractionDigits: 2 })} per adult
                                        </p>
                                        <p>
                                            <strong>Maximum:</strong> {maxAdults}

                                        </p>
                                        <p>
                                            Ages 12 and above
                                        </p>
                                        <div className="traveler-counter">
                                            <button
                                                type="button"
                                                onClick={decreaseAdult}
                                                disabled={counts.adult <= 2}
                                            >
                                                -
                                            </button>
                                            <span>{counts.adult}</span>
                                            <button type="button" onClick={increaseAdult}>+</button>
                                        </div>
                                    </div>
                                    <div className="traveler-card">
                                        <h3>Child</h3>
                                        <p>
                                            Rates: ₱{childRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })} per child
                                        </p>
                                        <p>
                                            <strong>Maximum:</strong> {maxChildren}
                                        </p>
                                        <p>
                                            Ages 3-11
                                        </p>
                                        <div className="traveler-counter">
                                            <button type="button" onClick={decreaseChild}>-</button>
                                            <span>{counts.child}</span>
                                            <button type="button" onClick={increaseChild}>+</button>
                                        </div>
                                    </div>
                                    <div className="traveler-card">
                                        <h3>Infant</h3>
                                        <p>
                                            Rates: ₱{infantRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })} per infant
                                        </p>
                                        <p>
                                            <strong>Maximum:</strong> {maxInfants}
                                        </p>
                                        <p>
                                            Ages 0-2
                                        </p>
                                        <div className="traveler-counter">
                                            <button type="button" onClick={decreaseInfant}>-</button>
                                            <span>{counts.infant}</span>
                                            <button type="button" onClick={increaseInfant}>+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

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
                                            {selectedSoloGrouped === 'solo' ? 'Solo Booking' : 'Group Booking'}
                                        </span>
                                    </div>

                                    <div className="booking-summary-row">
                                        <span className="booking-summary-label">Travel Date</span>
                                        <span className="booking-summary-value">
                                            {travelDate ? dayjs(travelDate).format('MMMM D, YYYY') : 'Not set'}
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
                                            {travelersDisplay}
                                        </span>
                                    </div>
                                </div>

                                {/* Right Column: Pricing Summary Card */}
                                <div className="booking-summary-card price-highlight-card" >
                                    <span className='booking-summary-total-amount-label'>
                                        Total Amount
                                    </span>
                                    <h2 className='booking-summary-total-amount-value'>
                                        {selectedSoloGrouped === 'solo' && soloRate > 0 && (
                                            <span>
                                                ₱{soloRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
                                        {selectedSoloGrouped === 'group' && (
                                            <span>
                                                ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                            </span>
                                        )}
                                    </h2>
                                    {selectedSoloGrouped === 'solo' && (
                                        <div style={{ marginBottom: '12px' }}>
                                            <div className="booking-summary-row">
                                                <span className="booking-summary-label">Solo rate</span>
                                                <span className="booking-summary-value">
                                                    ₱{soloExtraRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                            {soloExtraRate > 0 && (
                                                <div className="booking-summary-row">
                                                    <span className="booking-summary-label">Date surcharge</span>
                                                    <span className="booking-summary-value">
                                                        {dateSurcharge === 0 ? "NONE" : `₱${dateSurcharge.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {selectedSoloGrouped === 'group' && (
                                        <div style={{ marginBottom: '12px' }}>
                                            {travelersCount.adult > 0 && (
                                                <div className="booking-summary-row">
                                                    <span className="booking-summary-label">
                                                        Adults ({travelersCount.adult} x ₱{packagePricePerPax.toLocaleString('en-PH', { minimumFractionDigits: 2 })})
                                                    </span>
                                                    <span className="booking-summary-value">
                                                        ₱{(travelersCount.adult * packagePricePerPax).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                            {travelersCount.child > 0 && (
                                                <div className="booking-summary-row">
                                                    <span className="booking-summary-label">
                                                        Children ({travelersCount.child} x ₱{childRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })})
                                                    </span>
                                                    <span className="booking-summary-value">
                                                        ₱{(travelersCount.child * childRate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                            {travelersCount.infant > 0 && (
                                                <div className="booking-summary-row">
                                                    <span className="booking-summary-label">
                                                        Infants ({travelersCount.infant} x ₱{infantRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })})
                                                    </span>
                                                    <span className="booking-summary-value">
                                                        ₱{(travelersCount.infant * infantRate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
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
                                                            <li key={`${day.key}-${index}`}>
                                                                {typeof item === 'string' ? (
                                                                    item
                                                                ) : (
                                                                    <>
                                                                        <div>{item.activity}</div>

                                                                        {item.isOptional && item.optionalActivity && (
                                                                            <div>
                                                                                Optional: {item.optionalActivity}
                                                                                {item.optionalPrice && ` - ₱${item.optionalPrice.toLocaleString()}`}
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </li>
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
                            {Array.from({
                                length:
                                    selectedSoloGrouped === 'solo'
                                        ? 1
                                        : counts.adult + counts.child + counts.infant
                            }).map((_, index) => (
                                <div key={index} className="upload-card">

                                    <div className='upload-passport-left'>
                                        <h4>Traveler {index + 1}</h4>
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
                                    </div>

                                </div>
                            ))}
                        </div>
                        <div className='upload-passport-notes'>
                            <strong>Note:</strong>
                            <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
                                <li>Upload a clear image of the passport bio page</li>
                                <li>Accepted formats: JPG, PNG</li>
                                <li>Maximum file size: 5MB</li>
                                <li>Blurry or cropped images may delay booking confirmation</li>
                            </ul>
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
                                <BookingRegistrationTravelers
                                    form={form}
                                    onValuesChange={handleValuesChange}
                                    summary={summary}
                                    totalCount={selectedSoloGrouped === 'solo' ? 1 : travelersTotal}
                                />
                            )}

                            {currentStep === 1 && (
                                <BookingRegistrationDiet
                                    form={form}
                                    onValuesChange={handleValuesChange}
                                    summary={summary}
                                />
                            )}

                            {currentStep === 2 && (
                                <BookingRegistrationTermsPart1
                                    form={form}
                                    onValuesChange={handleValuesChange}
                                    summary={summary}
                                />
                            )}

                            {currentStep === 3 && (
                                <BookingRegistrationTermsPart2
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

                </div>
            </Spin>
        </ConfigProvider>
    )
}