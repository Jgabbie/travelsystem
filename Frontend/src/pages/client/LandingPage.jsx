import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Input, Modal, Select, Slider, Image, ConfigProvider, InputNumber, notification } from 'antd';
import { SearchOutlined, FacebookFilled, InstagramFilled, LeftOutlined, RightOutlined, EnvironmentOutlined, ClockCircleOutlined, CompassOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import LoginModal from '../../components/modals/LoginModal';
import apiFetch from '../../config/fetchConfig';
import '../../style/client/landingpage.css'
import Chatbot from '../../components/chatbot/Chatbot';
import { useAuth } from '../../hooks/useAuth';
//import { useBooking } from '../../context/BookingContext';

export default function LandingPage() {
    const navigate = useNavigate()
    //const location = useLocation()
    const { auth, authLoading } = useAuth()
    //const { clearBookingData } = useBooking()

    const packagesRef = useRef(null)
    const exploreRef = useRef(null)
    const aboutusRef = useRef(null)

    const [budgetRange, setBudgetRange] = useState([12000, 30000]);
    const [activity, setActivity] = useState([]);
    const [type, setType] = useState('Tour Type');
    const [duration, setDuration] = useState('Length of Stay');
    const [durationOptions, setDurationOptions] = useState([
        { value: 'Length of Stay', label: 'Length of Stay' },
    ]);
    const [pax, setPax] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoginVisible, setIsLoginVisible] = useState(false)
    const [isChatbotOpen, setIsChatbotOpen] = useState(false)
    const [chatMessage, setChatMessage] = useState('')

    const [openModalSuccess, setOpenModalSuccess] = useState(false)
    const [openModalError, setOpenModalError] = useState(false)
    const [fallbackPopularPackages, setFallbackPopularPackages] = useState([])
    const [showNextStepsModal, setShowNextStepsModal] = useState(false)

    const [popularPackages, setPopularPackages] = useState([])
    const [forYouPackages, setForYouPackages] = useState([])
    const [domesticPackages, setDomesticPackages] = useState([])
    const [activityTags, setActivityTags] = useState([])
    const [isSending, setIsSending] = useState(false);
    const [isPopularLoading, setIsPopularLoading] = useState(false)
    const [isForYouLoading, setIsForYouLoading] = useState(false)
    const [forYouError, setForYouError] = useState('')
    const [recommendationMethod, setRecommendationMethod] = useState('')
    const [isDomesticLoading, setIsDomesticLoading] = useState(false)
    const [exploreSlideIndex, setExploreSlideIndex] = useState(0)
    const [popularSlideIndex, setPopularSlideIndex] = useState(0)
    const [popularCardsPerView, setPopularCardsPerView] = useState(3)

    const handleActivityChange = (values) => {
        if (values.length > 3) {
            notification.warning({ message: 'Select up to 3 tags only.', placement: 'topRight' });
            return;
        }
        setActivity(values);
    };

    const [contactValues, setContactValues] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })

    const [contactErrors, setContactErrors] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })

    const validateContact = () => {
        let errors = {
            name: '',
            email: '',
            subject: '',
            message: '',
        };

        let isValid = true;

        // NAME
        if (!contactValues.name.trim()) {
            errors.name = 'Name is required';
            isValid = false;
        } else if (contactValues.name.trim().length < 2) {
            errors.name = 'Name must be at least 2 characters';
            isValid = false;
        }

        // EMAIL
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!contactValues.email.trim()) {
            errors.email = 'Email is required';
            isValid = false;
        } else if (!emailRegex.test(contactValues.email)) {
            errors.email = 'Invalid email format';
            isValid = false;
        }

        // SUBJECT
        if (!contactValues.subject.trim()) {
            errors.subject = 'Subject is required';
            isValid = false;
        }

        // MESSAGE
        if (!contactValues.message.trim()) {
            errors.message = 'Message is required';
            isValid = false;
        } else if (contactValues.message.trim().length < 10) {
            errors.message = 'Message must be at least 10 characters';
            isValid = false;
        }

        setContactErrors(errors);
        return isValid;
    };

    const exploreSlides = [
        {
            src: '/images/Homepage1.png',
            title: 'Discover the Philippines',
            subtitle: 'Sunlit beaches, island escapes, and soulful local journeys.'
        },
        {
            src: '/images/Homepage2.png',
            title: 'City Lights to Nature Trails',
            subtitle: 'From skyline adventures to quiet mountain mornings.'
        },
        {
            src: '/images/LandingPage_Banner.png',
            title: 'Your Next Adventure Awaits',
            subtitle: 'Handpicked tours that match your pace and budget.'
        }
    ]

    //SEARCH BAR -------------------------------------------------------------
    const handleSearch = () => {
        const params = new URLSearchParams();
        const trimmed = searchTerm.trim();

        if (trimmed) {
            params.set('q', trimmed);
        }

        if (Array.isArray(activity) && activity.length) {
            activity.forEach((tag) => params.append('tag', tag));
        }

        if (duration && duration !== 'Length of Stay') {
            const parsedDays = Number.parseInt(duration, 10);
            if (Number.isFinite(parsedDays)) {
                params.set('maxDays', String(parsedDays));
            }
        }

        if (type && type !== 'Tour Type') {
            params.set('tourType', type);
        }

        if (pax) {
            const parsedTravelers = Number.parseInt(pax, 10);
            if (Number.isFinite(parsedTravelers)) {
                params.set('travelers', String(parsedTravelers));
            }
        }

        params.set('minBudget', String(budgetRange[0]));
        params.set('maxBudget', String(budgetRange[1]));

        const query = params.toString();
        navigate(query ? `/destinations-packages?${query}` : '/destinations-packages');
    }


    // SEND MESSAGE ---------------------------------------------------------------------
    const sendMessage = async () => {
        if (!validateContact()) return;

        setIsSending(true);

        try {
            await apiFetch.post('/email/contact', contactValues);
            setOpenModalSuccess(true);
            setContactValues({
                name: '',
                email: '',
                subject: '',
                message: '',
            });
            setContactErrors({
                name: '',
                email: '',
                subject: '',
                message: '',
            });
        } catch (error) {
            setOpenModalError(true);
        } finally {
            setIsSending(false);
        }
    };

    const handleNextStepsModalOption = (path) => {
        setShowNextStepsModal(false);
        navigate(path);
    };

    //FETCH PACKAGES
    useEffect(() => {
        const fetchPopularPackages = async () => {
            setIsPopularLoading(true)
            try {
                const response = await apiFetch.get('/package/popular-packages', {
                    params: { limit: 3 }
                })

                const packages = (response || []).map((pkg) => ({
                    packageItem: pkg.packageItem,
                    packageCode: pkg.packageCode,
                    packageName: pkg.packageName,
                    packageDescription: pkg.packageDescription,
                    packageImages: Array.isArray(pkg.images)
                        ? pkg.images
                        : Array.isArray(pkg.packageImages)
                            ? pkg.packageImages
                            : [],
                    bookingCount: pkg.bookingCount || 0,
                    packageType: pkg.packageType || pkg.tourType || '',
                    discountPercent: Number.isFinite(Number(pkg.packageDiscountPercent)) ? Number(pkg.packageDiscountPercent) : (Number.isFinite(Number(pkg.discountPercent)) ? Number(pkg.discountPercent) : (Number.isFinite(Number(pkg.discountPercentOff)) ? Number(pkg.discountPercentOff) : 0))
                }))

                const trimmed = packages.slice(0, 3)
                setPopularPackages(trimmed)

                if (trimmed.length === 0) {
                    const fallbackResponse = await apiFetch.get('/package/get-packages')
                    const fallbackPackages = (fallbackResponse || [])
                        .slice(0, 3)
                        .map((pkg) => ({
                            id: pkg._id,
                            packageCode: pkg.packageCode,
                            packageName: pkg.packageName,
                            packageDescription: pkg.packageDescription,
                            packageImages: Array.isArray(pkg.images)
                                ? pkg.images
                                : Array.isArray(pkg.packageImages)
                                    ? pkg.packageImages
                                    : []
                            ,
                            packageType: pkg.packageType || pkg.tourType || '',
                            discountPercent: Number.isFinite(Number(pkg.packageDiscountPercent)) ? Number(pkg.packageDiscountPercent) : (Number.isFinite(Number(pkg.discountPercent)) ? Number(pkg.discountPercent) : 0)
                        }))

                    setFallbackPopularPackages(fallbackPackages)
                } else {
                    setFallbackPopularPackages([])
                }
            } catch (error) {
                console.error('Failed to load popular packages:', error)
                setPopularPackages([])
                try {
                    const fallbackResponse = await apiFetch.get('/package/get-packages')
                    const fallbackPackages = (fallbackResponse || [])
                        .slice(0, 3)
                        .map((pkg) => ({
                            id: pkg._id,
                            packageCode: pkg.packageCode,
                            packageName: pkg.packageName,
                            packageDescription: pkg.packageDescription,
                            packageImages: Array.isArray(pkg.images)
                                ? pkg.images
                                : Array.isArray(pkg.packageImages)
                                    ? pkg.packageImages
                                    : [],
                            packageType: pkg.packageType || pkg.tourType || '',
                            discountPercent: Number.isFinite(Number(pkg.packageDiscountPercent)) ? Number(pkg.packageDiscountPercent) : (Number.isFinite(Number(pkg.discountPercent)) ? Number(pkg.discountPercent) : 0)
                        }))

                    setFallbackPopularPackages(fallbackPackages)
                } catch (fallbackError) {
                    console.error('Failed to load fallback packages:', fallbackError)
                    setFallbackPopularPackages([])
                }
            } finally {
                setIsPopularLoading(false)
            }
        }

        fetchPopularPackages()
    }, [])

    useEffect(() => {
        if (!auth && !authLoading) {
            setIsChatbotOpen(false)
        }
    }, [auth, authLoading])

    useEffect(() => {
        if (authLoading) return

        if (!auth) {
            setForYouPackages([])
            setForYouError('')
            setRecommendationMethod('')
            return
        }

        let isMounted = true

        const fetchForYouPackages = async () => {
            setIsForYouLoading(true)
            setForYouError('')

            try {
                const response = await apiFetch.get('/recommendations')
                const packages = (response?.packages || response?.tours || []).map((pkg) => ({
                    id: pkg?._id || pkg?.packageId || pkg?.id || '',
                    packageCode: pkg?.packageCode || pkg?._id || pkg?.packageId || pkg?.id || '',
                    packageName: pkg?.packageName || 'Recommended package',
                    packageDescription: pkg?.packageDescription || '',
                    packageImages: Array.isArray(pkg.images)
                        ? pkg.images
                        : Array.isArray(pkg.packageImages)
                            ? pkg.packageImages
                            : [],
                    packageType: pkg?.packageType || pkg?.tourType || '',
                    discountPercent: Number.isFinite(Number(pkg.packageDiscountPercent))
                        ? Number(pkg.packageDiscountPercent)
                        : (Number.isFinite(Number(pkg.discountPercent)) ? Number(pkg.discountPercent) : 0)
                }))

                if (!isMounted) return

                setForYouPackages(packages.slice(0, 3))
                setRecommendationMethod(response?.method || '')
            } catch (error) {
                if (!isMounted) return
                console.error('Failed to load recommendations:', error)
                setForYouPackages([])
                setRecommendationMethod('')

                if (error?.status === 401) {
                    setForYouError('Log in to get personalized recommendations.')
                } else if (error?.status === 503) {
                    setForYouError('Recommendations are temporarily unavailable. Please try again in a moment.')
                } else {
                    setForYouError('Could not load recommendations right now.')
                }
            } finally {
                if (isMounted) {
                    setIsForYouLoading(false)
                }
            }
        }

        fetchForYouPackages()

        return () => {
            isMounted = false
        }
    }, [auth, authLoading])

    // Check for next steps modal flag from preferences
    useEffect(() => {
        const shouldShowModal = localStorage.getItem('showNextStepsModal');
        if (shouldShowModal === 'true') {
            setShowNextStepsModal(true);
            // Remove the flag so it doesn't show on subsequent visits
            localStorage.removeItem('showNextStepsModal');
        }
    }, []);

    //FETCH DOMESTIC PACKAGES -----------------------------------------------
    useEffect(() => {
        const fetchDomesticPackages = async () => {
            setIsDomesticLoading(true)
            try {
                const response = await apiFetch.get('/package/get-packages')
                const packages = (response || [])
                    .filter((pkg) => String(pkg.packageType).toLowerCase() === 'domestic')
                    .map((pkg) => ({
                        id: pkg._id,
                        packageName: pkg.packageName,
                        packageDescription: pkg.packageDescription,
                        image: Array.isArray(pkg.images) && pkg.images.length > 0 ? pkg.images[0] : ''
                    }))

                setDomesticPackages(packages)
            } catch (error) {
                console.error('Failed to load domestic packages:', error)
                setDomesticPackages([])
            } finally {
                setIsDomesticLoading(false)
            }
        }

        fetchDomesticPackages()
    }, [])

    useEffect(() => {
        const fetchActivityTags = async () => {
            try {
                const response = await apiFetch.get('/package/get-packages-for-users')
                const unique = new Set()

                    ; (response || []).forEach((pkg) => {
                        pkg.packageTags?.forEach((tag) => unique.add(tag))
                    })

                setActivityTags(Array.from(unique))

                // Build duration options based on available package durations
                try {
                    const durationsSet = new Set()
                        ; (response || []).forEach((pkg) => {
                            const d = Number(pkg.packageDuration)
                            if (Number.isFinite(d) && d > 0) durationsSet.add(d)
                        })

                    const durationsArr = Array.from(durationsSet).sort((a, b) => a - b)
                    const options = [{ value: 'Length of Stay', label: 'Length of Stay' }, ...durationsArr.map((d) => ({
                        value: `${d} Days`,
                        label: d === 1 ? `${d} Day` : `${d} Days`,
                    }))]

                    setDurationOptions(options)
                } catch (errDur) {
                    console.error('Failed to compute durations:', errDur)
                }
            } catch (error) {
                console.error('Failed to load activity tags:', error)
                setActivityTags([])
            }
        }

        fetchActivityTags()
    }, [])

    useEffect(() => {
        if (exploreSlides.length === 0) return undefined

        const interval = setInterval(() => {
            setExploreSlideIndex((prev) => (prev + 1) % exploreSlides.length)
        }, 4000)

        return () => clearInterval(interval)
    }, [exploreSlides.length])

    const displayedPopularPackages = popularPackages.length > 0 ? popularPackages : fallbackPopularPackages

    useEffect(() => {
        const calculateCardsPerView = () => {
            if (typeof window === 'undefined') return 3
            if (window.innerWidth <= 768) return 1
            if (window.innerWidth <= 1024) return 2
            return 3
        }

        const handleResize = () => {
            setPopularCardsPerView(calculateCardsPerView())
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const popularSlides = []
    for (let index = 0; index < displayedPopularPackages.length; index += popularCardsPerView) {
        popularSlides.push(displayedPopularPackages.slice(index, index + popularCardsPerView))
    }

    useEffect(() => {
        if (popularSlides.length > 0) {
            setPopularSlideIndex(0)
        }
    }, [popularSlides.length])

    const formatDescription = (text, maxLength = 160) => {
        if (!text) return 'No description available.'
        if (text.length <= maxLength) return text
        return `${text.slice(0, maxLength).trim()}...`
    }

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                    colorInfo: '#305797',
                    colorSuccess: '#4CAF50',
                    colorError: '#F44336',
                    colorWarning: '#FF9800',
                    colorText: '#333',
                    colorBgContainer: '#fff',
                },
            }}
        >
            <div className="landing-container">


                {/* FIRST SECTION */}
                <div className="hero-section">
                    <div className="hero-overlay"></div>
                    <div className="hero-content">
                        <h1>Your Link to the World</h1>
                        <p>Discover affordable vacation travel and tours. Book your dream activities and start exploring the world!</p>
                    </div>

                    <div className="search-widget">

                        <div className="search-row">
                            <input
                                type="text"
                                placeholder="Search your destination..."
                                className="search-input-land"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearch();
                                    }
                                }}
                            />
                            <Button type='primary' className="search-btn" onClick={handleSearch}>
                                <SearchOutlined />
                            </Button>
                        </div>

                    </div>
                </div>

                <div className='page-link-buttons-container'>
                    <Button className='page-link-buttons' type='link' onClick={() => packagesRef.current?.scrollIntoView({ behavior: 'smooth' })} >Popular Packages</Button>
                    <Button className='page-link-buttons' type='link' onClick={() => exploreRef.current?.scrollIntoView({ behavior: 'smooth' })} >Explore Now!</Button>
                    <Button className='page-link-buttons' type='link' onClick={() => aboutusRef.current?.scrollIntoView({ behavior: 'smooth' })} >About Us</Button>
                </div>


                {/* SECOND SECTION */}
                <div ref={packagesRef}>
                    <div className="hero-section-packages">
                        <div className="hero-overlay-packages"></div>
                        <div className="hero-content-packages">
                            <h1>Book Your Tours Now</h1>
                            <p>
                                Ready for your next adventure?  Book your international tour with M&RC Travel today and explore the world with ease and comfort. From stunning destinations to well-planned itineraries, we handle all the details so you can focus on making unforgettable memories. Don’t wait—your dream journey starts now!
                            </p>
                            <Button className='packages-button' onClick={() => { navigate('/destinations-packages') }}>BROWSE TOUR PACKAGES</Button>
                        </div>
                    </div>

                    <div className='popular-packages-section'>
                        <h1 className='popular-packages-text' style={{ color: "#ffffff" }}>Popular Packages</h1>

                        <div className='popular-packages'>
                            {isPopularLoading ? (
                                <p>Loading popular packages...</p>
                            ) : popularPackages.length === 0 && fallbackPopularPackages.length === 0 ? (
                                <p>No popular packages available yet.</p>
                            ) : (
                                <div className="popular-packages-carousel">
                                    <Button
                                        aria-label="Previous package"
                                        type="default"
                                        shape="circle"
                                        className="popular-carousel-button"
                                        icon={<LeftOutlined />}
                                        disabled={popularSlides.length <= 1}
                                        onClick={() => {
                                            setPopularSlideIndex((prev) => {
                                                const total = popularSlides.length
                                                return total === 0 ? 0 : (prev - 1 + total) % total
                                            })
                                        }}
                                    />

                                    <div className="popular-packages-viewport">
                                        <div
                                            className="popular-packages-track"
                                            style={{ transform: `translateX(-${popularSlideIndex * 100}%)` }}
                                        >
                                            {popularSlides.map((slide, slideIndex) => (
                                                <div className="popular-packages-slide" key={`popular-slide-${slideIndex}`}>
                                                    {slide.map((pkg) => (
                                                        <Card
                                                            className='package-card popular-packages-card'
                                                            key={pkg.packageItem}
                                                            hoverable
                                                            onClick={() => navigate('/package', { state: { packageItem: pkg.packageItem } })}
                                                            cover={
                                                                pkg.packageImages && pkg.packageImages.length > 0 ? (
                                                                    <img
                                                                        style={{ height: 250 }}
                                                                        draggable={false}
                                                                        alt={pkg.packageName}
                                                                        src={pkg.packageImages[0]}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        style={{
                                                                            height: 250,
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            background: '#f5f5f5',
                                                                            color: '#777'
                                                                        }}
                                                                    >
                                                                        No Image
                                                                    </div>
                                                                )
                                                            }
                                                        >
                                                            {pkg.discountPercent > 0 && (
                                                                <span className="popular-discount-badge">-{pkg.discountPercent}% OFF</span>
                                                            )}

                                                            <h2>{pkg.packageName}</h2>
                                                            <div className="popular-card-meta">
                                                                <span className="popular-package-type">{(pkg.packageType && String(pkg.packageType).length) ? String(pkg.packageType).charAt(0).toUpperCase() + String(pkg.packageType).slice(1) : 'Package'}</span>
                                                            </div>
                                                        </Card>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        aria-label="Next package"
                                        type="default"
                                        shape="circle"
                                        className="popular-carousel-button"
                                        icon={<RightOutlined />}
                                        disabled={popularSlides.length <= 1}
                                        onClick={() => {
                                            setPopularSlideIndex((prev) => {
                                                const total = popularSlides.length
                                                return total === 0 ? 0 : (prev + 1) % total
                                            })
                                        }}
                                    />

                                    <div className="popular-packages-dots">
                                        {popularSlides.map((_, dotIndex) => (
                                            <span
                                                key={`popular-dot-${dotIndex}`}
                                                className={dotIndex === popularSlideIndex ? 'active' : ''}
                                                onClick={() => setPopularSlideIndex(dotIndex)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className='for-you-section'>
                        <h1 className='for-you-text'>FOR YOU</h1>

                        {recommendationMethod === 'collaborative' ? (
                            <p className='for-you-method'>These are the recommended packages based on the packages you have rated.</p>
                        ) : (
                            <p className='for-you-method'>These are the recommended packages based on your preferences.</p>
                        )}

                        {!auth && !authLoading ? (
                            <div className='for-you-empty-state'>
                                <p>Log in to get personalized package recommendations.</p>
                                <Button type='primary' onClick={() => setIsLoginVisible(true)}>Log In</Button>
                            </div>
                        ) : isForYouLoading ? (
                            <p className='for-you-status-text'>Loading recommendations...</p>
                        ) : forYouError ? (
                            <p className='for-you-status-text'>{forYouError}</p>
                        ) : forYouPackages.length === 0 ? (
                            <p className='for-you-status-text'>No recommendations yet. Rate more packages to improve suggestions.</p>
                        ) : (
                            <div className='for-you-grid'>
                                {forYouPackages.map((pkg) => (
                                    <Card
                                        className='package-card for-you-card'
                                        key={pkg.packageCode || pkg.id}
                                        hoverable
                                        onClick={() => navigate('/package', { state: { packageCode: pkg.packageCode } })}
                                        cover={
                                            pkg.packageImages && pkg.packageImages.length > 0 ? (
                                                <img
                                                    style={{ height: 250 }}
                                                    draggable={false}
                                                    alt={pkg.packageName}
                                                    src={pkg.packageImages[0]}
                                                />
                                            ) : (
                                                <div
                                                    style={{
                                                        height: 250,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        background: '#f5f5f5',
                                                        color: '#777'
                                                    }}
                                                >
                                                    No Image
                                                </div>
                                            )
                                        }
                                    >
                                        {pkg.discountPercent > 0 && (
                                            <span className="popular-discount-badge">-{pkg.discountPercent}% OFF</span>
                                        )}

                                        <h2>{pkg.packageName}</h2>
                                        <p>{formatDescription(pkg.packageDescription, 120)}</p>
                                        <div className="popular-card-meta">
                                            <span className="popular-package-type">{(pkg.packageType && String(pkg.packageType).length) ? String(pkg.packageType).charAt(0).toUpperCase() + String(pkg.packageType).slice(1) : 'Package'}</span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>


                {/* THIRD SECTION */}
                <div ref={exploreRef} className="explore-carousel-section">
                    <div className="explore-carousel">
                        <div
                            className="explore-carousel-track"
                            style={{ transform: `translateX(-${exploreSlideIndex * 100}%)` }}
                        >
                            {exploreSlides.map((slide, index) => (
                                <div className="explore-carousel-slide" key={`explore-slide-${index}`}>
                                    <img
                                        src={slide.src}
                                        alt={slide.title}
                                        draggable={false}
                                    />
                                    <div className="explore-carousel-overlay"></div>
                                    <div className="explore-carousel-text">
                                        <h2>{slide.title}</h2>
                                        <p>{slide.subtitle}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="explore-carousel-dots">
                            {exploreSlides.map((_, index) => (
                                <span
                                    key={`explore-dot-${index}`}
                                    className={index === exploreSlideIndex ? 'active' : ''}
                                />
                            ))}
                        </div>
                    </div>

                    <div className='ourservices-section' >
                        <h2 className='explore-text' style={{ fontSize: 45, fontWeight: 'bold', marginBottom: 5, paddingBottom: 0, lineHeight: 1.2 }}>THE <span style={{ color: '#305797' }}>SERVICES</span> WE OFFER</h2>

                        <div style={{ display: 'flex', gap: '50px', flexDirection: 'row', marginTop: 70, justifyContent: 'center' }}>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src='/images/Packages_Logo.png' alt="Tour Package" width="65" height="65" />
                                <h4 className='aboutus-text' style={{ marginTop: 20, textAlign: 'center', fontSize: 20, fontWeight: 700 }}>Tour Packages</h4>
                                <p className='aboutus-text' style={{ textAlign: 'center' }}>
                                    Discover our wide range of carefully crafted tour packages designed to suit every traveler's needs and preferences.
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src='/images/Passport_Logo.png' alt="Tour Package" width="65" height="65" />
                                <h4 className='aboutus-text' style={{ marginTop: 20, textAlign: 'center', fontSize: 20, fontWeight: 700 }}>Passport Assistance</h4>
                                <p className='aboutus-text' style={{ textAlign: 'center' }}>
                                    Discover our wide range of carefully crafted tour packages designed to suit every traveler's needs and preferences.
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src='/images/Visa_Logo.png' alt="Tour Package" width="65" height="65" />
                                <h4 className='aboutus-text' style={{ marginTop: 20, textAlign: 'center', fontSize: 20, fontWeight: 700 }}>Visa Assistance</h4>
                                <p className='aboutus-text' style={{ textAlign: 'center' }}>
                                    Discover our wide range of carefully crafted tour packages designed to suit every traveler's needs and preferences.
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src='/images/Quotation_Logo.png' alt="Tour Package" width="65" height="65" />
                                <h4 className='aboutus-text' style={{ marginTop: 20, textAlign: 'center', fontSize: 20, fontWeight: 700 }}>Quotations</h4>
                                <p className='aboutus-text' style={{ textAlign: 'center' }}>
                                    Discover our wide range of carefully crafted tour packages designed to suit every traveler's needs and preferences.
                                </p>
                            </div>

                        </div>
                    </div>

                </div>

                {/* ABOUTUS SECTION */}
                <div ref={aboutusRef} style={{ paddingTop: '100px' }}>

                    <div className="hero-section-aboutus">
                        <div className="hero-overlay-aboutus"></div>
                        <div className="hero-content-aboutus">
                            <h1>M&RC Travel and Tours</h1>
                            <p>
                                M&RC Travel and tours is a travel agency that provides a wide range of travel services, including tour packages, flight bookings, hotel reservations, and travel insurance. With a commitment to customer satisfaction and a passion for travel, M&RC Travel and Tours aims to create unforgettable travel experiences for its clients.
                            </p>
                        </div>
                    </div>


                    <div className='aboutus-row'>
                        <div className='aboutus-text-col'>
                            <div className='aboutus-text-wrap'>
                                <h1 className='explore-text' style={{ color: '#ffffff', marginBottom: 0, paddingBottom: 0 }}>About Us</h1>
                                <div className='text-underline'></div>

                                <p className='aboutus-text' style={{ color: '#ffffff' }}>
                                    M&RC Travel and Tours humbly started travel business in July 2018 when two vibrant entrepreneur, traveler,
                                    Maricar Carle and Rhon Carle decided to turn their passion into business. Office is located at #1 Cor Fatima Street
                                    San antonio Avenue Valley 1, Brgy. San Antonio Paranaque City with over thousand of agents worldwide and travel partners.
                                </p>

                                <p className='aboutus-text' style={{ color: '#ffffff' }}>
                                    We commit to adapt the changing needs of business sectors and become a major player through satisfying specialized requirements of the small, medium and large organizations.
                                </p>

                                <p className='aboutus-text' style={{ color: '#ffffff' }}>
                                    We value honesty and integrity.
                                    M&RC Travel and Tours continuously develop other line of services with the primary objective of extending wide range of quality and excellent service.
                                </p>
                            </div>

                        </div>

                        <div className='aboutus-image-col'>
                            <img
                                className='aboutus-image'
                                draggable={false}
                                alt="example"
                                src="/images/Homepage1.png"
                            />
                        </div>

                    </div>

                    <div className='aboutus-row'>

                        <div className='aboutus-image-col aboutus-image-col-left'>
                            <img
                                className='aboutus-image aboutus-image-offset'
                                draggable={false}
                                alt="example"
                                src="/images/Homepage2.png"
                            />
                        </div>

                        <div className='aboutus-vision-mission'>
                            <div style={{ marginBottom: 40 }}>
                                <h2 className='explore-text' style={{ color: '#ffffff', marginBottom: 0, paddingBottom: 0 }}>Our Vision</h2>
                                <div className='text-underline'></div>
                                <p className='aboutus-text' style={{ color: '#ffffff' }}>
                                    Our Vision is to be the preferred travel
                                    and tours agency in the country offering
                                    specialized, high quality and cost-
                                    efficient travel solutions at all times,
                                    anywhere, everywhere.
                                </p>
                            </div>

                            <div>
                                <h2 className='explore-text' style={{ color: '#ffffff', marginBottom: 0, paddingBottom: 0 }}>Our Mission</h2>
                                <div className='text-underline'></div>
                                <p className='aboutus-text' style={{ color: '#ffffff' }}>
                                    We are committed to provide value-added travel
                                    solutions to our Customers by offering good service
                                    and meaningful experience through the help of our
                                    reliable and service- oriented travel partners.
                                    We aim to grow and profit with the knowledge that

                                    each customer we served is fully satisfied.

                                    We adhere to the notion of reliability, competence,

                                    competitiveness and integrity.

                                    We are committed to be updated with the latest
                                    technology to keep up with the demands of the global

                                    market.

                                    We care for the well-being of our employees, our

                                    community and our environment.
                                </p>
                            </div>


                        </div>
                    </div>


                    <div className='aboutus-accreditation'>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 60 }}>
                            <h2 className='explore-text' style={{ fontSize: 45, fontWeight: 'bold', marginBottom: 5, paddingBottom: 0, lineHeight: 1.2 }}>WHY <span style={{ color: '#305797' }}>BOOK</span> WITH US?</h2>
                        </div>


                        <div style={{ display: 'flex', gap: '70px', flexDirection: 'row' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                                <img
                                    style={{ width: 200, height: 200 }}
                                    draggable={false}
                                    alt="example"
                                    src="/images/philgeps.png"
                                />

                                <p style={{ textAlign: "center", width: 600 }} className='aboutus-text'>
                                    M&RC Travel and Tours is accredited by the Philippine Government Electronic Procurement System (PhilGEPS), ensuring that we meet the highest standards of quality, reliability, and professionalism in providing travel services. Our accreditation reflects our commitment to excellence and our dedication to delivering exceptional travel experiences to our customers.
                                </p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
                                <img
                                    style={{ width: 200, height: 200 }}
                                    draggable={false}
                                    alt="example"
                                    src="/images/dotseal.png"
                                />

                                <p style={{ textAlign: "center", width: 600 }} className='aboutus-text'>
                                    M&RC Travel and Tours is accredited by the Department of Tourism (DOT) of the Philippines, ensuring that we meet the highest standards of quality, safety, and customer service in the travel industry. Our accreditation reflects our commitment to providing exceptional travel experiences and our dedication to upholding the integrity and professionalism of our services.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>


                <div style={{ paddingTop: '25px' }}>
                    <div className='contactus-container'>
                        <div className='contactus-section'>
                            <div className='contactus-section-left'>
                                <h1 className='explore-text' style={{ marginBottom: 0, paddingBottom: 0 }}>Contact Us</h1>
                                <div className='text-underline' style={{ backgroundColor: '#000000' }}></div>
                                <p className='contactus-text'>
                                    Have questions or need assistance? Our friendly customer support team is here to help you with all your travel needs. Whether you’re looking for more information about our tour packages, need help with booking, or want to customize your itinerary, we’re just a message away. Contact us today and let us make your travel dreams a reality!
                                </p>
                            </div>

                            <div className='contactus-section-right'>
                                <div className='contactus-section-right-card'>
                                    <div className='contact-card-left'>
                                        <h3 className='contact-card-title'>Contact Information</h3>
                                        <p className='contact-card-subtitle'>We are here to help you plan your trip.</p>
                                        <div className='contact-info-list'>
                                            <div className='contact-info-item'>
                                                <EnvironmentOutlined className='contact-info-icon' />
                                                <div>
                                                    <p className='contact-info-heading'>Visit us</p>
                                                    <p className='contact-info-text'>2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1, Brgy. San Antonio, Parañaque, Philippines, 1715</p>
                                                </div>
                                            </div>
                                            <div className='contact-info-item'>
                                                <ClockCircleOutlined className='contact-info-icon' />
                                                <div>
                                                    <p className='contact-info-heading'>Office hours</p>
                                                    <p className='contact-info-text'>Monday - Saturday: 9:00 AM - 6:00 PM</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className='contact-card-right'>
                                        <label className='contact-label'>You have an inquiry? Send us a message!</label>
                                        <div className='contact-field'>
                                            <span className='contact-field-label'>Your Name</span>
                                            <Input
                                                placeholder="Your Name"
                                                className='contact-input'
                                                status={contactErrors.name ? 'error' : ''}
                                                value={contactValues.name}
                                                onChange={(e) => {
                                                    setContactValues(prev => ({ ...prev, name: e.target.value }));
                                                    setContactErrors(prev => ({ ...prev, name: '' }));
                                                }}
                                                onKeyDown={(e) => {
                                                    const value = e.target.value
                                                    if (e.key === " " && value.length === 0) {
                                                        e.preventDefault()
                                                        return
                                                    }

                                                    if (e.key === " " && value.endsWith(" ")) {
                                                        e.preventDefault()
                                                        return
                                                    }

                                                    if (!/^[a-zA-Z\s]*$/.test(e.key) &&
                                                        e.key !== "Backspace" &&
                                                        e.key !== "ArrowLeft" &&
                                                        e.key !== "ArrowRight") {
                                                        e.preventDefault()
                                                    }
                                                }}
                                            />
                                            {contactErrors.name && <span className="error-text">{contactErrors.name}</span>}
                                        </div>
                                        <div className='contact-field'>
                                            <span className='contact-field-label'>Your Email</span>
                                            <Input
                                                placeholder="Your Email"
                                                className='contact-input'
                                                status={contactErrors.email ? 'error' : ''}
                                                value={contactValues.email}
                                                onChange={(e) => {
                                                    setContactValues(prev => ({ ...prev, email: e.target.value }))
                                                    setContactErrors(prev => ({ ...prev, email: '' }))
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === " ") {
                                                        e.preventDefault()
                                                    }
                                                }}
                                            />
                                            {contactErrors.email && <span className="error-text">{contactErrors.email}</span>}
                                        </div>
                                        <div className='contact-field'>
                                            <span className='contact-field-label'>Subject</span>
                                            <Select
                                                placeholder="Select subject"
                                                className='contact-input'
                                                status={contactErrors.subject ? 'error' : ''}
                                                value={contactValues.subject || undefined}
                                                options={[
                                                    { value: 'Passport Assistance Inquiry', label: 'Passport Assistance Inquiry' },
                                                    { value: 'Visa Assistance Inquiry', label: 'Visa Assistance Inquiry' },
                                                    { value: 'Booking Inquiry', label: 'Booking Inquiry' },
                                                    { value: 'Quotation Inquiry', label: 'Quotation Inquiry' },
                                                    { value: 'Travel Agency Inquiry', label: 'Travel Agency Inquiry' },
                                                ]}
                                                onChange={(value) => {
                                                    setContactValues(prev => ({ ...prev, subject: value }))
                                                    setContactErrors(prev => ({ ...prev, subject: '' }))
                                                }}
                                            />
                                            {contactErrors.subject && <span className="error-text">{contactErrors.subject}</span>}
                                        </div>
                                        <div className='contact-field'>
                                            <span className='contact-field-label'>Message</span>
                                            <Input.TextArea
                                                resize="none"
                                                placeholder="Your Message"
                                                className='contact-textarea'
                                                rows={4}
                                                status={contactErrors.message ? 'error' : ''}
                                                value={contactValues.message}
                                                onChange={(e) => {
                                                    setContactValues(prev => ({ ...prev, message: e.target.value }))
                                                    setContactErrors(prev => ({ ...prev, message: '' }))
                                                }}
                                                onKeyDown={(e) => {
                                                    const value = e.target.value

                                                    if (e.key === " " && value.length === 0) {
                                                        e.preventDefault()
                                                    }
                                                }}
                                            />
                                            {contactErrors.message && <span className="error-text">{contactErrors.message}</span>}
                                        </div>
                                        <Button
                                            type="primary"
                                            loading={isSending}
                                            className={`contact-submit-button${(!contactValues.name.trim() ||
                                                !contactValues.email.trim() ||
                                                !contactValues.subject.trim() ||
                                                !contactValues.message.trim())
                                                ? ' contact-submit-button-disabled'
                                                : ''
                                                }`}
                                            disabled={
                                                isSending ||
                                                !contactValues.name.trim() ||
                                                !contactValues.email.trim() ||
                                                !contactValues.subject.trim() ||
                                                !contactValues.message.trim()
                                            }
                                            onClick={sendMessage}
                                        >
                                            {isSending ? 'Sending...' : 'Submit'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>


                <div style={{ paddingTop: '10px', marginTop: '20px' }}>
                    <div className='landingpage-footer'>
                        <div className='footer-section'>

                            <div className='footer-section-top'>
                                <div className='footer-section-logo'>
                                    <h2 className='footer-header'>M&RC Travel and Tours</h2>
                                    <p className='footer-text'>Discover affordable vacation travel and tours. Book your dream activities and start exploring the world!</p>

                                </div>

                                <div className='footer-section-address'>
                                    <h2 className='footer-header'>Our Address</h2>
                                    <p className='footer-text'>2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1 , Brgy. San Antonio, Parañaque, Philippines, 1715</p>
                                </div>

                                <div className='footer-section-hours'>
                                    <h2 className='footer-header'>Our Hours</h2>
                                    <p className='footer-text'>Monday - Saturday: 9:00 AM - 6:00 PM</p>
                                </div>

                                <div className='footer-section-socials'>
                                    <h2 className='footer-header'>Our Socials</h2>
                                    <div className='footer-section-socials-icons'>
                                        <FacebookFilled className='socials-icon' />
                                        <p className='footer-text-link' onClick={() => window.open('https://www.facebook.com/mrctravelandtour', '_blank')}>M&RC Travel and Tours</p>
                                    </div>

                                    <div className='footer-section-socials-icons'>
                                        <InstagramFilled className='socials-icon' />
                                        <p className='footer-text-link' onClick={() => window.open('https://www.instagram.com/mrc_travelandtours?fbclid=IwY2xjawQVIU5leHRuA2FlbQIxMABicmlkETE1M0YwaFZ6SW1EQ0xTZnNrc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHgrnAZz5frwKYlnHCi-Txow7AV3kwbYXwWp0W7XV-_BZcoANgGr7hUQA3Eq6_aem_VyUBdOcsD0LsgGhYaEtNog', '_blank')} >@mrc_travel_tours</p>
                                    </div>


                                </div>
                            </div>

                            <hr className='footer-divider' />
                            <p className='footer-bottom-text'>© 2026 M&RC Travel and Tours. All rights reserved.</p>
                        </div>
                    </div>
                </div>

                <LoginModal
                    isOpenLogin={isLoginVisible}
                    isCloseLogin={() => setIsLoginVisible(false)}
                    onLoginSuccess={() => navigate('/destinations-packages')}
                />

                {auth && (
                    <>
                        <Button className="chatbot-fab" type="primary" onClick={() => setIsChatbotOpen(true)}>
                            <Image preview={false} style={{ width: 20, height: 20 }} src="/images/chatbotlogo.png" />
                        </Button>

                        <Chatbot
                            isChatbotOpen={isChatbotOpen}
                            setIsChatbotOpen={setIsChatbotOpen}
                        />
                    </>
                )}

            </div>

            {/* SUCCESS MODAL */}
            <Modal
                open={openModalSuccess}
                className='emailverify-success-modal'
                footer={null}
                closable={false}
                centered={true}
            >
                <div className='emailverify-container-modal'>
                    <h1 className='emailverify-heading-modal'>Your message has been sent</h1>
                    <p className='emailverify-secondary-heading-modal'>Kindly check your email for responses.</p>
                    <Button
                        type='primary'
                        id='emailverify-success-button'
                        onClick={() => {
                            setOpenModalSuccess(false)
                            navigate('/home')
                        }}
                    >
                        Continue
                    </Button>
                </div>
            </Modal>

            {/* FAIL MODAL */}
            <Modal
                open={openModalError}
                className='emailverify-fail-modal'
                footer={null}
                closable={false}
                centered={true}
            >
                <div className='emailverify-container-modal'>
                    <h1 className='emailverify-heading-modal'>Failed to Send Message</h1>
                    <p className='emailverify-secondary-heading-modal'>There was an error sending your message. Please try again later.</p>
                    <Button
                        id='emailverify-success-button'
                        onClick={() => {
                            setOpenModalError(false)
                            navigate('/home')
                        }}
                    >
                        Continue
                    </Button>
                </div>
            </Modal>

            {/* Next Steps Modal - Shown after User Preferences */}
            <Modal
                title={null}
                centered={true}
                open={showNextStepsModal}
                onCancel={() => setShowNextStepsModal(false)}
                footer={null}
                width={900}
                className="next-steps-modal"
                closeButtonClassName="next-steps-modal-close"
            >
                <div className="next-steps-container">
                    <div className="next-steps-header">
                        <h2>You're all set! What would you like to do next?</h2>
                        <p>Explore our features and personalize your experience</p>
                    </div>
                    <div className="next-steps-cards">
                        <div
                            className="next-steps-card"
                            onClick={() => handleNextStepsModalOption('/destinations-packages')}
                        >
                            <div className="card-icon-wrapper">
                                <CompassOutlined className="card-icon" />
                            </div>
                            <h3>Browse Packages</h3>
                            <p>Discover amazing <span className="next-steps-highlight">Travel Packages</span> that are both domestic and international.</p>
                            <div className="card-cta">Explore Now →</div>
                        </div>

                        <div
                            className="next-steps-card"
                            onClick={() => handleNextStepsModalOption('/services')}
                        >
                            <div className="card-icon-wrapper">
                                <ShoppingCartOutlined className="card-icon" />
                            </div>
                            <h3>Avail Services</h3>
                            <p>Need assistance with your passport or visa? We've got you covered! <span className="next-steps-highlight">We offer Visa and Passport Assistance Services.</span></p>
                            <div className="card-cta">View Services →</div>
                        </div>

                        <div
                            className="next-steps-card"
                            onClick={() => handleNextStepsModalOption('/profile')}
                        >
                            <div className="card-icon-wrapper">
                                <UserOutlined className="card-icon" />
                            </div>
                            <h3>View Profile</h3>
                            <p>Complete and manage your <span className="next-steps-highlight">Profile Information</span>.</p>
                            <div className="card-cta">View Profile →</div>
                        </div>
                    </div>
                </div>
            </Modal>

        </ConfigProvider>
    );
}