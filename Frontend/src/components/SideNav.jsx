import { Layout } from "antd";
import { NavLink } from "react-router-dom";
import "../style/sidenav.css";

const { Sider } = Layout;

export default function SideNav() {
  return (
    <Sider className="sidenav" width={220}>

      <div className="nav-top">
        <NavLink to="/dashboard" className="nav-item">Dashboard</NavLink>
        <NavLink to="/bookings" className="nav-item">Bookings</NavLink>
        <NavLink to="/users" className="nav-item">Users</NavLink>
        <NavLink to="/transactions" className="nav-item">Transactions</NavLink>
        <NavLink to="/packages" className="nav-item">Packages</NavLink>
      </div>

      <div className="nav-bottom">
        <NavLink to="/login" className="nav-item logout">Logout</NavLink>
      </div>

    </Sider>
  );
}
