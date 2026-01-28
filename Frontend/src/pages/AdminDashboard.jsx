import { Card, Row, Col } from "antd";
import "../style/adminDashboard.css";

export default function AdminDashboard() {
  return (
    <div className="admin-dashboard">

      <h1>Dashboard</h1>

      <Row gutter={20}>

        <Col span={6}>
          <Card className="dash-card">
            <p>Total Transactions</p>
            <h2>140</h2>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="dash-card">
            <p>Total Bookings</p>
            <h2>56</h2>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="dash-card">
            <p>Total Users</p>
            <h2>32</h2>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="dash-card">
            <p>Total Packages</p>
            <h2>12</h2>
          </Card>
        </Col>

      </Row>

      <div className="dashboard-section">
        <h2>Recent Activity</h2>

        <Card className="activity-card">
          <p>New booking added</p>
          <p>User registered</p>
          <p>Package updated</p>
          <p>Transaction completed</p>
        </Card>
      </div>

    </div>
  );
}
