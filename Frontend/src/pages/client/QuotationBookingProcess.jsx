import React, { useEffect, useRef, useState } from 'react'
import { Button, notification, Upload, Form, Steps, ConfigProvider, Modal, Input, Select, DatePicker, Space } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuotationBooking } from '../../context/BookingQuotationContext';
import apiFetch from '../../config/fetchConfig';
import dayjs from 'dayjs';
import '../../style/components/modals/bookingsummarymodal.css'
import '../../style/components/modals/uploadpassportmodal.css'
import '../../style/components/modals/travelersmodal.css'
import '../../style/components/modals/soloorgroupedmodal.css'
import '../../style/client/bookingprocess.css'
import '../../style/components/modals/modaldesign.css'
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


//COMPUTE AGE
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


//GET AGE CATEGORY BASED ON AGE
const getAgeCategoryFromAge = (age) => {
    const numericAge = Number(age)
    if (!Number.isFinite(numericAge) || numericAge < 0) return ''
    if (numericAge < 2) return 'INFANT'
    if (numericAge < 12) return 'CHILD'
    return 'ADULT'
}


//CHECK IF TRAVELER TYPE IS MINOR (CHILD OR INFANT)
const isMinorTravelerType = (travelerType) => {
    const normalized = String(travelerType || '').toLowerCase()
    return normalized === 'child' || normalized === 'infant'
}


//GET TRAVELER CATEGORY IN LOWERCASE FOR COMPARISON
const getTravelerCategory = (travelerType) => String(travelerType || '').toLowerCase()


//GET BIRTHDAY BOUNDS FOR DATE PICKER BASED ON TRAVELER TYPE
const getBirthdayBounds = (travelerType) => {
    const today = dayjs().startOf('day')
    const category = getTravelerCategory(travelerType)

    if (category === 'infant') {
        return {
            minDate: today.subtract(2, 'year'),
            maxDate: today,
            minAge: 0,
            maxAge: 2
        }
    }

    if (category === 'child') {
        return {
            minDate: today.subtract(11, 'year'),
            maxDate: today.subtract(3, 'year'),
            minAge: 3,
            maxAge: 11
        }
    }

    return {
        minDate: null,
        maxDate: today,
        minAge: 12,
        maxAge: null
    }
}


//CHECK IF SELECTED DATE IS VALID FOR THE TRAVELER TYPE
const isDateAllowedForTraveler = (date, travelerType) => {
    if (!date || !dayjs(date).isValid()) return false

    const age = computeAge(date)
    if (age === '') return false

    const { minAge, maxAge } = getBirthdayBounds(travelerType)
    if (typeof minAge === 'number' && age < minAge) return false
    if (typeof maxAge === 'number' && age > maxAge) return false

    return true
}


//GET DISABLED DATES FOR DATE PICKER BASED ON TRAVELER TYPE
const getBirthdayDisabledDate = (travelerType) => {
    const { minDate, maxDate } = getBirthdayBounds(travelerType)

    return (current) => {
        if (!current) return false
        if (maxDate && current.isAfter(maxDate, 'day')) return true
        if (minDate && current.isBefore(minDate, 'day')) return true
        return false
    }
}


