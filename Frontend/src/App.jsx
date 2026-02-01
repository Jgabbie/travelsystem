import { Routes, Route, Navigate } from "react-router-dom";
// import { useAuth } from "./hooks/useAuth";
// import { useEffect } from "react";

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ResetPassword from './components/ResetPassword';

import LandingPage from './pages/LandingPage';
import PackagePage from './pages/PackagePage';
import ProfilePage from "./pages/ProfilePage";

import Logging from './pages/Logging';
import Auditing from './components/Auditing';

import AdminLayout from "./components/AdminLayout";
import BookingManagement from "./pages/BookingManagement";
import UserManagement from "./pages/UserManagement";
import PackageManagement from "./pages/PackageManagement";
import AddPackage from "./pages/AddPackage";
import AdminDashboard from "./pages/AdminDashboard";
import TransactionManagement from "./pages/TransactionManagement";
import ReviewRatings from "./pages/ReviewRatings";
import VisaApplications from "./pages/VisaApplications";
import PassportApplications from "./pages/PassportApplications";

import PublicRoute from "./routes/PublicRoute";
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from "./routes/AdminRoute";
import GuestsUsersRoute from "./routes/GuestsUsersRoute";

import "antd/dist/reset.css";
//import useRefreshToken from "./hooks/useRefreshToken";



function App() {

  // const { setAuth } = useAuth();
  // const refreshToken = useRefreshToken();
  // useEffect(() => {
  //   const refreshOnLoad = async () => {
  //     try {
  //       const newAccessToken = await refreshToken();
  //       if (newAccessToken) {
  //         setAuth(prev => ({ ...prev, accessToken: newAccessToken }));
  //       }
  //     } catch (err) {
  //       console.error("Failed to refresh access token on load:", err);
  //     }
  //   }
  //   refreshOnLoad();
  // }, []);

  return (
    <div>
      <Routes>

        <Route element={<GuestsUsersRoute />}>
          <Route path='/home' element={<LandingPage />} />
        </Route>

        {/* public routes */}
        <Route element={<PublicRoute />}>
          <Route path='/login' element={<LoginPage />} />
          <Route path='/signup' element={<SignupPage />} />
          <Route path='/reset-password' element={<ResetPassword />} />
        </Route>

        {/* --- ADMIN ROUTES (SECURED) --- */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="bookings" element={<BookingManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="transactions" element={<TransactionManagement />} />
            <Route path="packages" element={<PackageManagement />} />
            <Route path="packages/add" element={<AddPackage />} />
            <Route path="ratings" element={<ReviewRatings />} />
            <Route path="visa-applications" element={<VisaApplications />} />
            <Route path="passport-applications" element={<PassportApplications />} />

            {/* NEW LOGGING & AUDITING ROUTES */}
            <Route path="logging" element={<Logging />} />
            <Route path="auditing" element={<Auditing />} />
          </Route>
        </Route>

        {/* protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path='/package' element={<PackagePage />} />
          <Route path='/profile' element={<ProfilePage />} />
        </Route>

        <Route path='*' element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

export default App;