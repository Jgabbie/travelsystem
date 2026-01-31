import { useState } from "react";
import {
  Input,
  Button,
  Card,
  Upload,
  Radio,
  DatePicker,
  Select,
  InputNumber,
  Space,
  Checkbox
} from "antd";
import { UploadOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import "../style/addpackage.css";

const { RangePicker } = DatePicker;

export default function AddPackage() {
  const [dateType, setDateType] = useState("any");
  const [duration, setDuration] = useState(undefined);
  const [hotels, setHotels] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [addons, setAddons] = useState({
    luggage: false,
    meals: false,
    insurance: false,
    optionalTours: false,
    optionalToursDetail: ""
  });
  const [inclusions, setInclusions] = useState([]);
  const [exclusions, setExclusions] = useState([]);
  const [itineraries, setItineraries] = useState({}); // { day1: ['activity1', 'activity2'] }

  // --- HOTELS ---
  const addHotel = () => setHotels([...hotels, { name: "", stars: null, type: null }]);
  const updateHotel = (index, field, value) => {
    const updated = [...hotels];
    updated[index][field] = value;
    setHotels(updated);
  };
  const removeHotel = (index) => setHotels(hotels.filter((_, i) => i !== index));

  // --- AIRLINES ---
  const addAirline = () => setAirlines([...airlines, { name: "", type: null }]);
  const updateAirline = (index, field, value) => {
    const updated = [...airlines];
    updated[index][field] = value;
    setAirlines(updated);
  };
  const removeAirline = (index) => setAirlines(airlines.filter((_, i) => i !== index));

  // --- ADDONS ---
  const handleAddonChange = (addon, checked) => {
    setAddons(prev => ({
      ...prev,
      [addon]: checked,
      optionalToursDetail: addon === "optionalTours" && !checked ? "" : prev.optionalToursDetail
    }));
  };

  // --- INCLUSIONS/EXCLUSIONS ---
  const addBullet = (type) => {
    if (type === "inclusion") setInclusions([...inclusions, ""]);
    if (type === "exclusion") setExclusions([...exclusions, ""]);
  };
  const updateBullet = (type, index, value) => {
    if (type === "inclusion") {
      const updated = [...inclusions];
      updated[index] = value;
      setInclusions(updated);
    } else {
      const updated = [...exclusions];
      updated[index] = value;
      setExclusions(updated);
    }
  };
  const removeBullet = (type, index) => {
    if (type === "inclusion") setInclusions(inclusions.filter((_, i) => i !== index));
    else setExclusions(exclusions.filter((_, i) => i !== index));
  };

  // --- ITINERARIES ---
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

  return (
    <div>
      <Card className="add-package-form">
        <h1>Add Package</h1>
        <div className="add-package-container">
          <Input placeholder="Package Name" style={{ marginBottom: 10 }} />
          <Input placeholder="Package Code" style={{ marginBottom: 10 }} />
          <InputNumber
            placeholder="Price per Pax"
            style={{ width: "100%", marginBottom: 10 }}
            min={0}
          />

          {/* Date Availability */}
          <div style={{ marginBottom: 10 }}>
            <label>Date Availability</label>
            <Radio.Group
              value={dateType}
              onChange={(e) => setDateType(e.target.value)}
            >
              <Radio value="any">Any Date</Radio>
              <Radio value="specified">Specified Date</Radio>
            </Radio.Group>
          </div>

          {dateType === "specified" && <RangePicker style={{ width: "100%", marginBottom: 10 }} />}

          {/* Duration */}
          <Select
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

          {/* Package Type */}
          <div style={{ marginBottom: 10 }}>
            <label>Package Type</label>
            <Radio.Group>
              <Radio value="domestic">Domestic</Radio>
              <Radio value="international">International</Radio>
            </Radio.Group>
          </div>

          <InputNumber
            placeholder="Available Slots"
            style={{ width: "100%", marginBottom: 10 }}
            min={1}
          />

          <Input.TextArea rows={4} placeholder="Package Description" style={{ marginBottom: 10 }} />

          {/* HOTELS */}
          <Card size="small" title="Hotels" style={{ marginTop: 20 }}>
            {hotels.map((hotel, index) => (
              <Space key={index} direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
                <Input placeholder="Hotel Name" value={hotel.name} onChange={(e) => updateHotel(index, "name", e.target.value)} />
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
                <Button danger onClick={() => removeHotel(index)}>Remove Hotel</Button>
                <hr />
              </Space>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} block onClick={addHotel}>Add Hotel</Button>
          </Card>

          {/* AIRLINES */}
          <Card size="small" title="Airlines" style={{ marginTop: 20 }}>
            {airlines.map((airline, index) => (
              <Space key={index} direction="vertical" style={{ width: "100%", marginBottom: 16 }}>
                <Input placeholder="Airline Name" value={airline.name} onChange={(e) => updateAirline(index, "name", e.target.value)} />
                <Select
                  placeholder="Airline Type" value={airline.type}
                  onChange={(value) => updateAirline(index, "type", value)}
                  options={[
                    { label: "Fixed", value: "fixed" },
                    { label: "Optional", value: "optional" }
                  ]}
                />
                <Button danger onClick={() => removeAirline(index)}>Remove Airline</Button>
                <hr />
              </Space>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} block onClick={addAirline}>Add Airline</Button>
          </Card>

          {/* ADDONS */}
          <Card size="small" title="Addons" style={{ marginTop: 20 }}>
            <Checkbox checked={addons.luggage} onChange={(e) => handleAddonChange("luggage", e.target.checked)}>Luggage</Checkbox>
            <Checkbox checked={addons.meals} onChange={(e) => handleAddonChange("meals", e.target.checked)}>Meals</Checkbox>
            <Checkbox checked={addons.insurance} onChange={(e) => handleAddonChange("insurance", e.target.checked)}>Travel Insurance</Checkbox>
            <Checkbox checked={addons.optionalTours} onChange={(e) => handleAddonChange("optionalTours", e.target.checked)}>Optional Tours</Checkbox>

            {addons.optionalTours && (
              <Input placeholder="Optional Tours Details" value={addons.optionalToursDetail} onChange={(e) => setAddons(prev => ({ ...prev, optionalToursDetail: e.target.value }))} style={{ marginTop: 10 }} />
            )}
          </Card>

          {/* INCLUSIONS */}
          <Card size="small" title="Inclusions" style={{ marginTop: 20 }}>
            {inclusions.map((item, index) => (
              <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                <Input value={item} onChange={(e) => updateBullet("inclusion", index, e.target.value)} placeholder="Inclusion" />
                <Button danger onClick={() => removeBullet("inclusion", index)} icon={<DeleteOutlined />} />
              </Space>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} block onClick={() => addBullet("inclusion")}>Add Inclusion</Button>
          </Card>

          {/* EXCLUSIONS */}
          <Card size="small" title="Exclusions" style={{ marginTop: 20 }}>
            {exclusions.map((item, index) => (
              <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                <Input value={item} onChange={(e) => updateBullet("exclusion", index, e.target.value)} placeholder="Exclusion" />
                <Button danger onClick={() => removeBullet("exclusion", index)} icon={<DeleteOutlined />} />
              </Space>
            ))}
            <Button type="dashed" icon={<PlusOutlined />} block onClick={() => addBullet("exclusion")}>Add Exclusion</Button>
          </Card>

          {/* ITINERARIES */}
          <Card size="small" title="Itineraries" style={{ marginTop: 20 }}>
            {Object.keys(itineraries).map(day => (
              <div key={day} style={{ marginBottom: 20 }}>
                <h4>{day.replace("day", "Day ")}:</h4>
                {itineraries[day].map((item, index) => (
                  <Space key={index} style={{ display: "flex", marginBottom: 8 }}>
                    <Input
                      value={item}
                      onChange={(e) => updateItineraryItem(day, index, e.target.value)}
                      placeholder={`Activity ${index + 1}`}
                    />
                    <Button danger onClick={() => removeItineraryItem(day, index)} icon={<DeleteOutlined />} />
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => addItineraryItem(day)}>
                  Add Activity
                </Button>
              </div>
            ))}
          </Card>

          {/* Image Upload */}
          <Upload style={{ marginTop: 20 }}>
            <Button icon={<UploadOutlined />}>Upload Image</Button>
          </Upload>
        </div>



        <Button type="primary" block style={{ marginTop: 20 }}>
          Save Package
        </Button>
      </Card>
    </div>

  );
}
