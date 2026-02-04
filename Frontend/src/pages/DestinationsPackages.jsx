import React, { useMemo, useState } from 'react'
import { Card, Col, Input, Row, Select, Slider, Tag, Typography } from 'antd'
import TopNavUser from '../components/TopNavUser'
import '../style/destinations-packages.css'

const SAMPLE_PACKAGES = [
    {
        id: 1,
        title: 'Bohol Beach Escape',
        location: 'Bohol, PH',
        type: 'Domestic',
        days: 3,
        budget: 6500,
        activities: ['Beach', 'Island Hopping'],
        rating: 4.7,
    },
    {
        id: 2,
        title: 'Sagada Mountain Retreat',
        location: 'Sagada, PH',
        type: 'Domestic',
        days: 4,
        budget: 8200,
        activities: ['Hiking', 'Nature'],
        rating: 4.8,
    },
    {
        id: 3,
        title: 'Tokyo City Highlights',
        location: 'Tokyo, JP',
        type: 'International',
        days: 5,
        budget: 38000,
        activities: ['City Tour', 'Food', 'Shopping'],
        rating: 4.9,
    },
    {
        id: 4,
        title: 'Siargao Surf Weekend',
        location: 'Siargao, PH',
        type: 'Domestic',
        days: 3,
        budget: 9800,
        activities: ['Beach', 'Surfing'],
        rating: 4.6,
    },
    {
        id: 5,
        title: 'Seoul Culture + Food',
        location: 'Seoul, KR',
        type: 'International',
        days: 4,
        budget: 29000,
        activities: ['City Tour', 'Food', 'Museums'],
        rating: 4.5,
    },
    {
        id: 6,
        title: 'Palawan Island Escape',
        location: 'Palawan, PH',
        type: 'Domestic',
        days: 5,
        budget: 15500,
        activities: ['Beach', 'Island Hopping', 'Snorkeling'],
        rating: 4.9,
    },
]

const ALL_ACTIVITIES = Array.from(
    new Set(SAMPLE_PACKAGES.flatMap((pkg) => pkg.activities))
)

export default function DestinationsPackages() {
    const [search, setSearch] = useState('')
    const [budgetRange, setBudgetRange] = useState([0, 40000])
    const [selectedActivities, setSelectedActivities] = useState([])
    const [tourType, setTourType] = useState('All')
    const [daysRange, setDaysRange] = useState([1, 7])

    const { Title, Text } = Typography

    const filteredPackages = useMemo(() => {
        const query = search.trim().toLowerCase()
        return SAMPLE_PACKAGES.filter((pkg) => {
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
    }, [search, budgetRange, selectedActivities, tourType, daysRange])

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
                                    options={ALL_ACTIVITIES.map((activity) => ({
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
                                <Card className="destinations-card" hoverable>
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
