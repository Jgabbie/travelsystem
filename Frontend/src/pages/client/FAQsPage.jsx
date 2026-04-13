import React, { useMemo, useState } from 'react'
import { Button, Collapse, ConfigProvider, Input, Modal, Image } from 'antd'
import { useNavigate } from 'react-router-dom'
import '../../style/client/faqspage.css'


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
            <div className="faq-page">

                <div className="faq-hero">
                    <div className="faq-hero-overlay"></div>
                    <div className="faq-hero-content">
                        <h1>General FAQs</h1>
                        <p>Find quick answers about bookings, payments, and services.</p>
                    </div>
                </div>

                <div className="faq-container">
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

                <Button className="chatbot-fab" type="primary" onClick={() => setIsChatbotOpen(true)}>
                    <Image preview={false} style={{ width: 20, height: 20 }} src="/images/chatbotlogo.png" />
                </Button>

                <Modal
                    open={isChatbotOpen}
                    onCancel={() => setIsChatbotOpen(false)}
                    footer={null}
                    title="Chatbot"
                    wrapClassName="chatbot-modal"
                >
                    <div className="chatbot-body">
                        <div className="chatbot-message">
                            Hi! How can I help you today?
                        </div>
                        <Input.TextArea
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            placeholder="Type your message..."
                            rows={3}
                        />
                        <div className="chatbot-actions">
                            <Button
                                type="primary"
                                disabled={!chatMessage.trim()}
                            >
                                Send
                            </Button>
                        </div>
                    </div>
                </Modal>
            </div>
        </ConfigProvider>
    )
}
