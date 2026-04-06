import React, { useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Input, Row, Select, Tag, Typography, message, ConfigProvider, Modal, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import TopNavUser from '../../components/TopNavUser'
import axiosInstance from '../../config/axiosConfig'
import '../../style/client/wishlist.css'

export default function Wishlist() {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('All')
    const [availability, setAvailability] = useState('All')
    const [priceRange, setPriceRange] = useState('All')
    const [wishlistItems, setWishlistItems] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const { Title, Text } = Typography

    useEffect(() => {
        const loadWishlist = async () => {
            try {
                setIsLoading(true)
                const response = await axiosInstance.get('/wishlist')
                const wishlist = response?.data?.wishlist || []

                //console.log('Wishlist data:', wishlist)

                setWishlistItems(wishlist)
            } catch (error) {
                const errorMessage =
                    error?.response?.data?.message || 'Unable to load wishlist.'
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
                category: pkg.packageType ? pkg.packageType.toUpperCase() : 'Other',
                availability: availabilityLabel,
                typeLabel: pkg.packageType ? pkg.packageType.toUpperCase() : 'Package',
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
        const query = search.trim().toLowerCase()
        return wishlistPackages.filter((pkg) => {
            const matchesQuery =
                query.length === 0 ||
                pkg.title.toLowerCase().includes(query) ||
                pkg.location.toLowerCase().includes(query) ||
                pkg.category.toLowerCase().includes(query)

            const matchesCategory = category === 'All' || pkg.category === category
            const matchesAvailability =
                availability === 'All' || pkg.availability === availability

            const matchesPrice = (() => {
                if (priceRange === 'All') return true
                if (priceRange === 'Under 4000') return pkg.price < 4000
                if (priceRange === '4000-7000') return pkg.price >= 4000 && pkg.price <= 7000
                if (priceRange === '7000+') return pkg.price > 7000
                return true
            })()

            return matchesQuery && matchesCategory && matchesAvailability && matchesPrice
        })
    }, [search, category, availability, priceRange, wishlistPackages])

    const handleRemove = async (wishlistId) => {
        if (!wishlistId) return
        try {
            await axiosInstance.delete(`/wishlist/remove/${wishlistId}`)
            setWishlistItems((prev) =>
                prev.filter((entry) => entry?._id !== wishlistId)
            )
            message.success('Removed from wishlist')
        } catch (error) {
            const errorMessage =
                error?.response?.data?.message || 'Unable to remove wishlist item.'
            message.error(errorMessage)
        }
    }

    const confirmRemove = (pkg) => {
        Modal.confirm({
            title: 'Remove from wishlist',
            content: `Remove ${pkg.title} from your wishlist?`,
            okText: 'Remove',
            cancelText: 'Cancel',
            onOk: async () => {
                await handleRemove(pkg.wishlistId)
            }
        })
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
                <TopNavUser />

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
                                <Text className="wishlist-label">Search</Text>
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
                                        <Select
                                            value={priceRange}
                                            onChange={(value) => setPriceRange(value)}
                                            options={[
                                                { value: 'All', label: 'All' },
                                                { value: 'Under 4000', label: 'Under 4000' },
                                                { value: '4000-7000', label: '4000-7000' },
                                                { value: '7000+', label: '7000+' },
                                            ]}
                                        />
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
                                    <Col xs={24} sm={12} lg={8} key={pkg.wishlistId || pkg.packageId}>
                                        <Card className="wishlist-card" hoverable>
                                            <div className="wishlist-card-image">
                                                {pkg.image ? (
                                                    <img src={pkg.image} alt={pkg.title} />
                                                ) : (
                                                    <div className="wishlist-card-image-placeholder">No image</div>
                                                )}
                                            </div>
                                            <div className="wishlist-card-header">
                                                <div>
                                                    <Title level={5} className="wishlist-card-title">
                                                        {pkg.title}
                                                    </Title>
                                                    <Text type="secondary" className="wishlist-location">
                                                        {pkg.location}
                                                    </Text>
                                                </div>
                                                <Tag className="wishlist-rating">{pkg.typeLabel}</Tag>
                                            </div>
                                            <div className="wishlist-card-meta">
                                                <Text type="secondary">{pkg.duration}</Text>
                                                <Tag className={`wishlist-badge ${pkg.availability.replace(' ', '-')}`}>
                                                    {pkg.availability}
                                                </Tag>
                                            </div>
                                            <div className="wishlist-card-footer">
                                                <Text className="wishlist-price">
                                                    ₱{Number(pkg.price || 0).toLocaleString()}
                                                </Text>
                                                <div className="wishlist-card-actions">
                                                    <Button
                                                        className='wishlist-view-button'
                                                        onClick={() => navigate(`/package/${pkg.packageId}`)}
                                                    >
                                                        View details
                                                    </Button>
                                                    <Button
                                                        className="wishlist-remove-button"
                                                        onClick={() => confirmRemove(pkg)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </section>
                </div>
            </div>
        </ConfigProvider>

    )
}
