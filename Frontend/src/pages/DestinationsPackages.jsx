import React, { useEffect, useMemo, useState } from 'react'
import { Card, Col, Input, Row, Select, Slider, Tag, Typography } from 'antd'
import TopNavUser from '../components/TopNavUser'
import '../style/destinations-packages.css'
import axiosInstance from '../config/axiosConfig'
import { useNavigate } from 'react-router-dom'

export default function DestinationsPackages() {
    const navigate = useNavigate()
    const [packages, setPackages] = useState([])
    const [search, setSearch] = useState('')
    const [budgetRange, setBudgetRange] = useState([0, 40000])
    const [selectedActivities, setSelectedActivities] = useState([])
    const [tourType, setTourType] = useState('All')
    const [daysRange, setDaysRange] = useState([1, 7])

    const { Title, Text } = Typography

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const response = await axiosInstance.get('/package/get-packages')
                const mapped = (response.data || []).map((pkg) => {
                    const rating = Number((4.2 + Math.random() * 0.7).toFixed(1))
                    return {
                        id: pkg._id,
                        title: pkg.packageName,
                        location: pkg.packageType === 'international' ? 'International' : 'Philippines',
                        type: pkg.packageType === 'international' ? 'International' : 'Domestic',
                        days: pkg.packageDuration,
                        budget: pkg.packagePricePerPax,
                        activities: Array.isArray(pkg.packageInclusions) && pkg.packageInclusions.length
                            ? pkg.packageInclusions.slice(0, 3)
                            : ['Tour', 'Sightseeing'],
                        rating,
                        image: pkg.image || ''
                    }
                })
                setPackages(mapped)
            } catch (error) {
                console.error('Failed to load packages:', error)
                setPackages([])
            }
        }

        fetchPackages()
    }, [])

    const activityOptions = useMemo(() => {
        const unique = new Set()
        packages.forEach((pkg) => {
            pkg.activities?.forEach((activity) => unique.add(activity))
        })
        return Array.from(unique)
    }, [packages])

    const filteredPackages = useMemo(() => {
        const query = search.trim().toLowerCase()
        return packages.filter((pkg) => {
            const matchesSearch =
                query.length === 0 ||
                pkg.title.toLowerCase().includes(query) ||
                pkg.location.toLowerCase().includes(query)

            const matchesBudget =
                pkg.budget >= budgetRange[0] && pkg.budget <= budgetRange[1]

            const matchesActivities =
                selectedActivities.length === 0 ||
                selectedActivities.every((activity) =>
                    pkg.activities.includes(activity)
                )

            const matchesType = tourType === 'All' || pkg.type === tourType

            const matchesDays =
                pkg.days >= daysRange[0] && pkg.days <= daysRange[1]

            return (
                matchesSearch &&
                matchesBudget &&
                matchesActivities &&
                matchesType &&
                matchesDays
            )
        })
    }, [packages, search, budgetRange, selectedActivities, tourType, daysRange])

    return (
        <div>
            <TopNavUser />
            <div className="destinations-page">
                <header className="destinations-header">
                    <Title level={2}>Destinations & Packages</Title>
                    <Text type="secondary">
                        Find the best tour packages that match your budget, activities,
                        and schedule.
                    </Text>
                </header>

                <div className="destinations-controls">
                    <div className="destinations-search">
                        <Text className="destinations-label">Search</Text>
                        <Input
                            allowClear
                            placeholder="Search by destination or package"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <Row gutter={[16, 16]} className="destinations-filter-grid">
                        <Col xs={24} md={12} xl={6}>
                            <div className="filter-field">
                                <Text className="destinations-label">Budget (₱)</Text>
                                <Slider
                                    range
                                    min={0}
                                    max={50000}
                                    value={budgetRange}
                                    onChange={(value) => setBudgetRange(value)}
                                    tooltip={{ formatter: (value) => `₱${value}` }}
                                />
                                <Text className="filter-hint">
                                    ₱{budgetRange[0].toLocaleString()} - ₱{budgetRange[1].toLocaleString()}
                                </Text>
                            </div>
                        </Col>

                        <Col xs={24} md={12} xl={6}>
                            <div className="filter-field">
                                <Text className="destinations-label">Activities</Text>
                                <Select
                                    mode="multiple"
                                    allowClear
                                    placeholder="Select activities"
                                    value={selectedActivities}
                                    onChange={(value) => setSelectedActivities(value)}
                                    options={activityOptions.map((activity) => ({
                                        value: activity,
                                        label: activity,
                                    }))}
                                />
                            </div>
                        </Col>

                        <Col xs={24} md={12} xl={6}>
                            <div className="filter-field">
                                <Text className="destinations-label">Tour Type</Text>
                                <Select
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

                        <Col xs={24} md={12} xl={6}>
                            <div className="filter-field">
                                <Text className="destinations-label">Days of Tour</Text>
                                <Slider
                                    range
                                    min={1}
                                    max={10}
                                    value={daysRange}
                                    onChange={(value) => setDaysRange(value)}
                                    tooltip={{ formatter: (value) => `${value} day${value > 1 ? 's' : ''}` }}
                                />
                                <Text className="filter-hint">
                                    {daysRange[0]} - {daysRange[1]} days
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

                    <Row gutter={[18, 18]}>
                        {filteredPackages.map((pkg) => (
                            <Col xs={24} sm={12} lg={8} key={pkg.id}>
                                <Card
                                    className="destinations-card"
                                    hoverable
                                    onClick={() => navigate(`/package/${pkg.id}`)}
                                >
                                    <div className="destinations-card-image">
                                        {pkg.image ? (
                                            <img src={pkg.image} alt={pkg.title} />
                                        ) : (
                                            <div className="destinations-card-image-placeholder">No Image</div>
                                        )}
                                    </div>
                                    <div className="destinations-card-header">
                                        <div>
                                            <Title level={5} className="destinations-card-title">
                                                {pkg.title}
                                            </Title>
                                            <Text type="secondary">{pkg.location}</Text>
                                        </div>
                                        <Tag className="destinations-rating">⭐ {pkg.rating}</Tag>
                                    </div>
                                    <div className="destinations-card-meta">
                                        <Tag className="destinations-type">{pkg.type}</Tag>
                                        <Text type="secondary">{pkg.days} days</Text>
                                    </div>
                                    <div className="destinations-card-activities">
                                        {pkg.activities.map((activity) => (
                                            <Tag key={activity}>{activity}</Tag>
                                        ))}
                                    </div>
                                    <div className="destinations-card-footer">
                                        <Text className="destinations-price">
                                            ₱{pkg.budget.toLocaleString()}
                                        </Text>
                                        <Text className="destinations-budget">Budget</Text>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </section>
            </div>
        </div>
    )
}
