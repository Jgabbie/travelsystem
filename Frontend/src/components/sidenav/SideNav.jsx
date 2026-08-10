import { Layout } from "antd";
import {
  AppstoreOutlined,
  AuditOutlined,
  BellOutlined,
  DownOutlined,
  FileTextOutlined,
  FundOutlined,
  IdcardOutlined,
  BookOutlined,
  SafetyCertificateOutlined,
  RightOutlined,
  SolutionOutlined,
  TeamOutlined,
  TransactionOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import "../../style/components/sidenav.css";
import apiFetch from "../../config/fetchConfig";
import socket, { isSocketEnabled } from "../../config/socket";


const { Sider } = Layout;

export default function SideNav() {
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    operations: true,
    inventory: true,
    applications: true,
    system: true,
  });
  const [bookingCount, setBookingCount] = useState(0);
  const [latestBookingValue, setLatestBookingValue] = useState(null);
  const [cancellationCount, setCancellationCount] = useState(0);
  const [latestCancellationValue, setLatestCancellationValue] = useState(null);
  const [userCount, setUserCount] = useState(0);
  const [latestUserValue, setLatestUserValue] = useState(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [latestTransactionValue, setLatestTransactionValue] = useState(null);
  const [quotationCount, setQuotationCount] = useState(0);
  const [latestQuotationValue, setLatestQuotationValue] = useState(null);
  const [ratingCount, setRatingCount] = useState(0);
  const [latestRatingValue, setLatestRatingValue] = useState(null);
  const [passportCount, setPassportCount] = useState(0);
  const [latestPassportValue, setLatestPassportValue] = useState(null);
  const [visaCount, setVisaCount] = useState(0);
  const [latestVisaValue, setLatestVisaValue] = useState(null);
  const [loggingCount, setLoggingCount] = useState(0);
  const [latestLoggingValue, setLatestLoggingValue] = useState(null);
  const [auditingCount, setAuditingCount] = useState(0);
  const [latestAuditingValue, setLatestAuditingValue] = useState(null);

  const lastSeenBookingKey = useMemo(() => "adminBookingsLastSeen", []);
  const lastSeenCancellationKey = useMemo(() => "adminCancellationsLastSeen", []);
  const lastSeenUserKey = useMemo(() => "adminUsersLastSeen", []);
  const lastSeenTransactionKey = useMemo(() => "adminTransactionsLastSeen", []);
  const lastSeenQuotationKey = useMemo(() => "adminQuotationsLastSeen", []);
  const lastSeenRatingKey = useMemo(() => "adminRatingsLastSeen", []);
  const lastSeenPassportKey = useMemo(() => "adminPassportLastSeen", []);
  const lastSeenVisaKey = useMemo(() => "adminVisaLastSeen", []);
  const lastSeenLoggingKey = useMemo(() => "adminLoggingLastSeen", []);
  const lastSeenAuditingKey = useMemo(() => "adminAuditingLastSeen", []);

  const getDateValue = (value) => {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  };

  useEffect(() => {
    const updateLayout = () => {
      const nextIsMobile = window.innerWidth <= 900;
      setIsMobile(nextIsMobile);
      setIsCollapsed(nextIsMobile);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      setIsCollapsed((prev) => !prev);
    };

    window.addEventListener("sidenav:toggle", handleToggle);
    return () => window.removeEventListener("sidenav:toggle", handleToggle);
  }, [isMobile]);

  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const summary = await apiFetch.get("/admin/sidebar-notifications", {
          params: {
            bookings: localStorage.getItem(lastSeenBookingKey),
            cancellations: localStorage.getItem(lastSeenCancellationKey),
            users: localStorage.getItem(lastSeenUserKey),
            transactions: localStorage.getItem(lastSeenTransactionKey),
            quotations: localStorage.getItem(lastSeenQuotationKey),
            ratings: localStorage.getItem(lastSeenRatingKey),
            passports: localStorage.getItem(lastSeenPassportKey),
            visas: localStorage.getItem(lastSeenVisaKey),
            logging: localStorage.getItem(lastSeenLoggingKey),
            auditing: localStorage.getItem(lastSeenAuditingKey),
          },
        });

        const getSummaryCount = (key) =>
          Number(summary?.[key]?.count ?? summary?.[`${key}Count`] ?? 0);

        const getSummaryLatestValue = (key) =>
          getDateValue(summary?.[key]?.latestValue ?? summary?.[key]?.latest ?? summary?.[`${key}LatestValue`]);

        if (!isMounted) return;
        setLatestBookingValue(getSummaryLatestValue("bookings"));
        setLatestCancellationValue(getSummaryLatestValue("cancellations"));
        setLatestUserValue(getSummaryLatestValue("users"));
        setLatestTransactionValue(getSummaryLatestValue("transactions"));
        setLatestQuotationValue(getSummaryLatestValue("quotations"));
        setLatestRatingValue(getSummaryLatestValue("ratings"));
        setLatestPassportValue(getSummaryLatestValue("passports"));
        setLatestVisaValue(getSummaryLatestValue("visas"));
        setLatestLoggingValue(getSummaryLatestValue("logging"));
        setLatestAuditingValue(getSummaryLatestValue("auditing"));
        setBookingCount(getSummaryCount("bookings"));
        setCancellationCount(getSummaryCount("cancellations"));
        setUserCount(getSummaryCount("users"));
        setTransactionCount(getSummaryCount("transactions"));
        setQuotationCount(getSummaryCount("quotations"));
        setRatingCount(getSummaryCount("ratings"));
        setPassportCount(getSummaryCount("passports"));
        setVisaCount(getSummaryCount("visas"));
        setLoggingCount(getSummaryCount("logging"));
        setAuditingCount(getSummaryCount("auditing"));
      } catch (error) {
        if (!isMounted) return;
        setBookingCount(0);
        setCancellationCount(0);
        setUserCount(0);
        setTransactionCount(0);
        setQuotationCount(0);
        setRatingCount(0);
        setPassportCount(0);
        setVisaCount(0);
        setLoggingCount(0);
        setAuditingCount(0);
      }
    };

    const handleBookingCreated = (payload) => {
      const value = getDateValue(payload?.createdAt);
      if (!value) return;
      const lastSeenBookingValue = getDateValue(localStorage.getItem(lastSeenBookingKey)) || 0;
      if (value > lastSeenBookingValue) {
        setBookingCount((prev) => prev + 1);
      }
      setLatestBookingValue((prev) => (prev && prev > value ? prev : value));
    };

    const handleCancellationCreated = (payload) => {
      const value = getDateValue(payload?.cancellationDate);
      if (!value) return;
      const lastSeenCancellationValue = getDateValue(localStorage.getItem(lastSeenCancellationKey)) || 0;
      if (value > lastSeenCancellationValue) {
        setCancellationCount((prev) => prev + 1);
      }
      setLatestCancellationValue((prev) => (prev && prev > value ? prev : value));
    };

    const handleUserCreated = (payload) => {
      const value = getDateValue(payload?.createdAt);
      if (!value) return;
      const lastSeenUserValue = getDateValue(localStorage.getItem(lastSeenUserKey)) || 0;
      if (value > lastSeenUserValue) {
        setUserCount((prev) => prev + 1);
      }
      setLatestUserValue((prev) => (prev && prev > value ? prev : value));
    };

    const handleTransactionCreated = (payload) => {
      const value = getDateValue(payload?.createdAt);
      if (!value) return;
      const lastSeenTransactionValue = getDateValue(localStorage.getItem(lastSeenTransactionKey)) || 0;
      if (value > lastSeenTransactionValue) {
        setTransactionCount((prev) => prev + 1);
      }
      setLatestTransactionValue((prev) => (prev && prev > value ? prev : value));
    };

    const handleQuotationCreated = (payload) => {
      const value = getDateValue(payload?.createdAt);
      if (!value) return;
      const lastSeenQuotationValue = getDateValue(localStorage.getItem(lastSeenQuotationKey)) || 0;
      if (value > lastSeenQuotationValue) {
        setQuotationCount((prev) => prev + 1);
      }
      setLatestQuotationValue((prev) => (prev && prev > value ? prev : value));
    };

    const handleRatingCreated = (payload) => {
      const value = getDateValue(payload?.createdAt);
      if (!value) return;
      const lastSeenRatingValue = getDateValue(localStorage.getItem(lastSeenRatingKey)) || 0;
      if (value > lastSeenRatingValue) {
        setRatingCount((prev) => prev + 1);
      }
      setLatestRatingValue((prev) => (prev && prev > value ? prev : value));
    };

    const handlePassportCreated = (payload) => {
      const value = getDateValue(payload?.createdAt);
      if (!value) return;
      const lastSeenPassportValue = getDateValue(localStorage.getItem(lastSeenPassportKey)) || 0;
      if (value > lastSeenPassportValue) {
        setPassportCount((prev) => prev + 1);
      }
      setLatestPassportValue((prev) => (prev && prev > value ? prev : value));
    };

    const handleVisaCreated = (payload) => {
      const value = getDateValue(payload?.createdAt);
      if (!value) return;
      const lastSeenVisaValue = getDateValue(localStorage.getItem(lastSeenVisaKey)) || 0;
      if (value > lastSeenVisaValue) {
        setVisaCount((prev) => prev + 1);
      }
      setLatestVisaValue((prev) => (prev && prev > value ? prev : value));
    };

    fetchNotifications();


    if (isSocketEnabled) {
      socket.on("booking:created", handleBookingCreated);
      socket.on("cancellation:created", handleCancellationCreated);
      socket.on("user:created", handleUserCreated);
      socket.on("transaction:created", handleTransactionCreated);
      socket.on("quotation:created", handleQuotationCreated);
      socket.on("rating:created", handleRatingCreated);
      socket.on("passport:created", handlePassportCreated);
      socket.on("visa:created", handleVisaCreated);
    }
    return () => {
      isMounted = false;
      if (isSocketEnabled) {
        socket.off("booking:created", handleBookingCreated);
        socket.off("cancellation:created", handleCancellationCreated);
        socket.off("user:created", handleUserCreated);
        socket.off("transaction:created", handleTransactionCreated);
        socket.off("quotation:created", handleQuotationCreated);
        socket.off("rating:created", handleRatingCreated);
        socket.off("passport:created", handlePassportCreated);
        socket.off("visa:created", handleVisaCreated);
      }
    };
  }, [
    lastSeenBookingKey,
    lastSeenCancellationKey,
    lastSeenUserKey,
    lastSeenTransactionKey,
    lastSeenQuotationKey,
    lastSeenRatingKey,
    lastSeenPassportKey,
    lastSeenVisaKey,
    lastSeenLoggingKey,
    lastSeenAuditingKey,
  ]);

  const handleBookingsClick = () => {
    if (latestBookingValue) {
      localStorage.setItem(lastSeenBookingKey, new Date(latestBookingValue).toISOString());
    }
    setBookingCount(0);
  };

  const handleCancellationsClick = () => {
    if (latestCancellationValue) {
      localStorage.setItem(lastSeenCancellationKey, new Date(latestCancellationValue).toISOString());
    }
    setCancellationCount(0);
  };

  const handleUsersClick = () => {
    if (latestUserValue) {
      localStorage.setItem(lastSeenUserKey, new Date(latestUserValue).toISOString());
    }
    setUserCount(0);
  };

  const handleTransactionsClick = () => {
    if (latestTransactionValue) {
      localStorage.setItem(lastSeenTransactionKey, new Date(latestTransactionValue).toISOString());
    }
    setTransactionCount(0);
  };

  const handleQuotationsClick = () => {
    if (latestQuotationValue) {
      localStorage.setItem(lastSeenQuotationKey, new Date(latestQuotationValue).toISOString());
    }
    setQuotationCount(0);
  };

  const handleRatingsClick = () => {
    if (latestRatingValue) {
      localStorage.setItem(lastSeenRatingKey, new Date(latestRatingValue).toISOString());
    }
    setRatingCount(0);
  };

  const handlePassportClick = () => {
    if (latestPassportValue) {
      localStorage.setItem(lastSeenPassportKey, new Date(latestPassportValue).toISOString());
    }
    setPassportCount(0);
  };

  const handleVisaClick = () => {
    if (latestVisaValue) {
      localStorage.setItem(lastSeenVisaKey, new Date(latestVisaValue).toISOString());
    }
    setVisaCount(0);
  };

  const handleLoggingClick = () => {
    if (latestLoggingValue) {
      localStorage.setItem(lastSeenLoggingKey, new Date(latestLoggingValue).toISOString());
    }
    setLoggingCount(0);
  };

  const handleAuditingClick = () => {
    if (latestAuditingValue) {
      localStorage.setItem(lastSeenAuditingKey, new Date(latestAuditingValue).toISOString());
    }
    setAuditingCount(0);
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const renderNavItem = ({ to, label, icon, count = 0, onClick, exact = false }) => (
    <NavLink
      key={to}
      to={to}
      end={exact}
      className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
      onClick={onClick}
    >
      <span className="nav-item-content">
        <span className="nav-link-main">
          <span className="nav-link-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </span>
        {count > 0 && <span className="nav-badge">{count}</span>}
      </span>
    </NavLink>
  );

  const renderSection = ({ sectionKey, title, items }) => {
    const isExpanded = isCollapsed || expandedSections[sectionKey];
    const sectionCount = items.reduce((total, item) => total + (item.count || 0), 0);

    return (
      <section className={`nav-section${isExpanded ? " is-expanded" : " is-collapsed"}`} aria-label={title}>
        <button
          type="button"
          className="nav-section-header"
          aria-expanded={isExpanded}
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="nav-section-title">{title}</span>
          <span className="nav-section-header-meta">
            {!isExpanded && sectionCount > 0 && <span className="nav-section-badge">{sectionCount}</span>}
            <span className="nav-section-chevron">
              {isExpanded ? <DownOutlined /> : <RightOutlined />}
            </span>
          </span>
        </button>
        {isExpanded && <div className="nav-section-items">{items.map((item) => renderNavItem(item))}</div>}
      </section>
    );
  };


  return (
    <>
      <Sider
        className={isMobile ? "sidenav is-mobile" : "sidenav"}
        width={220}
        collapsedWidth={isMobile ? 0 : 80}
        collapsed={isCollapsed}
        trigger={null}
      >

        <div className="nav-top">
          {renderNavItem({ to: "/dashboard", label: "Dashboard", icon: <AppstoreOutlined />, exact: true })}

          <div className="nav-divider" />

          {renderSection({
            sectionKey: "operations",
            title: "Operations",
            items: [
              { to: "/bookings", label: "Bookings", icon: <BookOutlined />, count: bookingCount, onClick: handleBookingsClick },
              { to: "/transactions", label: "Transactions", icon: <TransactionOutlined />, count: transactionCount, onClick: handleTransactionsClick },
              { to: "/package-quotation", label: "Quotation Requests", icon: <FileTextOutlined />, count: quotationCount, onClick: handleQuotationsClick },
              { to: "/cancellation-requests", label: "Cancellation Requests", icon: <SafetyCertificateOutlined />, count: cancellationCount, onClick: handleCancellationsClick },
              { to: "/ratings", label: "Review Ratings", icon: <FundOutlined />, count: ratingCount, onClick: handleRatingsClick },
            ],
          })}

          {renderSection({
            sectionKey: "inventory",
            title: "Inventory",
            items: [
              { to: "/packages", label: "Package Management", icon: <SolutionOutlined /> },
              { to: "/visa-services", label: "Visa Services Management", icon: <IdcardOutlined /> },
            ],
          })}

          {renderSection({
            sectionKey: "applications",
            title: "Applications",
            items: [
              { to: "/passport-applications", label: "Passport Management", icon: <TeamOutlined />, count: passportCount, onClick: handlePassportClick },
              { to: "/visa-applications", label: "Visa Management", icon: <IdcardOutlined />, count: visaCount, onClick: handleVisaClick },
            ],
          })}

          {renderSection({
            sectionKey: "system",
            title: "System",
            items: [
              { to: "/users", label: "Users", icon: <UserOutlined />, count: userCount, onClick: handleUsersClick },
              { to: "/logging", label: "Logging", icon: <BellOutlined />, count: loggingCount, onClick: handleLoggingClick },
              { to: "/auditing", label: "Auditing", icon: <AuditOutlined />, count: auditingCount, onClick: handleAuditingClick },
            ],
          })}
        </div>

      </Sider>
    </>

  );
}
