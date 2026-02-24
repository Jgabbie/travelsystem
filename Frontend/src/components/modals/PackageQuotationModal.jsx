import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Input, InputNumber, Slider, Button, message } from 'antd'
import '../../style/packagequotationmodal.css'
import axiosInstance from '../../config/axiosConfig'


const buildItineraryLabels = (itinerary, days) => {
    if (Array.isArray(itinerary) && itinerary.length) {
        return itinerary.map((label, index) => label || `Day ${index + 1}`)
    }

    const safeDays = Number.isFinite(days) && days > 0 ? days : 1
    return Array.from({ length: safeDays }, (_, index) => `Day ${index + 1}`)
}

export default function PackageQuotationModal({
    open,
    onCancel,
    onSubmit,
    basePrice = 0,
    days = 1,
    itinerary = [],
    fixedItinerary = {}
}) {
    const itineraryLabels = useMemo(
        () => buildItineraryLabels(itinerary, days),
        [itinerary, days]
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

    const maxBudget = Math.max(60000, Number(basePrice) || 0)
    const minBudget = Number(basePrice) || 0

    const [error, setError] = useState({})

    const [isBookingSuccessOpen, setIsBookingSuccessOpen] = useState(false)

    const resetBookingFlow = () => {
        setIsBookingSuccessOpen(false)
        if (onCancel) onCancel()
    }

    const [travelers, setTravelers] = useState(1)
    const [preferredAirlines, setPreferredAirlines] = useState('')
    const [preferredHotels, setPreferredHotels] = useState('')
    const [budgetRange, setBudgetRange] = useState([minBudget, maxBudget])
    const [itineraryNotes, setItineraryNotes] = useState(
        itineraryLabels.map(() => '')
    )
    const [additionalComments, setAdditionalComments] = useState('')

    useEffect(() => {
        if (!open) return
        setTravelers(1)
        setPreferredAirlines('')
        setPreferredHotels('')
        setBudgetRange([minBudget, maxBudget])
        setItineraryNotes(itineraryLabels.map(() => ''))
        setAdditionalComments('')
    }, [open, minBudget, maxBudget, itineraryLabels])

    const handleCancel = () => {
        if (onCancel) onCancel()
    }

    const handleSubmit = () => {
        const missingItineraryNote = itineraryNotes.some((note) => !note.trim())
        const newErrors = {} // store the errors in an object with keys corresponding to the field names

        if (!travelers || travelers < 1) {
            newErrors.travelers = 'Please enter the number of travelers'
        }
        if (!preferredAirlines.trim()) {
            newErrors.preferredAirlines = 'Please provide your preferred airlines'
        }
        if (!preferredHotels.trim()) {
            newErrors.preferredHotels = 'Please provide your preferred hotels'
        }
        if (!Array.isArray(budgetRange) || budgetRange.length !== 2) {
            newErrors.budgetRange = 'Please set your budget range.'
        }
        if (missingItineraryNote) {
            newErrors.itineraryNotes = 'Please fill out all itinerary notes.'
        }

        setError(newErrors)

        if (Object.keys(newErrors).length > 0) return //converts the keys of a key value pair in the error state, then check if its empty, if empty then no more errors 

        if (onSubmit) {
            onSubmit({
                travelers,
                preferredAirlines,
                preferredHotels,
                budgetRange,
                itineraryNotes,
                additionalComments
            })
            setIsBookingSuccessOpen(true)

            // axiosInstance.post('/api/quotation/create-quotation', {
            //     packageId: package._id,
            //     travelDetails: {
            //         travelers,
            //         preferredAirlines,
            //         preferredHotels,
            //         budgetRange,
            //         itineraryNotes,
            //         additionalComments
            //     }
            // })
        }
    }

    return (
        <div>
            <Modal
                open={open}
                onCancel={handleCancel}
                footer={null}
                centered
                className="quotation-modal"
                width={900}
            >
                <div className="quotation-container">
                    <div className="quotation-header">
                        <h2>Package Quotation</h2>
                        <p>Kindly input your preferrences and requests so that we can tailor your customized package.</p>
                    </div>

                    <div className="quotation-grid">
                        <div className="quotation-field">
                            <label htmlFor="quotation-travelers">Number of Travelers</label>
                            <InputNumber
                                maxLength={2}
                                id="quotation-travelers"
                                min={1}
                                value={travelers}
                                onChange={(value) => setTravelers(value || 1)}
                                className={`quotation-input ${error.travelers ? 'input-error' : ''}`}
                                required
                                aria-required="true"
                                onKeyDown={(e) => {
                                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                        e.preventDefault()
                                    }
                                }}
                            />
                            <p className='package-quotation-error'>{error.travelers}</p>
                        </div>

                        <div className="quotation-field">
                            <label htmlFor="quotation-airlines">Preferred Airlines</label>
                            <Input
                                maxLength={40}
                                id="quotation-airlines"
                                placeholder="Provide airline preferences"
                                value={preferredAirlines}
                                onChange={(e) => setPreferredAirlines(e.target.value)}
                                className={`quotation-input ${error.preferredAirlines ? 'input-error' : ''}`}
                                required
                                aria-required="true"
                            />
                            <p className='package-quotation-error'>{error.preferredAirlines}</p>
                        </div>

                        <div className="quotation-field">
                            <label htmlFor="quotation-hotels">Preferred Hotels</label>
                            <Input
                                maxLength={40}
                                id="quotation-hotels"
                                placeholder="Provide hotel preferences"
                                value={preferredHotels}
                                onChange={(e) => setPreferredHotels(e.target.value)}
                                className={`quotation-input ${error.preferredHotels ? 'input-error' : ''}`}
                                required
                                aria-required="true"
                            />
                            <p className='package-quotation-error'>{error.preferredHotels}</p>
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
                                aria-required="true"
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
                                        aria-required="true"
                                    />
                                    <p className='package-quotation-error'>{error.itineraryNotes}</p>
                                </div>
                            ))}
                        </div>
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
                        <Button className="quotation-cancel" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button type="primary" className="quotation-submit" onClick={handleSubmit}>
                            Submit Request
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                className="quotation-modal"
                open={isBookingSuccessOpen}
                footer={null}
                onCancel={resetBookingFlow}
            >
                <h2 className="quotation-modal-title">Package Quotation Submitted</h2>
                <p className="quotation-modal-text">Your package quotation request has been submitted successfully. Please wait for your quotation to be generated.</p>
                <div className="quotation-modal-actions">
                    <Button className="quotation-modal-button" onClick={resetBookingFlow}>
                        OK
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
