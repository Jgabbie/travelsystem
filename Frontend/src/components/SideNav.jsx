import { Layout, Menu } from "antd";
import {
  CalendarOutlined,
  UserOutlined,
  AppstoreOutlined,
  LogoutOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/sidenav.css";

const { Sider } = Layout;

export default function SideNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Sider className="sidenav" theme="dark">
      <Menu
        selectedKeys={[pathname]}
        mode="inline"
        onClick={({ key }) => navigate(key)}
        items={[
          { key: "/bookings", icon: <CalendarOutlined />, label: "Bookings" },
          { key: "/users", icon: <UserOutlined />, label: "Users" },
          { key: "/packages", icon: <AppstoreOutlined />, label: "Packages" },
          { key: "/login", icon: <LogoutOutlined />, label: "Logout" }
        ]}
      />
    </Sider>
  );
}
