import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tabs, Modal, Rate, Input, message, Card } from 'antd';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import dayjs from 'dayjs';
import axiosInstance from '../../config/axiosConfig';
import '../../style/client/packagepage.css'


import TopNavUser from '../../components/TopNavUser'
import AllInOrLandArrangementModal from '../../components/modals/AllInOrLandArrangementModal'
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




export default function PackagePage() {
    const { id } = useParams();
    const location = useLocation();
    const fetchCalled = useRef(false);
    const { auth } = useAuth();


    //login state
    const [isLoginVisible, setIsLoginVisible] = useState(false);

    //states for modals
    const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false)
    const [isDateModalOpen, setIsDateModalOpen] = useState(false)
    const [isArrangementModalOpen, setIsArrangementModalOpen] = useState(false)
    const [isSoloGroupModalOpen, setIsSoloGroupModalOpen] = useState(false)
    const [isTravelersModalOpen, setIsTravelersModalOpen] = useState(false)
    const [isBookingSummaryOpen, setIsBookingSummaryOpen] = useState(false)
    const [isBookingSuccessOpen, setIsBookingSuccessOpen] = useState(false)
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false)
    const [isBookingRegistrationOpen, setIsBookingRegistrationOpen] = useState(false)
    const [isUploadPassportOpen, setIsUploadPassportOpen] = useState(false)
    const [isDisplayInvoiceOpen, setIsDisplayInvoiceOpen] = useState(false)
    const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false)

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
        setIsSoloGroupModalOpen(false)
        setIsTravelersModalOpen(false)
        setIsBookingSummaryOpen(false)
        setIsBookingSuccessOpen(false)
        setIsQuotationModalOpen(false)
        setIsBookingRegistrationOpen(false)
        setIsUploadPassportOpen(false)
        setIsDisplayInvoiceOpen(false)
        setIsPaymentMethodsOpen(false)
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

        setIsArrangementModalOpen(true);
    };

    //proceed to next step and open arrangement modal
    const handleProceedDate = () => {
        setIsDateModalOpen(false)
        setIsSoloGroupModalOpen(true)
    }

    //proceed to next step and open fixed/custom modal
    const handleProceedArrangement = () => {
        setIsArrangementModalOpen(false)

        if (arrangementSelection === 'all-in') {
            setIsDateModalOpen(true)
        } else if (arrangementSelection === 'land') {
            setIsQuotationModalOpen(true)
        }
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
            setIsBookingSummaryOpen(true)
            return
        }
        setIsTravelersModalOpen(true)
    }

    //proceed to add ons modal then opens booking summary modal after that
    const handleProceedTravelers = (counts) => {
        setTravelerCounts(counts)
        setIsTravelersModalOpen(false)
        setIsBookingSummaryOpen(true)
    }

    //proceed to confirm booking and submit booking details to backend
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
        hotelOptions: selectedHotels,
        airlineOptions: selectedAirlines,
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

        // If guest user
        if (!auth) {
            if (!reviewForm.fullName.trim() || !reviewForm.email.trim()) {
                message.warning("Please enter your full name and email.");
                return;
            }
        }
        try {
            await axiosInstance.post('/rating/submit-rating', {
                packageId: id,
                rating: reviewForm.rating,
                review: reviewForm.comment.trim(),
                fullName: !auth ? reviewForm.fullName : undefined,
                email: !auth ? reviewForm.email : undefined
            });

            message.success('Review submitted');

            setReviewForm({
                rating: 0,
                comment: '',
                fullName: '',
                email: ''
            });

            fetchRatings();

        } catch (error) {
            message.error('Unable to submit review');
        }
    };


    useEffect(() => {
        if (fetchCalled.current) return;
        fetchCalled.current = true;
        const searchParams = new URLSearchParams(location.search);
        const checkoutToken = searchParams.get("checkoutToken");
        const bookingStatus = searchParams.get("booking");

        const checkoutDetails = localStorage.getItem('checkoutDetails');
        const checkoutDetailsParsed = checkoutDetails ? JSON.parse(checkoutDetails) : null;

        if (bookingStatus === "success" && checkoutToken) {
            setIsBookingSuccessOpen(true);

            axiosInstance.post("/booking/create-booking", {
                bookingDetails: checkoutDetailsParsed,
                checkoutToken
            })
                .then(res => {

                    axiosInstance.post("/transaction/create-transaction", {
                        bookingId: res.data._id,
                        amount: checkoutDetailsParsed.totalPrice,
                        method: "Online Payment",
                        status: "Successful",
                        packageName: checkoutDetailsParsed.packageName
                    })
                        .then(transactionRes => {
                            console.log("Transaction created successfully:", transactionRes.data);
                            localStorage.removeItem('checkoutDetails');
                        })
                        .catch(transactionErr => {
                            console.error("Error creating transaction:", transactionErr.response?.data || transactionErr.message);
                            message.error("Booking was successful, but there was an issue creating the transaction.");
                        });

                })
                .catch(err => {
                    console.error("Error creating booking:", err.response?.data || err.message);
                    message.error("Booking was successful, but there was an issue finalizing it. Please contact support.");
                });
            window.history.replaceState({}, '', location.pathname); //can replace with a thank you page
        }
    }, [location.search, location.pathname]);

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
                                            onChange={(value) =>
                                                setReviewForm(prev => ({
                                                    ...prev,
                                                    rating: value
                                                }))
                                            }
                                        />

                                        <Input.TextArea
                                            rows={4}
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
                                            className="package-action-secondary"
                                            onClick={handleSubmitReview}
                                            style={{ marginTop: 10 }}
                                        >
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

            <AllInOrLandArrangementModal
                open={isArrangementModalOpen}
                onCancel={resetBookingFlow}
                onProceed={handleProceedArrangement}
                onSelect={setArrangementSelection}
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
                    setIsArrangementModalOpen(true); // auto continue after login
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
