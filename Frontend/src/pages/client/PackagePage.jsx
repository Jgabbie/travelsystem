import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tabs, Modal, Rate, Input, message, Card, ConfigProvider, Spin } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../hooks/useAuth';
import dayjs from 'dayjs';
import apiFetch from '../../config/fetchConfig';
import '../../style/client/packagepage.css'

import AllInOrLandArrangementModal from '../../components/modals/AllInOrLandArrangementModal'
import ChooseDateIntModal from '../../components/modals/ChooseDateIntModal';
import LoginModal from '../../components/modals/LoginModal';
import TopNavUser from '../../components/topnav/TopNavUser';


export default function PackagePage() {
    const { id } = useParams();
    const { auth } = useAuth();
    const { setBookingData } = useBooking();

    const navigate = useNavigate();

    //login state
    const [isLoginVisible, setIsLoginVisible] = useState(false);

    //states for modals
    const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false)
    const [isDateModalOpen, setIsDateModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isArrangementModalOpen, setIsArrangementModalOpen] = useState(false)
    const [isPackageWishlistedModalOpen, setIsPackageWishlistedModalOpen] = useState(false)
    const [isRatingEditedModalOpen, setIsRatingEditedModalOpen] = useState(false)
    const [isRatingSubmittedModalOpen, setIsRatingSubmittedModalOpen] = useState(false)
    const [isRatingDeletedModalOpen, setIsRatingDeletedModalOpen] = useState(false)

    //states for booking details
    const [selectedDate, setSelectedDate] = useState(null)
    const [selectedDatePrice, setSelectedDatePrice] = useState(0)
    const [selectedDateRate, setSelectedDateRate] = useState(0)
    const [selectedDateSlots, setSelectedDateSlots] = useState(0)
    const [travelerCounts, setTravelerCounts] = useState(null)
    const [arrangementSelection, setArrangementSelection] = useState(null)
    const [soloGroupSelection, setSoloGroupSelection] = useState(null)

    //states for reviews
    const [showReviews, setShowReviews] = useState(false)
    const [isEditingReview, setIsEditingReview] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviews, setReviews] = useState([])
    const [reviewForm, setReviewForm] = useState({
        rating: 0,
        comment: ''
    });

    //states for package details
    const [packageData, setPackageData] = useState(null)
    const [packageLoading, setPackageLoading] = useState(true)
    const [packageError, setPackageError] = useState('')

    //reset all booking states, used when user cancels booking flow
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

    //fetch package details from backend using the id from the URL and handle loading and error states
    useEffect(() => {
        const fetchPackage = async () => {
            if (!id) {
                setPackageLoading(false)
                return
            }
            try {
                setPackageLoading(true)
                const response = await apiFetch.get(`/package/get-package/${id}`)
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
    }, [id])

    //get ratings for this package and map to display format, also used in fetchRatings function after submitting review to refresh the reviews
    const fetchRatings = useCallback(async () => {
        if (!id) return
        try {
            const response = await apiFetch.get(`/rating/package/${id}/ratings`)
            const mapped = (response || []).map((rating) => ({
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
            await apiFetch.post('/wishlist/add', { packageId })
            setIsWishlistModalOpen(true)
            setIsPackageWishlistedModalOpen(true)
        } catch (error) {
            const errorMessage =
                error?.data?.message || 'Unable to add to wishlist. Please try again.'
            message.error(errorMessage)
        }
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

    const totalTravelers = ['adult', 'child', 'infant', 'senior']
        .reduce((sum, key) => sum + (travelerCounts?.[key] || 0), 0)

    const totalPrice = (packageData?.packagePricePerPax || 0) * totalTravelers

    const summaryData = {
        packageId: packageData?._id || null,
        packageName: packageData?.packageName || 'Package Details',
        packagePricePerPax: packageData?.packagePricePerPax + selectedDateRate || 0,
        packageSoloRate: packageData?.packageSoloRate + selectedDateRate || 0,
        packageChildRate: packageData?.packageChildRate + selectedDateRate || 0,
        packageInfantRate: packageData?.packageInfantRate + selectedDateRate || 0,
        packageDiscountPercent: packageData?.packageDiscountPercent || 0,
        packageDeposit: packageData?.packageDeposit || 0,
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
        visaRequired: packageData?.visaRequired || false,
        images: packageData?.images || []
    }

    //submit review to backend and refresh reviews after successful submission
    const handleSubmitReview = async () => {
        if (!auth) {
            setIsLoginVisible(true)
            return
        }

        if (!reviewForm.rating || !reviewForm.comment.trim()) {
            message.warning("Please provide a rating and comment.");
            return;
        }

        setIsSubmittingReview(true);


        try {
            if (isEditingReview) {
                // UPDATE review
                await apiFetch.put(`/rating/${userReview.id}`, {
                    rating: reviewForm.rating,
                    review: reviewForm.comment.trim()
                });
                setIsRatingEditedModalOpen(true)
            } else {
                // CREATE review
                await apiFetch.post('/rating/submit-rating', {
                    packageId: id,
                    rating: reviewForm.rating,
                    review: reviewForm.comment.trim()
                });
                setIsRatingSubmittedModalOpen(true)
            }

            await fetchRatings();

            setReviewForm({
                rating: 0,
                comment: ''
            });
            setIsEditingReview(false);
        } catch (error) {
            message.error("Unable to submit review");
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleDeleteReview = async () => {
        if (!auth) {
            setIsLoginVisible(true)
            return
        }

        if (!userReview?.id) {
            message.error('No review to delete.')
            return
        }
        setIsSubmittingReview(true)

        try {
            await apiFetch.delete(`/rating/${userReview.id}`)

            await fetchRatings()

            setReviewForm({
                rating: 0,
                comment: ''
            })
            setIsEditingReview(false)
            setIsDeleteModalOpen(false)
            setIsRatingDeletedModalOpen(true)
        } catch (error) {
            message.error('Unable to delete review')
        } finally {
            setIsSubmittingReview(false)
        }
    }

    const handleOpenDeleteModal = () => {
        if (!auth) {
            setIsLoginVisible(true)
            return
        }

        if (!userReview?.id) {
            message.error('No review to delete.')
            return
        }

        setIsDeleteModalOpen(true)
    }

    const handleProceedDate = () => {
        setIsDateModalOpen(false)

        setBookingData(summaryData)
        navigate("/booking-process")
    }

    const handleBookingProcess = () => {
        if (!auth) {
            setIsLoginVisible(true);
            return;
        }


        setIsArrangementModalOpen(true)

    };

    const handleProceedArrangement = () => {
        setIsArrangementModalOpen(false)

        if (arrangementSelection === 'fixed') {
            setIsDateModalOpen(true)
        } else if (arrangementSelection === 'private' && packageData.packageType === "international") {
            navigate('/international-quotation', { state: { packageId: packageData?._id } })
        } else {
            navigate('/domestic-quotation', { state: { packageId: packageData?._id } })
        }
    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >

            <div>
                <Spin spinning={packageLoading} tip="Loading package details..." size="large">
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
                                    <Button type='primary' className="package-action-secondary" onClick={handleWishlistClick}>Add to Wishlist</Button>
                                    <Button type='primary' className="package-action-outline" onClick={() => setShowReviews((prev) => !prev)}>
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
                                                                    <div>
                                                                        <Button
                                                                            type="link"
                                                                            style={{ padding: 0, marginTop: 4, border: 'none', color: "#305797" }}
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
                                            </div>

                                            <div className="package-review-form">
                                                <h3>Leave a review</h3>

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
                                                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                                    <Button
                                                        type='primary'
                                                        disabled={isSubmittingReview || (!isEditingReview && !!userReview)} // disable if already reviewed
                                                        className="package-action-secondary"
                                                        onClick={handleSubmitReview}
                                                        style={{ marginTop: 10 }}
                                                    >
                                                        {isEditingReview ? "Update Review" : "Submit Review"}
                                                    </Button>
                                                    {userReview && (
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
                                        <div className="package-price-card">
                                            <div className="package-price-label">Price per pax</div>
                                            <div className="package-pricepax">
                                                ₱{packageData?.packagePricePerPax?.toLocaleString() || '--'}
                                            </div>
                                            <Button disabled={(() => {
                                                if (packageLoading || !packageData) return true;
                                                const totalSlots = (packageData.packageSpecificDate || []).reduce((sum, d) => sum + Number(d.slots || 0), 0);
                                                return totalSlots <= 0;
                                            })()} type='primary' className="package-availability-button" onClick={handleBookingProcess}>
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

                    {/* login modal */}
                    <LoginModal
                        isOpenLogin={isLoginVisible}
                        isCloseLogin={() => setIsLoginVisible(false)}
                        onLoginSuccess={() => {
                            setIsLoginVisible(false);
                        }}
                    />


                    {/* DELETE CONFIRMATION */}
                    <Modal
                        open={isDeleteModalOpen}
                        className='signup-success-modal'
                        closable={{ 'aria-label': 'Custom Close Button' }}
                        footer={null}
                        style={{ top: 220 }}
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
                                    className='logout-confirm-btn'
                                    onClick={() => {
                                        handleDeleteReview();
                                        setIsDeleteModalOpen(false);
                                    }}
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
                        style={{ top: 220 }}
                        onCancel={() => {
                            setIsPackageWishlistedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Package Added!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
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
                        style={{ top: 220 }}
                        onCancel={() => {
                            setIsRatingSubmittedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Review Submitted!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
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
                        style={{ top: 220 }}
                        onCancel={() => {
                            setIsRatingEditedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Review Edited!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
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
                        style={{ top: 220 }}
                        onCancel={() => {
                            setIsRatingDeletedModalOpen(false);
                        }}
                    >
                        <div className='signup-success-container'>
                            <h1 className='signup-success-heading'>Review Deleted!</h1>

                            <div>
                                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
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
