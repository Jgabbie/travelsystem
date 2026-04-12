import { Input, Button, Card, Row, Col, Statistic, Empty, Modal, message, Select, ConfigProvider, Dropdown, Space, Spin, InputNumber, Tag } from "antd";
import { PlusOutlined, SearchOutlined, AppstoreOutlined, CheckCircleOutlined, StopOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownOutlined, CalendarOutlined, PercentageOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import "../../style/admin/packages.css";
import apiFetch from "../../config/fetchConfig";
import { useAuth } from "../../hooks/useAuth";


export default function PackageManagement() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isEmployee = auth?.role === 'Employee';
  const basePath = isEmployee ? '/employee' : '';

  const [packagesData, setPackagesData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSlotsModalOpen, setIsSlotsModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

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

  //SLOTS ----------------------------------------------------------
  const showModal = (pkg) => {
    setPkg(pkg);
    setIsModalOpen(true);
  };

  const showSlotsModal = (pkg) => {
    setSlotsPackage(pkg);
    setEditableSlots(
      (pkg.packageSpecificDate || []).map((item) => ({ ...item }))
    );
    setIsSlotsModalOpen(true);
  };

  const showDiscountModal = (pkg) => {
    setDiscountPackage(pkg);
    setDiscountPercent(Number(pkg.packageDiscountPercent) || 0);
    setIsDiscountModalOpen(true);
  };

  const formatDate = (date) => {
    return date && dayjs(date).isValid()
      ? dayjs(date).format("MMM D, YYYY")
      : "Invalid Date";
  };

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

  const handleSlotsSave = async () => {
    try {

      const slotsPayload = {
        packageId: slotsPackage._id,
        dateRanges: editableSlots.map((slot) => ({
          startdaterange: slot.startdaterange,
          enddaterange: slot.enddaterange,
          extrarate: slot.extrarate,
          slots: Number(slot.slots) || 0
        }))
      };

      await apiFetch.put('/package/update-slots', slotsPayload);

    } catch (error) {
      console.error("Error updating slots:", error);
      message.error("Failed to update slots.");
      return;
    }

    if (!slotsPackage) return;
    setPackagesData((prev) =>
      prev.map((p) =>
        p._id === slotsPackage._id
          ? { ...p, packageSpecificDate: editableSlots }
          : p
      )
    );

    message.success("Slots updated successfully.");
    handleSlotsCancel();
  };

  const handleDiscountSave = async () => {
    if (!discountPackage) return;

    try {
      await apiFetch.put('/package/update-discount', {
        packageId: discountPackage._id,
        discountPercent: Number(discountPercent) || 0
      });
    } catch (error) {
      console.error("Error updating discount:", error);
      message.error("Failed to update discount.");
      return;
    }

    setPackagesData((prev) =>
      prev.map((p) =>
        p._id === discountPackage._id
          ? { ...p, packageDiscountPercent: Number(discountPercent) || 0 }
          : p
      )
    );

    message.success("Discount updated successfully.");
    handleDiscountCancel();
  };


  //SHOW PACKAGE DETAILS MODAL ----------------------------------------------------------
  const handleCancel = () => {
    setIsModalOpen(false);
  }


  //REMOVE PACKAGE ----------------------------------------------------------
  const removePackage = async (id) => {
    Modal.confirm({
      className: "logout-confirm-modal",
      icon: null,
      title: (
        <div className="logout-confirm-title" style={{ textAlign: "center" }}>
          Confirm Delete
        </div>
      ),
      content: (
        <div className="logout-confirm-content" style={{ textAlign: "center" }}>
          <p className="logout-confirm-text">Are you sure you want to delete this package?</p>
        </div>
      ),
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { className: "logout-confirm-btn" },
      cancelButtonProps: { className: "logout-cancel-btn" },
      onOk: async () => {
        try {
          await apiFetch.delete(`/package/remove-package/${id}`);
          message.success("Package removed successfully");
          getPackages();
        } catch (error) {
          console.error("Error removing package:", error);
          message.error("Package removed unsuccessfully");
        }
      }
    });
  }

  // GET PACKAGES ----------------------------------------------------------
  const getPackages = async () => {
    setLoading(true);
    try {
      const response = await apiFetch.get('/package/get-packages');

      const sortedPackages = response.sort((a, b) => {
        // Sort by creation date if you have it
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        // Fallback: sort by ObjectId timestamp
        return b._id.localeCompare(a._id); // b first for newest
      });

      setPackagesData(sortedPackages);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  }

  //GET TOTAL SLOTS FOR A PACKAGE ----------------------------------------------------------
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


  // FILTERING ----------------------------------------------------------
  const filteredPackages = packagesData.filter((pkg) => {
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

  const totalPackages = packagesData.length;



  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#305797"
        }
      }}
    >
      <div>
        <h1 className="page-header">Package Management</h1>

        {/* STATISTICS */}
        <Row gutter={16} style={{ marginBottom: 20 }}>
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


        {/* FILTER ACTIONS */}
        <div className="package-actions">
          <Input className="search-input" prefix={<SearchOutlined />} placeholder="Search package..." onChange={(e) => setSearchText(e.target.value)} />

          <Select
            className="package-date-filter"
            placeholder="Package Type"
            allowClear
            style={{ width: 150 }}
            value={filters.packageType}
            onChange={(value) => setFilters({ ...filters, packageType: value })}
            options={packageTypeOptions}
          />

          <Select
            className="package-date-filter"
            placeholder="Availability"
            allowClear
            style={{ width: 150 }}
            value={filters.availability}
            onChange={(value) => setFilters({ ...filters, availability: value })}
            options={availabilityOptions}
          />

          <Space style={{ marginLeft: 'auto' }}>

            <Button className="packagemanagement-addpackage" type="primary" icon={<PlusOutlined />} onClick={() => navigate(`${basePath}/packages/add`)}>
              Add Package
            </Button>
          </Space>
        </div >



        {/* PACKAGE LIST */}
        <Spin spinning={loading}>
          {filteredPackages.length > 0 ? (
            filteredPackages.map(pkg => (
              <Card key={pkg._id} className="package-card">
                <div className="package-container">
                  <div className="package-media">
                    {pkg.images && pkg.images.length > 0 ? (
                      <img className="package-image" src={pkg.images[0]} alt={pkg.packageName} />
                    ) : (
                      <div className="package-image-placeholder">No Image</div>
                    )}
                  </div>

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
                </div>

                <div className="package-actions">
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
                      navigate(`${basePath}/packages/edit/${pkg._id}`)
                    }
                  >
                    Edit
                  </Button>

                  <Button
                    className="packagemanagement-slotsdiscount-button"
                    type="primary"
                    icon={<CalendarOutlined />}
                    onClick={() => showSlotsModal(pkg)}
                  >
                    Edit Slots
                  </Button>

                  <Button
                    className="packagemanagement-slotsdiscount-button"
                    type="primary"
                    icon={<PercentageOutlined />}
                    onClick={() => showDiscountModal(pkg)}
                  >
                    Add Discount
                  </Button>

                  <Button
                    className="packagemanagement-remove-button"
                    type="primary"
                    icon={<DeleteOutlined />}
                    onClick={() => removePackage(pkg._id)}
                  >
                    Delete
                  </Button>
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
              {pkg.images && pkg.images.length > 0 ? (
                <img className="package-details-image" src={pkg.images[0]} alt={pkg.packageName} />
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
                      key={`${slotsPackage._id}-${idx}`}
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
                <Button onClick={handleSlotsCancel} style={{ marginRight: 8 }}>
                  Cancel
                </Button>
                <Button type="primary" onClick={handleSlotsSave}>
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
                <Button onClick={handleDiscountCancel} style={{ marginRight: 8 }}>
                  Cancel
                </Button>
                <Button type="primary" onClick={handleDiscountSave}>
                  Save Discount
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      </div >
    </ConfigProvider >
  );
}
