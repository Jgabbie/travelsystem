import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, Col, Input, InputNumber, Row, Select, Slider, Tag, Typography, ConfigProvider, Space, Spin, Empty, Button, Image, Modal, notification } from 'antd'
import { FacebookFilled, InstagramFilled, HeartFilled, HeartOutlined, SlidersOutlined, SearchOutlined, StarFilled } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import '../../style/client/destinationspackages.css'
import apiFetch from '../../config/fetchConfig'
import TopNavUser from '../../components/topnav/TopNavUser'
import { useAuth } from '../../hooks/useAuth'


export default function DestinationsPackages() {

    const navigate = useNavigate()
    const location = useLocation()
    const [packages, setPackages] = useState([])
    const [search, setSearch] = useState('')
    const [budgetRange, setBudgetRange] = useState([0, 200000])
    const [selectedTags, setSelectedTags] = useState([])
    const [tourType, setTourType] = useState('All')
    const [daysValue, setDaysValue] = useState(6)
    const [travelersValue, setTravelersValue] = useState(null)
    const [loading, setLoading] = useState(false)
    const [wishlistedIds, setWishlistedIds] = useState(() => new Set())
    const [wishlistEntryMap, setWishlistEntryMap] = useState(() => new Map())

    const [isChatbotOpen, setIsChatbotOpen] = useState(false)
    const [chatMessage, setChatMessage] = useState('')

    const { auth } = useAuth()

    const { Title, Text } = Typography

    //get all packages from package collection and map it
    useEffect(() => {
        const fetchPackages = async () => {
            setLoading(true)
            try {
                const response = await apiFetch.get('/package/get-packages-for-users')
                const ratingResponse = await apiFetch.get('/rating/average-ratings')

                const ratingMap = new Map(
                    (ratingResponse?.averagesPayload || []).map((item) => [
                        String(item.packageItem),
                        Number(item.averageRating || 0)
                    ])
                )

                const packages = response.map((pkg) => {
                    const rating = ratingMap.get(String(pkg.packageItem)) || 0
                    const discountPercent = Number(pkg.packageDiscountPercent || 0)
                    const budget = Number(pkg.packagePricePerPax || 0)
                    const discountedBudget = discountPercent > 0
                        ? budget * (1 - discountPercent / 100)
                        : budget
                    return {
                        id: pkg.packageItem,
                        packageCode: pkg.packageCode,
                        packageName: pkg.packageName,
                        packageType: pkg.packageType === 'international' ? 'International' : 'Domestic',
                        days: pkg.packageDuration,
                        budget,
                        discountedBudget,
                        discountPercent,
                        availableSlots: pkg.packageAvailableSlots || 0,
                        images: Array.isArray(pkg.packageImages)
                            ? (pkg.packageImages[0] || '')
                            : (Array.isArray(pkg.images) ? (pkg.images[0] || '') : ''),
                        tags: pkg.packageTags || [],
                        rating
                    };
                });

                setPackages(packages)
            } catch (error) {
                console.error('Failed to load packages:', error)
                setPackages([])
            } finally {
                setLoading(false)
            }
        }
        fetchPackages()
    }, [])

    const fetchWishlist = useCallback(async () => {
        if (!auth) {
            setWishlistedIds(new Set())
            setWishlistEntryMap(new Map())
            return
        }

        try {
            const response = await apiFetch.get('/wishlist')
            const wishlist = response?.wishlist || []
            const ids = new Set()
            const entryMap = new Map()

            wishlist.forEach((entry) => {
                const packageId = entry?.packageId?._id || entry?.packageId
                if (!packageId) return
                const packageKey = String(packageId)
                ids.add(packageKey)
                if (entry?._id) {
                    entryMap.set(packageKey, String(entry._id))
                }
            })

            setWishlistedIds(ids)
            setWishlistEntryMap(entryMap)
        } catch (error) {
            console.error('Failed to load wishlist:', error)
            setWishlistedIds(new Set())
            setWishlistEntryMap(new Map())
        }
    }, [auth])

    useEffect(() => {
        fetchWishlist()
    }, [fetchWishlist])

    const resolveWishlistEntryId = useCallback(async (packageKey) => {
        const cachedId = wishlistEntryMap.get(packageKey)
        if (cachedId) return cachedId

        try {
            const response = await apiFetch.get('/wishlist')
            const wishlist = response?.wishlist || []
            const entry = wishlist.find((item) => {
                const entryPackageId = item?.packageId?._id || item?.packageId
                return entryPackageId && String(entryPackageId) === packageKey
            })
            return entry?._id ? String(entry._id) : null
        } catch (error) {
            console.error('Failed to resolve wishlist entry:', error)
            return null
        }
    }, [wishlistEntryMap])

    const handleWishlistToggle = useCallback(async (event, packageId) => {
        event?.stopPropagation()

        if (!auth) {
            notification.info({ message: 'Please log in to manage your wishlist.', placement: 'topRight' })
            return
        }

        const packageKey = String(packageId)
        const isWishlisted = wishlistedIds.has(packageKey)

        if (isWishlisted) {
            const wishlistId = await resolveWishlistEntryId(packageKey)
            if (!wishlistId) {
                notification.error({ message: 'Unable to remove wishlist item.', placement: 'topRight' })
                return
            }

            try {
                await apiFetch.delete(`/wishlist/remove/${wishlistId}`)
                setWishlistedIds((prev) => {
                    const next = new Set(prev)
                    next.delete(packageKey)
                    return next
                })
                setWishlistEntryMap((prev) => {
                    const next = new Map(prev)
                    next.delete(packageKey)
                    return next
                })
                notification.success({ message: 'Removed from wishlist', placement: 'topRight' })
            } catch (error) {
                const errorMessage =
                    error?.data?.message || 'Unable to remove wishlist item.'
                notification.error({ message: errorMessage, placement: 'topRight' })
            }

            return
        }

        try {
            await apiFetch.post('/wishlist/add', { packageId: packageKey })
            notification.success({ message: 'Added to wishlist', placement: 'topRight' })
            await fetchWishlist()
        } catch (error) {
            const errorMessage =
                error?.data?.message || 'Unable to add to wishlist. Please try again.'
            notification.error({ message: errorMessage, placement: 'topRight' })
        }
    }, [auth, fetchWishlist, resolveWishlistEntryId, wishlistedIds])


    //gets the values from the search bar from the landing page and sets the filters based on the configuration of the user
    useEffect(() => {
        if (!location.search) return //if no inputs from the search bar, then skip parsing and just show all packages

        const params = new URLSearchParams(location.search)
        const query = params.get('q')
        const tag = params.get('tag')
        const tags = params.getAll('tag')
        const tourTypeParam = params.get('tourType')
        const minBudget = Number(params.get('minBudget'))
        const maxBudget = Number(params.get('maxBudget'))
        const maxDays = Number(params.get('maxDays'))
        const travelers = Number(params.get('travelers'))

        if (query !== null) {
            setSearch(query)
        }

        if (tags.length) {
            setSelectedTags(tags)
        } else if (tag) {
            setSelectedTags([tag])
        }

        if (tourTypeParam && ['All', 'Domestic', 'International'].includes(tourTypeParam)) {
            setTourType(tourTypeParam)
        }

        // it checks first if the min and max budget values are integers or values then , set the budget range
        if (Number.isFinite(minBudget) && Number.isFinite(maxBudget)) {
            setBudgetRange([
                Math.min(minBudget, maxBudget),
                Math.max(minBudget, maxBudget)
            ])
        }

        // same as the budget range, check if the max days is an integer then set the days value
        if (Number.isFinite(maxDays)) {
            setDaysValue(maxDays)
        }

        if (Number.isFinite(travelers) && travelers > 0) {
            setTravelersValue(travelers)
        }
    }, [location.search])


    const tagOptions = useMemo(() => {
        const unique = new Set()

        packages.forEach((pkg) => {
            pkg.tags?.forEach((tag) => unique.add(tag))
        })

        return Array.from(unique)
    }, [packages])

    // compute available durations (days) from packages so filters adapt dynamically
    const durationOptions = useMemo(() => {
        const set = new Set()
        packages.forEach((pkg) => {
            const d = Number(pkg.days ?? pkg.packageDuration ?? pkg.daysValue)
            if (Number.isFinite(d) && d > 0) set.add(d)
        })
        return Array.from(set).sort((a, b) => a - b)
    }, [packages])

    const maxDuration = durationOptions.length > 0 ? Math.max(...durationOptions) : 10

    // ensure current daysValue doesn't exceed available max
    useEffect(() => {
        if (daysValue > maxDuration) setDaysValue(maxDuration)
    }, [maxDuration])


    const filteredPackages = packages.filter((item) => {
        const matchesSearch =
            (item.packageName.toLowerCase().includes(search.toLowerCase())) ||
            (item.packageType.toLowerCase().includes(search.toLowerCase())) ||
            (item.days.toString().toLowerCase().includes(search.toLowerCase())) ||
            (item.budget.toString().toLowerCase().includes(search.toLowerCase())) ||
            (item.availableSlots.toString().toLowerCase().includes(search.toLowerCase())) ||
            (item.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase())))

        const matchesBudget =
            item.discountedBudget >= budgetRange[0] && item.discountedBudget <= budgetRange[1]

        const matchesTags =
            selectedTags.length === 0 ||
            selectedTags.every((tag) =>
                item.tags?.includes(tag)
            )

        const matchesType = tourType === 'All' || item.packageType === tourType

        const matchesDays =
            item.days >= 1 && item.days <= daysValue

        const matchesTravelers =
            !Number.isFinite(travelersValue) || travelersValue <= 0 || item.availableSlots >= travelersValue

        const otherFiltersPass = matchesBudget && matchesTags && matchesType && matchesDays && matchesTravelers

        // Prioritize search: if user entered a search term and this package matches it,
        // include it regardless of the other filter settings. Otherwise fall back to filters.
        if (search && search.trim().length > 0) {
            return matchesSearch || otherFiltersPass
        }

        return otherFiltersPass
    })


    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div className='destinations-container'>
                <div className="destinations-hero-section">
                    <div className="destinations-hero-overlay"></div>
                    <div className="destinations-hero-content">
                        <h1>Find your destination</h1>
                        <p>Discover affordable packages and explore around the world by setting you preferrences!</p>
                    </div>
                </div>

                <div className="destinations-page">
                    <header className="destinations-header">
                        <h2>Destinations & Packages</h2>
                        <p>
                            Find the best tour packages that match your budget, activities,
                            and schedule.
                        </p>
                    </header>

                    <div className="destinations-search">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <SearchOutlined className='destinations-primary-label-icon' />
                            <Text className="destinations-primary-label">Search</Text>
                        </div>

                        <Input
                            maxLength={60}
                            className='destinations-inputs'
                            allowClear
                            placeholder="Search by destination or package"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <div className="destinations-controls">
                        <Row gutter={[16, 16]} className="destinations-filter-grid">
                            <Col xs={24} md={12} xl={6}>
                                <div className="filter-field">

                                    <Text className="destinations-label">Budget (₱)</Text>
                                    <div className="filter-range-inputs">
                                        <InputNumber
                                            className='destinations-inputs'
                                            min={0}
                                            max={200000}
                                            maxLength={6}
                                            value={budgetRange[0]}
                                            onChange={(value) => setBudgetRange([value, budgetRange[1]])}
                                            formatter={(value) => `₱${value}`}
                                            parser={(value) => Number(String(value).replace(/[^0-9]/g, ''))} // converts the value to a number and removes the non digit values like peso sign and commas
                                            onKeyDown={(e) => {
                                                if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                                    e.preventDefault()
                                                }
                                            }}
                                        />

                                        <span className="filter-range-separator">to</span>
                                        <InputNumber
                                            className='destinations-inputs'
                                            min={0}
                                            max={200000}
                                            maxLength={6}
                                            value={budgetRange[1]}
                                            onChange={(value) => setBudgetRange([budgetRange[0], value])}
                                            formatter={(value) => `₱${value}`}
                                            parser={(value) => Number(String(value).replace(/[^0-9]/g, ''))}
                                            onKeyDown={(e) => {
                                                if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                                    e.preventDefault()
                                                }
                                            }}
                                        />
                                    </div>
                                    <Slider
                                        range
                                        min={0}
                                        max={200000}
                                        value={budgetRange}
                                        onChange={(value) => setBudgetRange(value)}
                                        tooltip={{ formatter: (value) => `₱${value}` }}
                                    />
                                    <Text className="filter-hint">
                                        ₱{budgetRange[0].toLocaleString()} - ₱{budgetRange[1].toLocaleString()}
                                    </Text>
                                </div>
                            </Col>

                            <Col xs={24} md={12} xl={5}>
                                <div className="filter-field">
                                    <Text className="destinations-label">Tags</Text>
                                    <Select
                                        className='destinations-inputs'
                                        mode="multiple"
                                        allowClear
                                        placeholder="Select tags"
                                        value={selectedTags}
                                        onChange={(value) => setSelectedTags(value)}
                                        options={tagOptions.map((tag) => ({
                                            value: tag,
                                            label: tag,
                                        }))}
                                    />
                                </div>
                            </Col>

                            <Col xs={24} md={12} xl={4}>
                                <div className="filter-field">
                                    <Text className="destinations-label">Tour Type</Text>
                                    <Select
                                        className='destinations-inputs'
                                        value={tourType}
                                        onChange={(value) => setTourType(value)}
                                        options={[
                                            { value: 'All', label: 'All' },
                                            { value: 'Domestic', label: 'Domestic' },
                                            { value: 'International', label: 'International' },
                                        ]}
                                    />
                                </div>
                            </Col>

                            <Col xs={24} md={12} xl={4}>
                                <div className="filter-field">
                                    <Text className="destinations-label">Travelers</Text>
                                    <InputNumber
                                        className='destinations-inputs'
                                        maxLength={2}
                                        min={1}
                                        max={50}
                                        placeholder="How many travellers?"
                                        value={travelersValue}
                                        onChange={(value) => setTravelersValue(value ?? null)}
                                        onKeyDown={(e) => {
                                            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                                                e.preventDefault()
                                            }
                                        }}
                                    />
                                    <Text className="filter-hint">
                                        Show packages with available slots for your group size
                                    </Text>
                                </div>
                            </Col>

                            <Col xs={24} md={12} xl={5}>
                                <div className="filter-field">
                                    <Text className="destinations-label">Days of Tour</Text>
                                    <div className="filter-range-inputs">
                                        <InputNumber
                                            className='destinations-inputs'
                                            min={1}
                                            max={maxDuration}
                                            maxLength={3}
                                            value={daysValue}
                                            onChange={setDaysValue}
                                            onKeyDown={(e) => {
                                                if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                                    e.preventDefault()
                                                }
                                            }}
                                        />
                                        <span className="filter-range-separator">Max Days</span>
                                    </div>
                                    <Slider
                                        min={1}
                                        max={maxDuration}
                                        value={daysValue}
                                        onChange={setDaysValue}
                                        tooltip={{ formatter: (value) => `${value} day${value > 1 ? 's' : ''}` }}
                                    />
                                    <Text className="filter-hint">
                                        Up to {daysValue} days
                                    </Text>
                                </div>
                            </Col>

                        </Row>
                    </div>


                    <section className="destinations-results">
                        <div className="destinations-results-header">
                            <Title level={4}>Available Packages</Title>
                            <Text type="secondary">{filteredPackages.length} found</Text>
                        </div>

                        {loading ? (
                            <div className="loading-wrapper">
                                <Spin size="large" description="Loading packages..." />
                            </div>
                        ) : filteredPackages.length === 0 ? (
                            <div className="wishlist-empty">
                                <Empty description="No packages match your filters right now." />
                            </div>
                        ) : (
                            <Row gutter={[18, 18]}>
                                {filteredPackages.map((pkg) => (
                                    <Col xs={24} sm={12} lg={12} xl={12} key={pkg.id}>
                                        <Card
                                            className={`destinations-card${pkg.availableSlots <= 0 ? ' destinations-card-disabled' : ''}`}
                                            hoverable={pkg.availableSlots > 0}
                                            onClick={() => {
                                                if (pkg.availableSlots > 0) navigate('/package', { state: { packageItem: pkg.id } })
                                            }}
                                            style={pkg.availableSlots <= 0 ? { opacity: 0.6, pointerEvents: 'none', cursor: 'not-allowed' } : {}}
                                        >
                                            <div className="destinations-card-image">
                                                {pkg.images ? (
                                                    <img src={pkg.images} alt={pkg.packageName} />
                                                ) : (
                                                    <div className="destinations-card-image-placeholder">No Image</div>
                                                )}
                                            </div>
                                            <div className="destinations-card-content">
                                                <div className="destinations-card-header">
                                                    <div>
                                                        <Title level={5} className="destinations-card-title">
                                                            {pkg.packageName}
                                                        </Title>
                                                    </div>
                                                </div>
                                                <div className="destinations-card-meta">
                                                    <Tag className="destinations-type">{pkg.packageType}</Tag>
                                                    <Tag className="destinations-status-tag">
                                                        {pkg.availableSlots > 0 ? 'AVAILABLE' : 'UNAVAILABLE'}
                                                    </Tag>
                                                    <Text type="secondary">{pkg.days} days</Text>
                                                </div>

                                                <div className="destinations-card-activities">
                                                    {pkg.tags?.map((tag) => (
                                                        <Tag key={tag}>{tag}</Tag>
                                                    ))}
                                                </div>
                                                <div className="destinations-card-footer">
                                                    <div className="destinations-card-pricing">
                                                        {pkg.discountPercent > 0 && (
                                                            <Text
                                                                delete
                                                                className="destinations-price destinations-price-old"
                                                            >
                                                                ₱{(
                                                                    Number.isFinite(travelersValue) && travelersValue > 0
                                                                        ? pkg.budget * travelersValue
                                                                        : pkg.budget
                                                                ).toLocaleString()}
                                                            </Text>
                                                        )}
                                                        <Text className="destinations-price">
                                                            ₱{(
                                                                Number.isFinite(travelersValue) && travelersValue > 0
                                                                    ? pkg.discountedBudget * travelersValue
                                                                    : pkg.discountedBudget
                                                            ).toLocaleString()}
                                                            {Number.isFinite(travelersValue) && travelersValue > 0
                                                                ? ` for ${travelersValue} person${travelersValue > 1 ? 's' : ''}`
                                                                : ''}
                                                        </Text>
                                                        <Text className="destinations-budget">
                                                            {Number.isFinite(travelersValue) && travelersValue > 0
                                                                ? 'Total Budget'
                                                                : pkg.discountPercent > 0
                                                                    ? 'Discounted / Pax'
                                                                    : 'Budget / Pax'}
                                                        </Text>
                                                    </div>

                                                </div>
                                                <div className="destinations-card-badges">
                                                    <div className="destinations-card-meta">
                                                        <Text type="secondary">Slots: {pkg.availableSlots}</Text>
                                                    </div>
                                                    <Space style={{}}>
                                                        {pkg.discountPercent > 0 && (
                                                            <Tag className="destinations-discount-tag">-{pkg.discountPercent}%</Tag>
                                                        )}
                                                        <Tag className="destinations-rating"><StarFilled style={{ color: "#FFDE21", fontSize: 20 }} /> {pkg.rating.toFixed(1)}</Tag>
                                                        <button
                                                            type="button"
                                                            className="destinations-wishlist-btn"
                                                            onClick={(event) => handleWishlistToggle(event, pkg.id)}
                                                            aria-label={wishlistedIds.has(String(pkg.id))
                                                                ? 'Remove from wishlist'
                                                                : 'Add to wishlist'}
                                                        >
                                                            {wishlistedIds.has(String(pkg.id)) ? (
                                                                <HeartFilled style={{ color: '#cf1322', fontSize: 25, marginTop: 5 }} />
                                                            ) : (
                                                                <HeartOutlined style={{ color: '#305797', fontSize: 25, marginTop: 5 }} />
                                                            )}
                                                        </button>
                                                    </Space>
                                                </div>
                                            </div>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </section>
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
                                        <FacebookFilled className='socials-icon' onClick={() => window.open('https://www.facebook.com/mrctravelandtour', '_blank')} />
                                        <p className='footer-text-link' onClick={() => window.open('https://www.facebook.com/mrctravelandtour', '_blank')}>M&RC Travel and Tours</p>
                                    </div>

                                    <div className='footer-section-socials-icons'>
                                        <InstagramFilled className='socials-icon' onClick={() => window.open('https://www.instagram.com/mrc_travelandtours?fbclid=IwY2xjawQVIU5leHRuA2FlbQIxMABicmlkETE1M0YwaFZ6SW1EQ0xTZnNrc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHgrnAZz5frwKYlnHCi-Txow7AV3kwbYXwWp0W7XV-_BZcoANgGr7hUQA3Eq6_aem_VyUBdOcsD0LsgGhYaEtNog', '_blank')} />
                                        <p className='footer-text-link' onClick={() => window.open('https://www.instagram.com/mrc_travelandtours?fbclid=IwY2xjawQVIU5leHRuA2FlbQIxMABicmlkETE1M0YwaFZ6SW1EQ0xTZnNrc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHgrnAZz5frwKYlnHCi-Txow7AV3kwbYXwWp0W7XV-_BZcoANgGr7hUQA3Eq6_aem_VyUBdOcsD0LsgGhYaEtNog', '_blank')}>@mrc_travel_tours</p>
                                    </div>


                                </div>
                            </div>

                            <hr className='footer-divider' />
                            <p className='footer-bottom-text'>© 2026 M&RC Travel and Tours. All rights reserved.</p>
                        </div>
                    </div>
                </div>


            </div>
        </ConfigProvider >
    )
}
