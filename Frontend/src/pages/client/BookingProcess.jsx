import React, { useEffect, useRef, useState } from 'react'
import { Button, notification, Upload, Form, Steps, ConfigProvider, Spin, Modal, Input, Select, DatePicker } from 'antd'
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import dayjs from 'dayjs';
import '../../style/components/modals/bookingsummarymodal.css'
import '../../style/components/modals/uploadpassportmodal.css'
import '../../style/components/modals/travelersmodal.css'
import '../../style/components/modals/soloorgroupedmodal.css'
import '../../style/client/bookingprocess.css'
import '../../style/components/modals/modaldesign.css'
import BookingRegistrationDiet from '../../components/form/BookingRegistrationDiet';
import BookingRegistrationTravelers from '../../components/form/BookingRegistrationTravelers';
import BookingRegistrationTermsPart1 from '../../components/form/BookingRegistrationTermsPart1';
import BookingRegistrationTermsPart2 from '../../components/form/BookingRegistrationTermsPart2';


//FORMAT DATE FOR DISPLAY
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


//INITIAL COUNT FOR GROUP BOOKING
const INITIAL_COUNTS = {
    adult: 2,
    child: 0,
    infant: 0,
}


//CONVERT FILE TO BASE64 STRING
const toBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });


//FOR COMPUTING AGE OF TRAVELERS BASED ON BIRTHDATE
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


//GET AGE CATEGORY (ADULT, CHILD, INFANT) BASED ON AGE
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


//GET TRAVELER CATEGORY IN LOWERCASE FOR COMPARISONS
const getTravelerCategory = (travelerType) => String(travelerType || '').toLowerCase()


//GET BIRTHDAY BOUNDS (MIN AND MAX DATES) BASED ON TRAVELER TYPE FOR VALIDATION
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


//VALIDATE IF SELECTED BIRTHDATE IS ALLOWED FOR THE GIVEN TRAVELER TYPE
const isDateAllowedForTraveler = (date, travelerType) => {
    if (!date || !dayjs(date).isValid()) return false

    const age = computeAge(date)
    if (age === '') return false

    const { minAge, maxAge } = getBirthdayBounds(travelerType)
    if (typeof minAge === 'number' && age < minAge) return false
    if (typeof maxAge === 'number' && age > maxAge) return false

    return true
}


//GET FUNCTION TO DISABLE DATES IN DATE PICKER BASED ON TRAVELER TYPE
const getBirthdayDisabledDate = (travelerType) => {
    const { minDate, maxDate } = getBirthdayBounds(travelerType)

    return (current) => {
        if (!current) return false
        if (maxDate && current.isAfter(maxDate, 'day')) return true
        if (minDate && current.isBefore(minDate, 'day')) return true
        return false
    }
}


