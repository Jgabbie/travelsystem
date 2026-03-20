import { useEffect, useRef, useState } from "react";
import { Input, Button, Card, DatePicker, Select, Space, message, ConfigProvider } from "antd";
import { UploadOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import axiosInstance from "../../config/axiosConfig";
import '../../style/admin/addpackage.css';
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { useAuth } from "../../hooks/useAuth";

const { RangePicker } = DatePicker;

export default function AddPackageDomestic() {

  const navigate = useNavigate();
  const { auth } = useAuth();
  const isEmployee = auth?.role === 'Employee';
  const basePath = isEmployee ? '/employee' : '';

  const { id } = useParams();
  const fileInputRef = useRef(null)
  const isEdit = Boolean(id);

  const [backEndErrors, setBackEndErrors] = useState(null);

  const [errors, setErrors] = useState({
    name: "",
    pricePerPax: "",
    childRate: "",
    infantRate: "",
    soloRate: "",
    description: "",
    duration: "",
    hotels: "",
    airlines: "",
    inclusions: "",
    exclusions: "",
    termsConditions: "",
    itineraries: "",
  });

  const [values, setValues] = useState({
    name: null,
    pricePerPax: null,
    childRate: null,
    infantRate: null,
    soloRate: null,
    description: null,
    duration: null,
    packageType: "domestic",
    hotels: [],
    airlines: [],
    inclusions: [],
    exclusions: [],
    termsConditions: [],
    itineraries: {},
    tags: [],
    images: []
  });

  //package validation
  const validateAll = (updatedValues) => {
    const newErrors = {
      name: validate("name", updatedValues.name),
      pricePerPax: validate("pricePerPax", updatedValues.pricePerPax),
      childRate: validate("childRate", updatedValues.childRate),
      infantRate: validate("infantRate", updatedValues.infantRate),
      soloRate: validate("soloRate", updatedValues.soloRate),
      description: validate("description", updatedValues.description),
      dateType: validate("dateType", updatedValues.dateType),
      duration: validate("duration", updatedValues.duration),
      hotels: validate("hotels", updatedValues.hotels),
      airlines: validate("airlines", updatedValues.airlines),
      inclusions: validate("inclusions", updatedValues.inclusions),
      exclusions: validate("exclusions", updatedValues.exclusions),
      termsConditions: validate("termsConditions", updatedValues.termsConditions),
      itineraries: validate("itineraries", updatedValues.itineraries),
      tags: validate("tags", updatedValues.tags),
      images: validate("images", updatedValues.images),
    };
    setErrors(newErrors);
  };

  const valueHandler = (field, value) => {
    const updatedValues = { ...values, [field]: value };
    setValues(updatedValues);
    validateAll(updatedValues);
  };


  useEffect(() => {
    if (backEndErrors) {
      let errorMsg = "";

      if (typeof backEndErrors === "string") {
        errorMsg = backEndErrors;
      } else if (backEndErrors.message) {
        errorMsg = backEndErrors.message;
      } else if (backEndErrors.error) {
        errorMsg = backEndErrors.error;
      } else {
        errorMsg = JSON.stringify(backEndErrors);
      }
      message.error(errorMsg);
    }
  }, [backEndErrors]);


  //validations
  const validate = (field, value) => {
    if (field === "name") {
      if (!value) return "Package name is required.";
    }
    if (field === "pricePerPax") {
      if (!value) return "Price per pax is required.";
    }
    if (field === "childRate") {
      if (!value) return "Child rate is required.";
    }
    if (field === "infantRate") {
      if (!value) return "Infant rate is required.";
    }
    if (field === "soloRate") {
      if (!value) return "Solo rate is required.";
    }
    if (field === "description") {
      if (!value) return "Description is required.";
    }
    if (field === "duration") {
      if (!value) return "Duration is required.";
    }
    if (field === "hotels") {
      if (!value.length) return "Hotels are required.";
      const hasEmpty = value.some(h => !h.name || !h.stars || !h.type);
      if (hasEmpty) return "All hotels must have name, stars, and type.";
    }
    if (field === "airlines") {
      if (!value.length) return "Airlines are required.";
      const hasEmpty = value.some(a => !a.name || !a.type);
      if (hasEmpty) return "All Airlines must have a name and type.";
    }
    if (field === "inclusions") {
      if (!value.length) return "Inclusions are required.";
      if (value.some(v => !v || !v.trim())) return "All inclusions must be filled.";
    }
    if (field === "exclusions") {
      if (!value.length) return "Exclusions are required.";
      if (value.some(v => !v || !v.trim())) return "All exclusions must be filled.";
    }
    if (field === "termsConditions") {
      if (!value.length) return "Terms and Conditions are required.";
      if (value.some(v => !v || !v.trim())) return "All Terms and Conditions must be filled.";
    }
    if (field === "itineraries") {
      if (!Object.keys(value).length) return "Itineraries are required.";
      const hasEmptyDay = Object.values(value).some(dayActivities =>
        !dayActivities.length || dayActivities.some((item) => {
          if (!item) return true;
          if (typeof item === "string") return !item.trim();
          if (!item.activity || !item.activity.trim()) return true;
          if (item.isOptional) {
            if (!item.optionalActivity || !item.optionalActivity.trim()) return true;
            if (!item.optionalPrice || !item.optionalPrice.toString().trim()) return true;
          }
          return false;
        })
      );
      if (hasEmptyDay) return "All itinerary days must have at least one activity filled.";
    }
    if (field === "tags") {
      if (!value.length) return "At least one tag is required.";
    }
    if (field === "images") {
      if (!value.length) return "At least one package image is required.";
    }
    return "";
  };

  //hotel functions
  const addHotel = () => valueHandler("hotels", [...values.hotels, { name: "", stars: null, type: null }]);
  const updateHotel = (index, field, value) => {
    const updated = [...values.hotels];
    updated[index][field] = value;
    valueHandler("hotels", updated);
  };
  const removeHotel = (index) => valueHandler("hotels", values.hotels.filter((_, i) => i !== index));

  //airline functions
  const addAirline = () => valueHandler("airlines", [...values.airlines, { name: "", type: null }]);
  const updateAirline = (index, field, value) => {
    const updated = [...values.airlines];
    updated[index][field] = value;
    valueHandler("airlines", updated);
  };
  const removeAirline = (index) => valueHandler("airlines", values.airlines.filter((_, i) => i !== index));

  //inclusion/exclusion functions
  const addBullet = (type) => {
    if (type === "inclusion") valueHandler("inclusions", [...values.inclusions, ""]);
    if (type === "exclusion") valueHandler("exclusions", [...values.exclusions, ""]);
    if (type === "termsConditions") valueHandler("termsConditions", [...values.termsConditions, ""]);
  };

  //bullets update for inclusions, exclusions, terms and conditions
  const updateBullet = (type, index, value) => {
    if (type === "inclusion") {
      const updated = [...values.inclusions];
      updated[index] = value;
      valueHandler("inclusions", updated);
    } else if (type === "exclusion") {
      const updated = [...values.exclusions];
      updated[index] = value;
      valueHandler("exclusions", updated);
    } else if (type === "termsConditions") {
      const updated = [...values.termsConditions];
      updated[index] = value;
      valueHandler("termsConditions", updated);
    }
  };

  //bullets remove for inclusions, exclusions, terms and conditions
  const removeBullet = (type, index) => {
    if (type === "inclusion") valueHandler("inclusions", values.inclusions.filter((_, i) => i !== index));
    else if (type === "exclusion") valueHandler("exclusions", values.exclusions.filter((_, i) => i !== index));
    else if (type === "termsConditions") valueHandler("termsConditions", values.termsConditions.filter((_, i) => i !== index));
  };

  //itinerary functions
  const normalizeItineraries = (itineraries) => {
    if (!itineraries || typeof itineraries !== "object") return {};
    const normalized = {};

    Object.keys(itineraries).forEach((day) => {
      const list = itineraries[day] || [];
      normalized[day] = list.map((item) => {
        if (!item || typeof item === "string") {
          return {
            activity: item || "",
            isOptional: false,
            optionalActivity: "",
            optionalPrice: ""
          };
        }
        return {
          activity: item.activity ?? "",
          isOptional: Boolean(item.isOptional),
          optionalActivity: item.optionalActivity ?? "",
          optionalPrice: item.optionalPrice ?? ""
        };
      });
    });

    return normalized;
  };

  const initItinerary = (days) => {
    setValues(prev => {
      const temp = normalizeItineraries(prev.itineraries);

      for (let i = 1; i <= days; i++) {
        if (!temp[`day${i}`]) temp[`day${i}`] = [];
      }

      let i = days + 1;
      while (temp[`day${i}`]) {
        delete temp[`day${i}`];
        i++;
      }

      const updated = { ...prev, itineraries: temp };

      validateAll(updated);

      return updated;
    });
  };

  //add, update, remove itinerary items
  const addItineraryItem = (day) => {
    const updated = {
      ...values,
      itineraries: {
        ...values.itineraries,
        [day]: [
          ...values.itineraries[day],
          { activity: "", isOptional: false, optionalActivity: "", optionalPrice: "" }
        ]
      }
    };

    setValues(updated);
    validateAll(updated);
  };

  const updateItineraryItem = (day, index, field, value) => {
    const updated = {
      ...values,
      itineraries: {
        ...values.itineraries,
        [day]: values.itineraries[day].map((item, i) => {
          if (i !== index) {
            return typeof item === "string"
              ? { activity: item, isOptional: false, optionalActivity: "", optionalPrice: "" }
              : item;
          }

          const normalized = typeof item === "string"
            ? { activity: item, isOptional: false, optionalActivity: "", optionalPrice: "" }
            : { ...item };

          if (field === "isOptional") {
            normalized.isOptional = value;
            if (!value) {
              normalized.optionalActivity = "";
              normalized.optionalPrice = "";
            }
          } else {
            normalized[field] = value;
          }

          return normalized;
        })
      }
    };

    setValues(updated);
    validateAll(updated);
  };

  const removeItineraryItem = (day, index) => {
    const updated = {
      ...values,
      itineraries: {
        ...values.itineraries,
        [day]: values.itineraries[day].filter((_, i) => i !== index)
      }
    };

    setValues(updated);
    validateAll(updated);
  };

  //add package and update package function
  const savePackage = async () => {
    let hasError = false;

    // Validate each field manually
    const newErrors = {
      name: validate("name", values.name),
      code: validate("code", values.code),
      pricePerPax: validate("pricePerPax", values.pricePerPax),
      childRate: validate("childRate", values.childRate),
      infantRate: validate("infantRate", values.infantRate),
      soloRate: validate("soloRate", values.soloRate),
      description: validate("description", values.description),
      duration: validate("duration", values.duration),
      hotels: validate("hotels", values.hotels),
      airlines: validate("airlines", values.airlines),
      inclusions: validate("inclusions", values.inclusions),
      exclusions: validate("exclusions", values.exclusions),
      termsConditions: validate("termsConditions", values.termsConditions),
      itineraries: validate("itineraries", values.itineraries),
      tags: validate("tags", values.tags),
      images: validate("images", values.images)
    };

    // Check if any field has error
    for (let field in newErrors) {
      if (newErrors[field]) hasError = true;
    }

    setErrors(newErrors);

    if (hasError) {
      message.error("Please fill all required fields correctly.");
      return; // stop submission
    }

    // Build payload
    const payload = {
      name: values.name,
      code: values.code,
      pricePerPax: values.pricePerPax,
      childRate: values.childRate,
      infantRate: values.infantRate,
      soloRate: values.soloRate,
      description: values.description,
      packageType: "domestic",
      duration: values.duration,
      hotels: values.hotels,
      airlines: values.airlines,
      inclusions: values.inclusions,
      exclusions: values.exclusions,
      termsAndConditions: values.termsConditions,
      itineraries: values.itineraries,
      tags: values.tags,
      images: values.images
    };

    try {
      if (isEdit) {
        await axiosInstance.put(`/package/update-package/${id}`, payload);
      } else {
        await axiosInstance.post("/package/add-package", payload);
      }
      navigate(`${basePath}/packages`);
    } catch (err) {
      setBackEndErrors(err.response?.data || err.message);
      console.error("Failed to save package:", err);
    }
  };

  //load package data if edit mode
  useEffect(() => {
    if (!isEdit) return;

    const getPackage = async () => {
      try {
        const res = await axiosInstance.get(`/package/get-package/${id}`);
        const pkg = res.data;

        setValues(prev => ({
          ...prev,
          name: pkg.packageName,
          code: pkg.packageCode,
          pricePerPax: pkg.packagePricePerPax,
          childRate: pkg.childRate,
          infantRate: pkg.infantRate,
          soloRate: pkg.soloRate,
          description: pkg.packageDescription,
          packageType: "domestic",
          duration: pkg.packageDuration,
          hotels: pkg.packageHotels || [],
          airlines: pkg.packageAirlines || [],
          inclusions: pkg.packageInclusions || [],
          exclusions: pkg.packageExclusions || [],
          termsConditions: pkg.packageTermsConditions || [],
          itineraries: normalizeItineraries(pkg.packageItineraries || {}),
          tags: pkg.tags || [],
          images: pkg.images || []
        }));

      } catch (err) {
        console.error("Failed to load package", err);
        setBackEndErrors(err.response?.data || err.message);
      }
    };

    getPackage();
  }, [id]);

  useEffect(() => {
    if (isEdit) return; // skip if editing

    const generatePackageCode = () => {
      const datePart = dayjs().format("YYYYMMDD");
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      return `PKG-${datePart}-${randomPart}`;
    };

    setValues(prev => ({
      ...prev,
      code: generatePackageCode()
    }));
  }, [isEdit]);

  //price formatting
  const priceFormat = (value) => {
    return value?.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "";
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      message.error("Please select a valid image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error("Image must be 2MB or less.");
      return;
    }

    if (values.images.length >= 3) {
      message.error("You can upload up to 3 images only.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      valueHandler("images", [...values.images, reader.result?.toString() || ""]);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index) => {
    valueHandler("images", values.images.filter((_, i) => i !== index));
  };


  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#305797"
        }
      }}
    >
      <div>
        <Card className={'add-package-form'}>
          <div className="add-package-header-container">
            <h1>{isEdit ? "Edit Domestic Package" : "Add Domestic Package"}</h1>
            <Button className="back-add-package-button" onClick={() => { navigate(`${basePath}/packages`) }}>Back to Package Management</Button>
          </div>

          <div className="add-package-container">

            <div className="add-package-section">
              <h2 className="section-headers">Package Information</h2>
              {/* packagename, code, price per pax, description */}


              {/* Package Name */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Package Name</label>
                <Input
                  status={errors.name ? "error" : ""}
                  maxLength={30}
                  value={values.name}
                  className={`add-package-inputs${errors.name ? " add-package-inputs-error" : ""}`}
                  onKeyDown={(e) => {
                    const allowedKeys = [
                      "Backspace",
                      "Delete",
                      "ArrowLeft",
                      "ArrowRight",
                      "Tab",
                      "-",
                      " "
                    ];
                    if (!allowedKeys.includes(e.key) && !/^[A-Za-z]$/.test(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  onChange={(e) => {
                    valueHandler("name", e.target.value)
                  }}
                />
                <p className="add-package-error-message">{errors.name}</p>
              </div>

              {/* Package Code */}
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
                <label className="add-package-input-labels">Package Code</label>
                <Input
                  value={values.code || ""}
                  readOnly
                  className="add-package-inputs"
                  style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                />
              </div>


              {/* Price Per Pax */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Price Per Pax</label>
                <Input
                  maxLength={7}
                  value={priceFormat(values.pricePerPax)}
                  className={`add-package-inputs${errors.pricePerPax ? " add-package-inputs-error" : ""}`}
                  style={{ marginBottom: 10 }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault()
                    }
                  }}
                  onChange={(e) => {
                    const price = e.target.value.replace(/\s/g, "");
                    valueHandler("pricePerPax", price)
                  }}
                  addonBefore={"₱"}
                  required={true}
                />
                <p className="add-package-error-message">{errors.pricePerPax}</p>
              </div>

              {/* Child Rate */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Child Rate</label>
                <Input
                  maxLength={7}
                  value={priceFormat(values.childRate)}
                  className={`add-package-inputs${errors.childRate ? " add-package-inputs-error" : ""}`}
                  style={{ marginBottom: 10 }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault()
                    }
                  }}
                  onChange={(e) => {
                    const price = e.target.value.replace(/\s/g, "");
                    valueHandler("childRate", price)
                  }}
                  addonBefore={"₱"}
                  required={true}
                />
                <p className="add-package-error-message">{errors.childRate}</p>
              </div>

              {/* Infant Rate */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Infant Rate</label>
                <Input
                  maxLength={7}
                  value={priceFormat(values.infantRate)}
                  className={`add-package-inputs${errors.infantRate ? " add-package-inputs-error" : ""}`}
                  style={{ marginBottom: 10 }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault()
                    }
                  }}
                  onChange={(e) => {
                    const price = e.target.value.replace(/\s/g, "");
                    valueHandler("infantRate", price)
                  }}
                  addonBefore={"₱"}
                  required={true}
                />
                <p className="add-package-error-message">{errors.infantRate}</p>
              </div>

              {/* Solo Rate */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Solo Rate</label>
                <Input
                  maxLength={7}
                  value={priceFormat(values.soloRate)}
                  className={`add-package-inputs${errors.soloRate ? " add-package-inputs-error" : ""}`}
                  style={{ marginBottom: 10 }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault()
                    }
                  }}
                  onChange={(e) => {
                    const price = e.target.value.replace(/\s/g, "");
                    valueHandler("soloRate", price)
                  }}
                  addonBefore={"₱"}
                  required={true}
                />
                <p className="add-package-error-message">{errors.soloRate}</p>
              </div>


              {/* Description */}
              <label className="add-package-input-labels">Package Description</label>
              <Input.TextArea
                maxLength={200}
                value={values.description}
                className={`add-package-input-textarea${errors.description ? " add-package-input-textarea-error" : ""}`}
                autoSize={{ minRows: 4, maxRows: 8 }}
                style={{ marginBottom: 10 }}
                onChange={(e) => { valueHandler("description", e.target.value) }}
              />
              <p className="add-package-error-message">{errors.description}</p>


              {/* Package Tags */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Package Tags</label>
                <Select
                  mode="tags"
                  style={{ width: "100%", marginBottom: 10 }}
                  className={`add-package-inputs${errors.tags ? " add-package-inputs-error" : ""}`}
                  placeholder="Type a tag and press Enter"
                  value={values.tags}
                  onChange={(value) => valueHandler("tags", value)}
                />
                <p className="add-package-error-message">{errors.tags}</p>
              </div>


              {/* Duration */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Tour Duration</label>
                <Select
                  className={`add-package-duration-select${errors.duration ? " add-package-select-error" : ""}`}
                  style={{ width: "100%", marginBottom: 10 }}
                  value={values.duration}
                  status={errors.duration ? "error" : ""}
                  onChange={(value) => {
                    valueHandler("duration", value);
                    initItinerary(value);
                  }}
                  options={[
                    { label: "3 Days", value: 3 },
                    { label: "4 Days", value: 4 },
                    { label: "5 Days", value: 5 },
                    { label: "6 Days", value: 6 },
                    { label: "7 Days", value: 7 }
                  ]}
                >
                </Select>
                <p className="add-package-error-message">{errors.duration}</p>
              </div>

            </div>

            <div className="add-package-sections-row">
              <div className="add-package-section add-package-section-half">
                <h2 className="section-headers">Hotels and Airlines</h2>
                {/* HOTELS */}
                <Card
                  size="small"
                  title="Hotels"
                  className={errors.hotels ? "add-package-card-error" : ""}
                  style={{ marginTop: 5 }}
                >
                  {values.hotels?.map((hotel, index) => (
                    <Space key={index} style={{ width: "100%", marginBottom: 16 }}>
                      <Input className="add-package-inputs" placeholder="Hotel Name" value={hotel.name}
                        onKeyDown={(e) => {
                          const allowedKeys = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                            "-",
                            " "
                          ];
                          if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9]$/.test(e.key)) {
                            e.preventDefault()
                          }
                        }}
                        onChange={(e) =>
                          updateHotel(index, "name", e.target.value)}
                      />
                      <Select
                        value={hotel.stars}
                        placeholder="Select Stars"
                        onChange={(value) => updateHotel(index, "stars", value)}
                        options={[
                          { label: "3 Stars", value: 3 },
                          { label: "4 Stars", value: 4 },
                          { label: "5 Stars", value: 5 }
                        ]}
                      />
                      <Select
                        value={hotel.type}
                        placeholder="Select Type"
                        onChange={(value) => updateHotel(index, "type", value)}
                        options={[
                          { label: "Fixed", value: "fixed" },
                          { label: "Optional", value: "optional" }
                        ]} />
                      <Button className="delete-add-package-button" danger onClick={() => removeHotel(index)} icon={<DeleteOutlined />} />
                      <hr />
                    </Space>
                  ))}
                  <Button className="add-package-add-button" type="dashed" icon={<PlusOutlined />} block onClick={addHotel}>Add Hotel</Button>
                </Card>
                <p className="add-package-error-message">{errors.hotels}</p>

                {/* AIRLINES */}
                <Card
                  size="small"
                  title="Airlines"
                  className={errors.airlines ? "add-package-card-error" : ""}
                  style={{ marginTop: 20 }}
                >
                  {values.airlines?.map((airline, index) => (
                    <Space key={index} style={{ width: "100%", marginBottom: 16 }}>
                      <Input className="add-package-inputs" placeholder="Airline Name" value={airline.name}
                        onKeyDown={(e) => {
                          const allowedKeys = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                            "-",
                            " "
                          ];
                          if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9]$/.test(e.key)) {
                            e.preventDefault()
                          }
                        }}
                        onChange={(e) =>
                          updateAirline(index, "name", e.target.value)}
                      />
                      <Select
                        value={airline.type}
                        placeholder="Select Type"
                        onChange={(value) => updateAirline(index, "type", value)}
                        options={[
                          { label: "Fixed", value: "fixed" },
                          { label: "Optional", value: "optional" }
                        ]}
                      />
                      <Button className="delete-add-package-button" danger onClick={() => removeAirline(index)} icon={<DeleteOutlined />} />
                      <hr />
                    </Space>
                  ))}
                  <Button className="add-package-add-button" type="dashed" icon={<PlusOutlined />} block onClick={addAirline}>Add Airline</Button>
                </Card>
                <p className="add-package-error-message">{errors.airlines}</p>
              </div>


              <div className="add-package-section add-package-section-half">
                <h2 className="section-headers">Inclusions, Exclusions, and Terms & Conditions</h2>
                {/* INCLUSIONS */}
                <Card
                  size="small"
                  title="Inclusions"
                  className={errors.inclusions ? "add-package-card-error" : ""}
                  style={{ marginTop: 5 }}
                >
                  {values.inclusions?.map((item, index) => (
                    <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                      <Input className="add-package-inputs" value={item}
                        onKeyDown={(e) => {
                          const allowedKeys = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                            "-",
                            " "
                          ];
                          if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9]$/.test(e.key)) {
                            e.preventDefault()
                          }
                        }}
                        onChange={(e) => updateBullet("inclusion", index, e.target.value)}
                        placeholder="Inclusion"
                      />
                      <Button className="delete-add-package-button" danger onClick={() => removeBullet("inclusion", index)} icon={<DeleteOutlined />} />
                    </Space>
                  ))}
                  <Button className="add-package-add-button" type="dashed" icon={<PlusOutlined />} block onClick={() => addBullet("inclusion")}>Add Inclusion</Button>
                </Card>
                <p className="add-package-error-message">{errors.inclusions}</p>

                {/* EXCLUSIONS */}
                <Card
                  size="small"
                  title="Exclusions"
                  className={errors.exclusions ? "add-package-card-error" : ""}
                  style={{ marginTop: 20 }}
                >
                  {values.exclusions?.map((item, index) => (
                    <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                      <Input className="add-package-inputs" value={item}
                        onKeyDown={(e) => {
                          const allowedKeys = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                            "-",
                            " "
                          ];
                          if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9]$/.test(e.key)) {
                            e.preventDefault()
                          }
                        }}
                        onChange={(e) =>
                          updateBullet("exclusion", index, e.target.value)}
                        placeholder="Exclusion"
                      />
                      <Button className="delete-add-package-button" danger onClick={() => removeBullet("exclusion", index)} icon={<DeleteOutlined />} />
                    </Space>
                  ))}
                  <Button className="add-package-add-button" type="dashed" icon={<PlusOutlined />} block onClick={() => addBullet("exclusion")}>Add Exclusion</Button>
                </Card>
                <p className="add-package-error-message">{errors.exclusions}</p>

                {/* TERMS AND CONDITIONS */}
                <Card
                  size="small"
                  title="Terms and Conditions"
                  className={errors.termsConditions ? "add-package-card-error" : ""}
                  style={{ marginTop: 20, marginBottom: 15 }}
                >
                  {values.termsConditions?.map((item, index) => (
                    <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                      <Input className="add-package-inputs" value={item}
                        onKeyDown={(e) => {
                          const allowedKeys = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                            "-",
                            " "
                          ];
                          if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9]$/.test(e.key)) {
                            e.preventDefault()
                          }
                        }}
                        onChange={(e) =>
                          updateBullet("termsConditions", index, e.target.value)}
                        placeholder="Terms and Conditions"
                      />
                      <Button className="delete-add-package-button" danger onClick={() => removeBullet("termsConditions", index)} icon={<DeleteOutlined />} />
                    </Space>
                  ))}
                  <Button className="add-package-add-button" type="dashed" icon={<PlusOutlined />} block onClick={() => addBullet("termsConditions")}>Add Terms and Conditions</Button>
                </Card>
                <p className="add-package-error-message">{errors.termsConditions}</p>
              </div>
            </div>

            <div className="add-package-sections-row">
              <div className="add-package-section add-package-section-half">
                <h2 className="section-headers">Itinerary</h2>
                {/* ITINERARIES */}
                <Card
                  size="small"
                  title="Itineraries"
                  className={errors.itineraries ? "add-package-card-error" : ""}
                  style={{ marginTop: 5 }}
                >
                  {Object.keys(values.itineraries ?? {}).map(day => (
                    <div key={day} style={{ marginBottom: 20 }}>
                      <h4>{day.replace("day", "Day ")}:</h4>
                      {values.itineraries[day].map((item, index) => {
                        const itineraryItem = typeof item === "string"
                          ? { activity: item, isOptional: false, optionalActivity: "", optionalPrice: "" }
                          : item;

                        return (
                          <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                            <Input
                              className="add-package-inputs"
                              value={itineraryItem.activity}
                              onKeyDown={(e) => {
                                const allowedKeys = [
                                  "Backspace",
                                  "Delete",
                                  "ArrowLeft",
                                  "ArrowRight",
                                  "Tab",
                                  "-",
                                  " "
                                ];
                                if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9]$/.test(e.key)) {
                                  e.preventDefault()
                                }
                              }}
                              onChange={(e) => updateItineraryItem(day, index, "activity", e.target.value)}
                              placeholder={`Activity ${index + 1}`}
                            />

                            {!itineraryItem.isOptional && (
                              <Button
                                className="add-package-add-button"
                                type="dashed"
                                onClick={() => updateItineraryItem(day, index, "isOptional", true)}
                              >
                                Add Optional
                              </Button>
                            )}

                            {itineraryItem.isOptional && (
                              <Space style={{ display: "flex" }}>
                                <div style={{ display: "flex", flexDirection: "column" }}>

                                  <Input
                                    className="add-package-inputs"
                                    value={itineraryItem.optionalActivity}
                                    onKeyDown={(e) => {
                                      const allowedKeys = [
                                        "Backspace",
                                        "Delete",
                                        "ArrowLeft",
                                        "ArrowRight",
                                        "Tab",
                                        "-",
                                        " "
                                      ];
                                      if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9]$/.test(e.key)) {
                                        e.preventDefault()
                                      }
                                    }}
                                    onChange={(e) => updateItineraryItem(day, index, "optionalActivity", e.target.value)}
                                    placeholder={`Opt. Activity ${index + 1}`}
                                  />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <Input
                                    className="add-package-inputs"
                                    value={itineraryItem.optionalPrice}
                                    onKeyDown={(e) => {
                                      if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                                        e.preventDefault();
                                      }
                                    }}
                                    onChange={(e) => updateItineraryItem(day, index, "optionalPrice", e.target.value)}
                                    placeholder="Opt. Price"
                                  />
                                </div>

                                <Button
                                  className="delete-add-package-button"
                                  danger
                                  style={{ width: 120 }}
                                  onClick={() => updateItineraryItem(day, index, "isOptional", false)}
                                >
                                  Remove Optional
                                </Button>
                              </Space>
                            )}

                            <Button className="delete-add-package-button" danger onClick={() => removeItineraryItem(day, index)} icon={<DeleteOutlined />} />
                          </Space>
                        )
                      })}
                      <Button className="add-package-add-button" type="dashed" icon={<PlusOutlined />} onClick={() => addItineraryItem(day)}>
                        Add Activity
                      </Button>
                    </div>
                  ))}
                </Card>
                <p className="add-package-error-message">{errors.itineraries}</p>
              </div>

              <div className="add-package-section add-package-section-half">
                <h2 className="section-headers">Package Image</h2>
                {/* PACKAGE IMAGE UPLOAD */}

                <div>
                  <input
                    ref={fileInputRef}
                    className="package-image-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                  />
                  <Button
                    className="package-image-action-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={values.images.length >= 3}
                  >
                    <UploadOutlined />
                    Upload Package Image
                  </Button>
                  <p className="package-image-help">PNG/JPG up to 2MB. Max 3 images.</p>

                  <div
                    className="package-image-preview"
                    style={{
                      display: "flex",
                      gap: "25px",
                      marginTop: 20,
                      flexWrap: "wrap",
                      justifyContent: "center",
                    }}
                  >
                    {values.images.map((img, index) => (
                      <div
                        key={index}
                        style={{
                          position: "relative",
                          width: 360,
                          height: 220,
                          border: "1px solid #ccc",
                          borderRadius: 12,
                          overflow: "hidden",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                        }}
                      >
                        <img
                          src={img}
                          alt={`Package ${index}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />

                        {/* Overlay text only on first image */}
                        {index === 0 && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: 0,
                              width: "100%",
                              padding: "8px 12px",
                              background: "rgba(0,0,0,0.5)",
                              color: "#fff",
                              fontSize: 14,
                              textAlign: "center",
                            }}
                          >
                            The first uploaded image will be used as the display image for the package
                          </div>
                        )}

                        <Button
                          type="text"
                          danger
                          size="small"
                          onClick={() => removeImage(index)}
                        >
                          <DeleteOutlined />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>




          </div>

          <div className="footer-add-packages">
            <Button
              className="save-package-button"
              type="primary"
              block
              style={{ marginTop: 20 }}
              onClick={savePackage}
            >
              {isEdit ? "Update Package" : "Save Package"}
            </Button>
          </div>

        </Card>
      </div>
    </ConfigProvider>
  );
}
