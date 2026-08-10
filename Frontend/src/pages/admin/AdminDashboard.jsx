import { Card, Row, Col, notification } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { DollarCircleOutlined, ShoppingCartOutlined, UserOutlined, AppstoreOutlined } from "@ant-design/icons";
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { ChartContainer, LinePlot, AreaPlot, ChartsXAxis, ChartsYAxis, ChartsTooltip } from "@mui/x-charts";
import apiFetch from "../../config/fetchConfig";
import '../../style/admin/admindashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [notificationApi, notificationContextHolder] =
    notification.useNotification();

  const isEmployeeDashboard = location.pathname.startsWith("/employee");

  const navigateToManagementPage = (route) => {
    const routePrefix = isEmployeeDashboard ? "/employee" : "";

    navigate(`${routePrefix}/${route}`);
  };

  const getStatCardNavigationProps = (route, isAvailable = true) => {
    if (!isAvailable) {
      return {};
    }

    const openPage = () => {
      navigateToManagementPage(route);
    };

    return {
      hoverable: true,
      role: "button",
      tabIndex: 0,
      onClick: openPage,
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPage();
        }
      },
      style: {
        cursor: "pointer"
      }
    };
  };


  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalBookings: 0,
    totalUsers: 0,
    totalPackages: 0
  });
  const [loading, setLoading] = useState(true);

  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  const [barWidth, setBarWidth] = useState(0);
  const [pieWidth, setPieWidth] = useState(0);

  const barRef = useRef(null);
  const pieRef = useRef(null);
  const statusPieRef = useRef(null);

  const [popularPackages, setPopularPackages] = useState([]);
  const [quotationStats, setQuotationStats] = useState({
    totalQuotations: 0,
    quotationStatus: {
      pending: 0,
      booked: 0,
      rejected: 0,
      cancelled: 0,
    },
    conversionRate: 0,
  });

  const [bookingTrend, setBookingTrend] = useState(Array(12).fill(0));

  const [bookingTypeCount, setBookingTypeCount] = useState({
    domestic: 0,
    international: 0,
  });

  const [bookingStatusCount, setBookingStatusCount] = useState({
    pending: 0,
    notPaid: 0,
    fullyPaid: 0,
    cancelled: 0,
  });

  const [topDurations, setTopDurations] = useState([]);

  const [monthlyRevenue, setMonthlyRevenue] = useState(Array(12).fill(0));

  const fetchDashboardRevenue = async () => {
    try {
      const response = await apiFetch.get("/transaction/dashboard-revenue");
      setMonthlyRevenue(response.monthlyRevenue);
    } catch (err) {
      console.error(err);
    }
  };


  //display top packages function
  const displayTopPackages = Array.isArray(popularPackages)
    ? popularPackages.map(p => ({
      packageName: p.packageName,
      count: p.bookingCount,
      packageImage: p.packageImage
    }))
    : [];


  const paymentSplit = [
    {
      id: 0,
      value: bookingTypeCount.domestic,
      label: "Domestic",
    },
    {
      id: 1,
      value: bookingTypeCount.international,
      label: "International",
    },
  ];


  const themeColor = "#305797";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];


  //fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await apiFetch.get("/admin/dashboard-stats");
        setStats(response);
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
        notificationApi.error({ title: 'Unable to load dashboard stats.', placement: 'topRight' });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [notificationApi]);


  //fetch transactions, bookings, popular packages, and quotations
  useEffect(() => {

    const fetchDashboardBookings = async () => {
      try {
        const response = await apiFetch.get("/booking/dashboard-bookings");

        setBookingTrend(response.bookingTrend);

        setBookingTypeCount({
          domestic: response.bookingTypes.domestic,
          international: response.bookingTypes.international,
        });

        setBookingStatusCount({
          pending: response.bookingStatus.pending,
          notPaid: response.bookingStatus.notPaid,
          fullyPaid: response.bookingStatus.fullyPaid,
          cancelled: response.bookingStatus.cancelled,
        });

        setTopDurations(response.topDurations || []);
      } catch (error) {
        console.error(error);
      }
    };

    const fetchPopularPackages = async () => {
      try {
        const resp = await apiFetch.get('/package/popular-packages?limit=3');
        setPopularPackages(resp || []);
      } catch (err) {
        console.error('Failed to load popular packages', err);
      }
    };

    const fetchDashboardQuotations = async () => {
      try {
        const response = await apiFetch.get(
          "/quotation/dashboard-quotations"
        );

        setQuotationStats(response);
      } catch (err) {
        console.error(err);
      }
    };

    fetchDashboardBookings();
    fetchPopularPackages();
    fetchDashboardQuotations();
    fetchDashboardRevenue();
  }, [notificationApi]);


  //booking status breakdown series for pie chart
  const bookingStatusSeries = [
    { id: 0, value: bookingStatusCount.pending, label: 'Pending' },
    { id: 1, value: bookingStatusCount.notPaid, label: 'Not Paid' },
    { id: 2, value: bookingStatusCount.fullyPaid, label: 'Fully Paid' },
    { id: 3, value: bookingStatusCount.cancelled, label: 'Cancelled' },
  ];


  const isCompactTablet = viewportWidth <= 786;
  const isTablet = viewportWidth <= 900;

  const revenueChartHeight = isCompactTablet
    ? 280
    : isTablet
      ? 300
      : 320;

  const standardChartHeight = isCompactTablet ? 240 : 260;

  const bookingTypeInnerRadius = isCompactTablet ? 36 : 42;
  const bookingTypeOuterRadius = isCompactTablet ? 76 : 90;

  useEffect(() => {
    const handleViewportResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleViewportResize);

    return () => {
      window.removeEventListener("resize", handleViewportResize);
    };
  }, []);


  // update chart widths on resize
  useEffect(() => {
    const updateWidth = (node, setter, fallback) => {
      if (!node) return;

      const nextWidth = Math.max(
        Math.floor(node.clientWidth || fallback),
        280
      );

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
        updateWidth(
          statusPieRef.current,
          nextFallback
        );
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const rawWidth = entry.contentRect?.width;

        const width = Number.isFinite(rawWidth)
          ? Math.max(Math.floor(rawWidth), 280)
          : 280;

        if (entry.target === barRef.current) {
          setBarWidth(width);
        }

        if (entry.target === pieRef.current) {
          setPieWidth(width);
        }
      });
    });

    if (barRef.current) {
      observer.observe(barRef.current);
    }

    if (pieRef.current) {
      observer.observe(pieRef.current);
    }

    if (statusPieRef.current) {
      observer.observe(statusPieRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);


  return (
    <>
      {notificationContextHolder}
      <div className="admin-dashboard">


        <h1 className="page-header">Dashboard</h1>

        <div className="dashboard-section">
          <Row className="dashboard-stats-row" gutter={[16, 16]}>
            <Col xs={24} sm={12} md={12} lg={6}>
              <Card
                className="dash-card" {...getStatCardNavigationProps("transactions")}>
                <div className="dash-card-content-vertical">
                  <p>Total Transactions</p>
                  <div className="dash-text">
                    <DollarCircleOutlined className="dash-icon" />
                    <h2 className="dash-card-head">{loading ? "..." : stats.totalTransactions}</h2>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={12} lg={6}>
              <Card className="dash-card" {...getStatCardNavigationProps("bookings")}>
                <div className="dash-card-content-vertical">
                  <p>Total Bookings</p>
                  <div className="dash-text">
                    <ShoppingCartOutlined className="dash-icon" />
                    <h2 className="dash-card-head">{loading ? "..." : stats.totalBookings}</h2>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={12} lg={6}>
              <Card className="dash-card" {...getStatCardNavigationProps("users", !isEmployeeDashboard)}>
                <div className="dash-card-content-vertical">
                  <p>Total Users</p>
                  <div className="dash-text">
                    <UserOutlined className="dash-icon" />
                    <h2 className="dash-card-head">{loading ? "..." : stats.totalUsers}</h2>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={12} lg={6}>
              <Card className="dash-card" {...getStatCardNavigationProps("packages")}>
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

            <div
              className="dashboard-chart-body dashboard-revenue-chart is-tall"
              ref={barRef}
            >
              {barWidth > 0 && (
                <BarChart
                  xAxis={[
                    {
                      data: months,
                      scaleType: "band"
                    }
                  ]}
                  series={[
                    {
                      data: monthlyRevenue,
                      color: themeColor,
                      valueFormatter: (value) =>
                        `₱${Number(value || 0).toLocaleString()}`
                    }
                  ]}
                  width={Math.min(1200, barWidth)}
                  height={revenueChartHeight}
                />
              )}
            </div>
          </Card>

          <div className="dashboard-chart-row">
            <Card className="dashboard-chart-card">
              <div className="dashboard-chart-header">
                <h2>Booking Types</h2>
                <p>
                  Share by booking types (Domestic or International)
                </p>
              </div>

              <div
                className="dashboard-chart-body dashboard-pie-chart"
                ref={pieRef}
              >
                {pieWidth > 0 && (
                  <PieChart
                    series={[
                      {
                        data: paymentSplit,
                        innerRadius: bookingTypeInnerRadius,
                        outerRadius: bookingTypeOuterRadius,
                        paddingAngle: 2,
                        cornerRadius: 4,
                        highlightScope: {
                          faded: "global",
                          highlighted: "item"
                        },
                        faded: {
                          innerRadius: bookingTypeInnerRadius,
                          additionalRadius: -4
                        }
                      }
                    ]}
                    colors={[
                      themeColor,
                      "#4b74b8",
                      "#89a5d6"
                    ]}
                    width={Math.min(560, pieWidth)}
                    height={standardChartHeight}
                    slotProps={{
                      legend: {
                        direction: "row",
                        position: {
                          vertical: "bottom",
                          horizontal: "middle"
                        }
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

              <div className="dashboard-chart-body dashboard-line-chart">
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
                  xAxis={[
                    {
                      scaleType: "point",
                      data: months
                    }
                  ]}
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
              <h2 style={{ fontSize: 28, margin: 0 }}>{quotationStats?.conversionRate.toFixed(2)}%</h2>
              <p style={{ margin: '8px 0 0' }}>{quotationStats?.completedBookingsCount} completed bookings</p>
              <p style={{ margin: 0 }}>{quotationStats?.totalQuotationRequests} quotation requests</p>
            </div>
          </Card>
        </div>

        <div className="dashboard-section-packages-cards">
          <h2>Top 3 Most Booked Packages</h2>

          {displayTopPackages && displayTopPackages.length > 0 ? (
            <Row gutter={[16, 16]}>
              {displayTopPackages.map((pkg, idx) => {
                const imgs = pkg.packageImage || pkg.images || [];
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
                        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
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
            <h2>Top 3 Most Booked Durations</h2>
            {topDurations.length > 0 ? (
              <Row gutter={[16, 16]}>
                {topDurations.map((entry, idx) => {
                  const imageUrl = entry.image;
                  return (
                    <Col xs={24} sm={12} md={8} key={entry.label}>
                      <Card
                        style={{
                          height: 170,
                          backgroundSize: imageUrl ? 'cover' : undefined,
                          backgroundPosition: imageUrl ? 'center' : undefined,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                          border: '2px solid #d9d9d9',
                          borderRadius: 8,
                          color: imageUrl ? '#ffffff' : undefined
                        }}
                      >
                        <div className="top-duration-content">
                          <h3 className="top-duration-name">{entry.label} DAYS</h3>
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
    </>
  );
}
