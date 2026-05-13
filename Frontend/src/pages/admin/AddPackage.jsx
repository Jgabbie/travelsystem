import { useEffect, useRef, useState } from "react";
import { Input, Button, Card, DatePicker, Select, Space, notification, message, ConfigProvider, Spin } from "antd";
import { UploadOutlined, PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import apiFetch from "../../config/fetchConfig";
import "../../style/admin/addpackage.css";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { useAuth } from "../../hooks/useAuth";

const { RangePicker } = DatePicker;

export default function AddPackage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const isEmployee = auth?.role === "Employee";
  const basePath = isEmployee ? "/employee" : "";

  const location = useLocation();
  const { packageItem } = location.state || {};
  const fileInputRef = useRef(null);
  const itineraryImageInputRefs = useRef({});
  const isEdit = Boolean(packageItem);

  const [backEndErrors, setBackEndErrors] = useState(null);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [savingPackage, setSavingPackage] = useState(false);

  const [errors, setErrors] = useState({
    packageType: "",
    visaRequired: "",
    name: "",
    pricePerPax: "",
    childRate: "",
    infantRate: "",
    soloRate: "",
    deposit: "",
    description: "",
    duration: "",
    dateRanges: "",
    hotels: "",
    airlines: "",
    inclusions: "",
    exclusions: "",
    termsConditions: "",
    itineraries: "",
  });

  const [values, setValues] = useState({
    packageType: null,
    visaRequired: false,
    name: null,
    code: null,
    pricePerPax: null,
    childRate: null,
    infantRate: null,
    soloRate: null,
    deposit: null,
    description: null,
    duration: null,
    dateRanges: [],
    hotels: [],
    airlines: [],
    inclusions: null,
    exclusions: null,
    termsConditions: null,
    itineraries: {},
    itinerariesImages: {},
    tags: [],
    images: [],
  });

  //package validation
  const validateAll = (updatedValues) => {
    const newErrors = {
      packageType: validate("packageType", updatedValues.packageType),
      visaRequired: validate("visaRequired", updatedValues.visaRequired),
      name: validate("name", updatedValues.name),
      pricePerPax: validate("pricePerPax", updatedValues.pricePerPax),
      childRate: validate("childRate", updatedValues.childRate),
      infantRate: validate("infantRate", updatedValues.infantRate),
      soloRate: validate("soloRate", updatedValues.soloRate),
      deposit: validate("deposit", updatedValues.deposit),
      description: validate("description", updatedValues.description),
      duration: validate("duration", updatedValues.duration),
      dateRanges: validate("dateRanges", updatedValues.dateRanges, updatedValues),
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
    setErrors((prev) => ({
      ...prev,
      [field]: validate(field, value, updatedValues),
    }));
  };

  useEffect(() => {
    if (backEndErrors) {
      let errorMsg = "";

      if (typeof backEndErrors === "string") {
        errorMsg = backEndErrors;
      } else if (backEndErrors?.message) {
        errorMsg = backEndErrors.message;
      } else if (backEndErrors?.error) {
        errorMsg = backEndErrors.error;
      } else {
        errorMsg = "Something went wrong. Please try again.";
      }

      notification.error({ message: errorMsg, placement: 'topRight' });
    }
  }, [backEndErrors]);

  //validations
  const validate = (field, value, allValues = values) => {
    const normalizeTextArea = (valueToNormalize) => {
      if (!valueToNormalize) return [];
      if (Array.isArray(valueToNormalize)) {
        return valueToNormalize.filter((line) => line.trim() !== "");
      }
      if (typeof valueToNormalize === "string") {
        return valueToNormalize
          .split("\n")
          .map((line) => line.replace(/^•\s*/, "").trim())
          .filter((line) => line !== "");
      }
      return [];
    };

    if (field === "packageType") {
      if (!value) return "Package type is required."
    }
    if (field === "visaRequired") {
      if (allValues.packageType === "international" && (value === null || value === undefined)) return "Visa requirement must be specified."
    }
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
    if (field === "deposit") {
      if (!value) return "Deposit is required.";
    }
    if (field === "description") {
      if (!value) return "Description is required.";
    }
    if (field === "duration") {
      if (!value) return "Duration is required.";
    }
    if (field === "dateRanges") {
      if (!value.length) return "At least one date range is required.";

      const hasInvalid = value.some(
        (range) => !range.startdaterange || !range.enddaterange || range.slots === ""
      );
      if (hasInvalid) return "All date ranges must have start date, end date, and slots.";

      if (allValues.duration) {
        const hasWrongDuration = value.some((range) => {
          const start = dayjs(range.startdaterange);
          const end = dayjs(range.enddaterange);

          const diffDays = end.diff(start, "day") + 1;

          return diffDays !== allValues.duration;
        });

        if (hasWrongDuration) {
          return `Date range must exactly match the tour duration (${allValues.duration} days).`;
        }
      }
    }
    if (field === "hotels") {
      if (!value.length) return "Hotels are required.";
      const hasEmpty = value.some((h) => !h.name || !h.stars || !h.type);
      if (hasEmpty) return "All hotels must have name, stars, and type.";
    }
    if (field === "airlines") {
      if (!value.length) return "Airlines are required.";
      const hasEmpty = value.some((a) => !a.name || !a.type);
      if (hasEmpty) return "All Airlines must have a name and type.";
    }
    if (["inclusions", "exclusions", "termsConditions"].includes(field)) {
      const items = normalizeTextArea(value);
      if (items.length === 0) {
        const displayNames = {
          inclusions: "Inclusions",
          exclusions: "Exclusions",
          termsConditions: "Terms & Conditions",
        };
        return `${displayNames[field]} are required.`;
      }
    }
    if (field === "itineraries") {
      if (!Object.keys(value).length) return "Itineraries are required.";
      const hasEmptyDay = Object.values(value).some(
        (dayActivities) =>
          !dayActivities.length ||
          dayActivities.some((item) => {
            if (!item) return true;
            if (typeof item === "string") return !item.trim();
            if (!item.activity || !item.activity.trim()) return true;
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

  //date range validation
  const isRangeInvalid = (range) => {
    if (!range.startdaterange || !range.enddaterange) return false;
    if (!values.duration) return false;

    const start = dayjs(range.startdaterange);
    const end = dayjs(range.enddaterange);

    if (!start.isValid() || !end.isValid()) return false;

    const diffDays = end.diff(start, "day") + 1;
    return diffDays !== Number(values.duration);
  };

  //date range functions
  const addDateRange = () => {
    valueHandler("dateRanges", [
      ...values.dateRanges,
      {
        startdaterange: null,
        enddaterange: null,
        extrarate: "",
        slots: "",
      },
    ]);
  };

  const removeDateRange = (index) => {
    valueHandler(
      "dateRanges",
      values.dateRanges.filter((_, i) => i !== index)
    );
  };

  const updateDateRange = (index, field, value) => {
    const updated = [...values.dateRanges];
    updated[index][field] = value;
    valueHandler("dateRanges", updated);
  };

  //hotel functions
  const addHotel = () =>
    valueHandler("hotels", [...values.hotels, { name: "", stars: null, type: null }]);
  const updateHotel = (index, field, value) => {
    const updated = [...values.hotels];
    updated[index][field] = value;
    valueHandler("hotels", updated);
  };
  const removeHotel = (index) =>
    valueHandler(
      "hotels",
      values.hotels.filter((_, i) => i !== index)
    );

  //airline functions
  const addAirline = () =>
    valueHandler("airlines", [...values.airlines, { name: "", type: null }]);
  const updateAirline = (index, field, value) => {
    const updated = [...values.airlines];
    updated[index][field] = value;
    valueHandler("airlines", updated);
  };
  const removeAirline = (index) =>
    valueHandler(
      "airlines",
      values.airlines.filter((_, i) => i !== index)
    );

  const handleTextAreaChange = (field, e) => {
    let val = e.target.value;

    if (val.length > 0 && !val.startsWith("• ")) {
      val = "• " + val;
    }

    val = val.replace(/\n(?!• )/g, "\n• ");

    valueHandler(field, val);
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
            optionalPrice: "",
          };
        }
        return {
          activity: item.activity ?? "",
          isOptional: Boolean(item.isOptional),
          optionalActivity: item.optionalActivity ?? "",
          optionalPrice: item.optionalPrice ?? "",
        };
      });
    });

    return normalized;
  };

  const initItinerary = (days) => {
    setValues((prev) => {
      const temp = normalizeItineraries(prev.itineraries);
      const imagesByDay = { ...(prev.itinerariesImages || {}) };

      for (let i = 1; i <= days; i++) {
        if (!temp[`day${i}`]) temp[`day${i}`] = [];
        if (!imagesByDay[`day${i}`]) imagesByDay[`day${i}`] = [];
      }

      let i = days + 1;
      while (temp[`day${i}`]) {
        delete temp[`day${i}`];
        delete imagesByDay[`day${i}`];
        i++;
      }

      const updated = { ...prev, itineraries: temp, itinerariesImages: imagesByDay };

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
          { activity: "", isOptional: false, optionalActivity: "", optionalPrice: "" },
        ],
      },
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

          const normalized =
            typeof item === "string"
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
        }),
      },
    };

    setValues(updated);
    validateAll(updated);
  };

  const removeItineraryItem = (day, index) => {
    const updated = {
      ...values,
      itineraries: {
        ...values.itineraries,
        [day]: values.itineraries[day].filter((_, i) => i !== index),
      },
    };

    setValues(updated);
    validateAll(updated);
  };

  const handleItineraryImageChange = (day, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notification.error({ message: "Please select a valid image file.", placement: "topRight" });
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notification.error({ message: "Image must be 2MB or less.", placement: "topRight" });
      event.target.value = "";
      return;
    }

    setValues((prev) => {
      const current = prev.itinerariesImages?.[day] || [];

      if (current.length >= 3) {
        notification.error({ message: "You can upload up to 3 images only.", placement: "topRight" });
        return prev;
      }

      return {
        ...prev,
        itinerariesImages: {
          ...(prev.itinerariesImages || {}),
          [day]: [...current, file],
        },
      };
    });

    event.target.value = "";
  };

  const removeItineraryImage = (day, index) => {
    setValues((prev) => ({
      ...prev,
      itinerariesImages: {
        ...(prev.itinerariesImages || {}),
        [day]: (prev.itinerariesImages?.[day] || []).filter((_, i) => i !== index),
      },
    }));
  };



  //UPLOAD MAIN DISPLAY PACKAGE IMAGES
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      notification.error({ message: 'Please select a valid image file.', placement: 'topRight' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      notification.error({ message: 'Image must be 2MB or less.', placement: 'topRight' });
      return;
    }

    if (values.images.length >= 3) {
      notification.error({ message: 'You can upload up to 3 images only.', placement: 'topRight' });
      return;
    }

    valueHandler("images", [...values.images, file]);
  };


  //REMOVE IMAGE
  const removeImage = (index) => {
    valueHandler(
      "images",
      values.images.filter((_, i) => i !== index)
    );
  };


  //UPLOAD PACKAGE IMAGES
  const uploadPackageImages = async (files) => {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await apiFetch.post(
        "/upload/upload-package-images",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return res.urls;
    } catch (error) {
      console.error("Upload failed:", error);
      return [];
    }
  };

  const uploadItineraryImages = async (files) => {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await apiFetch.post(
        "/upload/upload-package-images",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return res.urls;
    } catch (error) {
      console.error("Upload failed:", error);
      return [];
    }
  };




  //ADD OR UPDATE PACKAGE
  const savePackage = async () => {
    let hasError = false;

    // Validate each field manually
    const newErrors = {
      packageType: validate("packageType", values.packageType),
      visaRequired: validate("visaRequired", values.visaRequired),
      name: validate("name", values.name),
      code: validate("code", values.code),
      pricePerPax: validate("pricePerPax", values.pricePerPax),
      childRate: validate("childRate", values.childRate),
      infantRate: validate("infantRate", values.infantRate),
      soloRate: validate("soloRate", values.soloRate),
      deposit: validate("deposit", values.deposit),
      description: validate("description", values.description),
      duration: validate("duration", values.duration),
      dateRanges: validate("dateRanges", values.dateRanges, values),
      hotels: validate("hotels", values.hotels),
      airlines: validate("airlines", values.airlines),
      inclusions: validate("inclusions", values.inclusions),
      exclusions: validate("exclusions", values.exclusions),
      termsConditions: validate("termsConditions", values.termsConditions),
      itineraries: validate("itineraries", values.itineraries),
      tags: validate("tags", values.tags),
      images: validate("images", values.images),
    };

    // Check if any field has error
    for (let field in newErrors) {
      if (newErrors[field]) hasError = true;
    }

    setErrors(newErrors);

    if (hasError) {
      notification.error({ message: 'Please fill all required fields correctly.', placement: 'topRight' });
      return; // stop submission
    }

    if (values.packageType === "domestic") {
      valueHandler("visaRequired", null);
    }

    //format the text area inputs (inclusions, exclusions, terms and conditions) to an array of strings
    const formatInExTc = (valueToFormat) => {
      if (!valueToFormat) return [];

      if (Array.isArray(valueToFormat)) {
        return valueToFormat
          .map((line) => String(line).replace("• ", "").trim())
          .filter((line) => line !== "");
      }

      if (typeof valueToFormat === "string") {
        return valueToFormat
          .split("\n")
          .map((line) => line.replace("• ", "").trim())
          .filter((line) => line !== "");
      }

      return [];
    };

    const newFiles = values.images.filter((img) => img instanceof File);
    const existingUrls = values.images.filter((img) => typeof img === "string");

    let uploadedImageUrls = [];

    if (newFiles.length > 0) {
      message.loading({ content: "Adding Package...", key: "upload" });

      uploadedImageUrls = await uploadPackageImages(newFiles);

      if (!uploadedImageUrls.length) {
        notification.error({ message: 'Failed to add package', key: 'upload', placement: 'topRight' });
        return;
      }

      notification.success({ message: 'Package added successfully!', key: 'upload', placement: 'topRight' });
    }

    // combine both
    const finalImages = [...existingUrls, ...uploadedImageUrls];

    const itineraryImagesByDay = {};
    const itineraryImageEntries = Object.entries(values.itinerariesImages || {});
    const hasNewItineraryFiles = itineraryImageEntries.some(([, images]) =>
      (images || []).some((img) => img instanceof File)
    );

    if (hasNewItineraryFiles) {
      message.loading({ content: "Uploading itinerary images...", key: "itinerary-upload" });
    }

    for (const [day, images] of itineraryImageEntries) {
      const dayImages = images || [];
      const dayNewFiles = dayImages.filter((img) => img instanceof File);
      const dayExistingUrls = dayImages.filter((img) => typeof img === "string");

      let dayUploadedUrls = [];
      if (dayNewFiles.length > 0) {
        dayUploadedUrls = await uploadItineraryImages(dayNewFiles);

        if (!dayUploadedUrls.length) {
          notification.error({ message: "Failed to upload itinerary images", key: "itinerary-upload", placement: "topRight" });
          return;
        }
      }

      itineraryImagesByDay[day] = [...dayExistingUrls, ...dayUploadedUrls];
    }

    if (hasNewItineraryFiles) {
      notification.success({ message: "Itinerary images uploaded successfully!", key: "itinerary-upload", placement: "topRight" });
    }

    const normalizedItineraries = Object.fromEntries(
      Object.entries(values.itineraries).map(([day, items]) => [
        day,
        (items || []).map((item) => {
          const normalized =
            typeof item === "string"
              ? { activity: item, isOptional: false, optionalActivity: "", optionalPrice: "" }
              : { ...item };

          return {
            ...normalized,
          };
        }),
      ])
    );


    setSavingPackage(true);

    // Build payload
    const payload = {
      name: values.name,
      code: values.code,
      pricePerPax: values.pricePerPax,
      childRate: values.childRate,
      infantRate: values.infantRate,
      soloRate: values.soloRate,
      deposit: values.deposit,
      description: values.description,
      packageType: values.packageType,
      visaRequired: values.visaRequired,
      duration: values.duration,
      dateRanges: values.dateRanges,
      hotels: values.hotels,
      airlines: values.airlines,
      inclusions: formatInExTc(values.inclusions),
      exclusions: formatInExTc(values.exclusions),
      termsAndConditions: formatInExTc(values.termsConditions),
      itineraries: normalizedItineraries,
      packageItineraryImages: itineraryImagesByDay,
      tags: values.tags,
      images: finalImages,
    };

    try {
      if (isEdit) {
        await apiFetch.put(`/package/update-package/${packageItem}`, payload);
      } else {
        await apiFetch.post("/package/add-package", payload);
      }
      navigate(`${basePath}/packages`);
    } catch (err) {
      setBackEndErrors(err.data || err.message);
      console.error("Failed to save package:", err);
    } finally {
      setSavingPackage(false);
    }
  };

  //load package data if edit mode
  useEffect(() => {
    if (!isEdit) return;

    const getPackage = async () => {
      setLoadingPackage(true);
      try {
        const pkg = await apiFetch.get(`/package/get-package/${packageItem}`);

        const itineraryImagesByDay = {};
        Object.entries(pkg.packageItineraries || {}).forEach(([day, items]) => {
          const images = (items || []).flatMap((item) => item?.itineraryImages || []);
          itineraryImagesByDay[day] = images.filter((img) => img && img !== "").slice(0, 3);
        });

        const packageItineraryImages = pkg.packageItineraryImages || itineraryImagesByDay;

        setValues((prev) => ({
          ...prev,
          name: pkg.packageName,
          code: pkg.packageCode,
          pricePerPax: pkg.packagePricePerPax,
          childRate: pkg.packageChildRate,
          infantRate: pkg.packageInfantRate,
          soloRate: pkg.packageSoloRate,
          deposit: pkg.packageDeposit,
          description: pkg.packageDescription,
          packageType: pkg.packageType,
          visaRequired: pkg.visaRequired !== undefined ? pkg.visaRequired : false,
          duration: pkg.packageDuration,
          hotels: pkg.packageHotels || [],
          airlines: pkg.packageAirlines || [],
          inclusions: pkg.packageInclusions || [],
          exclusions: pkg.packageExclusions || [],
          termsConditions: pkg.packageTermsConditions || [],
          dateRanges: (pkg.packageSpecificDate || []).map((d) => ({
            startdaterange: d.startdaterange,
            enddaterange: d.enddaterange,
            extrarate: d.extrarate || "",
            slots: d.slots || "",
          })),
          itineraries: normalizeItineraries(pkg.packageItineraries || {}),
          itinerariesImages: packageItineraryImages,
          tags: pkg.packageTags || [],
          images: (pkg.images || []).filter((img) => img && img !== ""),
        }));



      } catch (err) {
        console.error("Failed to load package", err);
        setBackEndErrors(err.data || err.message);
      } finally {
        setLoadingPackage(false);
      }
    };

    getPackage();
  }, [packageItem]);

  useEffect(() => {
    if (isEdit) return; // skip if editing

    const generatePackageCode = () => {
      const datePart = dayjs().format("YYYYMMDD");
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      return `PKG-${datePart}-${randomPart}`;
    };

    setValues((prev) => ({
      ...prev,
      code: generatePackageCode(),
    }));
  }, [isEdit]);

  //price formatting
  const priceFormat = (value) => {
    return value?.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ") || "";
  };



  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#305797",
        },
      }}
    >
      {loadingPackage || savingPackage ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh" }}>
          <Spin description={loadingPackage ? "Loading package..." : "Saving..."} />
        </div>
      ) : (

        <div>
          <Button
            style={{ marginBottom: 20, width: 120 }}
            type="primary"
            className="back-add-package-button backsubmit-button"
            onClick={() => {
              navigate(`${basePath}/packages`);
            }}
          >
            <ArrowLeftOutlined />
            Back
          </Button>
          <div className="add-package-header">
            <h1>{isEdit ? "Edit Package" : "Add Package"}</h1>
            <p>{isEdit ? "Edit the details of an existing travel package" : "Add a new travel package to the system"}</p>
          </div>

          <Card className="add-package-container">
            <div className="add-package-section">
              <h2 className="section-headers">Basic Information</h2>

              {/* Package Type */}
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
                <label className="add-package-input-labels">Package Type</label>

                <div className="package-type-card-group">
                  {/* Domestic */}
                  <Card
                    hoverable
                    onClick={() => {
                      valueHandler("packageType", "domestic");
                    }}
                    className={`package-type-card ${values.packageType === "domestic" ? "selected" : ""}`}
                    style={{
                      flex: 1,
                      cursor: "pointer",
                      border:
                        values.packageType === "domestic"
                          ? "2px solid #305797"
                          : "1px solid #d9d9d9",
                    }}
                  >
                    <h3>Domestic</h3>
                    <p style={{ fontSize: 12, color: "#666" }}>
                      Travel within the country
                    </p>
                  </Card>

                  {/* International */}
                  <Card
                    hoverable
                    onClick={() => {
                      valueHandler("packageType", "international");
                    }}
                    className={`package-type-card ${values.packageType === "international" ? "selected" : ""}`}
                    style={{
                      flex: 1,
                      cursor: "pointer",
                      border:
                        values.packageType === "international"
                          ? "2px solid #305797"
                          : "1px solid #d9d9d9",
                    }}
                  >
                    <h3>International</h3>
                    <p style={{ fontSize: 12, color: "#666" }}>
                      Travel outside the country
                    </p>
                  </Card>

                </div>
              </div>

              {values.packageType === "international" && (
                <div style={{ display: "flex", flexDirection: "column", marginTop: 20, marginBottom: 20 }}>
                  <label className="add-package-input-labels">Visa Requirement</label>

                  <div className="package-type-card-group">
                    {/* Visa Required */}
                    <Card
                      hoverable
                      onClick={() => valueHandler("visaRequired", true)}
                      className={`package-type-card ${values.visaRequired === true ? "selected" : ""}`}
                      style={{
                        flex: 1,
                        cursor: "pointer",
                        border:
                          values.visaRequired === true
                            ? "2px solid #305797"
                            : "1px solid #d9d9d9",
                      }}
                    >
                      <h3>Visa Required</h3>
                      <p style={{ fontSize: 12, color: "#666" }}>
                        Travelers must apply for a visa
                      </p>
                    </Card>

                    {/* No Visa */}
                    <Card
                      hoverable
                      onClick={() => valueHandler("visaRequired", false)}
                      className={`package-type-card ${values.visaRequired === false ? "selected" : ""
                        }`}
                      style={{
                        flex: 1,
                        cursor: "pointer",
                        border:
                          values.visaRequired === false
                            ? "2px solid #305797"
                            : "1px solid #d9d9d9",
                      }}
                    >
                      <h3>No Visa Needed</h3>
                      <p style={{ fontSize: 12, color: "#666" }}>
                        Visa-free destination
                      </p>
                    </Card>

                  </div>
                </div>
              )}

              {/* Package Name */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Package Name</label>
                <Input
                  status={errors.name ? "error" : ""}
                  maxLength={50}
                  value={values.name}
                  className={`add-package-inputs${errors.name ? " add-package-inputs-error" : "add-package-inputs"
                    }`}
                  onKeyDown={(e) => {
                    const allowedKeys = [
                      "Backspace",
                      "Delete",
                      "ArrowLeft",
                      "ArrowRight",
                      "Tab",
                      "Enter",
                    ];

                    if (allowedKeys.includes(e.key)) return;

                    if (/^[A-Za-z0-9\s.,@#&()\-\/]$/.test(e.key)) return;

                    e.preventDefault();
                  }}
                  onChange={(e) => {
                    valueHandler("name", e.target.value);
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
                  status={errors.pricePerPax ? "error" : ""}
                  maxLength={7}
                  value={priceFormat(values.pricePerPax)}
                  className={`add-package-inputs${errors.pricePerPax ? " add-package-inputs-error" : "add-package-inputs"
                    }`}
                  style={{ marginBottom: 10 }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const price = e.target.value.replace(/\s/g, "");
                    valueHandler("pricePerPax", price);
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
                  status={errors.childRate ? "error" : ""}
                  maxLength={7}
                  value={priceFormat(values.childRate)}
                  className={`add-package-inputs${errors.childRate ? " add-package-inputs-error" : "add-package-inputs"
                    }`}
                  style={{ marginBottom: 10 }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const price = e.target.value.replace(/\s/g, "");
                    valueHandler("childRate", price);
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
                  status={errors.infantRate ? "error" : ""}
                  maxLength={7}
                  value={priceFormat(values.infantRate)}
                  className={`add-package-inputs${errors.infantRate ? " add-package-inputs-error" : "add-package-inputs"
                    }`}
                  style={{ marginBottom: 10 }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const price = e.target.value.replace(/\s/g, "");
                    valueHandler("infantRate", price);
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
                  status={errors.soloRate ? "error" : ""}
                  maxLength={7}
                  value={priceFormat(values.soloRate)}
                  className={`add-package-inputs${errors.soloRate ? " add-package-inputs-error" : "add-package-inputs"
                    }`}
                  style={{ marginBottom: 10 }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const price = e.target.value.replace(/\s/g, "");
                    valueHandler("soloRate", price);
                  }}
                  addonBefore={"₱"}
                  required={true}
                />
                <p className="add-package-error-message">{errors.soloRate}</p>
              </div>

              {/* Deposit */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Deposit</label>
                <Input
                  status={errors.deposit ? "error" : ""}
                  maxLength={7}
                  value={priceFormat(values.deposit)}
                  className={`add-package-inputs${errors.deposit ? " add-package-inputs-error" : "add-package-inputs"
                    }`}
                  style={{ marginBottom: 10 }}
                  onKeyDown={(e) => {
                    if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const price = e.target.value.replace(/\s/g, "");
                    valueHandler("deposit", price);
                  }}
                  addonBefore={"₱"}
                  required={true}
                />
                <p className="add-package-error-message">{errors.deposit}</p>
              </div>

              {/* Description */}
              <label className="add-package-input-labels">Package Description</label>
              <Input.TextArea
                maxLength={500}
                value={values.description}
                className={`add-package-input-textarea${errors.description ? " add-package-input-textarea-error" : ""
                  }`}
                autoSize={{ minRows: 4, maxRows: 8 }}
                style={{ marginBottom: 10 }}
                onChange={(e) => {
                  valueHandler("description", e.target.value);
                }}
              />
              <p className="add-package-error-message">{errors.description}</p>

              {/* Package Tags */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Package Tags</label>
                <Select
                  mode="tags"
                  style={{ width: "100%", marginBottom: 10 }}
                  className={`add-package-inputs${errors.tags ? " add-package-inputs-error" : ""
                    }`}
                  value={values.tags}
                  onChange={(value) => valueHandler("tags", value)}
                />
                <p className="add-package-error-message">{errors.tags}</p>
              </div>

              {/* Duration */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <label className="add-package-input-labels">Tour Duration</label>
                <Select
                  className={`add-package-duration-select${errors.duration ? " add-package-select-error" : ""
                    }`}
                  style={{ width: "100%" }}
                  value={values.duration}
                  status={errors.duration ? "error" : ""}
                  onChange={(value) => {
                    const updated = { ...values, duration: value };
                    setValues(updated);
                    validateAll(updated);
                    initItinerary(value);
                  }}
                  options={[
                    { label: "3 Days", value: 3 },
                    { label: "4 Days", value: 4 },
                    { label: "5 Days", value: 5 },
                    { label: "6 Days", value: 6 },
                    { label: "7 Days", value: 7 },
                  ]}
                ></Select>
                <p className="add-package-error-message">{errors.duration}</p>
              </div>

              <div className="startenddates-add-package">
                <label className="add-package-input-labels">Start and End Dates</label>
                {values.dateRanges.map((range, index) => (
                  <Space className="add-package-date-range" key={index} style={{ marginBottom: 10, marginTop: 10 }}>
                    <RangePicker
                      value={
                        range.startdaterange && range.enddaterange
                          ? [dayjs(range.startdaterange), dayjs(range.enddaterange)]
                          : null
                      }
                      status={isRangeInvalid(range) || errors.dateRanges?.[index] ? "error" : ""}
                      onChange={(dates) => {
                        updateDateRange(index, "startdaterange", dates?.[0] || null);
                        updateDateRange(index, "enddaterange", dates?.[1] || null);
                      }}
                    />

                    {/* Extra Rate */}
                    <Input
                      status={errors.dateRanges?.[index] ? "error" : ""}
                      maxLength={7}
                      className=""
                      placeholder="Extra rate"
                      value={priceFormat(range.extrarate)}
                      addonBefore="₱"
                      onKeyDown={(e) => {
                        if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => {
                        const price = e.target.value.replace(/\s/g, "");
                        updateDateRange(index, "extrarate", price);
                      }}
                    />

                    {/* Slots */}
                    <Input
                      status={errors.dateRanges?.[index] ? "error" : ""}
                      placeholder="Slots"
                      value={range.slots}
                      onKeyDown={(e) => {
                        if (!/[0-9]/.test(e.key) && e.key !== "Backspace") {
                          e.preventDefault();
                        }
                      }}
                      onChange={(e) => updateDateRange(index, "slots", e.target.value)}
                    />

                    <Button
                      type="primary"
                      className="delete-add-package-button delete-button"
                      onClick={() => removeDateRange(index)}
                      icon={<DeleteOutlined />}
                    >
                    </Button>
                  </Space>
                ))}

                <Button
                  className="add-package-add-button highlighted-button"
                  type="primary"
                  onClick={addDateRange}>
                  Add Date Range
                </Button>

                <p className="add-package-error-message">{errors.dateRanges}</p>
              </div>
            </div>

            <div className="add-package-sections-row">
              <div className="add-package-section-half add-package-section">
                <h2 className="section-headers">Hotels and Airlines</h2>
                {/* HOTELS */}
                <div
                  className={errors.hotels ? "add-package-card-error" : ""}
                >
                  {values.hotels?.map((hotel, index) => (
                    <Space className="add-package-hotels" key={index} style={{ width: "100%", marginBottom: 16 }}>
                      <Input
                        status={errors.hotels ? "error" : ""}
                        className="add-package-inputs"
                        placeholder="Hotel Name"
                        value={hotel.name}
                        onKeyDown={(e) => {
                          const allowedKeys = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                            "-",
                            " ",
                            "'",
                            ".",
                            ",",
                            "&",
                            "(",
                            ")",
                            "/",
                            "#",
                          ];
                          if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9]$/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => updateHotel(index, "name", e.target.value)}
                      />
                      <Select
                        status={errors.hotels ? "error" : ""}
                        value={hotel.stars}
                        placeholder="Select Stars"
                        onChange={(value) => updateHotel(index, "stars", value)}
                        options={[
                          { label: "3 Stars", value: 3 },
                          { label: "4 Stars", value: 4 },
                          { label: "5 Stars", value: 5 },
                        ]}
                      />
                      <Select
                        status={errors.hotels ? "error" : ""}
                        value={hotel.type}
                        placeholder="Select Type"
                        onChange={(value) => updateHotel(index, "type", value)}
                        options={[
                          { label: "Fixed", value: "fixed" },
                          { label: "Optional", value: "optional" },
                        ]}
                      />
                      <Button
                        className="delete-add-package-button delete-button"
                        type="primary"
                        onClick={() => removeHotel(index)}
                        icon={<DeleteOutlined />}
                      />
                      <hr />
                    </Space>
                  ))}
                  <Button
                    className="add-package-add-button highlighted-button"
                    type="primary"
                    icon={<PlusOutlined />}
                    block
                    onClick={addHotel}
                  >
                    Add Hotel
                  </Button>
                </div>
                <p className="add-package-error-message">{errors.hotels}</p>

                {/* AIRLINES */}
                <div
                  className={errors.airlines ? "add-package-card-error" : ""}
                  style={{ marginTop: 20 }}
                >
                  {values.airlines?.map((airline, index) => (
                    <Space key={index} style={{ width: "100%", marginBottom: 16 }}>
                      <Input
                        status={errors.airlines ? "error" : ""}
                        className="add-package-inputs"
                        placeholder="Airline Name"
                        value={airline.name}
                        onKeyDown={(e) => {
                          const allowedKeys = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                            "-",
                            " ",
                          ];
                          if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9]$/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        onChange={(e) => updateAirline(index, "name", e.target.value)}
                      />
                      <Select
                        status={errors.airlines ? "error" : ""}
                        value={airline.type}
                        placeholder="Select Type"
                        onChange={(value) => updateAirline(index, "type", value)}
                        options={[
                          { label: "Fixed", value: "fixed" },
                          { label: "Optional", value: "optional" },
                        ]}
                      />
                      <Button
                        className="delete-add-package-button delete-button"
                        type="primary"
                        onClick={() => removeAirline(index)}
                        icon={<DeleteOutlined />}
                      />
                      <hr />
                    </Space>
                  ))}
                  <Button
                    className="add-package-add-button highlighted-button"
                    type="primary"
                    icon={<PlusOutlined />}
                    block
                    onClick={addAirline}
                  >
                    Add Airline
                  </Button>
                </div>
                <p className="add-package-error-message">{errors.airlines}</p>
              </div>

              <div className="add-package-section-half add-package-section">
                <h2 className="section-headers">Inclusions, Exclusions, and Terms & Conditions</h2>

                {/* INCLUSIONS */}
                <label className="add-package-input-labels">Inclusions</label>
                <Input.TextArea
                  status={errors.inclusions ? "error" : ""}
                  value={values.inclusions}
                  onChange={(e) => handleTextAreaChange("inclusions", e)}
                  autoSize={{ minRows: 4, maxRows: 10 }}
                  className="add-package-input-textarea"
                  style={{ marginBottom: 5 }}
                />
                <p className="add-package-error-message">{errors.inclusions}</p>

                {/* EXCLUSIONS */}
                <label className="add-package-input-labels" style={{ marginTop: 15 }}>
                  Exclusions
                </label>
                <Input.TextArea
                  status={errors.exclusions ? "error" : ""}
                  value={values.exclusions}
                  onChange={(e) => handleTextAreaChange("exclusions", e)}
                  autoSize={{ minRows: 4, maxRows: 10 }}
                  className="add-package-input-textarea"
                  style={{ marginBottom: 5 }}
                />
                <p className="add-package-error-message">{errors.exclusions}</p>

                {/* TERMS & CONDITIONS */}
                <label className="add-package-input-labels" style={{ marginTop: 15 }}>
                  Terms & Conditions
                </label>
                <Input.TextArea
                  status={errors.termsConditions ? "error" : ""}
                  value={values.termsConditions}
                  onChange={(e) => handleTextAreaChange("termsConditions", e)}
                  autoSize={{ minRows: 4, maxRows: 10 }}
                  className="add-package-input-textarea"
                  style={{ marginBottom: 5 }}
                />
                <p className="add-package-error-message">{errors.termsConditions}</p>
              </div>
            </div>




            <div className="add-package-section-half add-package-section" >
              <h2 className="section-headers">Itinerary</h2>
              {/* ITINERARIES */}
              <div
                className={errors.itineraries ? "add-package-card-error" : ""}
              >
                {Object.keys(values.itineraries ?? {}).map((day) => (
                  <div key={day} style={{ marginBottom: 24 }}>
                    <h4>{day.replace("day", "Day ")}:</h4>
                    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 520px" }}>
                        {values.itineraries[day].map((item, index) => {
                          const itineraryItem =
                            typeof item === "string"
                              ? { activity: item, isOptional: false, optionalActivity: "", optionalPrice: "" }
                              : item;

                          return (
                            <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                              <Input
                                status={errors.itineraries ? "error" : ""}
                                className="add-package-inputs"
                                value={itineraryItem.activity}
                                style={{ minWidth: 450 }}
                                onKeyDown={(e) => {
                                  const allowedKeys = [
                                    "Backspace",
                                    "Delete",
                                    "ArrowLeft",
                                    "ArrowRight",
                                    "Tab",
                                    "-",
                                    " ",
                                  ];
                                  if (!allowedKeys.includes(e.key) && !/^[A-Za-z0-9]$/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => updateItineraryItem(day, index, "activity", e.target.value)}
                                placeholder={`Activity ${index + 1}`}
                              />

                              <Button
                                className="delete-add-package-button delete-button"
                                type="primary"
                                onClick={() => removeItineraryItem(day, index)}
                                icon={<DeleteOutlined />}
                              />
                            </Space>
                          );
                        })}
                        <Button
                          className="add-package-add-button highlighted-button"
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => addItineraryItem(day)}
                        >
                          Add Activity
                        </Button>
                      </div>

                      <div style={{ flex: "1 1 260px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <label className="add-package-input-labels" style={{ margin: 0 }}>
                            Itinerary Images
                          </label>
                          <Button
                            type="primary"
                            className="package-image-action-button highlighted-button"
                            onClick={() => itineraryImageInputRefs.current[day]?.click()}
                            disabled={(values.itinerariesImages?.[day] || []).length >= 3}
                          >
                            <UploadOutlined />
                            Upload Image
                          </Button>
                        </div>
                        <input
                          ref={(el) => {
                            itineraryImageInputRefs.current[day] = el;
                          }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleItineraryImageChange(day, e)}
                          style={{ display: "none" }}
                        />
                        <p className="package-image-help">PNG/JPG up to 2MB. Max 3 images.</p>

                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                            marginTop: 12,
                          }}
                        >
                          {(values.itinerariesImages?.[day] || []).map((img, index) => (
                            <div
                              key={`${day}-${index}`}
                              style={{
                                position: "relative",
                                width: 135,
                                height: 135,
                                borderRadius: 8,
                                overflow: "hidden",
                                border: "1px solid #e0e0e0",
                              }}
                            >
                              <img
                                src={
                                  img instanceof File
                                    ? URL.createObjectURL(img)
                                    : img || null
                                }
                                alt={`Itinerary ${day} ${index + 1}`}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                              <Button
                                type="text"
                                size="small"
                                className="delete-add-package-button delete-button"
                                onClick={() => removeItineraryImage(day, index)}
                                style={{ position: "absolute", top: 4, right: 4 }}
                              >
                                <DeleteOutlined />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid #e0e0e0", marginTop: 20 }} />
                  </div>
                ))}
              </div>
              <p className="add-package-error-message">{errors.itineraries}</p>
            </div>






            <div className="add-package-section-half add-package-section" style={{ marginTop: 40 }}>
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
                  type="primary"
                  className="package-image-action-button highlighted-button"
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
                      className="package-image-container"
                      key={index}
                    >
                      <img
                        src={
                          img instanceof File
                            ? URL.createObjectURL(img)
                            : img || null
                        }
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
                        className="delete-add-package-button delete-button"
                        type="text"
                        size="small"
                        onClick={() => removeImage(index)}>
                        <DeleteOutlined />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="footer-add-packages">
            <Button
              className="save-package-button backsubmit-button"
              type="primary"
              block
              onClick={savePackage}
            >
              {isEdit ? "Update Package" : "Save Package"}
            </Button>
          </div>

        </div>
      )}
    </ConfigProvider>
  );
}
