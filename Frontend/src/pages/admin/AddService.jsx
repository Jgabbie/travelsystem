import { useEffect, useState } from "react";
import { Input, Button, Card, Space, message, ConfigProvider, Select } from "antd";
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import apiFetch from "../../config/fetchConfig";
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
        requirements: [{ req: "", desc: "", isReq: "", applicationLink: "" }],
        processSteps: [""],
        reminders: [""],
        additionalRequirements: [{
            customer: "",
            requirements: [{ requirement: "", description: "", isReq: "" }]
        }]
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
            const updated = [...values.requirements, { req: "", desc: "", isReq: "" }];
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
        if (type === "additionalRequirements") {
            const updated = [...values.additionalRequirements, { customer: "", requirements: [{ requirement: "", description: "", isReq: "" }] }];
            valueHandler("additionalRequirements", updated);
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
        if (type === "additionalRequirements") {
            const updated = [...values.additionalRequirements];
            if (subfield) {
                updated[index] = { ...updated[index], [subfield]: value };
            } else {
                updated[index] = value;
            }
            valueHandler("additionalRequirements", updated);
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
        if (type === "additionalRequirements") {
            const updated = values.additionalRequirements.filter((_, i) => i !== index);
            valueHandler("additionalRequirements", updated);
        }
    };

    const addAdditionalRequirementItem = (customerIndex) => {
        const updated = [...values.additionalRequirements];
        const customer = updated[customerIndex];
        const nextRequirements = [...customer.requirements, { requirement: "", description: "", isReq: "" }];
        updated[customerIndex] = { ...customer, requirements: nextRequirements };
        valueHandler("additionalRequirements", updated);
    };

    const updateAdditionalRequirementItem = (customerIndex, reqIndex, field, value) => {
        const updated = [...values.additionalRequirements];
        const customer = updated[customerIndex];
        const nextRequirements = [...customer.requirements];
        nextRequirements[reqIndex] = { ...nextRequirements[reqIndex], [field]: value };
        updated[customerIndex] = { ...customer, requirements: nextRequirements };
        valueHandler("additionalRequirements", updated);
    };

    const removeAdditionalRequirementItem = (customerIndex, reqIndex) => {
        const updated = [...values.additionalRequirements];
        const customer = updated[customerIndex];
        const nextRequirements = customer.requirements.filter((_, i) => i !== reqIndex);
        updated[customerIndex] = { ...customer, requirements: nextRequirements.length ? nextRequirements : [{ requirement: "", description: "", isReq: "" }] };
        valueHandler("additionalRequirements", updated);
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

        const hasAdditionalRequirements = values.additionalRequirements.some((item) =>
            item.customer?.trim?.() || item.requirements.some((req) =>
                Object.values(req).some((value) => value?.trim?.() || value)
            )
        );
        const payload = {
            visaName: values.visaName.trim(),
            visaPrice: Number(values.visaPrice),
            visaDescription: values.description.trim(),
            visaRequirements: values.requirements.map((item) => ({ req: item.req.trim(), desc: item.desc.trim(), isReq: item.isReq, applicationLink: item.applicationLink.trim() })),
            visaProcessSteps: values.processSteps.map((item) => item.trim()),
            visaReminders: values.reminders.map((item) => item.trim()).filter((item) => item.length > 0),
            visaAdditionalRequirements: hasAdditionalRequirements
                ? values.additionalRequirements.map((item) => ({
                    customer: item.customer.trim(),
                    requirements: item.requirements.map((req) => ({
                        requirement: req.requirement.trim(),
                        description: req.description.trim(),
                        isReq: req.isReq
                    }))
                }))
                : undefined
        };

        if (isEdit) {
            await apiFetch.put(`/services/update-service/${id}`, payload);
        } else {
            await apiFetch.post("/services/create-service", payload);
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
                const existing = await apiFetch.get(`/services/get-service/${id}`);

                setValues({
                    visaName: existing.visaName || "",
                    visaPrice: existing.visaPrice || "",
                    description: existing.visaDescription || "",
                    requirements: existing.visaRequirements?.length
                        ? existing.visaRequirements.map((item) => typeof item === "string" ? { req: item, desc: "", isReq: "" } : { req: item.req || "", desc: item.desc || "", isReq: item.isReq || "", applicationLink: item.applicationLink || "" })
                        : [{ req: "", desc: "", isReq: "", applicationLink: "" }],
                    processSteps: existing.visaProcessSteps?.length ? existing.visaProcessSteps : [""],
                    reminders: Array.isArray(existing.visaReminders)
                        ? (existing.visaReminders.length ? existing.visaReminders : [""])
                        : (existing.visaReminders ? [existing.visaReminders] : [""]),
                    additionalRequirements: Array.isArray(existing.visaAdditionalRequirements)
                        ? existing.visaAdditionalRequirements.map((item) => ({
                            customer: item.customer || "",
                            requirements: Array.isArray(item.requirements)
                                ? item.requirements.map((req) => ({
                                    requirement: req.requirement || "",
                                    description: req.description || "",
                                    isReq: req.isReq || ""
                                }))
                                : [{ requirement: "", description: "", isReq: "" }]
                        }))
                        : (existing.visaAdditionalRequirements
                            ? [{
                                customer: existing.visaAdditionalRequirements.customer || "",
                                requirements: Array.isArray(existing.visaAdditionalRequirements.requirements)
                                    ? existing.visaAdditionalRequirements.requirements.map((req) => ({
                                        requirement: req.requirement || "",
                                        description: req.description || "",
                                        isReq: req.isReq || ""
                                    }))
                                    : [{ requirement: "", description: "", isReq: "" }]
                            }]
                            : [{ customer: "", requirements: [{ requirement: "", description: "", isReq: "" }] }])
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
                <Button style={{ marginBottom: 20, width: 120 }} type="primary" className="back-add-service-button backsubmit-button" onClick={() => navigate(`${basePath}/visa-services`)}>
                    <ArrowLeftOutlined />
                    Back
                </Button>
                <h1>{isEdit ? "Edit Visa Service" : "Add Visa Service"}</h1>
                <div className="add-service-container">
                    <Card title="Basic Information" className={errors.visaName || errors.description || errors.visaPrice ? "add-service-card-error" : ""}>
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
                    </Card>

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
                                            <div>
                                                <label className="add-service-input-labels">Requirement Name</label>
                                                <Space>
                                                    <Input
                                                        value={item.req}
                                                        className="add-service-inputs"
                                                        placeholder="Requirement"
                                                        onChange={(event) => updateBullet("requirements", index, event.target.value, "req")}
                                                        style={{ flex: 1, minWidth: 520 }}
                                                    />

                                                    <Button
                                                        type="primary"
                                                        className="delete-add-service-button delete-button"
                                                        onClick={() => removeBullet("requirements", index)}
                                                        icon={<DeleteOutlined />}
                                                    />
                                                </Space>

                                            </div>


                                        </Space>
                                        <label className="add-service-input-labels">Required or Optional</label>
                                        <Select
                                            value={item.isReq}
                                            className="add-service-inputs"
                                            placeholder="Requirement Type"
                                            onChange={(value) => updateBullet("requirements", index, value, "isReq")}
                                            style={{ flex: 1, minWidth: 520 }}
                                            options={[
                                                { value: "Required", label: "Required (For General Applicants)" },
                                                { value: "Optional", label: "Optional" }
                                            ]}
                                        />

                                        <div>
                                            <label className="add-service-input-labels">Requirement Description</label>
                                            <Input.TextArea
                                                value={item.desc}
                                                className="add-service-inputs"
                                                placeholder="Description (optional)"
                                                autoSize={{ minRows: 3, maxRows: 5 }}
                                                maxLength={350}
                                                onChange={(event) => updateBullet("requirements", index, event.target.value, "desc")}
                                                style={{ marginTop: 2 }}
                                            />
                                        </div>


                                        <div>
                                            <label className="add-service-input-labels">Application Link</label>
                                            <Input
                                                value={item.applicationLink}
                                                className="add-service-inputs"
                                                placeholder="ApplicationLink (optional)"
                                                onChange={(event) => updateBullet("requirements", index, event.target.value, "applicationLink")}
                                            />
                                        </div>
                                    </div>
                                ))}
                                <Button
                                    className="add-service-add-button highlighted-button"
                                    type="primary"
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
                                            className="delete-add-service-button delete-button"
                                            type="primary"
                                            onClick={() => removeBullet("processSteps", index)}
                                            icon={<DeleteOutlined />}
                                        />
                                    </Space>
                                ))}
                                <Button
                                    className="add-service-add-button highlighted-button"
                                    type="primary"
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

                    <Card title="Additional Requirements for Specific Applicants" style={{ marginTop: 24, marginBottom: 24 }} className={errors.additionalRequirements ? "add-service-card-error" : ""}>
                        <div style={{ marginTop: 24 }}>
                            <Card
                                size="small"
                                title={null}
                                style={{ padding: 0, border: "none", background: "none" }}
                            >
                                {values.additionalRequirements.map((item, index) => (
                                    <div
                                        key={`additional-req-${index}`}
                                        className="add-service-bullet-row"
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 12,
                                            padding: 12,
                                            border: "1px solid #e6e6e6",
                                            borderRadius: 8,
                                            background: "#fafafa"
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                            <h3 style={{ margin: 0 }}>Applicant</h3>
                                            <Button
                                                className="delete-add-service-button delete-button"
                                                type="primary"
                                                onClick={() => removeBullet("additionalRequirements", index)}
                                                icon={<DeleteOutlined />}
                                            >
                                                Remove Applicant
                                            </Button>
                                        </div>
                                        <div className="add-service-grid">
                                            <div>
                                                <label className="add-service-input-labels">Applicant</label>
                                                <Input
                                                    value={item.customer}
                                                    className="add-service-inputs"
                                                    placeholder="Applicant"
                                                    onChange={(event) => updateBullet("additionalRequirements", index, event.target.value, "customer")}
                                                />
                                            </div>
                                        </div>

                                        {item.requirements.map((reqItem, reqIndex) => (
                                            <div
                                                key={`additional-req-${index}-${reqIndex}`}
                                                className="add-service-bullet-row"
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: 8,
                                                    padding: 10,
                                                    border: "1px dashed #d9d9d9",
                                                    borderRadius: 8,
                                                    background: "#ffffff"
                                                }}
                                            >
                                                <div style={{ fontWeight: 600 }}>Requirement #{reqIndex + 1}</div>
                                                <div className="add-service-grid">
                                                    <div>
                                                        <label className="add-service-input-labels">Requirement</label>
                                                        <Input
                                                            value={reqItem.requirement}
                                                            className="add-service-inputs"
                                                            placeholder="Requirement"
                                                            onChange={(event) => updateAdditionalRequirementItem(index, reqIndex, "requirement", event.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="add-service-input-labels">Required or Optional</label>
                                                        <Select
                                                            value={reqItem.isReq}
                                                            className="add-service-inputs"
                                                            placeholder="Requirement Type"
                                                            onChange={(value) => updateAdditionalRequirementItem(index, reqIndex, "isReq", value)}
                                                            options={[
                                                                { value: "Required", label: "Required" },
                                                                { value: "Optional", label: "Optional" }
                                                            ]}
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="add-service-input-labels">Description (Optional)</label>
                                                    <Input.TextArea
                                                        value={reqItem.description}
                                                        className="add-service-input-textarea"
                                                        autoSize={{ minRows: 3, maxRows: 5 }}
                                                        placeholder="Description (optional)"
                                                        onChange={(event) => updateAdditionalRequirementItem(index, reqIndex, "description", event.target.value)}
                                                    />
                                                </div>

                                                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                                    <Button
                                                        className="delete-add-service-button delete-button"
                                                        type="primary"
                                                        onClick={() => removeAdditionalRequirementItem(index, reqIndex)}
                                                        icon={<DeleteOutlined />}
                                                    >
                                                        Remove Requirement
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}

                                        <Button
                                            className="add-service-add-button highlighted-button"
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            block
                                            onClick={() => addAdditionalRequirementItem(index)}
                                        >
                                            Add Requirement for Applicant
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    className="add-service-add-button highlighted-button"
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    block
                                    onClick={() => addBullet("additionalRequirements")}
                                >
                                    Add Applicant
                                </Button>
                            </Card>
                        </div>
                    </Card>


                    {/* Reminders Bulleted List */}
                    <Card title="Reminders" style={{ marginTop: 24, marginBottom: 24 }} className={errors.reminders ? "add-service-card-error" : ""}>
                        <div style={{ marginTop: 24 }}>
                            <Card size="small" title={null} style={{ padding: 0, border: 'none', background: 'none' }}>
                                {values.reminders.map((item, index) => (
                                    <Space key={`reminder-${index}`} className="add-service-bullet-row" style={{ width: '100%' }}>
                                        <Input
                                            value={item}
                                            className="add-service-inputs"
                                            placeholder="Reminder"
                                            maxLength={300}
                                            onChange={(event) => updateBullet("reminders", index, event.target.value)}
                                            style={{ flex: 1, minWidth: 600, maxWidth: 1100 }}
                                        />
                                        <Button
                                            className="delete-add-service-button delete-button"
                                            type="primary"
                                            onClick={() => removeBullet("reminders", index)}
                                            icon={<DeleteOutlined />}
                                        />
                                    </Space>
                                ))}
                                <Button
                                    className="add-service-add-button highlighted-button"
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    block
                                    onClick={() => addBullet("reminders")}
                                >
                                    Add Reminder
                                </Button>
                            </Card>
                        </div>
                    </Card>

                </div>

                <div className="footer-add-services">
                    <Button style={{ marginRight: 10 }} className="save-service-button backsubmit-button" type="primary" onClick={saveService}>
                        {isEdit ? "Update Service" : "Save Service"}
                    </Button>
                </div>
            </div>
        </ConfigProvider>
    );
}
