import { Layout, Modal } from "antd";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import axiosInstance from "../config/axiosConfig";
import "../style/components/sidenav.css";

const { Sider } = Layout;

export default function SideNav() {

  return (
    <>
      <Sider className="sidenav" width={220}>

        <div className="nav-top">
          <NavLink to="/dashboard" className="nav-item">Dashboard</NavLink>
          <NavLink to="/users" className="nav-item">Users</NavLink>
          <NavLink to="/bookings" className="nav-item">Bookings</NavLink>
          <NavLink to="/transactions" className="nav-item">Transactions</NavLink>
          <NavLink to="/package-quotation" className="nav-item">Quotation Requests</NavLink>
          <NavLink to="/cancellation-requests" className="nav-item">Cancellation Requests</NavLink>
          <NavLink to="/packages" className="nav-item">Packages</NavLink>
          <NavLink to="/ratings" className="nav-item">Review Ratings</NavLink>
          <NavLink to="/visa-services" className="nav-item">Visa Services</NavLink>
          <NavLink to="/passport-applications" className="nav-item">Passport Applications</NavLink>
          <NavLink to="/visa-applications" className="nav-item">VISA Applications</NavLink>



          <div style={{ margin: "10px 0", borderTop: "1px solid rgba(255,255,255,0.2)" }}></div>
          <NavLink to="/logging" className="nav-item">Logging</NavLink>
          <NavLink to="/auditing" className="nav-item">Auditing</NavLink>
        </div>

      </Sider>
    </>

  );
}