import { useEffect, useState } from "react";
import { Input, Button, Card, Select, Space, message, ConfigProvider } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../config/axiosConfig";
import "../../style/admin/addservice.css";


export default function AddService() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    const [errors, setErrors] = useState({
        visaName: "",
        description: "",
        requirements: "",
        processSteps: "",
        visaPrice: ""
    });

    const [values, setValues] = useState({
        visaName: "",
        description: "",
        visaPrice: "",
        requirements: [""],
        processSteps: [""],
    });

    const validate = (field, value) => {
        if (field === "visaName" && !value.trim()) return "Visa name is required.";
        if (field === "description" && !value.trim()) return "Description is required.";
        if (field === "visaPrice" && !value) return "Visa price is required.";
        if (field === "requirements") {
            if (!value.length) return "At least one requirement is required.";
            if (value.some((item) => !item.trim())) return "All requirements must be filled.";
        }
        if (field === "processSteps") {
            if (!value.length) return "At least one process step is required.";
            if (value.some((item) => !item.trim())) return "All process steps must be filled.";
        }
        return "";
    };

    const validateAll = (updatedValues) => {
        setErrors({
            visaName: validate("visaName", updatedValues.visaName),
            visaPrice: validate("visaPrice", updatedValues.visaPrice),
            description: validate("description", updatedValues.description),
            requirements: validate("requirements", updatedValues.requirements),
            processSteps: validate("processSteps", updatedValues.processSteps)
        });
    };

    const valueHandler = (field, value) => {
        setValues(prev => ({ ...prev, [field]: value }));
    };

    const addBullet = (type) => {
        if (type === "requirements") valueHandler("requirements", [...values.requirements, ""]);
        if (type === "processSteps") valueHandler("processSteps", [...values.processSteps, ""]);
    };

    const updateBullet = (type, index, value) => {
        if (type === "requirements") {
            const updated = [...values.requirements];
            updated[index] = value;
            valueHandler("requirements", updated);
        }
        if (type === "processSteps") {
            const updated = [...values.processSteps];
            updated[index] = value;
            valueHandler("processSteps", updated);
        }
    };

    const removeBullet = (type, index) => {
        if (type === "requirements") {
            valueHandler("requirements", values.requirements.filter((_, i) => i !== index));
        }
        if (type === "processSteps") {
            valueHandler("processSteps", values.processSteps.filter((_, i) => i !== index));
        }
    };

    const saveService = async () => {
        const newErrors = {
            visaName: validate("visaName", values.visaName),
            visaPrice: validate("visaPrice", values.visaPrice),
            description: validate("description", values.description),
            requirements: validate("requirements", values.requirements),
            processSteps: validate("processSteps", values.processSteps)
        };

        const hasError = Object.values(newErrors).some(Boolean);
        setErrors(newErrors);

        if (hasError) {
            message.error("Please fill all required fields correctly.");
            return;
        }

        const payload = {
            visaName: values.visaName.trim(),
            visaPrice: Number(values.visaPrice),
            visaDescription: values.description.trim(),
            visaRequirements: values.requirements.map((item) => item.trim()),
            visaProcessSteps: values.processSteps.map((item) => item.trim()),
        };

        if (isEdit) {
            await axiosInstance.put(`/services/get-service/${id}`, payload);
        } else {
            await axiosInstance.post("/services/create-service", payload);
        }
        navigate("/visa-services");
    };

    useEffect(() => {
        if (!isEdit) return;

        const getService = async () => {
            try {
                const response = await axiosInstance.get(`/services/get-service/${id}`);
                const existing = response.data;

                setValues({
                    visaName: existing.visaName || "",
                    visaPrice: existing.visaPrice || "",
                    description: existing.visaDescription || "",
                    requirements: existing.visaRequirements?.length ? existing.visaRequirements : [""],
                    processSteps: existing.visaProcessSteps?.length ? existing.visaProcessSteps : [""],
                });

            } catch (error) {
                message.error("Failed to load service details.");
                navigate("/visa-services");
            }
        }

        getService();
    }, [id, isEdit]);


    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            <div>
                <Card className="add-service-form">
                    <div className="add-service-header-container">
                        <h1>{isEdit ? "Edit Visa Service" : "Add Visa Service"}</h1>
                        <Button className="back-add-service-button" onClick={() => navigate("/visa-services")}>
                            Back to Visa Services
                        </Button>
                    </div>

                    <div className="add-service-container">
                        <h2 className="section-headers">Visa Information</h2>

                        <label className="add-service-input-labels">Visa Name</label>
                        <Input
                            value={values.visaName}
                            className={`add-service-inputs${errors.visaName ? " add-service-inputs-error" : ""}`}
                            onChange={(event) => valueHandler("visaName", event.target.value)}
                        />
                        <p className="add-service-error-message">{errors.visaName}</p>

                        <label className="add-service-input-labels">Visa Service Price</label>
                        <Input
                            value={values.visaPrice}
                            className={`add-service-inputs${errors.visaPrice ? " add-service-inputs-error" : ""}`}
                            onChange={(event) => valueHandler("visaPrice", event.target.value)}
                        />
                        <p className="add-service-error-message">{errors.visaPrice}</p>

                        <label className="add-service-input-labels">Description</label>
                        <Input.TextArea
                            value={values.description}
                            className={`add-service-input-textarea${errors.description ? " add-service-input-textarea-error" : ""}`}
                            autoSize={{ minRows: 4, maxRows: 7 }}
                            onChange={(event) => valueHandler("description", event.target.value)}
                        />
                        <p className="add-service-error-message">{errors.description}</p>

                        <h2 className="section-headers">Requirements and Process</h2>
                        <div className="add-service-grid">
                            <Card
                                size="small"
                                title="Requirements"
                                className={errors.requirements ? "add-service-card-error" : ""}
                            >
                                {values.requirements.map((item, index) => (
                                    <Space key={`req-${index}`} className="add-service-bullet-row">
                                        <Input
                                            value={item}
                                            className="add-service-inputs"
                                            placeholder="Requirement"
                                            onChange={(event) => updateBullet("requirements", index, event.target.value)}
                                        />
                                        <Button
                                            className="delete-add-service-button"
                                            danger
                                            onClick={() => removeBullet("requirements", index)}
                                            icon={<DeleteOutlined />}
                                        />
                                    </Space>
                                ))}
                                <Button
                                    className="add-service-add-button"
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    block
                                    onClick={() => addBullet("requirements")}
                                >
                                    Add Requirement
                                </Button>
                            </Card>
                            <p className="add-service-error-message">{errors.requirements}</p>

                            <Card
                                size="small"
                                title="Process"
                                className={errors.processSteps ? "add-service-card-error" : ""}
                            >
                                {values.processSteps.map((item, index) => (
                                    <Space key={`step-${index}`} className="add-service-bullet-row">
                                        <Input
                                            value={item}
                                            className="add-service-inputs"
                                            placeholder="Process step"
                                            onChange={(event) => updateBullet("processSteps", index, event.target.value)}
                                        />
                                        <Button
                                            className="delete-add-service-button"
                                            danger
                                            onClick={() => removeBullet("processSteps", index)}
                                            icon={<DeleteOutlined />}
                                        />
                                    </Space>
                                ))}
                                <Button
                                    className="add-service-add-button"
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    block
                                    onClick={() => addBullet("processSteps")}
                                >
                                    Add Process Step
                                </Button>
                            </Card>
                            <p className="add-service-error-message">{errors.processSteps}</p>
                        </div>
                    </div>

                    <div className="footer-add-services">
                        <Button className="save-service-button" type="primary" onClick={saveService}>
                            {isEdit ? "Update Service" : "Save Service"}
                        </Button>
                    </div>
                </Card>
            </div>
        </ConfigProvider>
    );
}
