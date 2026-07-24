import { useEffect, useState } from "react";
import { Input, Button, Card, Space, notification, ConfigProvider, Select, Upload, Image } from "antd";
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined, UploadOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/addservice.css";
import { useAuth } from "../../hooks/useAuth";


// standard process steps
const STANDARD_PROCESS_STEPS = [
    { title: 'Application Submitted', description: 'The user has submitted the visa application.', daysToBeCompleted: 0 },
    { title: 'Application Approved', description: 'The visa application has been approved.', daysToBeCompleted: 0 },
    { title: 'Payment Completed', description: 'The payment for the visa application has been completed.', daysToBeCompleted: 5 },
    { title: 'Documents Uploaded', description: 'The required documents for the visa application have been uploaded.', daysToBeCompleted: 0 },
    { title: 'Documents Approved', description: 'The documents for the visa application have been approved.', daysToBeCompleted: 0 },
    { title: 'Documents Received', description: 'The documents for the visa application have been received.', daysToBeCompleted: 0 },
    { title: 'Documents Submitted', description: 'The documents for the visa application have been submitted.', daysToBeCompleted: 0 },
    { title: 'Processing By Embassy', description: 'The visa application is being processed by the embassy.', daysToBeCompleted: 0 },
    { title: 'Embassy Approved', description: 'The visa application has been approved by the embassy.', daysToBeCompleted: 0 },
    { title: 'Passport Released', description: 'The passport has been released to the applicant.', daysToBeCompleted: 0 },
];


