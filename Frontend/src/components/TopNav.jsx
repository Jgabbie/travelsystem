import { Layout, Badge, Avatar } from "antd";
import { BellOutlined, UserOutlined } from "@ant-design/icons";
import "../style/topnav.css";

const { Header } = Layout;

export default function TopNav() {
  return (
    <Header className="topnav">
      <div className="brand">M&RC Travel and Tours</div>

      <div className="topnav-right">
        <span>Admin</span>
        <Avatar icon={<UserOutlined />} />
      </div>
    </Header>
  );
}
