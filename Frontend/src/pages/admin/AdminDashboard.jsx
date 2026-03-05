import { Card, Row, Col, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { DollarCircleOutlined, ShoppingCartOutlined, UserOutlined, AppstoreOutlined } from "@ant-design/icons";
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { ChartContainer, LinePlot, AreaPlot, ChartsXAxis, ChartsYAxis, ChartsTooltip } from "@mui/x-charts";
import axiosInstance from "../../config/axiosConfig";
import '../../style/admin/admindashboard.css';

export default function AdminDashboard() {
  const themeColor = "#305797";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyRevenue = [120000, 98000, 135000, 160000, 142000, 175000, 190000, 210000, 195000, 220000, 205000, 240000];
  const bookingTrend = [80, 92, 110, 125, 118, 140, 150, 165, 158, 172, 168, 190];
  const paymentSplit = [
    { id: 0, value: 48, label: "Domestic" },
    { id: 1, value: 32, label: "International" },
  ];

  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalBookings: 0,
    totalUsers: 0,
    totalPackages: 0
  });
  const [loading, setLoading] = useState(true);
  const [barWidth, setBarWidth] = useState(0);
  const [pieWidth, setPieWidth] = useState(0);
  const barRef = useRef(null);
  const pieRef = useRef(null);


  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get("/admin/dashboard-stats");
        setStats(response.data);
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        message.error("Unable to load dashboard stats.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const updateWidth = (node, setter, fallback) => {
      if (!node) return;
      const nextWidth = Math.max(node.clientWidth || fallback, 280);
      setter(nextWidth);
    };

    const fallback = Math.max(window.innerWidth - 80, 320);
    updateWidth(barRef.current, setBarWidth, fallback);
    updateWidth(pieRef.current, setPieWidth, fallback);

    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => {
        const nextFallback = Math.max(window.innerWidth - 80, 320);
        updateWidth(barRef.current, setBarWidth, nextFallback);
        updateWidth(pieRef.current, setPieWidth, nextFallback);
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const rawWidth = entry.contentRect?.width;

        const width = Number.isFinite(rawWidth)
          ? Math.max(Math.floor(rawWidth), 280)
          : 280;

        if (entry.target === barRef.current) setBarWidth(width);
        if (entry.target === pieRef.current) setPieWidth(width);
      });
    });

    if (barRef.current) observer.observe(barRef.current);
    if (pieRef.current) observer.observe(pieRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <h1 className="page-header">Dashboard</h1>

      <Row gutter={20}>
        <Col span={6}>
          <Card className="dash-card">
            <div className="dash-card-content-vertical">
              <p>Total Transactions</p>
              <div className="dash-text">
                <DollarCircleOutlined className="dash-icon" />
                <h2>{loading ? "..." : stats.totalTransactions}</h2>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="dash-card">
            <div className="dash-card-content-vertical">
              <p>Total Bookings</p>
              <div className="dash-text">
                <ShoppingCartOutlined className="dash-icon" />
                <h2>{loading ? "..." : stats.totalBookings}</h2>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="dash-card">
            <div className="dash-card-content-vertical">
              <p>Total Users</p>
              <div className="dash-text">
                <UserOutlined className="dash-icon" />
                <h2>{loading ? "..." : stats.totalUsers}</h2>
              </div>
            </div>
          </Card>
        </Col>

        <Col span={6}>
          <Card className="dash-card">
            <div className="dash-card-content-vertical">
              <p>Total Packages</p>
              <div className="dash-text">
                <AppstoreOutlined className="dash-icon" />
                <h2>{loading ? "..." : stats.totalPackages}</h2>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <div className="dashboard-charts">
        <Card className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <h2>Revenue Overview</h2>
            <p>Monthly revenue for the year</p>
          </div>
          <div className="dashboard-chart-body is-tall" ref={barRef}>
            {barWidth > 0 && (
              <BarChart
                xAxis={[{ data: months, scaleType: "band" }]}
                series={[
                  {
                    data: monthlyRevenue,
                    color: themeColor,
                    valueFormatter: (value) => `₱${value.toLocaleString()}`
                  }
                ]}
                width={Math.min(1200, barWidth)}
                height={320}
              />
            )}
          </div>
        </Card>

        <div className="dashboard-chart-row">
          <Card className="dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h2>Booking Types</h2>
              <p>Share by booking types (Domestic or International)</p>
            </div>
            <div className="dashboard-chart-body" ref={pieRef}>
              {pieWidth > 0 && (
                <PieChart
                  series={[
                    {
                      data: paymentSplit,
                      innerRadius: 42,
                      outerRadius: 90,
                      paddingAngle: 2,
                      cornerRadius: 4,
                      highlightScope: { faded: "global", highlighted: "item" },
                      faded: { innerRadius: 40, additionalRadius: -4 }
                    }
                  ]}
                  colors={[themeColor, "#4b74b8", "#89a5d6"]}
                  width={Math.min(560, pieWidth)}
                  height={260}
                  slotProps={{
                    legend: {
                      direction: "row",
                      position: { vertical: "bottom", horizontal: "middle" }
                    }
                  }}
                />
              )}
            </div>
          </Card>

          <Card className="dashboard-chart-card">
            <div className="dashboard-chart-header">
              <h2>Booking Trend</h2>
              <p>Monthly booking volume</p>
            </div>

            <div
              className="dashboard-chart-body"
              style={{ width: "100%", height: 260 }}
            >
              <ChartContainer
                series={[
                  {
                    type: "line",
                    data: bookingTrend,
                    area: true,
                    color: themeColor,
                    showMark: false
                  }
                ]}
                xAxis={[{ scaleType: "point", data: months }]}
              >
                <AreaPlot />
                <LinePlot />
                <ChartsXAxis />
                <ChartsYAxis />
                <ChartsTooltip />
              </ChartContainer>
            </div>
          </Card>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Recent Activity</h2>

        <Card className="activity-card">

        </Card>
      </div>

    </div>
  );
}