export default function AddService() {
    const navigate = useNavigate();
    const { auth } = useAuth();
    const isEmployee = auth?.role === 'Employee';
    const basePath = isEmployee ? '/employee' : '';
    const location = useLocation();
    const { serviceId } = location.state || {};
    const isEdit = Boolean(serviceId);

    const [notificationApi, notificationContextHolder] =
        notification.useNotification();


    //form values and error states
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
        imageFile: "",
        imagePreview: "",
        requirements: [{ req: "", desc: "", isReq: "", applicationLink: "" }],
        standardProcessSteps: [],
        processSteps: [],
        reminders: [""],
    });


    const INSERT_AFTER_TITLE = 'Documents Submitted';
    const insertIndex = STANDARD_PROCESS_STEPS.findIndex(s => s.title === INSERT_AFTER_TITLE);

    //set the standard steps
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


    //validate values
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


    //handle value changes and validation
    const valueHandler = (field, value) => {
        setValues(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: validate(field, value) }));
    };


    //add bullet function
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


    //update bullet function
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


    //remove bullet function
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


    //update standard step function
    const updateStandardStep = (index, field, value) => {
        const updated = [...values.standardProcessSteps];
        updated[index] = { ...updated[index], [field]: value };
        valueHandler("standardProcessSteps", updated);
    };


    //handle image change function
    const handleImageChange = (file) => {
        const isImage = file.type?.startsWith("image/");

        if (!isImage) {
            notificationApi.error({
                title: "Invalid file",
                description: "Please upload an image file.",
                placement: "topRight"
            });

            return Upload.LIST_IGNORE;
        }

        const isBelow5MB = file.size / 1024 / 1024 < 5;

        if (!isBelow5MB) {
            notificationApi.error({
                title: "Image is too large",
                description: "The image must be smaller than 5MB.",
                placement: "topRight"
            });

            return Upload.LIST_IGNORE;
        }

        if (values.imagePreview?.startsWith("blob:")) {
            URL.revokeObjectURL(values.imagePreview);
        }

        setValues((prev) => ({
            ...prev,
            imageFile: file,
            imagePreview: URL.createObjectURL(file)
        }));

        // Prevent Ant Design from automatically uploading it.
        return false;
    };

    const removeServiceImage = () => {
        if (values.imagePreview?.startsWith("blob:")) {
            URL.revokeObjectURL(values.imagePreview);
        }

        setValues((prev) => ({
            ...prev,
            visaImage: "",
            imageFile: null,
            imagePreview: ""
        }));
    };


    //save service function
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
            notificationApi.error({
                title: "Please fill all required fields correctly.",
                placement: "topRight"
            });
            return;
        }

        let uploadedImageUrl = values.visaImage || "";

        /*
         * Upload the image separately.
         * Do not manually set Content-Type because the browser must add
         * the multipart boundary.
         */
        if (values.imageFile) {
            try {
                const imageFormData = new FormData();

                // Must be "files" because the existing backend route uses upload.array("files", 3)
                imageFormData.append("files", values.imageFile);

                const uploadResult = await apiFetch.post(
                    "/upload/upload-package-images",
                    imageFormData
                );

                uploadedImageUrl = uploadResult?.urls?.[0] || "";

                if (!uploadedImageUrl) {
                    throw new Error("The server did not return the uploaded image URL.");
                }

                uploadedImageUrl =
                    uploadResult?.imageUrl ||
                    uploadResult?.url ||
                    uploadResult?.secure_url ||
                    uploadResult?.urls?.[0] ||
                    "";

                if (!uploadedImageUrl) {
                    throw new Error(
                        "The image upload endpoint did not return an image URL."
                    );
                }
            } catch (uploadError) {
                console.error("SERVICE IMAGE UPLOAD ERROR:", uploadError);

                notificationApi.error({
                    title: "Failed to upload service image.",
                    description:
                        uploadError?.response?.data?.error ||
                        uploadError?.response?.data?.message ||
                        uploadError?.message ||
                        "Image upload failed.",
                    placement: "topRight"
                });

                return;
            }
        }

        const payload = {
            visaName: values.visaName.trim(),
            visaPrice: Number(values.visaPrice),
            visaDescription: values.description.trim(),
            visaImage: uploadedImageUrl,

            visaRequirements: values.requirements.map((item) => ({
                req: item.req.trim(),
                desc: item.desc.trim(),
                isReq: item.isReq,
                applicationLink:
                    item.applicationLink != null
                        ? String(item.applicationLink).trim()
                        : ""
            })),

            visaProcessSteps: (() => {
                const sourceStandard = values.standardProcessSteps?.length
                    ? values.standardProcessSteps
                    : STANDARD_PROCESS_STEPS;

                const index = sourceStandard.findIndex(
                    (step) => step.title === "Documents Submitted"
                );

                const before = sourceStandard.slice(0, index + 1);
                const after = sourceStandard.slice(index + 1);

                const merged = [
                    ...before,
                    ...values.processSteps,
                    ...after
                ];

                return merged.map((step) => ({
                    title: String(step.title || "").trim(),
                    description: String(step.description || "").trim(),
                    daysToBeCompleted:
                        step.daysToBeCompleted === "" ||
                            step.daysToBeCompleted === null ||
                            step.daysToBeCompleted === undefined
                            ? 0
                            : Number(step.daysToBeCompleted)
                }));
            })(),

            visaReminders: values.reminders
                .map((item) => item.trim())
                .filter(Boolean)
        };


        try {
            if (isEdit) {
                await apiFetch.put(
                    `/services/update-service/${serviceId}`,
                    payload
                );

                notificationApi.success({
                    title: "Visa service updated successfully.",
                    description: "Changes to the visa service have been saved.",
                    placement: "topRight"
                });
            } else {
                await apiFetch.post(
                    "/services/create-service",
                    payload
                );

                notificationApi.success({
                    title: "Visa service created successfully.",
                    description: "The new visa service has been created.",
                    placement: "topRight"
                });
            }

            navigate(`${basePath}/visa-services`);
        } catch (serviceError) {
            console.error("CREATE/UPDATE SERVICE ERROR:", serviceError);

            notificationApi.error({
                title: isEdit
                    ? "Failed to update visa service."
                    : "Failed to create visa service.",
                description:
                    serviceError?.response?.data?.error ||
                    serviceError?.response?.data?.message ||
                    serviceError?.data?.error ||
                    serviceError?.data?.message ||
                    serviceError?.message ||
                    "Service request failed.",
                placement: "topRight"
            });
        }
    };


    //load existing service details if in edit mode
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
                    visaImage: existing.visaImage || "",
                    imageFile: null,
                    imagePreview: existing.visaImage || "",
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
                notificationApi.error({ title: 'Failed to load service details.', placement: 'topRight' });
                navigate(`${basePath}/visa-services`);
            }
        }

        getService();
    }, [serviceId, isEdit, basePath, notificationApi, navigate]);



    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: "#305797"
                }
            }}
        >
            {notificationContextHolder}
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
                            <label className="add-service-input-labels">Visa Name <span style={{ color: "#ff0000" }}>*</span></label>
                            <Input
                                status={errors.visaName ? "error" : ""}
                                value={values.visaName}
                                maxLength={40}
                                className={`add-service-inputs${errors.visaName ? " add-service-inputs-error" : ""}`}
                                onChange={(event) => {
                                    const cleanedValue = event.target.value
                                        .replace(/[^a-zA-Z0-9\s]/g, "")
                                        .replace(/\s{2,}/g, " ")
                                        .replace(/^\s+/, "");

                                    valueHandler("visaName", cleanedValue);
                                }}
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
                            <label className="add-service-input-labels">Visa Service Price <span style={{ color: "#ff0000" }}>*</span></label>
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
                            <label className="add-service-input-labels">Description <span style={{ color: "#ff0000" }}>*</span></label>
                            <Input.TextArea
                                value={values.description}
                                maxLength={500}
                                className={`add-service-input-textarea${errors.description ? " add-service-input-textarea-error" : ""}`}
                                autoSize={{ minRows: 4, maxRows: 7 }}
                                onChange={(event) => {
                                    const cleanedValue = event.target.value
                                        .replace(/[^a-zA-Z0-9\s]/g, "")
                                        .replace(/[^\S\r\n]{2,}/g, " ")
                                        .replace(/^\s+/, "");

                                    valueHandler("description", cleanedValue);
                                }}
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


                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <label className="add-service-input-labels">
                                Visa Service Image <span style={{ color: "#ff0000" }}>*</span>
                            </label>

                            <Upload
                                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                                maxCount={1}
                                listType="picture"
                                beforeUpload={handleImageChange}
                                onRemove={removeServiceImage}
                                fileList={
                                    values.imageFile
                                        ? [
                                            {
                                                uid: values.imageFile.uid || "-1",
                                                name: values.imageFile.name,
                                                status: "done",
                                                originFileObj: values.imageFile,
                                                thumbUrl: values.imagePreview
                                            }
                                        ]
                                        : []
                                }
                            >
                                {!values.imageFile && (
                                    <Button type="primary" className="add-service-upload-button" icon={<UploadOutlined />}>
                                        Select Image
                                    </Button>
                                )}
                            </Upload>

                            {!values.imageFile && values.visaImage && (
                                <div style={{ marginTop: 8 }}>
                                    <Image
                                        src={values.visaImage}
                                        alt="Visa service"
                                        width={180}
                                        height={120}
                                        style={{
                                            objectFit: "cover",
                                            borderRadius: 6
                                        }}
                                    />

                                    <div style={{ marginTop: 8 }}>
                                        <Button
                                            danger
                                            size="small"
                                            onClick={removeServiceImage}
                                        >
                                            Remove Image
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <span style={{ fontSize: 12, color: "#777" }}>
                                PNG, JPG, JPEG, or WEBP. Maximum size: 5MB.
                            </span>
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
                                                <label className="add-service-input-labels">Requirement Name <span style={{ color: "#ff0000" }}>*</span></label>
                                                <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                                    <Input
                                                        value={item.req}
                                                        className="add-service-inputs"
                                                        onChange={(event) => {
                                                            const cleanedValue = event.target.value
                                                                .replace(/[^a-zA-Z0-9\s]/g, "")
                                                                .replace(/\s{2,}/g, " ")
                                                                .replace(/^\s+/, "");

                                                            updateBullet(
                                                                "requirements",
                                                                index,
                                                                cleanedValue,
                                                                "req"
                                                            );
                                                        }}
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

                                        <label className="add-service-input-labels">Required or Optional <span style={{ color: "#ff0000" }}>*</span></label>
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
                                            <label className="add-service-input-labels">Requirement Description <span style={{ color: "#ff0000" }}>*</span></label>
                                            <Input.TextArea
                                                value={item.desc}
                                                className="add-service-inputs"
                                                autoSize={{ minRows: 3, maxRows: 5 }}
                                                maxLength={500}
                                                onChange={(event) => {
                                                    const cleanedValue = event.target.value
                                                        .replace(/[^a-zA-Z0-9\s]/g, "")
                                                        .replace(/[^\S\r\n]{2,}/g, " ")
                                                        .replace(/^\s+/, "");

                                                    updateBullet(
                                                        "requirements",
                                                        index,
                                                        cleanedValue,
                                                        "desc"
                                                    );
                                                }}
                                                style={{ marginTop: 2 }}
                                            />
                                        </div>


                                        <div >
                                            <label className="add-service-input-labels">Application Link (Optional)</label>
                                            <Input
                                                value={item.applicationLink}
                                                className="add-service-inputs"
                                                maxLength={200}
                                                onChange={(event) => {
                                                    const cleanedValue = event.target.value
                                                        .replace(/\s/g, "")
                                                        .replace(
                                                            /[^a-zA-Z0-9:/?#[\]@!$&'()*+,;=._~%-]/g,
                                                            ""
                                                        )
                                                        .slice(0, 200);

                                                    updateBullet(
                                                        "requirements",
                                                        index,
                                                        cleanedValue,
                                                        "applicationLink"
                                                    );
                                                }}
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
                                                    <label className="add-service-input-labels">Process Step {i + 1} <span style={{ color: "#ff0000" }}>*</span></label>
                                                    <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                                        <Input
                                                            maxLength={50}
                                                            value={step.title}
                                                            className="add-service-inputs"
                                                            disabled={isStandard}
                                                            onChange={
                                                                isStandard
                                                                    ? undefined
                                                                    : (event) => {
                                                                        const cleanedValue = event.target.value
                                                                            .replace(/[^a-zA-Z0-9\s]/g, "")
                                                                            .replace(/\s{2,}/g, " ")
                                                                            .replace(/^\s+/, "");

                                                                        updateBullet(
                                                                            "processSteps",
                                                                            step.customIndex,
                                                                            cleanedValue,
                                                                            "title"
                                                                        );
                                                                    }
                                                            }
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
                                                <label className="add-service-input-labels">Process Step Description <span style={{ color: "#ff0000" }}>*</span></label>
                                                <Input.TextArea
                                                    value={step.description}
                                                    className="add-service-inputs"
                                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                                    maxLength={300}
                                                    onChange={(event) => {
                                                        const cleanedValue = event.target.value
                                                            .replace(/[^a-zA-Z0-9\s]/g, "")
                                                            .replace(/[^\S\r\n]{2,}/g, " ")
                                                            .replace(/^\s+/, "");

                                                        if (isStandard) {
                                                            updateStandardStep(
                                                                step.standardIndex,
                                                                "description",
                                                                cleanedValue
                                                            );
                                                        } else {
                                                            updateBullet(
                                                                "processSteps",
                                                                step.customIndex,
                                                                cleanedValue,
                                                                "description"
                                                            );
                                                        }
                                                    }}
                                                    style={{ marginTop: 2 }}
                                                />
                                            </div>
                                            {(step.title === 'Payment Completed') && (
                                                <div>
                                                    <label className="add-service-input-labels">Days to be completed</label>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={step.daysToBeCompleted}
                                                        className="add-service-inputs"
                                                        onChange={(event) => {
                                                            const cleanedValue = event.target.value
                                                                .replace(/\D/g, "")
                                                                .slice(0, 3);

                                                            if (isStandard) {
                                                                updateStandardStep(
                                                                    step.standardIndex,
                                                                    "daysToBeCompleted",
                                                                    cleanedValue
                                                                );
                                                            } else {
                                                                updateBullet(
                                                                    "processSteps",
                                                                    step.customIndex,
                                                                    cleanedValue,
                                                                    "daysToBeCompleted"
                                                                );
                                                            }
                                                        }}
                                                        placeholder="Enter days"
                                                        style={{ marginTop: 2 }}
                                                    />
                                                </div>
                                            )}
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
                                    <label className="add-service-input-labels">{index + 1}. Reminder <span style={{ color: "#ff0000" }}>*</span></label>
                                    <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                        <Input
                                            value={item}
                                            className="add-service-inputs"
                                            maxLength={300}
                                            onChange={(event) => {
                                                const cleanedValue = event.target.value
                                                    .replace(/[^a-zA-Z0-9\s]/g, "")
                                                    .replace(/\s{2,}/g, " ")
                                                    .replace(/^\s+/, "");

                                                updateBullet(
                                                    "reminders",
                                                    index,
                                                    cleanedValue
                                                );
                                            }}
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
