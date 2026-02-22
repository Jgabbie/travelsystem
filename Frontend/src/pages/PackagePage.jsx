import React, { useCallback, useEffect, useMemo, useState } from 'react';
import '../style/packagepage.css'
import { Button, Tabs, Modal, Rate, Input, message } from 'antd';
import axiosInstance from '../config/axiosConfig';
import { useParams } from 'react-router-dom';
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

export default function PackagePage() {
    const { id } = useParams();

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
    const [selectedDate, setSelectedDate] = useState(null)
    const [travelerCounts, setTravelerCounts] = useState(null)
    const [selectedAddOns, setSelectedAddOns] = useState([])
    const [selectedAirlines, setSelectedAirlines] = useState([])
    const [selectedHotels, setSelectedHotels] = useState([])
    const [fixedCustomSelection, setFixedCustomSelection] = useState(null)
    const [arrangementSelection, setArrangementSelection] = useState(null)
    const [soloGroupSelection, setSoloGroupSelection] = useState(null)
    const [showReviews, setShowReviews] = useState(false)
    const [reviews, setReviews] = useState([])
    const [reviewForm, setReviewForm] = useState({
        rating: 0,
        comment: ''
    })

    const [packageData, setPackageData] = useState(null)
    const [packageLoading, setPackageLoading] = useState(true)
    const [packageError, setPackageError] = useState('')

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
    }

    useEffect(() => {
        const fetchPackage = async () => {
            if (!id) {
                setPackageLoading(false)
                return
            }
            try {
                setPackageLoading(true)
                const response = await axiosInstance.get(`/package/get-package/${id}`)
                setPackageData(response.data)
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

    const fetchRatings = useCallback(async () => {
        if (!id) return
        try {
            const response = await axiosInstance.get(`/rating/package/${id}/ratings`)
            const mapped = (response.data || []).map((rating) => ({
                id: rating._id,
                name: rating.userId?.username || 'User',
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

    const handleOpenDateModal = () => {
        setIsDateModalOpen(true)
    }

    const handleProceedDate = () => {
        setIsDateModalOpen(false)
        setIsArrangementModalOpen(true)
    }

    const handleProceedArrangement = () => {
        setIsArrangementModalOpen(false)
        setIsFixedCustomModalOpen(true)
    }

    const handleCancelFixedCustom = () => {
        setFixedCustomSelection(null)
        setIsFixedCustomModalOpen(false)
    }

    const handleProceedFixedCustom = (selection) => {
        const nextSelection = selection || fixedCustomSelection
        setFixedCustomSelection(nextSelection)
        setIsFixedCustomModalOpen(false)
        if (nextSelection === 'custom') {
            setIsCustomizeBookingOpen(true)
            return
        }
        setIsSoloGroupModalOpen(true)
    }

    const handleProceedCustomizeBooking = ({ airlines, hotels }) => {
        setSelectedAirlines(airlines || [])
        setSelectedHotels(hotels || [])
        setIsCustomizeBookingOpen(false)
        setIsSoloGroupModalOpen(true)
    }

    const handleProceedSoloGroup = () => {
        setIsSoloGroupModalOpen(false)
        setIsTravelersModalOpen(true)
    }

    const handleProceedTravelers = (counts) => {
        setTravelerCounts(counts)
        setIsTravelersModalOpen(false)
        setIsAddOnsModalOpen(true)
    }

    const handleProceedAddOns = (selection) => {
        setSelectedAddOns(selection || [])
        setIsAddOnsModalOpen(false)
        setIsBookingSummaryOpen(true)
    }

    const handleProceedSummary = () => {
        setIsBookingSummaryOpen(false)
        setIsConfirmBookingOpen(true)
    }

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

        axiosInstance
            .post('/booking/create-booking', {
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

    const addOnLabelMap = {
        'extra-baggage': 'Extra baggage',
        'flight-meals': 'Flight meals',
        'entertainment': 'Entertainment',
        'optional-tours': 'Optional tours'
    }

    const summaryData = {
        packageName: packageData?.packageName || 'Package Details',
        travelers: travelerSummary,
        hotelOptions: selectedHotels,
        airlineOptions: selectedAirlines,
        addons: selectedAddOns.map((key) => addOnLabelMap[key] || key),
        travelDate: selectedDate,
        imageUrl: packageData?.image || ''
    }

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
                            <div className="package-reviews">
                                <div className="package-review-list">
                                    {reviews.length ? (
                                        reviews.map((review) => (
                                            <div key={review.id} className="package-review-card">
                                                <div className="package-review-header">
                                                    <span className="package-review-name">{review.name}</span>
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
                        ) : (
                            <>
                                <div className="package-price-card">
                                    <div className="package-price-label">Price per pax</div>
                                    <div className="package-price">
                                        ₱{packageData?.packagePricePerPax?.toLocaleString() || '--'}
                                    </div>
                                    <Button className="package-availability-button" onClick={handleOpenDateModal}>
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

            <CustomizeBookingModal
                open={isCustomizeBookingOpen}
                onCancel={resetBookingFlow}
                onProceed={handleProceedCustomizeBooking}
                defaultAirlines={selectedAirlines}
                defaultHotels={selectedHotels}
            />

            <SoloOrGrouped
                open={isSoloGroupModalOpen}
                onCancel={resetBookingFlow}
                onProceed={handleProceedSoloGroup}
                onSelect={setSoloGroupSelection}
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
                    <Button className="package-action-secondary" onClick={resetBookingFlow}>
                        OK
                    </Button>
                </div>
            </Modal>
        </div>

    )
}
