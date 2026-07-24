import React, { useEffect, useState, useRef, useCallback } from "react";
import { Input, Select, Button, Table, Tag, Space, DatePicker, Row, Col, Card, Statistic, Form, Modal, ConfigProvider, Image, Spin, notification, Upload, Empty, message } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, SwapOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, EyeOutlined, FilePdfOutlined, FileOutlined, CheckCircleFilled, InboxOutlined, TransactionOutlined, UploadOutlined, SettingOutlined } from "@ant-design/icons";
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

  const [notificationApi, notificationContextHolder] =
    notification.useNotification();

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
  const [isManageMethodModalOpen, setIsManageMethodModalOpen] = useState(false);

  const initialMethod = {
    paymentType: "",
    number: "",
    accountName: "",
    additionalInfo: "",
  };

  const [methodData, setMethodData] = useState(initialMethod);
  const [methodErrors, setMethodErrors] = useState({});

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [savingMethod, setSavingMethod] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [editingMethod, setEditingMethod] = useState(null);

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


  const fetchPaymentMethods = useCallback(async () => {
    try {
      const response = await apiFetch.get("/payment-methods/get-methods");

      setPaymentMethods(response);
    } catch (error) {

      console.error(error);
      console.error(error.response);

      notificationApi.error({
        title: "Unable to load payment methods.",
        placement: "topRight",
      });
    }
  }, [notificationApi]);


  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get("/transaction/all-transactions");
      const transactions = mapTransactions(response);

      setData(transactions);


    } catch (error) {
      console.error("Error fetching transactions:", error);
      notificationApi.error({ title: "Unable to load transactions.", placement: "topRight" });
    } finally {
      setLoading(false);
    }
  }, [notificationApi]);


  //fetch archived transactions function
  const fetchArchivedTransactions = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get("/transaction/archived-transactions");
      const transactions = mapTransactions(response);
      setArchivedData(transactions);
    } catch (error) {
      console.error("Error fetching archived transactions:", error);
      notificationApi.error({ title: "Unable to load archived transactions.", placement: "topRight" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchPaymentMethods();
  }, [fetchTransactions, fetchPaymentMethods]);


  //filter functions
  const currentData = showArchived ? archivedData : data;

  const filteredData = currentData.filter(item => {

    const searchValue = searchText.trim().toLowerCase();

    const matchesSearch =
      String(item.ref || "").toLowerCase().includes(searchValue) ||
      String(item.package || "").toLowerCase().includes(searchValue) ||
      String(item.method || "").toLowerCase().includes(searchValue) ||
      String(item.status || "").toLowerCase().includes(searchValue) ||
      String(item.username || "").toLowerCase().includes(searchValue) ||
      String(item.firstname || "").toLowerCase().includes(searchValue) ||
      String(item.lastname || "").toLowerCase().includes(searchValue) ||
      String(item.price || "").toLowerCase().includes(searchValue);

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
      notificationApi.error({ title: "Receipt content not found!", placement: "topRight" });
      return;
    }

    try {
      notificationApi.info({ title: "Generating PDF...", key: "pdf", placement: "topRight" });

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

      notificationApi.success({ title: "Downloaded successfully!", key: "pdf", placement: "topRight" });
    } catch (error) {
      console.error("PDF Generation Error:", error);
      notificationApi.error({ title: "Failed to generate PDF.", key: "pdf", placement: "topRight" });
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

    const generatedBy =
      [auth?.firstname, auth?.lastname]
        .filter(Boolean)
        .join(" ")
        .trim() || "Administrator";

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

    //add the footer and page numbers
    const totalPages = doc.getNumberOfPages();

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      doc.setPage(pageNumber);

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerY = pageHeight - 8;

      //footer separator line
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.2);
      doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);

      //generated by on the left
      doc.text(`Generated by: ${generatedBy}`, 14, footerY);

      //page number on the right
      doc.text(
        `Page ${pageNumber} of ${totalPages}`,
        pageWidth - 14,
        footerY,
        {
          align: "right"
        }
      );
    }

    doc.save(`Transaction_Report_${new Date().toLocaleDateString()}.pdf`);
    notificationApi.success({ title: "Report exported to PDF successfully.", placement: "topRight" });
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
      notificationApi.error({ title: "Failed to update proof status.", placement: "topRight" });
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
      notificationApi.error({ title: "Failed to archive transaction", placement: "topRight" });
    }
  };


  //restore function
  const handleRestore = async (key) => {
    try {
      await apiFetch.post(`/transaction/archived-transactions/${key}/restore`);
      setIsTransactionRestoredModalOpen(true);
      setArchivedData((prev) => prev.filter((item) => item.key !== key));
    } catch (error) {
      notificationApi.error({ title: "Failed to restore transaction", placement: "topRight" });
    }

  };


  //save function for edit modal
  const save = async () => {
    try {
      if (!editingTransaction) {
        return;
      }

      const values = await editForm.validateFields();

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
      notificationApi.error({ title: "Please fix validation errors", placement: "topRight" });
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
    { title: "Method", dataIndex: "method" },
    {
      title: "Status",
      dataIndex: "status",
      width: 110,
      render: s => (
        <Tag
          className="transactionmanagement-status-tag"
          color={
            s === "Successful"
              ? "green"
              : s === "Pending"
                ? "orange"
                : "red"
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
    { title: "Method", dataIndex: "method" },
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
            className='transactionmanagement-accept-button'
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


  const handleMethodImageChange = ({ file }) => {
    if (!file) return;

    setSelectedImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };

    reader.readAsDataURL(file);
  };


  const validateMethod = () => {
    const errors = {};

    if (!methodData.paymentType.trim()) {
      errors.paymentType = "Payment type is required";
    }

    if (!methodData.number.trim()) {
      errors.number = "Account number is required";
    } else if (!/^\d+$/.test(methodData.number)) {
      errors.number = "Only numbers are allowed.";
    }

    if (!methodData.accountName.trim()) {
      errors.accountName = "Account name is required";
    }

    if (Object.keys(errors).length) {
      setMethodErrors(errors);
      return false;
    }

    setMethodErrors({});
    return true;
  };


  const savePaymentMethod = async () => {
    try {
      if (!validateMethod()) return;

      setSavingMethod(true);

      const formData = new FormData();

      formData.append("paymentType", methodData.paymentType);
      formData.append("number", methodData.number);
      formData.append("accountName", methodData.accountName);
      formData.append("additionalInfo", methodData.additionalInfo);

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      if (editingMethod) {
        await apiFetch.put(
          `/payment-methods/${editingMethod._id}/update-methods`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        notificationApi.success({
          title: "Payment method updated.",
          placement: "topRight",
        });

      } else {

        await apiFetch.post(
          "/payment-methods/create-methods",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        notificationApi.success({
          title: "Payment method added.",
          placement: "topRight",
        });

      }

      notificationApi.success({
        title: "Payment method added successfully.",
        placement: "topRight",
      });

      setMethodData(initialMethod);
      setMethodErrors({});
      setSelectedImage(null);
      setImagePreview("");
      setIsManageMethodModalOpen(false);

    } catch (err) {
      console.error(err);

      notificationApi.error({
        title: "Unable to save payment method.",
        placement: "topRight",
      });
    } finally {
      setSavingMethod(false);
    }
  };


  const editPaymentMethod = (method) => {
    setEditingMethod(method);

    setMethodData({
      paymentType: method.paymentType || "",
      number: method.number || "",
      accountName: method.accountName || "",
      additionalInfo: method.additionalInfo || "",
    });

    setImagePreview(method.image);

    setIsManageMethodModalOpen(true);
  };


  const deletePaymentMethod = async (id) => {
    try {

      await apiFetch.delete(`/payment-methods/${id}/delete-methods`);

      notificationApi.success({
        title: "Payment method removed.",
        placement: "topRight",
      });

      fetchPaymentMethods();

    } catch (error) {

      notificationApi.error({
        title: "Unable to remove payment method.",
        placement: "topRight",
      });

    }
  };


  const closeManageMethodModal = () => {
    setMethodData(initialMethod);
    setMethodErrors({});

    setSelectedImage(null);
    setImagePreview("");
    setEditingMethod(null);

    setIsManageMethodModalOpen(false);
  };



  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#305797"
        }
      }}
    >
      {notificationContextHolder}
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
                    maxLength={40}
                    prefix={<SearchOutlined />}
                    placeholder="Search reference, package, method or status..."
                    className="transaction-search-input"
                    value={searchText}
                    onChange={(e) => {
                      const cleanedValue = e.target.value
                        .replace(/[^a-zA-Z0-9\s-]/g, '')
                        .replace(/\s{2,}/g, ' ')
                        .replace(/-{2,}/g, '-')
                        .replace(/^\s+/, '');

                      setSearchText(cleanedValue);
                    }}
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
                    inputReadOnly
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
                  <>
                    <Button
                      className='transactionmanagement-add-button'
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => navigate(`${basePath}/transactions/add`)}
                    >
                      Add Transaction
                    </Button>
                    <Button
                      className='transactionmanagement-add-button'
                      type="primary"
                      icon={<SettingOutlined />}
                      onClick={() => setIsManageMethodModalOpen(true)}
                    >
                      Manage Method
                    </Button>
                  </>
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
                scroll={{ x: "max-content" }}
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false
                }}
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
                  className="transactionmanagement-cancel-button">
                  Cancel
                </Button>
                <Button
                  type='primary'
                  onClick={save}
                  className="transactionmanagement-save-button">
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
            className="transaction-proof-modal"
            width={520}
            centered
            footer={null}
            title={`Proof of Payment - ${proofTransaction?.ref || ""}`}
          >
            {proofTransaction && (
              <div className="transaction-proof-content">
                {proofTransaction.proofImage ? (
                  <div className="transaction-proof-preview">
                    <Image
                      src={proofTransaction.proofImage}
                      alt={
                        proofTransaction.proofFileName ||
                        "Proof of payment"
                      }
                      className="transaction-proof-image"
                    />
                  </div>
                ) : (
                  <p>No proof image available.</p>
                )}
              </div>
            )}

            <Space className="transaction-proof-actions">
              <Button
                className="transactionmanagement-download-button"
                type="primary"
                onClick={async () => {
                  try {
                    const date = dayjs().format("YYYY-MM-DD");
                    const response = await fetch(
                      proofTransaction.proofImage,
                      { mode: "cors" }
                    );

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");

                    link.href = url;
                    link.download =
                      "Proof_of_Payment_" +
                      proofTransaction.ref +
                      "_" +
                      date +
                      ".png";

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    window.open(proofTransaction.proofImage, "_blank");
                  }
                }}
              >
                Download Image
              </Button>

              <Button
                type="primary"
                className="transactionmanagement-accept-button"
                onClick={() => {
                  handleProofDecision(proofTransaction, "Successful");
                  setIsProofDecision("Accept");
                }}
              >
                Accept Proof
              </Button>

              <Button
                type="primary"
                className="transactionmanagement-reject-button"
                onClick={() => {
                  handleProofDecision(proofTransaction, "Failed");
                  setIsProofDecision("Reject");
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
                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
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
                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
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
                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
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
                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
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
                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
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






          <Modal
            title={editingMethod ? "Edit Payment Method" : "Manage Payment Methods"}
            open={isManageMethodModalOpen}
            onCancel={closeManageMethodModal}
            footer={null}
            centered
            width={950}
          >
            <Row gutter={24}>
              {/* LEFT SIDE - FORM */}
              <Col span={10}>

                <div style={{ marginBottom: 10 }}>
                  <label className="transactionmanagement-label">Payment Type</label>
                  <Input
                    placeholder="GCash, Maya, BDO, BPI..."
                    maxLength={50}
                    value={methodData.paymentType}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/[^A-Za-z0-9&.\-\s]/g, "")
                        .replace(/\s{2,}/g, " ")
                        .replace(/^\s+/, "");

                      setMethodData((prev) => ({
                        ...prev,
                        paymentType: value,
                      }));
                    }}
                  />
                  {methodErrors.paymentType && (
                    <div style={{ color: "red", fontSize: 12 }}>
                      {methodErrors.paymentType}
                    </div>
                  )}
                </div>


                <div style={{ marginBottom: 10 }}>
                  <label className="transactionmanagement-label">Account Number</label>
                  <Input
                    placeholder="0123456789"
                    maxLength={30}
                    inputMode="numeric"
                    value={methodData.number}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");

                      setMethodData((prev) => ({
                        ...prev,
                        number: value,
                      }));
                    }}
                  />
                  {methodErrors.number && (
                    <div style={{ color: "red", fontSize: 12 }}>
                      {methodErrors.number}
                    </div>
                  )}
                </div>



                <div style={{ marginBottom: 10 }}>
                  <label className="transactionmanagement-label">Account Name</label>
                  <Input
                    maxLength={100}
                    placeholder="Juan Dela Cruz"
                    value={methodData.accountName}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/[^A-Za-z0-9\s.,&'-]/g, "")
                        .replace(/\s{2,}/g, " ")
                        .replace(/^\s+/, "");

                      setMethodData((prev) => ({
                        ...prev,
                        accountName: value,
                      }));
                    }}
                  />
                  {methodErrors.accountName && (
                    <div style={{ color: "red", fontSize: 12 }}>
                      {methodErrors.accountName}
                    </div>
                  )}
                </div>



                <div style={{ marginBottom: 10 }}>
                  <label className="transactionmanagement-label">Additional Info</label>
                  <Input.TextArea
                    rows={3}
                    placeholder="Optional"
                    maxLength={150}
                    showCount
                    value={methodData.additionalInfo}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/^\s+/, "")
                        .replace(/\s{2,}/g, " ");

                      setMethodData((prev) => ({
                        ...prev,
                        additionalInfo: value,
                      }));
                    }}
                  />
                  {methodErrors.additionalInfo && (
                    <div style={{ color: "red", fontSize: 12 }}>
                      {methodErrors.additionalInfo}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 10 }}>
                  <Upload
                    beforeUpload={(file) => {
                      const isImage = file.type.startsWith("image/");

                      if (!isImage) {
                        message.error("Only image files are allowed.");
                        return Upload.LIST_IGNORE;
                      }

                      const isLt5M = file.size / 1024 / 1024 < 5;

                      if (!isLt5M) {
                        message.error("Image must be smaller than 5 MB.");
                        return Upload.LIST_IGNORE;
                      }

                      return false;
                    }}
                    maxCount={1}
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    showUploadList={false}
                    onChange={handleMethodImageChange}
                  >
                    <Button
                      icon={<UploadOutlined />}
                      style={{ width: "100%" }}
                    >
                      Upload Image (Optional)
                    </Button>
                  </Upload>

                  {imagePreview && (
                    <div
                      style={{
                        marginTop: 15,
                        textAlign: "center",
                      }}
                    >
                      <Image
                        src={imagePreview}
                        width={180}
                      />
                    </div>
                  )}
                </div>


                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                  <Button
                    type="primary"
                    onClick={closeManageMethodModal}
                    className="transactionmanagement-modal-cancel-button"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="primary"
                    loading={savingMethod}
                    onClick={savePaymentMethod}
                    className="transactionmanagement-modal-save-button"
                  >
                    {editingMethod ? "Update" : "Save"}
                  </Button>
                </Space>
              </Col>

              {/* RIGHT SIDE - LIST */}

              <Col span={14}>
                <div
                  style={{
                    maxHeight: 520,
                    overflowY: "auto",
                    paddingRight: 8,
                  }}
                >
                  <h2>Payment Methods</h2>
                  {paymentMethods.length === 0 ? (
                    <Empty description="No payment methods yet." />
                  ) : (
                    paymentMethods.map((method) => (
                      <Card
                        key={method._id}
                        size="small"
                        style={{
                          marginBottom: 12,
                          borderRadius: 10,
                        }}
                      >
                        <Row
                          align="middle"
                          gutter={12}
                        >
                          <Col span={5}>
                            <Image
                              src={method.image}
                              width={70}
                              height={70}
                              style={{
                                objectFit: "contain",
                                borderRadius: 6,
                              }}
                            />
                          </Col>

                          <Col span={12}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 15,
                              }}
                            >
                              {method.paymentType}
                            </div>

                            <div>{method.number}</div>

                            <div>{method.accountName}</div>

                            {method.additionalInfo && (
                              <div
                                style={{
                                  color: "#888",
                                  marginTop: 4,
                                  fontSize: 12,
                                }}
                              >
                                {method.additionalInfo}
                              </div>
                            )}
                          </Col>

                          <Col
                            span={7}
                            style={{
                              textAlign: "right",
                            }}
                          >
                            <Space direction="vertical">
                              <Button
                                type="primary"
                                block
                                onClick={() => editPaymentMethod(method)}
                                className="transactionmanagement-modal-save-button"
                              >
                                Edit
                              </Button>

                              <Button
                                type="primary"
                                block
                                onClick={() => deletePaymentMethod(method._id)}
                                className="transactionmanagement-modal-cancel-button"
                              >
                                Remove
                              </Button>
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                    ))
                  )}
                </div>
              </Col>
            </Row>
          </Modal>

        </div >

      )
      }

    </ConfigProvider >
  );
}