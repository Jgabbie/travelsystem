import { useEffect, useState } from "react";
import { Input, Button, Card, Space, notification, ConfigProvider, Select } from "antd";
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
        standardProcessSteps: [],
        // `processSteps` now holds only custom steps that will be inserted between
        // the permanent standard steps 'Documents Submitted' and 'Processing By Embassy'.
        processSteps: [],
        reminders: [""],
    });

    const STANDARD_PROCESS_STEPS = [
        { title: 'Application Submitted', description: 'The user has submitted the visa application.', daysToBeCompleted: 2 },
        { title: 'Application Approved', description: 'The visa application has been approved.', daysToBeCompleted: 2 },
        { title: 'Payment Completed', description: 'The payment for the visa application has been completed.', daysToBeCompleted: 3 },
        { title: 'Documents Uploaded', description: 'The required documents for the visa application have been uploaded.', daysToBeCompleted: 5 },
        { title: 'Documents Received', description: 'The documents for the visa application have been received.', daysToBeCompleted: 2 },
        { title: 'Documents Submitted', description: 'The documents for the visa application have been submitted.', daysToBeCompleted: 2 },
        { title: 'Processing By Embassy', description: 'The visa application is being processed by the embassy.', daysToBeCompleted: 0 },
        { title: 'Embassy Approved', description: 'The visa application has been approved by the embassy.', daysToBeCompleted: 0 },
        { title: 'Passport Released', description: 'The passport has been released to the applicant.', daysToBeCompleted: 0 },
    ];

    const INSERT_AFTER_TITLE = 'Documents Submitted';
    const insertIndex = STANDARD_PROCESS_STEPS.findIndex(s => s.title === INSERT_AFTER_TITLE);
    const customCount = values.processSteps.length;

    useEffect(() => {
        setValues(prev => {
            if (Array.isArray(prev.standardProcessSteps) && prev.standardProcessSteps.length > 0) {
                return prev;
            }
            return {
                ...prev,
                standardProcessSteps: STANDARD_PROCESS_STEPS.map((step) => ({ ...step }))
            };
        });
    }, []);

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
            if (value.some((item) => !String(item?.title || "").trim() || item?.daysToBeCompleted === "" || item?.daysToBeCompleted === null || item?.daysToBeCompleted === undefined || Number.isNaN(Number(item?.daysToBeCompleted)))) {
                return "Each process step needs a title and days to be completed.";
            }
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
            const updated = [...values.processSteps, { title: "", description: "", daysToBeCompleted: "" }];
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
            if (subfield) {
                updated[index] = { ...updated[index], [subfield]: value };
            } else {
                updated[index] = value;
            }
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

    const updateStandardStep = (index, field, value) => {
        const updated = [...values.standardProcessSteps];
        updated[index] = { ...updated[index], [field]: value };
        valueHandler("standardProcessSteps", updated);
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
            notification.error({ message: 'Please fill all required fields correctly.', placement: 'topRight' });
            return;
        }

        const payload = {
            visaName: values.visaName.trim(),
            visaPrice: Number(values.visaPrice),
            visaDescription: values.description.trim(),
            visaRequirements: values.requirements.map((item) => ({
                req: item.req.trim(),
                desc: item.desc.trim(),
                isReq: item.isReq,
                applicationLink: item.applicationLink != null ? String(item.applicationLink).trim() : ""
            })),
            // Merge standard steps with custom steps inserted after 'Documents Submitted'
            visaProcessSteps: (() => {
                const sourceStandard = values.standardProcessSteps?.length
                    ? values.standardProcessSteps
                    : STANDARD_PROCESS_STEPS;
                const idx = sourceStandard.findIndex(s => s.title === 'Documents Submitted');
                const before = sourceStandard.slice(0, idx + 1);
                const after = sourceStandard.slice(idx + 1);
                const merged = [...before, ...values.processSteps, ...after];
                return merged.map((step) => ({
                    title: (step.title || "").trim(),
                    description: (step.description || "").trim(),
                    daysToBeCompleted: step.daysToBeCompleted === "" || step.daysToBeCompleted === null || step.daysToBeCompleted === undefined
                        ? null
                        : Number(step.daysToBeCompleted)
                }));
            })(),
            visaReminders: values.reminders.map((item) => item.trim()).filter((item) => item.length > 0),
        };

        if (isEdit) {
            await apiFetch.put(`/services/update-service/${serviceId}`, payload);
            notification.success({
                message: 'Visa service updated successfully.',
                description: 'Changes to the visa service have been saved.',
                placement: 'topRight'
            });
        } else {
            await apiFetch.post("/services/create-service", payload);
            notification.success({
                message: 'Visa service created successfully.',
                description: 'The new visa service has been created.',
                placement: 'topRight'
            });
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

                // Normalize existing process steps and extract any custom steps
                const existingProcessSteps = existing.visaProcessSteps?.length
                    ? existing.visaProcessSteps.map((step) =>
                        typeof step === "string"
                            ? { title: step, description: "", daysToBeCompleted: "" }
                            : { title: step?.title || "", description: step?.description || "", daysToBeCompleted: step?.daysToBeCompleted ?? step?.days ?? "" }
                    )
                    : [];

                const customSteps = existingProcessSteps.filter((s) => !STANDARD_PROCESS_STEPS.some((std) => std.title === s.title));
                const standardStepMap = new Map(
                    existingProcessSteps
                        .filter((s) => STANDARD_PROCESS_STEPS.some((std) => std.title === s.title))
                        .map((s) => [s.title, s])
                );
                const editableStandardSteps = STANDARD_PROCESS_STEPS.map((step) => {
                    const existingStep = standardStepMap.get(step.title);
                    return {
                        title: step.title,
                        description: existingStep?.description ?? step.description ?? "",
                        daysToBeCompleted: existingStep?.daysToBeCompleted ?? step.daysToBeCompleted ?? ""
                    };
                });

                setValues({
                    visaName: existing.visaName || "",
                    visaPrice: existing.visaPrice || "",
                    description: existing.visaDescription || "",
                    requirements: existing.visaRequirements?.length
                        ? existing.visaRequirements.map((item) => typeof item === "string" ? { req: item, desc: "", isReq: "" } : { req: item.req || "", desc: item.desc || "", isReq: item.isReq || "", applicationLink: item.applicationLink || "" })
                        : [{ req: "", desc: "", isReq: "", applicationLink: "" }],
                    standardProcessSteps: editableStandardSteps,
                    // store only custom steps in the editable area
                    processSteps: customSteps.length ? customSteps : [],
                    reminders: Array.isArray(existing.visaReminders)
                        ? (existing.visaReminders.length ? existing.visaReminders : [""])
                        : (existing.visaReminders ? [existing.visaReminders] : [""]),
                });

            } catch (error) {
                notification.error({ message: 'Failed to load service details.', placement: 'topRight' });
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

                        <div className={errors.processSteps ? "add-service-card-error" : "add-service-section"}>
                            <h2 className="section-headers">Process Steps (Standard)</h2>
                            {/* Render merged preview: standard before insert point, then custom steps, then remaining standard steps */}
                            {(() => {
                                const sourceStandard = values.standardProcessSteps?.length
                                    ? values.standardProcessSteps
                                    : STANDARD_PROCESS_STEPS;
                                const before = sourceStandard.slice(0, insertIndex + 1).map((step, idx) => ({
                                    ...step,
                                    itemType: "standard",
                                    standardIndex: idx
                                }));
                                const custom = values.processSteps.map((step, idx) => ({
                                    ...step,
                                    itemType: "custom",
                                    customIndex: idx
                                }));
                                const after = sourceStandard.slice(insertIndex + 1).map((step, idx) => ({
                                    ...step,
                                    itemType: "standard",
                                    standardIndex: insertIndex + 1 + idx
                                }));
                                const merged = [...before, ...custom, ...after];
                                return merged.map((step, i) => {
                                    const isStandard = step.itemType === "standard";
                                    return (
                                        <div key={`merged-step-${i}`} className="add-service-bullet-row">
                                            <Space>
                                                <div style={{ width: '100%' }}>
                                                    <label className="add-service-input-labels">Process Step {i + 1}</label>
                                                    <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                                        <Input
                                                            value={step.title}
                                                            className="add-service-inputs"
                                                            disabled={isStandard}
                                                            onChange={isStandard ? undefined : (event) => updateBullet("processSteps", step.customIndex, event.target.value, "title")}
                                                        />
                                                        {!isStandard && (
                                                            <Button
                                                                className="delete-add-service-button delete-button"
                                                                type="primary"
                                                                onClick={() => removeBullet("processSteps", step.customIndex)}
                                                                icon={<DeleteOutlined />}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </Space>

                                            <div>
                                                <label className="add-service-input-labels">Process Step Description</label>
                                                <Input.TextArea
                                                    value={step.description}
                                                    className="add-service-inputs"
                                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                                    maxLength={300}
                                                    onChange={isStandard
                                                        ? (event) => updateStandardStep(step.standardIndex, "description", event.target.value)
                                                        : (event) => updateBullet("processSteps", step.customIndex, event.target.value, "description")}
                                                    style={{ marginTop: 2 }}
                                                />
                                            </div>
                                            <div>
                                                <label className="add-service-input-labels">Days to be completed</label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={step.daysToBeCompleted}
                                                    className="add-service-inputs"
                                                    onChange={isStandard
                                                        ? (event) => updateStandardStep(step.standardIndex, "daysToBeCompleted", event.target.value)
                                                        : (event) => updateBullet("processSteps", step.customIndex, event.target.value, "daysToBeCompleted")}
                                                    placeholder="Enter days"
                                                    style={{ marginTop: 2 }}
                                                />
                                            </div>
                                            <div style={{ height: 1, background: '#e8e8e8', margin: '12px 0' }} />
                                        </div>
                                    );
                                });
                            })()}

                            <Button
                                className="add-service-add-button highlighted-button"
                                type="primary"
                                icon={<PlusOutlined />}
                                block
                                onClick={() => addBullet("processSteps")}
                            >
                                Add Custom Step
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