export default function QuotationBookingProcess() {
    const [form] = Form.useForm();
    const { quotationBookingData, setQuotationBookingData, clearQuotationBookingData } = useQuotationBooking();
    const navigate = useNavigate();
    const pdfStepRef = useRef(null);
    const allowHistoryExitRef = useRef(false);

    const [isProceedModalOpen, setIsProceedModalOpen] = useState(false);
    const [isGoBackModalOpen, setIsGoBackModalOpen] = useState(false);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

    const hasQuotationBookingData = Boolean(
        quotationBookingData &&
        typeof quotationBookingData === 'object' &&
        quotationBookingData.quotationId &&
        quotationBookingData.packageName &&
        quotationBookingData.travelDate
    )

    //CLOSE MODAL
    const onCancelModal = () => {
        setIsProceedModalOpen(false);
    }

    //GET SUMMARY DATA FROM BOOKING QUOTATION CONTEXT
    const summary = quotationBookingData || {}
    const data = summary
    const packageDescription = data.packageDescription || 'Secure a memorable trip with curated stays, activities, and guided experiences.'
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
    const adultRate = Number(data?.adultRate) || 0
    const childRate = Number(data?.childRate) || 0
    const infantRate = Number(data?.infantRate) || 0
    const adultCount = Number(travelersCount.adult) || 0
    const childCount = Number(travelersCount.child) || 0
    const infantCount = Number(travelersCount.infant) || 0
    const travelerFareBreakdown = [
        {
            key: 'adult',
            label: 'Adult',
            count: adultCount,
            rate: adultRate,
            amount: adultCount * adultRate
        },
        {
            key: 'child',
            label: 'Child',
            count: childCount,
            rate: childRate,
            amount: childCount * childRate
        },
        {
            key: 'infant',
            label: 'Infant',
            count: infantCount,
            rate: infantRate,
            amount: infantCount * infantRate
        }
    ]
    const packageName = data.packageName || 'Tour Package'
    const packageType = data.packageType || 'fixed'
    const isDomesticPackage = String(packageType).toLowerCase().includes('domestic')
    const travelDocumentLabel = isDomesticPackage ? 'Valid ID' : 'Passport'
    const travelDocumentShortLabel = isDomesticPackage ? 'valid ID' : 'passport'
    const bookingType = totalTravelersCount === 1 ? 'Solo Booking' : 'Group Booking'
    const images = data.images || []
    const visaRequired = data.visaRequired || false


    //INCLUSIONS, EXCLUSIONS, ITINERARY
    const inclusions = data.inclusions || []
    const exclusions = data.exclusions || []
    const itinerary = data.itinerary || {}


    //FORMAT ITINERARY ENTRIES
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

        const extractImages = (items) => {
            if (!Array.isArray(items)) return []
            return items
                .flatMap((item) => (Array.isArray(item?.itineraryImages) ? item.itineraryImages : []))
                .filter(Boolean)
                .slice(0, 3)
        }

        if (Array.isArray(itinerary)) {
            return itinerary.map((items, index) => ({
                key: `day-${index + 1}`,
                label: `Day ${index + 1}`,
                images: extractImages(items),
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
                images: extractImages(itinerary[dayKey]),
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

                const packageCode = response?.packageId?.packageCode
                const packageId = response?.packageId?._id
                const packageResponse = packageCode
                    ? await apiFetch.get(`/package/get-package/${encodeURIComponent(packageCode)}`)
                    : await apiFetch.get(`/package/get-package/${packageId}`);

                const quoteTravelers = latestDetails?.travelers || [];
                const computeTotalTravelers = typeof quoteTravelers === 'number'
                    ? quoteTravelers
                    : (Number(quoteTravelers?.adult) || 0)
                    + (Number(quoteTravelers?.child) || 0)
                    + (Number(quoteTravelers?.infant) || 0);

                const packageType = packageResponse?.packageType;
                const packageImages = packageResponse?.images || packageResponse?.packageImages || [];
                const visaRequired = packageResponse?.visaRequired || false;

                if (!latestDetails || !isMounted) return;

                const formattedStartTravelDate = dayjs(latestDetails.travelDates.split('-')[0].trim()).format("YYYY-MM-DD") || dayjs(latestDetails.travelDate).format("YYYY-MM-DD") || dayjs(latestDetails.date).format("YYYY-MM-DD") || null;
                const formattedEndTravelDate = dayjs(latestDetails.travelDates.split('-')[1].trim()).format("YYYY-MM-DD") || dayjs(latestDetails.travelDate).format("YYYY-MM-DD") || dayjs(latestDetails.date).format("YYYY-MM-DD") || null;

                const formattedTravelDates = {
                    startDate: formattedStartTravelDate,
                    endDate: formattedEndTravelDate
                }

                const travelDateValue = formattedTravelDates
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
                    visaRequired: prev.visaRequired !== undefined ? prev.visaRequired : visaRequired,
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



    //ROOM OPTIONS BASED ON BOOKING TYPE AND TRAVELER COUNT
    const groupRoomOptions = [
        { value: 'TWIN', label: 'TWIN' },
        { value: 'DOUBLE', label: 'DOUBLE' },
        { value: 'TRIPLE', label: 'TRIPLE' }
    ]


    //IF SOLO BOOKING, ONLY SINGLE ROOM OPTION. 
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

    const [visaSelections, setVisaSelections] = useState(
        Array.from({ length: totalTravelersCount || 1 }, () => null)
    )

    const [visaFileLists, setVisaFileLists] = useState(
        Array.from({ length: totalTravelersCount || 1 }, () => [])
    )

    const [visaPreviews, setVisaPreviews] = useState(
        Array.from({ length: totalTravelersCount || 1 }, () => null)
    )

    const passportFileInputs = useRef([]);
    const photoFileInputs = useRef([]);


    //STATE FOR CURRENT STEP AND PDF GENERATION
    const [currentStep, setCurrentStep] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


    //RESET FILE UPLOADS AND PREVIEWS WHEN TRAVELER COUNT CHANGES
    useEffect(() => {
        setFileLists(Array.from({ length: totalTravelersCount || 1 }, () => []));
        setPreviews(Array.from({ length: totalTravelersCount || 1 }, () => null));
        setPhotoFileLists(Array.from({ length: totalTravelersCount || 1 }, () => []));
        setPhotoPreviews(Array.from({ length: totalTravelersCount || 1 }, () => null));
    }, [totalTravelersCount]);

    useEffect(() => {
        setVisaSelections((prev) => {
            const next = [...prev]
            if (next.length < uploadTravelerCount) {
                next.push(...Array(uploadTravelerCount - next.length).fill(null))
            } else {
                next.length = uploadTravelerCount
            }
            return next
        })
        setVisaFileLists((prev) => {
            const next = [...prev]
            if (next.length < uploadTravelerCount) {
                next.push(...Array(uploadTravelerCount - next.length).fill([]))
            } else {
                next.length = uploadTravelerCount
            }
            return next
        })
        setVisaPreviews((prev) => {
            const next = [...prev]
            if (next.length < uploadTravelerCount) {
                next.push(...Array(uploadTravelerCount - next.length).fill(null))
            } else {
                next.length = uploadTravelerCount
            }
            return next
        })
    }, [uploadTravelerCount])


    //ADJUST TRAVELERS ARRAY IN FORM BASED ON TRAVELER COUNT
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


    //IF GROUP BOOKING, ENSURE NO TRAVELER IS SET TO SINGLE ROOM
    useEffect(() => {
        if (bookingType !== 'Group Booking') return

        const travelers = form.getFieldValue('travelers') || []
        if (!travelers.length) return

        const allowedRoomType = groupRoomOptions[0]?.value || 'TWIN'
        const nextTravelers = travelers.map((traveler) => ({
            ...traveler,
            roomType: traveler?.roomType === 'SINGLE' ? allowedRoomType : traveler?.roomType
        }))

        form.setFieldsValue({ travelers: nextTravelers })
        setQuotationBookingData(prev => ({ ...prev, travelers: nextTravelers }))
    }, [bookingType, form, setQuotationBookingData])


    //IF CHILD/INFANT TRAVELER, FORCE ROOM TYPE TO N/A
    useEffect(() => {
        const travelers = form.getFieldValue('travelers') || []
        if (!travelers.length) return

        let hasChanges = false
        const nextTravelers = travelers.map((traveler, travelerIndex) => {
            const travelerType = travelerTypeLabels[travelerIndex] || 'Adult'
            const isMinorTraveler = isMinorTravelerType(travelerType)

            if (isMinorTraveler) {
                if (traveler?.roomType === 'N/A') return traveler
                hasChanges = true
                return { ...traveler, roomType: 'N/A' }
            }

            if (traveler?.roomType !== 'N/A') return traveler
            hasChanges = true
            return {
                ...traveler,
                roomType: bookingType === 'Solo Booking' ? 'SINGLE' : undefined
            }
        })

        if (!hasChanges) return

        form.setFieldsValue({ travelers: nextTravelers })
        setQuotationBookingData(prev => ({ ...prev, travelers: nextTravelers }))
    }, [form, travelerTypeLabels, bookingType, setQuotationBookingData])


    //GO TO THE NEXT PAGE OF REGISTRATION - show verification modal first
    const nextConfirmed = async () => {
        try {
            await form.validateFields();

            if (currentStep === 0) {
                const missingUploads = fileLists.some(list => !list || list.length === 0);
                const missingPhotos = photoFileLists.some(list => !list || list.length === 0);

                if (missingPhotos) {
                    notification.error({ message: "Please upload 2x2 photo for all travelers.", placement: 'topRight' });
                    return;
                }

                if (missingUploads) {
                    notification.error({ message: `Please upload ${travelDocumentShortLabel} for all travelers.`, placement: 'topRight' });
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

        } catch (error) {
            console.error('Validation error:', error);
            const firstError = error?.errorFields?.[0];
            if (firstError?.name) {
                form.scrollToField(firstError.name);
                const errorMessage = firstError.errors?.[0]
                    ? firstError.errors[0]
                    : 'Please complete all required fields before proceeding.'
                notification.error({ message: errorMessage, placement: 'topRight' });
                return;
            }
            notification.error({ message: "Please complete all required fields before proceeding. Check the console for details.", placement: 'topRight' });
        }
    };


    //GO NEXT
    const next = async () => {
        if (currentStep === 0) {
            setIsVerifyModalOpen(true);
            return;
        }
        await nextConfirmed();
    }


    //GO TO THE PREVIOUS PAGE OF REGISTRATION
    const prev = () => setCurrentStep(currentStep - 1);


    //VALIDATE UPLOADED FILES
    const validateFile = (file) => {
        const isValidType =
            file.type === 'image/jpeg' ||
            file.type === 'image/png' ||
            file.type === 'application/pdf'

        if (!isValidType) {
            notification.error({ message: 'Only JPG, PNG, or PDF', placement: 'topRight' });
            return Upload.LIST_IGNORE;
        }

        const isValidSize = file.size / 1024 / 1024 < 5;
        if (!isValidSize) {
            notification.error({ message: 'File must be smaller than 5MB', placement: 'topRight' });
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

            notification.success({ message: "Registration details saved. Proceeding to payment...", placement: 'topRight' });
            navigate('/quotation-payment-process');

        } catch (error) {
            setIsGeneratingPdf(false);
            notification.error({ message: "Please review the terms and conditions.", placement: 'topRight' });
        }
    };

    //HANDLE FORM VALUE CHANGES
    const handleValuesChange = (changedValues, allValues) => {

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

    const handleVisaChange = (info, index) => {
        const newFileLists = [...visaFileLists]
        newFileLists[index] = info.fileList
        setVisaFileLists(newFileLists)

        const file = info.file
        setVisaPreviews((prev) => {
            const next = [...prev]
            if (file.status === 'removed') {
                next[index] = null
            } else if (file instanceof File || (file.originFileObj instanceof File)) {
                next[index] = URL.createObjectURL(file.originFileObj || file)
            }
            return next
        })
    }


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



    // RESET PASSPORT UPLOAD
    const handleResetPassport = (index) => {
        const newFileLists = [...fileLists];
        newFileLists[index] = [];
        setFileLists(newFileLists);

        const newPreviews = [...previews];
        newPreviews[index] = null;
        setPreviews(newPreviews);
    };

    // RESET 2BY2 PHOTO UPLOAD
    const handleResetPhoto = (index) => {
        const newPhotoFileLists = [...photoFileLists];
        newPhotoFileLists[index] = [];
        setPhotoFileLists(newPhotoFileLists);

        const newPhotoPreviews = [...photoPreviews];
        newPhotoPreviews[index] = null;
        setPhotoPreviews(newPhotoPreviews);
    };


    //UPDATE A SPECIFIC FIELD FOR A TRAVELER IN THE FORM AND CONTEXT
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
            [...previews, ...photoPreviews, ...visaPreviews].forEach(url => {
                if (url) URL.revokeObjectURL(url);
            });
        };
    }, [previews, photoPreviews, visaPreviews]);


    //REDIRECT TO HOME IF NO QUOTATION DATA
    useEffect(() => {
        if (!hasQuotationBookingData) {
            navigate('/home', { replace: true });
        }
    }, [hasQuotationBookingData, navigate]);


    //OPEN GO BACK MODAL WHEN THE BROWSER BACK BUTTON IS USED--------------------------------
    useEffect(() => {
        const historyState = window.history.state || {}

        if (!historyState.quotationBookingBackGuard) {
            window.history.pushState(
                { ...historyState, quotationBookingBackGuard: true },
                '',
                window.location.href
            )
        }

        const handlePopState = () => {
            if (allowHistoryExitRef.current) {
                return
            }

            setIsGoBackModalOpen(true)
            window.history.pushState(
                { quotationBookingBackGuard: true },
                '',
                window.location.href
            )
        }

        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
        }
    }, [])

    if (!hasQuotationBookingData) return null;



    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: '#305797' }
            }}
        >
            <div className='bookingprocess-container'>

                <Space style={{ marginLeft: "auto" }}>
                    <Button
                        type='primary'
                        className='booking-back-button'
                        onClick={() => {
                            setIsGoBackModalOpen(true)
                        }}
                        style={{ display: 'flex', alignItems: 'center', marginLeft: '40px' }}
                    >
                        <ArrowLeftOutlined />
                        Back
                    </Button>
                </Space>

                {/* BOOKING SUMMARY SECTION */}
                <div className="booking-summary-container booking-section">
                    <div className="booking-section-header">
                        <h2 className='booking-summary-title booking-section-title'>Booking Summary</h2>
                        <p className="upload-passport-text booking-section-subtitle">
                            Kindly check the details of your booking before proceeding.
                        </p>
                    </div>
                    <div className="booking-summary-wrapper">
                        <div className="booking-summary-hero">
                            <div className="booking-summary-hero-image-wrap">
                                <Modal
                                    open={isVerifyModalOpen}
                                    closable
                                    footer={null}
                                    onCancel={() => setIsVerifyModalOpen(false)}
                                    centered={true}
                                    width={600}
                                >
                                    <div className='modal-container' style={{ width: '100%' }}>
                                        <h2 className='modal-heading'>Please Verify Details</h2>
                                        <p className='modal-text'>Kindly make sure to verify and check the information of your details — ensure passport and photo are clear and correct.</p>
                                    </div>
                                    <div className='modal-actions'>
                                        <Button
                                            type='primary'
                                            className='modal-button'
                                            onClick={async () => {
                                                setIsVerifyModalOpen(false);
                                                await nextConfirmed();
                                            }}
                                        >
                                            Confirm & Continue
                                        </Button>

                                        <Button
                                            type='primary'
                                            className='modal-button-cancel'
                                            onClick={() => setIsVerifyModalOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </Modal>

                                {images[0] ? (
                                    <img className="booking-summary-hero-image" src={images[0]} alt={packageName} />
                                ) : (
                                    <div className="booking-summary-hero-placeholder">No image available</div>
                                )}
                                <div className="booking-summary-hero-bar">
                                    <div className="booking-summary-hero-meta">
                                        <span className="booking-summary-pill">{packageType?.toUpperCase()}</span>
                                    </div>
                                    <h3 className="booking-summary-hero-title">{packageName}</h3>
                                    <p className="booking-summary-hero-subtitle">{packageDescription}</p>
                                </div>
                            </div>

                        </div>

                        <div className="booking-summary-gallery">
                            <h3 className="booking-summary-section-title">Gallery</h3>
                            <div className="booking-summary-gallery-grid">
                                {(images.length > 1 ? images.slice(1, 4) : []).map((img, index) => (
                                    <img key={index} className="booking-summary-gallery-image" src={img} alt={`${packageName} ${index + 2}`} />
                                ))}
                                {images.length <= 1 && (
                                    <div className="booking-summary-gallery-empty">No additional images</div>
                                )}
                            </div>
                        </div>

                        <div className="booking-summary-overview-grid">
                            <div className="booking-summary-overview">
                                <h3 className="booking-summary-section-title">Overview</h3>
                                <p className="booking-summary-overview-text">
                                    Confirm your tour package, travel dates, and traveler details before proceeding.
                                </p>

                                <div className="booking-summary-card-flat">
                                    <h4 className="booking-summary-card-title">Booking Details</h4>

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
                                            {/* {`${quotationBookingData.travelDate.startDate.dayjs().format("MMM D, YYYY")} - ${quotationBookingData.travelDate.endDate.dayjs().format("MMM D, YYYY")}`} */}
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
                            </div>

                            <div className="booking-summary-card price-highlight-card">
                                <span className='booking-summary-total-amount-label'>
                                    Total Amount
                                </span>
                                <h2 className='booking-summary-total-amount-value'>
                                    ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </h2>

                                {bookingType === 'Group Booking' && (
                                    <div style={{ marginTop: '12px' }}>
                                        {travelersCount.adult > 0 && (
                                            <div className="booking-summary-row">
                                                <span className="booking-summary-label">
                                                    Adults ({travelersCount.adult} x ₱{adultRate.toLocaleString('en-PH', { minimumFractionDigits: 2 })})
                                                </span>
                                                <span className="booking-summary-value">
                                                    ₱{(travelersCount.adult * adultRate).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
                                    *All inclusions fees for this package are already factored in the total price, execpt for Visas and other additionals. For solo booking, rate has already been applied in the total price.
                                </div>

                                <div className='booking-summary-package-type-card' >
                                    <span style={{ fontSize: '13px' }}>Package Type:</span><br />
                                    <strong style={{ color: '#305797' }}>{packageType?.toUpperCase()}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ITINERARY, INCLUSIONS, EXCLUSIONS */}
                    <div className='itinerary-section-header' style={{ marginTop: 40 }}>
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
                                        <details key={day.key} className='itinerary-day'>
                                            <summary className='itinerary-day-label'>{day.label}</summary>
                                            {day.images?.length > 0 && (
                                                <div className='itinerary-day-images'>
                                                    {day.images.map((src, index) => (
                                                        <img
                                                            key={`${day.key}-image-${index}`}
                                                            className='itinerary-day-image'
                                                            src={src}
                                                            alt={`${day.label} image ${index + 1}`}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {day.items.length ? (
                                                <ul className='quotation-itinerary-items'>
                                                    {day.items.map((item, index) => (
                                                        <li key={`${day.key}-${index}`}>{item}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className='itinerary-empty'>No activities listed.</p>
                                            )}
                                        </details>
                                    ))}
                                </div>
                            ) : (
                                <p className='itinerary-empty'>No itinerary details available.</p>
                            )}
                        </div>

                        <div className='inclusions-exclusions-card' >
                            <div className='card-title'>
                                <span className='card-pill'>Package</span>
                                <h3>Inclusions & Exclusions</h3>
                                <p className='card-subtitle'>Know what is covered and what is not.</p>
                            </div>

                            <div className='inclusions-exclusions-grid'>
                                <div className='inclusions-card'>
                                    <h4>Inclusions</h4>
                                    {inclusions.length ? (
                                        <ul className='quotation-inclusions-list'>
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
                                        <ul className='quotation-exclusions-list'>
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



                    {/* UPLOAD PASSPORT AND 2BY2 PHOTO */}
                    <div className="booking-section-header" style={{ marginTop: 40 }}>
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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label className='upload-passport-label'>TITLE</label>
                                                <Select
                                                    style={{ height: 40 }}
                                                    size="small"
                                                    placeholder="Title"
                                                    value={form.getFieldValue(['travelers', index, 'title'])}
                                                    onChange={(value) => updateTravelerField(index, 'title', value)}
                                                    options={[
                                                        { value: 'MR', label: 'MR' },
                                                        { value: 'MS', label: 'MS' },
                                                    ]}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label className='upload-passport-label'>FIRST NAME</label>
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
                                                    onBlur={() => {
                                                        const v = String(form.getFieldValue(['travelers', index, 'firstName']) || '').trim();
                                                        if (v.length < 2) {
                                                            notification.error({ message: 'First name must be at least 2 characters', placement: 'topRight' });
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label className='upload-passport-label'>LAST NAME</label>
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
                                                    onBlur={() => {
                                                        const v = String(form.getFieldValue(['travelers', index, 'lastName']) || '').trim();
                                                        if (v.length < 2) {
                                                            notification.error({ message: 'Last name must be at least 2 characters', placement: 'topRight' });
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label className='upload-passport-label'>ROOM TYPE</label>
                                                <Select
                                                    style={{ height: 40 }}
                                                    size="small"
                                                    placeholder="Room type"
                                                    value={isMinorTravelerType(travelerTypeLabels[index]) ? 'N/A' : form.getFieldValue(['travelers', index, 'roomType'])}
                                                    onChange={(value) => updateTravelerField(index, 'roomType', value)}
                                                    options={isMinorTravelerType(travelerTypeLabels[index]) ? [{ value: 'N/A', label: 'N/A' }] : roomOptions}
                                                    disabled={bookingType === 'Solo Booking' || isMinorTravelerType(travelerTypeLabels[index])}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label className='upload-passport-label'>BIRTHDATE</label>
                                                <DatePicker
                                                    showToday={false}
                                                    size="small"
                                                    placeholder="Birthdate"
                                                    defaultPickerValue={
                                                        travelerTypeLabels[index] === 'Child'
                                                            ? dayjs().subtract(5, 'year')
                                                            : travelerTypeLabels[index] === 'Infant'
                                                                ? dayjs().subtract(1, 'year')
                                                                : dayjs().subtract(25, 'year')
                                                    }
                                                    format="MMMM D, YYYY"
                                                    value={form.getFieldValue(['travelers', index, 'birthday'])}
                                                    onChange={(date) => {
                                                        const travelerType = travelerTypeLabels[index] || 'Adult'
                                                        if (date && !isDateAllowedForTraveler(date, travelerType)) {
                                                            const ageBounds = getBirthdayBounds(travelerType)
                                                            const ageLabel = ageBounds.minAge === 0 && ageBounds.maxAge === 2
                                                                ? '0-2'
                                                                : ageBounds.minAge === 3 && ageBounds.maxAge === 11
                                                                    ? '3-11'
                                                                    : '12+'
                                                            notification.error({ message: `Please select a ${ageLabel} year old birthdate for ${travelerType.toLowerCase()}.`, placement: 'topRight' })
                                                            return
                                                        }

                                                        const age = date ? computeAge(date) : ''
                                                        const ageCategory = date ? getAgeCategoryFromAge(age) : ''
                                                        const isMinorTraveler = isMinorTravelerType(travelerType)
                                                        const roomType = isMinorTraveler
                                                            ? 'N/A'
                                                            : bookingType === 'Solo Booking'
                                                                ? 'SINGLE'
                                                                : form.getFieldValue(['travelers', index, 'roomType'])
                                                        updateTravelerField(index, 'birthday', date, { age, ageCategory, roomType })
                                                    }}
                                                    disabledDate={(current) => {
                                                        const travelerType = travelerTypeLabels[index] || 'Adult'
                                                        const baseDisabled = getBirthdayDisabledDate(travelerType)(current)

                                                        // For Adults, disable dates after 2014 (to ensure 12+ years old)
                                                        if (travelerType === 'Adult' && current && current.year() > 2014) {
                                                            return true
                                                        }

                                                        // For Adults, disable dates before 1935 (to prevent ages over 90)
                                                        if (travelerType === 'Adult' && current && current.year() < 1935) {
                                                            return true
                                                        }

                                                        return baseDisabled
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        {!isDomesticPackage && (
                                            <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: '1fr 1fr' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <label className='upload-passport-label'>PASSPORT NUMBER (Ex. P1234567A)</label>
                                                    <Input
                                                        style={{ height: 40, textAlign: 'center', fontSize: 16, letterSpacing: '2px' }}
                                                        maxLength={9}
                                                        size="small"
                                                        placeholder="P1234567A"
                                                        value={(() => {
                                                            const val = String(form.getFieldValue(['travelers', index, 'passportNo']) || '');
                                                            return val.slice(0, 9);
                                                        })()}
                                                        onChange={(event) => {
                                                            const raw = String(event.target.value || '');
                                                            const cleaned = raw.replace(/^p/i, '');
                                                            const digits = (cleaned.match(/\d/g) || []).join('').slice(0, 7);
                                                            const lastChar = cleaned.replace(/\d/g, '').slice(-1);
                                                            const letter = /^[a-zA-Z]$/.test(lastChar) ? lastChar.toUpperCase() : '';
                                                            const passport = 'P' + digits + letter;
                                                            updateTravelerField(index, 'passportNo', passport);
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <label className='upload-passport-label'>PASSPORT EXPIRY</label>
                                                    <DatePicker
                                                        showToday={false}
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
                                                accept="image/jpeg,image/png,.pdf"
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
                                                accept="image/jpeg,image/png,.pdf"
                                                maxCount={1}
                                                showUploadList={false}
                                            >
                                                <Button className='upload-passport-button' type='primary'>Upload 2x2 Photo</Button>
                                            </Upload>
                                        )}

                                        {fileLists[index]?.length > 0 && (
                                            <Button
                                                type='primary'
                                                className='upload-passport-remove-button'
                                                size="small"
                                                onClick={() => passportFileInputs.current[index]?.click()}
                                            >
                                                Change Passport
                                            </Button>
                                        )}

                                        {photoFileLists[index]?.length > 0 && (
                                            <Button
                                                type='primary'
                                                className='upload-passport-remove-button'
                                                size="small"
                                                onClick={() => photoFileInputs.current[index]?.click()}
                                                style={{ marginLeft: fileLists[index]?.length > 0 ? 8 : 0 }}
                                            >
                                                Change 2x2 Photo
                                            </Button>
                                        )}

                                        {/* Hidden native inputs to trigger file pickers */}
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,.pdf"
                                            style={{ display: 'none' }}
                                            ref={(el) => (passportFileInputs.current[index] = el)}
                                            onChange={(e) => {
                                                const f = e.target.files && e.target.files[0];
                                                if (!f) return;
                                                handleChange({ file: f, fileList: [f] }, index);
                                                e.target.value = '';
                                            }}
                                        />

                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,.pdf"
                                            style={{ display: 'none' }}
                                            ref={(el) => (photoFileInputs.current[index] = el)}
                                            onChange={(e) => {
                                                const f = e.target.files && e.target.files[0];
                                                if (!f) return;
                                                handlePhotoChange({ file: f, fileList: [f] }, index);
                                                e.target.value = '';
                                            }}
                                        />
                                    </div>
                                    {visaRequired && !isDomesticPackage && (
                                        <div className="visa-question-card">
                                            <p className="visa-question-title">
                                                Do you have a visa for this tour package?
                                            </p>
                                            <div className="visa-question-actions">
                                                <Button
                                                    type={visaSelections[index] === 'yes' ? 'primary' : 'default'}
                                                    size="small"
                                                    onClick={() =>
                                                        setVisaSelections((prev) => {
                                                            const next = [...prev]
                                                            next[index] = 'yes'
                                                            return next
                                                        })
                                                    }
                                                >
                                                    Yes
                                                </Button>
                                                <Button
                                                    type={visaSelections[index] === 'no' ? 'primary' : 'default'}
                                                    size="small"
                                                    onClick={() =>
                                                        setVisaSelections((prev) => {
                                                            const next = [...prev]
                                                            next[index] = 'no'
                                                            return next
                                                        })
                                                    }
                                                >
                                                    No
                                                </Button>
                                            </div>
                                            {visaSelections[index] === 'yes' && (
                                                <div className="visa-upload-row">
                                                    {(!visaFileLists[index] || visaFileLists[index].length === 0) && (
                                                        <Upload
                                                            fileList={visaFileLists[index]}
                                                            beforeUpload={validateFile}
                                                            onChange={(info) => handleVisaChange(info, index)}
                                                            accept="image/jpeg,image/png,.pdf"
                                                            maxCount={1}
                                                            showUploadList={false}
                                                        >
                                                            <Button className='upload-passport-button' type='primary'>
                                                                Upload Visa
                                                            </Button>
                                                        </Upload>
                                                    )}
                                                    {visaFileLists[index]?.length > 0 && (
                                                        <Button
                                                            type='primary'
                                                            className='upload-passport-remove-button'
                                                            size="small"
                                                            onClick={() => {
                                                                setVisaFileLists((prev) => {
                                                                    const next = [...prev]
                                                                    next[index] = []
                                                                    return next
                                                                })
                                                                setVisaPreviews((prev) => {
                                                                    const next = [...prev]
                                                                    next[index] = null
                                                                    return next
                                                                })
                                                            }}
                                                        >
                                                            Change Visa
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                            {visaSelections[index] === 'yes' && (
                                                <div className="visa-preview-wrapper">
                                                    {visaPreviews[index] && visaFileLists[index]?.[0]?.type === 'application/pdf' ? (
                                                        <div className="visa-preview">
                                                            <a
                                                                href={visaPreviews[index]}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                View PDF
                                                            </a>
                                                        </div>
                                                    ) : visaPreviews[index] ? (
                                                        <div className="visa-preview">
                                                            <img
                                                                src={visaPreviews[index]}
                                                                alt={`Visa Preview ${index + 1}`}
                                                                className="visa-preview-image"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="visa-preview image-placeholder" aria-hidden="true">
                                                            <span>visa image</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {visaSelections[index] === 'no' && (
                                                <p className="visa-question-warning">
                                                    This travel package requires a visa, we highly recommend for you to get one first before booking to avoid travel issues.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="upload-passport-right">
                                    {previews[index] && fileLists[index]?.[0]?.type === 'application/pdf' ? (
                                        <div
                                            className="passport-preview"
                                            style={{
                                                marginTop: '10px',
                                                width: isDomesticPackage ? 420 : undefined,
                                                height: isDomesticPackage ? 260 : undefined,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#f0f0f0',
                                                borderRadius: '4px',
                                            }}
                                        >
                                            <a
                                                href={previews[index]}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: '10px 20px',
                                                    backgroundColor: '#305797',
                                                    color: 'white',
                                                    borderRadius: '4px',
                                                    textDecoration: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: '500',
                                                }}
                                            >
                                                View PDF
                                            </a>
                                        </div>
                                    ) : previews[index] ? (
                                        <div
                                            className="passport-preview"
                                            style={{
                                                marginTop: '10px',
                                                width: isDomesticPackage ? 420 : undefined,
                                                height: isDomesticPackage ? 260 : undefined,
                                            }}
                                        >
                                            <img
                                                src={previews[index]}
                                                alt={`Passport Preview ${index + 1}`}
                                                className="passport-preview-image"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                    ) : null}
                                    {!previews[index] && (
                                        <div
                                            className={`passport-preview image-placeholder${isDomesticPackage ? ' landscape' : ''}`}
                                            aria-hidden="true"
                                            style={isDomesticPackage ? { width: 420, height: 260 } : undefined}
                                        >
                                            <span>{travelDocumentLabel} preview</span>
                                        </div>
                                    )}

                                    {photoPreviews[index] && photoFileLists[index]?.[0]?.type === 'application/pdf' ? (
                                        <div
                                            className="photo-preview"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: '#f0f0f0',
                                                borderRadius: '4px',
                                            }}
                                        >
                                            <a
                                                href={photoPreviews[index]}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: '10px 20px',
                                                    backgroundColor: '#305797',
                                                    color: 'white',
                                                    borderRadius: '4px',
                                                    textDecoration: 'none',
                                                    cursor: 'pointer',
                                                    fontWeight: '500',
                                                }}
                                            >
                                                View PDF
                                            </a>
                                        </div>
                                    ) : photoPreviews[index] ? (
                                        <div className="photo-preview">
                                            <img
                                                src={photoPreviews[index]}
                                                alt={`2x2 Preview ${index + 1}`}
                                                className="photo-preview-image"
                                            />
                                        </div>
                                    ) : null}
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
                                <li>Accepted formats: JPG, PNG, PDF</li>
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
                                <li>Accepted formats: JPG, PNG, PDF</li>
                                <li>Maximum file size: 5MB</li>
                                <li>Blurry or cropped images may delay booking confirmation</li>
                            </ul>
                        </div>

                    </div>



                    {/* BOOKING REGISTRATION */}
                    <div className="booking-form-stepper-container" style={{ marginTop: 40 }}>
                        <div className="booking-section-header" style={{ marginBottom: 30 }}>
                            <h2 className="upload-passport-title booking-section-title" style={{ textAlign: "left" }}>Booking Registration</h2>
                            <p className="upload-passport-text booking-section-subtitle" style={{ textAlign: "left" }}>
                                Please upload a clear image of your passport bio page for each traveler.
                            </p>
                        </div>

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


                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            {currentStep > 0 && (
                                <Button
                                    type='primary'
                                    className='booking-form-button'
                                    onClick={prev}
                                    style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                >
                                    <ArrowLeftOutlined />
                                </Button>
                            )}

                            <div
                                className="form-content-wrapper pdf-capture"
                                ref={pdfStepRef}
                            >
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

                            {currentStep < 3 && (
                                <Button
                                    type='primary'
                                    className='booking-form-button'
                                    onClick={next}
                                    style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                >
                                    <ArrowRightOutlined />
                                </Button>
                            )}
                        </div>


                        {currentStep === 3 && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                                <Button
                                    type='primary'
                                    className='booking-form-button-proceed'
                                    onClick={() => setIsProceedModalOpen(true)}
                                >
                                    Proceed to Payment
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div >


            {/* PROCEED MODAL */}
            <Modal
                open={isProceedModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onCancel={() => { setIsProceedModalOpen(false) }}
                centered={true}
                width={800}
            >
                <div className='modal-container' style={{ width: '100%' }}>
                    <h1 className='modal-heading'>Proceed to Booking</h1>
                    <p className='modal-text'>
                        Make sure that you have read the terms and conditions before proceeding. The travel agency will not be tolerating any type of tampering and modifications in the booking details.
                        Once, you have proceed with the booking, you will not be able to change or modify any of the booking details. If you have any concerns or questions regarding your booking, please contact our customer support for assistance.
                    </p>


                    <p className='modal-text'>By clicking the "Proceed" button, you acknowledge that you have read and understood the terms and conditions of your booking, and you agree to proceed with the booking process. Please ensure that all the information you provided is accurate and complete before confirming your booking.</p>
                    <p className='modal-text'>Thank you for choosing our travel services. We look forward to providing you with an unforgettable travel experience!</p>

                    <p className='modal-text' style={{ color: "#992A46", fontWeight: "500" }}>Note: Once you click the "Proceed" button, your booking will be submitted and cannot be modified. Please review all details carefully before proceeding.</p>
                    <p className='modal-text' style={{ color: "#992A46", fontWeight: "500" }}>If you have any questions or need further assistance, please contact our customer support team before proceeding.</p>

                </div>

                <div className='modal-actions'>
                    <Button
                        type='primary'
                        className='modal-button'
                        onClick={handleFinalSubmit}
                    >
                        Proceed
                    </Button>

                    <Button
                        type='primary'
                        className='modal-button-cancel'
                        onClick={onCancelModal}
                    >
                        Cancel
                    </Button>
                </div>
            </Modal>


            {/* GO BACK MODAL */}
            <Modal
                open={isGoBackModalOpen}
                closable={{ 'aria-label': 'Custom Close Button' }}
                footer={null}
                onCancel={() => { setIsGoBackModalOpen(false) }}
                centered={true}
                width={600}
            >
                <div className='modal-container' style={{ width: '100%' }}>
                    <h1 className='modal-heading'>Go Back?</h1>
                    <p className='modal-text'>
                        Are you sure you want to go back? If you go back, all the information you have entered in the booking form will reset and you will have to start the booking process from the beginning.
                    </p>

                </div>

                <div className='modal-actions'>
                    <Button
                        type='primary'
                        className='modal-button'
                        onClick={() => {
                            allowHistoryExitRef.current = true
                            setIsGoBackModalOpen(false)
                            clearQuotationBookingData()
                            window.history.go(-2)
                        }}
                    >
                        Go Back
                    </Button>
                </div>
            </Modal>

        </ConfigProvider >
    )
}
