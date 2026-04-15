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
import ApplyVisa from "./pages/client/ApplyVisa";
import BookingProcess from "./pages/client/BookingProcess";
import QuotationsPaymentProcess from "./pages/client/QuotationsPaymentProcess";
import QuotationBookingProcess from "./pages/client/QuotationBookingProcess";
import PaymentProcess from "./pages/client/PaymentProcess";
import SuccessfulBooking from "./pages/client/SuccessfulBooking";
import SuccessfulPaymentPassport from "./pages/client/SuccessfulPaymentPassport";
import SuccessfulPaymentVisa from "./pages/client/SuccessfulPaymentVisa";
import PackageDomesticQuotation from "./pages/client/PackageDomesticQuotation";
import PackageInternationalQuotation from "./pages/client/PackageInternationalQuotation";
import UserPreference from "./pages/client/newuser/UserPreference";
import FAQsPage from "./pages/client/FAQsPage";

import UserApplications from "./pages/client/UserApplications";
import PassportApplication from "./pages/client/PassportApplication";
import VisaApplication from "./pages/client/VisaApplication";

import Logging from './pages/admin/Logging';
import Auditing from './pages/admin/Auditing';

import BookingManagement from "./pages/admin/BookingManagement";
import UploadBookingInvoice from "./pages/admin/UploadBookingInvoice";
import UserManagement from "./pages/admin/UserManagement";
import PackageManagement from "./pages/admin/PackageManagement";
import AddPackage from "./pages/admin/AddPackage";
import AddPackageDomestic from "./pages/admin/AddPackageDomestic";
import AddPackageInternational from "./pages/admin/AddPackageInternational";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TransactionManagement from "./pages/admin/TransactionManagement";
import ReviewRatings from "./pages/admin/ReviewRatings";
import VisaApplications from "./pages/admin/VisaApplications";
import PassportApplications from "./pages/admin/PassportApplications";
import AdminProfile from "./pages/admin/AdminProfile";
import ViewPassportApplication from "./pages/admin/ViewPassportApplication";
import ViewVisaApplication from "./pages/admin/ViewVisaApplication";
import CancellationRequests from "./pages/admin/CancellationRequests";
import QuotationManagement from "./pages/admin/QuotationManagement";
import QuotationRequest from "./pages/admin/QuotationRequest";
import VisaServices from "./pages/admin/VisaServices";
import AddService from "./pages/admin/AddService";

import PublicRoute from "./routes/PublicRoute";
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from "./routes/AdminRoute";
import GuestsUsersRoute from "./routes/GuestsUsersRoute";
import EmployeeRoute from "./routes/EmployeeRoute";

import AdminLayout from "./components/layout/AdminLayout";
import EmployeeLayout from "./components/layout/EmployeeLayout";
import Layout from "./components/layout/Layout";

import "antd/dist/reset.css";
import { BookingProvider } from "./context/BookingContext";
import { QuotationBookingProvider } from "./context/BookingQuotationContext";


