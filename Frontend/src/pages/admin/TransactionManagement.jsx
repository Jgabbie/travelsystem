import React, { useEffect, useState, useRef } from "react";
import { Input, Select, Button, Table, Tag, Space, DatePicker, Row, Col, Card, Statistic, Form, message, Modal, ConfigProvider, Image, Spin } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined, SwapOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EyeOutlined, FilePdfOutlined, FileOutlined, CheckCircleFilled, InboxOutlined, TransactionOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/transaction.css";
import "../../style/components/modals/modaldesign.css";

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

export default function TransactionManagement() {
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

  const mapTransactions = (response) => response.map((t) => ({
    key: t._id,
    ref: t.reference,
    username: t.userId?.username || "Unknown User",
    package: t.packageId?.packageName || t.applicationType,
    date: t.createdAt ? dayjs(t.createdAt).format("YYYY-MM-DD HH:mm") : "",
    price: `₱${Number(t.amount || 0).toLocaleString()}`,
    amountRaw: Number(t.amount || 0),
    method: t.method?.charAt(0)?.toUpperCase() + t.method?.slice(1) || "No Method",
    methodRaw: t.method || "",
    status: t.status || "No Status",
    proofImage: t.proofImage || null,
    proofImageType: t.proofImageType || "",
    proofFileName: t.proofFileName || ""
  }));

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get("/transaction/all-transactions");
      const transactions = mapTransactions(response);

      setData(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      message.error("Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedTransactions = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get("/transaction/archived-transactions");
      const transactions = mapTransactions(response);
      setArchivedData(transactions);
    } catch (error) {
      console.error("Error fetching archived transactions:", error);
      message.error("Unable to load archived transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

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

  const handleDownloadPDF = async () => {
    const element = receiptRef.current;
    if (!element) {
      message.error("Receipt content not found!");
      return;
    }

    try {
      message.loading({ content: "Generating PDF...", key: "pdf" });

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

      message.success({ content: "Downloaded successfully!", key: "pdf" });
    } catch (error) {
      console.error("PDF Generation Error:", error);
      message.error({ content: "Failed to generate PDF.", key: "pdf" });
    }
  };


  const generatePDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const tableColumn = ["Reference", "Travel Package", "Payment Date & Time", "Total Price", "Method", "Status"];
    const tableRows = filteredData.map(item => [
      item.ref,
      item.package,
      dayjs(item.date).format("MMM DD, YYYY hh:mm A"),
      item.price,
      item.method,
      item.status
    ]);

    try {
      const imgData = await getBase64ImageFromURL("/images/Logo.png");
      doc.addImage(imgData, "PNG", 14, 12, 35, 22);
    } catch (e) {
      console.warn("Logo not found at /public/images/Logo.png");
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("M&RC TRAVEL AND TOURS", 52, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("2nd Floor #1 Cor Fatima street, San Antonio Avenue Valley 1, Brgy", 52, 23);
    doc.text("San Antonio, Paranaque City, Philippines, 1709 PHL", 52, 27);
    doc.text("+639690554806 | info1@mrctravels.com", 52, 31);

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
    message.success("Report exported to PDF successfully.");
  };

  const edit = (record) => {
    setEditingTransaction(record);
    editForm.setFieldsValue({
      status: record.status
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (record) => {
    setSelectedTransaction(record);
    setIsViewModalOpen(true);
  };

  const openProofModal = (record) => {
    setProofTransaction(record);
    setIsProofModalOpen(true);
  };


  //HANDLE PROOF DECISION (ACCEPT OR REJECT) ----------------------------
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
      console.log(error)
      message.error("Failed to update proof status.", error);
    } finally {
      setIsProofDecisionLoading(false);
    }
  };


  //HANDLE ARCHIVE TRANSACTION ----------------------------
  const handleArchive = async (key) => {
    try {
      await apiFetch.delete(`/transaction/${key}`);
      setData((prev) => prev.filter((item) => item.key !== key));
      setIsTransactionDeletedModalOpen(true);
    } catch (error) {
      message.error("Failed to archive transaction");
    }
  };

  const handleRestore = async (key) => {
    try {
      await apiFetch.post(`/transaction/archived-transactions/${key}/restore`);
      setIsTransactionRestoredModalOpen(true);
      setArchivedData((prev) => prev.filter((item) => item.key !== key));
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to restore transaction");
    }

  };

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
      message.error("Please fix validation errors");
    }
  };

  // ================= TABLE =================
  const columns = [
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
            <Row gutter={16} style={{ marginBottom: 20 }}>
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

          <Card>
            <Form form={form} component={false}>
              <Table
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

          <Modal
            open={isViewModalOpen}
            onCancel={() => setIsViewModalOpen(false)}
            footer={null}
            className="transaction-view-modal"
            width={720}
            centered={true}
          >
            {selectedTransaction && (
              <div className="receipt-container" ref={receiptRef} style={{ padding: '20px', background: '#fff' }}>
                {/* Header Section */}
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
                    <h1 className="receipt-title">RECEIPT</h1>
                  </div>
                </div>

                {/* Billing & Meta Section */}
                <div className="receipt-meta">
                  <div className="billed-to">
                    <span className="label-blue">Billed To</span>
                    <h3 className="customer-name" style={{ margin: 0 }}>{selectedTransaction.username || "Customer Name"}</h3>
                  </div>
                  <div className="receipt-details">
                    <div className="detail-item">
                      <span className="label-blue">Receipt #</span>
                      <span>{selectedTransaction.ref}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label-blue">Receipt date</span>
                      <span>{selectedTransaction.date ? dayjs(selectedTransaction.date).format("DD-MM-YYYY") : "--"}</span>
                    </div>
                  </div>
                </div>

                {/* Items Table */}
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
                      <td>{selectedTransaction.package}</td>
                      <td className="text-right">{selectedTransaction.price}</td>
                      <td className="text-right">{selectedTransaction.price}</td>
                    </tr>
                    {/* Add more rows here if your transaction data has multiple items */}
                  </tbody>
                </table>

                {/* Calculation Section */}
                <div className="receipt-summary">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>{selectedTransaction.price}</span>
                  </div>
                  <div className="summary-row total-row">
                    <span className="label-blue">Total</span>
                    <span className="total-amount">{selectedTransaction.price}</span>
                  </div>
                </div>

                {/* Footer Notes */}
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
                className='user-transactions-viewproof-button'
                type="primary"
                onClick={async () => {
                  try {
                    const response = await fetch(proofTransaction.proofImage, { mode: 'cors' });
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'proof_of_payment_' + proofTransaction.ref + '.png';
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