import { Card, Row, Col } from "antd";
import "../style/adminDashboard.css";

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="page-header">Dashboard</h1>

      <Row gutter={20}>
        <Col span={6}>
          <Card className="dash-card">
            <p>Total Transactions</p>
            <h2>__</h2>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="dash-card">
            <p>Total Bookings</p>
            <h2>__</h2>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="dash-card">
            <p>Total Users</p>
            <h2>__</h2>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="dash-card">
            <p>Total Packages</p>
            <h2>__</h2>
          </Card>
        </Col>
      </Row>

      <div className="dashboard-section">
        <h2>Recent Activity</h2>

        <Card className="activity-card">

        </Card>
      </div>

    </div>
  );
}
