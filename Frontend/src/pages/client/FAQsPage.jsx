import React, { useMemo, useState } from 'react'
import { Button, Collapse, ConfigProvider, Input, Modal, Image, Typography } from 'antd'
import { FacebookFilled, InstagramFilled, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import '../../style/client/faqspage.css'

const { Title, Text } = Typography

const { Panel } = Collapse

const faqData = [
    {
        category: 'Bookings',
        question: 'How do I book a tour package?',
        answer: 'Go to Destinations, choose a package, then follow the booking steps. You will receive a booking reference after submission.'
    },
    {
        category: 'Bookings',
        question: 'Can I cancel a booking?',
        answer: 'Yes. Open My Bookings, choose a booking, and submit a cancellation request with the required proof.'
    },
    {
        category: 'Payments',
        question: 'What payment methods are supported?',
        answer: 'Payments are processed through the available options shown during checkout. If you need help, contact support.'
    },
    {
        category: 'Quotations',
        question: 'How do I request a quotation?',
        answer: 'Use the quotation request page to submit your travel details. Our team will send a quote once reviewed.'
    },
    {
        category: 'Account',
        question: 'How do I reset my password?',
        answer: 'Use the Reset Password page and follow the instructions sent to your email.'
    },
    {
        category: 'Services',
        question: 'Do you offer visa and passport services?',
        answer: 'Yes. Visit the Services page for passport and visa assistance options.'
    },
    {
        category: 'Services',
        question: 'What documents do I need to prepare?',
        answer: 'Refer to the requirements section above for a general list. Specific services may have additional requirements.'
    },
    {
        category: 'Services',
        question: 'How long does the process take?',
        answer: 'Processing times vary by the DFA office and Embassy and the type of service you are applying for. After submission, you will receive updates on your application status.'
    },
    {
        category: 'Services',
        question: 'Can I reschedule my appointment?',
        answer: 'Rescheduling policies depend on the DFA office. If you need to change your appointment, please contact the DFA office directly.'
    }
]



export default function FAQsPage() {
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')
    const [activeCategory, setActiveCategory] = useState('All')

    const [isChatbotOpen, setIsChatbotOpen] = useState(false)
    const [chatMessage, setChatMessage] = useState('')

    const categories = useMemo(() => {
        const unique = new Set(faqData.map((item) => item.category))
        return ['All', ...Array.from(unique)]
    }, [])

    const filteredFaqs = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()

        return faqData.filter((item) => {
            const matchesTerm =
                !term ||
                item.question.toLowerCase().includes(term) ||
                item.answer.toLowerCase().includes(term)
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory
            return matchesTerm && matchesCategory
        })
    }, [activeCategory, searchTerm])

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797'
                }
            }}
        >
            <div className="faq-container">

                <div className="faq-hero">
                    <div className="faq-hero-overlay"></div>
                    <div className="faq-hero-content">
                        <h1>General FAQs</h1>
                        <p>Find quick answers about bookings, payments, and services.</p>
                    </div>
                </div>

                <div className="faq-page">
                    <header className="faq-header">
                        <Title level={2}>Frequently Asked Questions</Title>
                        <Text type="secondary">
                            Browse our FAQs to find quick answers about bookings, payments, and services.
                            Can't find what you're looking for? Contact us for personalized support.
                        </Text>
                    </header>
                    <div className="faq-filters">
                        {categories.map((category) => (
                            <Button
                                key={category}
                                className={`faq-filter-button${activeCategory === category ? ' faq-filter-button--active' : ''}`}
                                onClick={() => setActiveCategory(category)}
                            >
                                {category}
                            </Button>
                        ))}
                    </div>


                    <div className="faq-search">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <SearchOutlined className='destinations-primary-label-icon' />
                            <Text className="destinations-primary-label">Search</Text>
                        </div>
                        <Input
                            placeholder="Search a question or keyword"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            allowClear
                        />
                    </div>

                    {filteredFaqs.length === 0 ? (
                        <div className="faq-empty">
                            <p>No matching questions found.</p>
                            <p>Need more help? Reach out through the Contact Us section on our Home page.</p>
                            <Button className="faq-contact-button" type="primary" onClick={() => navigate('/home')}>
                                Contact Us
                            </Button>
                        </div>
                    ) : (
                        <Collapse accordion className="faq-collapse">
                            {filteredFaqs.map((item, index) => (
                                <Panel header={item.question} key={`${item.question}-${index}`}>
                                    <p>{item.answer}</p>
                                </Panel>
                            ))}
                        </Collapse>
                    )}
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
                                        <p className='footer-text'>M&RC Travel and Tours</p>
                                    </div>

                                    <div className='footer-section-socials-icons'>
                                        <InstagramFilled className='socials-icon' onClick={() => window.open('https://www.instagram.com/mrc_travelandtours?fbclid=IwY2xjawQVIU5leHRuA2FlbQIxMABicmlkETE1M0YwaFZ6SW1EQ0xTZnNrc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHgrnAZz5frwKYlnHCi-Txow7AV3kwbYXwWp0W7XV-_BZcoANgGr7hUQA3Eq6_aem_VyUBdOcsD0LsgGhYaEtNog', '_blank')} />
                                        <p className='footer-text'>@mrc_travel_tours</p>
                                    </div>


                                </div>
                            </div>

                            <hr className='footer-divider' />
                            <p className='footer-bottom-text'>© 2026 M&RC Travel and Tours. All rights reserved.</p>
                        </div>
                    </div>
                </div>


            </div>
        </ConfigProvider>
    )
}
