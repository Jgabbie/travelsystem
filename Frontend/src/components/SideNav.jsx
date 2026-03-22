import { Layout } from "antd";
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import "../style/components/sidenav.css";
import axiosInstance from "../config/axiosConfig";
import socket from "../config/socket";


const { Sider } = Layout;

export default function SideNav() {
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

  const lastSeenBookingKey = useMemo(() => "adminBookingsLastSeen", []);
  const lastSeenCancellationKey = useMemo(() => "adminCancellationsLastSeen", []);
  const lastSeenUserKey = useMemo(() => "adminUsersLastSeen", []);
  const lastSeenTransactionKey = useMemo(() => "adminTransactionsLastSeen", []);
  const lastSeenQuotationKey = useMemo(() => "adminQuotationsLastSeen", []);
  const lastSeenRatingKey = useMemo(() => "adminRatingsLastSeen", []);
  const lastSeenPassportKey = useMemo(() => "adminPassportLastSeen", []);
  const lastSeenVisaKey = useMemo(() => "adminVisaLastSeen", []);

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
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const [
          bookingResponse,
          cancellationResponse,
          usersResponse,
          transactionResponse,
          quotationResponse,
          ratingResponse,
          passportResponse,
          visaResponse,
        ] = await Promise.all([
          axiosInstance.get("/booking/all-bookings"),
          axiosInstance.get("/booking/cancellations"),
          axiosInstance.get("/user/getUsers"),
          axiosInstance.get("/transaction/all-transactions"),
          axiosInstance.get("/quotation/all-quotations"),
          axiosInstance.get("/rating/all-ratings"),
          axiosInstance.get("/passport/applications"),
          axiosInstance.get("/visa/applications"),
        ]);

        const bookings = bookingResponse.data || [];
        const cancellations = cancellationResponse.data || [];
        const users = usersResponse.data || [];
        const transactions = transactionResponse.data || [];
        const quotations = quotationResponse.data || [];
        const ratings = ratingResponse.data || [];
        const passports = passportResponse.data || [];
        const visas = visaResponse.data || [];

        const latestBooking = getLatestValue(bookings, "createdAt");
        const latestCancellation = getLatestValue(cancellations, "cancellationDate");
        const latestUser = getLatestValue(users, "createdAt");
        const latestTransaction = getLatestValue(transactions, "createdAt");
        const latestQuotation = getLatestValue(quotations, "createdAt");
        const latestRating = getLatestValue(ratings, "createdAt");
        const latestPassport = getLatestValue(passports, "createdAt");
        const latestVisa = getLatestValue(visas, "createdAt");

        const lastSeenBookingValue = getDateValue(localStorage.getItem(lastSeenBookingKey)) || 0;
        const lastSeenCancellationValue = getDateValue(localStorage.getItem(lastSeenCancellationKey)) || 0;
        const lastSeenUserValue = getDateValue(localStorage.getItem(lastSeenUserKey)) || 0;
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

        const newUserCount = users.filter((u) => {
          const value = getDateValue(u?.createdAt);
          return value && value > lastSeenUserValue;
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
        setLatestUserValue(latestUser);
        setLatestTransactionValue(latestTransaction);
        setLatestQuotationValue(latestQuotation);
        setLatestRatingValue(latestRating);
        setLatestPassportValue(latestPassport);
        setLatestVisaValue(latestVisa);
        setBookingCount(newBookingCount);
        setCancellationCount(newCancellationCount);
        setUserCount(newUserCount);
        setTransactionCount(newTransactionCount);
        setQuotationCount(newQuotationCount);
        setRatingCount(newRatingCount);
        setPassportCount(newPassportCount);
        setVisaCount(newVisaCount);
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
    socket.on("booking:created", handleBookingCreated);
    socket.on("cancellation:created", handleCancellationCreated);
    socket.on("user:created", handleUserCreated);
    socket.on("transaction:created", handleTransactionCreated);
    socket.on("quotation:created", handleQuotationCreated);
    socket.on("rating:created", handleRatingCreated);
    socket.on("passport:created", handlePassportCreated);
    socket.on("visa:created", handleVisaCreated);
    window.addEventListener("focus", fetchNotifications);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      isMounted = false;
      socket.off("booking:created", handleBookingCreated);
      socket.off("cancellation:created", handleCancellationCreated);
      socket.off("user:created", handleUserCreated);
      socket.off("transaction:created", handleTransactionCreated);
      socket.off("quotation:created", handleQuotationCreated);
      socket.off("rating:created", handleRatingCreated);
      socket.off("passport:created", handlePassportCreated);
      socket.off("visa:created", handleVisaCreated);
      window.removeEventListener("focus", fetchNotifications);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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


  return (
    <>
      <Sider className="sidenav" width={220}>

        <div className="nav-top">
          <NavLink to="/dashboard" className="nav-item">Dashboard</NavLink>
          <NavLink to="/users" className="nav-item" onClick={handleUsersClick}>
            <span className="nav-item-content">
              <span>Users</span>
              {userCount > 0 && <span className="nav-badge">{userCount}</span>}
            </span>
          </NavLink>
          <NavLink to="/bookings" className="nav-item" onClick={handleBookingsClick}>
            <span className="nav-item-content">
              <span>Bookings</span>
              {bookingCount > 0 && <span className="nav-badge">{bookingCount}</span>}
            </span>
          </NavLink>
          <NavLink to="/transactions" className="nav-item" onClick={handleTransactionsClick}>
            <span className="nav-item-content">
              <span>Transactions</span>
              {transactionCount > 0 && <span className="nav-badge">{transactionCount}</span>}
            </span>
          </NavLink>
          <NavLink to="/package-quotation" className="nav-item" onClick={handleQuotationsClick}>
            <span className="nav-item-content">
              <span>Quotation Requests</span>
              {quotationCount > 0 && <span className="nav-badge">{quotationCount}</span>}
            </span>
          </NavLink>
          <NavLink to="/cancellation-requests" className="nav-item" onClick={handleCancellationsClick}>
            <span className="nav-item-content">
              <span>Cancellation Requests</span>
              {cancellationCount > 0 && <span className="nav-badge">{cancellationCount}</span>}
            </span>
          </NavLink>
          <NavLink to="/packages" className="nav-item">Packages</NavLink>
          <NavLink to="/ratings" className="nav-item" onClick={handleRatingsClick}>
            <span className="nav-item-content">
              <span>Review Ratings</span>
              {ratingCount > 0 && <span className="nav-badge">{ratingCount}</span>}
            </span>
          </NavLink>
          <NavLink to="/visa-services" className="nav-item">Visa Services</NavLink>
          <NavLink to="/passport-applications" className="nav-item" onClick={handlePassportClick}>
            <span className="nav-item-content">
              <span>Passport Applications</span>
              {passportCount > 0 && <span className="nav-badge">{passportCount}</span>}
            </span>
          </NavLink>
          <NavLink to="/visa-applications" className="nav-item" onClick={handleVisaClick}>
            <span className="nav-item-content">
              <span>VISA Applications</span>
              {visaCount > 0 && <span className="nav-badge">{visaCount}</span>}
            </span>
          </NavLink>

          <div style={{ margin: "10px 0", borderTop: "1px solid rgba(255,255,255,0.2)" }}></div>
          <NavLink to="/logging" className="nav-item">Logging</NavLink>
          <NavLink to="/auditing" className="nav-item">Auditing</NavLink>
        </div>

      </Sider>
    </>

  );
}