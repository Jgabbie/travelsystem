import { Input, Button, Card, Row, Col, Statistic, Empty, Modal, message, Select, ConfigProvider, Dropdown, Space, Spin } from "antd";
import { PlusOutlined, SearchOutlined, AppstoreOutlined, CheckCircleOutlined, StopOutlined, EditOutlined, DeleteOutlined, EyeOutlined, DownOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../../style/admin/packages.css";
import axiosInstance from "../../config/axiosConfig";
import { useAuth } from "../../hooks/useAuth";


export default function PackageManagement() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isEmployee = auth?.role === 'Employee';
  const basePath = isEmployee ? '/employee' : '';

  const [packagesData, setPackagesData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    packageType: null, // "domestic" or "international"
    availability: null, // "available" or "unavailable"
  });

  const [pkg, setPkg] = useState({});

  const packageTypeOptions = [
    { label: "Domestic", value: "domestic" },
    { label: "International", value: "international" },
  ];

  const availabilityOptions = [
    { label: "Available", value: "available" },
    { label: "Unavailable", value: "unavailable" },
  ];


  const showModal = (pkg) => {
    setPkg(pkg);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  }

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
          const response = await axiosInstance.delete(`/package/remove-package/${id}`);
          message.success("Package removed successfully");
          getPackages();
        } catch (error) {
          console.error("Error removing package:", error);
          message.error("Package removed unsuccessfully");
        }
      }
    });
  }

  const getPackages = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/package/get-packages');

      const sortedPackages = response.data.sort((a, b) => {
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
            <Dropdown
              menu={{
                items: [
                  { key: "domestic", label: "Domestic Package" },
                  { key: "international", label: "International Package" },
                ],
                onClick: ({ key }) => {
                  if (key === "domestic") navigate(`${basePath}/packages/add/domestic`);
                  else navigate(`${basePath}/packages/add/international`);
                },
              }}
            >
              <Button type="primary" icon={<PlusOutlined />}>
                Add Package <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div >

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
                      <h4 className="package-price">₱{pkg.packagePricePerPax} per Pax</h4>
                    </div>

                    <p className="package-description">{pkg.packageDescription}</p>
                    <h1 className="package-available-slots">Available Slots: {availableSlots(pkg)}</h1>
                  </div>
                </div>

                <div className="package-actions">
                  <Button
                    className="viewdetails-package-button"
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => showModal(pkg)}
                  />

                  <Button
                    className="edit-package-button"
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={() =>
                      pkg.packageType === "international"
                        ? navigate(`${basePath}/packages/edit/international/${pkg._id}`)
                        : navigate(`${basePath}/packages/edit/domestic/${pkg._id}`)
                    }
                  />

                  <Button
                    className="delete-package-button"
                    type="primary"
                    icon={<DeleteOutlined />}
                    onClick={() => removePackage(pkg._id)}
                  />
                </div>
              </Card>
            ))
          ) : (
            <Empty description={loading ? "No data" : "No Packages"} />
          )}
        </Spin>

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
      </div >
    </ConfigProvider >
  );
}
