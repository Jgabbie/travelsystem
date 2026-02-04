import { useEffect, useState } from "react";
import {
  Input,
  Button,
  Card,
  Upload,
  Radio,
  DatePicker,
  Select,
  Space,
  Checkbox
} from "antd";
import { UploadOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import "../style/addpackage.css";
import axiosInstance from "../config/axiosConfig";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";


const { RangePicker } = DatePicker;

export default function AddPackage() {

  const navigate = useNavigate();

  const { id } = useParams();
  const isEdit = Boolean(id);

  const [packageInfo, setPackageInfo] = useState({
    name: "",
    code: "",
    pricePerPax: 0,
    availableSlots: 0,
    description: ""
  });
  const [dateType, setDateType] = useState("any");
  const [duration, setDuration] = useState(undefined);
  const [hotels, setHotels] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [packageType, setPackageType] = useState("domestic");
  const [addons, setAddons] = useState({
    luggage: false,
    meals: false,
    insurance: false,
    optionalTours: false,
    optionalToursDetail: ""
  });
  const [inclusions, setInclusions] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [termsConditions, setTermsConditions] = useState([]);
  const [itineraries, setItineraries] = useState({}); // { day1: ['activity1', 'activity2'] }
  const [dateRanges, setDateRanges] = useState([]); // store multiple ranges

  const addDateRange = () => {
    setDateRanges([...dateRanges, null]); // add empty placeholder
  };

  const removeDateRange = (index) => {
    setDateRanges(dateRanges.filter((_, i) => i !== index));
  };

  const updateDateRange = (index, value) => {
    const updated = [...dateRanges];
    updated[index] = value;
    setDateRanges(updated);
  };

  //hotel functions
  const addHotel = () => setHotels([...hotels, { name: "", stars: null, type: null }]);
  const updateHotel = (index, field, value) => {
    const updated = [...hotels];
    updated[index][field] = value;
    setHotels(updated);
  };
  const removeHotel = (index) => setHotels(hotels.filter((_, i) => i !== index));

  //airline functions
  const addAirline = () => setAirlines([...airlines, { name: "", type: null }]);
  const updateAirline = (index, field, value) => {
    const updated = [...airlines];
    updated[index][field] = value;
    setAirlines(updated);
  };
  const removeAirline = (index) => setAirlines(airlines.filter((_, i) => i !== index));

  //addon functions
  const handleAddonChange = (addon, checked) => {
    setAddons(prev => ({
      ...prev,
      [addon]: checked,
      optionalToursDetail: addon === "optionalTours" && !checked ? "" : prev.optionalToursDetail
    }));
  };

  //inclusion/exclusion functions
  const addBullet = (type) => {
    if (type === "inclusion") setInclusions([...inclusions, ""]);
    if (type === "exclusion") setExclusions([...exclusions, ""]);
    if (type === "termsConditions") setTermsConditions([...termsConditions, ""]);
  };

  const updateBullet = (type, index, value) => {
    if (type === "inclusion") {
      const updated = [...inclusions];
      updated[index] = value;
      setInclusions(updated);
    } else if (type === "exclusion") {
      const updated = [...exclusions];
      updated[index] = value;
      setExclusions(updated);
    } else if (type === "termsConditions") {
      const updated = [...termsConditions];
      updated[index] = value;
      setTermsConditions(updated);
    }
  };
  const removeBullet = (type, index) => {
    if (type === "inclusion") setInclusions(inclusions.filter((_, i) => i !== index));
    else if (type === "exclusion") setExclusions(exclusions.filter((_, i) => i !== index));
    else if (type === "termsConditions") setTermsConditions(termsConditions.filter((_, i) => i !== index));
  };

  //itinerary functions
  const initItinerary = (days) => {
    const temp = {};
    for (let i = 1; i <= days; i++) {
      temp[`day${i}`] = itineraries[`day${i}`] || [];
    }
    setItineraries(temp);
  };

  const addItineraryItem = (day) => {
    setItineraries(prev => ({ ...prev, [day]: [...prev[day], ""] }));
  };

  const updateItineraryItem = (day, index, value) => {
    const updatedDay = [...itineraries[day]];
    updatedDay[index] = value;
    setItineraries(prev => ({ ...prev, [day]: updatedDay }));
  };

  const removeItineraryItem = (day, index) => {
    const updatedDay = itineraries[day].filter((_, i) => i !== index);
    setItineraries(prev => ({ ...prev, [day]: updatedDay }));
  };


  //data/state testings
  console.log("Package Info:", packageInfo);
  console.log("Date:", dateType);
  console.log("Package Type:", packageType);
  console.log("Date Ranges:", dateRanges);
  console.log("Duration:", duration);
  console.log("Hotels:", hotels);
  console.log("Airlines:", airlines);
  console.log("Addons:", addons);
  console.log("Inclusions:", inclusions);
  console.log("Exclusions:", exclusions);
  console.log("Itineraries:", itineraries);

  //add package function

  const savePackage = async () => {
    const payload = {
      ...packageInfo,
      packageType,
      dateRanges,
      duration,
      hotels,
      airlines,
      addons,
      inclusions,
      exclusions,
      itineraries
    };

    try {
      if (isEdit) {
        await axiosInstance.put(`/package/update-package/${id}`, payload);
      } else {
        await axiosInstance.post("/package/add-package", payload);
      }

      navigate("/packages");
    } catch (err) {
      console.error("Failed to save package:", err);
    }
  };


  useEffect(() => {
    if (!isEdit) return;

    const getPackage = async () => {
      try {
        const res = await axiosInstance.get(`/package/get-package/${id}`);
        const pkg = res.data;

        setPackageInfo({
          name: pkg.packageName,
          code: pkg.packageCode,
          pricePerPax: pkg.packagePricePerPax,
          availableSlots: pkg.packageAvailableSlots,
          description: pkg.packageDescription
        });

        setPackageType(pkg.packageType);
        setDuration(pkg.packageDuration);

        setHotels(pkg.packageHotels || []);
        setAirlines(pkg.packageAirlines || []);
        setAddons(pkg.packageAddons || {});
        setInclusions(pkg.packageInclusions || []);
        setExclusions(pkg.packageExclusions || []);
        setItineraries(pkg.packageItineraries || {});

        if (pkg.packageSpecificDate?.length) {
          setDateType("specified");
          setDateRanges(
            pkg.packageSpecificDate.map(range => [dayjs(range[0]), dayjs(range[1])])
          );
        } else {
          setDateType("any");
        }

      } catch (err) {
        console.error("Failed to load package", err);
      }
    };

    getPackage();
  }, [id]);


  return (
    <div>

      <Card className="add-package-form">
        <div className="add-package-header-container">
          <h1>{isEdit ? "Edit Package" : "Add Package"}</h1>
          <Button className="back-add-package-button" onClick={() => { navigate("/packages") }}>Back to Package Management</Button>
        </div>

        <div className="add-package-container">

          <h2 className="section-headers">Package Information</h2>

          <label className="add-package-input-labels">Package Name</label>
          <Input value={packageInfo.name} className="add-package-inputs" placeholder="Package Name" style={{ marginBottom: 10 }} onChange={(e) => { setPackageInfo({ ...packageInfo, name: e.target.value }) }} />

          <label className="add-package-input-labels">Package Code</label>
          <Input value={packageInfo.code} className="add-package-inputs" placeholder="Package Code" style={{ marginBottom: 10 }} onChange={(e) => { setPackageInfo({ ...packageInfo, code: e.target.value }) }} />

          <label className="add-package-input-labels">Price Per Pax</label>
          <Input value={packageInfo.pricePerPax} className="add-package-inputs" placeholder="Price Per Pax" style={{ marginBottom: 10 }} onChange={(e) => { setPackageInfo({ ...packageInfo, pricePerPax: e.target.value }) }} />

          <label className="add-package-input-labels">Available Slots</label>
          <Input value={packageInfo.availableSlots} className="add-package-inputs" placeholder="Available Slots" style={{ marginBottom: 10 }} onChange={(e) => { setPackageInfo({ ...packageInfo, availableSlots: e.target.value }) }} />

          <label className="add-package-input-labels">Package Description</label>
          <Input.TextArea value={packageInfo.description} className="add-package-input-textarea" autoSize={{ minRows: 4, maxRows: 8 }} placeholder="Package Description" style={{ marginBottom: 10 }} onChange={(e) => { setPackageInfo({ ...packageInfo, description: e.target.value }) }} />

          <h2 className="section-headers">Date Availability, Tour Duration and Package Type</h2>
          {/* Date Availability */}
          <label className="add-package-input-labels">Date Availability</label>
          <div style={{ marginBottom: 10 }}>
            <Radio.Group
              className="radio-button-add-package"
              value={dateType}
              onChange={(e) => setDateType(e.target.value)}
            >
              <Radio value="any">Any Date</Radio>
              <Radio value="specified">Specified Date</Radio>
            </Radio.Group>
          </div>

          {dateType === "specified" && (
            <div className="startenddates-add-package">
              <label className="add-package-input-labels" style={{ marginBottom: 8 }}>Start and End Dates</label>
              {dateRanges.map((range, index) => (
                <Space key={index} style={{ marginBottom: 10, marginTop: 10 }}>
                  <RangePicker
                    value={range}
                    onChange={(value) => updateDateRange(index, value)}
                    style={{ width: 300 }}
                  />
                  <Button className="delete-add-package-button" danger onClick={() => removeDateRange(index)} icon={<DeleteOutlined />} />
                </Space>
              ))}
              <Button className="add-package-add-button" type="dashed" onClick={addDateRange}>
                Add Date Range
              </Button>
            </div>
          )}

          {/* Duration */}
          <label className="add-package-input-labels">Tour Duration</label>
          <Select
            className="add-package-duration-select"
            placeholder="Duration (Days)"
            style={{ width: "100%", marginBottom: 10 }}
            value={duration}
            onChange={(value) => {
              setDuration(value);
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

          <label className="add-package-input-labels">Package Type</label>
          <div style={{ marginBottom: 10 }}>
            <Radio.Group
              className="radio-button-add-package"
              value={packageType}
              onChange={(e) => setPackageType(e.target.value)}
            >
              <Radio value="domestic">Domestic</Radio>
              <Radio value="international">International</Radio>
            </Radio.Group>
          </div>

          <h2 className="section-headers">Hotels, Airline, and Addons</h2>

          {/* HOTELS */}
          <Card size="small" title="Hotels" style={{ marginTop: 5 }}>
            {hotels.map((hotel, index) => (
              <Space key={index} style={{ width: "100%", marginBottom: 16 }}>
                <Input className="add-package-inputs" placeholder="Hotel Name" value={hotel.name} onChange={(e) => updateHotel(index, "name", e.target.value)} />
                <Select
                  placeholder="Hotel Stars"
                  value={hotel.stars}
                  onChange={(value) => updateHotel(index, "stars", value)}
                  options={[
                    { label: "3 Stars", value: 3 },
                    { label: "4 Stars", value: 4 },
                    { label: "5 Stars", value: 5 }
                  ]}
                />
                <Select
                  placeholder="Hotel Type"
                  value={hotel.type}
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

          <Card size="small" title="Airlines" style={{ marginTop: 20 }}>
            {airlines.map((airline, index) => (
              <Space key={index} style={{ width: "100%", marginBottom: 16 }}>
                <Input className="add-package-inputs" placeholder="Airline Name" value={airline.name} onChange={(e) => updateAirline(index, "name", e.target.value)} />
                <Select
                  placeholder="Airline Type" value={airline.type}
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

          {/* ADDONS */}
          <Card size="small" title="Addons" style={{ marginTop: 20, marginBottom: 15 }}>
            <Checkbox checked={addons.luggage} onChange={(e) => handleAddonChange("luggage", e.target.checked)}>Luggage</Checkbox>
            <Checkbox checked={addons.meals} onChange={(e) => handleAddonChange("meals", e.target.checked)}>Meals</Checkbox>
            <Checkbox checked={addons.insurance} onChange={(e) => handleAddonChange("insurance", e.target.checked)}>Travel Insurance</Checkbox>
            <Checkbox checked={addons.optionalTours} onChange={(e) => handleAddonChange("optionalTours", e.target.checked)}>Optional Tours</Checkbox>

            {addons.optionalTours && (
              <Input className="add-package-inputs" placeholder="Optional Tours Details" value={addons.optionalToursDetail} onChange={(e) => setAddons(prev => ({ ...prev, optionalToursDetail: e.target.value }))} style={{ marginTop: 10 }} />
            )}
          </Card>

          <h2 className="section-headers">Inclusions, Exclusions, and Terms & Conditions</h2>

          {/* INCLUSIONS */}
          <Card size="small" title="Inclusions" style={{ marginTop: 5 }}>
            {inclusions.map((item, index) => (
              <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                <Input className="add-package-inputs" value={item} onChange={(e) => updateBullet("inclusion", index, e.target.value)} placeholder="Inclusion" />
                <Button className="delete-add-package-button" danger onClick={() => removeBullet("inclusion", index)} icon={<DeleteOutlined />} />
              </Space>
            ))}
            <Button className="add-package-add-button" type="dashed" icon={<PlusOutlined />} block onClick={() => addBullet("inclusion")}>Add Inclusion</Button>
          </Card>

          {/* EXCLUSIONS */}
          <Card size="small" title="Exclusions" style={{ marginTop: 20 }}>
            {exclusions.map((item, index) => (
              <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                <Input className="add-package-inputs" value={item} onChange={(e) => updateBullet("exclusion", index, e.target.value)} placeholder="Exclusion" />
                <Button className="delete-add-package-button" danger onClick={() => removeBullet("exclusion", index)} icon={<DeleteOutlined />} />
              </Space>
            ))}
            <Button className="add-package-add-button" type="dashed" icon={<PlusOutlined />} block onClick={() => addBullet("exclusion")}>Add Exclusion</Button>
          </Card>

          <Card size="small" title="Terms and Conditions" style={{ marginTop: 20, marginBottom: 15 }}>
            {termsConditions.map((item, index) => (
              <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                <Input className="add-package-inputs" value={item} onChange={(e) => updateBullet("termsConditions", index, e.target.value)} placeholder="Terms and Conditions" />
                <Button className="delete-add-package-button" danger onClick={() => removeBullet("termsConditions", index)} icon={<DeleteOutlined />} />
              </Space>
            ))}
            <Button className="add-package-add-button" type="dashed" icon={<PlusOutlined />} block onClick={() => addBullet("termsConditions")}>Add Inclusion</Button>
          </Card>

          <h2 className="section-headers">Itinerary</h2>

          {/* ITINERARIES */}
          <Card size="small" title="Itineraries" style={{ marginTop: 5 }}>
            {Object.keys(itineraries).map(day => (
              <div key={day} style={{ marginBottom: 20 }}>
                <h4>{day.replace("day", "Day ")}:</h4>
                {itineraries[day].map((item, index) => (
                  <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                    <Input
                      className="add-package-inputs"
                      value={item}
                      onChange={(e) => updateItineraryItem(day, index, e.target.value)}
                      placeholder={`Activity ${index + 1}`}
                    />
                    <Button className="delete-add-package-button" danger onClick={() => removeItineraryItem(day, index)} icon={<DeleteOutlined />} />
                  </Space>
                ))}
                <Button className="add-package-add-button" type="dashed" icon={<PlusOutlined />} onClick={() => addItineraryItem(day)}>
                  Add Activity
                </Button>
              </div>
            ))}
          </Card>

          {/* Image Upload */}
          {/* <Upload style={{ marginTop: 20 }}>
            <Button icon={<UploadOutlined />}>Upload Image</Button>
          </Upload> */}
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

  );
}
