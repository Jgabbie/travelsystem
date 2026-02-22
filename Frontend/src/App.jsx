import { Routes, Route, Navigate } from "react-router-dom";

import ResetPassword from './components/ResetPassword';
import LandingPage from './pages/LandingPage';

import PackagePage from './pages/PackagePage';
import ProfilePage from "./pages/ProfilePage";
import UserBookings from "./pages/UserBookings";
import UserTransactions from "./pages/UserTransactions";
import PassAndVisaService from "./pages/PassAndVisaService";
import Wishlist from "./pages/Wishlist";
import DestinationsPackages from "./pages/DestinationsPackages";

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
import AdminProfile from "./pages/AdminProfile";
import CancellationRequests from "./pages/CancellationRequests";

import PublicRoute from "./routes/PublicRoute";
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from "./routes/AdminRoute";
import GuestsUsersRoute from "./routes/GuestsUsersRoute";

import "antd/dist/reset.css";



function App() {
  return (
    <div>
      <Routes>

        <Route path='/' element={<Navigate to="/home" replace />} />

        <Route element={<GuestsUsersRoute />}>
          <Route path='/home' element={<LandingPage />} />
        </Route>

        {/* public routes */}
        <Route element={<PublicRoute />}>
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
            <Route path="/packages/edit/:id" element={<AddPackage />} />
            <Route path="ratings" element={<ReviewRatings />} />
            <Route path="visa-applications" element={<VisaApplications />} />
            <Route path="passport-applications" element={<PassportApplications />} />
            <Route path="cancellation-requests" element={<CancellationRequests />} />
            <Route path="adminprofile" element={<AdminProfile />} />

            {/* logging and auditing routes */}
            <Route path="logging" element={<Logging />} />
            <Route path="auditing" element={<Auditing />} />
          </Route>
        </Route>

        {/* protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path='/package' element={<PackagePage />} />
          <Route path='/package/:id' element={<PackagePage />} />
          <Route path='/profile' element={<ProfilePage />} />
          <Route path='/user-bookings' element={<UserBookings />} />
          <Route path='/user-transactions' element={<UserTransactions />} />
          <Route path='/passandvisa-service' element={<PassAndVisaService />} />
          <Route path='/wishlist' element={<Wishlist />} />
          <Route path='/destinations-packages' element={<DestinationsPackages />} />
        </Route>



        <Route path='*' element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}

export default App;