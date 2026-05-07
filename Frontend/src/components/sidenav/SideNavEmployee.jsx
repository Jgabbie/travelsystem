import { Layout } from "antd";
import { useEffect, useMemo, useState } from "react";
import { AppstoreOutlined, BookOutlined, DownOutlined, FileTextOutlined, FundOutlined, IdcardOutlined, RightOutlined, SafetyCertificateOutlined, SolutionOutlined, TeamOutlined, TransactionOutlined } from "@ant-design/icons";
import { NavLink } from "react-router-dom";
import "../../style/components/sidenav.css";
import apiFetch from "../../config/fetchConfig";
import socket, { isSocketEnabled } from "../../config/socket";

const { Sider } = Layout;

export default function SideNavEmployee() {
    const [isMobile, setIsMobile] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        operations: true,
        inventory: true,
        applications: true,
    });
    const [bookingCount, setBookingCount] = useState(0);
    const [latestBookingValue, setLatestBookingValue] = useState(null);
    const [cancellationCount, setCancellationCount] = useState(0);
    const [latestCancellationValue, setLatestCancellationValue] = useState(null);
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

    const lastSeenBookingKey = useMemo(() => "employeeBookingsLastSeen", []);
    const lastSeenCancellationKey = useMemo(() => "employeeCancellationsLastSeen", []);
    const lastSeenTransactionKey = useMemo(() => "employeeTransactionsLastSeen", []);
    const lastSeenQuotationKey = useMemo(() => "employeeQuotationsLastSeen", []);
    const lastSeenRatingKey = useMemo(() => "employeeRatingsLastSeen", []);
    const lastSeenPassportKey = useMemo(() => "employeePassportLastSeen", []);
    const lastSeenVisaKey = useMemo(() => "employeeVisaLastSeen", []);

    const getDateValue = (value) => {
        if (!value) return null;
        const time = new Date(value).getTime();
        return Number.isNaN(time) ? null : time;
    };

    const getLatestValue = (items, field) => {
        const values = items
            .map((item) => getDateValue(item?.[field]))
            .filter((value) => value !== null);
        if (!values.length) return null;
        values.sort((a, b) => a - b);
        return values[values.length - 1];
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
                const [
                    bookingResponse,
                    cancellationResponse,
                    transactionResponse,
                    quotationResponse,
                    ratingResponse,
                    passportResponse,
                    visaResponse,
                ] = await Promise.all([
                    apiFetch.get("/booking/all-bookings"),
                    apiFetch.get("/booking/cancellations"),
                    apiFetch.get("/transaction/all-transactions"),
                    apiFetch.get("/quotation/all-quotations"),
                    apiFetch.get("/rating/all-ratings"),
                    apiFetch.get("/passport/applications"),
                    apiFetch.get("/visa/applications"),
                ]);

                const bookings = bookingResponse || [];
                const cancellations = cancellationResponse || [];
                const transactions = transactionResponse || [];
                const quotations = quotationResponse || [];
                const ratings = ratingResponse || [];
                const passports = passportResponse || [];
                const visas = visaResponse || [];

                const latestBooking = getLatestValue(bookings, "createdAt");
                const latestCancellation = getLatestValue(cancellations, "cancellationDate");
                const latestTransaction = getLatestValue(transactions, "createdAt");
                const latestQuotation = getLatestValue(quotations, "createdAt");
                const latestRating = getLatestValue(ratings, "createdAt");
                const latestPassport = getLatestValue(passports, "createdAt");
                const latestVisa = getLatestValue(visas, "createdAt");

                const lastSeenBookingValue = getDateValue(localStorage.getItem(lastSeenBookingKey)) || 0;
                const lastSeenCancellationValue = getDateValue(localStorage.getItem(lastSeenCancellationKey)) || 0;
                const lastSeenTransactionValue = getDateValue(localStorage.getItem(lastSeenTransactionKey)) || 0;
                const lastSeenQuotationValue = getDateValue(localStorage.getItem(lastSeenQuotationKey)) || 0;
                const lastSeenRatingValue = getDateValue(localStorage.getItem(lastSeenRatingKey)) || 0;
                const lastSeenPassportValue = getDateValue(localStorage.getItem(lastSeenPassportKey)) || 0;
                const lastSeenVisaValue = getDateValue(localStorage.getItem(lastSeenVisaKey)) || 0;

                const newBookingCount = bookings.filter((b) => {
                    const value = getDateValue(b?.createdAt);
                    return value && value > lastSeenBookingValue;
                }).length;

                const newCancellationCount = cancellations.filter((c) => {
                    const value = getDateValue(c?.cancellationDate);
                    return value && value > lastSeenCancellationValue;
                }).length;

                const newTransactionCount = transactions.filter((t) => {
                    const value = getDateValue(t?.createdAt);
                    return value && value > lastSeenTransactionValue;
                }).length;

                const newQuotationCount = quotations.filter((q) => {
                    const value = getDateValue(q?.createdAt);
                    return value && value > lastSeenQuotationValue;
                }).length;

                const newRatingCount = ratings.filter((r) => {
                    const value = getDateValue(r?.createdAt);
                    return value && value > lastSeenRatingValue;
                }).length;

                const newPassportCount = passports.filter((p) => {
                    const value = getDateValue(p?.createdAt);
                    return value && value > lastSeenPassportValue;
                }).length;

                const newVisaCount = visas.filter((v) => {
                    const value = getDateValue(v?.createdAt);
                    return value && value > lastSeenVisaValue;
                }).length;

                if (!isMounted) return;
                setLatestBookingValue(latestBooking);
                setLatestCancellationValue(latestCancellation);
                setLatestTransactionValue(latestTransaction);
                setLatestQuotationValue(latestQuotation);
                setLatestRatingValue(latestRating);
                setLatestPassportValue(latestPassport);
                setLatestVisaValue(latestVisa);
                setBookingCount(newBookingCount);
                setCancellationCount(newCancellationCount);
                setTransactionCount(newTransactionCount);
                setQuotationCount(newQuotationCount);
                setRatingCount(newRatingCount);
                setPassportCount(newPassportCount);
                setVisaCount(newVisaCount);
            } catch (error) {
                if (!isMounted) return;
                setBookingCount(0);
                setCancellationCount(0);
                setTransactionCount(0);
                setQuotationCount(0);
                setRatingCount(0);
                setPassportCount(0);
                setVisaCount(0);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                fetchNotifications();
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

        let intervalId;
        if (isSocketEnabled) {
            socket.on("booking:created", handleBookingCreated);
            socket.on("cancellation:created", handleCancellationCreated);
            socket.on("transaction:created", handleTransactionCreated);
            socket.on("quotation:created", handleQuotationCreated);
            socket.on("rating:created", handleRatingCreated);
            socket.on("passport:created", handlePassportCreated);
            socket.on("visa:created", handleVisaCreated);
        } else {
            intervalId = setInterval(fetchNotifications, 5000);
        }
        window.addEventListener("focus", fetchNotifications);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            isMounted = false;
            if (isSocketEnabled) {
                socket.off("booking:created", handleBookingCreated);
                socket.off("cancellation:created", handleCancellationCreated);
                socket.off("transaction:created", handleTransactionCreated);
                socket.off("quotation:created", handleQuotationCreated);
                socket.off("rating:created", handleRatingCreated);
                socket.off("passport:created", handlePassportCreated);
                socket.off("visa:created", handleVisaCreated);
            }
            if (intervalId) {
                clearInterval(intervalId);
            }
            window.removeEventListener("focus", fetchNotifications);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [
        lastSeenBookingKey,
        lastSeenCancellationKey,
        lastSeenTransactionKey,
        lastSeenQuotationKey,
        lastSeenRatingKey,
        lastSeenPassportKey,
        lastSeenVisaKey,
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

    const toggleSection = (sectionKey) => {
        setExpandedSections((prev) => ({
            ...prev,
            [sectionKey]: !prev[sectionKey],
        }));
    };

    const renderNavItem = ({ to, label, icon, count = 0, onClick, exact = false }) => (
        <NavLink
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
                    {renderNavItem({ to: "/employee/dashboard", label: "Dashboard", icon: <AppstoreOutlined />, exact: true })}

                    <div className="nav-divider" />

                    {renderSection({
                        sectionKey: "operations",
                        title: "Operations",
                        items: [
                            { to: "/employee/bookings", label: "Bookings", icon: <BookOutlined />, count: bookingCount, onClick: handleBookingsClick },
                            { to: "/employee/transactions", label: "Transactions", icon: <TransactionOutlined />, count: transactionCount, onClick: handleTransactionsClick },
                            { to: "/employee/package-quotation", label: "Quotation Requests", icon: <FileTextOutlined />, count: quotationCount, onClick: handleQuotationsClick },
                            { to: "/employee/cancellation-requests", label: "Cancellation Management", icon: <SafetyCertificateOutlined />, count: cancellationCount, onClick: handleCancellationsClick },
                            { to: "/employee/ratings", label: "Review Ratings", icon: <FundOutlined />, count: ratingCount, onClick: handleRatingsClick },
                        ],
                    })}

                    {renderSection({
                        sectionKey: "inventory",
                        title: "Inventory",
                        items: [
                            { to: "/employee/packages", label: "Package Management", icon: <SolutionOutlined /> },
                            { to: "/employee/visa-services", label: "Visa Services Management", icon: <IdcardOutlined /> },
                        ],
                    })}

                    {renderSection({
                        sectionKey: "applications",
                        title: "Applications",
                        items: [
                            { to: "/employee/passport-applications", label: "Passport Management", icon: <TeamOutlined />, count: passportCount, onClick: handlePassportClick },
                            { to: "/employee/visa-applications", label: "Visa Management", icon: <IdcardOutlined />, count: visaCount, onClick: handleVisaClick },
                        ],
                    })}
                </div>

            </Sider>
        </>

    );
}