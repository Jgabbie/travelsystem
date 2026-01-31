import { Layout, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useAuth } from "../hooks/useAuth";
import "../style/topnav.css";

const { Header } = Layout;

export default function TopNav() {
  const { auth, setAuth } = useAuth();


  return (
    <Header className="topnav">
      <div className="brand">M&RC Travel and Tours</div>

      <div className="topnav-right">
        <span className="user-topnav">{auth?.username}</span>
        <Avatar icon={<UserOutlined />} />
      </div>
    </Header>
  );
}
