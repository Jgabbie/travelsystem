import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../style/packagepage.css'
import { Button, Tabs, Modal, Rate, Input, message, Card } from 'antd';
import axiosInstance from '../config/axiosConfig';
import { useLocation, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import TopNavUser from '../components/TopNavUser'
import ChooseDateModal from '../components/ChooseDateModal'
import AllInOrLandArrangementModal from '../components/AllInOrLandArrangementModal'
import FixedOrCustomized from '../components/FixedOrCustomized'
import SoloOrGrouped from '../components/SoloOrGrouped'
import TravelersModal from '../components/TravelersModal'
import AddOnsModal from '../components/AddOnsModal'
import BookingSummaryModal from '../components/BookingSummaryModal'
import CustomizeBookingModal from '../components/CustomizeBookingModal'
import PackageQuotationModal from '../components/modals/PackageQuotationModal'
import BookingProcess from '../components/BookingProcess';

export default function PackagePage() {
    const { id } = useParams();
    const location = useLocation();

    //states for modals
    const [isBookingProcessOpen, setIsBookingProcessOpen] = useState(false)
    const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false)
    const [isDateModalOpen, setIsDateModalOpen] = useState(false)
    const [isArrangementModalOpen, setIsArrangementModalOpen] = useState(false)
    const [isFixedCustomModalOpen, setIsFixedCustomModalOpen] = useState(false)
    const [isCustomizeBookingOpen, setIsCustomizeBookingOpen] = useState(false)
    const [isSoloGroupModalOpen, setIsSoloGroupModalOpen] = useState(false)
    const [isTravelersModalOpen, setIsTravelersModalOpen] = useState(false)
    const [isAddOnsModalOpen, setIsAddOnsModalOpen] = useState(false)
    const [isBookingSummaryOpen, setIsBookingSummaryOpen] = useState(false)
    const [isConfirmBookingOpen, setIsConfirmBookingOpen] = useState(false)
    const [isBookingSuccessOpen, setIsBookingSuccessOpen] = useState(false)
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false)

    //states for booking details
    const [selectedDate, setSelectedDate] = useState(null)
    const [travelerCounts, setTravelerCounts] = useState(null)
    const [selectedAddOns, setSelectedAddOns] = useState([])
    const [selectedAirlines, setSelectedAirlines] = useState([])
    const [selectedHotels, setSelectedHotels] = useState([])
    const [fixedCustomSelection, setFixedCustomSelection] = useState(null)
    const [arrangementSelection, setArrangementSelection] = useState(null)
    const [soloGroupSelection, setSoloGroupSelection] = useState(null)

    //states for reviews
    const [showReviews, setShowReviews] = useState(false)
    const [reviews, setReviews] = useState([])
    const [reviewForm, setReviewForm] = useState({
        rating: 0,
        comment: ''
    })

    //states for package details
    const [packageData, setPackageData] = useState(null)
    const [packageLoading, setPackageLoading] = useState(true)
    const [packageError, setPackageError] = useState('')

    //reset all booking states, used when user cancels booking flow
    const resetBookingFlow = () => {
        setSelectedDate(null)
        setTravelerCounts(null)
        setSelectedAddOns([])
        setSelectedAirlines([])
        setSelectedHotels([])
        setFixedCustomSelection(null)
        setArrangementSelection(null)
        setSoloGroupSelection(null)

        setIsDateModalOpen(false)
        setIsArrangementModalOpen(false)
        setIsFixedCustomModalOpen(false)
        setIsCustomizeBookingOpen(false)
        setIsSoloGroupModalOpen(false)
        setIsTravelersModalOpen(false)
        setIsAddOnsModalOpen(false)
        setIsBookingSummaryOpen(false)
        setIsBookingSuccessOpen(false)
        setIsQuotationModalOpen(false)
    }

    //fetch package details from backend using the id from the URL and handle loading and error states
    useEffect(() => {
        const fetchPackage = async () => {
            if (!id) {
                setPackageLoading(false)
                return
            }
            try {
                setPackageLoading(true)
                const response = await axiosInstance.get(`/package/get-package/${id}`)
                // const mergedData = response.data.map(item => ({
                //     ...item,
                //     origin: "MNL",
                //     destination: "CEB"
                // }));
                setPackageData(response.data); //temp origin and destination for testing, replace with actual data from package when available
                setPackageError('')
            } catch (error) {
                console.error('Failed to load package:', error)
                setPackageError('Unable to load package details.')
                setPackageData(null)
            } finally {
                setPackageLoading(false)
            }
        }

        fetchPackage()
    }, [id])

    //get ratings for this package and map to display format, also used in fetchRatings function after submitting review to refresh the reviews
    const fetchRatings = useCallback(async () => {
        if (!id) return
        try {
            const response = await axiosInstance.get(`/rating/package/${id}/ratings`)
            const mapped = (response.data || []).map((rating) => ({
                id: rating._id,
                name: rating.userId?.username || 'User',
                avatar: rating.userId?.profileImage || '',
                rating: rating.rating,
                comment: rating.review || '',
                date: rating.createdAt
                    ? dayjs(rating.createdAt).format('MMM D, YYYY')
                    : 'Recently'
            }))
            setReviews(mapped)
        } catch {
            setReviews([])
        }
    }, [id])

    useEffect(() => {
        fetchRatings()
    }, [fetchRatings])

    const averageRating = useMemo(() => {
        if (!reviews.length) return 0
        const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0)
        return total / reviews.length
    }, [reviews])

    const ratingBreakdown = useMemo(() => {
        const breakdown = [0, 0, 0, 0, 0]
        reviews.forEach((review) => {
            const value = Math.round(Number(review.rating) || 0)
            if (value >= 1 && value <= 5) {
                breakdown[value - 1] += 1
            }
        })
        return breakdown
    }, [reviews])


    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const bookingStatus = searchParams.get('booking');

        if (bookingStatus === 'return') {
            localStorage.removeItem('pendingBooking');
            sessionStorage.removeItem('bookingSaved');
            const cleanedUrl = `${location.pathname}`;
            window.history.replaceState({}, '', cleanedUrl);
            return;
        }

        if (bookingStatus === 'success') {
            const alreadySaved = sessionStorage.getItem('bookingSaved');
            const saveInProgress = sessionStorage.getItem('bookingSaving');
            const stored = localStorage.getItem('pendingBooking');

            if (!alreadySaved && !saveInProgress && stored) {
                sessionStorage.setItem('bookingSaving', 'true');
                const payload = JSON.parse(stored);
                axiosInstance
                    .post('/booking/create-booking', {
                        packageId: payload.packageId,
                        bookingDetails: payload.bookingDetails
                    })
                    .then((res) => {
                        sessionStorage.setItem('bookingSaved', 'true');
                        localStorage.removeItem('pendingBooking');

                        console.log('The payload:', payload)

                        const totalAmount = payload.bookingDetails?.totalPrice || 0;

                        if (totalAmount <= 0) {
                            message.error("Invalid booking amount. Please contact support.");
                            return;
                        }

                        axiosInstance.post('/transaction/create-transaction', {
                            bookingId: res.data._id,
                            packageName: payload.bookingDetails?.packageName || 'Package Booking',
                            amount: totalAmount,
                            method: 'Online',
                            status: 'Paid'
                        }).catch(() => {
                            message.error('Transaction recording failed. Please contact support.');
                        });

                        setIsBookingSuccessOpen(true);
                    })
                    .catch(() => {
                        sessionStorage.removeItem('bookingSaved');
                        message.error('Booking failed. Please try again.');
                    })
                    .finally(() => {
                        sessionStorage.removeItem('bookingSaving');
                    });
            } else {
                setIsBookingSuccessOpen(true);
                const cleanedUrl = `${location.pathname}`;
                window.history.replaceState({}, '', cleanedUrl);
            }
        }
    }, [location.pathname, location.search, packageData]);


    //content for itinerary tab, shows list of itinerary items grouped by day
    const itineraryContent = useMemo(() => {
        const itineraries = packageData?.packageItineraries || {}
        const days = Object.keys(itineraries)
            .sort((a, b) => Number(a.replace('day', '')) - Number(b.replace('day', '')))

        if (days.length === 0) {
            return <p>No itinerary details available.</p>
        }

        return (
            <div>
                {days.map((day) => (
                    <div key={day} style={{ marginBottom: 12 }}>
                        <strong>{day.replace('day', 'Day ')}</strong>
                        <ul>
                            {(itineraries[day] || []).map((item, index) => (
                                <li key={`${day}-${index}`}>{item}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        )
    }, [packageData])

    //content for inclusions and exclusions tab, shows list of inclusions and exclusions in 2 columns
    const inclusionsExclusionsContent = useMemo(() => {
        const inclusions = packageData?.packageInclusions || []
        const exclusions = packageData?.packageExclusions || []

        return (
            <div style={{ display: 'grid', gap: 16 }}>
                <div>
                    <strong>Inclusions</strong>
                    {inclusions.length ? (
                        <ul>
                            {inclusions.map((item, index) => (
                                <li key={`inc-${index}`}>{item}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No inclusions listed.</p>
                    )}
                </div>
                <div>
                    <strong>Exclusions</strong>
                    {exclusions.length ? (
                        <ul>
                            {exclusions.map((item, index) => (
                                <li key={`exc-${index}`}>{item}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>No exclusions listed.</p>
                    )}
                </div>
            </div>
        )
    }, [packageData])

    //terms content for package details tab, shows list of terms and conditions
    const termsContent = useMemo(() => {
        const terms = packageData?.packageTermsConditions || []
        if (!terms.length) return <p>No terms and conditions listed.</p>
        return (
            <ul>
                {terms.map((item, index) => (
                    <li key={`term-${index}`}>{item}</li>
                ))}
            </ul>
        )
    }, [packageData])

    //tab items for package details section
    const itemsTab = useMemo(() => [
        {
            label: 'Itinerary',
            key: '1',
            children: itineraryContent,
        },
        {
            label: 'Inclusions and Exclusions',
            key: '2',
            children: inclusionsExclusionsContent,
        },
        {
            label: 'Terms and Conditions',
            key: '3',
            children: termsContent,
        },
    ], [itineraryContent, inclusionsExclusionsContent, termsContent])

    // when wishlist button is clicked, add to wishlist and show confirmation modal
    const handleWishlistClick = async () => {
        const packageId = packageData?._id || id
        if (!packageId) {
            message.error('Unable to add wishlist item. Package is missing.')
            return
        }

        try {
            await axiosInstance.post('/wishlist/add', { packageId })
            setIsWishlistModalOpen(true)
        } catch (error) {
            const errorMessage =
                error?.response?.data?.message || 'Unable to add to wishlist. Please try again.'
            message.error(errorMessage)
        }
    }

    const handleBookingProcess = () => {
        setIsArrangementModalOpen(true)
    }

    // when user click "Check Availability"
    const handleOpenDateModal = () => {
        setIsDateModalOpen(true)
    }

    //proceed to next step and open arrangement modal
    const handleProceedDate = () => {
        setIsDateModalOpen(false)
        setIsArrangementModalOpen(true)
    }

    //proceed to next step and open fixed/custom modal
    const handleProceedArrangement = () => {
        setIsArrangementModalOpen(false)
        setIsFixedCustomModalOpen(true)
    }

    //proceed to next step and open either quotation modal or customize booking modal based on selection
    const handleProceedFixedCustom = (selection) => {
        const nextSelection = selection || fixedCustomSelection
        setFixedCustomSelection(nextSelection)
        setIsFixedCustomModalOpen(false)
        if (nextSelection === 'custom') {
            setIsQuotationModalOpen(true)
            return
        }
        setIsSoloGroupModalOpen(true)
    }

    //submit quotation request and close quotation modal
    const handleSubmitQuotation = () => {
        setIsQuotationModalOpen(false)
    }

    //proceed to solo or grouped booking then opens travelers modal
    const handleProceedSoloGroup = (selection) => {
        const nextSelection = selection || soloGroupSelection
        setSoloGroupSelection(nextSelection)
        setIsSoloGroupModalOpen(false)
        if (nextSelection === 'solo') {
            setTravelerCounts({ adult: 1, child: 0, infant: 0, senior: 0 })
            setIsAddOnsModalOpen(true)
            return
        }
        setIsTravelersModalOpen(true)
    }

    //proceed to add ons modal then opens booking summary modal after that
    const handleProceedTravelers = (counts) => {
        setTravelerCounts(counts)
        setIsTravelersModalOpen(false)
        setIsAddOnsModalOpen(true)
    }

    //proceed to booking summary modal and show summary of booking details
    const handleProceedAddOns = (selection) => {
        setSelectedAddOns(selection || [])
        setIsAddOnsModalOpen(false)
        setIsBookingSummaryOpen(true)
    }

    //proceed to confirm booking and submit booking details to backend
    const handleProceedSummary = () => {
        setIsBookingSummaryOpen(false)
        setIsConfirmBookingOpen(true)
    }

    //duplicated?
    //two bookings being created?
    //submit booking details to backend and show success modal if successful
    const handleConfirmBooking = () => {
        const packageId = packageData?._id || id

        if (!packageId) {
            message.error('Unable to create booking. Package is missing.')
            return
        }

        const bookingDetails = {
            travelDate: selectedDate,
            arrangement: arrangementSelection,
            packageType: fixedCustomSelection,
            groupType: soloGroupSelection,
            travelers: travelerCounts,
            addOns: selectedAddOns,
            airlines: selectedAirlines,
            hotels: selectedHotels,
            packageName: packageData?.packageName || ''
        }

        axiosInstance.post('/booking/create-booking', {
            packageId,
            bookingDetails
        })
            .then(() => {
                setIsConfirmBookingOpen(false)
                setIsBookingSuccessOpen(true)
            })
            .catch(() => {
                message.error('Booking failed. Please try again.')
            })
    }


    //travelers summary for booking summary modal
    const travelerSummary = [
        ['adult', 'Adult'],
        ['child', 'Child'],
        ['infant', 'Infant'],
        ['senior', 'Senior']
    ]
        .map(([key, label]) => {
            const value = travelerCounts?.[key]
            return value ? `${value}x ${label}` : null
        })
        .filter(Boolean)

    //add on label map to convert add on keys to display labels in booking summary modal
    const addOnLabelMap = {
        'extra-baggage': 'Extra baggage',
        'flight-meals': 'Flight meals',
        'entertainment': 'Entertainment',
        'optional-tours': 'Optional tours'
    }

    //data for booking summary modal
    const totalTravelers = ['adult', 'child', 'infant', 'senior']
        .reduce((sum, key) => sum + (travelerCounts?.[key] || 0), 0)
    const totalPrice = (packageData?.packagePricePerPax || 0) * totalTravelers

    const summaryData = {
        packageName: packageData?.packageName || 'Package Details',
        packagePricePerPax: packageData?.packagePricePerPax || 0,
        travelers: travelerSummary,
        travelerCount: travelerCounts,
        totalPrice,
        groupType: soloGroupSelection,
        hotelOptions: selectedHotels,
        airlineOptions: selectedAirlines,
        addons: selectedAddOns.map((key) => addOnLabelMap[key] || key),
        travelDate: selectedDate,
        imageUrl: packageData?.image || ''
    }

    console.log("Booking summary data:", summaryData)

    //payload for booking creation to be stored in localStorage before redirecting to checkout and then retrieved in useEffect to submit booking after successful payment
    const bookingPayload = packageData?._id
        ? {
            packageId: packageData._id,
            bookingDetails: {
                pricePerPax: packageData.packagePricePerPax || 0,
                totalPrice,
                travelDate: selectedDate,
                arrangement: arrangementSelection,
                packageType: fixedCustomSelection,
                groupType: soloGroupSelection,
                travelers: travelerCounts || {},
                addOns: selectedAddOns,
                airlines: selectedAirlines,
                hotels: selectedHotels,
                packageName: packageData?.packageName || ''
            }
        }
        : null

    //success and cancel URLs for payment checkout, passing the package id as query param for redirecting back to the same package page after payment
    const successUrl = id
        ? `${window.location.origin}/package/${id}?booking=success`
        : `${window.location.origin}/package?booking=success`;
    const cancelUrl = id
        ? `${window.location.origin}/package/${id}?booking=return`
        : `${window.location.origin}/package?booking=return`;


    //submit review to backend and refresh reviews after successful submission
    const handleSubmitReview = async () => {
        if (!reviewForm.rating || !reviewForm.comment.trim()) {
            return
        }

        try {
            await axiosInstance.post('/rating/submit-rating', {
                packageId: id,
                rating: reviewForm.rating,
                review: reviewForm.comment.trim()
            })
            message.success('Review submitted')
            setReviewForm({ rating: 0, comment: '' })
            fetchRatings()
        } catch {
            message.error('Unable to submit review')
        }
    }

    return (
        <div>
            <TopNavUser />
            <div className="packagepage-container">
                <div className="package-box">
                    <div className="package-left">
                        <div className="package-title-group">
                            <h1 className="package-title">{packageData?.packageName || 'Package Details'}</h1>
                            {packageData?.packageDuration && (
                                <p className="package-duration">{packageData.packageDuration} days</p>
                            )}
                        </div>

                        <div className="package-actions-left">
                            <Button className="package-action-secondary" onClick={handleWishlistClick}>Add to Wishlist</Button>
                            <Button className="package-action-outline" onClick={() => setShowReviews((prev) => !prev)}>
                                {showReviews ? 'Back to Details' : 'Review and Ratings'}
                            </Button>
                        </div>

                        <div className="package-left-content">
                            <div className="package-description">
                                {packageLoading ? (
                                    <p>Loading package details...</p>
                                ) : packageError ? (
                                    <p>{packageError}</p>
                                ) : (
                                    <p>{packageData?.packageDescription || 'No description available.'}</p>
                                )}
                            </div>

                            <div className="package-image-section">
                                {packageData?.image ? (
                                    <img
                                        className="package-image"
                                        draggable={false}
                                        alt={packageData.packageName}
                                        src={packageData.image}
                                    />
                                ) : (
                                    <div className="package-image-placeholder">No image available</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="package-right">
                        {showReviews ? (
                            <Card className="package-reviews-card" bordered={false}>
                                <div className="package-reviews">
                                    <div className="package-review-summary">
                                        <div>
                                            <p className="package-review-label">Average rating</p>
                                            <div className="package-review-average">
                                                <Rate allowHalf disabled value={averageRating} />
                                                <span>{averageRating ? averageRating.toFixed(1) : '0.0'}</span>
                                            </div>
                                        </div>
                                        <span className="package-review-count">{reviews.length} reviews</span>
                                    </div>
                                    <div className="package-review-breakdown">
                                        <p className="package-review-breakdown-title">
                                            Review Breakdown for {packageData?.packageName || 'this package'}
                                        </p>
                                        {[5, 4, 3, 2, 1].map((star) => {
                                            const count = ratingBreakdown[star - 1]
                                            return (
                                                <div key={star} className="package-review-breakdown-row">
                                                    <span className="package-review-breakdown-label">{star} star</span>
                                                    <div className="package-review-breakdown-bar">
                                                        <span
                                                            className="package-review-breakdown-fill"
                                                            style={{
                                                                width: reviews.length
                                                                    ? `${Math.round((count / reviews.length) * 100)}%`
                                                                    : '0%'
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="package-review-breakdown-count">{count}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="package-review-list">
                                        {reviews.length ? (
                                            reviews.map((review) => (
                                                <div key={review.id} className="package-review-card">
                                                    <div className="package-review-header">
                                                        <div className="package-review-user">
                                                            <div className="package-review-avatar">
                                                                {review.avatar ? (
                                                                    <img src={review.avatar} alt={review.name} />
                                                                ) : (
                                                                    <span className="package-review-avatar-fallback">
                                                                        {review.name?.charAt(0)?.toUpperCase() || 'U'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="package-review-name">{review.name}</span>
                                                        </div>
                                                        <Rate disabled value={review.rating} />
                                                    </div>
                                                    <p className="package-review-date">{review.date || 'Recently'}</p>
                                                    <p className="package-review-comment">{review.comment}</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p>No reviews yet.</p>
                                        )}
                                    </div>

                                    <div className="package-review-form">
                                        <h3>Leave a review</h3>
                                        <Rate
                                            value={reviewForm.rating}
                                            onChange={(value) => setReviewForm((prev) => ({ ...prev, rating: value }))}
                                        />
                                        <Input.TextArea
                                            rows={4}
                                            placeholder="Share your experience..."
                                            value={reviewForm.comment}
                                            onChange={(event) =>
                                                setReviewForm((prev) => ({ ...prev, comment: event.target.value }))
                                            }
                                        />
                                        <Button className="package-action-secondary" onClick={handleSubmitReview}>
                                            Submit Review
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <>
                                <div className="package-price-card">
                                    <div className="package-price-label">Price per pax</div>
                                    <div className="package-pricepax">
                                        ₱{packageData?.packagePricePerPax?.toLocaleString() || '--'}
                                    </div>
                                    <Button className="package-availability-button" onClick={handleBookingProcess}>
                                        Check Availability
                                    </Button>
                                </div>

                                <Tabs
                                    className="package-tabs"
                                    defaultActiveKey="1"
                                    size="small"
                                    items={itemsTab}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                className="package-wishlist-modal"
                open={isWishlistModalOpen}
                footer={null}
                onCancel={() => setIsWishlistModalOpen(false)}
            >
                <h2 className="package-wishlist-title">Added to Wishlist</h2>
                <p className="package-wishlist-text">This package has been successfully added to your wishlist.</p>
                <div className="package-wishlist-actions">
                    <Button className="package-action-secondary" onClick={() => setIsWishlistModalOpen(false)}>
                        Close
                    </Button>
                </div>
            </Modal>

            <BookingProcess
                open={isBookingProcessOpen}
                onCancel={resetBookingFlow}
                packageData={packageData}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
            />

            <ChooseDateModal
                open={isDateModalOpen}
                onCancel={resetBookingFlow}
                onProceed={handleProceedDate}
                packageData={packageData}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
            />

            <AllInOrLandArrangementModal
                open={isArrangementModalOpen}
                onCancel={resetBookingFlow}
                onProceed={handleProceedArrangement}
                onSelect={setArrangementSelection}
            />

            <FixedOrCustomized
                open={isFixedCustomModalOpen}
                onCancel={resetBookingFlow}
                onProceed={handleProceedFixedCustom}
                selection={fixedCustomSelection}
                onSelect={setFixedCustomSelection}
            />

            <PackageQuotationModal
                open={isQuotationModalOpen}
                onCancel={resetBookingFlow}
                onSubmit={handleSubmitQuotation}
                bookingPayload={bookingPayload}
                basePrice={packageData?.packagePricePerPax || 0}
                days={packageData?.packageDuration || 1}
                fixedItinerary={packageData?.packageItineraries || {}}
                itinerary={Object.keys(packageData?.packageItineraries || {})
                    .sort((a, b) => Number(a.replace('day', '')) - Number(b.replace('day', '')))
                    .map((dayKey) => dayKey.replace('day', 'Day '))}
            />

            <SoloOrGrouped
                open={isSoloGroupModalOpen}
                onCancel={resetBookingFlow}
                onProceed={handleProceedSoloGroup}
                onSelect={setSoloGroupSelection}
                selection={soloGroupSelection}
            />

            <TravelersModal
                open={isTravelersModalOpen}
                onCancel={resetBookingFlow}
                onProceed={handleProceedTravelers}
            />

            <AddOnsModal
                open={isAddOnsModalOpen}
                onCancel={resetBookingFlow}
                onProceed={handleProceedAddOns}
            />

            <BookingSummaryModal
                open={isBookingSummaryOpen}
                onCancel={resetBookingFlow}
                onProceed={handleProceedSummary}
                summary={summaryData}
                successUrl={successUrl}
                cancelUrl={cancelUrl}
                bookingPayload={bookingPayload}
            />

            <Modal
                className="package-wishlist-modal"
                open={isConfirmBookingOpen}
                footer={null}
                onCancel={resetBookingFlow}
            >
                <h2 className="package-wishlist-title">Confirm Booking</h2>
                <p className="package-wishlist-text">
                    Are you sure you want to proceed with this booking?
                </p>
                <div className="package-wishlist-actions" style={{ gap: 12 }}>
                    <Button className="package-action-secondary" onClick={handleConfirmBooking}>
                        Yes, proceed
                    </Button>
                    <Button className="package-action-outline" onClick={resetBookingFlow}>
                        Cancel
                    </Button>
                </div>
            </Modal>

            <Modal
                className="package-wishlist-modal"
                open={isBookingSuccessOpen}
                footer={null}
                onCancel={resetBookingFlow}
            >
                <h2 className="package-wishlist-title">Booking Successful</h2>
                <p className="package-wishlist-text">Your booking has been confirmed.</p>
                <div className="package-wishlist-actions">
                    <Button className="package-action-secondary" onClick={() => {
                        resetBookingFlow()
                        setIsBookingSuccessOpen(false)
                        window.history.replaceState({}, '', `/package/${id}`);;
                    }}>
                        OK
                    </Button>
                </div>
            </Modal>
        </div>

    )
}
