import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Tabs, Modal, Rate, Input, notification, Card, ConfigProvider, Spin, Alert, Carousel } from 'antd';
import { CheckCircleFilled, HeartFilled, HeartOutlined, StarFilled, StarOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../hooks/useAuth';
import dayjs from 'dayjs';
import apiFetch from '../../config/fetchConfig';

import '../../style/client/packagepage.css'

import AllInOrLandArrangementModal from '../../components/modals/AllInOrLandArrangementModal'
import ChooseDateIntModal from '../../components/modals/ChooseDateIntModal';



import LoginModal from '../../components/modals/LoginModal';
import SignupModal from '../../components/modals/SignupModal';


export default function PackagePage() {
    const location = useLocation()
    const { packageItem: statePackageItem } = location.state || {}
    const hashPackageItem = location.hash ? decodeURIComponent(location.hash.replace(/^#/, '')) : null
    const packageItem = statePackageItem || hashPackageItem || null
    const { auth } = useAuth();
    const { setBookingData } = useBooking();

    const navigate = useNavigate();


    //login state
    const [isLoginVisible, setIsLoginVisible] = useState(false);
    const [isSignupVisible, setIsSignupVisible] = useState(false);


    //modal states
    const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false)
    const [isDateModalOpen, setIsDateModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isArrangementModalOpen, setIsArrangementModalOpen] = useState(false)
    const [isPackageWishlistedModalOpen, setIsPackageWishlistedModalOpen] = useState(false)
    const [isRatingEditedModalOpen, setIsRatingEditedModalOpen] = useState(false)
    const [isRatingSubmittedModalOpen, setIsRatingSubmittedModalOpen] = useState(false)
    const [isRatingDeletedModalOpen, setIsRatingDeletedModalOpen] = useState(false)
    const [wishlistedIds, setWishlistedIds] = useState(() => new Set())
    const [isPassportConfirmModalOpen, setIsPassportConfirmModalOpen] = useState(false)
    const [isPassportRecommendModalOpen, setIsPassportRecommendModalOpen] = useState(false)
    const [isVisaConfirmModalOpen, setIsVisaConfirmModalOpen] = useState(false)
    const [isVisaRecommendModalOpen, setIsVisaRecommendModalOpen] = useState(false)


    //booking flow states
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedDatePrice, setSelectedDatePrice] = useState(0)
    const [selectedDateRate, setSelectedDateRate] = useState(0)
    const [selectedDateSlots, setSelectedDateSlots] = useState(0)
    const [travelerCounts, setTravelerCounts] = useState(null)
    const [arrangementSelection, setArrangementSelection] = useState(null)
    const [soloGroupSelection, setSoloGroupSelection] = useState(null)


    //review states
    const [showReviews, setShowReviews] = useState(false)
    const [visibleReviewCount, setVisibleReviewCount] = useState(3);
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviews, setReviews] = useState([])
    const [reviewForm, setReviewForm] = useState({
        rating: 0,
        comment: ''
    });
    const [hasValidBooking, setHasValidBooking] = useState(false);
    const [bookingCheckLoading, setBookingCheckLoading] = useState(false);
    const reviewFormRef = useRef(null);


    //package data states
    const [packageData, setPackageData] = useState(null)
    const [packageLoading, setPackageLoading] = useState(true)
    const [packageError, setPackageError] = useState('')

    const currentAuthUserId = auth?.id || auth?._id || null
    const currentAuthUsername = auth?.username ? String(auth.username).trim().toLowerCase() : null


    //reset booking flow states when user cancels or completes the booking process
    const resetBookingFlow = () => {
        setSelectedDate(null)
        setSelectedDatePrice(0)
        setSelectedDateRate(0)
        setSelectedDateSlots(0)
        setTravelerCounts(null)
        setArrangementSelection(null)
        setSoloGroupSelection(null)

        setIsDateModalOpen(false)
        setIsArrangementModalOpen(false)
    }

    const resolvedPackageItem = packageItem


    //fetch package data when packageItem changes, and handle loading and error states
    useEffect(() => {
        const fetchPackage = async () => {
            if (!packageItem) {
                setPackageLoading(false)
                return
            }
            try {
                setPackageLoading(true)
                const response = await apiFetch.get(`/package/get-package/${packageItem}`)

                setPackageData(response); //temp origin and destination for testing, replace with actual data from package when available
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
    }, [packageItem])


    //fetch wishlist data when auth changes, and handle loading and error states
    useEffect(() => {
        const fetchWishlist = async () => {
            if (!auth) {
                setWishlistedIds(new Set())
                return
            }
            try {
                const response = await apiFetch.get('/wishlist')
                const wishlist = response?.wishlist || []
                const ids = new Set(
                    wishlist
                        .map((entry) => entry?.packageId?._id || entry?.packageId || entry?.id)
                        .filter(Boolean)
                        .map((id) => String(id))
                )
                setWishlistedIds(ids)
            } catch {
                setWishlistedIds(new Set())
            }
        }

        fetchWishlist()
    }, [auth])


    //get ratings for the package and map them to a format suitable for display, handle errors by setting reviews to an empty array
    const fetchRatings = useCallback(async () => {
        if (!packageItem) return
        try {
            const response = await apiFetch.get(`/rating/package/${packageItem}/ratings`)
            const mapped = (response || []).map((rating) => ({
                id: rating._id,
                userId: rating.userId?._id,
                name: rating.userId?.username || "User",
                avatar: rating.userId?.profileImage || "",
                rating: rating.rating,
                comment: rating.review || "",
                createdAt: rating.createdAt,
                date: rating.createdAt
                    ? dayjs(rating.createdAt).format("MMM D, YYYY")
                    : "Recently",
            }));
            setReviews(mapped)
        } catch {
            setReviews([])
        }
    }, [packageItem])

    useEffect(() => {
        fetchRatings()
    }, [fetchRatings])


    //check if the user has a valid booking for this package with fully paid status, and update the hasValidBooking state accordingly
    useEffect(() => {
        const checkUserBooking = async () => {
            if (!auth || !packageItem) {
                setHasValidBooking(false)
                return
            }

            try {
                setBookingCheckLoading(true)
                const response = await apiFetch.get('/booking/my-bookings')
                const bookings = Array.isArray(response)
                    ? response
                    : response?.bookings || response?.data?.bookings || response?.data || []

                //CHECK IF USER HAS A BOOKING FOR THIS PACKAGE WITH FULLY PAID STATUS
                const validBooking = bookings.find((booking) => {
                    const bookingPackageId = String(booking?.packageItem || '').trim()
                    const bookingStatus = String(booking?.status || '').trim().toLowerCase()
                    const packageIdMatch = bookingPackageId === String(packageItem)
                    const statusMatch = bookingStatus === 'fully paid'

                    return packageIdMatch && statusMatch
                })

                setHasValidBooking(Boolean(validBooking))
            } catch (error) {
                console.error('Failed to check user bookings:', error)
                setHasValidBooking(false)
            } finally {
                setBookingCheckLoading(false)
            }
        }

        checkUserBooking()
    }, [auth, packageItem])


    //calculate average rating, rounded average rating for stars, and rating breakdown for display
    const averageRating = useMemo(() => {
        if (!reviews.length) return 0
        const total = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0)
        return total / reviews.length
    }, [reviews])


    //calculate average rating stars, rounded to the nearest whole number
    const averageRatingStars = useMemo(() => Math.round(averageRating || 0), [averageRating])


    //calculate rating breakdown for each star level (1-5) for display
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


    //user already rated this package, find their review for editing or deleting
    const userReview = useMemo(() => {
        if (!auth) return null

        return reviews.find(
            (review) => {
                const sameUserId = currentAuthUserId
                    ? String(review.userId) === String(currentAuthUserId)
                    : false

                if (sameUserId) return true

                if (!currentAuthUsername) return false
                return String(review.name || '').trim().toLowerCase() === currentAuthUsername
            }
        )
    }, [reviews, auth, currentAuthUserId, currentAuthUsername])


    const sortedReviews = useMemo(() => {
        return [...reviews].sort((a, b) => {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
    }, [reviews]);

    const visibleReviews = useMemo(() => {
        return sortedReviews.slice(0, visibleReviewCount);
    }, [sortedReviews, visibleReviewCount]);


    //itinerary content for itinerary tab
    const itineraryContent = useMemo(() => {
        const itineraries = packageData?.packageItineraries || {}
        const itineraryImagesByDay = packageData?.packageItineraryImages || {}
        const days = Object.keys(itineraries)
            .sort((a, b) => Number(a.replace('day', '')) - Number(b.replace('day', '')))

        if (days.length === 0) {
            return <p>No itinerary details available.</p>
        }
        return (
            <div>
                {days.map((day) => {
                    const dayItems = itineraries[day] || []
                    const dayImages = (itineraryImagesByDay[day] || dayItems
                        .flatMap((item) => (Array.isArray(item?.itineraryImages) ? item.itineraryImages : []))
                        .filter(Boolean)
                        .slice(0, 3))
                    const dayLabel = day.replace('day', 'Day ')

                    return (
                        <div key={day} className="itinerary-day">
                            {dayImages.length > 0 && (
                                <div className="itinerary-carousel">
                                    <Carousel autoplay dots>
                                        {dayImages.map((src, index) => (
                                            <div key={`${day}-image-${index}`} className="itinerary-carousel-slide">
                                                <img
                                                    className="itinerary-carousel-image"
                                                    src={src}
                                                    alt={`${dayLabel} ${index + 1}`}
                                                />
                                            </div>
                                        ))}
                                    </Carousel>
                                </div>
                            )}
                            <div className="itinerary-day-header">
                                <img src="/images/checklist-svgrepo-com.svg" alt="Checklist" className="itinerary-day-icon" />
                                <strong>{dayLabel}</strong>
                            </div>
                            <ul>
                                {dayItems.map((item, index) => (
                                    <li key={`${day}-${index}`}>
                                        <div>{item.activity}</div>
                                        {item.isOptional && (
                                            <div>
                                                Optional: {item.optionalActivity} - ₱{item.optionalPrice?.toLocaleString()}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </div>
        )
    }, [packageData])


    //inclusions and exclusions content for inclusions and exclusions tab
    const inclusionsExclusionsContent = useMemo(() => {
        const inclusions = packageData?.packageInclusions || []
        const exclusions = packageData?.packageExclusions || []
        return (
            <div style={{ display: 'grid', gap: 16 }}>
                <div className="inclusions-container">
                    <div className="section-header-packagepage">Inclusions</div>
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
                <div className="exclusions-container">
                    <div className="section-header">Exclusions</div>
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


    //terms and conditions content for terms and conditions tab
    const termsContent = useMemo(() => {
        const terms = packageData?.packageTermsConditions || []
        if (!terms.length) return <p>No terms and conditions listed.</p>
        return (
            <div className="terms-container">
                <div className="section-header">Terms and Conditions</div>
                <ul>
                    {terms.map((item, index) => (
                        <li key={`term-${index}`}>{item}</li>
                    ))}
                </ul>
            </div>
        )
    }, [packageData])


    //tab items for the package details section, including itinerary, inclusions/exclusions, and terms/conditions
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


    // handle wishlist click, check if user is authenticated, if not show login modal, if yes add package to wishlist and show confirmation modal
    const handleWishlistClick = async () => {

        if (!auth) {
            setIsLoginVisible(true);
            return;
        }

        const targetPackage = packageItem
        if (!targetPackage) {
            notification.error({ message: 'Unable to add wishlist item. Package is missing.', placement: 'topRight' })
            return
        }

        if (wishlistedIds.has(String(targetPackage))) {
            notification.info({ message: 'This package is already in your wishlist.', placement: 'topRight' })
            return
        }

        try {
            await apiFetch.post('/wishlist/add', { packageId: targetPackage })
            setIsWishlistModalOpen(true)
            setIsPackageWishlistedModalOpen(true)
            setWishlistedIds((prev) => {
                const next = new Set(prev)
                next.add(String(targetPackage))
                return next
            })
        } catch (error) {
            const errorMessage =
                error?.data?.message || 'Unable to add to wishlist. Please try again.'
            notification.error({ message: errorMessage, placement: 'topRight' })
        }
    }


    // derive summary data for booking process, including traveler counts, total price, and package details
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

    const totalTravelers = ['adult', 'child', 'infant', 'senior']
        .reduce((sum, key) => sum + (travelerCounts?.[key] || 0), 0)

    const totalPrice = (packageData?.packagePricePerPax || 0) * totalTravelers

    const summaryData = {
        packageId: packageItem,
        packageName: packageData?.packageName || 'Package Details',
        packagePricePerPax: packageData?.packagePricePerPax + selectedDateRate || 0,
        packageSoloRate: packageData?.packageSoloRate + selectedDateRate || 0,
        packageChildRate: packageData?.packageChildRate + selectedDateRate || 0,
        packageInfantRate: packageData?.packageInfantRate + selectedDateRate || 0,
        packageDiscountPercent: packageData?.packageDiscountPercent || 0,
        packageDeposit: (() => {
            const baseDeposit = Number(packageData?.packageDeposit || 0)
            const discountPercent = Number(packageData?.packageDiscountPercent || 0)
            return discountPercent > 0
                ? baseDeposit * (1 - discountPercent / 100)
                : baseDeposit
        })(),
        packageType: packageData?.packageType || 'fixed',
        travelers: travelerSummary,
        travelerCount: travelerCounts,
        totalPrice,
        groupType: soloGroupSelection,
        hotelOptions: packageData?.packageHotels,
        airlineOptions: packageData?.packageAirlines,
        travelDate: selectedDate,
        travelDatePrice: selectedDatePrice,
        travelDateRate: selectedDateRate,
        travelDateSlots: selectedDateSlots,
        inclusions: packageData?.packageInclusions || [],
        exclusions: packageData?.packageExclusions || [],
        itinerary: packageData?.packageItineraries || {},
        packageItineraryImages: packageData?.packageItineraryImages || {},
        visaRequired: packageData?.visaRequired || false,
        images: packageData?.images || []
    }


    //submit review funtion
    const handleSubmitReview = async () => {
        if (!auth) {
            setIsLoginVisible(true)
            return
        }

        if (!hasValidBooking && !isEditingReview) {
            notification.error({
                message: 'You can only rate packages you have booked and fully paid for.',
                placement: 'topRight'
            })
            return
        }

        if (!reviewForm.rating || !reviewForm.comment.trim()) {
            notification.warning({
                message: 'Please provide a rating and comment.',
                placement: 'topRight'
            })
            return
        }

        const reviewId = userReview?.id

        if (isEditingReview && !reviewId) {
            notification.error({
                message: 'Unable to find the review to update. Please refresh the page.',
                placement: 'topRight'
            })
            return
        }

        setIsSubmittingReview(true)

        try {
            if (isEditingReview) {
                await apiFetch.put(`/rating/${reviewId}`, {
                    rating: reviewForm.rating,
                    review: reviewForm.comment.trim()
                })

                setIsRatingEditedModalOpen(true)
            } else {
                await apiFetch.post('/rating/submit-rating', {
                    packageId: packageItem,
                    rating: reviewForm.rating,
                    review: reviewForm.comment.trim()
                })

                setIsRatingSubmittedModalOpen(true)
            }

            await fetchRatings()

            setReviewForm({
                rating: 0,
                comment: ''
            })

            setIsEditingReview(false)
        } catch (error) {
            console.error('Unable to save review:', error)

            notification.error({
                message:
                    error?.data?.message ||
                    error?.response?.data?.message ||
                    'Unable to save review',
                placement: 'topRight'
            })
        } finally {
            setIsSubmittingReview(false)
        }
    }


    //delete review funtion
    const handleDeleteReview = async () => {
        if (!auth) {
            setIsLoginVisible(true)
            return
        }

        const reviewId = userReview?.id

        if (!reviewId) {
            notification.error({
                message: 'No review to delete.',
                placement: 'topRight'
            })
            return
        }

        setIsSubmittingReview(true)

        try {
            await apiFetch.delete(`/rating/${reviewId}`)
            await fetchRatings()

            setReviewForm({
                rating: 0,
                comment: ''
            })

            setIsEditingReview(false)
            setIsDeleteModalOpen(false)
            setIsRatingDeletedModalOpen(true)
        } catch (error) {
            console.error('Unable to delete review:', error)

            notification.error({
                message:
                    error?.data?.message ||
                    error?.response?.data?.message ||
                    'Unable to delete review',
                placement: 'topRight'
            })
        } finally {
            setIsSubmittingReview(false)
        }
    }


    //open delete review modal
    const handleOpenDeleteModal = () => {
        if (!auth) {
            setIsLoginVisible(true)
            return
        }

        if (!userReview?.id) {
            notification.error({ message: 'No review to delete.', placement: 'topRight' })
            return
        }

        setIsDeleteModalOpen(true)
    }


    //proceed to booking process with summary data, navigate to booking process page
    const handleProceedDate = () => {
        setIsDateModalOpen(false)

        setBookingData(summaryData)
        navigate("/booking-process")
    }


    //handle booking process, check if user is authenticated, if not show login modal, if yes check package type and show appropriate modals for arrangement selection or date selection
    const handleBookingProcess = () => {
        if (!auth) {
            setIsLoginVisible(true);
            return;
        }

        const pkgType = (packageData?.packageType || packageData?.packageCategory || '').toString().toLowerCase();
        const isInternational = pkgType === 'international';
        if (isInternational) {
            setIsPassportConfirmModalOpen(true);
            return;
        }

        setIsArrangementModalOpen(true)
    };


    //proceed to arrangement selection
    const handleProceedArrangement = () => {
        setIsArrangementModalOpen(false)
        if (arrangementSelection === 'fixed') {
            setIsDateModalOpen(true)
        } else if (arrangementSelection === 'private' && packageData.packageType === "international") {
            navigate('/international-quotation', { state: { packageItem: packageItem } })
        } else {
            navigate('/domestic-quotation', { state: { packageItem: packageItem } })
        }
    }


    //derive discounted package price per pax and discounted price
    const packageDiscountPercent = Number(packageData?.packageDiscountPercent || 0)
    const basePackagePricePerPax = Number(packageData?.packagePricePerPax || 0)
    const basePackageDeposit = Number(packageData?.packageDeposit || 0)
    const discountedPackagePricePerPax = packageDiscountPercent > 0
        ? basePackagePricePerPax * (1 - packageDiscountPercent / 100)
        : basePackagePricePerPax
    const discountedPackageDeposit = packageDiscountPercent > 0
        ? basePackageDeposit * (1 - packageDiscountPercent / 100)
        : basePackageDeposit
    const isWishlisted = Boolean(resolvedPackageItem && wishlistedIds.has(String(resolvedPackageItem)))
    const hasUserReview = Boolean(userReview)
    const totalSlots = useMemo(() => {
        return (packageData?.packageSpecificDate || []).reduce(
            (sum, date) => sum + Number(date?.slots || 0),
            0
        )
    }, [packageData])
    const heroImages = useMemo(() => {
        const images = packageData?.images || []
        if (!images.length) return []
        return [images[0], images[1] || images[0], images[2] || images[0]]
    }, [packageData])




    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >

            <div>
                <Spin spinning={packageLoading} description="Loading package details..." size="large">
                    <div className="packagepage-container">
                        <div className="package-box">
                            <div className="package-left">
                                <div className="package-header">
                                    <div className="package-title-group">
                                        <h1 className="package-title">{packageData?.packageName || 'Package Details'}</h1>
                                        {packageData?.packageDuration && (
                                            <p className="package-duration">{packageData.packageDuration} days</p>
                                        )}
                                    </div>

                                    <div className="package-meta-row">
                                        <span className="package-rating-chip">
                                            <StarFilled />
                                            {averageRating ? averageRating.toFixed(1) : '0.0'} ({reviews.length} reviews)
                                        </span>
                                    </div>

                                    <div className="package-actions-left">
                                        <Button
                                            type='primary'
                                            className="package-action-secondary"
                                            icon={isWishlisted ? <HeartFilled /> : <HeartOutlined />}
                                            onClick={handleWishlistClick}
                                        >
                                            Add to Wishlist
                                        </Button>
                                        <Button
                                            type='primary'
                                            className="package-action-outline"
                                            icon={hasUserReview ? <StarFilled /> : <StarOutlined />}
                                            onClick={() => setShowReviews((prev) => !prev)}
                                        >
                                            {showReviews ? 'Back to Details' : 'Review and Ratings'}
                                        </Button>
                                    </div>
                                </div>



                                <div className="package-gallery">
                                    <div className="package-gallery-main">
                                        {heroImages[0] ? (
                                            <img
                                                className="package-image"
                                                draggable={false}
                                                alt={packageData?.packageName || 'Package'}
                                                src={heroImages[0]}
                                            />
                                        ) : (
                                            <div className="package-image-placeholder">No image available</div>
                                        )}
                                    </div>
                                    <div className="package-gallery-grid">
                                        {heroImages[1] ? (
                                            <img
                                                className="package-image"
                                                draggable={false}
                                                alt={`${packageData?.packageName || 'Package'} preview 1`}
                                                src={heroImages[1]}
                                            />
                                        ) : (
                                            <div className="package-image-placeholder">No image available</div>
                                        )}
                                        {heroImages[2] ? (
                                            <img
                                                className="package-image"
                                                draggable={false}
                                                alt={`${packageData?.packageName || 'Package'} preview 2`}
                                                src={heroImages[2]}
                                            />
                                        ) : (
                                            <div className="package-image-placeholder">No image available</div>
                                        )}
                                    </div>
                                </div>

                                <div className="package-detail-section">
                                    <h3>Package Details</h3>
                                    <div className="package-detail-grid">
                                        {packageData?.packageDuration && (
                                            <div className="package-detail-item">
                                                <span>Duration</span>
                                                <strong>{packageData.packageDuration} days</strong>
                                            </div>
                                        )}
                                        <div className="package-detail-item">
                                            <span>Type</span>
                                            <strong>{packageData?.packageType?.toUpperCase() || 'Flexible'}</strong>
                                        </div>
                                        <div className="package-detail-item">
                                            <span>Deposit</span>
                                            <strong>
                                                {packageDiscountPercent > 0 && (
                                                    <span
                                                        style={{
                                                            textDecoration: 'line-through',
                                                            color: '#9aa0a6',
                                                            fontSize: '0.85rem',
                                                            marginRight: 8
                                                        }}
                                                    >
                                                        ₱{basePackageDeposit.toLocaleString()}
                                                    </span>
                                                )}
                                                <span>₱{discountedPackageDeposit.toLocaleString()}</span>
                                            </strong>
                                        </div>
                                        <div className="package-detail-item">
                                            <span>Visa</span>
                                            <strong>{packageData?.visaRequired ? 'Required' : 'Not required'}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="package-description">
                                    {packageLoading ? (
                                        <p>Loading package details...</p>
                                    ) : packageError ? (
                                        <p>{packageError}</p>
                                    ) : (
                                        <p>{packageData?.packageDescription || 'No description available.'}</p>
                                    )}
                                </div>

                                {packageData?.packageVideo && (
                                    <div className="package-video-section" style={{ marginTop: 20 }}>
                                        <video
                                            muted
                                            autoPlay
                                            loop
                                            controls
                                            playsInline
                                            preload="metadata"
                                            src={packageData.packageVideo}
                                            style={{ width: '100%', maxHeight: 420, borderRadius: 12, backgroundColor: '#000' }}
                                        />
                                    </div>
                                )}

                                {!showReviews && (
                                    <Tabs
                                        className="package-tabs"
                                        defaultActiveKey="1"
                                        size="large"
                                        items={itemsTab}
                                    />
                                )}
                            </div>

                            <div className="package-right">
                                <div className="package-price-card">
                                    <div className="package-price-label">Price per pax</div>
                                    <div className="package-pricepax">
                                        <span>
                                            ₱{discountedPackagePricePerPax.toLocaleString() || '--'}
                                        </span>
                                        {packageDiscountPercent > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 8, }}>
                                                <span
                                                    style={{
                                                        textDecoration: 'line-through',
                                                        color: '#9aa0a6',
                                                        fontSize: '12px',
                                                        marginRight: 8,
                                                        marginLeft: 8,
                                                        display: 'inline-block'
                                                    }}
                                                >
                                                    ₱{basePackagePricePerPax.toLocaleString()}
                                                </span>

                                                <span
                                                    style={{
                                                        marginLeft: 8,
                                                        color: '#e72323',
                                                        fontWeight: 600,
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    -{packageDiscountPercent}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="package-side-meta">
                                        <div className="package-side-row">
                                            <span>Slots</span>
                                            <strong>{totalSlots > 0 ? totalSlots : 'Sold out'}</strong>
                                        </div>
                                        <div className="package-side-row">
                                            <span>Deposit</span>
                                            <strong>
                                                {packageDiscountPercent > 0 && (
                                                    <span
                                                        style={{
                                                            textDecoration: 'line-through',
                                                            color: '#9aa0a6',
                                                            fontSize: '0.85rem',
                                                            marginRight: 8
                                                        }}
                                                    >
                                                        ₱{basePackageDeposit.toLocaleString()}
                                                    </span>
                                                )}
                                                <span>₱{discountedPackageDeposit.toLocaleString()}</span>
                                            </strong>
                                        </div>
                                    </div>
                                    <Button disabled={(() => {
                                        if (packageLoading || !packageData) return true;
                                        const totalSlots = (packageData.packageSpecificDate || []).reduce((sum, d) => sum + Number(d.slots || 0), 0);
                                        return totalSlots <= 0;
                                    })()} type='primary' className="package-availability-button" onClick={handleBookingProcess}>
                                        Check Availability
                                    </Button>


                                </div>


                                {showReviews ? (
                                    <Card className="package-reviews-card" bordered={false}>
                                        <div className="package-reviews">
                                            <div className="package-review-summary">
                                                <div>
                                                    <p className="package-review-label">Average rating</p>
                                                    <div className="package-review-average">
                                                        <Rate
                                                            className='package-review-average-stars'
                                                            disabled
                                                            allowHalf
                                                            value={averageRatingStars}
                                                        />
                                                        <span className="package-review-average-value">
                                                            {averageRating ? averageRating.toFixed(1) : '0.0'}
                                                        </span>
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
                                                    visibleReviews.map((review) => {
                                                        const reviewOwnerId = review?.userId ? String(review.userId) : null
                                                        const reviewOwnerName = String(review?.name || '').trim().toLowerCase()
                                                        const isUserReview = Boolean(
                                                            auth && (
                                                                (currentAuthUserId && reviewOwnerId === String(currentAuthUserId)) ||
                                                                (currentAuthUsername && reviewOwnerName === currentAuthUsername)
                                                            )
                                                        )

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
                                                                <p
                                                                    className="package-review-comment"
                                                                    style={{
                                                                        whiteSpace: "pre-wrap",
                                                                        overflowWrap: "anywhere",
                                                                    }}
                                                                >
                                                                    {review.comment}
                                                                </p>

                                                                {isUserReview && (
                                                                    <div>
                                                                        <Button
                                                                            type="link"
                                                                            style={{ padding: 0, marginTop: 4, border: 'none', color: "#305797" }}
                                                                            onClick={() => {
                                                                                setReviewForm({
                                                                                    rating: review.rating,
                                                                                    comment: review.comment
                                                                                })

                                                                                setIsEditingReview(true)

                                                                                requestAnimationFrame(() => {
                                                                                    reviewFormRef.current?.scrollIntoView({
                                                                                        behavior: 'smooth',
                                                                                        block: 'center'
                                                                                    })
                                                                                })
                                                                            }}
                                                                        >
                                                                            Edit
                                                                        </Button>
                                                                        <Button
                                                                            type="link"
                                                                            danger
                                                                            style={{ padding: 0, marginTop: 4, marginLeft: 12, border: 'none', color: "#992A46" }}
                                                                            disabled={isSubmittingReview}
                                                                            onClick={handleOpenDeleteModal}
                                                                        >
                                                                            Delete
                                                                        </Button>
                                                                    </div>
                                                                )}

                                                            </div>
                                                        )
                                                    })
                                                ) : (
                                                    <p>No reviews yet.</p>
                                                )}

                                                {visibleReviewCount < sortedReviews.length && (
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "center",
                                                            marginTop: 16,
                                                        }}
                                                    >
                                                        <Button
                                                            type="link"
                                                            className="package-load-more-reviews"
                                                            onClick={() => {
                                                                setVisibleReviewCount((previousCount) =>
                                                                    previousCount + 3
                                                                );
                                                            }}
                                                        >
                                                            Load More Reviews
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            <div ref={reviewFormRef} className="package-review-form">
                                                <h3>{isEditingReview ? 'Update your review' : 'Leave a review'}</h3>

                                                {!isEditingReview && !hasValidBooking && (
                                                    <Alert
                                                        message="Book This Package First"
                                                        description="You must avail the package first before being able to submit a review"
                                                        type="info"
                                                        showIcon
                                                        style={{ marginBottom: 16, fontFamily: 'Montserrat', borderRadius: 6 }}
                                                    />
                                                )}

                                                <Rate
                                                    value={reviewForm.rating}
                                                    disabled={isSubmittingReview || (!isEditingReview && !!userReview) || (!isEditingReview && !hasValidBooking)} // disable if already reviewed or no valid booking
                                                    onChange={(value) =>
                                                        setReviewForm(prev => ({
                                                            ...prev,
                                                            rating: value
                                                        }))
                                                    }
                                                />

                                                <Input.TextArea
                                                    maxLength={200}
                                                    rows={4}
                                                    disabled={isSubmittingReview || (!isEditingReview && !!userReview) || (!isEditingReview && !hasValidBooking)} // disable if already reviewed or no valid booking
                                                    placeholder="Share your experience..."
                                                    value={reviewForm.comment}
                                                    onChange={(e) => {
                                                        const cleanedValue = e.target.value
                                                            .replace(/[^a-zA-Z0-9\s.,!?'"():;-]/g, "")
                                                            .replace(/[^\S\r\n]{2,}/g, " ")
                                                            .replace(/^\s+/, "");

                                                        setReviewForm((prev) => ({
                                                            ...prev,
                                                            comment: cleanedValue,
                                                        }));
                                                    }}
                                                    style={{ marginTop: 10 }}
                                                />
                                                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                                    <Button
                                                        type='primary'
                                                        disabled={isSubmittingReview || (!isEditingReview && !!userReview) || (!isEditingReview && !hasValidBooking)} // disable if already reviewed or no valid booking
                                                        className="package-action-secondary"
                                                        onClick={handleSubmitReview}
                                                        style={{ marginTop: 10 }}
                                                        title={(!isEditingReview && !hasValidBooking) ? "You must book and fully pay for this package to leave a review" : ""}
                                                    >
                                                        {isEditingReview ? "Update Review" : "Submit Review"}
                                                    </Button>
                                                    {userReview && hasValidBooking && (
                                                        <Button
                                                            type='primary'
                                                            disabled={isSubmittingReview}
                                                            className="package-action-remove"
                                                            onClick={handleOpenDeleteModal}
                                                            style={{ marginTop: 10 }}
                                                        >
                                                            Delete Review
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ) : (
                                    <>
                                        <div
                                            style={{
                                                marginTop: 16,
                                                padding: 16,
                                                borderRadius: 10,
                                                backgroundColor: '#305797'
                                            }}
                                        >
                                            <p
                                                className="package-price-label-cancel"
                                                style={{ color: '#fff' }}
                                            >
                                                CANCELLATION POLICY
                                            </p>
                                            <p
                                                style={{
                                                    fontSize: '13px',
                                                    color: '#fff',
                                                    textAlign: 'justify'
                                                }}
                                            >
                                                All tour packages will not be converted to any travel funds in case the tour will not push through whether it
                                                be government mandated, due to natural calamities, etc. Tour package purchase is non-refundable , non-reroutable, non-rebookable, and non-transferable
                                                unless otherwise stated and is due to natural calamities and force majeur that is beyond our control otherwise NON-REFUNDABLE.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <AllInOrLandArrangementModal
                        open={isArrangementModalOpen}
                        onCancel={resetBookingFlow}
                        onProceed={handleProceedArrangement}
                        onSelect={setArrangementSelection}
                    />

                    {/* choose date */}
                    <ChooseDateIntModal
                        open={isDateModalOpen}
                        onCancel={resetBookingFlow}
                        onProceed={handleProceedDate}
                        packageData={packageData}
                        selectedDate={selectedDate}
                        selectedDatePrice={selectedDatePrice}
                        selectedDateRate={selectedDateRate}
                        onDateChange={({ date, price, rate, slots }) => {
                            setSelectedDate(date);
                            setSelectedDatePrice(price);
                            setSelectedDateRate(rate);
                            setSelectedDateSlots(slots || 0);
                        }}
                    />

                    {/* PASSPORT CONFIRMATION MODAL: Ask if user already has a passport for this trip */}
                    <Modal
                        open={isPassportConfirmModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Close' }}
                        footer={null}
                        centered={true}
                        onCancel={() => setIsPassportConfirmModalOpen(false)}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Passport Required</h1>
                            <p className='signup-success-text'>This international package requires a passport. Do you already have a valid passport for this trip?</p>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                <Button
                                    className="package-availability-button"
                                    type='primary'
                                    onClick={() => {
                                        const pkgType = (packageData?.packageType || packageData?.packageCategory || '').toString().toLowerCase();
                                        const requiresVisa = pkgType === 'international' && Boolean(packageData?.visaRequired);
                                        setIsPassportConfirmModalOpen(false);
                                        if (requiresVisa) {
                                            setIsVisaConfirmModalOpen(true);
                                        } else {
                                            setIsArrangementModalOpen(true);
                                        }
                                    }}
                                >
                                    Yes - I have a Passport
                                </Button>
                                <Button
                                    className="package-availability-button"
                                    type='primary'
                                    onClick={() => {
                                        setIsPassportConfirmModalOpen(false);
                                        setIsPassportRecommendModalOpen(true);
                                    }}
                                >
                                    No - I need a Passport
                                </Button>
                            </div>
                        </div>
                    </Modal>

                    {/* PASSPORT RECOMMENDATION MODAL: Recommend getting a passport before booking or proceed to passport services */}
                    <Modal
                        open={isPassportRecommendModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Close' }}
                        footer={null}
                        centered={true}
                        onCancel={() => setIsPassportRecommendModalOpen(false)}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Passport is Highly Recommended</h1>
                            <p className='signup-success-text'>We highly recommend that you obtain a passport before booking this tour package to avoid issues during travel.</p>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                <Button
                                    className="package-availability-button"
                                    type='primary'
                                    onClick={() => {
                                        const pkgType = (packageData?.packageType || packageData?.packageCategory || '').toString().toLowerCase();
                                        const requiresVisa = pkgType === 'international' && Boolean(packageData?.visaRequired);
                                        setIsPassportRecommendModalOpen(false);
                                        if (requiresVisa) {
                                            setIsVisaConfirmModalOpen(true);
                                        } else {
                                            setIsArrangementModalOpen(true);
                                        }
                                    }}
                                >
                                    Continue to Booking
                                </Button>
                                <Button
                                    className="package-availability-button"
                                    type='primary'
                                    onClick={() => {
                                        setIsPassportRecommendModalOpen(false);
                                        navigate('/passandvisa-service', { state: { passportItem: packageItem, passportName: packageData?.packageName } });
                                    }}
                                >
                                    Proceed to Passport Services
                                </Button>
                            </div>
                        </div>
                    </Modal>

                    {/* VISA CONFIRMATION MODAL: Ask if user already has a visa for this trip */}
                    <Modal
                        open={isVisaConfirmModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Close' }}
                        footer={null}
                        centered={true}
                        onCancel={() => setIsVisaConfirmModalOpen(false)}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Visa Required</h1>
                            <p className='signup-success-text'>This international package requires a visa. Do you already have a valid visa for this trip?</p>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                <Button
                                    className="package-availability-button"
                                    type='primary'
                                    onClick={() => {
                                        setIsVisaConfirmModalOpen(false);
                                        setIsArrangementModalOpen(true);
                                    }}
                                >
                                    Yes — I have a visa
                                </Button>
                                <Button
                                    className="package-availability-button"
                                    type='primary'
                                    onClick={() => {
                                        setIsVisaConfirmModalOpen(false);
                                        setIsVisaRecommendModalOpen(true);
                                    }}
                                >
                                    No — I need a visa
                                </Button>
                            </div>
                        </div>
                    </Modal>

                    {/* VISA RECOMMENDATION MODAL: Recommend getting a visa before booking or proceed to visa services */}
                    <Modal
                        open={isVisaRecommendModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Close' }}
                        footer={null}
                        centered={true}
                        onCancel={() => setIsVisaRecommendModalOpen(false)}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>We Recommend a Visa</h1>
                            <p className='signup-success-text'>We highly recommend that you obtain a visa before booking this tour package to avoid issues during travel.</p>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                <Button
                                    className="package-availability-button"
                                    type='primary'
                                    onClick={() => {
                                        setIsVisaRecommendModalOpen(false);
                                        setIsArrangementModalOpen(true);
                                    }}
                                >
                                    Continue to Booking
                                </Button>
                                <Button
                                    className="package-availability-button"
                                    type='primary'
                                    onClick={() => {
                                        setIsVisaRecommendModalOpen(false);
                                        // navigate to Pass and Visa Services page and pass package info
                                        navigate('/passandvisa-service', { state: { visaItem: packageItem, visaName: packageData?.packageName } });
                                    }}
                                >
                                    Proceed to Visa Services
                                </Button>
                            </div>
                        </div>
                    </Modal>

                    {/* login modal */}
                    <LoginModal
                        isOpenLogin={isLoginVisible}
                        isCloseLogin={() => setIsLoginVisible(false)}
                        onOpenSignup={() => {
                            setIsLoginVisible(false);
                            setIsSignupVisible(true);
                        }}
                        onLoginSuccess={() => {
                            setIsLoginVisible(false);
                        }}
                    />

                    <SignupModal
                        isOpenSignup={isSignupVisible}
                        isCloseSignup={() => setIsSignupVisible(false)}
                        onOpenLogin={() => {
                            setIsSignupVisible(false);
                            setIsLoginVisible(true);
                        }}
                    />


                    {/* DELETE CONFIRMATION */}
                    <Modal
                        open={isDeleteModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        centered={true}
                        onCancel={() => {
                            setIsDeleteModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Delete Review?</h1>
                            <p className='signup-success-text'>Are you sure you want to delete this review?</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    danger
                                    loading={isSubmittingReview}
                                    disabled={isSubmittingReview}
                                    className='logout-confirm-btn'
                                    onClick={handleDeleteReview}
                                >
                                    Delete
                                </Button>
                                <Button
                                    type='primary'
                                    className='logout-cancel-btn'
                                    onClick={() => {
                                        setIsDeleteModalOpen(false);
                                    }}
                                >
                                    Cancel
                                </Button>

                            </div>

                        </div>
                    </Modal>



                    {/* PACKAGE HAS BEEN WISHLISTED MODAL */}
                    <Modal
                        open={isPackageWishlistedModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        centered={true}
                        onCancel={() => {
                            setIsPackageWishlistedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Package Added!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
                            </div>

                            <p className='signup-success-text'>This Package has been added to your Wishlist.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsPackageWishlistedModalOpen(false);
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>


                    {/* RATING HAS BEEN SUBMITTED MODAL */}
                    <Modal
                        open={isRatingSubmittedModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        centered={true}
                        onCancel={() => {
                            setIsRatingSubmittedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Review Submitted!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
                            </div>

                            <p className='signup-success-text'>Your review has been successfully submitted.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsRatingSubmittedModalOpen(false);
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>



                    {/* RATING HAS BEEN EDITED MODAL */}
                    <Modal
                        open={isRatingEditedModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        centered={true}
                        onCancel={() => {
                            setIsRatingEditedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Review Edited!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
                            </div>

                            <p className='signup-success-text'>Your review has been successfully edited.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsRatingEditedModalOpen(false);
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>


                    {/* RATING HAS BEEN DELETED MODAL */}
                    <Modal
                        open={isRatingDeletedModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        centered={true}
                        onCancel={() => {
                            setIsRatingDeletedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Review Deleted!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
                            </div>

                            <p className='signup-success-text'>Your review has been successfully deleted.</p>

                            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                                <Button
                                    type='primary'
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        setIsRatingDeletedModalOpen(false);
                                    }}
                                >
                                    Continue
                                </Button>
                            </div>

                        </div>
                    </Modal>

                </Spin>
            </div>
        </ConfigProvider >
    )
}
