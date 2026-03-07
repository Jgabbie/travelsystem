import React from 'react';
import { Modal, Button, ConfigProvider } from 'antd';
import { Page, Text, View, Document, StyleSheet, PDFViewer } from '@react-pdf/renderer';
import '../../style/components/modals/displayinvoicemodal.css';

export default function DisplayInvoiceModal({ open, onCancel, onProceed, summary }) {

    const fakeInvoice = {
        company: {
            name: 'M&RC Travel and Tours',
            address: 'Paranaque City, Metro Manila, Philippines',
            email: 'info@mrc-travel.com',
            phone: '+63 2 555 1234'
        },
        invoice: {
            number: 'INV-2026-0248',
            issueDate: 'Feb 24, 2026',
            dueDate: 'Mar 10, 2026',
            status: 'Paid'
        },
        customer: {
            name: 'Gabriel Lanuza',
            email: 'gabriel.lanuza@email.com',
            phone: '+63 917 555 8877'
        },
        booking: {
            reference: 'BK-TRVL-9912',
            packageName: 'Bohol Island Escape (4D3N)',
            travelDates: 'Apr 2, 2026 - Apr 5, 2026',
            travelers: 2,
            roomType: 'Deluxe Ocean View',
            pickup: 'Panglao Airport (TAG)'
        },
        items: [
            { description: 'Tour Package', qty: 2, rate: 12950.0 },
            { description: 'Private Airport Transfer', qty: 1, rate: 1200.0 },
            { description: 'Island Hopping Add-on', qty: 2, rate: 1800.0 }
        ],
        notes: 'Thank you for booking with M&RC Travel and Tours. Safe travels!'
    };

    const calculateTotals = (items) => {
        const subtotal = items.reduce((sum, item) => sum + item.qty * item.rate, 0);
        const tax = subtotal * 0.12;
        const total = subtotal + tax;
        return { subtotal, tax, total };
    };

    const totals = calculateTotals(fakeInvoice.items);

    const formatCurrency = (value) => `PHP ${value.toFixed(2)}`;

    const MyDocument = () => (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.brand}>{fakeInvoice.company.name}</Text>
                        <Text style={styles.muted}>{fakeInvoice.company.address}</Text>
                        <Text style={styles.muted}>{fakeInvoice.company.email}</Text>
                        <Text style={styles.muted}>{fakeInvoice.company.phone}</Text>
                    </View>
                    <View style={styles.invoiceMeta}>
                        <Text style={styles.title}>Booking Invoice</Text>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Invoice #</Text>
                            <Text>{fakeInvoice.invoice.number}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Issue Date</Text>
                            <Text>{fakeInvoice.invoice.issueDate}</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Text style={styles.metaLabel}>Due Date</Text>
                            <Text>{fakeInvoice.invoice.dueDate}</Text>
                        </View>
                        <View style={styles.statusPill}>
                            <Text style={styles.statusText}>{fakeInvoice.invoice.status}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionRow}>
                    <View style={styles.sectionBox}>
                        <Text style={styles.sectionTitle}>Bill To</Text>
                        <Text style={styles.sectionValue}>{fakeInvoice.customer.name}</Text>
                        <Text style={styles.muted}>{fakeInvoice.customer.email}</Text>
                        <Text style={styles.muted}>{fakeInvoice.customer.phone}</Text>
                    </View>
                    <View style={styles.sectionBox}>
                        <Text style={styles.sectionTitle}>Booking Details</Text>
                        <Text style={styles.sectionValue}>{fakeInvoice.booking.packageName}</Text>
                        <Text style={styles.muted}>Reference: {fakeInvoice.booking.reference}</Text>
                        <Text style={styles.muted}>Travel Dates: {fakeInvoice.booking.travelDates}</Text>
                        <Text style={styles.muted}>Travelers: {fakeInvoice.booking.travelers}</Text>
                        <Text style={styles.muted}>Room: {fakeInvoice.booking.roomType}</Text>
                        <Text style={styles.muted}>Pickup: {fakeInvoice.booking.pickup}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                        <Text style={[styles.cell, styles.cellDesc]}>Description</Text>
                        <Text style={[styles.cell, styles.cellQty]}>Qty</Text>
                        <Text style={[styles.cell, styles.cellRate]}>Rate</Text>
                        <Text style={[styles.cell, styles.cellAmount]}>Amount</Text>
                    </View>
                    {fakeInvoice.items.map((item, index) => (
                        <View key={`${item.description}-${index}`} style={styles.tableRow}>
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
                        <Text style={styles.totalLabel}>Subtotal</Text>
                        <Text style={styles.totalValue}>{formatCurrency(totals.subtotal)}</Text>
                    </View>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tax (12%)</Text>
                        <Text style={styles.totalValue}>{formatCurrency(totals.tax)}</Text>
                    </View>
                    <View style={[styles.totalRow, styles.totalRowStrong]}>
                        <Text style={styles.totalLabel}>Total</Text>
                        <Text style={styles.totalValue}>{formatCurrency(totals.total)}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <Text style={styles.muted}>{fakeInvoice.notes}</Text>
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
                width={800}
                centered
                className="display-invoice-modal"
            >
                <div className="display-invoice-wrapper">
                    <h2 className="display-invoice-title">Booking Invoice</h2>
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

                    <div className="display-invoice-actions">
                        <Button
                            type="primary"
                            onClick={onProceed}
                        >
                            Proceed to Payment
                        </Button>
                        <Button
                            danger
                            onClick={onCancel}
                            style={{ marginLeft: 10 }}
                        >
                            Back
                        </Button>
                    </div>
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
        marginBottom: 6
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