import { Routes, Route, Navigate } from "react-router-dom";

import ResetPassword from './components/ResetPassword';
import LandingPage from "./pages/client/LandingPage";

import PackagePage from './pages/client/PackagePage';
import ProfilePage from "./pages/client/ProfilePage";
import UserBookings from "./pages/client/UserBookings";
import UserTransactions from "./pages/client/UserTransactions";
import PassAndVisaService from "./pages/client/PassAndVisaService";
import Wishlist from "./pages/client/Wishlist";
import DestinationsPackages from "./pages/client/DestinationsPackages";
import UserBookingInvoice from "./pages/client/UserBookingInvoice";
import UserQuotationRequest from "./pages/client/UserQuotationRequest";
import UserPackageQuotation from "./pages/client/UserPackageQuotation";
import NewPassport from "./pages/client/NewPassport";
import RenewPassport from "./pages/client/RenewPassport";

import Logging from './pages/admin/Logging';
import Auditing from './pages/admin/Auditing';

import AdminLayout from "./components/AdminLayout";
import BookingManagement from "./pages/admin/BookingManagement";
import UploadBookingInvoice from "./pages/admin/UploadBookingInvoice";
import UserManagement from "./pages/admin/UserManagement";
import PackageManagement from "./pages/admin/PackageManagement";
import AddPackage from "./pages/admin/AddPackage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TransactionManagement from "./pages/admin/TransactionManagement";
import ReviewRatings from "./pages/admin/ReviewRatings";
import VisaApplications from "./pages/admin/VisaApplications";
import PassportApplications from "./pages/admin/PassportApplications";
import AdminProfile from "./pages/admin/AdminProfile";
import CancellationRequests from "./pages/admin/CancellationRequests";
import QuotationManagement from "./pages/admin/QuotationManagement";
import QuotationRequest from "./pages/admin/QuotationRequest";
import VisaServices from "./pages/admin/VisaServices";

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
          <Route path='/destinations-packages' element={<DestinationsPackages />} />
          <Route path='/package' element={<PackagePage />} />
          <Route path='/package/:id' element={<PackagePage />} />
        </Route>

        {/* public routes */}
        <Route element={<PublicRoute />}>
          <Route path='/reset-password' element={<ResetPassword />} />
        </Route>

        {/* admin routes */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="bookings" element={<BookingManagement />} />
            <Route path="bookings/:id/invoice" element={<UploadBookingInvoice />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="transactions" element={<TransactionManagement />} />
            <Route path="packages" element={<PackageManagement />} />
            <Route path="packages/add" element={<AddPackage />} />
            <Route path="/packages/edit/:id" element={<AddPackage />} />
            <Route path="ratings" element={<ReviewRatings />} />
            <Route path="visa-applications" element={<VisaApplications />} />
            <Route path="visa-services" element={<VisaServices />} />
            <Route path="passport-applications" element={<PassportApplications />} />
            <Route path="cancellation-requests" element={<CancellationRequests />} />
            <Route path="adminprofile" element={<AdminProfile />} />
            <Route path="package-quotation" element={<QuotationManagement />} />
            <Route path="quotation/:id" element={<QuotationRequest />} />
            {/* logging and auditing routes */}
            <Route path="logging" element={<Logging />} />
            <Route path="auditing" element={<Auditing />} />
          </Route>
        </Route>

        {/* protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path='/profile' element={<ProfilePage />} />
          <Route path='/user-bookings' element={<UserBookings />} />
          <Route path='/user-transactions' element={<UserTransactions />} />
          <Route path='/passandvisa-service' element={<PassAndVisaService />} />
          <Route path='/wishlist' element={<Wishlist />} />
          <Route path='/user-package-quotation' element={<UserPackageQuotation />} />
          <Route path='/user-booking-invoice' element={<UserBookingInvoice />} />
          <Route path='/user-quotation-request/:id' element={<UserQuotationRequest />} />
          <Route path='/new-passport' element={<NewPassport />} />
          <Route path='/renew-passport' element={<RenewPassport />} />
        </Route>

        <Route path='*' element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}

export default App;