export default function BookingProcess() {
    const [form] = Form.useForm();
    const { bookingData, setBookingData, clearBookingData } = useBooking();
    const navigate = useNavigate();
    const pdfStepRef = useRef(null);
    const allowHistoryExitRef = useRef(false);

    const [isProceedModalOpen, setIsProceedModalOpen] = useState(false);
    const [isGoBackModalOpen, setIsGoBackModalOpen] = useState(false);
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

    const [selectedSoloGrouped, setSelectedSoloGrouped] = useState('solo')
    const [counts, setCounts] = useState(INITIAL_COUNTS)

    const hasBookingData = Boolean(
        bookingData &&
        typeof bookingData === 'object' &&
        bookingData.packageId &&
        bookingData.packageName &&
        bookingData.travelDate
    )

    //REDIRECT TO HOME IF NO BOOKING DATA---------------------------------
    useEffect(() => {
        if (!hasBookingData) {
            navigate('/home');
        }
    }, [hasBookingData, navigate]);


    //OPEN GO BACK MODAL WHEN THE BROWSER BACK BUTTON IS USED--------------------------------
    useEffect(() => {
        const historyState = window.history.state || {}

        if (!historyState.bookingProcessBackGuard) {
            window.history.pushState(
                { ...historyState, bookingProcessBackGuard: true },
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
                { bookingProcessBackGuard: true },
                '',
                window.location.href
            )
        }

        window.addEventListener('popstate', handlePopState)

        return () => {
            window.removeEventListener('popstate', handlePopState)
        }
    }, [])


    //CLOSE MODAL
    const onCancelModal = () => {
        setIsProceedModalOpen(false);
    }

    //GET SUMMARY DATA
    const summary = hasBookingData ? bookingData : null
    const data = summary || {}
    const travelers = data.travelers?.length ? data.travelers : ['None selected']
    const hotelOptions = data.hotelOptions?.length ? data.hotelOptions : []
    const airlineOptions = data.airlineOptions?.length ? data.airlineOptions : []
    const travelDate = getDisplayDate(data.travelDate)
    const travelersCount = selectedSoloGrouped === 'solo'
        ? { adult: 1, child: 0, infant: 0 }
        : { adult: counts.adult, child: counts.child, infant: counts.infant }

    const discountPercent = Number(data.packageDiscountPercent) || 0
    const discountMultiplier = discountPercent > 0 ? 1 - (discountPercent / 100) : 1

    const basePackagePricePerPax = data.travelDatePrice || 0
    const baseSoloRate = data.packageSoloRate || 0
    const baseChildRate = data.packageChildRate || 0
    const baseInfantRate = data.packageInfantRate || 0

    const packagePricePerPax = basePackagePricePerPax * discountMultiplier
    const soloRate = baseSoloRate * discountMultiplier
    const childRate = baseChildRate * discountMultiplier
    const infantRate = baseInfantRate * discountMultiplier

    const baseSoloDisplayRate = baseSoloRate || basePackagePricePerPax
    const discountedSoloDisplayRate = soloRate || packagePricePerPax

    const soloExtraRate = Math.max(0, soloRate - packagePricePerPax)
    const dateSurcharge = data.travelDateRate || 0

    const totalPrice =
        travelersCount.adult * packagePricePerPax +
        travelersCount.child * childRate +
        travelersCount.infant * infantRate;
    const originalTotalPrice =
        travelersCount.adult * basePackagePricePerPax +
        travelersCount.child * baseChildRate +
        travelersCount.infant * baseInfantRate;
    const travelersTotal = travelersCount.adult + travelersCount.child + travelersCount.infant
    const travelerBreakdownParts = [
        travelersCount.adult ? `${travelersCount.adult} Adult${travelersCount.adult > 1 ? 's' : ''}` : null,
        travelersCount.child ? `${travelersCount.child} Child${travelersCount.child > 1 ? 'ren' : ''}` : null,
        travelersCount.infant ? `${travelersCount.infant} Infant${travelersCount.infant > 1 ? 's' : ''}` : null
    ].filter(Boolean)
    const travelersDisplay = selectedSoloGrouped === 'solo'
        ? '1 Person'
        : `${travelersTotal} Person(s)${travelerBreakdownParts.length ? ` (${travelerBreakdownParts.join(', ')})` : ''}`

    const availableSlots = Number(data.travelDateSlots || 0)
    const isGroupDisabled = availableSlots === 1
    const isTravelerLimitReached = availableSlots > 0 && travelersTotal >= availableSlots

    const bookingType = selectedSoloGrouped === 'solo' ? 'Solo Booking' : selectedSoloGrouped === 'group' ? 'Group Booking' : null
    const packageName = data.packageName || 'Tour Package'
    const packageDescription =
        data.packageDescription ||
        data.packageShortDescription ||
        'Secure a memorable trip with curated stays, activities, and guided experiences.'
    const packageType = data.packageType || 'fixed'
    const isDomesticPackage = String(packageType || '').toLowerCase().includes('domestic')
    const travelDocumentLabel = isDomesticPackage ? 'Valid ID' : 'Passport'
    const travelDocumentShortLabel = isDomesticPackage ? 'valid ID' : 'passport'
    const images = data.images || []
    const requiresVisa = Boolean(
        data.visaRequired
    )

    const startDate = data?.travelDate?.startDate ? dayjs(data.travelDate.startDate).format('MMMM D, YYYY') : 'N/A'
    const endDate = data?.travelDate?.endDate ? dayjs(data.travelDate.endDate).format('MMMM D, YYYY') : 'N/A'

    //INCLUSIONS, EXCLUSIONS AND ITINERARY
    const inclusions = data.inclusions || []
    const exclusions = data.exclusions || []
    const itinerary = data.itinerary || {}
    const itineraryImagesByDay = data.packageItineraryImages || {}

    const itineraryEntries = (() => {
        if (Array.isArray(itinerary)) {
            return itinerary.map((items, index) => ({
                key: `day-${index + 1}`,
                label: `Day ${index + 1}`,
                images: itineraryImagesByDay[`day${index + 1}`] || [],
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
                images: itineraryImagesByDay[dayKey] || [],
                items: Array.isArray(itinerary[dayKey])
                    ? itinerary[dayKey]
                    : itinerary[dayKey]
                        ? [String(itinerary[dayKey])]
                        : []
            }))
    })()


    //TRAVELERS COUNTER MAX LIMITS
    const maxAdults = data.maxAdults || 20
    const maxChildren = data.maxChildren || 10
    const maxInfants = data.maxInfants || 10

    const uploadTravelerCount = selectedSoloGrouped === 'solo'
        ? 1
        : travelersTotal


    //ROOM OPTIONS BASED ON BOOKING TYPE AND TRAVELER COUNT
    const groupRoomOptions = [
        { value: 'TWIN', label: 'TWIN' },
        { value: 'DOUBLE', label: 'DOUBLE' },
        { value: 'TRIPLE', label: 'TRIPLE' }
    ]


    //ROOM OPTIONS
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
        if (selectedSoloGrouped === 'solo') {
            return ['Adult']
        }

        const labels = []
        labels.push(...Array(travelersCount.adult).fill('Adult'))
        labels.push(...Array(travelersCount.child).fill('Child'))
        labels.push(...Array(travelersCount.infant).fill('Infant'))
        return labels
    })()


    //STATE FOR UPLOADED FILES AND PREVIEWS
    const [fileLists, setFileLists] = useState(
        Array.from({ length: travelers.length || 1 }, () => [])
    );
    const [previews, setPreviews] = useState(
        Array.from({ length: travelers.length || 1 }, () => null)
    );
    const [photoFileLists, setPhotoFileLists] = useState(
        Array.from({ length: travelers.length || 1 }, () => [])
    );
    const [photoPreviews, setPhotoPreviews] = useState(
        Array.from({ length: travelers.length || 1 }, () => null)
    );
    const [visaSelections, setVisaSelections] = useState(
        Array.from({ length: travelers.length || 1 }, () => null)
    )
    const [visaFileLists, setVisaFileLists] = useState(
        Array.from({ length: travelers.length || 1 }, () => [])
    )
    const [visaPreviews, setVisaPreviews] = useState(
        Array.from({ length: travelers.length || 1 }, () => null)
    )

    const passportFileInputs = useRef([]);
    const photoFileInputs = useRef([]);


    //STATE FOR CURRENT STEP AND PDF GENERATION--------------------------------------
    const [currentStep, setCurrentStep] = useState(0);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


    //UPDATE BOOKING TYPE IN CONTEXT WHEN SOLO/GROUP SELECTION CHANGES---------------
    useEffect(() => {
        setBookingData(prev => ({
            ...prev,
            bookingType: selectedSoloGrouped === 'solo' ? 'Solo Booking' : selectedSoloGrouped === 'group' ? 'Group Booking' : null
        }));
    }, [selectedSoloGrouped]);


    //ADJUST TRAVELERS ARRAY IN FORM BASED ON UPLOAD COUNT--------------------------------
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
        setBookingData(prev => ({ ...prev, travelers: nextTravelers }))
    }, [form, uploadTravelerCount, setBookingData])

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


    //IF SOLO BOOKING, SET ALL TRAVELERS TO SINGLE ROOM--------------------------------
    useEffect(() => {
        if (bookingType !== 'Solo Booking') return
        const travelers = form.getFieldValue('travelers') || []
        if (!travelers.length) return

        const nextTravelers = travelers.map((traveler) => ({
            ...traveler,
            roomType: 'SINGLE'
        }))
        form.setFieldsValue({ travelers: nextTravelers })
        setBookingData(prev => ({ ...prev, travelers: nextTravelers }))
    }, [bookingType, form, setBookingData])


    //IF GROUP BOOKING, ENSURE NO TRAVELER IS SET TO SINGLE ROOM--------------------------------
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
        setBookingData(prev => ({ ...prev, travelers: nextTravelers }))
    }, [bookingType, form, setBookingData])


    //IF CHILD/INFANT TRAVELER, FORCE ROOM TYPE TO N/A--------------------------------
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
        setBookingData(prev => ({ ...prev, travelers: nextTravelers }))
    }, [form, travelerTypeLabels, bookingType, setBookingData])


    //GO TO NEXT PAGE OF REGISTRATION - show verification modal first
    const nextConfirmed = async () => {
        try {
            await form.validateFields();

            if (currentStep === 0) {
                const missingUploads = fileLists.some(list => !list || list.length === 0);
                const missingPhotos = photoFileLists.some(list => !list || list.length === 0);

                if (missingPhotos) {
                    notification.error({ message: 'Please upload 2x2 photo for all travelers.', placement: 'topRight' });
                    return;
                }

                if (missingUploads) {
                    notification.error({ message: `Please upload ${travelDocumentShortLabel} for all travelers.`, placement: 'topRight' });
                    return;
                }
            }

            let currentFormValues = form.getFieldsValue();
            const currentTravelers = form.getFieldValue('travelers') || []
            const fallbackTravelers = bookingData?.travelers || []
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

            let photoFilesFormatted = bookingData?.photoFiles || [];
            let passportFilesFormatted = bookingData?.passportFiles || [];

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

            setBookingData(prev => ({
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
            notification.error({ message: 'Please complete all required fields before proceeding. Check the console for details.', placement: 'topRight' });
        }
    };

    const next = async () => {
        if (currentStep === 0) {
            setIsVerifyModalOpen(true);
            return;
        }

        await nextConfirmed();
    };


    //GO TO PREVIOUS PAGE OF REGISTRATION--------------------------------
    const prev = () => setCurrentStep(currentStep - 1);


    //VALIDATE UPLOADED FILES--------------------------------
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


    //FINAL SUBMISSION OF REGISTRATION--------------------------------
    const handleFinalSubmit = async () => {
        setIsProceedModalOpen(false);

        try {
            await form.validateFields();
            const finalFormValues = form.getFieldsValue();
            const fallbackTravelers = bookingData?.travelers || []
            const finalTravelers = Array.isArray(finalFormValues.travelers) && finalFormValues.travelers.length
                ? finalFormValues.travelers
                : fallbackTravelers
            const finalPassportFiles = bookingData?.passportFiles || []
            const finalPhotoFiles = bookingData?.photoFiles || []
            const travelersWithDocuments = finalTravelers.map((traveler, index) => ({
                ...traveler,
                passportFile: traveler?.passportFile || finalPassportFiles[index] || null,
                photoFile: traveler?.photoFile || finalPhotoFiles[index] || null
            }))

            setBookingData(prev => ({
                ...prev,
                ...finalFormValues,
                travelers: travelersWithDocuments,
                passportFiles: finalPassportFiles,
                photoFiles: finalPhotoFiles,
                status: 'pending_payment',
                submittedAt: new Date().toISOString()
            }));

            const previousStep = currentStep;

            setCurrentStep(previousStep);
            setIsGeneratingPdf(false);
            notification.success({ message: 'Registration details saved. Proceeding to payment...', placement: 'topRight' });
            navigate('/booking-payment');
        } catch (error) {
            setIsGeneratingPdf(false);
            console.error(error);
            notification.error({ message: 'An error occurred during submission.', placement: 'topRight' });
        }
    };


    //HANDLE FORM VALUE CHANGES--------------------------------
    const handleValuesChange = (changedValues, allValues) => {
        if (changedValues.travelers) {
            setBookingData(prev => ({
                ...prev,
                travelers: allValues.travelers
            }));
        }
    };


    //HANDLE FILE UPLOAD CHANGES--------------------------------
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


    //HANDLE 2BY2 PHOTO UPLOAD CHANGES--------------------------------
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


    //HANDLE RESET OF UPLOADED FILES--------------------------------
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

    // Reset only passport upload for a traveler
    const handleResetPassport = (index) => {
        const newFileLists = [...fileLists];
        newFileLists[index] = [];
        setFileLists(newFileLists);

        const newPreviews = [...previews];
        newPreviews[index] = null;
        setPreviews(newPreviews);
    };

    // Reset only 2x2 photo upload for a traveler
    const handleResetPhoto = (index) => {
        const newPhotoFileLists = [...photoFileLists];
        newPhotoFileLists[index] = [];
        setPhotoFileLists(newPhotoFileLists);

        const newPhotoPreviews = [...photoPreviews];
        newPhotoPreviews[index] = null;
        setPhotoPreviews(newPhotoPreviews);
    };


    //UPDATE TRAVELER FIELD IN FORM AND CONTEXT--------------------------------
    const updateTravelerField = (index, field, value, extras = {}) => {
        const travelers = form.getFieldValue('travelers') || []
        const nextTravelers = travelers.map((traveler, travelerIndex) =>
            travelerIndex === index
                ? { ...traveler, [field]: value, ...extras }
                : traveler
        )
        form.setFieldsValue({ travelers: nextTravelers })
        setBookingData(prev => ({ ...prev, travelers: nextTravelers }))
    }


    //CLEAN UP OBJECT URLS TO PREVENT MEMORY LEAKS--------------------------------
    useEffect(() => {
        return () => {
            [...previews, ...photoPreviews, ...visaPreviews].forEach(url => {
                if (url) URL.revokeObjectURL(url);
            });
        };
    }, [previews, photoPreviews, visaPreviews]);


    //FUNCTIONS TO INCREASE AND DECREASE TRAVELER COUNTS WITHIN MAX LIMITS--------------------------------
    const increaseAdult = () => setCounts(prev => ({ ...prev, adult: Math.min(prev.adult + 1, maxAdults) }));
    const decreaseAdult = () => setCounts(prev => ({ ...prev, adult: Math.max(2, prev.adult - 1) }));
    const increaseChild = () => setCounts(prev => ({ ...prev, child: Math.min(prev.child + 1, maxChildren) }));
    const decreaseChild = () => setCounts(prev => ({ ...prev, child: Math.max(0, prev.child - 1) }));
    const increaseInfant = () => setCounts(prev => ({ ...prev, infant: Math.min(prev.infant + 1, maxInfants) }));
    const decreaseInfant = () => setCounts(prev => ({ ...prev, infant: Math.max(0, prev.infant - 1) }));

    if (!hasBookingData) {
        return null;
    }

    return (
        <ConfigProvider
            theme={{
                token: { colorPrimary: '#305797' }
            }}
        >
            {isGeneratingPdf && (
                <div className="booking-loading-overlay">
                    <Spin description="Preparing your PDF..." size="large" />
                </div>
            )}
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
            <div className='bookingprocess-container'>
                <Button
                    className='booking-back-button'
                    type='primary'
                    onClick={() => {
                        setIsGoBackModalOpen(true);
                    }}
                    style={{ display: 'flex', alignItems: 'center', marginLeft: 40 }}
                >
                    <ArrowLeftOutlined />
                    Back
                </Button>


                {/* BOOKING SUMMARY SECTION */}
                <div className="booking-summary-container booking-section">
                    <div className="booking-summary-wrapper">
                        <div className="booking-summary-hero">
                            <div className="booking-summary-hero-image-wrap">
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
                                            {selectedSoloGrouped === 'solo' ? 'Solo Booking' : 'Group Booking'}
                                        </span>
                                    </div>

                                    <div className="booking-summary-row">
                                        <span className="booking-summary-label">Travel Date</span>
                                        <span className="booking-summary-value">
                                            {`${startDate} - ${endDate}` || 'Not set'}
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
                            </div>

                            <div className="booking-summary-card price-highlight-card">
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
                                {discountPercent > 0 && (
                                    <>
                                        <div className="booking-summary-row">
                                            <span className="booking-summary-label">Discount</span>
                                            <span className="booking-summary-value">
                                                {discountPercent}%
                                            </span>
                                        </div>
                                        <div className="booking-summary-row">
                                            <span className="booking-summary-label">Original total</span>
                                            <span
                                                className="booking-summary-value"
                                                style={{ textDecoration: 'line-through', color: '#9aa0a6' }}
                                            >
                                                ₱{(selectedSoloGrouped === 'solo'
                                                    ? baseSoloDisplayRate
                                                    : originalTotalPrice
                                                ).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="booking-summary-row">
                                            <span className="booking-summary-label">Discounted total</span>
                                            <span className="booking-summary-value">
                                                ₱{(selectedSoloGrouped === 'solo'
                                                    ? discountedSoloDisplayRate
                                                    : totalPrice
                                                ).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </>
                                )}
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
                                    *All inclusions fees for this package are already factored in the total price, execpt for Visas and other additionals. For solo booking, rate has already been applied in the total price.
                                </div>

                                <div className='booking-summary-package-type-card' >
                                    <span style={{ fontSize: '13px' }}>Package Type:</span><br />
                                    <strong style={{ color: '#305797' }}>{packageType?.toUpperCase()}</strong>
                                </div>
                            </div>
                        </div>
                    </div>



                    <div className="solo-group-content" style={{ marginTop: 40 }}>

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


                        </div>
                        <div className="solo-group-cards">
                            <button
                                type="button"
                                className={`solo-group-card${selectedSoloGrouped === 'solo' ? ' is-selected' : ''}`}
                                onClick={() => setSelectedSoloGrouped('solo')}
                            >
                                <div className="solo-group-image solo" />
                                <h3>Single Supplement / Solo Booking</h3>
                                <p className="booking-summary-overview-text">Book for yourself with a single traveler setup.</p>
                                <p style={{ fontStyle: "italic", color: "#e72323", fontWeight: "500", fontSize: "14px" }}>Note: A single supplement fee may apply which can be more than the usual rate. The per pax rate only apply to group with minimum of 2 travelers.</p>
                            </button>

                            <button
                                type="button"
                                className={`solo-group-card${selectedSoloGrouped === 'group' ? ' is-selected' : ''} ${isGroupDisabled ? ' is-disabled' : ''}`}
                                onClick={() => {
                                    if (isGroupDisabled) return
                                    setSelectedSoloGrouped('group')
                                }}
                                disabled={isGroupDisabled}
                            >
                                <div className="solo-group-image group" />
                                <h3>Grouped Booking</h3>
                                <p className="booking-summary-overview-text">Plan a trip for a group with shared activities.</p>
                                <p style={{ fontStyle: "italic", color: "#e72323", fontWeight: "500", fontSize: "14px" }}>Note: Group booking should have a minimum of 2 travelers.</p>
                            </button>
                        </div>
                    </div>



                    {/* TRAVELER COUNTER */}
                    {selectedSoloGrouped === 'group' && (

                        <div className="travelers-content" style={{ marginTop: 40 }}>
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
                                        <button type="button" onClick={increaseAdult} disabled={isTravelerLimitReached}>+</button>
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
                                        <button type="button" onClick={increaseChild} disabled={isTravelerLimitReached}>+</button>
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
                                        <button type="button" onClick={increaseInfant} disabled={isTravelerLimitReached}>+</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    )}

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
                                                    {day.images.slice(0, 3).filter(Boolean).map((src, index) => (
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
                                                <ul className='itinerary-items'>
                                                    {day.items.map((item, index) => (
                                                        <li key={`${day.key}-${index}`}>
                                                            {typeof item === 'string' ? (
                                                                item
                                                            ) : (
                                                                <>
                                                                    <div style={{ marginTop: 3 }}>{item.activity}</div>

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
                                        </details>
                                    ))}
                                </div>
                            ) : (
                                <p className='itinerary-empty'>No itinerary details available.</p>
                            )}
                        </div>

                        <div className='inclusions-exclusions-card'>
                            <div className='card-title'>
                                <span className='card-pill'>Package</span>
                                <h3>Inclusions, Exclusions, Requirements and Policies</h3>
                                <p className='card-subtitle'>Know what is covered and what is not.</p>
                            </div>

                            <div className='inclusions-exclusions-grid'>
                                <div className='inclusions-card'>
                                    <h4>Inclusions</h4>
                                    {inclusions.length ? (
                                        <ul className='inclusions-list'>
                                            {inclusions.map((item, index) => (
                                                <li key={`inc-${index}`}> <div style={{ marginTop: 3 }}>{item}</div></li>
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
                                                <li key={`exc-${index}`}> <div style={{ marginTop: 3 }}>{item}</div></li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className='itinerary-empty'>No exclusions listed.</p>
                                    )}
                                </div>
                            </div>

                            <div className='exclusions-card' style={{ marginTop: '20px' }}>
                                <h2 className='card-title-secondary'>Visa Requirement</h2>
                                <p className='booking-section-subtitle'>
                                    {requiresVisa
                                        ? 'Please be informed that this package requires a visa. Please ensure you have a valid visa before travel.'
                                        : 'This package does not require a visa.'}
                                </p>
                            </div>

                            <div className='exclusions-card' style={{ marginTop: '20px' }}>
                                <h2 className='card-title-secondary'>Cancellation Policy</h2>
                                <p className='booking-section-subtitle'>
                                    Please be informed that cancellation request with medical reasons are only accepted and refundable with valid medical certificate.
                                    Cancellation request without medical reasons are non-refundable.
                                    For any cancellation request, please reach out to us through the Contact Us section on our Home page.
                                </p>
                            </div>
                        </div>
                    </div>


                    {/* UPLOAD SECTION */}
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
                                                    style={{ height: 40 }}
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
                                                    style={{ height: 40 }}
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
                                                {(() => {
                                                    const travelerType = travelerTypeLabels[index] || 'Adult'
                                                    const isMinorTraveler = isMinorTravelerType(travelerType)
                                                    return (
                                                        <Select
                                                            style={{ height: 40 }}
                                                            size="small"
                                                            placeholder="Room type"
                                                            value={isMinorTraveler ? 'N/A' : form.getFieldValue(['travelers', index, 'roomType'])}
                                                            onChange={(value) => updateTravelerField(index, 'roomType', value)}
                                                            options={isMinorTraveler ? [{ value: 'N/A', label: 'N/A' }] : roomOptions}
                                                            disabled={bookingType === 'Solo Booking' || isMinorTraveler}
                                                        />
                                                    )
                                                })()}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <label className='upload-passport-label'>BIRTHDATE</label>
                                                <DatePicker
                                                    showToday={false}
                                                    style={{ height: 40 }}
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
                                                        style={{ height: 40 }}
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
                                    {requiresVisa && !isDomesticPackage && (
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

                        <div style={{ marginTop: 10 }}>
                            <strong >Note for Room Type:</strong>
                            <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
                                <li>TWIN and DOUBLE rooms require two travelers to be listed</li>
                                <li>TRIPLE rooms require three travelers to be listed</li>
                                <li>If the rooms are not properly set, the employee will be the one assigning the rooms</li>
                                <li>In the Passenger List below, those travelers who are assign in "TWIN 1", "TWIN 2" and so on are considered "Roommates"</li>
                                <li>Child and Infant do not have a assigned room type or bed, if you want your child to have a bed, please add number for "Adult" rather than "Child"</li>
                            </ul>
                        </div>

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



                    <div className="booking-form-stepper-container" style={{ marginTop: 40 }}>
                        <div className="booking-section-header" style={{ marginBottom: 30 }}>
                            <h2 className="upload-passport-title booking-section-title" style={{ textAlign: "left" }}>Booking Registration</h2>
                            <p className="upload-passport-text booking-section-subtitle" style={{ textAlign: "left" }}>
                                Please upload a clear image of your {travelDocumentShortLabel} for each traveler.
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
                                style={{
                                    position: isGeneratingPdf ? "absolute" : "relative",
                                    left: isGeneratingPdf ? "-9999px" : "0"
                                }}
                            >
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
            </div>

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
                            clearBookingData()
                            window.history.go(-2)
                        }}
                    >
                        Go Back
                    </Button>
                </div>
            </Modal>



        </ConfigProvider>
    )
}