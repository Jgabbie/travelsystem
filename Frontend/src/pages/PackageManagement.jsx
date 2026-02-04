import { Input, Button, Card, Row, Col, Statistic, Empty, Modal } from "antd";
import { PlusOutlined, SearchOutlined, AppstoreOutlined, CheckCircleOutlined, StopOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import "../style/packages.css";
import { useEffect, useState } from "react";
import axiosInstance from "../config/axiosConfig";

export default function PackageManagement() {
  const navigate = useNavigate();

  const [packagesData, setPackagesData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pkg, setPkg] = useState({});

  const showModal = (pkg) => {
    setPkg(pkg);
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
  }

  const removePackage = async (id) => {
    try {
      const response = await axiosInstance.delete(`/package/remove-package/${id}`);
      console.log("Package removed:", response.data);
      getPackages();
    } catch (error) {
      console.error("Error removing package:", error);
    }
  }

  const getPackages = async () => {
    try {
      const response = await axiosInstance.get('/package/get-packages');
      setPackagesData(response.data);
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
  }

  useEffect(() => {
    getPackages()
  }, []);

  const totalPackages = packagesData.length;

  //check if packagesData has data
  console.log("Fetched Packages Data:", packagesData);

  return (
    <div>
      <h1 className="page-header">Package Management</h1>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Packages"
              value={totalPackages}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Available"
              value="0"
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Unavailable"
              value="0"
              prefix={<StopOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <div className="package-toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Search package..." />
        <Button
          className="add-package-button"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/packages/add")}
        >
          Add Package
        </Button>
      </div>

      {packagesData.length > 0 ? packagesData.map(pkg => (
        <Card key={pkg._id} className="package-card">
          <div className="package-container">
            <div className="package-info">
              <h3 className="package-name">{pkg.packageName}</h3>
              <h3 className="package-code">{pkg.packageCode}</h3>
              <h4 className="package-price">₱{pkg.packagePricePerPax} per Pax</h4>
            </div>

            <p className="package-description">{pkg.packageDescription}</p>
            <h1 className="package-available-slots">Available Slots: {pkg.packageAvailableSlots}</h1>

          </div>

          <div className="package-actions">
            <Button className="viewdetails-package-button" type="primary" onClick={() => { showModal(pkg); }}>
              View Details
            </Button>

            <Button className="edit-package-button" type="primary" icon={<EditOutlined />} onClick={() => navigate(`/packages/edit/${pkg._id}`)} />
            <Button className="delete-package-button" danger icon={<DeleteOutlined />} onClick={() => removePackage(pkg._id)} />
          </div>
        </Card>
      ))

        :

        <Empty description="No Packages" />
      }

      <Modal
        title="Package Details"
        closable={{ 'aria-label': 'Custom Close Button' }}
        footer={null}
        open={isModalOpen}
        onCancel={() => { handleCancel() }}
      >
        <h1>{pkg.packageName}</h1>
        <h2>{pkg.packageCode}</h2>

        <p>{pkg.packageDescription}</p>
        <p>Price per Pax: ₱{pkg.packagePricePerPax}</p>
        <p>Available Slots: {pkg.packageAvailableSlots}</p>
        <p>Package Type: {pkg.packageType?.toUpperCase()}</p>
        <p>Duration: {pkg.packageDuration} days</p>
      </Modal>


      <Modal>

      </Modal>
    </div>
  );
}
