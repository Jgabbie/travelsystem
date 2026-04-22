import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Input, Row, Select, Tag, Typography, message, ConfigProvider, Modal, Spin, Slider } from 'antd'
import { DeleteOutlined, EyeOutlined, CheckCircleFilled, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../../config/fetchConfig'
import '../../style/client/wishlist.css'
import TopNavUser from '../../components/topnav/TopNavUser'

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

    const { Title, Text } = Typography

    useEffect(() => {
        const loadWishlist = async () => {
            try {
                setIsLoading(true)
                const response = await apiFetch.get('/wishlist')
                const wishlist = response?.wishlist || []

                //console.log('Wishlist data:', wishlist)

                setWishlistItems(wishlist)
            } catch (error) {
                const errorMessage =
                    error?.data?.message || 'Unable to load wishlist.'
                message.error(errorMessage)
                setWishlistItems([])
            } finally {
                setIsLoading(false)
            }
        }

        loadWishlist()
    }, [])

    const wishlistPackages = useMemo(() => {
        return wishlistItems.map((entry) => {
            const pkg = entry?.packageId || {}
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

            console.log(availableSlots)

            return {
                wishlistId: entry._id,
                packageId: pkg._id || entry.packageId,
                title: pkg.packageName || 'Package',
                location: pkg.packageCode || pkg.packageType || 'Package',
                duration: pkg.packageDuration ? `${pkg.packageDuration} DAYS` : 'N/A',
                price: pkg.packagePricePerPax ?? 0,
                discountPercent: Number(pkg.packageDiscountPercent) || 0,
                category: pkg.packageType ? pkg.packageType.toUpperCase() : 'Other',
                availability: availabilityLabel,
                typeLabel: pkg.packageType ? pkg.packageType.toUpperCase() : 'Package',
                availableSlots,
                image: pkg.images?.[0] || ''
            }
        })
    }, [wishlistItems])

    const categoryOptions = useMemo(() => ([
        { value: 'All', label: 'All' },
        { value: 'Domestic', label: 'Domestic' },
        { value: 'International', label: 'International' }
    ]), [])

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

    const handleRemove = async (wishlistId) => {
        if (!wishlistId) return
        try {
            await apiFetch.delete(`/wishlist/remove/${wishlistId}`)
            setWishlistItems((prev) =>
                prev.filter((entry) => entry?._id !== wishlistId)
            )
            message.success('Removed from wishlist')
        } catch (error) {
            const errorMessage =
                error?.data?.message || 'Unable to remove wishlist item.'
            message.error(errorMessage)
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

            <div className="wishlist-container">
                <div className="destinations-hero-section">
                    <div className="destinations-hero-overlay"></div>
                    <div className="destinations-hero-content">
                        <h1>Your Favorites Are Here!</h1>
                        <p>Discover packages that are currently available or in discount!</p>
                    </div>
                </div>

                <div className="wishlist-page">
                    <header className="wishlist-header">
                        <Title level={2}>Your Wishlist</Title>
                        <Text type="secondary">Search and filter the packages you saved for later.</Text>
                    </header>

                    <Card className="wishlist-controls-card" bordered={false}>
                        <div className="wishlist-controls">
                            <div className="wishlist-search">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <SearchOutlined className='destinations-primary-label-icon' />
                                    <Text className="destinations-primary-label">Search</Text>
                                </div>
                                <Input
                                    allowClear
                                    placeholder="Search by destination or package name"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>

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
                            <Title level={4}>Packages</Title>
                            <Text type="secondary">{filteredPackages.length} found</Text>
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
                                {filteredPackages.map((pkg) => (
                                    <Col xs={24} sm={12} lg={12} xl={12} key={pkg.wishlistId || pkg.packageId}>
                                        <Card
                                            className="wishlist-card"
                                            hoverable
                                        >
                                            <div className="wishlist-card-image">
                                                {pkg.image ? (
                                                    <img src={pkg.image} alt={pkg.title} />
                                                ) : (
                                                    <div className="wishlist-card-image-placeholder">No image</div>
                                                )}
                                            </div>
                                            <div className="wishlist-card-content">
                                                <div className="wishlist-card-header">
                                                    <div>
                                                        <Title level={5} className="wishlist-card-title">
                                                            {pkg.title}
                                                        </Title>
                                                        <Text type="secondary" className="wishlist-location">
                                                            {pkg.location}
                                                        </Text>
                                                    </div>
                                                </div>
                                                <div className="wishlist-card-meta">
                                                    <Tag className="wishlist-type-tag">{pkg.typeLabel}</Tag>
                                                    <Tag className={`wishlist-status-tag ${pkg.availability.replace(' ', '-')}`}>
                                                        {pkg.availability}
                                                    </Tag>
                                                    <Text type="secondary">{pkg.duration}</Text>
                                                </div>
                                                <div className="wishlist-card-footer">
                                                    <div className="wishlist-card-pricing">
                                                        {pkg.discountPercent > 0 ? (
                                                            <Text delete className="wishlist-price wishlist-price-old">
                                                                ₱{Number(pkg.price || 0).toLocaleString()}
                                                            </Text>
                                                        ) : null}
                                                        <Text className="wishlist-price">
                                                            ₱{(
                                                                pkg.discountPercent > 0
                                                                    ? Number(pkg.price || 0) * (1 - pkg.discountPercent / 100)
                                                                    : Number(pkg.price || 0)
                                                            ).toLocaleString()}
                                                        </Text>
                                                        <Text className="wishlist-budget">
                                                            {pkg.discountPercent > 0 ? 'Discounted / Pax' : 'Budget / Pax'}
                                                        </Text>
                                                    </div>
                                                    <div className="wishlist-card-actions">
                                                        <Button
                                                            icon={<EyeOutlined />}
                                                            type='primary'
                                                            className={`wishlist-view-button${pkg.availableSlots <= 0 ? ' wishlist-view-button-disabled' : ''}`}
                                                            onClick={() => navigate(`/package/${pkg.packageId}`)}
                                                            disabled={pkg.availableSlots <= 0}
                                                            style={pkg.availableSlots <= 0 ? { pointerEvents: 'none' } : {}}
                                                        >
                                                            View details
                                                        </Button>
                                                        <Button
                                                            icon={<DeleteOutlined />}
                                                            type='primary'
                                                            className="wishlist-remove-button"
                                                            onClick={() => {
                                                                setIsDeleteModalOpen(true)
                                                                setSelectedWishlistId(pkg.wishlistId)
                                                            }}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="wishlist-card-badges">
                                                    <Text type="secondary">Slots: {pkg.availableSlots}</Text>
                                                    {pkg.discountPercent > 0 ? (
                                                        <Tag className="wishlist-discount-tag">-{pkg.discountPercent}%</Tag>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </Card>
                                    </Col>
                                ))}
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
                    style={{ top: 220 }}
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
                    style={{ top: 220 }}
                    onCancel={() => {
                        setIsPackageRemovedModalOpen(false);
                    }}
                >
                    <div className='signup-success-container'>
                        <h1 className='signup-success-heading'>Package Removed!</h1>

                        <div>
                            <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
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
