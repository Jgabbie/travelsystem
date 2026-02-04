import React, { useMemo, useState } from 'react'
import { Button, Card, Col, Empty, Input, Row, Select, Tag, Typography } from 'antd'
import '../style/wishlist.css'
import TopNavUser from '../components/TopNavUser'

const FAKE_PACKAGES = [
    {
        id: 1,
        title: 'Bohol Beach Escape',
        location: 'Bohol',
        duration: '3D2N',
        price: 6499,
        rating: 4.7,
        category: 'Beach',
        availability: 'Available',
    },
    {
        id: 2,
        title: 'Sagada Mountain Retreat',
        location: 'Sagada',
        duration: '4D3N',
        price: 7999,
        rating: 4.8,
        category: 'Mountain',
        availability: 'Few slots',
    },
    {
        id: 3,
        title: 'Ilocos Heritage Tour',
        location: 'Ilocos',
        duration: '2D1N',
        price: 3999,
        rating: 4.4,
        category: 'City',
        availability: 'Available',
    },
    {
        id: 4,
        title: 'Siargao Surf Weekend',
        location: 'Siargao',
        duration: '3D2N',
        price: 8999,
        rating: 4.9,
        category: 'Beach',
        availability: 'Sold out',
    },
    {
        id: 5,
        title: 'Cebu Foodie City Walk',
        location: 'Cebu',
        duration: '1D',
        price: 2299,
        rating: 4.2,
        category: 'City',
        availability: 'Available',
    },
    {
        id: 6,
        title: 'Baguio Cool Weather Getaway',
        location: 'Baguio',
        duration: '2D1N',
        price: 3599,
        rating: 4.5,
        category: 'Mountain',
        availability: 'Few slots',
    },
]

export default function Wishlist() {
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('All')
    const [availability, setAvailability] = useState('All')
    const [priceRange, setPriceRange] = useState('All')

    const { Title, Text } = Typography

    const filteredPackages = useMemo(() => {
        const query = search.trim().toLowerCase()
        return FAKE_PACKAGES.filter((pkg) => {
            const matchesQuery =
                query.length === 0 ||
                pkg.title.toLowerCase().includes(query) ||
                pkg.location.toLowerCase().includes(query)

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
    }, [search, category, availability, priceRange])

    return (
        <div>
            <TopNavUser />
            <div className="wishlist-page">
                <header className="wishlist-header">
                    <Title level={2}>Your Wishlist</Title>
                    <Text type="secondary">Search and filter the packages you saved for later.</Text>
                </header>

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
                                    options={[
                                        { value: 'All', label: 'All' },
                                        { value: 'Beach', label: 'Beach' },
                                        { value: 'Mountain', label: 'Mountain' },
                                        { value: 'City', label: 'City' },
                                    ]}
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

                <section className="wishlist-results">
                    <div className="wishlist-results-header">
                        <Title level={4}>Packages</Title>
                        <Text type="secondary">{filteredPackages.length} found</Text>
                    </div>

                    {filteredPackages.length === 0 ? (
                        <div className="wishlist-empty">
                            <Empty description="No packages match your filters right now." />
                        </div>
                    ) : (
                        <Row gutter={[18, 18]}>
                            {filteredPackages.map((pkg) => (
                                <Col xs={24} sm={12} lg={8} key={pkg.id}>
                                    <Card className="wishlist-card" hoverable>
                                        <div className="wishlist-card-header">
                                            <div>
                                                <Title level={5} className="wishlist-card-title">
                                                    {pkg.title}
                                                </Title>
                                                <Text type="secondary" className="wishlist-location">
                                                    {pkg.location}
                                                </Text>
                                            </div>
                                            <Tag className="wishlist-rating">⭐ {pkg.rating}</Tag>
                                        </div>
                                        <div className="wishlist-card-meta">
                                            <Text type="secondary">{pkg.duration}</Text>
                                            <Tag className={`wishlist-badge ${pkg.availability.replace(' ', '-')}`}>
                                                {pkg.availability}
                                            </Tag>
                                        </div>
                                        <div className="wishlist-card-footer">
                                            <Text className="wishlist-price">
                                                ₱{pkg.price.toLocaleString()}
                                            </Text>
                                            <Button type="primary">View details</Button>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    )}
                </section>
            </div>
        </div>

    )
}
