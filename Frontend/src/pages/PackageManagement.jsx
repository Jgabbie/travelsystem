import { Input, Button, Card } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import "../style/packages.css";

export default function PackageManagement() {
  const navigate = useNavigate();

  const packages = [
    { id: 1, name: "Boracay Tour Package", price: "₱12,000" },
    { id: 2, name: "Palawan Island Escape", price: "₱18,000" },
    { id: 3, name: "Bohol Adventure Trip", price: "₱10,500" }
  ];

  return (
    <>
      <h1 className="page-header">Package Management</h1>

      <div className="package-toolbar">
        <Input prefix={<SearchOutlined />} placeholder="Search package..." />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate("/packages/add")}
        >
          Add Package
        </Button>
      </div>

      {packages.map(pkg => (
        <Card key={pkg.id} className="package-card">
          <h3>{pkg.name}</h3>
          <strong>{pkg.price}</strong>
        </Card>
      ))}
    </>
  );
}
