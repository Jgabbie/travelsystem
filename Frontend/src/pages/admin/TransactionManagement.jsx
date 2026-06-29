import React, { useEffect, useState, useRef } from "react";
import { Input, Select, Button, Table, Tag, Space, DatePicker, Row, Col, Card, Statistic, Form, Modal, ConfigProvider, Image, Spin, notification } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, SwapOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EyeOutlined, FilePdfOutlined, FileOutlined, CheckCircleFilled, InboxOutlined, TransactionOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import apiFetch from "../../config/fetchConfig";
import { useAuth } from "../../hooks/useAuth";
import "../../style/admin/transaction.css";
import "../../style/components/modals/modaldesign.css";


//function to convert image to base64
const getBase64ImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

const formatCurrency = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function TransactionManagement() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isEmployee = auth?.role === 'Employee';
  const basePath = isEmployee ? '/employee' : '';

  const [form] = Form.useForm();
  const receiptRef = useRef();
  const [searchText, setSearchText] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentDateFilter, setPaymentDateFilter] = useState(null);

  const [editForm] = Form.useForm();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofTransaction, setProofTransaction] = useState(null);
  const [isTransactionEditedModalOpen, setIsTransactionEditedModalOpen] = useState(false);
  const [isTransactionDeletedModalOpen, setIsTransactionDeletedModalOpen] = useState(false);
  const [isProofApprovedModalOpen, setIsProofApprovedModalOpen] = useState(false);
  const [isProofRejectedModalOpen, setIsProofRejectedModalOpen] = useState(false);
  const [isProofDecisionloading, setIsProofDecisionLoading] = useState(false);
  const [isProofDecision, setIsProofDecision] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isTransactionRestoredModalOpen, setIsTransactionRestoredModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [archivedData, setArchivedData] = useState([]);


  //fetch transactions function
  const mapTransactions = (response) => response.map((t) => ({
    key: t._id,
    invoiceNumber: t.invoiceNumber || "",
    ref: t.reference,
    username: t.userId?.username,
    firstname: t.userId?.firstname,
    lastname: t.userId?.lastname || "",
    package: t.packageId?.packageName || t.applicationType,
    date: t.transactionDate
      ? dayjs(t.transactionDate).format("YYYY-MM-DD HH:mm")
      : t.createdAt
        ? dayjs(t.createdAt).format("YYYY-MM-DD HH:mm")
        : "",
    price: `₱${Number(t.amount || 0).toLocaleString()}`,
    amountRaw: Number(t.amount || 0),
    method: t.method?.charAt(0)?.toUpperCase() + t.method?.slice(1) || "No Method",
    methodRaw: t.method || "",
    status: t.status || "No Status",
    proofImage: t.proofImage || null,
    proofImageType: t.proofImageType || "",
    proofFileName: t.proofFileName || "",
    items:
      Array.isArray(t.items) && t.items.length > 0
        ? t.items
        : [
          {
            quantity: 1,
            description:
              t.packageId?.packageName ||
              t.applicationType ||
              "Transaction",
            unitPrice: Number(t.amount || 0),
            amount: Number(t.amount || 0),
          },
        ],
  }));

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get("/transaction/all-transactions");
      const transactions = mapTransactions(response);

      setData(transactions);


    } catch (error) {
      console.error("Error fetching transactions:", error);
      notification.error({ message: "Unable to load transactions.", placement: "topRight" });
    } finally {
      setLoading(false);
    }
  };


  //fetch archived transactions function
  const fetchArchivedTransactions = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get("/transaction/archived-transactions");
      const transactions = mapTransactions(response);
      setArchivedData(transactions);
    } catch (error) {
      console.error("Error fetching archived transactions:", error);
      notification.error({ message: "Unable to load archived transactions.", placement: "topRight" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);


  //filter functions
  const currentData = showArchived ? archivedData : data;

  const filteredData = currentData.filter(item => {

    const matchesSearch =
      item.ref.toLowerCase().includes(searchText.toLowerCase()) ||
      item.package.toLowerCase().includes(searchText.toLowerCase()) ||
      item.method.toLowerCase().includes(searchText.toLowerCase()) ||
      item.status.toLowerCase().includes(searchText.toLowerCase()) ||
      item.username.toLowerCase().includes(searchText.toLowerCase()) ||
      item.price.toString().toLowerCase().includes(searchText.toLowerCase());

    const matchesMethod =
      methodFilter === "" || item.method === methodFilter;

    const matchesStatus =
      statusFilter === "" || item.status === statusFilter;

    const matchesPaymentDate =
      !paymentDateFilter ||
      dayjs(item.date).isSame(paymentDateFilter, "day");

    return (
      matchesSearch &&
      matchesMethod &&
      matchesStatus &&
      matchesPaymentDate
    );
  });

  const totalTransactions = filteredData.length;
  const totalSuccessful = filteredData.filter(t => t.status === "Successful").length;
  const totalPending = filteredData.filter(t => t.status === "Pending").length;
  const totalFailed = filteredData.filter(t => t.status === "Failed").length;
  const receiptWatermarkText = selectedTransaction?.status === "Successful" ? "PAID" : "NOT PAID";
  const receiptWatermarkClass = selectedTransaction?.status === "Successful" ? "receipt-watermark--paid" : "receipt-watermark--unpaid";


  //download PDF function
  const handleDownloadPDF = async () => {
    const element = receiptRef.current;
    if (!element) {
      notification.error({ message: "Receipt content not found!", placement: "topRight" });
      return;
    }

    try {
      notification.open({ message: "Generating PDF...", key: "pdf", placement: "topRight", duration: 0 });

      const images = Array.from(element.querySelectorAll("img"));
      await Promise.all(
        images.map((img) => {
          if (img.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
        })
      );

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

      const marginTop = 15;
      const marginLeft = 5;
      const marginRight = 5;
      const marginBottom = 10;
      const pdfWidth = pdf.internal.pageSize.getWidth() - marginLeft - marginRight;
      const pdfHeight = pdf.internal.pageSize.getHeight() - marginTop - marginBottom;
      const imageHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = (canvas.width * pdfHeight) / pdfWidth;

      let heightLeft = imageHeight;
      let position = marginTop;

      pdf.addImage(imgData, 'PNG', marginLeft, position, pdfWidth, imageHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight + marginTop;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', marginLeft, position, pdfWidth, imageHeight);
        heightLeft -= pageHeight;
      }

      const date = dayjs().format("YYYY-MM-DD");

      pdf.save(`Receipt-${selectedTransaction?.ref || 'download'}_${date}.pdf`);

      notification.success({ message: "Downloaded successfully!", key: "pdf", placement: "topRight" });
    } catch (error) {
      console.error("PDF Generation Error:", error);
      notification.error({ message: "Failed to generate PDF.", key: "pdf", placement: "topRight" });
    }
  };


  //generate PDF function
  const generatePDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const tableColumn = ["Invoice No.", "Reference", "Travel Package", "Payment Date & Time", "Total Price", "Method", "Status"];
    const tableRows = filteredData.map(item => [
      item.invoiceNumber || "N/A",
      item.ref,
      item.package,
      dayjs(item.date).format("MMM DD, YYYY hh:mm A"),
      item.price,
      item.method,
      item.status
    ]);

    try {
      const imgData = await getBase64ImageFromURL("/images/Logo.png");
      doc.addImage(imgData, "PNG", 14, 12, 24, 24);
    } catch (e) {
      console.warn("Logo not found at /public/images/Logo.png");
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("M&RC TRAVEL AND TOURS", 40, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1, Brgy", 40, 23);
    doc.text("San Antonio, Paranaque City, Philippines, 1709 PHL", 40, 27);
    doc.text("+639690554806 | info1@mrctravels.com", 40, 31);

    doc.setDrawColor(48, 87, 151);
    doc.line(14, 38, 196, 38);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(48, 87, 151);
    doc.text("TRANSACTION MANAGEMENT REPORT", 14, 48);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(`Date Generated: ${new Date().toLocaleString()}`, 14, 55);

    let tableStartY = 62;
    if (searchText) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Search Criteria: "${searchText}"`, 14, 62);
      tableStartY = 68;
    }

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: tableStartY,
      styles: { fontSize: 7.5 },
      headStyles: { fillColor: [48, 87, 151] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 }
    });

    doc.save(`Transaction_Report_${new Date().toLocaleDateString()}.pdf`);
    notification.success({ message: "Report exported to PDF successfully.", placement: "topRight" });
  };


  //edit function
  const edit = (record) => {
    setEditingTransaction(record);
    editForm.setFieldsValue({
      status: record.status
    });
    setIsEditModalOpen(true);
  };


  //open view modal function
  const openViewModal = (record) => {
    setSelectedTransaction(record);
    setIsViewModalOpen(true);
  };


  //open proof modal function
  const openProofModal = (record) => {
    setProofTransaction(record);
    setIsProofModalOpen(true);
  };


  //reject or approve proof function
  const handleProofDecision = async (record, status) => {
    setIsProofDecisionLoading(true);

    try {
      if (status === "Failed") {
        await apiFetch.put(`/transaction/${record.key}/reject`);
        setIsProofRejectedModalOpen(true);
      } else {
        await apiFetch.put(`/transaction/${record.key}`, { status });
        setIsProofApprovedModalOpen(true);
      }
      setData((prev) =>
        prev.map((item) =>
          item.key === record.key ? { ...item, status } : item
        )
      );
      setIsProofModalOpen(false);
      setIsProofDecision(null);
      setProofTransaction(null);
    } catch (error) {
      console.error(error)
      notification.error({ message: "Failed to update proof status.", description: error?.message || "Please try again.", placement: "topRight" });
    } finally {
      setIsProofDecisionLoading(false);
    }
  };


  //archive funtion
  const handleArchive = async (key) => {
    try {
      await apiFetch.delete(`/transaction/${key}`);
      setData((prev) => prev.filter((item) => item.key !== key));
      setIsTransactionDeletedModalOpen(true);
    } catch (error) {
      notification.error({ message: "Failed to archive transaction", placement: "topRight" });
    }
  };


  //restore function
  const handleRestore = async (key) => {
    try {
      await apiFetch.post(`/transaction/archived-transactions/${key}/restore`);
      setIsTransactionRestoredModalOpen(true);
      setArchivedData((prev) => prev.filter((item) => item.key !== key));
    } catch (error) {
      notification.error({ message: error?.response?.data?.message || "Failed to restore transaction", placement: "topRight" });
    }

  };


  //save function for edit modal
  const save = async () => {
    try {
      if (!editingTransaction) {
        return;
      }

      const values = await editForm.validateFields();

      // package, date, price and method removed from modal — preserve existing values
      const existingMethodRaw = editingTransaction?.methodRaw || editingTransaction?.method || undefined;

      const payload = {
        status: values.status,
      };

      await apiFetch.put(`/transaction/${editingTransaction.key}`, payload);

      setData((prev) =>
        prev.map((item) =>
          item.key === editingTransaction.key
            ? {
              ...item,
              status: values.status,
            }
            : item
        )
      );

      setIsTransactionEditedModalOpen(true);
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      editForm.resetFields();
    } catch {
      notification.error({ message: "Please fix validation errors", placement: "topRight" });
    }
  };


  // table columns
  const columns = [
    { title: "Invoice No.", dataIndex: "invoiceNumber" },
    { title: "Transaction Reference", dataIndex: "ref" },
    { title: "Item", dataIndex: "package" },
    { title: "Customer Name", dataIndex: "username" },
    {
      title: "Payment Date & Time",
      dataIndex: "date",
      render: d => dayjs(d).format("MMM DD, YYYY hh:mm A")
    },
    { title: "Total Price", dataIndex: "price" },
    { title: "Transaction Method", dataIndex: "method" },
    {
      title: "Status",
      dataIndex: "status",
      render: s => (
        <Tag
          color={
            s === "Successful" ? "green" :
              s === "Pending" ? "orange" :
                "red"
          }
        >
          {s}
        </Tag>
      )
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button
            className='transactionmanagement-view-button'
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => openViewModal(record)}
          >
          </Button>
          <Button
            className="transactionmanagement-edit-button"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => edit(record)}
          >
          </Button>
          <Button
            className="transactionmanagement-remove-button"
            type="primary"
            icon={<DeleteOutlined />}
            onClick={() => {
              setEditingTransaction(record);
              setIsDeleteModalOpen(true);
            }}
          >
          </Button>
          {record.methodRaw === "Manual" && record.proofImage && (
            <Button
              className="transactionmanagement-viewproof-button"
              type="primary"
              icon={<FileOutlined />}
              onClick={() => openProofModal(record)}
            >
            </Button>
          )}
        </Space>
      )
    }
  ];


  // archived table columns
  const archivedColumns = [
    { title: "Transaction Reference", dataIndex: "ref" },
    { title: "Item", dataIndex: "package" },
    { title: "Customer Name", dataIndex: "username" },
    {
      title: "Payment Date & Time",
      dataIndex: "date",
      render: d => dayjs(d).format("MMM DD, YYYY hh:mm A")
    },
    { title: "Total Price", dataIndex: "price" },
    { title: "Transaction Method", dataIndex: "method" },
    {
      title: "Status",
      dataIndex: "status",
      render: s => (
        <Tag
          color={
            s === "Successful" ? "green" :
              s === "Pending" ? "orange" :
                "red"
          }
        >
          {s}
        </Tag>
      )
    },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <Button
            className='transactionmanagement-restore-button'
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => {
              setEditingTransaction(record);
              setIsRestoreModalOpen(true);
            }}
          >
            Restore
          </Button>
        </Space>
      )
    }
  ];

  const selectedTransactionItems =
    Array.isArray(selectedTransaction?.items)
      ? selectedTransaction.items
      : [];

  const hasTransactionItems = selectedTransactionItems.length > 0;

  const selectedItemsTotal = selectedTransactionItems.reduce(
    (total, item) => total + Number(item.amount || 0),
    0
  );

  const selectedReceiptTotal = hasTransactionItems
    ? formatCurrency(selectedItemsTotal)
    : selectedTransaction?.price || formatCurrency(selectedTransaction?.amountRaw);


  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#305797"
        }
      }}
    >

      {isProofDecisionloading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
          <Spin size="large" description={isProofDecision === "Accept" ? "Accepting proof..." : "Rejecting proof..."} />
        </div>
      ) : (
        <div className="transaction-management-container">
          <h1 className="page-header">Transaction Management</h1>


          {!showArchived && (
            <Row gutter={16} className="transaction-statistics">
              <Col xs={24} sm={6}>
                <Card className="transaction-management-card">
                  <Statistic
                    title="Total Transactions"
                    value={totalTransactions}
                    prefix={<SwapOutlined />}
                  />
                </Card>
              </Col>

              <Col xs={24} sm={6}>
                <Card className="transaction-management-card">
                  <Statistic
                    title="Successful"
                    value={totalSuccessful}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>

              <Col xs={24} sm={6}>
                <Card className="transaction-management-card">
                  <Statistic
                    title="Pending"
                    value={totalPending}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>

              <Col xs={24} sm={6}>
                <Card className="transaction-management-card">
                  <Statistic
                    title="Failed"
                    value={totalFailed}
                    prefix={<CloseCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          )}

          <Card className="transaction-actions">
            <div className="transaction-actions-row">
              <div className="transaction-actions-filters">
                <div className="transaction-actions-field transaction-actions-field--search">
                  <label className="transactionmanagement-label">Search</label>
                  <Input
                    prefix={<SearchOutlined />}
                    placeholder="Search reference, package, method or status..."
                    className="transaction-search-input"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                  />
                </div>

                <div className="transaction-actions-field">
                  <label className="transactionmanagement-label">Method</label>
                  <Select
                    className="transaction-select"
                    placeholder="Method"
                    allowClear
                    value={methodFilter || undefined}
                    onChange={(v) => setMethodFilter(v || "")}
                    options={[
                      { value: "Manual", label: "Manual" },
                      { value: "Paymongo", label: "Paymongo" },
                    ]}
                  />
                </div>

                <div className="transaction-actions-field">
                  <label className="transactionmanagement-label">Status</label>
                  <Select
                    className="transaction-select"
                    placeholder="Status"
                    allowClear
                    value={statusFilter || undefined}
                    onChange={(v) => setStatusFilter(v || "")}
                    options={[
                      { value: "Successful", label: "Successful" },
                      { value: "Pending", label: "Pending" },
                      { value: "Failed", label: "Failed" }
                    ]}
                  />
                </div>

                <div className="transaction-actions-field">
                  <label className="transactionmanagement-label">Payment Date</label>
                  <DatePicker
                    className="transaction-date-filter"
                    placeholder="Payment Date"
                    value={paymentDateFilter}
                    onChange={(d) => setPaymentDateFilter(d)}
                    allowClear
                  />
                </div>
              </div>

              <div className="transaction-actions-buttons">
                {!showArchived && (
                  <Button
                    className='transactionmanagement-add-button'
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate(`${basePath}/transactions/add`)}
                  >
                    Add Transaction
                  </Button>
                )}
                <Button
                  className='transactionmanagement-export-button'
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={generatePDF}
                >
                  Export to PDF
                </Button>
                <Button
                  icon={showArchived ? <TransactionOutlined /> : <InboxOutlined />}
                  className='transactionmanagement-archive-button'
                  type="primary"
                  onClick={() => {
                    const nextValue = !showArchived;
                    setShowArchived(nextValue);
                    setSearchText("");
                    setMethodFilter("");
                    setStatusFilter("");
                    setPaymentDateFilter(null);
                    if (nextValue) {
                      fetchArchivedTransactions();
                    } else {
                      fetchTransactions();
                    }
                  }}
                >
                  {showArchived ? 'Back' : 'Archives'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="transaction-table-card">
            <Form form={form} component={false}>
              <Table
                className="transaction-table"
                columns={showArchived ? archivedColumns : columns}
                dataSource={filteredData}
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: false }}
              />
            </Form>
          </Card>

          <Modal
            title="Edit Transaction"
            open={isEditModalOpen}
            onCancel={() => {
              setIsEditModalOpen(false);
              setEditingTransaction(null);
            }}
            footer={null}
            centered={true}
            className="transaction-edit-modal"

          >
            <Form form={editForm} layout="vertical" className="transaction-edit-form">
              {/* Package, Payment Date and Amount removed - only Method and Status remain */}

              <Row gutter={12}>
                <Col span={24}>
                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: "Status is required" }]}
                  >
                    <Select
                      options={[
                        { value: "Successful", label: "Successful" },
                        { value: "Pending", label: "Pending" },
                        { value: "Failed", label: "Failed" }
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <Button
                  type='primary'
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTransaction(null);
                  }}
                  className="usermanagement-remove-button">
                  Cancel
                </Button>
                <Button
                  type='primary'
                  onClick={save}
                  className="usermanagement-okmodal-button">
                  Save
                </Button>
              </div>
            </Form>
          </Modal>


          {/* receipt modal */}
          <Modal
            open={isViewModalOpen}
            onCancel={() => setIsViewModalOpen(false)}
            footer={null}
            className="transaction-view-modal transaction-receipt-modal"
            width={720}
            centered={true}
          >
            {selectedTransaction && (
              <div
                className="receipt-container transaction-receipt-container"
                ref={receiptRef}
                style={{
                  padding: "20px",
                  background: "#fff",
                }}
              >
                <div className={`receipt-watermark ${receiptWatermarkClass}`}>
                  {receiptWatermarkText}
                </div>

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
                          <h2 className="brand-name">
                            M&RC Travel and Tours
                          </h2>

                          <p className="sub-info">
                            2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1
                          </p>

                          <p className="sub-info">
                            Parañaque City, Philippines
                          </p>

                          <p className="sub-info">1709 PHL</p>
                          <p className="sub-info">+63 969 055 4806</p>
                          <p className="sub-info">info1@mrctravels.com</p>
                        </div>
                      </div>
                    </div>

                    <div className="receipt-title-box">
                      <h1 className="receipt-title">
                        INVOICE {selectedTransaction.invoiceNumber}
                      </h1>
                    </div>
                  </div>

                  {/* Billing and transaction information */}
                  <div className="receipt-meta">
                    <div className="billed-to">
                      <span className="label-blue">Billed To</span>

                      <h3
                        className="customer-name"
                        style={{ margin: 0 }}
                      >
                        {`${selectedTransaction.firstname || ""} ${selectedTransaction.lastname || ""
                          }`.trim() ||
                          selectedTransaction.username ||
                          "Walk-in Customer"}
                      </h3>
                    </div>

                    <div className="receipt-details">
                      <div className="detail-item">
                        <span className="label-blue">Date</span>

                        <span>
                          {selectedTransaction.date ||
                            selectedTransaction.createdAt
                            ? dayjs(
                              selectedTransaction.date ||
                              selectedTransaction.createdAt
                            ).format("DD-MM-YYYY")
                            : "--"}
                        </span>
                      </div>

                      <div className="detail-item total-price">
                        <span className="label-blue">
                          Amount to Pay
                        </span>

                        <span className="value-blue">
                          {selectedReceiptTotal}
                        </span>
                      </div>

                      <div className="detail-item">
                        <span className="label-blue">Reference</span>

                        <span>
                          {selectedTransaction.ref || "--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Receipt Items */}
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
                      {hasTransactionItems ? (
                        selectedTransactionItems.map((item, index) => (
                          <tr key={item._id || `${item.description}-${index}`}>
                            <td>{Number(item.quantity || 0)}</td>

                            <td>
                              {item.description || "--"}
                            </td>

                            <td className="text-right">
                              {formatCurrency(item.unitPrice)}
                            </td>

                            <td className="text-right">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td>1</td>

                          <td>
                            {selectedTransaction.package ||
                              selectedTransaction.applicationType ||
                              "--"}
                          </td>

                          <td className="text-right">
                            {selectedTransaction.price ||
                              formatCurrency(
                                selectedTransaction.amountRaw
                              )}
                          </td>

                          <td className="text-right">
                            {selectedTransaction.price ||
                              formatCurrency(
                                selectedTransaction.amountRaw
                              )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Calculation Section */}
                  <div className="receipt-bank-grid">
                    <div className="receipt-bank-info">
                      <div className="receipt-bank-section">
                        <div className="receipt-bank-label">
                          Bank Account:
                        </div>

                        <p className="receipt-bank-details">
                          Bank: BDO UNIBANK
                        </p>

                        <p className="receipt-bank-details">
                          Account Name: M&RC Travel and Tours
                        </p>

                        <p className="receipt-bank-details">
                          Account #: 006838032692
                        </p>
                      </div>

                      <div className="receipt-bank-section">
                        <div className="receipt-bank-label">
                          USD Account:
                        </div>

                        <p className="receipt-bank-details">
                          Bank: BDO UNIBANK
                        </p>

                        <p className="receipt-bank-details">
                          Account Name: M&RC Travel and Tours
                        </p>

                        <p className="receipt-bank-details">
                          Account #: 113190015176
                        </p>
                      </div>

                      <div className="receipt-bank-section">
                        <div className="receipt-bank-label">
                          GCash:
                        </div>

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
                          <span>{selectedReceiptTotal}</span>
                        </div>

                        <div className="summary-row total-row">
                          <span>Total Due</span>

                          <span className="total-amount">
                            {selectedReceiptTotal}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="transaction-receipt-actions">
              <Button
                className="transactionmanagement-download-button"
                type="primary"
                onClick={handleDownloadPDF}
              >
                Download Receipt
              </Button>
            </div>
          </Modal>

          <Modal
            open={isProofModalOpen}
            onCancel={() => setIsProofModalOpen(false)}
            className="transaction-view-modal"
            width={720}
            centered={true}
            footer={null}
            title={`Proof of Payment - ${proofTransaction?.ref || ""}`}
          >
            {proofTransaction && (
              <div className="receipt-container">
                {proofTransaction.proofImage ? (
                  <div className="upload-preview-box" style={{ maxHeight: 520 }}>
                    <Image
                      src={proofTransaction.proofImage}
                      alt={proofTransaction.proofFileName || "Proof of payment"}
                      className="upload-preview-image"
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                ) : (
                  <p>No proof image available.</p>
                )}
              </div>


            )}

            <Space style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <Button
                className='user-transactions-download-button'
                type="primary"
                onClick={async () => {
                  try {
                    const date = dayjs().format("YYYY-MM-DD");
                    const response = await fetch(proofTransaction.proofImage, { mode: 'cors' });
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'Proof_of_Payment_' + proofTransaction.ref + '_' + date + '.png';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    window.open(proofTransaction.proofImage, '_blank');
                  }
                }}
              >
                Download Image
              </Button>

              <Button
                type="primary"
                className='transactionmanagement-accept-button'
                onClick={() => {
                  handleProofDecision(proofTransaction, "Successful")
                  setIsProofDecision('Accept');
                }}
              >
                Accept Proof
              </Button>

              <Button
                type="primary"
                className='transactionmanagement-remove-button'
                onClick={() => {
                  handleProofDecision(proofTransaction, "Failed")
                  setIsProofDecision('Reject');
                }}
              >
                Reject Proof
              </Button>
            </Space>
          </Modal>


          {/* ARCHIVE TRANSACTION CONFIRMATION MODAL */}
          <Modal
            open={isDeleteModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsDeleteModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Archive Transaction?</h1>
              <p className='modal-text'>Are you sure you want to archive this transaction?</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    handleArchive(editingTransaction.key);
                    setIsDeleteModalOpen(false);
                  }}
                >
                  Archive
                </Button>
                <Button
                  type='primary'
                  className='modal-button-cancel'
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setEditingTransaction(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>


          {/* RESTORE TRANSACTION CONFIRMATION MODAL */}
          <Modal
            open={isRestoreModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsRestoreModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Restore Transaction?</h1>
              <p className='modal-text'>Are you sure you want to restore this transaction?</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    handleRestore(editingTransaction.key);
                    setIsRestoreModalOpen(false);
                  }}
                >
                  Restore
                </Button>
                <Button
                  type='primary'
                  className='modal-button-cancel'
                  onClick={() => {
                    setIsRestoreModalOpen(false);
                    setEditingTransaction(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>



          {/* TRANSACTION HAS BEEN EDITED MODAL */}
          <Modal
            open={isTransactionEditedModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsTransactionEditedModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Transaction Edited Successfully!</h1>

              <div>
                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
              </div>

              <p className='modal-text'>The transaction has been edited.</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    setIsTransactionEditedModalOpen(false);
                  }}
                >
                  Continue
                </Button>
              </div>

            </div>
          </Modal>


          {/* TRANSACTION HAS BEEN ARCHIVED MODAL */}
          <Modal
            open={isTransactionDeletedModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsTransactionDeletedModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Transaction Archived Successfully!</h1>

              <div>
                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
              </div>

              <p className='modal-text'>The transaction has been archived.</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    setIsTransactionDeletedModalOpen(false);
                  }}
                >
                  Continue
                </Button>
              </div>

            </div>
          </Modal>

          {/* TRANSACTION HAS BEEN RESTORED MODAL */}
          <Modal
            open={isTransactionRestoredModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsTransactionRestoredModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Transaction Restored Successfully!</h1>

              <div>
                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
              </div>

              <p className='modal-text'>The transaction has been restored.</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    setIsTransactionRestoredModalOpen(false);
                  }}
                >
                  Continue
                </Button>
              </div>

            </div>
          </Modal>


          {/* PAYMENT PROOF HAS BEEN APPROVED MODAL */}
          <Modal
            open={isProofApprovedModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsProofApprovedModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Payment Proof Accepted!</h1>

              <div>
                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
              </div>

              <p className='modal-text'>The payment proof has been approved.</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    setIsProofApprovedModalOpen(false);
                  }}
                >
                  Continue
                </Button>
              </div>

            </div>
          </Modal>

          {/* PAYMENT PROOF HAS BEEN REJECTED MODAL */}
          <Modal
            open={isProofRejectedModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsProofRejectedModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Payment Proof Rejected!</h1>

              <div>
                <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
              </div>

              <p className='modal-text'>The payment proof has been rejected.</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    setIsProofRejectedModalOpen(false);
                  }}
                >
                  Continue
                </Button>
              </div>

            </div>
          </Modal>

        </div >

      )}

    </ConfigProvider >
  );
}