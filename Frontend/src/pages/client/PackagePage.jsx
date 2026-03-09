import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tabs, Modal, Rate, Input, message, Card, ConfigProvider } from 'antd';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import dayjs from 'dayjs';
import axiosInstance from '../../config/axiosConfig';
import '../../style/client/packagepage.css'

import TopNavUser from '../../components/TopNavUser'
import AllInOrLandArrangementModal from '../../components/modals/AllInOrLandArrangementModal'
import AllInOrLandDomesticModal from '../../components/modals/AllInOrLandDomesticModal';
import SoloOrGrouped from '../../components/SoloOrGrouped'
import TravelersModal from '../../components/modals/TravelersModal'
import BookingSummaryModal from '../../components/modals/BookingSummaryModal'
import PackageQuotationModal from '../../components/modals/PackageQuotationModal'
import ChooseDateIntModal from '../../components/modals/ChooseDateIntModal';
import LoginModal from '../../components/modals/LoginModal';
import BookingRegistrationModal from '../../components/modals/BookingRegistrationModal';
import UploadPassportModal from '../../components/modals/UploadPassportModal';
import DisplayInvoiceModal from '../../components/modals/DisplayInvoiceModal';
import PaymentMethodsModal from '../../components/modals/PaymentMethodsModal';
import DomesticQuotationModal from '../../components/modals/DomesticQuotationModal';

