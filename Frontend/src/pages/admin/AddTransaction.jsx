import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Card,
    ConfigProvider,
    DatePicker,
    Input,
    InputNumber,
    Modal,
    Spin,
    notification,
} from "antd";
import {
    ArrowLeftOutlined,
    DeleteOutlined,
    PlusOutlined,
    SaveOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import apiFetch from "../../config/fetchConfig";
import { useAuth } from "../../hooks/useAuth";
import "../../style/admin/addtransaction.css";
import "../../style/admin/transaction.css";

const createEmptyItem = () => ({
    id: `${Date.now()}-${Math.random()}`,
    quantity: 1,
    description: "",
    unitPrice: null,
    amount: 0,
});

const formatCurrency = (value) =>
    `₱${Number(value || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export default function AddTransaction() {
    const navigate = useNavigate();
    const { auth } = useAuth();
    const isEmployee = auth?.role === "Employee";
    const basePath = isEmployee ? "/employee" : "";

    const [invoiceNumber, setInvoiceNumber] = useState("PREVIEW");
    const [transactionDate, setTransactionDate] = useState(dayjs());
    const [price, setPrice] = useState(0);
    const [items, setItems] = useState([createEmptyItem()]);
    const [errors, setErrors] = useState({});
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const itemsTotal = useMemo(
        () => items.reduce((sum, item) => sum + Number(item.amount || 0), 0),
        [items]
    );

    useEffect(() => {
        const getNextInvoiceNumber = async () => {
            try {
                const response = await apiFetch.get("/transaction/invoice-number");
                setInvoiceNumber(response?.invoiceNumber || response?.data?.invoiceNumber || "PREVIEW");
            } catch (error) {
                console.warn("Unable to load the next invoice number:", error);
            }
        };

        getNextInvoiceNumber();
    }, []);

    const updateItem = (id, field, value) => {
        setItems((currentItems) => {
            const updatedItems = currentItems.map((item) => {
                if (item.id !== id) return item;

                const updatedItem = { ...item, [field]: value };
                const quantity = Number(updatedItem.quantity || 0);
                const unitPrice = Number(updatedItem.unitPrice || 0);
                updatedItem.amount = quantity * unitPrice;
                return updatedItem;
            });

            const updatedTotal = updatedItems.reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
            );
            setPrice(updatedTotal || null);
            return updatedItems;
        });

        setErrors((current) => ({ ...current, items: "", price: "" }));
    };

    const addItem = () => {
        setItems((current) => [...current, createEmptyItem()]);
    };

    const removeItem = (id) => {
        setItems((currentItems) => {
            if (currentItems.length === 1) {
                notification.warning({
                    message: "At least one item row is required.",
                    placement: "topRight",
                });

                return currentItems;
            }

            const updatedItems = currentItems.filter((item) => item.id !== id);

            const updatedTotal = updatedItems.reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
            );

            setPrice(updatedTotal);

            return updatedItems;
        });
    };

    const validateForm = () => {
        const nextErrors = {};

        if (!transactionDate || !dayjs(transactionDate).isValid()) {
            nextErrors.transactionDate = "Transaction date is required.";
        }

        if (!Number(price) || Number(price) <= 0) {
            nextErrors.price = "Total price must be greater than zero.";
        }

        const hasInvalidItem = items.some(
            (item) =>
                !String(item.description || "").trim() ||
                Number(item.quantity) <= 0 ||
                Number(item.unitPrice) < 0 ||
                Number(item.amount) <= 0
        );

        if (hasInvalidItem) {
            nextErrors.items =
                "Complete every row with a description, quantity, and unit price.";
        }

        if (Number(price) > 0 && Math.abs(Number(price) - itemsTotal) > 0.009) {
            nextErrors.price = "Total price must match the total amount of all item rows.";
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const openReceiptPreview = () => {
        if (!validateForm()) {
            notification.error({
                message: "Please complete the transaction details correctly.",
                placement: "topRight",
            });
            return;
        }

        setIsPreviewOpen(true);
    };

    const saveTransaction = async () => {
        if (!validateForm()) {
            setIsPreviewOpen(false);
            return;
        }

        const normalizedItems = items.map((item) => ({
            quantity: Number(item.quantity),
            description: String(item.description).trim(),
            unitPrice: Number(item.unitPrice),
            amount: Number(item.amount),
        }));

        const transactionPayload = {
            amount: Number(price),
            transactionDate: dayjs(transactionDate).toISOString(),
            createdAt: dayjs(transactionDate).toISOString(),
            applicationType: normalizedItems[0]?.description || "Manual Transaction",
            items: normalizedItems,
            method: "Manual",
            status: "Successful",
        };

        setSaving(true);
        try {
            await apiFetch.post("/transaction/create-transaction", {
                transactionPayload,
            });

            notification.success({
                message: "Transaction added successfully!",
                placement: "topRight",
            });
            setIsPreviewOpen(false);
            navigate(`${basePath}/transactions`);
        } catch (error) {
            console.error("Failed to add transaction:", error);
            notification.error({
                message:
                    error?.response?.data?.message ||
                    error?.data?.message ||
                    error?.message ||
                    "Failed to add transaction.",
                placement: "topRight",
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797",
                },
            }}
        >
            {saving ? (
                <div className="loading-container">
                    <Spin size="large" description="Saving transaction..." />
                </div>
            ) : (
                <div className="add-transaction-page">
                    <Button
                        type="primary"
                        className="add-transaction-back-button"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate(`${basePath}/transactions`)}
                    >
                        Back
                    </Button>

                    <div className="add-transaction-header">
                        <h1>Add Transaction</h1>
                        <p>Create a manual transaction and review its receipt before saving.</p>
                    </div>

                    <Card className="add-transaction-container">
                        <section className="add-transaction-section">
                            <h2 className="add-transaction-section-title">Transaction Details</h2>

                            <div className="add-transaction-basic-grid">
                                <div className="add-transaction-field">
                                    <label>Transaction Date <span style={{ color: "#ff0000" }}>*</span></label>
                                    <DatePicker
                                        inputReadOnly
                                        showTime
                                        format="MMMM D, YYYY h:mm A"
                                        value={transactionDate}
                                        status={errors.transactionDate ? "error" : ""}
                                        onChange={(value) => {
                                            setTransactionDate(value);
                                            setErrors((current) => ({
                                                ...current,
                                                transactionDate: "",
                                            }));
                                        }}
                                    />
                                    <p className="add-transaction-error">{errors.transactionDate}</p>
                                </div>

                                <div className="add-transaction-field">
                                    <label>Total Price <span style={{ color: "#ff0000" }}>*</span></label>

                                    <Input
                                        readOnly
                                        addonBefore="₱"
                                        value={Number(price || 0).toLocaleString("en-PH", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                        status={errors.price ? "error" : ""}
                                        className="add-transaction-price-input"
                                        style={{
                                            backgroundColor: "#f5f5f5",
                                            cursor: "not-allowed",
                                        }}
                                    />

                                    <p className="add-transaction-error">{errors.price}</p>
                                </div>
                            </div>
                        </section>

                        <section className="add-transaction-section">
                            <div className="add-transaction-items-heading">
                                <div>
                                    <h2 className="add-transaction-section-title">Receipt Items</h2>
                                    <p>Add the rows that will appear in the receipt.</p>
                                </div>
                                <Button className="add-transaction-add-item-button" type="primary" icon={<PlusOutlined />} onClick={addItem}>
                                    Add Row
                                </Button>
                            </div>

                            <div className="add-transaction-items-table">
                                <div className="add-transaction-items-header">
                                    <span>Quantity</span>
                                    <span>Description</span>
                                    <span>Unit Price</span>
                                    <span>Amount</span>
                                    <span />
                                </div>

                                {items.map((item) => (
                                    <div className="add-transaction-item-row" key={item.id}>
                                        <InputNumber
                                            min={1}
                                            precision={0}
                                            value={item.quantity}
                                            onChange={(value) =>
                                                updateItem(item.id, "quantity", value || 0)
                                            }
                                        />
                                        <Input
                                            maxLength={100}
                                            placeholder="Item description"
                                            value={item.description}
                                            onChange={(event) => {
                                                const cleanedValue = event.target.value
                                                    .replace(/[^a-zA-Z0-9\s]/g, '')
                                                    .replace(/\s{2,}/g, ' ')
                                                    .replace(/^\s+/, '');

                                                updateItem(item.id, 'description', cleanedValue);
                                            }}
                                        />
                                        <InputNumber
                                            min={0}
                                            precision={2}
                                            addonBefore="₱"
                                            value={item.unitPrice}
                                            placeholder="0.00"
                                            formatter={(value) =>
                                                value
                                                    ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                                                    : ""
                                            }
                                            parser={(value) => Number(String(value || "").replace(/,/g, ""))}
                                            onChange={(value) =>
                                                updateItem(item.id, "unitPrice", value || 0)
                                            }
                                        />
                                        <Input
                                            readOnly
                                            addonBefore="₱"
                                            value={Number(item.amount || 0).toLocaleString("en-PH", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                            style={{
                                                backgroundColor: "#f5f5f5",
                                                cursor: "not-allowed",
                                            }}
                                        />
                                        <Button
                                            danger
                                            type="text"
                                            aria-label="Remove item row"
                                            icon={<DeleteOutlined />}
                                            onClick={() => removeItem(item.id)}
                                        />
                                    </div>
                                ))}
                            </div>

                            <p className="add-transaction-error">{errors.items}</p>

                            <div className="add-transaction-total-box">
                                <span>Items Total</span>
                                <strong>{formatCurrency(itemsTotal)}</strong>
                            </div>
                        </section>

                        <div className="add-transaction-actions">
                            <Button
                                className="add-transaction-cancel-button"
                                type="primary"
                                onClick={() => navigate(`${basePath}/transactions`)}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={openReceiptPreview}
                                className="add-transaction-review-button"
                            >
                                Review and Save
                            </Button>
                        </div>
                    </Card>

                    <Modal
                        open={isPreviewOpen}
                        onCancel={() => setIsPreviewOpen(false)}
                        footer={null}
                        width={760}
                        centered
                        destroyOnClose
                        className="transaction-view-modal transaction-receipt-modal add-transaction-receipt-modal"
                    >
                        <div className="receipt-container transaction-receipt-container">
                            <div className="add-transaction-preview-watermark">PREVIEW</div>
                            <div className="receipt-content">
                                <div className="receipt-header">
                                    <div className="company-info">
                                        <div className="header-flex-container">
                                            <img
                                                src="/images/Logo.png"
                                                alt="Company Logo"
                                                className="receipt-company-logo"
                                            />
                                            <div className="address-details">
                                                <h2 className="brand-name">M&RC Travel and Tours</h2>
                                                <p className="sub-info">
                                                    2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1
                                                </p>
                                                <p className="sub-info">Parañaque City, Philippines</p>
                                                <p className="sub-info">1709 PHL</p>
                                                <p className="sub-info">+63 969 055 4806</p>
                                                <p className="sub-info">info1@mrctravels.com</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="receipt-title-box">
                                        <h1 className="receipt-title">INVOICE {invoiceNumber}</h1>
                                    </div>
                                </div>

                                <div className="receipt-meta">
                                    <div className="billed-to">
                                        <span className="label-blue">Billed To</span>
                                        <h3 className="customer-name">Walk-in Customer</h3>
                                    </div>

                                    <div className="receipt-details">
                                        <div className="detail-item">
                                            <span className="label-blue">Date</span>
                                            <span>{dayjs(transactionDate).format("DD-MM-YYYY")}</span>
                                        </div>
                                        <div className="detail-item total-price">
                                            <span className="label-blue">Amount to Pay</span>
                                            <span className="value-blue">{formatCurrency(price)}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="label-blue">Reference</span>
                                            <span>Generated after saving</span>
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
                                        {items.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.quantity}</td>
                                                <td>{item.description}</td>
                                                <td className="text-right">
                                                    {formatCurrency(item.unitPrice)}
                                                </td>
                                                <td className="text-right">{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                <div className="receipt-bank-grid">
                                    <div className="receipt-bank-info">
                                        <div className="receipt-bank-section">
                                            <div className="receipt-bank-label">Bank Account:</div>
                                            <p className="receipt-bank-details">Bank: BDO UNIBANK</p>
                                            <p className="receipt-bank-details">
                                                Account Name: M&RC Travel and Tours
                                            </p>
                                            <p className="receipt-bank-details">Account #: 006838032692</p>
                                        </div>

                                        <div className="receipt-bank-section">
                                            <div className="receipt-bank-label">GCash:</div>
                                            <p className="receipt-bank-details">
                                                Rhon Carle - 0968 888 0405
                                            </p>
                                            <p className="receipt-bank-details">
                                                Maricar Carle - 0969 055 4806
                                            </p>
                                        </div>
                                    </div>

                                    <div className="receipt-summary">
                                        <div className="receipt-summary-content">
                                            <div className="summary-row">
                                                <span>Total</span>
                                                <span>{formatCurrency(itemsTotal)}</span>
                                            </div>
                                            <div className="summary-row total-row">
                                                <span>Total Due</span>
                                                <span className="total-amount">{formatCurrency(price)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="add-transaction-preview-actions">
                            <Button
                                className="add-transaction-backtoedit-button"
                                type="primary"
                                onClick={() => setIsPreviewOpen(false)}>Back to Edit</Button>
                            <Button
                                className="add-transaction-confirm-button"
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={saving}
                                onClick={saveTransaction}
                            >
                                Confirm and Add Transaction
                            </Button>
                        </div>
                    </Modal>
                </div>
            )}
        </ConfigProvider>
    );
}
