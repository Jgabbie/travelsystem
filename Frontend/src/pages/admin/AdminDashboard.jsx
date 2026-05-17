import { Card, Row, Col, notification } from "antd";
import { useEffect, useRef, useState } from "react";
import { DollarCircleOutlined, ShoppingCartOutlined, UserOutlined, AppstoreOutlined } from "@ant-design/icons";
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { ChartContainer, LinePlot, AreaPlot, ChartsXAxis, ChartsYAxis, ChartsTooltip } from "@mui/x-charts";
import apiFetch from "../../config/fetchConfig";
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
  const [popularPackages, setPopularPackages] = useState([]);
  const [quotations, setQuotations] = useState([]);


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

  const displayTopPackages = (Array.isArray(popularPackages) && popularPackages.length)
    ? popularPackages.map(p => ({
      packageName: p.packageName,
      count: p.bookingCount || p.bookingCount || p.count || 0,
      packageImages: p.packageImages || p.packageImages || []
    }))
    : top3Packages;


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

    // normalize (optional but recommended)
    const key = Number(duration);

    durationCountMap[key] = (durationCountMap[key] || 0) + 1;
  });

  const topDurationEntries = Object.entries(durationCountMap)
    .sort((a, b) => b[1] - a[1]) // sort by count DESC
    .slice(0, 3) // top 3
    .map(([duration, count]) => ({
      label: `${duration} Days`,
      count
    }));

  // build a map from duration -> image (take first package image found for that duration)
  const durationImageMap = {};
  // prefer popularPackages (API) first
  if (Array.isArray(popularPackages) && popularPackages.length) {
    popularPackages.forEach((p) => {
      const dur = Number(p.packageDuration || p.packageDuration || (p.packageDuration === 0 ? 0 : undefined));
      if (dur == null) return;
      const imgs = p.packageImages || p.images || [];
      const first = Array.isArray(imgs) ? imgs[0] : imgs;
      const imageUrl = first && typeof first === 'string' ? first : (first && (first.url || first.path || first.src)) || null;
      if (imageUrl && !durationImageMap[dur]) durationImageMap[dur] = imageUrl;
    });
  }
  // fallback: scan bookings' package info
  bookings.forEach((b) => {
    const dur = Number(b.packageId?.packageDuration);
    if (Number.isNaN(dur)) return;
    if (durationImageMap[dur]) return;
    const imgs = b.packageId?.packageImages || b.packageId?.images || [];
    const first = Array.isArray(imgs) ? imgs[0] : imgs;
    const imageUrl = first && typeof first === 'string' ? first : (first && (first.url || first.path || first.src)) || null;
    if (imageUrl) durationImageMap[dur] = imageUrl;
  });


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
        const response = await apiFetch.get("/admin/dashboard-stats");
        setStats(response);
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        notification.error({ message: 'Unable to load dashboard stats.', placement: 'topRight' });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await apiFetch.get("/transaction/all-transactions");

        setTransactions(response);

      } catch (error) {
        console.error("Failed to load transactions:", error);
        notification.error({ message: 'Unable to load transactions.', placement: 'topRight' });
      }
    };

    const fetchBookings = async () => {
      try {
        const response = await apiFetch.get("/booking/all-bookings")

        setBookings(response);

      } catch (error) {
        console.error("Failed to load bookings:", error);
        notification.error({ message: 'Unable to load bookings.', placement: 'topRight' });
      }
    }
    const fetchPopularPackages = async () => {
      try {
        const resp = await apiFetch.get('/package/popular-packages?limit=3');
        setPopularPackages(resp || []);
      } catch (err) {
        console.error('Failed to load popular packages', err);
      }
    };

    const fetchQuotations = async () => {
      try {
        const resp = await apiFetch.get('/quotation/all-quotations');
        setQuotations(resp || []);
      } catch (err) {
        console.error('Failed to load quotations', err);
      }
    };

    fetchTransactions();
    fetchBookings();
    fetchPopularPackages();
    fetchQuotations();
  }, []);

  // Booking status breakdown
  const bookingStatusCount = {
    pending: 0,
    notPaid: 0,
    fullyPaid: 0,
    cancelled: 0,
  };

  bookings.forEach((b) => {
    const s = (b.status || '').toString().toLowerCase();
    if (s.includes('cancel')) {
      bookingStatusCount.cancelled++;
    } else if (s === 'fully paid' || s === 'fully_paid' || s === 'paid' || s === 'successful') {
      bookingStatusCount.fullyPaid++;
    } else if (s === 'not paid' || s === 'not_paid') {
      bookingStatusCount.notPaid++;
    } else {
      bookingStatusCount.pending++;
    }
  });

  const bookingStatusSeries = [
    { id: 0, value: bookingStatusCount.pending, label: 'Pending' },
    { id: 1, value: bookingStatusCount.notPaid, label: 'Not Paid' },
    { id: 2, value: bookingStatusCount.fullyPaid, label: 'Fully Paid' },
    { id: 3, value: bookingStatusCount.cancelled, label: 'Cancelled' },
  ];

  // Conversion rate
  const completedBookingsCount = bookingStatusCount.fullyPaid;
  const totalQuotationRequests = Array.isArray(quotations) ? quotations.length : 0;
  const conversionRate = totalQuotationRequests === 0 ? 0 : (completedBookingsCount / totalQuotationRequests) * 100;

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

      <div className="dashboard-section">
        <Row className="dashboard-section" gutter={20}>
          <Col span={6}>
            <Card className="dash-card">
              <div className="dash-card-content-vertical">
                <p>Total Transactions</p>
                <div className="dash-text">
                  <DollarCircleOutlined className="dash-icon" />
                  <h2 className="dash-card-head">{loading ? "..." : stats.totalTransactions}</h2>
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
                  <h2 className="dash-card-head">{loading ? "..." : stats.totalBookings}</h2>
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
                  <h2 className="dash-card-head">{loading ? "..." : stats.totalUsers}</h2>
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
                  <h2 className="dash-card-head">{loading ? "..." : stats.totalPackages}</h2>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

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



      <div className="dashboard-chart-row" style={{ marginTop: 20 }}>
        <Card className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <h2>Booking Status Breakdown</h2>
            <p>Pending / Not Paid / Fully Paid / Cancelled</p>
          </div>
          <div className="dashboard-chart-body" style={{ minHeight: 260 }}>
            {pieWidth > 0 && (
              <PieChart
                series={[{ data: bookingStatusSeries, innerRadius: 40, outerRadius: 80, paddingAngle: 2 }]}
                colors={[themeColor, "#4b74b8", "#89a5d6", "#d9534f"]}
                width={Math.min(420, pieWidth)}
                height={260}
                slotProps={{
                  legend: { direction: "row", position: { vertical: "bottom", horizontal: "middle" } }
                }}
              />
            )}
          </div>
        </Card>

        <Card className="dashboard-chart-card">
          <div className="dashboard-chart-header">
            <h2>Booking Conversion Rate</h2>
            <p>Completed bookings vs quotation requests</p>
          </div>
          <div className="dashboard-chart-body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 260 }}>
            <h2 style={{ fontSize: 28, margin: 0 }}>{conversionRate.toFixed(2)}%</h2>
            <p style={{ margin: '8px 0 0' }}>{completedBookingsCount} completed bookings</p>
            <p style={{ margin: 0 }}>{totalQuotationRequests} quotation requests</p>
          </div>
        </Card>
      </div>

      <div className="dashboard-section-packages-cards">
        <h2>Top 3 Most Booked Packages</h2>

        {displayTopPackages && displayTopPackages.length > 0 ? (
          <Row gutter={[16, 16]}>
            {displayTopPackages.map((pkg, idx) => {
              const imgs = pkg.packageImages || pkg.images || [];
              const first = Array.isArray(imgs) ? imgs[0] : imgs;
              const imageUrl = first && typeof first === 'string' ? first : (first && (first.url || first.path || first.src)) || null;

              return (
                <Col xs={24} sm={24} md={8} key={pkg.packageName + idx}>
                  <Card
                    className={`top-package-card ${imageUrl ? 'has-image' : ''}`}
                    style={{
                      height: 300,
                      backgroundImage: imageUrl ? `linear-gradient(rgba(0,0,0,0.30), rgba(0,0,0,0.30)), url(${imageUrl})` : undefined,
                      backgroundSize: imageUrl ? 'cover' : undefined,
                      backgroundPosition: imageUrl ? 'center' : undefined,
                      color: imageUrl ? '#ffffff' : undefined
                    }}
                  >
                    <div className="top-package-content">
                      <h3 className="top-package-card-name">
                        {idx + 1}. {pkg.packageName}
                      </h3>
                      <p className="top-package-card-bookings">
                        {pkg.count} bookings
                      </p>
                      <div className="top-package-card-number">#{idx + 1}</div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Card
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#fafafa',
              border: '1px dashed #d9d9d9',
              borderRadius: '8px',
              fontFamily: 'Montserrat'
            }}
          >
            <AppstoreOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
            <p style={{ color: '#8c8c8c', fontSize: '14px', margin: 0, fontFamily: 'Montserrat' }}>No booking data available yet</p>
            <p style={{ color: '#bfbfbf', fontSize: '12px', marginTop: '8px', fontFamily: 'Montserrat' }}>Packages will appear here once bookings are made</p>
          </Card>
        )}

        <div style={{ marginTop: 24 }}>
          <h2>Most Booked Durations</h2>
          {topDurationEntries.length > 0 ? (
            <Row gutter={[16, 16]}>
              {topDurationEntries.map((entry, idx) => {
                const durationNumber = Number(entry.label.split(' ')[0]);
                const imageUrl = durationImageMap[durationNumber] || null;
                return (
                  <Col xs={24} sm={12} md={8} key={entry.label}>
                    <Card
                      className={`top-duration-card ${imageUrl ? 'has-image' : ''}`}
                      style={{
                        height: 300,
                        backgroundImage: imageUrl ? `linear-gradient(rgba(0,0,0,0.30), rgba(0,0,0,0.30)), url(${imageUrl})` : undefined,
                        backgroundSize: imageUrl ? 'cover' : undefined,
                        backgroundPosition: imageUrl ? 'center' : undefined,
                        color: imageUrl ? '#ffffff' : undefined
                      }}
                    >
                      <div className="top-duration-content">
                        <h3 className="top-duration-name">{entry.label}</h3>
                        <p className="top-duration-count">{entry.count} bookings</p>
                        <div className="top-duration-rank">#{idx + 1}</div>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          ) : (
            <Card
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                border: '1px dashed #d9d9d9',
                borderRadius: '8px',
                fontFamily: 'Montserrat'
              }}
            >
              <ShoppingCartOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
              <p style={{ color: '#8c8c8c', fontSize: '14px', margin: 0, fontFamily: 'Montserrat' }}>No duration data available yet</p>
              <p style={{ color: '#bfbfbf', fontSize: '12px', marginTop: '8px', fontFamily: 'Montserrat' }}>Duration trends will appear here once bookings are made</p>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}
