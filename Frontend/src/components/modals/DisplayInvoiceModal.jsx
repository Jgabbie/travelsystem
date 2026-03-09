import React from 'react';
import { Modal, Button, ConfigProvider } from 'antd';
import { Page, Text, View, Document, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import dayjs from "dayjs";
import '../../style/components/modals/displayinvoicemodal.css';

export default function DisplayInvoiceModal({ open, onCancel, onProceed, summary }) {

    const generateInvoiceNumber = () => {
        const prefix = 'INV';
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${datePart}-${randomPart}`;
    }

    const issueDate = dayjs().format("MMMM D, YYYY");
    const dueDate = dayjs().add(45, "day").format("MMMM D, YYYY");

    const travelerCountAdult = summary?.travelerCount?.adult || 0;
    const travelerCountChild = summary?.travelerCount?.child || 0;
    const travelerCountInfant = summary?.travelerCount?.infant || 0;
    const travelerTotal = travelerCountAdult + travelerCountChild + travelerCountInfant;

    const hotel = summary?.hotelOptions?.[0]?.name || 'N/A';
    const airline = summary?.airlineOptions?.[0]?.name || 'N/A';

    const startTravelDate = dayjs(summary?.travelDate).format("MMM D, YYYY") || 'TBD';
    const endTravelDate = dayjs(summary?.travelDate).add(4, 'day').format("MMM D, YYYY") || 'TBD';


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
            packageName: summary?.packageName || 'Tour Package',
            travelDates: `${startTravelDate} - ${endTravelDate}`,
            travelers: travelerTotal,
            hotel: hotel,
            airlines: airline
        },
        items: [
            { date: issueDate, activity: 'Tour Package', description: summary?.packageName || 'Tour Package', qty: travelerCountAdult, rate: summary?.packagePricePerPax },
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
                <View style={styles.header}>
                    <View style={styles.branding}>
                        <Text style={styles.brand}>{Invoice.company.name}</Text>
                        <Text style={styles.muted}>{Invoice.company.address}</Text>
                        <Text style={styles.muted}>{Invoice.company.city}</Text>
                        <Text style={styles.muted}>{Invoice.company.email}</Text>
                        <Text style={styles.muted}>{Invoice.company.phone}</Text>
                    </View>
                    <View style={styles.invoiceMeta}>
                        <Text style={styles.title}>Booking Invoice</Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Invoice #</Text>
                            <Text>{Invoice.invoice.number}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Issue Date</Text>
                            <Text>{Invoice.invoice.issueDate}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Due Date</Text>
                            <Text>{Invoice.invoice.dueDate}</Text>
                        </View>
                        <View style={styles.statusPill}>
                            <Text style={styles.statusText}>{Invoice.invoice.status}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionRow}>
                    <View style={styles.sectionBox}>
                        <Text style={styles.sectionTitle}>Bill To</Text>
                        <Text style={styles.sectionValue}>{Invoice.customer.name}</Text>
                        <Text style={styles.muted}>{Invoice.customer.email}</Text>
                        <Text style={styles.muted}>{Invoice.customer.phone}</Text>
                    </View>
                    <View style={styles.sectionBox}>
                        <Text style={styles.sectionTitle}>Booking Details</Text>
                        <Text style={styles.sectionValue}>{Invoice.booking.packageName}</Text>
                        <Text style={styles.muted}>Reference: {Invoice.booking.reference}</Text>
                        <Text style={styles.muted}>Travel Dates: {Invoice.booking.travelDates}</Text>
                        <Text style={styles.muted}>Travelers: {Invoice.booking.travelers}</Text>
                        <Text style={styles.muted}>Hotel: {Invoice.booking.hotel}</Text>
                        <Text style={styles.muted}>Airlines: {Invoice.booking.airlines}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.cell, styles.cellDesc]}>Date</Text>
                        <Text style={[styles.cell, styles.cellDesc]}>Activity</Text>
                        <Text style={[styles.cell, styles.cellDesc]}>Description</Text>
                        <Text style={[styles.cell, styles.cellQty]}>Qty</Text>
                        <Text style={[styles.cell, styles.cellRate]}>Rate</Text>
                        <Text style={[styles.cell, styles.cellAmount]}>Amount</Text>
                    </View>
                    {Invoice.items.map((item, index) => (
                        <View key={`${item.description}-${index}`} style={styles.tableRow}>
                            <Text style={[styles.cell, styles.cellDesc]}>{item.date}</Text>
                            <Text style={[styles.cell, styles.cellDesc]}>{item.activity}</Text>
                            <Text style={[styles.cell, styles.cellDesc]}>{item.description}</Text>
                            <Text style={[styles.cell, styles.cellQty]}>{item.qty}</Text>
                            <Text style={[styles.cell, styles.cellRate]}>{formatCurrency(item.rate)}</Text>
                            <Text style={[styles.cell, styles.cellAmount]}>
                                {formatCurrency(item.qty * item.rate)}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.totals}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>{formatCurrency(totals.subtotal)}</Text>
                    </View>
                    {/* <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tax (12%)</Text>
                        <Text style={styles.totalValue}>{formatCurrency(totals.tax)}</Text>
                    </View>
                    <View style={[styles.totalRow, styles.totalRowStrong]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{formatCurrency(totals.total)}</Text>
                    </View> */}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <Text style={styles.muted}>{Invoice.notes}</Text>
                </View>
            </Page>
        </Document>
    )


    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <Modal
                open={open}
                onCancel={onCancel}
                footer={null}
                width={1000}
                centered
                className="display-invoice-modal"
            >
                <h2 className="display-invoice-title">Booking Invoice</h2>
                <div className="display-invoice-wrapper">

                    <p className="display-invoice-subtitle">
                        Please review your booking invoice before proceeding to payment.
                    </p>

                    <div className="display-invoice-card">
                        <p><strong>Package:</strong> {summary?.packageName || 'Package Details'}</p>
                        <p><strong>Travel Date:</strong> {summary?.travelDate || 'TBD'}</p>
                        <p><strong>Travelers:</strong> {summary?.travelers?.join(', ') || 'TBD'}</p>
                        <p><strong>Total Price:</strong> ₱{(summary?.totalPrice || 0).toLocaleString()}</p>


                        <PDFViewer style={{ width: '100%', height: 727 }}>
                            <MyDocument />
                        </PDFViewer>
                    </div>
                </div>
                <div className="display-invoice-actions">
                    <Button
                        className='display-invoice-proceed'
                        onClick={onProceed}
                    >
                        Proceed to Payment
                    </Button>
                    <Button
                        className='display-invoice-cancel'
                        danger
                        onClick={onCancel}
                        style={{ marginLeft: 10 }}
                    >
                        Back
                    </Button>
                </div>
            </Modal>
        </ConfigProvider>
    );
}

const styles = StyleSheet.create({
    page: {
        padding: 32,
        fontSize: 11,
        color: '#1F2937',
        fontFamily: 'Helvetica'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24
    },
    brand: {
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 2
    },
    branding: {
        flexDirection: 'column',
        gap: 2
    },
    title: {
        fontSize: 18,
        fontWeight: 700,
        marginBottom: 8
    },
    muted: {
        color: '#6B7280',
        lineHeight: 1.4
    },
    invoiceMeta: {
        alignItems: 'flex-end'
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: 180,
        marginBottom: 4
    },
    metaLabel: {
        color: '#6B7280'
    },
    statusPill: {
        marginTop: 6,
        backgroundColor: '#ECFDF3',
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 10
    },
    statusText: {
        color: '#027A48',
        fontSize: 10,
        fontWeight: 700
    },
    sectionRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 20
    },
    sectionBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 12,
        borderRadius: 8
    },
    sectionTitle: {
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        color: '#6B7280',
        marginBottom: 6
    },
    sectionValue: {
        fontSize: 12,
        fontWeight: 600,
        marginBottom: 4
    },
    table: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        overflow: 'hidden'
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB'
    },
    tableHeader: {
        backgroundColor: '#F9FAFB'
    },
    cell: {
        fontSize: 10
    },
    cellDesc: {
        flex: 3
    },
    cellQty: {
        flex: 1,
        textAlign: 'center'
    },
    cellRate: {
        flex: 1.5,
        textAlign: 'right'
    },
    cellAmount: {
        flex: 1.5,
        textAlign: 'right'
    },
    totals: {
        marginTop: 16,
        marginLeft: 'auto',
        width: 200
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    totalRowStrong: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 8
    },
    totalLabel: {
        color: '#4B5563'
    },
    totalValue: {
        fontWeight: 700
    },
    footer: {
        marginTop: 24
    }
});