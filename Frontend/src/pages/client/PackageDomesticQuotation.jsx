import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Input, InputNumber, Slider, Button, message, Select, ConfigProvider, DatePicker, Spin, TimePicker } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import '../../style/components/modals/packagequotationmodal.css'
import '../../style/components/modals/modaldesign.css'
import axiosInstance from '../../config/axiosConfig'


const buildItineraryLabels = (itinerary, days) => {
    if (Array.isArray(itinerary) && itinerary.length) {
        return itinerary.map((label, index) => label || `Day ${index + 1}`)
    }

    const safeDays = Number.isFinite(days) && days > 0 ? days : 1
    return Array.from({ length: safeDays }, (_, index) => `Day ${index + 1}`)
}

export default function PackageDomesticQuotation() {

    const navigate = useNavigate()
    const location = useLocation()
    const packageId = location.state?.packageId
    const currentYear = dayjs().year();
    const today = dayjs();
    dayjs.extend(isSameOrBefore);


    const [packageData, setPackageData] = useState(null)
    const [loading, setLoading] = useState(true)


    useEffect(() => {
        if (!packageId) {
            message.error('No package selected for quotation.')
            return
        }

        try {
            setLoading(true)
            axiosInstance.get(`/package/get-package/${packageId}`)
                .then((response) => {
                    setPackageData(response.data)
                })
                .catch((error) => {
                    console.error('Failed to fetch package data:', error)
                    message.error('Failed to load package details. Please try again later.')
                })
        }
        catch (error) {
            console.error('An unexpected error occurred while fetching package data:', error)
            message.error('An unexpected error occurred. Please try again later.')
        } finally {
            setLoading(false)
        }
    }, [packageId])

    const { hotels, airlines, fixedItinerary, days, basePrice, inclusions, exclusions, images } = useMemo(() => ({
        hotels: packageData?.packageHotels || [],
        airlines: packageData?.packageAirlines || [],
        fixedItinerary: packageData?.packageItineraries || [],
        days: packageData?.packageDuration || 0,
        basePrice: Number(packageData?.packagePricePerPax) || 0,
        inclusions: packageData?.packageInclusions || [],
        exclusions: packageData?.packageExclusions || [],
        images: packageData?.images || packageData?.packageImages || []
    }), [packageData]);

    const packageName = packageData?.packageName || 'the selected package'
    const packageType = packageData?.packageType || 'domestic'
    const packageDescription = packageData?.packageDescription || 'No description available for this package.'

    const itineraryLabels = useMemo(
        () => buildItineraryLabels(fixedItinerary, days),
        [fixedItinerary, days]
    )

    const fixedItineraryEntries = useMemo(() => {
        if (!fixedItinerary || typeof fixedItinerary !== 'object') return []
        return Object.keys(fixedItinerary)
            .sort((a, b) => Number(a.replace('day', '')) - Number(b.replace('day', '')))
            .map((dayKey) => ({
                label: dayKey.replace('day', 'Day '),
                items: fixedItinerary[dayKey] || []
            }))
    }, [fixedItinerary])

    const maxBudget = Math.max(120000, Number(basePrice) || 0)
    const minBudget = Number(basePrice) || 0

    const [error, setError] = useState({})
    const [isBookingSuccessOpen, setIsBookingSuccessOpen] = useState(false)

    const [packageCategory, setPackageCategory] = useState('All in Package')
    const [travelers, setTravelers] = useState(1)
    const [preferredAirlines, setPreferredAirlines] = useState('')
    const [preferredHotels, setPreferredHotels] = useState('')
    const [prefferedDate, setPrefferedDate] = useState(null)
    const [budgetRange, setBudgetRange] = useState([minBudget, maxBudget])
    const [itineraryNotes, setItineraryNotes] = useState(
        itineraryLabels.map(() => '')
    )
    const [additionalComments, setAdditionalComments] = useState('')

    const [flightAirline, setFlightAirline] = useState('');
    const [flightDate, setFlightDate] = useState('');
    const [flightTime, setFlightTime] = useState('');

    useEffect(() => {
        if (packageData) {
            setBudgetRange([basePrice, 60000]);
            setItineraryNotes(itineraryLabels.map(() => ''));
        }
    }, [packageData, basePrice, maxBudget, itineraryLabels]);

    useEffect(() => {
        setTravelers(1);
        setPreferredAirlines('');
        setPreferredHotels('');
        setPrefferedDate(null);
        setBudgetRange([minBudget, maxBudget]);
        setItineraryNotes(itineraryLabels.map(() => ''));
        setAdditionalComments('');
        setFlightAirline('');
        setFlightDate('');
        setFlightTime('');
        setError({});
    }, [packageCategory, minBudget, maxBudget, itineraryLabels]);


    const onCancelModal = () => {
        setIsBookingSuccessOpen(false)
    }

    //submit quotation request
    const handleSubmit = () => {
        const missingItineraryNote = itineraryNotes.some((note) => !note.trim())
        const newErrors = {};

        if (!Array.isArray(budgetRange) || budgetRange.length !== 2 || budgetRange[0] === budgetRange[1]) {
            newErrors.budgetRange = 'Please set your budget range.';
        }

        if (packageCategory === 'Land Arrangement') {
            if (!flightAirline.trim()) newErrors.flightAirline = 'Please provide your airline.';
            if (!flightDate) newErrors.flightDate = 'Please select flight date.';
            if (!flightTime) newErrors.flightTime = 'Please select flight time.';
        }

        if (!travelers || travelers < 1) {
            newErrors.travelers = 'Please enter the number of travelers'
        }
        if (packageCategory !== 'Land Arrangement') {
            if (!preferredAirlines.trim()) newErrors.preferredAirlines = 'Please provide your preferred airlines';
        }
        if (!preferredHotels.trim()) {
            newErrors.preferredHotels = 'Please provide your preferred hotels'
        }
        if (!prefferedDate) {
            newErrors.prefferedDate = 'Please select your preferred date'
        }
        if (!Array.isArray(budgetRange) || budgetRange.length !== 2) {
            newErrors.budgetRange = 'Please set your budget range.'
        }
        if (missingItineraryNote) {
            newErrors.itineraryNotes = 'Please fill out all itinerary notes.'
        }

        let flightDetails = null;

        if (packageCategory === 'Land Arrangement') {
            flightDetails = {
                flightAirline: flightAirline.trim(),
                flightDate,
                flightTime
            }
        } else {
            flightDetails = {
                flightAirline: "",
                flightDate: "",
                flightTime: ""
            }
        }

        setError(newErrors)
        if (Object.keys(newErrors).length > 0) return //converts the keys of a key value pair in the error state, then check if its empty, if empty then no more errors 

        try {
            axiosInstance.post('/quotation/create-quotation', {
                packageId: packageId,
                quotationDetails: {
                    travelers,
                    preferredAirlines,
                    preferredHotels,
                    budgetRange,
                    itineraryNotes,
                    additionalComments,
                    flightDetails,
                    packageCategory
                }
            })

            message.success('Quotation request submitted successfully!')
            setIsBookingSuccessOpen(true)
            setTravelers(1)
            setPreferredAirlines('')
            setPreferredHotels('')
            setPrefferedDate(null)
            setBudgetRange([minBudget, maxBudget])
            setItineraryNotes(itineraryLabels.map(() => ''))
            setAdditionalComments('')
            setFlightAirline('')
            setFlightDate('')
            setFlightTime('')
            setError({})
        } catch (error) {
            message.error('Failed to submit quotation request. Please try again later.')
            return
        }

    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div>
                <Spin spinning={loading} description="Loading package details..." size="large">
                    <div className="quotation-container">
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate(-1)}
                            className="back-button"
                        >
                            Back
                        </Button>

                        <div className="quotation-header quotation-section">
                            <div className="header-top-row">
                                <div className="header-text">
                                    <h2 className="quotation-section-title">Package Quotation</h2>
                                    <p className="quotation-section-subtitle">Kindly input your preferrences and requests so that we can tailor your customized package.</p>
                                </div>
                            </div>
                        </div>

                        <div className="package-info-display quotation-section">
                            {images.length ? (
                                <div className="package-image-grid">
                                    {images.map((img, index) => (
                                        <div key={`pkg-img-${index}`} className="package-image-card">
                                            <img src={img} alt={`${packageName} ${index + 1}`} />
                                        </div>
                                    ))}
                                </div>
                            ) : null}

                            <div className="info-main">
                                <span className="info-tag">{packageType.toUpperCase()}</span>
                                <h3>{packageName}</h3>
                            </div>
                            <p className="info-description">{packageDescription}</p>

                            <div className="package-info-lists">
                                <div className="info-list">
                                    <h4 className="info-list-title">Inclusions</h4>
                                    {inclusions.length ? (
                                        <ul>
                                            {inclusions.map((item, index) => (
                                                <li key={`inc-${index}`}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="info-list-empty">No inclusions listed.</p>
                                    )}
                                </div>
                                <div className="info-list">
                                    <h4 className="info-list-title">Exclusions</h4>
                                    {exclusions.length ? (
                                        <ul>
                                            {exclusions.map((item, index) => (
                                                <li key={`exc-${index}`}>{item}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="info-list-empty">No exclusions listed.</p>
                                    )}
                                </div>
                            </div>
                        </div>


                        <div className="quotation-top-grid">
                            <div className="quotation-left">
                                <div className="package-type-selector quotation-section">
                                    <label className="section-label">Select Arrangement Type</label>
                                    <div className="selection-cards">
                                        <div
                                            className={`selection-card ${packageCategory === 'All in Package' ? 'active' : ''}`}
                                            onClick={() => setPackageCategory('All in Package')}
                                        >
                                            <div className="card-content">
                                                <span className="card-title">All-in Package</span>
                                                <p className="card-desc">This selection includes flights, hotel, and tours.</p>
                                            </div>
                                        </div>

                                        <div
                                            className={`selection-card ${packageCategory === 'Land Arrangement' ? 'active' : ''}`}
                                            onClick={() => setPackageCategory('Land Arrangement')}
                                        >
                                            <div className="card-content">
                                                <span className="card-title">Land Arrangement</span>
                                                <p className="card-desc">This selection excludes flights. Best if you have your own tickets.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="quotation-right">
                                <div className="quotation-section">
                                    <div className="quotation-grid">
                                        <div className="quotation-field">
                                            <label htmlFor="quotation-travelers">Number of Travelers <span style={{ color: 'red' }}>*</span></label>
                                            <InputNumber
                                                maxLength={2}
                                                id="quotation-travelers"
                                                min={1}
                                                value={travelers}
                                                onChange={(value) => setTravelers(value || 1)}
                                                className={`quotation-input ${error.travelers ? 'input-error' : ''}`}
                                                required
                                                onKeyDown={(e) => {
                                                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                                        e.preventDefault()
                                                    }
                                                }}
                                            />
                                            <p className='package-quotation-error'>{error.travelers}</p>
                                            <p className='quotation-airline-note'>Note: If you are a solo traveler, an additional single supplement rate may apply.</p>
                                        </div>

                                        {packageCategory !== 'Land Arrangement' && (
                                            <div className="quotation-field">
                                                <label htmlFor="quotation-airlines">Preferred Airlines <span style={{ color: 'red' }}>*</span></label>
                                                <Select
                                                    id="quotation-airlines"
                                                    placeholder="Select preferred airline"
                                                    value={preferredAirlines || undefined}
                                                    onChange={(value) => setPreferredAirlines(value)}
                                                    className={`quotation-input ${error.preferredAirlines ? 'input-error' : ''}`}
                                                    options={airlines?.map((airline) => ({
                                                        label: airline.name,
                                                        value: airline.name
                                                    }))}
                                                />
                                                <p className='package-quotation-error'>{error.preferredAirlines}</p>
                                                <p className='quotation-airline-note'>Note: Airfare may increase from the usual inclusion in the package, if you choose an airline other than the fixed one.</p>
                                            </div>
                                        )}


                                        <div className="quotation-field">
                                            <label htmlFor="quotation-hotels">Preferred Hotels <span style={{ color: 'red' }}>*</span></label>
                                            <Select
                                                id="quotation-hotels"
                                                placeholder="Select preferred hotel"
                                                value={preferredHotels || undefined}
                                                onChange={(value) => setPreferredHotels(value)}
                                                className={`quotation-input ${error.preferredHotels ? 'input-error' : ''}`}
                                                options={[
                                                    {
                                                        label: '5 Star Hotels',
                                                        options: hotels.filter(h => h.stars === 5).map(h => ({ label: h.name, value: h.name }))
                                                    },
                                                    {
                                                        label: '4 Star Hotels',
                                                        options: hotels.filter(h => h.stars === 4).map(h => ({ label: h.name, value: h.name }))
                                                    },
                                                    {
                                                        label: '3 Star Hotels',
                                                        options: hotels.filter(h => h.stars === 3).map(h => ({ label: h.name, value: h.name }))
                                                    }
                                                ].filter(group => group.options.length > 0)}
                                            />
                                            <p className='package-quotation-error'>{error.preferredHotels}</p>
                                            <p className='quotation-hotel-note'>Note: Hotel rates may increase from the usual inclusion in the package, if you choose a hotel other than the fixed one. Rates may also increase or decrease depending on the stars of the chosen hotel.</p>
                                        </div>

                                        <div className="quotation-field">
                                            <label htmlFor="quotation-prefferedDate">Preferred Date <span style={{ color: 'red' }}>*</span></label>
                                            <DatePicker
                                                id="quotation-prefferedDate"
                                                placeholder="Select preferred date"
                                                value={prefferedDate || undefined}
                                                onChange={(value) => setPrefferedDate(value)}
                                                className={`quotation-input ${error.prefferedDate ? 'input-error' : ''}`}
                                                disabledDate={(current) => {
                                                    if (!current) return false;
                                                    const date = dayjs(current);
                                                    return date.isSameOrBefore(today, 'day') || date.year() !== currentYear;
                                                }}
                                            />
                                            <p className='package-quotation-error'>{error.prefferedDate}</p>
                                        </div>

                                        <div className="quotation-field quotation-budget">
                                            <label>Budget Range (per pax) <span style={{ color: 'red' }}>*</span></label>
                                            <div className="quotation-budget-values">
                                                <span>₱ {budgetRange[0].toLocaleString()}</span>
                                                <span>₱ {budgetRange[1].toLocaleString()}</span>
                                            </div>
                                            <Slider
                                                range
                                                min={minBudget}
                                                max={maxBudget}
                                                step={500}
                                                value={budgetRange}
                                                onChange={setBudgetRange}
                                                className={`quotation-slider ${error.budgetRange ? 'input-error' : ''}`}
                                                tooltip={{ formatter: (value) => `₱ ${value}` }}
                                            />
                                            <p className='package-quotation-error'>{error.budgetRange}</p>
                                        </div>

                                        {/* Land Arrangement Flight Details */}
                                        {packageCategory === 'Land Arrangement' && (
                                            <div className="quotation-flight-details quotation-section">
                                                <h3>Flight Details</h3>

                                                <div className="quotation-field">
                                                    <label htmlFor="flight-airline">Airline <span style={{ color: 'red' }}>*</span></label>
                                                    <Input
                                                        id="flight-airline"
                                                        placeholder="Enter airline name"
                                                        value={flightAirline}
                                                        onChange={(e) => setFlightAirline(e.target.value)}
                                                        className={`quotation-input ${error.flightAirline ? 'input-error' : ''}`}
                                                    />
                                                    <p className='package-quotation-error'>{error.flightAirline}</p>
                                                </div>

                                                <div className="quotation-field">
                                                    <label htmlFor="flight-date">Flight Date <span style={{ color: 'red' }}>*</span></label>
                                                    <DatePicker
                                                        id="flight-date"
                                                        placeholder="Select flight date"
                                                        value={flightDate ? dayjs(flightDate) : null}
                                                        onChange={(value) => setFlightDate(value)}
                                                        className={`quotation-input ${error.flightDate ? 'input-error' : ''}`}
                                                        disabledDate={(current) => {
                                                            if (!current) return false;
                                                            const date = dayjs(current);
                                                            return date.isSameOrBefore(today, 'day') || date.year() !== currentYear;
                                                        }}
                                                    />
                                                    <p className='package-quotation-error'>{error.flightDate}</p>
                                                </div>

                                                <div className="quotation-field">
                                                    <label htmlFor="flight-time">Flight Time <span style={{ color: 'red' }}>*</span></label>
                                                    <TimePicker
                                                        id="flight-time"
                                                        placeholder="Select flight time"
                                                        value={flightTime ? dayjs(flightTime, 'hh:mm A') : null}
                                                        onChange={(time) => setFlightTime(time ? time.format('hh:mm A') : '')}
                                                        format="hh:mm A"
                                                        className={`quotation-input ${error.flightTime ? 'input-error' : ''}`}
                                                        showNow={false}
                                                    />
                                                    <p className='package-quotation-error'>{error.flightTime}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="quotation-section">
                            <div className="quotation-itinerary">
                                {fixedItineraryEntries.length ? (
                                    <div className="quotation-fixed-itinerary">
                                        <h3>Fixed Itinerary</h3>
                                        <div className="quotation-fixed-list">
                                            {fixedItineraryEntries.map((entry) => (
                                                <div key={entry.label} className="quotation-fixed-day">
                                                    <h4>{entry.label}</h4>
                                                    <ul>
                                                        {(entry.items || []).map((item, index) => (
                                                            <li key={`${entry.label}-${index}`}>
                                                                <div>{item.activity}</div>

                                                                {item.isOptional && item.optionalActivity && (
                                                                    <div>
                                                                        Optional: {item.optionalActivity}
                                                                        {item.optionalPrice && ` - ₱${item.optionalPrice.toLocaleString()}`}
                                                                    </div>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                <h3>Itinerary Notes</h3>
                                <div className="quotation-itinerary-grid">
                                    {itineraryLabels.map((label, index) => (
                                        <div key={`${label}-${index}`} className="quotation-field">
                                            <label htmlFor={`quotation-itinerary-${index}`}>{label}</label>
                                            <Input.TextArea
                                                maxLength={200}
                                                id={`quotation-itinerary-${index}`}
                                                rows={3}
                                                placeholder={`Notes for ${label.toLowerCase()}. Type "NONE" if no changes`}
                                                value={itineraryNotes[index]}
                                                onChange={(e) => {
                                                    const updated = [...itineraryNotes]
                                                    updated[index] = e.target.value
                                                    setItineraryNotes(updated)
                                                }}
                                                className={`quotation-input ${error.itineraryNotes ? 'input-error' : ''}`}
                                                required
                                            />
                                            <p className='package-quotation-error'>{error.itineraryNotes}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="quotation-section">
                            <div className="quotation-field">
                                <label htmlFor="quotation-comments">Additional Comments</label>
                                <Input.TextArea
                                    maxLength={200}
                                    id="quotation-comments"
                                    rows={4}
                                    placeholder="Anything else we should know?"
                                    value={additionalComments}
                                    onChange={(e) => setAdditionalComments(e.target.value)}
                                    className="quotation-input"
                                />
                            </div>

                            <div className="quotation-actions">
                                <Button type="primary" className="quotation-submit" onClick={handleSubmit}>
                                    Submit Request
                                </Button>
                            </div>
                        </div>
                    </div>



                    <Modal
                        className="modal-design"
                        open={isBookingSuccessOpen}
                        footer={null}
                        onCancel={onCancelModal}
                        style={{ top: 240 }}
                    >
                        <h2 className="modal-design-heading">Quotation Request Submitted</h2>
                        <p className="modal-design-text">Your package quotation request has been submitted successfully. Please wait for your quotation to be generated.</p>
                        <div className="modal-design-actions">
                            <Button className="modal-design-button" onClick={onCancelModal}>
                                OK
                            </Button>
                        </div>
                    </Modal>
                </Spin>
            </div>
        </ConfigProvider>
    )
}
