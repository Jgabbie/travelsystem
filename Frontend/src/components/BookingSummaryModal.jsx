import React from 'react'
import { Modal, Button } from 'antd'
import { CheckCircleFilled } from '@ant-design/icons'
import '../style/bookingsummarymodal.css'
import axiosInstance from '../config/axiosConfig'

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
    summary,
    packageData,
    onProceed,
    successUrl,
    cancelUrl,
    bookingPayload
}) {


    //paymongo checkout
    //get summary data or use default option to test booking
    const data = summary
    const travelers = data.travelers?.length ? data.travelers : ['None selected']
    const hotelOptions = data.hotelOptions?.length ? data.hotelOptions : ['None selected']
    const airlineOptions = data.airlineOptions?.length ? data.airlineOptions : ['None selected']
    const addons = data.addons?.length ? data.addons : ['None selected']
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
    const packageId = data.packageId || null

    console.log("BookingSummaryModal data:", {
        data,
        travelers,
        hotelOptions,
        airlineOptions,
        addons,
        travelDate,
        packagePricePerPax,
        totalPrice,
        travelersCount
    })

    const handleCheckout = async () => {

        // const checkoutDetails = {
        //     packageName,
        //     travelersCount,
        //     totalPrice,
        //     travelDate,
        //     packageType
        // }

        // localStorage.setItem('checkoutDetails', JSON.stringify(checkoutDetails))

        // if (!bookingPayload) return

        // try {
        //     const tokenRes = await axiosInstance.post("/payment/create-checkout-token", {
        //         totalPrice,
        //     });

        //     const checkoutToken = tokenRes.data.token;

        //     const res = await axiosInstance.post("/payment/create-checkout-session", {
        //         checkoutToken,
        //         totalPrice,
        //         packageName,
        //         successUrl: `${window.location.origin}/package/${packageId}?booking=success&checkoutToken=${checkoutToken}`,
        //         cancelUrl: `${window.location.origin}/package/${packageId}?booking=cancelled`
        //     });

        //     const checkoutUrl = res.data.data.attributes.checkout_url;

        //     window.location.href = checkoutUrl;
        // } catch (err) {
        //     console.error(err.response?.data || err.message);
        //     alert("Checkout failed. Check server logs.");
        // }
    };

    const handleProceed = () => {
        onProceed();
    }

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

                            <h4>Airline</h4>
                            <ul>
                                {packageData?.packageAirlines?.length
                                    ? <li>{packageData.packageAirlines[0].name}</li>
                                    : <li>None selected</li>
                                }
                            </ul>
                        </div>

                        <div>
                            <h4>Hotel</h4>
                            <ul>
                                {packageData?.packageHotels?.length
                                    ? <li>{packageData.packageHotels[0].name}</li>
                                    : <li>None selected</li>
                                }
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
                    <div className="booking-summary-row">
                        <span className="booking-summary-label">Booking Type:</span>
                        <span className="booking-summary-value">
                            {data.groupType === 'solo' ? 'Solo booking' : 'Group booking'}
                        </span>
                    </div>
                    <div className="booking-summary-row">
                        <span className="booking-summary-label">Total Price:</span>
                        <span className="booking-summary-value">
                            ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <div className="booking-summary-right">
                    {packageData?.images?.[0] ? (
                        <img
                            className="booking-summary-image"
                            src={packageData.images[0]}
                            alt={packageData.packageName}
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
                <Button className="booking-summary-proceed" onClick={handleProceed}>
                    Proceed
                </Button>
                <Button className="booking-summary-cancel" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </Modal >
    )
}
