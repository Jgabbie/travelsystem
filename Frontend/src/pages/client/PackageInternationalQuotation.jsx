import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Input, InputNumber, Slider, Button, message, Select, ConfigProvider } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import '../../style/components/modals/packagequotationmodal.css'
import axiosInstance from '../../config/axiosConfig'


const buildItineraryLabels = (itinerary, days) => {
    if (Array.isArray(itinerary) && itinerary.length) {
        return itinerary.map((label, index) => label || `Day ${index + 1}`)
    }

    const safeDays = Number.isFinite(days) && days > 0 ? days : 1
    return Array.from({ length: safeDays }, (_, index) => `Day ${index + 1}`)
}

export default function PackageInternationalQuotation() {

    const navigate = useNavigate()
    const location = useLocation()
    const packageId = location.state?.packageId

    console.log('Received packageId:', packageId)

    const [packageData, setPackageData] = useState(null)

    useEffect(() => {
        if (!packageId) {
            message.error('No package selected for quotation.')
            return
        }

        try {
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
        }
    }, [packageId])

    const { hotels, airlines, fixedItinerary, days, basePrice, dateRanges } = useMemo(() => ({
        hotels: packageData?.packageHotels || [],
        airlines: packageData?.packageAirlines || [],
        fixedItinerary: packageData?.packageItineraries || [],
        days: packageData?.packageDuration || 0,
        basePrice: Number(packageData?.packagePricePerPax) || 0,
        dateRanges: packageData?.packageSpecificDate || []
    }), [packageData]);

    // const hotels = packageData?.packageHotels || []
    // const airlines = packageData?.packageAirlines || []
    // const fixedItinerary = packageData?.packageItineraries || []
    // const days = packageData?.packageDuration || 0
    // const basePrice = packageData?.packagePricePerPax || 0;
    // const dateRanges = packageData?.packageSpecificDate || []

    const packageName = packageData?.packageName || 'the selected package'
    const packageType = packageData?.packageType || 'international'
    const packageDescription = packageData?.packageDescription || 'No description available for this package.'

    const formatDate = (dateString) => {
        const options = { month: 'short', day: '2-digit', year: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

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

    const [error, setError] = useState({})

    const maxBudget = Math.max(120000, Number(basePrice) || 0)
    const minBudget = Number(basePrice) || 0

    useEffect(() => {
        if (packageData) {
            setBudgetRange([basePrice, maxBudget]);
            setItineraryNotes(itineraryLabels.map(() => ''));
        }
    }, [packageData, basePrice, maxBudget, itineraryLabels]);

    const [isBookingSuccessOpen, setIsBookingSuccessOpen] = useState(false)
    const [packageCategory, setPackageCategory] = useState('All in Package');
    const [travelers, setTravelers] = useState(1)
    const [preferredAirlines, setPreferredAirlines] = useState('')
    const [preferredHotels, setPreferredHotels] = useState('')
    const [preferredDates, setPreferredDates] = useState('')
    const [budgetRange, setBudgetRange] = useState([minBudget, maxBudget])
    const [itineraryNotes, setItineraryNotes] = useState(
        itineraryLabels.map(() => '')
    )
    const [additionalComments, setAdditionalComments] = useState('')

    const handleSubmit = () => {
        const missingItineraryNote = itineraryNotes.some((note) => !note.trim())
        const newErrors = {}

        if (!travelers || travelers < 1) {
            newErrors.travelers = 'Please enter the number of travelers'
        }
        if (!preferredAirlines.trim()) {
            newErrors.preferredAirlines = 'Please provide your preferred airlines'
        }
        if (!preferredHotels.trim()) {
            newErrors.preferredHotels = 'Please provide your preferred hotels'
        }
        if (!preferredDates.trim()) {
            newErrors.preferredDates = 'Please select your preferred travel dates'
        }
        if (!Array.isArray(budgetRange) || budgetRange.length !== 2) {
            newErrors.budgetRange = 'Please set your budget range.'
        }
        if (missingItineraryNote) {
            newErrors.itineraryNotes = 'Please fill out all itinerary notes.'
        }

        setError(newErrors)

        if (Object.keys(newErrors).length > 0) return //converts the keys of a key value pair in the error state, then check if its empty, if empty then no more errors 


        try {
            axiosInstance.post('/quotation/create-quotation', {
                packageId: packageId,
                packageName: packageData.packageName,
                travelDetails: {
                    travelers,
                    preferredAirlines,
                    preferredHotels,
                    budgetRange,
                    itineraryNotes,
                    additionalComments
                }
            })
        } catch (error) {
            console.error('An unexpected error occurred while submitting the quotation request:', error)
            message.error('An unexpected error occurred. Please try again later.')
            return
        }
    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div>
                <div className="quotation-container">
                    <div className="quotation-header">
                        <div className="header-top-row">
                            <div className="header-text">
                                <h2>Package Quotation</h2>
                                <p>Kindly input your preferrences and requests so that we can tailor your customized package.</p>
                            </div>

                            <Button
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate(-1)}
                                className="back-button"
                            >
                                Back
                            </Button>
                        </div>

                    </div>

                    <div className="package-info-display">
                        <div className="info-main">
                            <span className="info-tag">{packageType.toUpperCase()}</span>
                            <h3>{packageName}</h3>
                        </div>
                        <p className="info-description">{packageDescription}</p>
                    </div>

                    <div className="package-type-selector">
                        <label className="section-label">Select Arrangement Type</label>
                        <div className="selection-cards">
                            <div
                                className={`selection-card ${packageCategory === 'All in Package' ? 'active' : ''}`}
                                onClick={() => setPackageCategory('All in Package')}
                            >
                                <div className="card-content">
                                    <span className="card-title">All-in Package</span>
                                    <p className="card-desc">Includes flights, hotel, and tours.</p>
                                </div>
                            </div>

                            <div
                                className={`selection-card ${packageCategory === 'Land Arrangement' ? 'active' : ''}`}
                                onClick={() => setPackageCategory('Land Arrangement')}
                            >
                                <div className="card-content">
                                    <span className="card-title">Land Arrangement</span>
                                    <p className="card-desc">Excludes flights. Best if you have your own tickets.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="quotation-grid">
                        <div className="quotation-field">
                            <label htmlFor="quotation-travelers">Number of Travelers</label>
                            <InputNumber
                                maxLength={2}
                                id="quotation-travelers"
                                min={1}
                                max={50}
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
                        </div>

                        {packageCategory === 'All in Package' && (
                            <div className="quotation-field">
                                <label htmlFor="quotation-airlines">Preferred Airlines</label>
                                <Select
                                    id="quotation-airlines"
                                    disabled={packageType === 'Land Arrangement'}
                                    placeholder={packageType === 'Land Arrangement' ? "Not applicable" : "Select preferred airline"}
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
                            <label htmlFor="quotation-hotels">Preferred Hotels</label>
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
                            <label htmlFor="quotation-dates">Preferred Travel Dates</label>
                            <Select
                                id="quotation-dates"
                                placeholder="Select preferred dates"
                                value={preferredDates || undefined}
                                onChange={(value) => setPreferredDates(value)}
                                className={`quotation-input ${error.preferredDates ? 'input-error' : ''}`}
                                options={dateRanges.map((range, index) => {
                                    const rangeString = `${formatDate(range.startdaterange)} - ${formatDate(range.enddaterange)}`;
                                    return {
                                        label: `${rangeString} (Slots: ${range.slots})`,
                                        value: rangeString
                                    };
                                })}
                            />
                            <p className='package-quotation-error'>{error.preferredDates}</p>
                        </div>

                        <div className="quotation-field quotation-budget">
                            <label>Budget Range (per pax)</label>
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
                    </div>

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
                                                    <li key={`${entry.label}-${index}`}>{item}</li>
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

                        <p className='quotation-itinerary-note'>Note: If you wish to not have any changes in the following Itinerary, kindly type "NONE" in the fields of the Itinerary notes.</p>
                    </div>

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
                        <Button className="quotation-cancel">
                            Cancel
                        </Button>
                        <Button type="primary" className="quotation-submit" onClick={handleSubmit}>
                            Submit Request
                        </Button>
                    </div>
                </div>


                <Modal
                    className="quotation-modal"
                    open={isBookingSuccessOpen}
                    footer={null}
                    onCancel={null}
                >
                    <h2 className="quotation-modal-title">Package Quotation Submitted</h2>
                    <p className="quotation-modal-text">Your package quotation request has been submitted successfully. Please wait for your quotation to be generated.</p>
                    <div className="quotation-modal-actions">
                        <Button className="quotation-modal-button">
                            OK
                        </Button>
                    </div>
                </Modal>
            </div>
        </ConfigProvider>
    )
}
