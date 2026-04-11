import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import SideNavEmployee from "../sidenav/SideNavEmployee";
import TopNavEmployee from "../topnav/TopNavEmployee";
import "../../style/admin/admin.css";

const { Content } = Layout;

export default function EmployeeLayout() {
    return (
        <Layout className="admin-layout">
            <SideNavEmployee />
            <Layout>
                <TopNavEmployee />
                <Content className="admin-content">
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
