import { Layout } from "antd";
import { Outlet } from "react-router-dom";
import SideNavEmployee from "./SideNavEmployee";
import TopNavEmployee from "./TopNavEmployee";
import "../style/admin/admin.css";

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
