import React, { useState } from 'react'
import { Modal, Button, ConfigProvider, Radio, Select, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { Page, Text, View, Document, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import { useBooking } from '../../context/BookingContext';
import dayjs from "dayjs";
import '../../style/components/modals/displayinvoicemodal.css';
import '../../style/client/paymentprocees.css';


export default function PaymentProcess() {
    const { bookingData } = useBooking();
    const [paymentType, setPaymentType] = useState(null); // 'deposit' or 'full'
    const [frequency, setFrequency] = useState('Every 2 weeks');
    const [method, setMethod] = useState(null); // renamed for clarity
    const [fileList, setFileList] = useState([]);

    const handleUploadChange = ({ fileList: newFileList }) => setFileList(newFileList);

    const generateInvoiceNumber = () => {
        const prefix = 'INV';
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${datePart}-${randomPart}`;
    }

    const issueDate = dayjs().format("MMMM D, YYYY");
    const dueDate = dayjs().add(45, "day").format("MMMM D, YYYY");

    const travelerCountAdult = bookingData?.travelerCount?.adult || 0;
    const travelerCountChild = bookingData?.travelerCount?.child || 0;
    const travelerCountInfant = bookingData?.travelerCount?.infant || 0;
    const travelerTotal = bookingData?.travelers?.length || travelerCountAdult + travelerCountChild + travelerCountInfant || 0;

    const hotel = bookingData?.hotelOptions?.[0]?.name || 'N/A';
    const airline = bookingData?.airlineOptions?.[0]?.name || 'N/A';

    const startTravelDate = dayjs(bookingData?.travelDate).format("MMM D, YYYY") || 'TBD';
    const endTravelDate = dayjs(bookingData?.travelDate).add(4, 'day').format("MMM D, YYYY") || 'TBD';


    const Invoice = {
        company: {
            name: 'M&RC Travel and Tours',
            address: '2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1',
            city: 'Parañaque City, Philippines',
            code: '1709 PHL',
            phone: '+63 9690554806',
            email: 'info1@mrctravels.com',
        },
        invoice: {
            number: generateInvoiceNumber(),
            issueDate: issueDate,
            dueDate: dueDate,
            status: 'Pending'
        },
        customer: {
            name: 'Gabriel Lanuza',
            email: 'gabriel.lanuza@email.com',
            phone: '+63 917 555 8877'
        },
        booking: {
            packageName: bookingData?.packageName || 'Tour Package',
            travelDates: `${startTravelDate} - ${endTravelDate}`,
            travelers: travelerTotal,
            hotel: hotel,
            airlines: airline
        },
        items: [
            { date: issueDate, activity: 'Tour Package', description: bookingData?.packageName || 'Tour Package', qty: travelerCountAdult, rate: bookingData?.packagePricePerPax },
        ],
        notes: 'Thank you for booking with M&RC Travel and Tours. Safe travels!'
    };

    const calculateTotals = (items) => {
        const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
        const tax = subtotal * 0.12;
        const total = subtotal + tax;
        return { subtotal, tax, total };
    };

    const totals = calculateTotals(Invoice.items);

    const formatCurrency = (value) => `PHP ${value.toFixed(2)}`;

    const MyDocument = () => (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Section: Logo and Company Info */}
                <View style={styles.header}>
                    <View>
                        {/* If you have the logo as a local file, use <Image src={logo} style={styles.logo} /> */}
                        <Text style={styles.brand}>{Invoice.company.name}</Text>
                        <Text style={styles.muted}>{Invoice.company.address}</Text>
                        <Text style={styles.muted}>{Invoice.company.city}</Text>
                        <Text style={styles.muted}>{Invoice.company.code}</Text>
                        <Text style={styles.muted}>{Invoice.company.phone}</Text>
                        <Text style={styles.muted}>{Invoice.company.email}</Text>
                    </View>
                    <View style={styles.invoiceTitleContainer}>
                        <Text style={styles.invoiceTitleText}>Invoice {Invoice.invoice.number.split('-').pop()}</Text>
                    </View>
                </View>

                {/* Billing and Payment Summary Row */}
                <View style={styles.billRow}>
                    <View style={styles.billToSection}>
                        <Text style={styles.label}>BILL TO</Text>
                        <Text style={styles.customerName}>{Invoice.customer.name.toUpperCase()}</Text>
                        <Text style={styles.muted}>{Invoice.customer.phone}</Text>
                    </View>

                    <View style={styles.summaryTable}>
                        <View style={styles.summaryCol}>
                            <Text style={styles.label}>DATE</Text>
                            <Text style={styles.summaryValue}>{dayjs(Invoice.invoice.issueDate).format('MM/DD/YYYY')}</Text>
                        </View>
                        <View style={[styles.summaryCol, styles.darkBg]}>
                            <Text style={[styles.label, { color: '#FFF' }]}>PLEASE PAY</Text>
                            <Text style={[styles.summaryValue, { color: '#FFF' }]}>{formatCurrency(totals.subtotal)}</Text>
                        </View>
                        <View style={styles.summaryCol}>
                            <Text style={styles.label}>DUE DATE</Text>
                            <Text style={styles.summaryValue}>{dayjs(Invoice.invoice.dueDate).format('MM/DD/YYYY')}</Text>
                        </View>
                    </View>
                </View>

                {/* Main Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.cell, { flex: 1.5 }]}>DATE</Text>
                        <Text style={[styles.cell, { flex: 2 }]}>ACTIVITY</Text>
                        <Text style={[styles.cell, { flex: 4 }]}>DESCRIPTION</Text>
                        <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                        <Text style={[styles.cell, { flex: 1.5, textAlign: 'right' }]}>RATE</Text>
                        <Text style={[styles.cell, { flex: 1.5, textAlign: 'right' }]}>AMOUNT</Text>
                    </View>

                    {Invoice.items.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={[styles.cell, { flex: 1.5 }]}>{dayjs(item.date).format('MM/DD/YYYY')}</Text>
                            <Text style={[styles.cell, { flex: 2 }]}>{item.activity}</Text>
                            <Text style={[styles.cell, { flex: 4 }]}>{item.description}</Text>
                            <Text style={[styles.cell, { flex: 1, textAlign: 'center' }]}>{item.qty}</Text>
                            <Text style={[styles.cell, { flex: 1.5, textAlign: 'right' }]}>{item.rate.toLocaleString()}</Text>
                            <Text style={[styles.cell, { flex: 1.5, textAlign: 'right' }]}>{(item.qty * item.rate).toLocaleString()}</Text>
                        </View>
                    ))}
                </View>

                {/* Footer with Bank Details */}
                <View style={styles.footerSection}>
                    <View style={styles.bankInfo}>
                        <Text style={styles.muted}>Payment to be deposited in below bank details:</Text>
                        <Text style={[styles.label, { marginTop: 10 }]}>PESO ACCOUNT:</Text>
                        <Text style={styles.muted}>BANK: BDO UNIBANK - TRIDENT TOWER BRANCH</Text>
                        <Text style={styles.muted}>ACCOUNT NAME: {Invoice.company.name.toUpperCase()}</Text>
                        <Text style={styles.muted}>ACCOUNT NUMBER: 006830132692</Text>
                    </View>
                    <View style={styles.totalDueContainer}>
                        <View style={styles.totalDueRow}>
                            <Text style={styles.totalDueLabel}>TOTAL DUE</Text>
                            <Text style={styles.totalDueValue}>{formatCurrency(totals.subtotal)}</Text>
                        </View>
                        <Text style={styles.thankYou}>THANK YOU.</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );

    const styles = StyleSheet.create({
        page: { padding: 40, fontSize: 9, color: '#333', fontFamily: 'Helvetica' },
        header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
        brand: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
        muted: { color: '#555', lineHeight: 1.5 },
        invoiceTitleContainer: { justifyContent: 'center' },
        invoiceTitleText: { fontSize: 16, color: '#333' },

        billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, alignItems: 'flex-start' },
        billToSection: { flex: 1 },
        label: { fontSize: 8, color: '#777', fontWeight: 'bold', marginBottom: 4 },
        customerName: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },

        summaryTable: { flexDirection: 'row', border: '1pt solid #E5E7EB', flex: 1.5, marginLeft: 20 },
        summaryCol: { flex: 1, padding: 8, alignItems: 'center', justifyContent: 'center' },
        summaryValue: { fontSize: 10, fontWeight: 'bold' },
        darkBg: { backgroundColor: '#374151' },

        table: { marginTop: 10 },
        tableHeader: { flexDirection: 'row', borderBottom: '1pt solid #333', paddingBottom: 5, marginBottom: 5 },
        tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottom: '0.5pt solid #E5E7EB' },
        cell: { fontSize: 8 },

        footerSection: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' },
        bankInfo: { flex: 2 },
        totalDueContainer: { flex: 1, alignItems: 'flex-end' },
        totalDueRow: { flexDirection: 'row', borderTop: '1pt solid #333', borderBottom: '1pt solid #333', paddingVertical: 10, width: '100%', justifyContent: 'space-between', marginBottom: 10 },
        totalDueLabel: { fontSize: 10, fontWeight: 'bold' },
        totalDueValue: { fontSize: 10, fontWeight: 'bold' },
        thankYou: { fontSize: 9, fontWeight: 'bold', color: '#555' }
    });


    return (
        <div>
            <ConfigProvider
                theme={{
                    token: {
                        colorPrimary: '#305797',
                    }
                }}
            >
                <div className="payment-process-container">
                    <div className='display-invoice-container'>
                        <h2 className="display-invoice-title">Booking Invoice</h2>
                        <p className="display-invoice-subtitle">
                            Please review your booking invoice before proceeding to payment.
                        </p>
                        <div className="display-invoice-wrapper">
                            <div className="display-invoice-card">
                                <div className="pdf-viewer-wrapper">
                                    <div className="pdf-toolbar-mask"></div>
                                    <PDFViewer style={{ width: '100%', height: 727 }}>
                                        <MyDocument />
                                    </PDFViewer>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                <div className='payment-methods-container'>
                    <div className="payment-methods-wrapper">
                        <h2 className="payment-methods-title">Mode of Payment</h2>
                        <p className="payment-methods-subtitle">Select your mode of payment.</p>

                        <Radio.Group
                            onChange={(e) => setPaymentType(e.target.value)}
                            value={paymentType}
                            className="payment-methods-cards"
                        >
                            <Radio value="deposit" className={`payment-card ${paymentType === "deposit" ? "selected" : ""}`}>
                                <div style={{ width: '100%' }}>
                                    <h3>Deposit</h3>
                                    <p>Make a partial payment to secure your booking. Choose this option to pay a portion of the total amount.</p>

                                    {paymentType === 'deposit' && (
                                        <div style={{ marginTop: '12px' }} onClick={(e) => e.stopPropagation()}>
                                            <p style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                                                Payment Schedule:
                                            </p>
                                            <Select
                                                defaultValue="Every 2 weeks"
                                                style={{ width: '100%' }}
                                                onChange={(value) => setFrequency(value)}
                                                options={[
                                                    { value: 'Every week', label: 'Every week' },
                                                    { value: 'Every 2 weeks', label: 'Every 2 weeks' },
                                                    { value: 'Every 3 weeks', label: 'Every 3 weeks' },
                                                ]}
                                            />
                                        </div>
                                    )}
                                </div>
                            </Radio>

                            <Radio value="full" className={`payment-card ${paymentType === "full" ? "selected" : ""}`}>
                                <div>
                                    <h3>Full Payment</h3>
                                    <p>Pay the full amount to secure your booking and not worry about future payment deadlines.</p>
                                </div>
                            </Radio>
                        </Radio.Group>
                    </div>
                </div>

                <div className='payment-methods-container'>
                    <div className="payment-methods-wrapper">
                        <h2 className="payment-methods-title">Payment Methods</h2>
                        <p className="payment-methods-subtitle">
                            Select a payment method to complete your booking.
                        </p>

                        <Radio.Group
                            onChange={(e) => setMethod(e.target.value)}
                            value={method}
                            className="payment-methods-cards"
                            style={{ width: '100%', display: 'flex', gap: '16px' }}
                        >
                            <Radio
                                value="paymongo"
                                className={`payment-card ${method === "paymongo" ? "selected" : ""}`}
                                style={{ flex: 1, height: 'auto', padding: '20px' }}
                            >
                                <div className="card-content">
                                    <h3>Paymongo</h3>
                                    <p>Pay securely via Credit Card, GCash, or Maya. Rates depend on the transaction method.</p>
                                </div>
                            </Radio>

                            <Radio
                                value="manual"
                                className={`payment-card ${method === "manual" ? "selected" : ""}`}
                                style={{ flex: 1, height: 'auto', padding: '20px' }}
                            >
                                <div className="card-content">
                                    <h3>Manual Payment</h3>
                                    <p>Direct deposit. You will need to upload proof of payment for manual verification by our team.</p>
                                </div>
                            </Radio>
                        </Radio.Group>
                    </div>
                </div>

                {method === 'manual' && (
                    <div className="manual-transfer-container">
                        <div className="manual-transfer-details">
                            <div className="bank-accounts-section">
                                <h4 className="section-subtitle">Available Bank Accounts</h4>
                                <div className="bank-grid">
                                    <div className="bank-item">
                                        <span className="bank-name">BDO Unibank</span>
                                        <span className="account-number">0012-3456-7890</span>
                                        <span className="account-holder">M&RC Travel and Tours</span>
                                    </div>
                                    <div className="bank-item">
                                        <span className="bank-name">BPI</span>
                                        <span className="account-number">9876-5432-10</span>
                                        <span className="account-holder">M&RC Travel and Tours</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bank-accounts-section">
                                <div className="bank-grid">
                                    <div className="bank-item">
                                        <span className="bank-name">Metro Bank</span>
                                        <span className="account-number">0012-3456-7890</span>
                                        <span className="account-holder">M&RC Travel and Tours</span>
                                    </div>
                                    <div className="bank-item">
                                        <span className="bank-name">Land Bank</span>
                                        <span className="account-number">9876-5432-10</span>
                                        <span className="account-holder">M&RC Travel and Tours</span>
                                    </div>
                                </div>
                            </div>

                            <div className="upload-section">
                                <h4 className="section-subtitle">Upload Proof of Payment</h4>
                                <p className="upload-hint">Please upload a clear screenshot or photo of your deposit slip or transfer confirmation.</p>
                                <p className="upload-hint">Accepted formats: JPG or PNG. Max size: 2MB.</p>

                                <p className="upload-note">Note: Our team will manually verify your payment, which may take 1-2 business days. You will receive a confirmation email once your payment is verified.</p>

                                <Upload
                                    listType="picture"
                                    maxCount={1}
                                    fileList={fileList}
                                    onChange={handleUploadChange}
                                    beforeUpload={() => false} // Prevents auto-upload to server immediately
                                >
                                    <Button icon={<UploadOutlined />} className="upload-btn">
                                        Select Receipt Image
                                    </Button>
                                </Upload>
                            </div>
                        </div>

                        <div className="payment-process-actions" style={{ flexDirection: "row", gap: 20 }}>
                            <Button type="primary">
                                Proceed
                            </Button>
                        </div>
                    </div>
                )}
            </ConfigProvider>
        </div>
    )
}

