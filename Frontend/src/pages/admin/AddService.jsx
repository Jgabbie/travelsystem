import { useEffect, useState } from "react";
import { Input, Button, Card, Space, message, ConfigProvider } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../../config/axiosConfig";
import "../../style/admin/addservice.css";
import { useAuth } from "../../hooks/useAuth";


export default function AddService() {
    const navigate = useNavigate();
    const { auth } = useAuth();
    const isEmployee = auth?.role === 'Employee';
    const basePath = isEmployee ? '/employee' : '';
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
        requirements: [{ req: "", desc: "" }],
        processSteps: [""],
        reminders: [""]
    });

    const validate = (field, value) => {
        if (field === "visaName" && !value.trim()) return "Visa name is required.";
        if (field === "description" && !value.trim()) return "Description is required.";
        if (field === "visaPrice" && !value) return "Visa price is required.";
        if (field === "requirements") {
            if (!value.length) return "At least one requirement is required.";
            if (value.some((item) => !item.req.trim())) return "All requirements must be filled.";
            // Optionally, require description for each requirement
            // if (value.some((item) => !item.desc.trim())) return "All requirement descriptions must be filled.";
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
        setErrors(prev => ({ ...prev, [field]: validate(field, value) }));
    };

    const addBullet = (type) => {
        if (type === "requirements") {
            const updated = [...values.requirements, { req: "", desc: "" }];
            valueHandler("requirements", updated);
        }
        if (type === "processSteps") {
            const updated = [...values.processSteps, ""];
            valueHandler("processSteps", updated);
        }
        if (type === "reminders") {
            const updated = [...values.reminders, ""];
            valueHandler("reminders", updated);
        }
    };

    const updateBullet = (type, index, value, subfield) => {
        if (type === "requirements") {
            const updated = [...values.requirements];
            if (subfield) {
                updated[index] = { ...updated[index], [subfield]: value };
            } else {
                updated[index] = value;
            }
            valueHandler("requirements", updated);
        }
        if (type === "processSteps") {
            const updated = [...values.processSteps];
            updated[index] = value;
            valueHandler("processSteps", updated);
        }
        if (type === "reminders") {
            const updated = [...values.reminders];
            updated[index] = value;
            valueHandler("reminders", updated);
        }
    };

    const removeBullet = (type, index) => {
        if (type === "requirements") {
            const updated = values.requirements.filter((_, i) => i !== index);
            valueHandler("requirements", updated);
        }
        if (type === "processSteps") {
            const updated = values.processSteps.filter((_, i) => i !== index);
            valueHandler("processSteps", updated);
        }
        if (type === "reminders") {
            const updated = values.reminders.filter((_, i) => i !== index);
            valueHandler("reminders", updated);
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
            visaRequirements: values.requirements.map((item) => ({ req: item.req.trim(), desc: item.desc.trim() })),
            visaProcessSteps: values.processSteps.map((item) => item.trim()),
            visaReminders: values.reminders.map((item) => item.trim()).filter((item) => item.length > 0)
        };

        if (isEdit) {
            await axiosInstance.put(`/services/update-service/${id}`, payload);
        } else {
            await axiosInstance.post("/services/create-service", payload);
        }
        navigate(`${basePath}/visa-services`);
    };

    const priceFormat = (value) => {
        return value?.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "";
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
                    requirements: existing.visaRequirements?.length
                        ? existing.visaRequirements.map((item) => typeof item === "string" ? { req: item, desc: "" } : { req: item.req || "", desc: item.desc || "" })
                        : [{ req: "", desc: "" }],
                    processSteps: existing.visaProcessSteps?.length ? existing.visaProcessSteps : [""],
                    reminders: Array.isArray(existing.visaReminders)
                        ? (existing.visaReminders.length ? existing.visaReminders : [""])
                        : (existing.visaReminders ? [existing.visaReminders] : [""])
                });

            } catch (error) {
                message.error("Failed to load service details.");
                navigate(`${basePath}/visa-services`);
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
                        <Button className="back-add-service-button" onClick={() => navigate(`${basePath}/visa-services`)}>
                            Back to Visa Services
                        </Button>
                    </div>

                    <div className="add-service-container">
                        <h2 className="section-headers">Visa Information</h2>

                        <label className="add-service-input-labels">Visa Name</label>
                        <Input
                            status={errors.visaName ? "error" : ""}
                            value={values.visaName}
                            maxLength={40}
                            className={`add-service-inputs${errors.visaName ? " add-service-inputs-error" : ""}`}
                            onChange={(event) => valueHandler("visaName", event.target.value)}
                            onKeyDown={(event) => {
                                const newValue = event.key.length === 1
                                    ? values.visaName + event.key
                                    : event.key === "Backspace"
                                        ? values.visaName.slice(0, -1)
                                        : values.visaName;
                                setErrors(prev => ({ ...prev, visaName: validate("visaName", newValue) }));
                            }}
                        />
                        <p className="add-service-error-message">{errors.visaName}</p>


                        <label className="add-service-input-labels">Visa Service Price</label>
                        <Input
                            status={errors.visaPrice ? "error" : ""}
                            value={values.visaPrice}
                            maxLength={9}
                            className={`add-service-inputs${errors.visaPrice ? " add-service-inputs-error" : ""}`}
                            onChange={(e) => {
                                const price = e.target.value.replace(/\s/g, "");
                                valueHandler("visaPrice", price)
                            }}
                            onKeyDown={(e) => {
                                if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                    e.preventDefault()
                                }
                            }}
                            addonBefore={"₱"}
                        />
                        <p className="add-service-error-message">{errors.visaPrice}</p>

                        <div>
                            <label className="add-service-input-labels">Description</label>
                            <Input.TextArea
                                value={values.description}
                                maxLength={300}
                                className={`add-service-input-textarea${errors.description ? " add-service-input-textarea-error" : ""}`}
                                autoSize={{ minRows: 4, maxRows: 7 }}
                                onChange={(event) => valueHandler("description", event.target.value)}
                                onKeyDown={(event) => {
                                    const newValue = event.key.length === 1
                                        ? values.description + event.key
                                        : event.key === "Backspace"
                                            ? values.description.slice(0, -1)
                                            : values.description;
                                    setErrors(prev => ({ ...prev, description: validate("description", newValue) }));
                                }}
                            />
                            <p className="add-service-error-message">{errors.description}</p>
                        </div>


                        <h2 className="section-headers">Requirements and Process</h2>

                        <div className="add-service-grid">
                            <div>
                                <Card
                                    size="small"
                                    title="Requirements"
                                    className={errors.requirements ? "add-service-card-error" : ""}
                                >
                                    {values.requirements.map((item, index) => (
                                        <div key={`req-${index}`} className="add-service-bullet-row" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <Space style={{ width: '100%' }}>
                                                <Input
                                                    value={item.req}
                                                    className="add-service-inputs"
                                                    placeholder="Requirement"
                                                    onChange={(event) => updateBullet("requirements", index, event.target.value, "req")}
                                                    style={{ flex: 1 }}
                                                />
                                                <Button
                                                    className="delete-add-service-button"
                                                    danger
                                                    onClick={() => removeBullet("requirements", index)}
                                                    icon={<DeleteOutlined />}
                                                />
                                            </Space>
                                            <Input.TextArea
                                                value={item.desc}
                                                className="add-service-inputs"
                                                placeholder="Description (optional)"
                                                autoSize={{ minRows: 1, maxRows: 3 }}
                                                onChange={(event) => updateBullet("requirements", index, event.target.value, "desc")}
                                                style={{ marginTop: 2 }}
                                            />
                                        </div>
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
                            </div>

                            <div>
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

                        {/* Reminders Bulleted List */}
                        <div style={{ marginTop: 24 }}>
                            <label className="add-service-input-labels">Reminders</label>
                            <Card size="small" title={null} style={{ padding: 0, border: 'none', background: 'none' }}>
                                {values.reminders.map((item, index) => (
                                    <Space key={`reminder-${index}`} className="add-service-bullet-row" style={{ width: '100%' }}>
                                        <Input
                                            value={item}
                                            className="add-service-inputs"
                                            placeholder="Reminder"
                                            maxLength={150}
                                            onChange={(event) => updateBullet("reminders", index, event.target.value)}
                                            style={{ flex: 1, minWidth: 600, maxWidth: 1100 }}
                                        />
                                        <Button
                                            className="delete-add-service-button"
                                            danger
                                            onClick={() => removeBullet("reminders", index)}
                                            icon={<DeleteOutlined />}
                                        />
                                    </Space>
                                ))}
                                <Button
                                    className="add-service-add-button"
                                    type="dashed"
                                    icon={<PlusOutlined />}
                                    block
                                    onClick={() => addBullet("reminders")}
                                >
                                    Add Reminder
                                </Button>
                            </Card>
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
