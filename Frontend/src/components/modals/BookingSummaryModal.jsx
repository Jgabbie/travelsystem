import React from 'react'
import { Modal, Button } from 'antd'
import dayjs from 'dayjs';
import { CheckCircleFilled } from '@ant-design/icons'
import '../../style/components/modals/bookingsummarymodal.css'

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

    // console.log("BookingSummaryModal data:", {
    //     data,
    //     travelers,
    //     hotelOptions,
    //     airlineOptions,
    //     addons,
    //     travelDate,
    //     packagePricePerPax,
    //     totalPrice,
    //     travelersCount
    // })

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

    const handleCancel = () => {
        onCancel();
    }

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            footer={null}
            className="booking-summary-modal"
            width={1000}
            style={{ top: 25 }}
        >
            <h2 className='booking-summary-title'>Booking Summary</h2>

            <div className="booking-summary-wrapper">
                {/* Images Row */}
                <div className="booking-summary-images">
                    {packageData?.images?.length ? (
                        packageData.images.map((img, index) => (
                            <img
                                key={index}
                                className="booking-summary-image"
                                src={img}
                                alt={`${packageData.packageName}-${index}`}
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
                                {packageData?.packageAirlines?.length
                                    ? <li>{packageData.packageAirlines[0].name}</li>
                                    : <li>None selected</li>
                                }
                            </span>
                        </div>

                        <div className='booking-summary-row'>
                            <span className="booking-summary-label">Hotel</span>
                            <span className="booking-summary-value">
                                {packageData?.packageHotels?.length
                                    ? <li>{packageData.packageHotels[0].name}</li>
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
            <div className="booking-summary-actions">
                <Button
                    className='booking-summary-proceed'
                    type="primary"
                    onClick={handleProceed}
                >
                    Proceed
                </Button>
                <Button
                    className="booking-summary-cancel"
                    danger
                    onClick={handleCancel}
                >
                    Cancel
                </Button>
            </div>
        </Modal>
    )
}
