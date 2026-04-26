import { useEffect, useState } from "react";
import { Input, Button, Card, Space, message, ConfigProvider, Select } from "antd";
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/addservice.css";
import { useAuth } from "../../hooks/useAuth";


export default function AddService() {
    const navigate = useNavigate();
    const { auth } = useAuth();
    const isEmployee = auth?.role === 'Employee';
    const basePath = isEmployee ? '/employee' : '';
    const location = useLocation();
    const { serviceId } = location.state || {};
    const isEdit = Boolean(serviceId);

    console.log("Service ID from location state:", serviceId);

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

        // if (field === "processSteps") {
        //     if (!value.length) return "At least one process step is required.";
        //     if (value.some((item) => !String(item?.title || "").trim())) return "All process steps must be filled.";
        // }
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
        // if (type === "processSteps") {
        //     const updated = [...values.processSteps, { title: "", description: "" }];
        //     valueHandler("processSteps", updated);
        // }
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
        // if (type === "processSteps") {
        //     const updated = [...values.processSteps];
        //     updated[index] = { ...updated[index], [subfield || "title"]: value };
        //     valueHandler("processSteps", updated);
        // }
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
            visaRequirements: values.requirements.map((item) => ({ req: item.req.trim(), desc: item.desc.trim(), isReq: item.isReq, applicationLink: item.applicationLink.trim() })),
            // visaProcessSteps: values.processSteps.map([]),
            visaProcessSteps: values.processSteps.map((step) => step.trim()),
            visaReminders: values.reminders.map((item) => item.trim()).filter((item) => item.length > 0),
        };

        if (isEdit) {
            await apiFetch.put(`/services/update-service/${serviceId}`, payload);
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
                const existing = await apiFetch.get(`/services/get-service/${serviceId}`);

                setValues({
                    visaName: existing.visaName || "",
                    visaPrice: existing.visaPrice || "",
                    description: existing.visaDescription || "",
                    requirements: existing.visaRequirements?.length
                        ? existing.visaRequirements.map((item) => typeof item === "string" ? { req: item, desc: "", isReq: "" } : { req: item.req || "", desc: item.desc || "", isReq: item.isReq || "", applicationLink: item.applicationLink || "" })
                        : [{ req: "", desc: "", isReq: "", applicationLink: "" }],
                    // processSteps: existing.visaProcessSteps?.length
                    //     ? existing.visaProcessSteps.map((step) =>
                    //         typeof step === "string"
                    //             ? { title: step, description: "" }
                    //             : { title: step?.title || "", description: step?.description || "" }
                    //     )
                    //     : [{ title: "", description: "" }],
                    processSteps: existing.visaProcessSteps?.length
                        ? existing.visaProcessSteps.map((step) =>
                            typeof step === "string"
                                ? step
                                : step?.title || ""
                        )
                        : [""],
                    reminders: Array.isArray(existing.visaReminders)
                        ? (existing.visaReminders.length ? existing.visaReminders : [""])
                        : (existing.visaReminders ? [existing.visaReminders] : [""]),
                });

            } catch (error) {
                message.error("Failed to load service details.");
                navigate(`${basePath}/visa-services`);
            }
        }

        getService();
    }, [serviceId, isEdit]);


    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >

            <div>
                <Button
                    style={{ marginBottom: 20, width: 120 }}
                    type="primary"
                    className="back-add-service-button backsubmit-button"
                    onClick={() => navigate(`${basePath}/visa-services`)}
                >
                    <ArrowLeftOutlined />
                    Back
                </Button>
                <div className="add-service-header">
                    <h1>{isEdit ? "Edit Visa Service" : "Add Visa Service"}</h1>
                    <p>{isEdit ? "Edit the details of an existing visa service" : "Add a new visa service to the system"}</p>
                </div>


                <Card className="add-service-container">
                    <div className={errors.visaName || errors.description || errors.visaPrice ? "add-service-card-error" : "add-service-section"}>
                        <h2 className="section-headers">Basic Information</h2>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                        </div>


                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label className="add-service-input-labels">Visa Service Price</label>
                            <Input
                                status={errors.visaPrice ? "error" : ""}
                                value={values.visaPrice}
                                maxLength={4}
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
                        </div>


                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label className="add-service-input-labels">Description</label>
                            <Input.TextArea
                                value={values.description}
                                maxLength={500}
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
                    </div>



                    <div className="add-service-grid" style={{ marginTop: 40 }}>
                        <div>
                            <div
                                className={errors.requirements ? "add-service-card-error" : "add-service-section"}
                            >
                                <h2 className="section-headers" >Requirements</h2>
                                {values.requirements.map((item, index) => (
                                    <div key={`req-${index}`} className="add-service-bullet-row" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <Space style={{ width: '100%' }}>
                                            <div>
                                                <label className="add-service-input-labels">Requirement Name</label>
                                                <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                                    <Input
                                                        value={item.req}
                                                        className="add-service-inputs"
                                                        onChange={(event) => updateBullet("requirements", index, event.target.value, "req")}
                                                    />

                                                    <Button
                                                        type="primary"
                                                        className="delete-add-service-button delete-button"
                                                        onClick={() => removeBullet("requirements", index)}
                                                        icon={<DeleteOutlined />}
                                                    />
                                                </div>
                                            </div>
                                        </Space>

                                        <label className="add-service-input-labels">Required or Optional</label>
                                        <Select
                                            value={item.isReq}
                                            className="add-service-inputs"
                                            placeholder="Requirement Type"
                                            onChange={(value) => updateBullet("requirements", index, value, "isReq")}
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
                                                autoSize={{ minRows: 3, maxRows: 5 }}
                                                maxLength={500}
                                                onChange={(event) => updateBullet("requirements", index, event.target.value, "desc")}
                                                style={{ marginTop: 2 }}
                                            />
                                        </div>


                                        <div >
                                            <label className="add-service-input-labels">Application Link (Optional)</label>
                                            <Input
                                                value={item.applicationLink}
                                                className="add-service-inputs"
                                                maxLength={200}
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
                                <p className="add-service-error-message">{errors.requirements}</p>
                            </div>
                        </div>

                        <div
                            className={errors.processSteps ? "add-service-card-error" : "add-service-section"}
                        >
                            <h2 className="section-headers" >Process Steps</h2>
                            {/* {values.processSteps.map((item, index) => (
                                <div key={`step-${index}`} className="add-service-bullet-row">
                                    <Space>
                                        <div>
                                            <label className="add-service-input-labels">Process Step</label>
                                            <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                                <Input
                                                    value={item.title}
                                                    className="add-service-inputs"
                                                    onChange={(event) => updateBullet("processSteps", index, event.target.value, "title")}
                                                />
                                                <Button
                                                    className="delete-add-service-button delete-button"
                                                    type="primary"
                                                    onClick={() => removeBullet("processSteps", index)}
                                                    icon={<DeleteOutlined />}
                                                />
                                            </div>
                                        </div>
                                    </Space>

                                    <div>
                                        <label className="add-service-input-labels">Process Step Description</label>
                                        <Input.TextArea
                                            value={item.description}
                                            className="add-service-inputs"
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            maxLength={300}
                                            onChange={(event) => updateBullet("processSteps", index, event.target.value, "description")}
                                        />
                                    </div>
                                </div>
                            ))} */}
                            {values.processSteps.map((item, index) => (
                                <div key={`step-${index}`} className="add-service-bullet-row">
                                    <label className="add-service-input-labels">Process Step</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <Input
                                            value={item}
                                            className="add-service-inputs"
                                            onChange={(event) =>
                                                updateBullet("processSteps", index, event.target.value)
                                            }
                                        />
                                        <Button
                                            className="delete-add-service-button delete-button"
                                            type="primary"
                                            onClick={() => removeBullet("processSteps", index)}
                                            icon={<DeleteOutlined />}
                                        />
                                    </div>
                                </div>
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
                            <p className="add-service-error-message">{errors.processSteps}</p>
                        </div>
                    </div>

                    {/* Reminders Bulleted List */}

                    <div style={{ marginTop: 40 }} className={errors.reminders ? "add-service-card-error" : "add-service-section"}>
                        <h2 className="section-headers" >Reminders</h2>
                        {values.reminders.map((item, index) => (
                            <div key={`reminder-${index}`} className="add-service-bullet-row">
                                <div>
                                    <label className="add-service-input-labels">{index + 1}. Reminder</label>
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                        <Input
                                            value={item}
                                            className="add-service-inputs"
                                            maxLength={300}
                                            onChange={(event) => updateBullet("reminders", index, event.target.value)}
                                        />
                                        <Button
                                            className="delete-add-service-button delete-button"
                                            type="primary"
                                            onClick={() => removeBullet("reminders", index)}
                                            icon={<DeleteOutlined />}
                                        />
                                    </div>
                                </div>
                            </div>
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
                    </div>

                </Card>

                <div className="footer-add-services">
                    <Button className="save-service-button backsubmit-button" type="primary" onClick={saveService}>
                        {isEdit ? "Update Service" : "Save Service"}
                    </Button>
                </div>
            </div >
        </ConfigProvider >
    );
}
