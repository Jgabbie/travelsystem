import React, { useMemo, useState, useEffect } from 'react'
import { Button, Collapse, ConfigProvider, Input, Typography } from 'antd'
import { FacebookFilled, InstagramFilled, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import apiFetch from '../../config/fetchConfig';
import '../../style/client/faqspage.css'

const { Text } = Typography



export default function FAQsPage() {
    const navigate = useNavigate()
    const [searchTerm, setSearchTerm] = useState('')
    const [activeCategory, setActiveCategory] = useState('All')
    const [faqs, setFaqs] = useState([]);


    // chatbot modal handlers
    const categories = useMemo(() => {
        const unique = new Set(faqs.map((item) => item.category));
        return ["All", ...Array.from(unique)];
    }, [faqs]);


    // filter the faq data based on search term and active category
    const filteredFaqs = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()

        return faqs.filter((item) => {
            const matchesTerm =
                !term ||
                item.question.toLowerCase().includes(term) ||
                item.answer.toLowerCase().includes(term)
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory
            return matchesTerm && matchesCategory
        })
    }, [activeCategory, searchTerm, faqs])


    const collapseItems = useMemo(() => {
        return filteredFaqs.map((item) => ({
            key: item._id,
            label: item.question,
            className: 'faq-question',
            children: (
                <p className="faq-answer">
                    &gt; {item.answer}
                </p>
            )
        }))
    }, [filteredFaqs])


    useEffect(() => {
        const getFAQs = async () => {
            try {
                const response = await apiFetch.get("/faqs/get-faqs");
                setFaqs(response);
            } catch (error) {
                console.error("Status:", error.response?.status);
                console.error("Data:", error.response?.data);
                console.error("Message:", error.message);
                console.error(error);
            }
        };

        getFAQs();
    }, []);


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
                        <h2>Frequently Asked Questions</h2>
                        <p>
                            Browse our FAQs to find quick answers about bookings, payments, and services.
                            Can't find what you're looking for? Contact us for personalized support.
                        </p>
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
                            maxLength={30}
                            placeholder="Search a question or keyword"
                            value={searchTerm}
                            onChange={(event) => {
                                const cleanedValue = event.target.value
                                    .replace(/[^a-zA-Z0-9\s]/g, '')
                                    .replace(/\s{2,}/g, ' ')
                                    .replace(/^\s+/, '')
                                    .slice(0, 30);

                                setSearchTerm(cleanedValue);
                            }}
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
                        <Collapse
                            accordion
                            className="faq-collapse"
                            items={collapseItems}
                        />
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
        </ConfigProvider>
    )
}
