import React from "react";
import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  CalendarOutlined,
  UserOutlined,
  AppstoreOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

import { useNavigate, useLocation } from "react-router-dom";

const { Sider } = Layout;


export default function SideNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Sider className="sidenav" width={220}>

      <Menu
        selectedKeys={[pathname]}
        mode="inline"
        onClick={({ key }) => navigate(key)}
        items={[
          { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
          { key: "/bookings", icon: <CalendarOutlined />, label: "Bookings" },
          { key: "/users", icon: <UserOutlined />, label: "Users" },
          { key: "/transactions", icon: <AppstoreOutlined />, label: "Transactions" },
          { key: "/packages", icon: <AppstoreOutlined />, label: "Packages" },

        ]}
      />

      <Menu
        mode="inline"
        onClick={({ key }) => navigate(key)}
        style={{ marginTop: "auto" }}
        items={[
          { key: "/login", icon: <LogoutOutlined />, label: "Logout" }
        ]}
      />

    </Sider>
  );
}