export default function PackagePage() {
    const { id } = useParams();
    const location = useLocation();
    const fetchCalled = useRef(false);
    const { auth, authLoading } = useAuth();

    //login state
    const [isLoginVisible, setIsLoginVisible] = useState(false);

    //states for modals
    const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false)
    const [isDateModalOpen, setIsDateModalOpen] = useState(false)
    const [isArrangementModalOpen, setIsArrangementModalOpen] = useState(false)
    const [isArrangementDomModalOpen, setIsArrangementDomModalOpen] = useState(false)
    const [isSoloGroupModalOpen, setIsSoloGroupModalOpen] = useState(false)
    const [isTravelersModalOpen, setIsTravelersModalOpen] = useState(false)
    const [isBookingSummaryOpen, setIsBookingSummaryOpen] = useState(false)
    const [isBookingSuccessOpen, setIsBookingSuccessOpen] = useState(false)
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false)
    const [isBookingRegistrationOpen, setIsBookingRegistrationOpen] = useState(false)
    const [isUploadPassportOpen, setIsUploadPassportOpen] = useState(false)
    const [isDisplayInvoiceOpen, setIsDisplayInvoiceOpen] = useState(false)
    const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false)
    const [isDomesticQuotationOpen, setIsDomesticQuotationOpen] = useState(false)

    //states for booking details
    const [selectedDate, setSelectedDate] = useState(null)
    const [travelerCounts, setTravelerCounts] = useState(null)
    const [selectedAddOns, setSelectedAddOns] = useState([])
    const [selectedAirlines, setSelectedAirlines] = useState([])
    const [selectedHotels, setSelectedHotels] = useState([])
    const [fixedCustomSelection, setFixedCustomSelection] = useState(null)
    const [arrangementSelection, setArrangementSelection] = useState(null)
    const [arrangementSelectionDomestic, setArrangementSelectionDomestic] = useState(null)
    const [soloGroupSelection, setSoloGroupSelection] = useState(null)

    //states for reviews
    const [showReviews, setShowReviews] = useState(false)
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviews, setReviews] = useState([])
    const [reviewForm, setReviewForm] = useState({
        rating: 0,
        comment: '',
        fullName: '',
        email: ''
    });

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
        setIsArrangementDomModalOpen(false)
        setIsSoloGroupModalOpen(false)
        setIsTravelersModalOpen(false)
        setIsBookingSummaryOpen(false)
        setIsBookingSuccessOpen(false)
        setIsQuotationModalOpen(false)
        setIsBookingRegistrationOpen(false)
        setIsUploadPassportOpen(false)
        setIsDisplayInvoiceOpen(false)
        setIsPaymentMethodsOpen(false)
        setIsDomesticQuotationOpen(false)
    }

    console.log(auth)

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

    // useEffect(() => {
    //     if (!auth) return;
    //     if (fetchCalled.current) return;
    //     fetchCalled.current = true;
    //     const searchParams = new URLSearchParams(location.search);
    //     const checkoutToken = searchParams.get("checkoutToken");
    //     const bookingStatus = searchParams.get("booking");

    //     const checkoutDetails = localStorage.getItem('checkoutDetails');
    //     const checkoutDetailsParsed = checkoutDetails ? JSON.parse(checkoutDetails) : null;

    //     if (bookingStatus === "success" && checkoutToken) {
    //         setIsBookingSuccessOpen(true);

    //         axiosInstance.post("/booking/create-booking", {
    //             bookingDetails: checkoutDetailsParsed,
    //             checkoutToken
    //         })
    //             .then(res => {

    //                 axiosInstance.post("/transaction/create-transaction", {
    //                     bookingId: res.data._id,
    //                     amount: checkoutDetailsParsed.totalPrice,
    //                     method: "Online Payment",
    //                     status: "Successful",
    //                     packageName: checkoutDetailsParsed.packageName
    //                 })
    //                     .then(transactionRes => {
    //                         console.log("Transaction created successfully:", transactionRes.data);
    //                         localStorage.removeItem('checkoutDetails');
    //                     })
    //                     .catch(transactionErr => {
    //                         console.error("Error creating transaction:", transactionErr.response?.data || transactionErr.message);
    //                         message.error("Booking was successful, but there was an issue creating the transaction.");
    //                     });

    //             })
    //             .catch(err => {
    //                 console.error("Error creating booking:", err.response?.data || err.message);
    //                 message.error("Booking was successful, but there was an issue finalizing it. Please contact support.");
    //             });
    //         window.history.replaceState({}, '', location.pathname); //can replace with a thank you page
    //     }
    // }, [auth, location.search, location.pathname]);


    //get ratings for this package and map to display format, also used in fetchRatings function after submitting review to refresh the reviews
    const fetchRatings = useCallback(async () => {
        if (!id) return
        try {
            const response = await axiosInstance.get(`/rating/package/${id}/ratings`)
            const mapped = (response.data || []).map((rating) => ({
                id: rating._id,
                userId: rating.userId?._id,
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

    //user has already rated

    const userReview = useMemo(() => {
        if (!auth) return null

        const currentUserId = auth?.id

        return reviews.find(
            review => String(review.userId) === String(currentUserId)
        )
    }, [reviews, auth])

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
            children: <div><div className="package-tab-content-scroll">{itineraryContent}</div></div>,
        },
        {
            label: 'Inclusions and Exclusions',
            key: '2',
            children: <div><div className="package-tab-content-scroll">{inclusionsExclusionsContent}</div></div>,
        },
        {
            label: 'Terms and Conditions',
            key: '3',
            children: <div><div className="package-tab-content-scroll">{termsContent}</div></div>,
        },
    ], [itineraryContent, inclusionsExclusionsContent, termsContent])

    // when wishlist button is clicked, add to wishlist and show confirmation modal
    const handleWishlistClick = async () => {

        if (!auth) {
            setIsLoginVisible(true);
            return;
        }

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
        if (!auth) {
            setIsLoginVisible(true);
            return;
        }

        if (packageData?.packageType === 'domestic') {
            setIsArrangementDomModalOpen(true)
        } else {
            setIsArrangementModalOpen(true)
        }
    };

    const handleProceedDate = () => {
        setIsDateModalOpen(false)
        setIsSoloGroupModalOpen(true)
    }

    const handleProceedArrangement = () => {
        setIsArrangementModalOpen(false)

        if (arrangementSelection === 'fixed') {
            setIsDateModalOpen(true)
        } else if (arrangementSelection === 'land' || arrangementSelection === 'all-in') {
            setIsQuotationModalOpen(true)
        }
    }

    const handleProceedArrangementDomestic = () => {
        setIsArrangementDomModalOpen(false)
        if (arrangementSelectionDomestic === 'customallin') {
            setIsDomesticQuotationOpen(true)
        } else {
            setIsDomesticQuotationOpen(true)
        }
    }

    const handleSubmitQuotation = () => {
        setIsQuotationModalOpen(false)
    }

    const handleProceedSoloGroup = (selection) => {
        const nextSelection = selection || soloGroupSelection
        setSoloGroupSelection(nextSelection)
        setIsSoloGroupModalOpen(false)
        if (nextSelection === 'solo') {
            setTravelerCounts({ adult: 1, child: 0, infant: 0, senior: 0 })
            setIsBookingSummaryOpen(true)
            return
        }
        setIsTravelersModalOpen(true)
    }

    const handleProceedTravelers = (counts) => {
        setTravelerCounts(counts)
        setIsTravelersModalOpen(false)
        setIsBookingSummaryOpen(true)
    }

    const handleProceedSummary = () => {
        setIsBookingSummaryOpen(false)
        setIsBookingRegistrationOpen(true)
    }

    const handleProceedRegistration = () => {
        setIsBookingRegistrationOpen(false)
        setIsUploadPassportOpen(true)
    }

    const handleProceedUploadPassport = () => {
        setIsUploadPassportOpen(false)
        setIsDisplayInvoiceOpen(true)
    }

    const handleProceedDisplayInvoice = () => {
        setIsDisplayInvoiceOpen(false)
        setIsPaymentMethodsOpen(true)
    }

    const handleProceedPaymentMethods = () => {
        setIsPaymentMethodsOpen(false)
        setIsBookingSuccessOpen(true)
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
    const totalTravelers = ['adult', 'child', 'infant', 'senior']
        .reduce((sum, key) => sum + (travelerCounts?.[key] || 0), 0)
    const totalPrice = (packageData?.packagePricePerPax || 0) * totalTravelers

    const summaryData = {
        packageId: packageData?._id || null,
        packageName: packageData?.packageName || 'Package Details',
        packagePricePerPax: packageData?.packagePricePerPax || 0,
        packageType: packageData?.packageType || 'fixed',
        travelers: travelerSummary,
        travelerCount: travelerCounts,
        totalPrice,
        groupType: soloGroupSelection,
        hotelOptions: packageData?.packageHotels,
        airlineOptions: packageData?.packageAirlines,
        addons: selectedAddOns.map((key) => addOnLabelMap[key] || key),
        travelDate: selectedDate,
    }

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
            message.warning("Please provide a rating and comment.");
            return;
        }

        setIsSubmittingReview(true);

        try {
            if (isEditingReview) {
                // UPDATE review
                await axiosInstance.put(`/rating/${userReview.id}`, {
                    rating: reviewForm.rating,
                    review: reviewForm.comment.trim()
                });
                message.success("Review updated");
            } else {
                // CREATE review
                await axiosInstance.post('/rating/submit-rating', {
                    packageId: id,
                    rating: reviewForm.rating,
                    review: reviewForm.comment.trim(),
                    fullName: !auth ? reviewForm.fullName : undefined,
                    email: !auth ? reviewForm.email : undefined
                });
                message.success("Review submitted");
            }

            await fetchRatings();

            setReviewForm({
                rating: 0,
                comment: '',
                fullName: '',
                email: ''
            });
            setIsEditingReview(false);
        } catch (error) {
            message.error("Unable to submit review");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
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
                                    {packageData?.images ? (
                                        <img
                                            className="package-image"
                                            draggable={false}
                                            alt={packageData.packageName}
                                            src={packageData.images[0]}
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
                                                    <Rate
                                                        allowHalf
                                                        disabled
                                                        value={averageRating} />
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
                                                reviews.map((review) => {
                                                    const isUserReview = auth && String(review.userId) === String(auth?.id);

                                                    return (
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
                                                                    <span className="package-review-name">
                                                                        {review.name}
                                                                        {isUserReview && (
                                                                            <span style={{ color: "#888", marginLeft: 6 }}>(You)</span>
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <Rate disabled value={review.rating} />
                                                            </div>
                                                            <p className="package-review-date">{review.date || 'Recently'}</p>
                                                            <p className="package-review-comment">{review.comment}</p>

                                                            {isUserReview && (
                                                                <Button
                                                                    type="link"
                                                                    style={{ padding: 0, marginTop: 4, border: 'none' }}
                                                                    onClick={() => {
                                                                        setReviewForm({
                                                                            rating: review.rating,
                                                                            comment: review.comment,
                                                                            fullName: review.name,
                                                                            email: review.email || ''
                                                                        });
                                                                        setIsEditingReview(true); // <-- mark as editing
                                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                                    }}
                                                                >
                                                                    Edit
                                                                </Button>
                                                            )}

                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <p>No reviews yet.</p>
                                            )}
                                        </div>

                                        <div className="package-review-form">
                                            <h3>Leave a review</h3>

                                            {/* Show guest fields ONLY if not logged in */}
                                            {!auth && (
                                                <>
                                                    <Input
                                                        placeholder="Full Name"
                                                        value={reviewForm.fullName}
                                                        onChange={(e) =>
                                                            setReviewForm(prev => ({
                                                                ...prev,
                                                                fullName: e.target.value
                                                            }))
                                                        }
                                                        style={{ marginBottom: 10 }}
                                                    />

                                                    <Input
                                                        placeholder="Email Address"
                                                        type="email"
                                                        value={reviewForm.email}
                                                        onChange={(e) =>
                                                            setReviewForm(prev => ({
                                                                ...prev,
                                                                email: e.target.value
                                                            }))
                                                        }
                                                        style={{ marginBottom: 10 }}
                                                    />
                                                </>
                                            )}

                                            <Rate
                                                value={reviewForm.rating}
                                                disabled={isSubmittingReview || (!isEditingReview && !!userReview)} // disable if already reviewed
                                                onChange={(value) =>
                                                    setReviewForm(prev => ({
                                                        ...prev,
                                                        rating: value
                                                    }))
                                                }
                                            />

                                            <Input.TextArea
                                                rows={4}
                                                disabled={isSubmittingReview || (!isEditingReview && !!userReview)} // disable if already reviewed
                                                placeholder="Share your experience..."
                                                value={reviewForm.comment}
                                                onChange={(e) =>
                                                    setReviewForm(prev => ({
                                                        ...prev,
                                                        comment: e.target.value
                                                    }))
                                                }
                                                style={{ marginTop: 10 }}
                                            />

                                            <Button
                                                disabled={isSubmittingReview || (!isEditingReview && !!userReview)} // disable if already reviewed
                                                className="package-action-secondary"
                                                onClick={handleSubmitReview}
                                                style={{ marginTop: 10 }}
                                            >
                                                {isEditingReview ? "Update Review" : "Submit Review"}
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
                                        size="large"
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


                <ChooseDateIntModal
                    open={isDateModalOpen}
                    onCancel={resetBookingFlow}
                    onProceed={handleProceedDate}
                    packageData={packageData}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                />

                <AllInOrLandDomesticModal
                    open={isArrangementDomModalOpen}
                    onCancel={resetBookingFlow}
                    onProceed={handleProceedArrangementDomestic}
                    onSelect={setArrangementSelectionDomestic}
                />

                <AllInOrLandArrangementModal
                    open={isArrangementModalOpen}
                    onCancel={resetBookingFlow}
                    onProceed={handleProceedArrangement}
                    onSelect={setArrangementSelection}
                />

                <DomesticQuotationModal
                    open={isDomesticQuotationOpen}
                    selectedOption={arrangementSelectionDomestic}
                    onCancel={resetBookingFlow}
                    onSubmit={handleSubmitQuotation}
                    hotels={packageData?.packageHotels || []}
                    airlines={packageData?.packageAirlines || []}
                    basePrice={packageData?.packagePricePerPax || 0}
                    days={packageData?.packageDuration || 1}
                    fixedItinerary={packageData?.packageItineraries || {}}
                    itinerary={Object.keys(packageData?.packageItineraries || {})
                        .sort((a, b) => Number(a.replace('day', '')) - Number(b.replace('day', '')))
                        .map((dayKey) => dayKey.replace('day', 'Day '))}
                />

                <PackageQuotationModal
                    open={isQuotationModalOpen}
                    selectedOption={arrangementSelection}
                    onCancel={resetBookingFlow}
                    onSubmit={handleSubmitQuotation}
                    hotels={packageData?.packageHotels || []}
                    airlines={packageData?.packageAirlines || []}
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
                    packageData={packageData}
                />

                <BookingSummaryModal
                    open={isBookingSummaryOpen}
                    onCancel={resetBookingFlow}
                    onProceed={handleProceedSummary}
                    packageData={packageData}
                    summary={summaryData}
                    successUrl={successUrl}
                    cancelUrl={cancelUrl}
                    bookingPayload={bookingPayload}
                />

                <BookingRegistrationModal
                    open={isBookingRegistrationOpen}
                    onCancel={resetBookingFlow}
                    onProceed={handleProceedRegistration}
                />

                <UploadPassportModal
                    open={isUploadPassportOpen}
                    onCancel={resetBookingFlow}
                    onProceed={handleProceedUploadPassport}
                    summary={summaryData}
                />

                <DisplayInvoiceModal
                    open={isDisplayInvoiceOpen}
                    onCancel={resetBookingFlow}
                    onProceed={handleProceedDisplayInvoice}
                    summary={summaryData}
                />

                <PaymentMethodsModal
                    open={isPaymentMethodsOpen}
                    onCancel={resetBookingFlow}
                    onProceed={handleProceedPaymentMethods}
                />

                {/* login modal */}
                <LoginModal
                    isOpenLogin={isLoginVisible}
                    isCloseLogin={() => setIsLoginVisible(false)}
                    onLoginSuccess={() => {
                        setIsLoginVisible(false);

                        if (packageData?.packageType === 'domestic') {
                            setIsArrangementDomModalOpen(true);
                        } else {
                            setIsArrangementModalOpen(true);
                        }
                    }}
                />

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
                            window.history.replaceState({}, '', `/package/${id}`);;
                        }}>
                            OK
                        </Button>
                    </div>
                </Modal>
            </div>
        </ConfigProvider>
    )
}
