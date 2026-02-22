import React from 'react'
import { Modal, Button } from 'antd'
import { CheckCircleFilled } from '@ant-design/icons'
import '../style/bookingsummarymodal.css'

const DEFAULT_SUMMARY = {
    packageName: 'Baguio City Tour',
    travelers: ['1x Child', '3x Adult', '1x Infant', '1x Senior'],
    hotelOptions: ['Plaza Garden Hotel', 'Aura One Hotel', 'Ridgewood Hotel'],
    airlineOptions: ['Cebu Pacific Air', 'Air Aisa', 'Philippine Airlines'],
    addons: ['Flight Meals', 'Optional Tour', 'Easter Weaving Room'],
    travelDate: 'May 18 - 20, 2025',
    imageUrl: ''
}

//get display date
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

export default function BookingSummaryModal({
    open,
    onCancel,
    onProceed,
    summary
}) {
    //get summary data or use default option to test booking
    const data = summary ? { ...DEFAULT_SUMMARY, ...summary } : DEFAULT_SUMMARY
    const travelers = data.travelers?.length ? data.travelers : ['None selected']
    const hotelOptions = data.hotelOptions?.length ? data.hotelOptions : ['None selected']
    const airlineOptions = data.airlineOptions?.length ? data.airlineOptions : ['None selected']
    const addons = data.addons?.length ? data.addons : ['None selected']
    const travelDate = getDisplayDate(data.travelDate)

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            footer={null}
            className="booking-summary-modal"
            width={1000}
        >
            <div className="booking-summary-header">
                <span className="booking-summary-icon">
                    <CheckCircleFilled />
                </span>
                <h2>Booking Summary</h2>
            </div>

            <div className="booking-summary-grid">
                <div className="booking-summary-left">
                    <div className="booking-summary-row">
                        <span className="booking-summary-label">Tour Package:</span>
                        <span className="booking-summary-value">{data.packageName}</span>
                    </div>

                    <div className="booking-summary-columns">
                        <div>
                            <h4>Travelers</h4>
                            <ul>
                                {travelers.map((item, index) => (
                                    <li key={`traveler-${index}`}>{item}</li>
                                ))}
                            </ul>

                            <h4>Airline Options</h4>
                            <ul>
                                {airlineOptions.map((item, index) => (
                                    <li key={`airline-${index}`}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h4>Hotel Options</h4>
                            <ul>
                                {hotelOptions.map((item, index) => (
                                    <li key={`hotel-${index}`}>{item}</li>
                                ))}
                            </ul>

                            <h4>Addons</h4>
                            <ul>
                                {addons.map((item, index) => (
                                    <li key={`addon-${index}`}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="booking-summary-divider" />

                    <div className="booking-summary-row">
                        <span className="booking-summary-label">Travel Date:</span>
                        <span className="booking-summary-value">
                            {travelDate || 'Not set'}
                        </span>
                    </div>
                </div>

                <div className="booking-summary-right">
                    {data.imageUrl ? (
                        <img
                            className="booking-summary-image"
                            src={data.imageUrl}
                            alt={data.packageName}
                            draggable={false}
                        />
                    ) : (
                        <div
                            className="booking-summary-image is-placeholder"
                            aria-hidden="true"
                        />
                    )}
                </div>
            </div>


            <div className="booking-summary-actions">
                <Button className="booking-summary-proceed" onClick={onProceed}>
                    Proceed
                </Button>
                <Button className="booking-summary-cancel" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </Modal >
    )
}
