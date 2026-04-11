import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import SideNav from "../sidenav/SideNav";
import TopNav from "../topnav/TopNav";
import "../../style/admin/admin.css";


const { Content } = Layout;

export default function AdminLayout() {
  return (
    <Layout className="admin-layout">
      <SideNav />
      <Layout>
        <TopNav />
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
