import { Input, Button, Card, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import "../style/addpackage.css";

export default function AddPackage() {
  return (
    <Card className="add-package-form">
      <h1>Add Package</h1>

      <Input placeholder="Package Name" />
      <Input placeholder="Price" />
      <Input placeholder="Location" />

      <Input.TextArea rows={4} placeholder="Description" />

      <Upload>
        <Button icon={<UploadOutlined />}>Upload Image</Button>
      </Upload>

      <Button type="primary">Save Package</Button>
    </Card>
  );
}
