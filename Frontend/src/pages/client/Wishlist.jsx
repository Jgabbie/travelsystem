import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Input, Row, Select, Typography, notification, ConfigProvider, Modal, Spin, Slider } from 'antd'
import { DeleteOutlined, EyeOutlined, CheckCircleFilled, SearchOutlined, StarFilled } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../../config/fetchConfig'
import '../../style/client/wishlist.css'

export default function Wishlist() {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('All')
    const [availability, setAvailability] = useState('All')
    const [priceRange, setPriceRange] = useState([0, 100000])
    const [wishlistItems, setWishlistItems] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isPackageRemovedModalOpen, setIsPackageRemovedModalOpen] = useState(false)
    const [selectedWishlistId, setSelectedWishlistId] = useState(null);
    const [averageRatings, setAverageRatings] = useState(() => new Map())

    const [notificationApi, notificationContextHolder] =
        notification.useNotification();

    const { Text } = Typography

    // fetch wishlist items on component mount
    useEffect(() => {
        const loadWishlist = async () => {
            try {
                setIsLoading(true)

                const [wishlistResponse, ratingResponse] = await Promise.all([
                    apiFetch.get('/wishlist'),

                    apiFetch
                        .get('/rating/average-ratings')
                        .catch(() => ({
                            averagesPayload: []
                        }))
                ])

                const wishlist =
                    wishlistResponse?.wishlist || []

                const ratingMap = new Map(
                    (
                        ratingResponse?.averagesPayload || []
                    ).map((item) => [
                        String(item.packageItem),
                        Number(item.averageRating || 0)
                    ])
                )

                setWishlistItems(wishlist)
                setAverageRatings(ratingMap)
            } catch (error) {
                const errorMessage =
                    error?.data?.message ||
                    'Unable to load wishlist.'

                notificationApi.error({
                    title: 'Error Loading Wishlist',
                    placement: 'topRight'
                })

                setWishlistItems([])
                setAverageRatings(new Map())
            } finally {
                setIsLoading(false)
            }
        }

        loadWishlist()
    }, [])


    // memoized wishlist packages for filtering and rendering
    const wishlistPackages = useMemo(() => {
        return wishlistItems.map((entry) => {
            const pkg = entry?.packageId || {}
            const resolvedPackageId = pkg?._id || entry?.packageId?._id || entry?.packageId || null
            const availableSlots = (pkg.packageSpecificDate || []).reduce(
                (total, item) => total + Number(item.slots || 0),
                0
            )
            const availabilityLabel =
                availableSlots <= 0
                    ? 'Sold out'
                    : availableSlots <= 5
                        ? 'Few slots'
                        : 'Available'

            return {
                wishlistId: entry._id,
                packageId: resolvedPackageId,
                title: pkg.packageName || 'Package',
                location: pkg.packageType || 'Package',
                duration: pkg.packageDuration ? `${pkg.packageDuration} DAYS` : 'N/A',
                price: pkg.packagePricePerPax ?? 0,
                rating:
                    averageRatings.get(
                        String(resolvedPackageId)
                    ) || 0,
                discountPercent: Number(pkg.packageDiscountPercent) || 0,
                category: pkg.packageType ? pkg.packageType.toUpperCase() : 'Other',
                availability: availabilityLabel,
                typeLabel: pkg.packageType ? pkg.packageType.toUpperCase() : 'Package',
                availableSlots,
                image: pkg.images?.[0] || ''
            }
        })
    }, [wishlistItems, averageRatings])


    // memoized category options for the category filter
    const categoryOptions = useMemo(() => ([
        { value: 'All', label: 'All' },
        { value: 'Domestic', label: 'Domestic' },
        { value: 'International', label: 'International' }
    ]), [])


    // memoized filtered packages based on search, category, availability, and price range
    const filteredPackages = useMemo(() => {
        const query = search.trim().toLowerCase();
        const normalizedCategory = category.toLowerCase();
        return wishlistPackages.filter((pkg) => {
            const matchesQuery =
                query.length === 0 ||
                pkg.title.toLowerCase().includes(query) ||
                pkg.location.toLowerCase().includes(query) ||
                pkg.category.toLowerCase().includes(query);

            const matchesCategory =
                normalizedCategory === 'all' ||
                pkg.category.toLowerCase() === normalizedCategory;

            const matchesAvailability =
                availability === 'All' || pkg.availability === availability;

            const matchesPrice = pkg.price >= priceRange[0] && pkg.price <= priceRange[1];

            return matchesQuery && matchesCategory && matchesAvailability && matchesPrice;
        });
    }, [search, category, availability, priceRange, wishlistPackages]);


    // handle removal of a wishlist item
    const handleRemove = async (wishlistId) => {
        if (!wishlistId) return
        try {
            await apiFetch.delete(`/wishlist/remove/${wishlistId}`)
            setWishlistItems((prev) =>
                prev.filter((entry) => entry?._id !== wishlistId)
            )
            notificationApi.success({ title: 'Removed from Wishlist', placement: 'topRight' })
        } catch (error) {
            const errorMessage =
                error?.data?.message || 'Unable to remove wishlist item.'
            notificationApi.error({ title: 'Error Removing Item', placement: 'topRight' })
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
            {notificationContextHolder}
            <div className="wishlist-container">
                <div
                    className="wishlist-hero"
                    style={{
                        backgroundImage:
                            "url('/images/Wishlist_BackgroundImage.webp')"
                    }}
                >
                    <div className="wishlist-hero">
                        <img
                            src="/images/AboutUs_BackgroundImage.webp"
                            alt="Travel destinations"
                            className="wishlist-hero-image"
                            draggable={false}
                        />

                        <div className="wishlist-hero-overlay"></div>

                        <div className="wishlist-hero-content">
                            <h1>Your Favorites Are Here!</h1>
                            <p>
                                Discover packages that are currently available or on discount!
                            </p>
                        </div>
                    </div>
                </div>

                <div className="wishlist-page">
                    <header className="wishlist-header">
                        <h2>Your Wishlist</h2>
                        <p>Search and filter the packages you saved for later.</p>
                    </header>

                    <Card className="wishlist-controls-card-search" variant="borderless">
                        <div className="wishlist-controls">
                            <div className="wishlist-search">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <SearchOutlined className='wishlist-primary-label-icon' />
                                    <Text className="wishlist-primary-label-search">Search</Text>
                                </div>
                                <Input
                                    maxLength={30}
                                    allowClear
                                    placeholder="Search by destination or package name"
                                    value={search}
                                    onChange={(event) => {
                                        const cleanedValue = event.target.value
                                            .replace(/[^a-zA-Z0-9\s]/g, '')
                                            .replace(/\s{2,}/g, ' ')
                                            .replace(/^\s+/, '');

                                        setSearch(cleanedValue);
                                    }}
                                />
                            </div>
                        </div>
                    </Card>

                    <Card className="wishlist-controls-card" variant="borderless">
                        <div className="wishlist-controls">


                            <Row gutter={[16, 16]} className="wishlist-filter-grid">
                                <Col xs={24} sm={12} md={8}>
                                    <div className="filter-field">
                                        <Text className="wishlist-label">Category</Text>
                                        <Select
                                            value={category}
                                            onChange={(value) => setCategory(value)}
                                            options={categoryOptions}
                                        />
                                    </div>
                                </Col>

                                <Col xs={24} sm={12} md={8}>
                                    <div className="filter-field">
                                        <Text className="wishlist-label">Availability</Text>
                                        <Select
                                            value={availability}
                                            onChange={(value) => setAvailability(value)}
                                            options={[
                                                { value: 'All', label: 'All' },
                                                { value: 'Available', label: 'Available' },
                                                { value: 'Few slots', label: 'Few slots' },
                                                { value: 'Sold out', label: 'Sold out' },
                                            ]}
                                        />
                                    </div>
                                </Col>

                                <Col xs={24} sm={12} md={8}>
                                    <div className="filter-field">
                                        <Text className="wishlist-label">Price</Text>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>₱{priceRange[0]?.toLocaleString?.() ?? 0}</span>
                                                <span>₱{priceRange[1]?.toLocaleString?.() ?? 100000}</span>
                                            </div>
                                            <Slider
                                                range
                                                min={0}
                                                max={100000}
                                                step={1000}
                                                value={priceRange}
                                                onChange={setPriceRange}
                                                tooltip={{ formatter: (value) => `₱${value}` }}
                                            />
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    </Card>

                    <section className="wishlist-results">
                        <div className="wishlist-results-header">
                            <h3 >Wishlisted Packages</h3>
                            <Text className="wishlist-results-count" type="secondary">{filteredPackages.length} found</Text>
                        </div>

                        {isLoading ? (
                            <div className="loading-wrapper">
                                <Spin size="large" description="Loading wishlist..." />
                            </div>
                        ) : filteredPackages.length === 0 ? (
                            <div className="wishlist-empty">
                                <Empty description="No packages match your filters right now." />
                            </div>
                        ) : (
                            <Row gutter={[18, 18]}>
                                {filteredPackages.map((pkg) => {
                                    const originalPrice =
                                        Number(pkg.price || 0)

                                    const finalPrice =
                                        pkg.discountPercent > 0
                                            ? originalPrice *
                                            (1 - pkg.discountPercent / 100)
                                            : originalPrice

                                    const isUnavailable =
                                        pkg.availableSlots <= 0

                                    const availabilityClass =
                                        String(pkg.availability)
                                            .toLowerCase()
                                            .replace(/\s+/g, '-')

                                    return (
                                        <Col
                                            xs={24}
                                            sm={12}
                                            lg={12}
                                            xl={8}
                                            key={
                                                pkg.wishlistId ||
                                                pkg.packageId
                                            }
                                        >
                                            <Card
                                                className={`wishlist-reference-card${isUnavailable
                                                    ? ' wishlist-reference-card-disabled'
                                                    : ''
                                                    }`}
                                                hoverable={!isUnavailable}
                                                onClick={() => {
                                                    if (!isUnavailable) {
                                                        navigate('/package', {
                                                            state: {
                                                                packageItem:
                                                                    pkg.packageId
                                                            }
                                                        })
                                                    }
                                                }}
                                                cover={
                                                    <div className="wishlist-reference-cover">
                                                        {pkg.image ? (
                                                            <img
                                                                className="wishlist-reference-image"
                                                                src={pkg.image}
                                                                alt={pkg.title}
                                                                draggable={false}
                                                            />
                                                        ) : (
                                                            <div className="wishlist-reference-image-placeholder">
                                                                No Image
                                                            </div>
                                                        )}

                                                        {pkg.discountPercent > 0 && (
                                                            <div className="wishlist-reference-ribbon">
                                                                {
                                                                    pkg.discountPercent
                                                                }
                                                                % OFF
                                                            </div>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="wishlist-reference-remove-icon"
                                                            aria-label="Remove package from wishlist"
                                                            onClick={(event) => {
                                                                event.stopPropagation()
                                                                setSelectedWishlistId(
                                                                    pkg.wishlistId
                                                                )
                                                                setIsDeleteModalOpen(true)
                                                            }}
                                                        >
                                                            <DeleteOutlined />
                                                        </button>

                                                        <span
                                                            className={`wishlist-reference-status ${availabilityClass}`}
                                                        >
                                                            {pkg.availability}
                                                        </span>
                                                    </div>
                                                }
                                            >
                                                <h3 className="wishlist-reference-title">
                                                    {pkg.title}
                                                </h3>

                                                <div className="wishlist-reference-pricing">
                                                    {pkg.discountPercent > 0 && (
                                                        <span className="wishlist-reference-old-price">
                                                            ₱
                                                            {originalPrice.toLocaleString(
                                                                'en-PH'
                                                            )}
                                                        </span>
                                                    )}

                                                    <span className="wishlist-reference-price">
                                                        ₱
                                                        {finalPrice.toLocaleString(
                                                            'en-PH',
                                                            {
                                                                maximumFractionDigits: 2
                                                            }
                                                        )}
                                                    </span>
                                                </div>

                                                <p className="wishlist-reference-price-label">
                                                    {pkg.discountPercent > 0
                                                        ? 'Discounted price per person'
                                                        : 'Starting price per person'}
                                                </p>

                                                <div className="wishlist-reference-details">
                                                    <span>{pkg.duration}</span>

                                                    <span className="wishlist-reference-divider">
                                                        •
                                                    </span>

                                                    <span>{pkg.typeLabel}</span>
                                                </div>

                                                <div className="wishlist-reference-metrics">
                                                    <span className="wishlist-reference-slots">
                                                        Slots Available: {pkg.availableSlots}
                                                    </span>

                                                    <span className="wishlist-reference-rating">
                                                        <StarFilled style={{ color: "#ffde21" }} />
                                                        {Number(pkg.rating || 0).toFixed(1)}
                                                    </span>
                                                </div>

                                                <div className="wishlist-reference-actions">
                                                    <button
                                                        type="button"
                                                        className="wishlist-reference-view-button"
                                                        disabled={isUnavailable}
                                                        onClick={(event) => {
                                                            event.stopPropagation()

                                                            if (!isUnavailable) {
                                                                navigate('/package', {
                                                                    state: {
                                                                        packageItem:
                                                                            pkg.packageId
                                                                    }
                                                                })
                                                            }
                                                        }}
                                                    >
                                                        <EyeOutlined />

                                                        {isUnavailable
                                                            ? 'UNAVAILABLE'
                                                            : 'VIEW DETAILS'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="wishlist-reference-remove-button"
                                                        onClick={(event) => {
                                                            event.stopPropagation()

                                                            setSelectedWishlistId(
                                                                pkg.wishlistId
                                                            )

                                                            setIsDeleteModalOpen(true)
                                                        }}
                                                    >
                                                        <DeleteOutlined />
                                                        REMOVE
                                                    </button>
                                                </div>
                                            </Card>
                                        </Col>
                                    )
                                })}
                            </Row>
                        )}
                    </section>
                </div>

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
                        <h1 className='signup-success-heading'>Remove Package?</h1>
                        <p className='signup-success-text'>Are you sure you want to remove this package from your wishlist?</p>

                        <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                            <Button
                                type='primary'
                                className='logout-confirm-btn'
                                onClick={() => {
                                    handleRemove(selectedWishlistId);
                                    setSelectedWishlistId(null);
                                    setIsDeleteModalOpen(false);
                                }}
                            >
                                Remove
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
                    open={isPackageRemovedModalOpen}
                    className='signup-success-modal'
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    footer={null}
                    centered={true}
                    onCancel={() => {
                        setIsPackageRemovedModalOpen(false);
                    }}
                >
                    <div className='signup-success-container'>
                        <h1 className='signup-success-heading'>Package Removed!</h1>

                        <div>
                            <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
                        </div>

                        <p className='signup-success-text'>This Package has been removed from your Wishlist.</p>

                        <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                            <Button
                                type='primary'
                                className='logout-confirm-btn'
                                onClick={() => {
                                    setIsPackageRemovedModalOpen(false);
                                }}
                            >
                                Continue
                            </Button>
                        </div>

                    </div>
                </Modal>

            </div>
        </ConfigProvider>

    )
}
