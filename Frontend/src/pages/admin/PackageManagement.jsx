import { Input, Button, Card, Row, Col, Statistic, Empty, Modal, notification, Select, ConfigProvider, Space, InputNumber, Tag, Spin, Upload } from "antd";
import { PlusOutlined, SearchOutlined, SolutionOutlined, AppstoreOutlined, CheckCircleOutlined, StopOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CalendarOutlined, PercentageOutlined, CheckCircleFilled, InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import "../../style/admin/packages.css";
import "../../style/components/modals/modaldesign.css";
import apiFetch from "../../config/fetchConfig";
import { useAuth } from "../../hooks/useAuth";

export default function PackageManagement() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isEmployee = auth?.role === 'Employee';
  const basePath = isEmployee ? '/employee' : '';

  const [notificationApi, notificationContextHolder] =
    notification.useNotification();

  const [packagesData, setPackagesData] = useState([]);
  const [archivedPackagesData, setArchivedPackagesData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isDiscountAppliedModalOpen, setIsDiscountAppliedModalOpen] = useState(false);
  const [isSlotsSavedModalOpen, setIsSlotsSavedModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isPackageDeletedModalOpen, setIsPackageDeletedModalOpen] = useState(false);
  const [isPackageRestoredModalOpen, setIsPackageRestoredModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionType, setActionType] = useState("");
  const [showArchived, setShowArchived] = useState(false);


  const [recentToursModal, setRecentToursModal] = useState(false);
  const [recentTours, setRecentTours] = useState([]);
  const [recentImage, setRecentImage] = useState(null);
  const [uploadingRecentTour, setUploadingRecentTour] = useState(false);
  const [fileList, setFileList] = useState([]);

  const [filters, setFilters] = useState({
    packageType: null,
    availability: null,
  });

  const [pkg, setPkg] = useState({});
  const [slotsPackage, setSlotsPackage] = useState(null);
  const [discountPackage, setDiscountPackage] = useState(null);
  const [editableSlots, setEditableSlots] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);

  const packageTypeOptions = [
    { label: "Domestic", value: "domestic" },
    { label: "International", value: "international" },
  ];

  const availabilityOptions = [
    { label: "Available", value: "available" },
    { label: "Unavailable", value: "unavailable" },
  ];


  //show modal for package details
  const showModal = (pkg) => {
    setPkg(pkg);
    setIsModalOpen(true);
  };


  //show modal for slots
  const showSlotsModal = (pkg) => {
    setSlotsPackage(pkg);
    setEditableSlots(
      (pkg.packageSpecificDate || []).map((item) => ({ ...item }))
    );
    setIsSlotsModalOpen(true);
  };


  //show modal for discount
  const showDiscountModal = (pkg) => {
    setDiscountPackage(pkg);
    setDiscountPercent(Number(pkg.packageDiscountPercent) || 0);
    setIsDiscountModalOpen(true);
  };


  //format date
  const formatDate = (date) => {
    return date && dayjs(date).isValid()
      ? dayjs(date).format("MMM D, YYYY")
      : "Invalid Date";
  };

  //slots and discounts cancel modal functions
  const handleSlotsCancel = () => {
    setIsSlotsModalOpen(false);
    setSlotsPackage(null);
    setEditableSlots([]);
  };

  const handleDiscountCancel = () => {
    setIsDiscountModalOpen(false);
    setDiscountPackage(null);
    setDiscountPercent(0);
  };


  //save slots functions
  const handleSlotsSave = async () => {
    try {

      const slotsPayload = {
        packageItem: slotsPackage.packageItem,
        dateRanges: editableSlots.map((slot) => ({
          startdaterange: slot.startdaterange,
          enddaterange: slot.enddaterange,
          extrarate: slot.extrarate,
          slots: Number(slot.slots) || 0
        }))
      };

      await apiFetch.put('/package/update-slots', slotsPayload);
      setIsSlotsSavedModalOpen(true);

    } catch (error) {
      console.error("Error updating slots:", error);
      notificationApi.error({ title: 'Failed to update slots.', placement: 'topRight' });
      return;
    }

    if (!slotsPackage) return;
    setPackagesData((prev) =>
      prev.map((p) =>
        p.packageItem === slotsPackage.packageItem
          ? { ...p, packageSpecificDate: editableSlots }
          : p
      )
    );

    notificationApi.success({ title: 'Slots updated successfully.', placement: 'topRight' });
    handleSlotsCancel();
  };


  //save discount function
  const handleDiscountSave = async () => {
    if (!discountPackage) return;

    try {
      await apiFetch.put('/package/update-discount', {
        packageItem: discountPackage.packageItem,
        discountPercent: Number(discountPercent) || 0
      });

      setIsDiscountAppliedModalOpen(true);
    } catch (error) {
      console.error("Error updating discount:", error);
      notificationApi.error({ title: 'Failed to update discount.', placement: 'topRight' });
      return;
    }

    setPackagesData((prev) =>
      prev.map((p) =>
        p.packageItem === discountPackage.packageItem
          ? { ...p, packageDiscountPercent: Number(discountPercent) || 0 }
          : p
      )
    );

    notificationApi.success({ title: 'Discount updated successfully.', placement: 'topRight' });
    handleDiscountCancel();
  };


  //show package details cancel modal
  const handleCancel = () => {
    setIsModalOpen(false);
  }


  //archive function
  const handleArchive = async (key) => {

    setActionLoading(true);
    setActionType("Archiving");

    try {
      await apiFetch.delete(`/package/remove-package/${key}`);
      setIsPackageDeletedModalOpen(true);
      getPackages();
    } catch (error) {
      console.error("Error removing package:", error);
      notificationApi.error({ title: 'Package archived unsuccessfully', placement: 'topRight' });
    } finally {
      setActionLoading(false);
    }

  }


  //restore function
  const handleRestore = async (key) => {

    setActionLoading(true);
    setActionType("Restoring");

    try {
      await apiFetch.post(`/package/archived-packages/${key}/restore`);
      setIsPackageRestoredModalOpen(true);
      setArchivedPackagesData((prev) => prev.filter((item) => item.packageItem !== key));
    } catch (error) {
      console.error("Error restoring package:", error);
      notificationApi.error({ title: error?.response?.data?.message || 'Package restore failed', placement: 'topRight' });
    } finally {
      setActionLoading(false);
    }
  }


  // fetch packages
  const getPackages = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get('/package/get-packages');

      const sortedPackages = response.sort((a, b) => {
        // Sort by creation date if you have it
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        // Fallback: sort by package item
        return String(b.packageItem || '').localeCompare(String(a.packageItem || ''));
      });

      setPackagesData(sortedPackages);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  }


  //fetch archive functions
  const getArchivedPackages = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get('/package/archived-packages');

      const sortedPackages = response.sort((a, b) => {
        if (a.archivedAt && b.archivedAt) {
          return new Date(b.archivedAt) - new Date(a.archivedAt);
        }
        return String(b.packageItem || '').localeCompare(String(a.packageItem || ''));
      });

      setArchivedPackagesData(sortedPackages);
    } catch (error) {
      console.error("Error fetching archived packages:", error);
    } finally {
      setLoading(false);
    }
  }


  //get total slots for function
  const availableSlots = (pkg) => {
    if (!pkg.packageSpecificDate || pkg.packageSpecificDate.length === 0) {
      return 0; // No specific dates means no available slots
    }
    const totalSlots = pkg.packageSpecificDate.reduce((total, dateRange) => {
      return total + (dateRange.slots || 0);
    }, 0);
    return totalSlots;
  }

  useEffect(() => {
    getPackages()
  }, []);


  // filter fucntions
  const currentPackages = showArchived ? archivedPackagesData : packagesData;

  const filteredPackages = currentPackages.filter((pkg) => {
    const matchesType = filters.packageType ? pkg.packageType === filters.packageType : true;
    const matchesAvailability = filters.availability
      ? (filters.availability === "available" ? availableSlots(pkg) > 0 : availableSlots(pkg) === 0)
      : true;

    // safe search by name or code
    const matchesSearch =
      (pkg.packageName?.toLowerCase().includes(searchText.toLowerCase()) ||
        pkg.packageCode?.toLowerCase().includes(searchText.toLowerCase()));

    return matchesType && matchesAvailability && matchesSearch;
  });

  const totalPackages = currentPackages.length;


  const getRecentTours = async () => {
    try {

      const response = await apiFetch.get(
        "/recent-tours/get-recent-tours"
      );

      setRecentTours(response);

    } catch (err) {
      console.error(err);
    }
  };



  const uploadRecentTour = async () => {

    if (!recentImage) {
      notificationApi.error({
        message: "Please select an image."
      });
      return;
    }

    try {

      setUploadingRecentTour(true);

      const formData = new FormData();
      formData.append("image", recentImage);

      await apiFetch.post(
        "/recent-tours/create-recent-tour",
        formData
      );

      setRecentImage(null);
      setFileList([]);

      await getRecentTours();

      notificationApi.success({
        message: "Recent tour uploaded."
      });

    } catch (err) {
      console.error(err);

    } finally {
      setUploadingRecentTour(false);
    }
  };


  const deleteRecentTour = async (id) => {

    try {

      await apiFetch.delete(
        `/recent-tours/${id}/delete-recent-tour`
      );

      getRecentTours();

      notificationApi.success({
        message: "Recent tour deleted."
      });

    } catch (err) {
      console.error(err);
    }

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

      {actionLoading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
          <Spin size="large" description={actionType === "Archiving" ? "Archiving package..." : "Restoring package..."} />
        </div>
      ) : (

        <div>
          <h1 className="page-header">Package Management</h1>

          {/* STATISTICS */}
          {!showArchived && (
            <Row gutter={16} className="package-statistics">
              <Col xs={24} sm={8}>
                <Card className="package-management-card">
                  <Statistic
                    title="Total Packages"
                    value={totalPackages}
                    prefix={<AppstoreOutlined />}
                  />
                </Card>
              </Col>

              <Col xs={24} sm={8}>
                <Card className="package-management-card">
                  <Statistic
                    title="Available"
                    value={filteredPackages.filter(pkg => availableSlots(pkg) > 0).length}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>

              <Col xs={24} sm={8}>
                <Card className="package-management-card">
                  <Statistic
                    title="Unavailable"
                    value={filteredPackages.filter(pkg => availableSlots(pkg) === 0).length}
                    prefix={<StopOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          )}


          {/* FILTER ACTIONS */}
          <Card className="packagemanagement-actions">
            <div className="packagemanagement-actions-row">
              <div className="packagemanagement-actions-filters">
                <div className="packagemanagement-actions-field packagemanagement-actions-field--search">
                  <label className="packagemanagement-label">Search</label>
                  <Input
                    maxLength={50}
                    className="packagemanagement-search-input"
                    allowClear
                    prefix={<SearchOutlined />}
                    placeholder="Search package..."
                    value={searchText}
                    onChange={(e) => {
                      const cleanedValue = e.target.value
                        .replace(/[^a-zA-Z0-9\s-]/g, '')
                        .replace(/\s{2,}/g, ' ')
                        .replace(/^\s+/, '');

                      setSearchText(cleanedValue);
                    }}
                  />
                </div>

                <div className="packagemanagement-actions-field">
                  <label className="packagemanagement-label">Package Type</label>
                  <Select
                    className="packagemanagement-select"
                    placeholder="Package Type"
                    allowClear
                    value={filters.packageType}
                    onChange={(value) => setFilters({ ...filters, packageType: value })}
                    options={packageTypeOptions}
                  />
                </div>

                <div className="packagemanagement-actions-field">
                  <label className="packagemanagement-label">Availability</label>
                  <Select
                    className="packagemanagement-select"
                    placeholder="Availability"
                    allowClear
                    value={filters.availability}
                    onChange={(value) => setFilters({ ...filters, availability: value })}
                    options={availabilityOptions}
                  />
                </div>
              </div>

              <div className="packagemanagement-actions-buttons">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  className="packagemanagement-addrecenttour"
                  onClick={() => {
                    getRecentTours();
                    setRecentToursModal(true);
                  }}
                  disabled={showArchived}
                >
                  Add Recent Tours
                </Button>
                <Button
                  className="packagemanagement-addpackage"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => navigate(`${basePath}/packages/add`)}
                  disabled={showArchived}
                >
                  Add Package
                </Button>
                <Button
                  icon={showArchived ? <SolutionOutlined /> : <InboxOutlined />}
                  className="packagemanagement-archive"
                  type="primary"
                  onClick={() => {
                    const nextValue = !showArchived;
                    setShowArchived(nextValue);
                    setSearchText("");
                    setFilters({ packageType: null, availability: null });
                    if (nextValue) {
                      getArchivedPackages();
                    } else {
                      getPackages();
                    }
                  }}
                >
                  {showArchived ? 'Back' : 'Archives'}
                </Button>
              </div>
            </div>
          </Card >


          {/* PACKAGE LIST */}
          <Spin spinning={loading}>
            {filteredPackages.length > 0 ? (
              filteredPackages.map(pkg => (
                <Card key={pkg.packageItem} className="package-card">
                  <div className="package-container">
                    <div className="package-media">
                      {pkg.packageImages && pkg.packageImages.length > 0 ? (
                        <img className="package-image" src={pkg.packageImages[0]} alt={pkg.packageName} />
                      ) : (
                        <div className="package-image-placeholder">No Image</div>
                      )}

                      {Number(pkg.packageDiscountPercent) > 0 && (
                        <div className="package-discount-badge">-{Number(pkg.packageDiscountPercent)}%</div>
                      )}
                    </div>

                    <div className="package-details-actions">
                      <div className="package-details">
                        <div className="package-info">
                          <h3 className="package-name">{pkg.packageName}</h3>
                          <h3 className="package-code">{pkg.packageCode}</h3>
                          {Number(pkg.packageDiscountPercent) > 0 ? (
                            <Tag color="green">{Number(pkg.packageDiscountPercent)}% OFF</Tag>
                          ) : null}
                          <h4 className="package-price">₱{pkg.packagePricePerPax} per Pax</h4>
                        </div>

                        <p className="package-description">{pkg.packageDescription}</p>
                        <h1 className="package-available-slots">Available Slots: {availableSlots(pkg)}</h1>
                      </div>

                      <div className="package-actions-column">
                        <Space orientation="horizontal" size={8} wrap>
                          <Button
                            className="packagemanagement-view-button"
                            type="primary"
                            icon={<EyeOutlined />}
                            onClick={() => showModal(pkg)}
                          >
                            View
                          </Button>

                          <Button
                            className="packagemanagement-edit-button"
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() =>
                              navigate(`${basePath}/packages/edit`, { state: { packageItem: pkg.packageItem } })
                            }
                            disabled={showArchived}
                          >
                            Edit
                          </Button>

                          <Button
                            className="packagemanagement-slotsdiscount-button"
                            type="primary"
                            icon={<CalendarOutlined />}
                            onClick={() => showSlotsModal(pkg)}
                            disabled={showArchived}
                          >
                            Edit Slots
                          </Button>

                          <Button
                            className="packagemanagement-slotsdiscount-button"
                            type="primary"
                            icon={<PercentageOutlined />}
                            onClick={() => showDiscountModal(pkg)}
                            disabled={showArchived}
                          >
                            Add Discount
                          </Button>

                          <Button
                            className="packagemanagement-remove-button"
                            type="primary"
                            icon={<DeleteOutlined />}
                            onClick={() => {
                              setEditingPackage({ key: pkg.packageItem });
                              setIsDeleteModalOpen(true);
                            }}
                            disabled={showArchived}
                          >
                            Archive
                          </Button>

                          {showArchived && (
                            <Button
                              className="packagemanagement-restore-button"
                              type="primary"
                              icon={<CheckCircleOutlined />}
                              onClick={() => {
                                setEditingPackage({ key: pkg.packageItem });
                                setIsRestoreModalOpen(true);
                              }}
                            >
                              Restore
                            </Button>
                          )}
                        </Space>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Empty description={loading ? "No data" : "No Packages"} />
            )}
          </Spin>


          {/* VIEW PACKAGE DETAILS MODAL */}
          < Modal
            title="Package Details"
            closable={{ 'aria-label': 'Custom Close Button' }
            }
            footer={null}
            open={isModalOpen}
            onCancel={() => { handleCancel() }}
            className="package-details-modal"
            width={820}
            centered={true}
          >
            <div className="package-details-modal-header">
              <div>
                <p className="package-details-code">{pkg.packageCode}</p>
                <h2 className="package-details-title">{pkg.packageName}</h2>
              </div>
              <div className="package-details-price">₱{pkg.packagePricePerPax} / pax</div>
            </div>

            <div className="package-details-body">
              <div className="package-details-media">
                {pkg.packageImages && pkg.packageImages.length > 0 ? (
                  <img className="package-details-image" src={pkg.packageImages[0]} alt={pkg.packageName} />
                ) : (
                  <div className="package-details-image-placeholder">No Image</div>
                )}
              </div>

              <div className="package-details-content">
                <p className="package-details-description">{pkg.packageDescription}</p>

                <div className="package-details-stats">
                  <div className="package-details-stat">
                    <span className="package-details-label">Available Slots</span>
                    <span className="package-details-value">{availableSlots(pkg)}</span>
                  </div>
                  <div className="package-details-stat">
                    <span className="package-details-label">Package Type</span>
                    <span className="package-details-value">{pkg.packageType?.toUpperCase()}</span>
                  </div>
                  <div className="package-details-stat">
                    <span className="package-details-label">Duration</span>
                    <span className="package-details-value">{pkg.packageDuration} days</span>
                  </div>
                </div>
              </div>
            </div>
          </Modal >


          {/* EDIT SLOTS MODAL */}
          <Modal
            title="Edit Package Slots"
            footer={null}
            open={isSlotsModalOpen}
            onCancel={handleSlotsCancel}
            width={760}
            className="packages-edit-slots-modal"
            centered={true}
          >
            {slotsPackage ? (
              <div>
                <div style={{ marginBottom: 12, fontSize: 12, color: "#666" }}>
                  Update the slots per date range for this package.
                </div>
                {editableSlots.length === 0 ? (
                  <Empty description="No specific dates" />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 140px",
                        gap: 12,
                        fontWeight: 600,
                        fontSize: 12,
                        color: "#305797",
                        padding: "6px 8px",
                        borderBottom: "1px solid #e8e8e8"
                      }}
                    >
                      <div>Date Range</div>
                      <div>Slots</div>
                    </div>
                    {editableSlots.map((slot, idx) => (
                      <div
                        key={`${slotsPackage.packageItem}-${idx}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 140px",
                          gap: 12,
                          alignItems: "center",
                          padding: "8px",
                          borderRadius: 6,
                          background: idx % 2 === 0 ? "#fafafa" : "#fff",
                          border: "1px solid #f0f0f0"
                        }}
                      >
                        <div>
                          {slot.startdaterange && slot.enddaterange
                            ? `${formatDate(slot.startdaterange)} - ${formatDate(slot.enddaterange)}`
                            : "Date range"}
                        </div>
                        <InputNumber
                          min={0}
                          value={slot.slots || 0}
                          onChange={(value) => {
                            const next = [...editableSlots];
                            next[idx] = { ...next[idx], slots: value || 0 };
                            setEditableSlots(next);
                          }}
                          style={{ width: "100%" }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <Button className='package-slots-cancel-button' type="primary" onClick={handleSlotsCancel} style={{ marginRight: 8 }}>
                    Cancel
                  </Button>
                  <Button className='package-slots-save-button' type="primary" onClick={handleSlotsSave}>
                    Save Slots
                  </Button>
                </div>
              </div>
            ) : null}
          </Modal>

          <Modal
            title="Add Discount"
            footer={null}
            open={isDiscountModalOpen}
            onCancel={handleDiscountCancel}
            width={420}
            className="packages-add-discount-modal"
            centered={true}
          >
            {discountPackage ? (
              <div>
                <div style={{ marginBottom: 12, fontSize: 12, color: "#666" }}>
                  Set the discount percent for this package.
                </div>
                <InputNumber
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(value) => setDiscountPercent(value ?? 0)}
                  formatter={(value) => `${value}%`}
                  parser={(value) => Number(String(value).replace(/[^0-9]/g, ''))}
                  style={{ width: "100%" }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <Button className='package-discount-cancel-button' type="primary" onClick={handleDiscountCancel} style={{ marginRight: 8 }}>
                    Cancel
                  </Button>
                  <Button className='package-discount-save-button' type="primary" onClick={handleDiscountSave}>
                    Save Discount
                  </Button>
                </div>
              </div>
            ) : null}
          </Modal>


          {/* DISCOUNT APPLIED MODAL */}
          <Modal
            open={isDiscountAppliedModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsDiscountAppliedModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Discount Applied!</h1>

              <div>
                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
              </div>

              <p className='modal-text'>The discount has been applied successfully.</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    setIsDiscountAppliedModalOpen(false);
                  }}
                >
                  Continue
                </Button>
              </div>

            </div>
          </Modal>


          {/* SLOTS SAVED MODAL */}
          <Modal
            open={isSlotsSavedModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsSlotsSavedModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Slots Saved!</h1>

              <div>
                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
              </div>

              <p className='modal-text'>The slots have been saved successfully.</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    setIsSlotsSavedModalOpen(false);
                  }}
                >
                  Continue
                </Button>
              </div>

            </div>
          </Modal>


          {/* ARCHIVE PACKAGE CONFIRMATION MODAL */}
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
              <h1 className='modal-heading'>Archive Package?</h1>
              <p className='modal-text'>Are you sure you want to archive this package?</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    handleArchive(editingPackage.key);
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
                    setEditingPackage(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>


          {/* RESTORE PACKAGE CONFIRMATION MODAL */}
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
              <h1 className='modal-heading'>Restore Package?</h1>
              <p className='modal-text'>Are you sure you want to restore this package?</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    handleRestore(editingPackage.key);
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
                    setEditingPackage(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>



          {/* PACKAGE HAS BEEN ARCHIVED MODAL */}
          <Modal
            open={isPackageDeletedModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsPackageDeletedModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Package Archived Successfully!</h1>

              <div>
                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
              </div>

              <p className='modal-text'>The package has been archived.</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    setIsPackageDeletedModalOpen(false);
                  }}
                >
                  Continue
                </Button>
              </div>

            </div>
          </Modal>

          {/* PACKAGE HAS BEEN RESTORED MODAL */}
          <Modal
            open={isPackageRestoredModalOpen}
            closable={{ 'aria-label': 'Custom Close Button' }}
            footer={null}
            centered={true}
            onCancel={() => {
              setIsPackageRestoredModalOpen(false);
            }}
          >
            <div className='modal-container'>
              <h1 className='modal-heading'>Package Restored Successfully!</h1>

              <div>
                <CheckCircleFilled style={{ fontSize: 72, color: '#00bf63' }} />
              </div>

              <p className='modal-text'>The package has been restored.</p>

              <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                <Button
                  type='primary'
                  className='modal-button'
                  onClick={() => {
                    setIsPackageRestoredModalOpen(false);
                  }}
                >
                  Continue
                </Button>
              </div>

            </div>
          </Modal>

          <Modal
            title="Recent Tours"
            open={recentToursModal}
            onCancel={() => setRecentToursModal(false)}
            footer={null}
            width={850}
            centered
          >

            <Upload
              fileList={fileList}
              beforeUpload={(file) => {
                const allowedTypes = ["image/png", "image/jpeg"];

                if (!allowedTypes.includes(file.type)) {
                  notificationApi.error({
                    message: "Invalid file type. Please select a PNG or JPEG image."
                  });
                  return Upload.LIST_IGNORE;
                }

                const isLt5M = file.size / 1024 / 1024 < 5;

                if (!isLt5M) {
                  notificationApi.error({
                    message: "Image must be smaller than 5 MB."
                  });
                  return Upload.LIST_IGNORE;
                }

                setRecentImage(file);
                setFileList([file]);
                return false;
              }}
              onRemove={() => {
                setRecentImage(null);
                setFileList([]);
              }}
              maxCount={1}
              listType="picture"
              accept=".png,.jpg,.jpeg"
            >
              <Button
                type="primary"
                className="recenttours-select-image"
                icon={<UploadOutlined />}
              >
                Select Image
              </Button>
            </Upload>

            <Button
              type="primary"
              style={{ marginTop: 15 }}
              loading={uploadingRecentTour}
              onClick={uploadRecentTour}
              className="recenttours-upload"
            >
              Upload
            </Button>

            <div
              style={{
                marginTop: 30,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 20
              }}
            >
              {recentTours.map((tour) => (
                <Card
                  key={tour._id}
                  cover={
                    <img
                      src={tour.image}
                      alt={tour.title}
                      style={{
                        height: 170,
                        objectFit: "cover"
                      }}
                    />
                  }
                >
                  <h4>{tour.title}</h4>

                  <p>{tour.location}</p>

                  <Button
                    type="primary"
                    className="recenttours-delete"
                    icon={<DeleteOutlined />}
                    onClick={() => deleteRecentTour(tour._id)}
                  >
                    Delete
                  </Button>
                </Card>
              ))}
            </div>
          </Modal>


        </div >
      )}
    </ConfigProvider >
  );
}
