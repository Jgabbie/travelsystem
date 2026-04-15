import React, { useEffect, useState, useRef } from "react";
import { Input, Select, Button, Table, Tag, Space, DatePicker, Row, Col, Card, Statistic, Form, message, Modal, ConfigProvider, Image } from "antd";
import { SearchOutlined, EditOutlined, DeleteOutlined, SwapOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EyeOutlined, FilePdfOutlined, FileOutlined, CheckCircleFilled } from "@ant-design/icons";
import dayjs from "dayjs";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/transaction.css";

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const response = await apiFetch.get("/transaction/all-transactions");

        const transactions = response.map((t) => ({
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

        console.log(transactions)

        setData(transactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        message.error("Unable to load transactions.");
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const filteredData = data.filter(item => {

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
      package: record.package,
      date: record.date ? dayjs(record.date) : null,
      price: Number.isFinite(record.amountRaw) ? record.amountRaw : record.price,
      method: record.method,
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

  const handleProofDecision = async (record, status) => {
    try {
      if (status === "Failed") {
        await apiFetch.put(`/transaction/${record.key}/reject`);
      } else {
        await apiFetch.put(`/transaction/${record.key}`, { status });
      }
      setData((prev) =>
        prev.map((item) =>
          item.key === record.key ? { ...item, status } : item
        )
      );
      setIsProofModalOpen(false);
      setProofTransaction(null);
      message.success(`Proof ${status === "Successful" ? "accepted" : "rejected"}.`);
    } catch (error) {
      message.error("Failed to update proof status.");
    }
  };

  const handleDelete = async (key) => {
    try {
      await apiFetch.delete(`/transaction/${key}`);
      setData((prev) => prev.filter((item) => item.key !== key));
      setIsTransactionDeletedModalOpen(true);
      message.success("Transaction deleted");
    } catch (error) {
      message.error("Failed to delete transaction");
    }
  };

  const save = async () => {
    try {
      if (!editingTransaction) {
        return;
      }

      const values = await editForm.validateFields();
      const dateValue = dayjs.isDayjs(values.date)
        ? values.date.format("YYYY-MM-DD HH:mm")
        : values.date;
      const parsedAmount = Number(String(values.price || "").replace(/[^0-9.-]/g, ""));
      const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
      const priceFormatted = `₱${amount.toLocaleString()}`;

      const payload = {
        packageName: values.package,
        method: values.method,
        status: values.status,
        amount
      };

      await apiFetch.put(`/transaction/${editingTransaction.key}`, payload);

      setData((prev) =>
        prev.map((item) =>
          item.key === editingTransaction.key
            ? {
              ...item,
              package: values.package,
              date: dateValue,
              method: values.method,
              status: values.status,
              amountRaw: amount,
              price: priceFormatted
            }
            : item
        )
      );

      message.success("Transaction updated");
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
            View
          </Button>
          <Button
            className="transactionmanagement-edit-button"
            type="primary"
            icon={<EditOutlined />}
            onClick={() => edit(record)}
          >
            Edit
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
            Delete
          </Button>
          {record.methodRaw === "Manual" && record.proofImage && (
            <Button
              className="transactionmanagement-viewproof-button"
              type="primary"
              icon={<FileOutlined />}
              onClick={() => openProofModal(record)}
            >
              View Proof
            </Button>
          )}
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
      <div className="transaction-management-container">
        <h1 className="page-header">Transaction Management</h1>


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

        <div className="transaction-actions">
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search reference, package, method or status..."
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />

          <Select
            className="transaction-select"
            placeholder="Method"
            style={{ width: 160 }}
            allowClear
            value={methodFilter || undefined}
            onChange={(v) => setMethodFilter(v || "")}
            options={[
              { value: "Manual", label: "Manual" },
              { value: "Paymongo", label: "Paymongo" },
            ]}
          />

          <Select
            className="transaction-select"
            placeholder="Status"
            style={{ width: 140 }}
            allowClear
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || "")}
            options={[
              { value: "Successful", label: "Successful" },
              { value: "Pending", label: "Pending" },
              { value: "Failed", label: "Failed" }
            ]}
          />

          <DatePicker
            className="transaction-date-filter"
            placeholder="Payment Date"
            value={paymentDateFilter}
            onChange={(d) => setPaymentDateFilter(d)}
            allowClear
          />

          <Space style={{ marginLeft: 'auto' }}>
            <Button
              className='transactionmanagement-export-button'
              type="primary"
              icon={<FilePdfOutlined />}
              onClick={generatePDF}
            >
              Export to PDF
            </Button>
          </Space>
        </div>

        <Card>
          <Table
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: "max-content" }}
          />
        </Card>

        <Modal
          title="Edit Transaction"
          open={isEditModalOpen}
          onCancel={() => {
            setIsEditModalOpen(false);
            setEditingTransaction(null);
          }}
          footer={null}
          style={{ top: 155 }}
          className="transaction-edit-modal"

        >
          <Form form={editForm} layout="vertical" className="transaction-edit-form">
            <Form.Item
              name="package"
              label="Package"
              rules={[{ required: true, message: "Package is required" }]}
            >
              <Input />
            </Form.Item>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="date"
                  label="Payment Date"
                  rules={[{ required: true, message: "Payment date is required" }]}
                >
                  <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: "100%" }} />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  name="price"
                  label="Amount"
                  rules={[{ required: true, message: "Amount is required" }]}
                >
                  <Input type="number" min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="method"
                  label="Method"
                  rules={[{ required: true, message: "Method is required" }]}
                >
                  <Select
                    options={[
                      { value: "Bank Transfer", label: "Bank Transfer" },
                      { value: "GCash", label: "GCash" },
                      { value: "Credit Card", label: "Credit Card" }
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
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
          style={{ top: 40 }}
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
          style={{ top: 150 }}
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
              onClick={() => handleProofDecision(proofTransaction, "Successful")}
            >
              Accept Proof
            </Button>

            <Button
              type="primary"
              className='transactionmanagement-remove-button'
              onClick={() => handleProofDecision(proofTransaction, "Failed")}
            >
              Reject Proof
            </Button>
          </Space>
        </Modal>


        {/* DELETE TRANSACTION CONFIRMATION MODAL */}
        <Modal
          open={isDeleteModalOpen}
          className='signup-success-modal'
          closable={{ 'aria-label': 'Custom Close Button' }}
          footer={null}
          style={{ top: 220 }}
          onCancel={() => {
            setIsDeleteModalOpen(false);
          }}
        >
          <div className='signup-success-container'>
            <h1 className='signup-success-heading'>Delete Booking?</h1>
            <p className='signup-success-text'>Are you sure you want to delete this booking?</p>

            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

              <Button
                type='primary'
                className='logout-confirm-btn'
                onClick={() => {
                  handleDelete(editingTransaction.key);
                  setIsDeleteModalOpen(false);
                }}
              >
                Delete
              </Button>
              <Button
                type='primary'
                className='logout-cancel-btn'
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

        {/* TRANSACTION HAS BEEN EDITED MODAL */}
        <Modal
          open={isTransactionEditedModalOpen}
          className='signup-success-modal'
          closable={{ 'aria-label': 'Custom Close Button' }}
          footer={null}
          style={{ top: 220 }}
          onCancel={() => {
            setIsTransactionEditedModalOpen(false);
          }}
        >
          <div className='signup-success-container'>
            <h1 className='signup-success-heading'>Transaction Edited Successfully!</h1>

            <div>
              <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
            </div>

            <p className='signup-success-text'>The transaction has been edited.</p>

            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

              <Button
                type='primary'
                className='logout-confirm-btn'
                onClick={() => {
                  setIsTransactionEditedModalOpen(false);
                }}
              >
                Continue
              </Button>
            </div>

          </div>
        </Modal>


        {/* TRANSACTION HAS BEEN DELETED MODAL */}
        <Modal
          open={isTransactionDeletedModalOpen}
          className='signup-success-modal'
          closable={{ 'aria-label': 'Custom Close Button' }}
          footer={null}
          style={{ top: 220 }}
          onCancel={() => {
            setIsTransactionDeletedModalOpen(false);
          }}
        >
          <div className='signup-success-container'>
            <h1 className='signup-success-heading'>Transaction Deleted Successfully!</h1>

            <div>
              <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
            </div>

            <p className='signup-success-text'>The transaction has been deleted.</p>

            <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

              <Button
                type='primary'
                className='logout-confirm-btn'
                onClick={() => {
                  setIsTransactionDeletedModalOpen(false);
                }}
              >
                Continue
              </Button>
            </div>

          </div>
        </Modal>
      </div >



    </ConfigProvider >
  );
}