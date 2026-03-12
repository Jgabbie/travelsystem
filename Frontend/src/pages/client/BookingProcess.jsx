import React, { useEffect, useState } from 'react'
import { Modal, Button, message, Upload, Form, Steps, ConfigProvider } from 'antd'
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { PDFDocument, rgb } from 'pdf-lib';
import dayjs from 'dayjs';
import '../../style/components/modals/bookingsummarymodal.css'
import '../../style/components/modals/travelersmodal.css'
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
    adult: 1,
    child: 0,
    infant: 0,
}

export default function BookingProcess() {
    const [form] = Form.useForm();
    const { bookingData } = useBooking();
    const navigate = useNavigate();

    const [selectedSoloGrouped, setSelectedSoloGrouped] = useState(null)
    const [counts, setCounts] = useState(INITIAL_COUNTS)

    const summary = bookingData || {}
    const data = summary
    const travelers = data.travelers?.length ? data.travelers : ['None selected']
    const hotelOptions = data.hotelOptions?.length ? data.hotelOptions : []
    const airlineOptions = data.airlineOptions?.length ? data.airlineOptions : []
    const travelDate = getDisplayDate(data.travelDate)
    const travelersCount = data.groupType === 'solo'
        ? 1
        : (counts.adult + counts.child + counts.infant)

    const packagePricePerPax = data.packagePricePerPax || 0
    const totalPrice = packagePricePerPax * travelersCount
    const packageName = data.packageName || 'Tour Package'
    const packageType = data.packageType || 'fixed'
    const images = data.images || []

    const [fileLists, setFileLists] = useState(Array(travelers).fill([]));
    const [previews, setPreviews] = useState(Array(travelers).fill(null));
    const [pdfUrl, setPdfUrl] = useState(null);

    const [currentStep, setCurrentStep] = useState(0);

    const next = async () => {
        try {
            // Only validates fields present in the current view
            await form.validateFields();
            setCurrentStep(currentStep + 1);
        } catch (error) {
            message.error("Please complete all required fields before proceeding.");
        }
    };
    const prev = () => setCurrentStep(currentStep - 1);

    const handleValuesChange = (changedValues, allValues) => {
        console.log('Form values changed:', changedValues, allValues);
    };

    const handleChange = () => {
        console.log('File list changed:', fileLists);
    }

    const increaseAdult = () => setCounts(prev => ({ ...prev, adult: prev.adult + 1 }))
    const decreaseAdult = () => setCounts(prev => ({ ...prev, adult: Math.max(1, prev.adult - 1) }))
    const increaseChild = () => setCounts(prev => ({ ...prev, child: prev.child + 1 }))
    const decreaseChild = () => setCounts(prev => ({ ...prev, child: Math.max(0, prev.child - 1) }))
    const increaseInfant = () => setCounts(prev => ({ ...prev, infant: prev.infant + 1 }))
    const decreaseInfant = () => setCounts(prev => ({ ...prev, infant: Math.max(0, prev.infant - 1) }))

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
                {/* Solo/Group Selection */}
                <div className='bookingprocess-sologroup-container'>
                    <div className="solo-group-content">
                        <h1 className='solo-group-heading'>Select Your Package Arrangement</h1>
                        <div className="solo-group-cards">
                            <button
                                type="button"
                                className={`solo-group-card${selectedSoloGrouped === 'solo' ? ' is-selected' : ''}`}
                                onClick={() => setSelectedSoloGrouped('solo')}
                            >
                                <div className="solo-group-image solo" />
                                <h3>Solo Booking</h3>
                                <p>Book for yourself with a single traveler setup.</p>
                            </button>

                            <button
                                type="button"
                                className={`solo-group-card${selectedSoloGrouped === 'group' ? ' is-selected' : ''}`}
                                onClick={() => setSelectedSoloGrouped('group')}
                            >
                                <div className="solo-group-image group" />
                                <h3>Grouped Booking</h3>
                                <p>Plan a trip for a group with shared activities.</p>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Traveler Counters (conditionally rendered) */}
                {selectedSoloGrouped === 'group' && (
                    <div className="travelers-content">
                        <h3 className="travelers-title">Number of Travelers</h3>
                        <div className="travelers-cards">
                            <div className="traveler-card">
                                <h3>Adult</h3>
                                <div className="traveler-counter">
                                    <button type="button" onClick={decreaseAdult}>-</button>
                                    <span>{counts.adult}</span>
                                    <button type="button" onClick={increaseAdult}>+</button>
                                </div>
                            </div>
                            {/* Repeat for Child/Infant as needed */}
                        </div>
                    </div>
                )}

                <h2 className='booking-summary-title'>Booking Summary</h2>
                <div className="booking-summary-wrapper">
                    <div className="booking-summary-images">
                        {images.map((img, index) => (
                            <img key={index} className="booking-summary-image" src={img} alt="tour" />
                        ))}
                    </div>

                    <div className="booking-summary-details">
                        <div className="booking-summary-card">
                            <h2>Booking Details</h2>

                            <div className="booking-summary-row">
                                <span className="booking-summary-label">Tour Package</span>
                                <span className="booking-summary-value">{packageName}</span>
                            </div>

                            <div className="booking-summary-row">
                                <span className="booking-summary-label">Travel Date</span>
                                <span className="booking-summary-value">
                                    {travelDate ? dayjs(travelDate).format('MMMM D, YYYY') : 'Not set'}
                                </span>
                            </div>

                            <div className="booking-summary-row">
                                <span className="booking-summary-label">Total Price</span>
                                <span className="booking-summary-value">
                                    ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className='upload-passport-container'>
                        <h2 className="upload-passport-title">Upload Passport</h2>
                        <div className="upload-passport-wrapper">
                            <p className="upload-passport-text">
                                Please upload a clear image of your passport bio page for each traveler.
                            </p>

                            {Array.from({ length: travelers }).map((_, index) => (
                                <div key={index} className="upload-card">

                                    <div className='upload-passport-left'>
                                        <h4>Traveler {index + 1}</h4>
                                        <Upload
                                            fileList={fileLists[index]}
                                            beforeUpload={() => false}
                                            onChange={handleChange}
                                            accept="image/*,application/pdf"
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
                    </div>
                </div>


                <div className="booking-form-stepper-container">
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

                    <div className="form-content-wrapper">
                        {currentStep === 0 && (
                            <BookingRegistrationTravelers
                                form={form}
                                onValuesChange={handleValuesChange}
                                summary={summary}
                                totalCount={travelersCount}
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
                            <Button type="primary" onClick={() => form.submit()}>
                                Submit Final Booking
                            </Button>
                        )}
                    </div>
                </div>

            </div >
        </ConfigProvider>
    )
}