import React, { useEffect, useMemo, useState } from 'react'
import { Card, Col, Input, InputNumber, Row, Select, Slider, Tag, Typography, ConfigProvider } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import TopNavUser from '../../components/TopNavUser'
import '../../style/client/destinationspackages.css'
import axiosInstance from '../../config/axiosConfig'


export default function DestinationsPackages() {
    const navigate = useNavigate()
    const location = useLocation()
    const [packages, setPackages] = useState([])
    const [search, setSearch] = useState('')
    const [budgetRange, setBudgetRange] = useState([0, 40000])
    const [selectedTags, setSelectedTags] = useState([])
    const [tourType, setTourType] = useState('All')
    const [daysValue, setDaysValue] = useState(3)
    const [travelersValue, setTravelersValue] = useState(null)

    const { Title, Text } = Typography

    //get all packages from package collection and map it
    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const response = await axiosInstance.get('/package/get-packages')

                const mapped = (response.data || []).map(async (pkg) => {
                    const ratingResponse = await axiosInstance.get(`/rating/average-rating/${pkg._id}`)
                    const rating = ratingResponse.data?.averageRating || 0

                    console.log(rating)

                    return {
                        id: pkg._id,
                        title: pkg.packageName,
                        location: pkg.packageType === 'international' ? 'International' : 'Philippines',
                        type: pkg.packageType === 'international' ? 'International' : 'Domestic',
                        days: pkg.packageDuration,
                        budget: pkg.packagePricePerPax,
                        availableSlots: pkg.packageAvailableSlots || 0,
                        rating,
                        images: pkg.images && pkg.images.length > 0 ? pkg.images[0] : '',
                        tags: pkg.packageTags || []
                    }
                })

                setPackages(await Promise.all(mapped))
            } catch (error) {
                console.error('Failed to load packages:', error)
                setPackages([])
            }
        }
        fetchPackages()
    }, [])


    //gets the values from the search bar from the landing page and sets the filters based on the configuration of the user
    useEffect(() => {
        if (!location.search) return //if no inputs from the search bar, then skip parsing and just show all packages

        const params = new URLSearchParams(location.search)
        const query = params.get('q')
        const tag = params.get('tag')
        const tourTypeParam = params.get('tourType')
        const minBudget = Number(params.get('minBudget'))
        const maxBudget = Number(params.get('maxBudget'))
        const maxDays = Number(params.get('maxDays'))
        const travelers = Number(params.get('travelers'))

        if (query !== null) {
            setSearch(query)
        }

        if (tag) {
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


    const filteredPackages = useMemo(() => {
        const query = search.trim().toLowerCase()
        return packages.filter((pkg) => {
            const matchesSearch =
                query.length === 0 ||
                pkg.title.toLowerCase().includes(query) ||
                pkg.location.toLowerCase().includes(query)

            const matchesBudget =
                pkg.budget >= budgetRange[0] && pkg.budget <= budgetRange[1]

            const matchesTags =
                selectedTags.length === 0 ||
                selectedTags.every((tag) =>
                    pkg.tags?.includes(tag)
                )

            const matchesType = tourType === 'All' || pkg.type === tourType

            const matchesDays =
                pkg.days >= 1 && pkg.days <= daysValue

            const matchesTravelers =
                !Number.isFinite(travelersValue) || travelersValue <= 0 || pkg.availableSlots >= travelersValue

            return (
                matchesSearch &&
                matchesBudget &&
                matchesTags &&
                matchesType &&
                matchesDays &&
                matchesTravelers
            )
        })
    }, [packages, search, budgetRange, selectedTags, tourType, daysValue, travelersValue])


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
                        <h1>Find your destination</h1>
                        <p>Discover affordable packages and explore around the world by setting you preferrences!</p>
                    </div>
                </div>

                <div className="destinations-page">
                    <header className="destinations-header">
                        <Title level={2}>Destinations & Packages</Title>
                        <Text type="secondary">
                            Find the best tour packages that match your budget, activities,
                            and schedule.
                        </Text>
                    </header>

                    <div className="destinations-search">
                        <Text className="destinations-label">Search</Text>
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
                                            max={100000}
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
                                            max={100000}
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
                                        max={100000}
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
                                            max={10}
                                            maxLength={2}
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
                                        max={10}
                                        value={daysValue}
                                        onChange={setDaysValue}
                                        tooltip={{ formatter: (value) => `${value} day${value > 1 ? 's' : ''}` }} //if one day then show "day", if more that one day then show "days"
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

                        <Row gutter={[18, 18]}>
                            {filteredPackages.map((pkg) => (
                                <Col xs={24} sm={12} lg={8} key={pkg.id}>
                                    <Card
                                        className="destinations-card"
                                        hoverable
                                        onClick={() => navigate(`/package/${pkg.id}`)}
                                    >
                                        <div className="destinations-card-image">
                                            {pkg.images ? (
                                                <img src={pkg.images} alt={pkg.title} />
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
                                            {pkg.tags?.map((tag) => (
                                                <Tag key={tag}>{tag}</Tag>
                                            ))}
                                        </div>
                                        <div className="destinations-card-footer">
                                            <Text className="destinations-price">
                                                ₱{(
                                                    Number.isFinite(travelersValue) && travelersValue > 0
                                                        ? pkg.budget * travelersValue
                                                        : pkg.budget
                                                ).toLocaleString()}
                                                {Number.isFinite(travelersValue) && travelersValue > 0
                                                    ? ` for ${travelersValue} person${travelersValue > 1 ? 's' : ''}`
                                                    : ''}
                                            </Text>
                                            <Text className="destinations-budget">
                                                {Number.isFinite(travelersValue) && travelersValue > 0 ? 'Total Budget' : 'Budget / Pax'}
                                            </Text>
                                        </div>
                                    </Card>
                                </Col>
                            ))}
                        </Row>
                    </section>
                </div>
            </div>
        </ConfigProvider>
    )
}
