import { Input, Button, Card, Row, Col, Statistic, Empty, Modal, message, ConfigProvider, Space } from "antd";
import { PlusOutlined, SearchOutlined, AppstoreOutlined, EditOutlined, DeleteOutlined, EyeOutlined, CheckCircleFilled } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/visaservices.css";
import { useAuth } from "../../hooks/useAuth";

export default function VisaServices() {
    const navigate = useNavigate();
    const { auth } = useAuth();
    const isEmployee = auth?.role === 'Employee';
    const basePath = isEmployee ? '/employee' : '';

    const [servicesData, setServicesData] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [selectedService, setSelectedService] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isServiceDeletedModalOpen, setIsServiceDeletedModalOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState(null);

    const formatListItem = (item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
            return item.req || item.desc || "";
        }
        return "";
    };

    useEffect(() => {
        const getServices = async () => {
            try {
                const response = await apiFetch.get("/services/services");
                // Sort by createdAt descending if available, else by _id
                const sorted = [...response].sort((a, b) => {
                    if (a.createdAt && b.createdAt) {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                    }
                    // fallback: sort by _id (MongoDB ObjectId has timestamp)
                    return (b._id > a._id ? 1 : -1);
                });
                setServicesData(sorted);
            } catch (error) {
                console.error("Failed to fetch visa services:", error);
            }
        };
        getServices();
    }, []);

    const showModal = (service) => {
        setSelectedService(service);
        setIsModalOpen(true);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    const handleDelete = async (id) => {
        try {
            await apiFetch.delete(`/services/delete-service/${id}`);
            setServicesData(prevData => prevData.filter(service => service._id !== id));
            message.success("Visa service deleted successfully");
            setIsServiceDeletedModalOpen(true);
            setServiceToDelete(null);
        } catch (error) {
            console.error("Failed to delete visa service:", error);
            message.error("Failed to delete visa service");
        }
    };


    const filteredServices = servicesData.filter((service) => {
        const query = searchText.trim().toLowerCase();
        const matchesSearch =
            !query ||
            service.visaName?.toLowerCase().includes(query) ||
            service.visaDescription?.toLowerCase().includes(query);

        return matchesSearch;
    });

    const totalServices = servicesData.length;

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div>
                <h1 className="page-header">Visa Services</h1>

                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={8}>
                        <Card className="visaservice-management-card">
                            <Statistic
                                title="Total Visa Services"
                                value={totalServices}
                                prefix={<AppstoreOutlined />}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={8}>
                        <Card className="visaservice-management-card">
                            <Statistic
                                title="Tourist Visas"
                                value={servicesData.filter(service => service.visaType === "Tourist").length}
                            />
                        </Card>
                    </Col>

                    <Col xs={24} sm={8}>
                        <Card className="visaservice-management-card">
                            <Statistic
                                title="Express Processing"
                                value={servicesData.filter(service => service.processing === "Express").length}
                            />
                        </Card>
                    </Col>
                </Row>

                <div className="package-actions">
                    <Input
                        className="search-input"
                        prefix={<SearchOutlined />}
                        placeholder="Search service..."
                        onChange={(event) => setSearchText(event.target.value)}
                    />

                    <Space style={{ marginLeft: 'auto' }}>
                        <Button
                            className="visaservices-add-button"
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => navigate(`${basePath}/visa-services/add`)}
                        >
                            Add Service
                        </Button>
                    </Space>
                </div>

                {filteredServices.length > 0 ? filteredServices.map(service => (
                    <Card key={service._id} className="package-card">
                        <div className="package-container">
                            <div className="package-details">
                                <div className="package-info">
                                    <h3 className="package-name">{service.visaName}</h3>
                                    <h6 className="package-price">₱{service.visaPrice?.toLocaleString() || '--'}</h6>
                                </div>
                                <p className="package-description">{service.visaDescription}</p>
                            </div>
                        </div>

                        <div className="package-actions">
                            <Button
                                className="visaservices-view-button"
                                type="primary"
                                icon={<EyeOutlined />}
                                onClick={() => showModal(service)}
                            >
                                View
                            </Button>
                            <Button
                                className="visaservices-edit-button"
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={() => navigate(`${basePath}/visa-services/edit`, { state: { serviceId: service._id } })}
                            >
                                Edit
                            </Button>
                            <Button
                                className="visaservices-remove-button"
                                type="primary"
                                icon={<DeleteOutlined />}
                                onClick={() => {
                                    setServiceToDelete(service._id);
                                    setIsDeleteModalOpen(true);
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </Card>
                )) : <Empty description="No Visa Services" />}

                <Modal
                    title="Visa Service Details"
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    footer={null}
                    open={isModalOpen}
                    onCancel={() => { handleCancel() }}
                    className="package-details-modal"
                    width={820}
                    style={{ top: 40 }}
                >
                    {selectedService && (
                        <div>
                            <div className="package-details-modal-header">
                                <div>
                                    <p className="package-details-code">{selectedService.visaType}</p>
                                    <h2 className="package-details-title">{selectedService.visaName}</h2>
                                </div>
                                <div className="visa-details-meta">
                                    <div className="package-details-price">{selectedService.processing}</div>
                                    <div className="visa-details-price">{selectedService.visaPrice || "--"}</div>
                                </div>
                            </div>

                            <div className="package-details-body">
                                <div className="package-details-content">
                                    <p className="package-details-description">{selectedService.visaDescription}</p>

                                    <div className="package-details-stats">
                                        <div className="package-details-stat">
                                            <span className="package-details-label">Requirements</span>
                                            <span className="package-details-value">
                                                {selectedService.visaRequirements?.length || 0}
                                            </span>
                                        </div>
                                        <div className="package-details-stat">
                                            <span className="package-details-label">Process Steps</span>
                                            <span className="package-details-value">
                                                {selectedService.visaProcessSteps?.length || 0}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="visa-details-section">
                                        <h4>Requirements</h4>
                                        <ul className="visa-details-list">
                                            {selectedService.visaRequirements?.map((item, index) => (
                                                <li key={`req-${index}`}>{formatListItem(item)}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="visa-details-section">
                                        <h4>Process</h4>
                                        <ol className="visa-details-list">
                                            {selectedService.visaProcessSteps?.map((item, index) => (
                                                <li key={`step-${index}`}>{formatListItem(item)}</li>
                                            ))}
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </Modal>



                {/* DELETE SERVICE CONFIRMATION MODAL */}
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
                        <h1 className='signup-success-heading'>Delete Service?</h1>
                        <p className='signup-success-text'>Are you sure you want to delete this service?</p>

                        <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                            <Button
                                type='primary'
                                className='logout-confirm-btn'
                                onClick={() => {
                                    console.log("Deleting service with ID:", serviceToDelete);
                                    handleDelete(serviceToDelete);
                                    setIsDeleteModalOpen(false);
                                }}
                            >
                                Accept
                            </Button>
                            <Button
                                type='primary'
                                className='logout-cancel-btn'
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Modal>

                {/* SERVICE HAS BEEN DELETED MODAL */}
                <Modal
                    open={isServiceDeletedModalOpen}
                    className='signup-success-modal'
                    closable={{ 'aria-label': 'Custom Close Button' }}
                    footer={null}
                    style={{ top: 220 }}
                    onCancel={() => {
                        setIsServiceDeletedModalOpen(false);
                    }}
                >
                    <div className='signup-success-container'>
                        <h1 className='signup-success-heading'>Service Deleted!</h1>

                        <div>
                            <CheckCircleFilled style={{ fontSize: 72, color: '#52c41a' }} />
                        </div>

                        <p className='signup-success-text'>The service has been deleted.</p>

                        <div style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end", marginTop: "5px" }}>

                            <Button
                                type='primary'
                                className='logout-confirm-btn'
                                onClick={() => {
                                    setIsServiceDeletedModalOpen(false);
                                }}
                            >
                                Continue
                            </Button>
                        </div>

                    </div>
                </Modal>










            </div>
        </ConfigProvider>
    );
}
