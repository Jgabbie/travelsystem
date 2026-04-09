import { Card, Row, Col, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { DollarCircleOutlined, ShoppingCartOutlined, UserOutlined, AppstoreOutlined } from "@ant-design/icons";
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { ChartContainer, LinePlot, AreaPlot, ChartsXAxis, ChartsYAxis, ChartsTooltip } from "@mui/x-charts";
import axiosInstance from "../../config/axiosConfig";
import '../../style/admin/admindashboard.css';

export default function AdminDashboard() {
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

  const [transactions, setTransactions] = useState([]);
  const [bookings, setBookings] = useState([]);


  //top 3 packages
  const packageCountMap = {};

  bookings.forEach((booking) => {
    const packageId = booking.packageId?._id;
    const packageName = booking.packageId?.packageName;

    if (!packageId) return;

    if (!packageCountMap[packageId]) {
      packageCountMap[packageId] = { packageName, count: 0 };
    }

    packageCountMap[packageId].count++;
  });

  const packageCountArray = Object.values(packageCountMap);

  packageCountArray.sort((a, b) => b.count - a.count);

  const top3Packages = packageCountArray.slice(0, 3);

  console.log("Top 3 most booked packages:", top3Packages);



  //booking trends
  const currentYear = new Date().getFullYear();

  const bookingTrendData = Array(12).fill(0);

  bookings.forEach((booking) => {
    if (!booking.bookingDate) return;

    const date = new Date(booking.bookingDate);

    if (date.getFullYear() !== currentYear) return;

    const monthIndex = date.getMonth();
    bookingTrendData[monthIndex]++;
  });

  const bookingTrend = bookingTrendData;

  const durationCountMap = {};

  bookings.forEach((booking) => {
    const duration = booking.packageId?.packageDuration;
    if (!duration) return;
    durationCountMap[duration] = (durationCountMap[duration] || 0) + 1;
  });

  const topDurationEntries = Object.entries(durationCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([duration, count]) => ({
      label: `${duration} Days`,
      count
    }));


  // package type amount
  const bookingTypeCount = {
    domestic: 0,
    international: 0
  };

  bookings.forEach((booking) => {
    const type = booking.packageId?.packageType?.toLowerCase();

    if (type === "domestic") bookingTypeCount.domestic++;
    if (type === "international") bookingTypeCount.international++;
  });

  const paymentSplit = [
    { id: 0, value: bookingTypeCount.domestic, label: "Domestic" },
    { id: 1, value: bookingTypeCount.international, label: "International" },
  ];


  //transactions amount
  const monthlyRevenueData = Array(12).fill(0);

  transactions.forEach((txn) => {
    if (!txn.createdAt) return;

    const date = new Date(txn.createdAt);
    const monthIndex = date.getMonth(); // 0 = Jan, 11 = Dec

    monthlyRevenueData[monthIndex] += Number(txn.amount || 0);
  });

  const themeColor = "#305797";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyRevenue = monthlyRevenueData



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
    const fetchTransactions = async () => {
      try {
        const response = await axiosInstance.get("/transaction/all-transactions");
        console.log("Fetched transactions:", response.data);

        setTransactions(response.data);

      } catch (error) {
        console.error("Failed to load transactions:", error);
        message.error("Unable to load transactions.");
      }
    };

    const fetchBookings = async () => {
      try {
        const response = await axiosInstance.get("/booking/all-bookings")
        console.log("Fetched bookings:", response.data);

        setBookings(response.data);

      } catch (error) {
        console.error("Failed to load bookings:", error);
        message.error("Unable to load bookings.");
      }
    }

    fetchTransactions();
    fetchBookings();
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
        <h2>Top 3 Most Booked Packages</h2>

        <Row gutter={[16, 16]}>
          {top3Packages.map((pkg, idx) => (
            <Col xs={24} sm={24} md={8} key={pkg.packageName}>
              <Card
                className="top-package-card"
              >
                <div className="top-package-content">
                  <h3 className="top-package-card-name">
                    {idx + 1}. {pkg.packageName}
                  </h3>
                  <p className="top-package-card-bookings" >
                    {pkg.count} bookings
                  </p>
                  <div
                    className="top-package-card-number"
                  >
                    #{idx + 1}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <div style={{ marginTop: 24 }}>
          <h2>Most Booked Durations</h2>
          {topDurationEntries.length ? (
            <Row gutter={[16, 16]}>
              {topDurationEntries.map((entry, idx) => (
                <Col xs={24} sm={12} md={8} key={entry.label}>
                  <Card className="top-duration-card">
                    <div className="top-duration-content">
                      <h3 className="top-duration-name">{entry.label}</h3>
                      <p className="top-duration-count">{entry.count} bookings</p>
                      <div className="top-duration-rank">#{idx + 1}</div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            <div style={{ marginTop: 8, fontWeight: 600 }}>N/A</div>
          )}
        </div>
      </div>

    </div>
  );
}
