import React, { useMemo, useState } from 'react'
import { Button, Input, Select, Tag, Typography } from 'antd'
import TopNavUser from '../../components/TopNavUser'
import '../../style/client/passandvisaservice.css'



export default function PassAndVisaService() {
    const [search, setSearch] = useState('')
    const [visaType, setVisaType] = useState('All')
    const [processing, setProcessing] = useState('All')
    const { Title, Text } = Typography

    const VISA_OPTIONS = [
        {
            id: 1,
            name: 'Japan Tourist Visa',
            type: 'Tourist',
            processing: 'Standard',
            description: 'Single entry visa for tourism and leisure travel.',
        },
        {
            id: 2,
            name: 'South Korea Tourist Visa',
            type: 'Tourist',
            processing: 'Express',
            description: 'Short-term tourist visa with priority processing.',
        },
        {
            id: 3,
            name: 'Schengen Visa',
            type: 'Tourist',
            processing: 'Standard',
            description: 'Access to multiple European countries within Schengen.',
        },
        {
            id: 4,
            name: 'Australia Visitor Visa',
            type: 'Tourist',
            processing: 'Standard',
            description: 'Visitor visa for holiday and family visits.',
        },
        {
            id: 5,
            name: 'Canada Student Visa',
            type: 'Student',
            processing: 'Standard',
            description: 'Study permit processing for enrolled students.',
        },
        {
            id: 6,
            name: 'US B1/B2 Visa',
            type: 'Business',
            processing: 'Express',
            description: 'Business and tourism combined visa application.',
        },
    ]

    const filteredVisas = useMemo(() => {
        const query = search.trim().toLowerCase()
        return VISA_OPTIONS.filter((visa) => {
            const matchesSearch =
                query.length === 0 ||
                visa.name.toLowerCase().includes(query) ||
                visa.description.toLowerCase().includes(query)

            const matchesType = visaType === 'All' || visa.type === visaType
            const matchesProcessing =
                processing === 'All' || visa.processing === processing

            return matchesSearch && matchesType && matchesProcessing
        })
    }, [search, visaType, processing])

    return (
        <div>
            <TopNavUser />

            <div className="passandvisa-hero-section">
                <div className="passandvisa-hero-overlay"></div>
                <div className="passandvisa-hero-content">
                    <h1>Need some Assistance?</h1>
                    <p>M&RC Travel and Tours is here to guide you in getting your passport or visa for your upcoming trip!</p>
                </div>
            </div>

            <div className="passport-assistance">
                <header className='passandvisa-header'>
                    <Title level={2}>Passport and VISA Services</Title>
                    <Text type="secondary">Search and filter VISAs or apply for Passport services.</Text>
                </header>
                <div className="passport-visa-layout">
                    <section className="visa-section">
                        <div className="section-header">
                            <h3>Visa Services</h3>
                            <p>Search and filter the visa type you need to apply.</p>
                        </div>

                        <div className="visa-controls">
                            <div className="visa-search">
                                <span className="field-label">Search</span>
                                <Input
                                    allowClear
                                    placeholder="Search visa type"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </div>
                            <div className="visa-filters">
                                <div className="filter-field">
                                    <span className="field-label">Visa Type</span>
                                    <Select
                                        value={visaType}
                                        onChange={(value) => setVisaType(value)}
                                        options={[
                                            { value: 'All', label: 'All' },
                                            { value: 'Tourist', label: 'Tourist' },
                                            { value: 'Business', label: 'Business' },
                                            { value: 'Student', label: 'Student' },
                                        ]}
                                    />
                                </div>
                                <div className="filter-field">
                                    <span className="field-label">Processing</span>
                                    <Select
                                        value={processing}
                                        onChange={(value) => setProcessing(value)}
                                        options={[
                                            { value: 'All', label: 'All' },
                                            { value: 'Standard', label: 'Standard' },
                                            { value: 'Express', label: 'Express' },
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="visa-list">
                            {filteredVisas.map((visa) => (
                                <div className="visa-card" key={visa.id}>
                                    <div>
                                        <h4>{visa.name}</h4>
                                        <p>{visa.description}</p>
                                    </div>
                                    <div className="visa-actions">
                                        <div className="visa-tags">
                                            <Tag>{visa.type}</Tag>
                                            <Tag className={
                                                visa.processing === 'Express'
                                                    ? 'tag-express'
                                                    : 'tag-standard'
                                            }>
                                                {visa.processing}
                                            </Tag>
                                        </div>
                                        <Button type="primary" className="visa-apply-btn">
                                            Apply
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="passport-section">
                        <div className="section-header">
                            <h3>Passport Assistance</h3>
                            <p>Select the passport service you need.</p>
                        </div>
                        <div className="passport-card-grid">
                            <div className="passport-card" role="button" tabIndex={0}>
                                <h3>New Passport</h3>
                                <p>Apply for a passport for first-time applicants.</p>
                            </div>
                            <div className="passport-card" role="button" tabIndex={0}>
                                <h3>Renew Passport</h3>
                                <p>Renew your existing passport quickly.</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>

    )
}
