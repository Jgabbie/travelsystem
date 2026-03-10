import React, { useEffect } from 'react'
import { Modal, Button } from 'antd'
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import dayjs from 'dayjs';
import '../../style/components/modals/bookingsummarymodal.css'

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

export default function BookingProcess() {
    const { bookingData } = useBooking();
    const navigate = useNavigate();

    useEffect(() => {
        if (!bookingData) {
            navigate('/home', { replace: true });
        }
    }, [bookingData, navigate]);

    if (!bookingData) return null;
    const summary = bookingData || {}

    console.log('Booking Summary Data:', summary);

    const data = summary
    const travelers = data.travelerCount?.length ? data.travelers : ['None selected']
    const hotelOptions = data.hotelOptions?.length ? data.hotelOptions : ['None selected']
    const airlineOptions = data.airlineOptions?.length ? data.airlineOptions : ['None selected']
    const travelDate = getDisplayDate(data.travelDate)
    const travelersCount = data.groupType === 'solo'
        ? 1
        : (data.travelerCount?.adult || 0)
        + (data.travelerCount?.child || 0)
        + (data.travelerCount?.infant || 0)
        + (data.travelerCount?.senior || 0)
    const packagePricePerPax = data.packagePricePerPax || 0
    const totalPrice = packagePricePerPax * travelersCount
    const packageName = data.packageName || 'Tour Package'
    const packageType = data.packageType || 'fixed'
    const images = data.images || []

    return (
        <>
            <h2 className='booking-summary-title'>Booking Summary</h2>
            <div className="booking-summary-wrapper">
                {/* Images Row */}
                <div className="booking-summary-images">
                    {images.length ? (
                        images.map((img, index) => (
                            <img
                                key={index}
                                className="booking-summary-image"
                                src={img}
                                alt={`${packageName}-${index}`}
                                draggable={false}
                            />
                        ))
                    ) : (
                        <div
                            className="booking-summary-image is-placeholder"
                        />
                    )}
                </div>

                {/* Booking Details */}
                <div className="booking-summary-details">

                    <div className="booking-summary-card">

                        <h2>Booking Details</h2>

                        <div className="booking-summary-row">
                            <span className="booking-summary-label">Tour Package</span>
                            <span className="booking-summary-value">{data.packageName}</span>
                        </div>

                        <div className="booking-summary-row">
                            <span className="booking-summary-label">Travel Date</span>
                            <span className="booking-summary-value">
                                {travelDate ? dayjs(travelDate).format('MMMM D, YYYY') : 'Not set'}
                            </span>
                        </div>

                        <div className="booking-summary-row">
                            <span className="booking-summary-label">Booking Type</span>
                            <span className="booking-summary-value">
                                {data.groupType === 'solo' ? 'Solo booking' : 'Group booking'}
                            </span>
                        </div>

                        <div className="booking-summary-row">
                            <span className="booking-summary-label">Package Type</span>
                            <span className="booking-summary-value">
                                {packageType?.toUpperCase()}
                            </span>
                        </div>

                        <div className='booking-summary-row'>
                            <span className="booking-summary-label">Travelers</span>
                            <span className="booking-summary-value">
                                {travelers.map((item, index) => (
                                    <li key={`traveler-${index}`}>{item}</li>
                                ))}
                            </span>
                        </div>

                        <div className='booking-summary-row'>
                            <span className="booking-summary-label">Airline</span>
                            <span className="booking-summary-value">
                                {airlineOptions?.length
                                    ? <li>{airlineOptions[0].name}</li>
                                    : <li>None selected</li>
                                }
                            </span>
                        </div>

                        <div className='booking-summary-row'>
                            <span className="booking-summary-label">Hotel</span>
                            <span className="booking-summary-value">
                                {hotelOptions?.length
                                    ? <li>{hotelOptions[0].name}</li>
                                    : <li>None selected</li>
                                }
                            </span>
                        </div>

                        <div className='booking-summary-divider'></div>

                        <div className="booking-summary-row">
                            <span className="booking-summary-label">Total Price</span>
                            <span className="booking-summary-value">
                                ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                </div>
            </div>
        </>
    )
}
