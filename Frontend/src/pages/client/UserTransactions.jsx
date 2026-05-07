import React, { useEffect, useState, useRef, useContext } from 'react'
import { Table, Tag, Button, Space, notification, Input, Select, DatePicker, ConfigProvider, Modal, Image, Card } from 'antd'
import { SearchOutlined, EyeOutlined, FileOutlined } from '@ant-design/icons/lib/icons'
import dayjs from 'dayjs'
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../../style/client/usertransactions.css'
import '../../style/admin/transaction.css'
import apiFetch from '../../config/fetchConfig'
import AuthContext from '../../context/AuthContext'

export default function UserTransactions() {
    const receiptRef = useRef();
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(false)
    const { auth } = useContext(AuthContext)

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [transactionDateFilter, setTransactionDateFilter] = useState(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [isProofModalOpen, setIsProofModalOpen] = useState(false);
    const [selectedProofImage, setSelectedProofImage] = useState(null);

    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true)
            try {
                const response = await apiFetch.get('/transaction/user-transactions')
                const transactions = response.map(t => ({
                    key: t.id,
                    reference: t.reference,
                    applicationType: t.applicationType || '--',
                    packageName: t.packageId?.packageName,
                    date: t.createdAt ? dayjs(t.createdAt).format('MMM D, YYYY h:mm A') : '--',
                    createdAt: t.createdAt || null,
                    method: t.method || '--',
                    amountDisplay: `₱${Number(t.amount || 0).toLocaleString()}`,
                    amountRaw: Number(t.amount || 0),
                    status: t.status || '--',
                    proofImage: t.proofImage || null
                }));
                setTransactions(transactions)
            } catch (error) {
                notification.error({ message: 'Unable to load transactions', placement: 'topRight' })
                setTransactions([])
            } finally {
                setLoading(false)
            }
        }

        fetchTransactions()
    }, [])

    const filteredData = transactions.filter(item => {
        const matchesSearch =
            (item.packageName?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.applicationType?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.reference?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.method?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.status?.toLowerCase().includes(searchText.toLowerCase())) ||
            (item.amount?.toLowerCase().includes(searchText.toLowerCase())) ||
            (dayjs(item.date, 'MMM D, YYYY h:mm A').format('MMM D, YYYY').toLowerCase().includes(searchText.toLowerCase()));

        const matchesStatus = !statusFilter || item.status === statusFilter;

        const matchesDate = !transactionDateFilter ||
            (item.createdAt && dayjs(item.createdAt).isSame(transactionDateFilter, 'day'));

        return matchesSearch && matchesStatus && matchesDate;
    })

    const columns = [
        {
            title: 'Reference',
            dataIndex: 'reference',
            key: 'reference'
        },
        {
            title: 'Items',
            key: 'items',
            render: (_, record) => record.packageName || record.applicationType || '--',
        },
        {
            title: 'Date and Time',
            dataIndex: 'date',
            key: 'date'
        },
        {
            title: 'Payment Method',
            dataIndex: 'method',
            key: 'method'
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (_, record) => record.amountDisplay
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (value) => {
                let color = 'default'
                if (value === 'Successful') color = 'green'
                if (value === 'Pending') color = 'gold'
                if (value === 'Failed') color = 'red'
                return <Tag color={color}>{value}</Tag>
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        className="user-transactions-view-button"
                        type='primary'
                        icon={<EyeOutlined />}
                        onClick={() => {
                            if (record.status !== "Successful") {
                                notification.warning({
                                    message: "Receipt Not Available",
                                    description: `Receipts are only available for successful transactions. Current status: ${record.status}`,
                                    placement: "topRight"
                                });
                                return;
                            }
                            setSelectedTransaction(record);
                            setIsViewModalOpen(true);
                        }}
                    >
                        View
                    </Button>
                    {record.method?.toLowerCase() === 'manual' && (
                        <Button
                            className="user-transactions-viewproof-button"
                            type='primary'
                            icon={<FileOutlined />}
                            onClick={() => {
                                if (!record.proofImage) {
                                    notification.warning({ message: 'No proof image available for this transaction.', placement: 'topRight' });
                                    return;
                                }
                                setSelectedTransaction(record);
                                setSelectedProofImage(record.proofImage);
                                setIsProofModalOpen(true);
                            }}
                        >
                            View Proof
                        </Button>
                    )}
                </Space>
            )
        }
    ]

    const handleDownloadPDF = async () => {
        const element = receiptRef.current;
        if (!element) {
            notification.error({ message: "Receipt content not found!", placement: 'topRight' });
            return;
        }

        try {
            notification.loading({ message: "Generating PDF...", key: "pdf", placement: 'topRight' });

            const canvas = await html2canvas(element, {
                scale: 3, // Higher scale for crisp text
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff", // Ensures background isn't transparent/black
                logging: false,
                // This tells html2canvas to wait for images to load
                onclone: (clonedDoc) => {
                    // You can manually adjust styles of the cloned element here if needed
                    const clonedElement = clonedDoc.querySelector(".receipt-container");
                    if (clonedElement) {
                        clonedElement.style.padding = "20px";
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Receipt-${selectedTransaction?.ref || 'download'}.pdf`);

            notification.success({ message: "Downloaded successfully!", key: "pdf", placement: 'topRight' });
        } catch (error) {
            console.error("PDF Generation Error:", error);
            notification.error({ message: "Failed to generate PDF.", key: "pdf", placement: 'topRight' });
        }
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#305797',
                }
            }}
        >
            <div className="user-transactions-page">
                <div className="user-transactions-container">
                    <div className="user-transactions-header">
                        <h2>My Transactions</h2>
                        <p>Review your payment history and status updates.</p>
                    </div>

                    <Card className="user-transactions-actions">
                        <div className="user-transactions-actions-row">
                            <div className="user-transactions-actions-filters">
                                <div className="user-transactions-actions-field user-transactions-actions-field--search">
                                    <label className="user-transactions-label">Search</label>
                                    <Input
                                        prefix={<SearchOutlined />}
                                        placeholder="Search reference, package or status..."
                                        className="user-transactions-search-input"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        allowClear
                                    />
                                </div>

                                <div className="user-transactions-actions-field">
                                    <label className="user-transactions-label">Status</label>
                                    <Select
                                        className="user-transactions-select"
                                        placeholder="Status"
                                        allowClear
                                        value={statusFilter || undefined}
                                        onChange={(v) => setStatusFilter(v || "")}
                                        options={[
                                            { value: "Successful", label: "Successful" },
                                            { value: "Pending", label: "Pending" },
                                            { value: "Cancelled", label: "Cancelled" }
                                        ]}
                                    />
                                </div>

                                <div className="user-transactions-actions-field">
                                    <label className="user-transactions-label">Transaction Date</label>
                                    <DatePicker
                                        className="user-transactions-date-filter"
                                        placeholder="Transaction Date"
                                        value={transactionDateFilter}
                                        onChange={(d) => setTransactionDateFilter(d)}
                                        allowClear
                                    />
                                </div>
                            </div>
                        </div>
                    </Card>


                    <div className="user-transactions-table">
                        <Table
                            columns={columns}
                            dataSource={filteredData}
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                </div>
            </div>

            <Modal
                open={isViewModalOpen}
                onCancel={() => setIsViewModalOpen(false)}
                footer={null}
                className="transaction-view-modal"
                width={720}
                style={{ top: 35 }}
            >
                {selectedTransaction && (
                    <div className="receipt-container" ref={receiptRef}>
                        <div className="receipt-header">
                            <div className="company-info">
                                <div className="header-flex-container">
                                    <img src="/images/Logo.png" alt="Company Logo" className="receipt-company-logo" />
                                    <div className="address-details">
                                        <h2 className="brand-name">M&RC Travel and Tours</h2>
                                        <p className="sub-info">2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1</p>
                                        <p className="sub-info">Parañaque City, Philippines</p>
                                        <p className="sub-info">1709 PHL</p>
                                        <p className="sub-info">+63 969 055 4806</p>
                                        <p className="sub-info">info1@mrctravels.com</p>
                                    </div>
                                </div>
                            </div>
                            <div className="receipt-title-box">
                                <h1 className="receipt-title">Receipt</h1>
                            </div>
                        </div>

                        <div className="receipt-meta">
                            <div className="billed-to">
                                <span className="label-blue">Billed To</span>
                                <h3 className="customer-name" style={{ margin: 0 }}>{auth?.firstname + " " + auth?.lastname || 'Guest'}</h3>
                            </div>
                            <div className="receipt-details">
                                <div className="detail-item">
                                    <span className="label-blue">Receipt #</span>
                                    <span>{selectedTransaction.reference}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label-blue">Receipt date</span>
                                    <span>
                                        {selectedTransaction.createdAt
                                            ? dayjs(selectedTransaction.createdAt).format("DD-MM-YYYY")
                                            : "--"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <table className="receipt-table">
                            <thead>
                                <tr>
                                    <th>QTY</th>
                                    <th>Description</th>
                                    <th className="text-right">Unit Price</th>
                                    <th className="text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>1</td>
                                    <td>{selectedTransaction.packageName}</td>
                                    <td className="text-right">{selectedTransaction.amountDisplay}</td>
                                    <td className="text-right">{selectedTransaction.amountDisplay}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="receipt-summary">
                            <div className="summary-row">
                                <span>Subtotal</span>
                                <span>{selectedTransaction.amountDisplay}</span>
                            </div>
                            <div className="summary-row total-row">
                                <span className="label-blue">Total</span>
                                <span className="total-amount">{selectedTransaction.amountDisplay}</span>
                            </div>
                        </div>

                        <div className="receipt-footer">
                            <p className="support-text">Thank you for your purchase!</p>
                            <p className="support-text">For questions or support, contact us at info1@mrctravels.com</p>
                        </div>
                    </div>
                )}

                <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>
                    <Button
                        className='user-transactions-viewproof-button'
                        type="primary"
                        onClick={handleDownloadPDF}
                    >
                        Download Receipt
                    </Button>
                </div>
            </Modal>


            <Modal
                title={`Proof of Payment - ${selectedTransaction?.reference || ""}`}
                open={isProofModalOpen}
                onCancel={() => setIsProofModalOpen(false)}
                className="transaction-view-modal"
                width={720}
                style={{ top: 150 }}
                footer={
                    selectedTransaction && selectedTransaction.proofImage ? (
                        <Space>
                            <Button
                                className='user-transactions-viewproof-button'
                                type="primary"
                                style={{ marginTop: 8 }}
                                onClick={async () => {
                                    try {
                                        const response = await fetch(selectedTransaction.proofImage, { mode: 'cors' });
                                        const blob = await response.blob();
                                        const url = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = selectedTransaction.proofFileName || 'proof-of-payment';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(url);
                                    } catch (err) {
                                        window.open(selectedTransaction.proofImage, '_blank');
                                    }
                                }}
                            >
                                Download Image
                            </Button>
                        </Space>
                    ) : (
                        <Button onClick={() => setIsProofModalOpen(false)}>Close</Button>
                    )
                }
            >
                {selectedTransaction ? (
                    <div className="receipt-container">

                        {selectedTransaction.proofImage ? (
                            <div className="upload-preview-box" style={{ maxHeight: 520 }}>
                                <Image
                                    src={selectedTransaction.proofImage}
                                    alt={selectedTransaction.proofFileName || "Proof of payment"}
                                    className="upload-preview-image"
                                    style={{ width: "100%", height: "auto" }}
                                />
                            </div>
                        ) : (
                            <p>No proof image available.</p>
                        )}
                    </div>
                ) : (
                    <p>No transaction selected.</p>
                )}
            </Modal>


        </ConfigProvider>
    )
}
