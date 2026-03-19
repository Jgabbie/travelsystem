import { Layout } from "antd";
import { NavLink } from "react-router-dom";
import "../style/components/sidenav.css";

const { Sider } = Layout;

export default function SideNavEmployee() {

    return (
        <>
            <Sider className="sidenav" width={220}>

                <div className="nav-top">
                    <NavLink to="/employee/dashboard" className="nav-item">Dashboard</NavLink>
                    <NavLink to="/employee/bookings" className="nav-item">Bookings</NavLink>
                    <NavLink to="/employee/transactions" className="nav-item">Transactions</NavLink>
                    <NavLink to="/employee/package-quotation" className="nav-item">Quotation Requests</NavLink>
                    <NavLink to="/employee/cancellation-requests" className="nav-item">Cancellation Requests</NavLink>
                    <NavLink to="/employee/packages" className="nav-item">Packages</NavLink>
                    <NavLink to="/employee/ratings" className="nav-item">Review Ratings</NavLink>
                    <NavLink to="/employee/visa-services" className="nav-item">Visa Services</NavLink>
                    <NavLink to="/employee/passport-applications" className="nav-item">Passport Applications</NavLink>
                    <NavLink to="/employee/visa-applications" className="nav-item">VISA Applications</NavLink>
                </div>

            </Sider>
        </>

    );
}