function App() {
  return (
    <div>
      <QuotationBookingProvider>
        <BookingProvider>
          <Routes>

            <Route path='/' element={<Navigate to="/home" replace />} />

            <Route element={<GuestsUsersRoute />}>
              <Route element={<Layout />}>
                <Route path='/home' element={<LandingPage />} />
                <Route path='/destinations-packages' element={<DestinationsPackages />} />
                <Route path='/passandvisa-service' element={<PassAndVisaService />} />
                <Route path='/apply-visa' element={<ApplyVisa />} />
                <Route path='/new-passport' element={<NewPassport />} />
                <Route path='/renew-passport' element={<RenewPassport />} />
                <Route path='/package' element={<PackagePage />} />
                <Route path='/package/:id' element={<PackagePage />} />
                <Route path='/general-faq' element={<FAQsPage />} />
              </Route>
            </Route>


            <Route element={<PublicRoute />}>
              <Route path='/reset-password' element={<ResetPassword />} />
            </Route>


            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="/dashboard" />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="bookings" element={<BookingManagement />} />
                <Route path="bookings/invoice" element={<UploadBookingInvoice />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="transactions" element={<TransactionManagement />} />
                <Route path="packages" element={<PackageManagement />} />
                <Route path="packages/add" element={<AddPackage />} />
                <Route path="packages/add/domestic" element={<AddPackageDomestic />} />
                <Route path="packages/add/international" element={<AddPackageInternational />} />
                <Route path="/packages/edit/:id" element={<AddPackage />} />
                <Route path="/packages/edit/domestic/:id" element={<AddPackageDomestic />} />
                <Route path="/packages/edit/international/:id" element={<AddPackageInternational />} />
                <Route path="ratings" element={<ReviewRatings />} />
                <Route path="visa-applications" element={<VisaApplications />} />
                <Route path="visa-services" element={<VisaServices />} />
                <Route path="visa-services/add" element={<AddService />} />
                <Route path="visa-services/edit/:id" element={<AddService />} />
                <Route path="passport-applications" element={<PassportApplications />} />
                <Route path="passport-applications/view/:id" element={<ViewPassportApplication />} />
                <Route path="visa-applications/view/:id" element={<ViewVisaApplication />} />
                <Route path="cancellation-requests" element={<CancellationRequests />} />
                <Route path="adminprofile" element={<AdminProfile />} />
                <Route path="package-quotation" element={<QuotationManagement />} />
                <Route path="quotation" element={<QuotationRequest />} />

                <Route path="logging" element={<Logging />} />
                <Route path="auditing" element={<Auditing />} />
              </Route>
            </Route>


            <Route element={<EmployeeRoute />}>
              <Route path="/employee" element={<EmployeeLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="bookings" element={<BookingManagement />} />
                <Route path="bookings/:id/invoice" element={<UploadBookingInvoice />} />
                <Route path="transactions" element={<TransactionManagement />} />
                <Route path="packages" element={<PackageManagement />} />
                <Route path="packages/add" element={<AddPackage />} />
                <Route path="packages/edit/:id" element={<AddPackage />} />
                <Route path="packages/add/domestic" element={<AddPackageDomestic />} />
                <Route path="packages/add/international" element={<AddPackageInternational />} />
                <Route path="packages/edit/domestic/:id" element={<AddPackageDomestic />} />
                <Route path="packages/edit/international/:id" element={<AddPackageInternational />} />
                <Route path="ratings" element={<ReviewRatings />} />
                <Route path="package-quotation" element={<QuotationManagement />} />
                <Route path="quotation" element={<QuotationRequest />} />
                <Route path="adminprofile" element={<AdminProfile />} />
                <Route path="visa-services" element={<VisaServices />} />
                <Route path="visa-services/add" element={<AddService />} />
                <Route path="visa-services/edit/:id" element={<AddService />} />
                <Route path="visa-applications" element={<VisaApplications />} />
                <Route path="passport-applications" element={<PassportApplications />} />
                <Route path="passport-applications/view/:id" element={<ViewPassportApplication />} />
                <Route path="visa-applications/view/:id" element={<ViewVisaApplication />} />
                <Route path="cancellation-requests" element={<CancellationRequests />} />
              </Route>
            </Route>


            <Route element={<ProtectedRoute />}>
              <Route path="/user-preferences" element={<UserPreference />} />
              <Route path='/booking-payment/success' element={<SuccessfulBooking />} />
              <Route path="/user-applications/success/passport" element={<SuccessfulPaymentPassport />} />
              <Route path="/user-applications/success/visa" element={<SuccessfulPaymentVisa />} />
              <Route element={<Layout />}>
                <Route path='/profile' element={<ProfilePage />} />
                <Route path='/user-bookings' element={<UserBookings />} />
                <Route path='/user-transactions' element={<UserTransactions />} />
                <Route path='/wishlist' element={<Wishlist />} />
                <Route path='/user-package-quotation' element={<UserPackageQuotation />} />
                <Route path='/user-booking-invoice' element={<UserBookingInvoice />} />
                <Route path='/user-quotation-request' element={<UserQuotationRequest />} />
                <Route path='/booking-process' element={<BookingProcess />} />
                <Route path='/quotation-booking-process' element={<QuotationBookingProcess />} />
                <Route path='/quotation-payment-process' element={<QuotationsPaymentProcess />} />
                <Route path='/booking-payment' element={<PaymentProcess />} />
                <Route path="/domestic-quotation" element={<PackageDomesticQuotation />} />
                <Route path="/international-quotation" element={<PackageInternationalQuotation />} />
                <Route path="/user-applications" element={<UserApplications />} />
                <Route path="/passport-application" element={<PassportApplication />} />
                <Route path="/visa-application" element={<VisaApplication />} />
              </Route>
            </Route>

            <Route path='*' element={<Navigate to="/home" replace />} />
          </Routes>
        </BookingProvider>
      </QuotationBookingProvider>
    </div >
  );
}

export default App;