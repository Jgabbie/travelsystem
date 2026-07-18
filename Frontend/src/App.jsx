import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import PublicRoute from "./routes/PublicRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import GuestsUsersRoute from "./routes/GuestsUsersRoute";
import EmployeeRoute from "./routes/EmployeeRoute";

import "antd/dist/reset.css";

import { BookingProvider } from "./context/BookingContext";
import { QuotationBookingProvider } from "./context/BookingQuotationContext";
import { ConfigProvider } from "antd";


//Layouts
const AdminLayout = lazy(() =>
  import("./components/layout/AdminLayout")
);

const EmployeeLayout = lazy(() =>
  import("./components/layout/EmployeeLayout")
);

const Layout = lazy(() =>
  import("./components/layout/Layout")
);


//Public and authentication pages
const ResetPassword = lazy(() =>
  import("./components/ResetPassword")
);

const NewPassword = lazy(() =>
  import("./components/NewPassword")
);

const VerifyEmail = lazy(() =>
  import("./pages/client/VerifyEmail")
);


//Guest and client pages
const LandingPage = lazy(() =>
  import("./pages/client/LandingPage")
);

const PackagePage = lazy(() =>
  import("./pages/client/PackagePage")
);

const ProfilePage = lazy(() =>
  import("./pages/client/ProfilePage")
);

const UserBookings = lazy(() =>
  import("./pages/client/UserBookings")
);

const UserTransactions = lazy(() =>
  import("./pages/client/UserTransactions")
);

const PassAndVisaService = lazy(() =>
  import("./pages/client/PassAndVisaService")
);

const Wishlist = lazy(() =>
  import("./pages/client/Wishlist")
);

const DestinationsPackages = lazy(() =>
  import("./pages/client/DestinationsPackages")
);

const UserBookingInvoice = lazy(() =>
  import("./pages/client/UserBookingInvoice")
);

const UserQuotationRequest = lazy(() =>
  import("./pages/client/UserQuotationRequest")
);

const UserPackageQuotation = lazy(() =>
  import("./pages/client/UserPackageQuotation")
);

const NewPassport = lazy(() =>
  import("./pages/client/NewPassport")
);

const RenewPassport = lazy(() =>
  import("./pages/client/RenewPassport")
);

const ApplyVisa = lazy(() =>
  import("./pages/client/ApplyVisa")
);

const BookingProcess = lazy(() =>
  import("./pages/client/BookingProcess")
);

const QuotationsPaymentProcess = lazy(() =>
  import("./pages/client/QuotationsPaymentProcess")
);

const QuotationBookingProcess = lazy(() =>
  import("./pages/client/QuotationBookingProcess")
);

const PaymentProcess = lazy(() =>
  import("./pages/client/PaymentProcess")
);

const SuccessfulBooking = lazy(() =>
  import("./pages/client/SuccessfulBooking")
);

const SuccessfulPaymentPassport = lazy(() =>
  import("./pages/client/SuccessfulPaymentPassport")
);

const SuccessfulPaymentVisa = lazy(() =>
  import("./pages/client/SuccessfulPaymentVisa")
);

const PackageDomesticQuotation = lazy(() =>
  import("./pages/client/PackageDomesticQuotation")
);

const PackageInternationalQuotation = lazy(() =>
  import("./pages/client/PackageInternationalQuotation")
);

const UserPreference = lazy(() =>
  import("./pages/client/newuser/UserPreference")
);

const FAQsPage = lazy(() =>
  import("./pages/client/FAQsPage")
);

const UserApplications = lazy(() =>
  import("./pages/client/UserApplications")
);

const PassportApplication = lazy(() =>
  import("./pages/client/PassportApplication")
);

const VisaApplication = lazy(() =>
  import("./pages/client/VisaApplication")
);


//Admin and employee pages
const Logging = lazy(() =>
  import("./pages/admin/Logging")
);

const Auditing = lazy(() =>
  import("./pages/admin/Auditing")
);

const BookingManagement = lazy(() =>
  import("./pages/admin/BookingManagement")
);

const UploadBookingInvoice = lazy(() =>
  import("./pages/admin/UploadBookingInvoice")
);

const UserManagement = lazy(() =>
  import("./pages/admin/UserManagement")
);

const PackageManagement = lazy(() =>
  import("./pages/admin/PackageManagement")
);

const AddPackage = lazy(() =>
  import("./pages/admin/AddPackage")
);

const AddTransaction = lazy(() =>
  import("./pages/admin/AddTransaction")
);

const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard")
);

const TransactionManagement = lazy(() =>
  import("./pages/admin/TransactionManagement")
);

const ReviewRatings = lazy(() =>
  import("./pages/admin/ReviewRatings")
);

const VisaApplications = lazy(() =>
  import("./pages/admin/VisaApplications")
);

const PassportApplications = lazy(() =>
  import("./pages/admin/PassportApplications")
);

const AdminProfile = lazy(() =>
  import("./pages/admin/AdminProfile")
);

const ViewPassportApplication = lazy(() =>
  import("./pages/admin/ViewPassportApplication")
);

const ViewVisaApplication = lazy(() =>
  import("./pages/admin/ViewVisaApplication")
);

const CancellationRequests = lazy(() =>
  import("./pages/admin/CancellationRequests")
);

const QuotationManagement = lazy(() =>
  import("./pages/admin/QuotationManagement")
);

const QuotationRequest = lazy(() =>
  import("./pages/admin/QuotationRequest")
);

const VisaServices = lazy(() =>
  import("./pages/admin/VisaServices")
);

const AddService = lazy(() =>
  import("./pages/admin/AddService")
);


//Loading fallback
const RouteLoadingFallback = () => (
  <div
    style={{
      width: "100%",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Montserrat, Arial, sans-serif",
      fontSize: "16px",
      color: "#305797",
      backgroundColor: "#ffffff",
    }}
  >
    Loading...
  </div>
);

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          fontFamily: "Montserrat, sans-serif",
        },
      }}
    >
      <QuotationBookingProvider>
        <BookingProvider>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/home" replace />}
              />

              {/* Guest and user-accessible routes */}
              <Route element={<GuestsUsersRoute />}>
                <Route element={<Layout />}>
                  <Route
                    path="/reset-password"
                    element={<ResetPassword />}
                  />

                  <Route
                    path="/home"
                    element={<LandingPage />}
                  />

                  <Route
                    path="/destinations-packages"
                    element={<DestinationsPackages />}
                  />

                  <Route
                    path="/passandvisa-service"
                    element={<PassAndVisaService />}
                  />

                  <Route
                    path="/apply-visa"
                    element={<ApplyVisa />}
                  />

                  <Route
                    path="/new-passport"
                    element={<NewPassport />}
                  />

                  <Route
                    path="/renew-passport"
                    element={<RenewPassport />}
                  />

                  <Route
                    path="/package"
                    element={<PackagePage />}
                  />

                  <Route
                    path="/general-faq"
                    element={<FAQsPage />}
                  />
                </Route>
              </Route>

              {/* Public-only routes */}
              <Route element={<PublicRoute />}>
                <Route
                  path="/reset-password"
                  element={<ResetPassword />}
                />

                <Route
                  path="/new-password"
                  element={<NewPassword />}
                />

                <Route
                  path="/verify-email"
                  element={<VerifyEmail />}
                />
              </Route>

              {/* Admin routes */}
              <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  <Route
                    index
                    element={<Navigate to="/dashboard" replace />}
                  />

                  <Route
                    path="dashboard"
                    element={<AdminDashboard />}
                  />

                  <Route
                    path="bookings"
                    element={<BookingManagement />}
                  />

                  <Route
                    path="bookings/invoice"
                    element={<UploadBookingInvoice />}
                  />

                  <Route
                    path="users"
                    element={<UserManagement />}
                  />

                  <Route
                    path="transactions"
                    element={<TransactionManagement />}
                  />

                  <Route
                    path="transactions/add"
                    element={<AddTransaction />}
                  />

                  <Route
                    path="packages"
                    element={<PackageManagement />}
                  />

                  <Route
                    path="packages/add"
                    element={<AddPackage />}
                  />

                  <Route
                    path="/packages/edit"
                    element={<AddPackage />}
                  />

                  <Route
                    path="ratings"
                    element={<ReviewRatings />}
                  />

                  <Route
                    path="visa-applications"
                    element={<VisaApplications />}
                  />

                  <Route
                    path="visa-services"
                    element={<VisaServices />}
                  />

                  <Route
                    path="visa-services/add"
                    element={<AddService />}
                  />

                  <Route
                    path="visa-services/edit"
                    element={<AddService />}
                  />

                  <Route
                    path="passport-applications"
                    element={<PassportApplications />}
                  />

                  <Route
                    path="passport-applications/view"
                    element={<ViewPassportApplication />}
                  />

                  <Route
                    path="visa-applications/view"
                    element={<ViewVisaApplication />}
                  />

                  <Route
                    path="cancellation-requests"
                    element={<CancellationRequests />}
                  />

                  <Route
                    path="adminprofile"
                    element={<AdminProfile />}
                  />

                  <Route
                    path="package-quotation"
                    element={<QuotationManagement />}
                  />

                  <Route
                    path="quotation"
                    element={<QuotationRequest />}
                  />

                  <Route
                    path="logging"
                    element={<Logging />}
                  />

                  <Route
                    path="auditing"
                    element={<Auditing />}
                  />
                </Route>
              </Route>

              {/* Employee routes */}
              <Route element={<EmployeeRoute />}>
                <Route
                  path="/employee"
                  element={<EmployeeLayout />}
                >
                  <Route
                    index
                    element={<Navigate to="dashboard" replace />}
                  />

                  <Route
                    path="dashboard"
                    element={<AdminDashboard />}
                  />

                  <Route
                    path="bookings"
                    element={<BookingManagement />}
                  />

                  <Route
                    path="bookings/invoice"
                    element={<UploadBookingInvoice />}
                  />

                  <Route
                    path="transactions"
                    element={<TransactionManagement />}
                  />

                  <Route
                    path="packages"
                    element={<PackageManagement />}
                  />

                  <Route
                    path="packages/add"
                    element={<AddPackage />}
                  />

                  <Route
                    path="packages/edit"
                    element={<AddPackage />}
                  />

                  <Route
                    path="ratings"
                    element={<ReviewRatings />}
                  />

                  <Route
                    path="package-quotation"
                    element={<QuotationManagement />}
                  />

                  <Route
                    path="quotation"
                    element={<QuotationRequest />}
                  />

                  <Route
                    path="adminprofile"
                    element={<AdminProfile />}
                  />

                  <Route
                    path="visa-services"
                    element={<VisaServices />}
                  />

                  <Route
                    path="visa-services/add"
                    element={<AddService />}
                  />

                  <Route
                    path="visa-services/edit"
                    element={<AddService />}
                  />

                  <Route
                    path="visa-applications"
                    element={<VisaApplications />}
                  />

                  <Route
                    path="passport-applications"
                    element={<PassportApplications />}
                  />

                  <Route
                    path="passport-applications/view"
                    element={<ViewPassportApplication />}
                  />

                  <Route
                    path="visa-applications/view"
                    element={<ViewVisaApplication />}
                  />

                  <Route
                    path="cancellation-requests"
                    element={<CancellationRequests />}
                  />
                </Route>
              </Route>

              {/* Authenticated user routes */}
              <Route element={<ProtectedRoute />}>
                <Route
                  path="/user-preferences"
                  element={<UserPreference />}
                />

                <Route
                  path="/booking-payment/success"
                  element={<SuccessfulBooking />}
                />

                <Route
                  path="/user-applications/success/passport"
                  element={<SuccessfulPaymentPassport />}
                />

                <Route
                  path="/user-applications/success/visa"
                  element={<SuccessfulPaymentVisa />}
                />

                <Route element={<Layout />}>
                  <Route
                    path="/profile"
                    element={<ProfilePage />}
                  />

                  <Route
                    path="/user-bookings"
                    element={<UserBookings />}
                  />

                  <Route
                    path="/user-transactions"
                    element={<UserTransactions />}
                  />

                  <Route
                    path="/wishlist"
                    element={<Wishlist />}
                  />

                  <Route
                    path="/user-package-quotation"
                    element={<UserPackageQuotation />}
                  />

                  <Route
                    path="/user-booking-invoice"
                    element={<UserBookingInvoice />}
                  />

                  <Route
                    path="/user-quotation-request"
                    element={<UserQuotationRequest />}
                  />

                  <Route
                    path="/booking-process"
                    element={<BookingProcess />}
                  />

                  <Route
                    path="/quotation-booking-process"
                    element={<QuotationBookingProcess />}
                  />

                  <Route
                    path="/quotation-payment-process"
                    element={<QuotationsPaymentProcess />}
                  />

                  <Route
                    path="/booking-payment"
                    element={<PaymentProcess />}
                  />

                  <Route
                    path="/domestic-quotation"
                    element={<PackageDomesticQuotation />}
                  />

                  <Route
                    path="/international-quotation"
                    element={<PackageInternationalQuotation />}
                  />

                  <Route
                    path="/user-applications"
                    element={<UserApplications />}
                  />

                  <Route
                    path="/passport-application"
                    element={<PassportApplication />}
                  />

                  <Route
                    path="/visa-application"
                    element={<VisaApplication />}
                  />
                </Route>
              </Route>

              <Route
                path="*"
                element={<Navigate to="/home" replace />}
              />
            </Routes>
          </Suspense>
        </BookingProvider>
      </QuotationBookingProvider>
    </ConfigProvider>
  );
}

export default App;

// import React from "react";
// import { Routes, Route, Navigate } from "react-router-dom";

// import PublicRoute from "./routes/PublicRoute";
// import ProtectedRoute from "./routes/ProtectedRoute";
// import AdminRoute from "./routes/AdminRoute";
// import GuestsUsersRoute from "./routes/GuestsUsersRoute";
// import EmployeeRoute from "./routes/EmployeeRoute";

// import "antd/dist/reset.css";

// import { BookingProvider } from "./context/BookingContext";
// import { QuotationBookingProvider } from "./context/BookingQuotationContext";

// // Layouts
// import AdminLayout from "./components/layout/AdminLayout";
// import EmployeeLayout from "./components/layout/EmployeeLayout";
// import Layout from "./components/layout/Layout";

// // Public and authentication pages
// import ResetPassword from "./components/ResetPassword";
// import NewPassword from "./components/NewPassword";
// import VerifyEmail from "./pages/client/VerifyEmail";

// // Guest and client pages
// import LandingPage from "./pages/client/LandingPage";
// import PackagePage from "./pages/client/PackagePage";
// import ProfilePage from "./pages/client/ProfilePage";
// import UserBookings from "./pages/client/UserBookings";
// import UserTransactions from "./pages/client/UserTransactions";
// import PassAndVisaService from "./pages/client/PassAndVisaService";
// import Wishlist from "./pages/client/Wishlist";
// import DestinationsPackages from "./pages/client/DestinationsPackages";
// import UserBookingInvoice from "./pages/client/UserBookingInvoice";
// import UserQuotationRequest from "./pages/client/UserQuotationRequest";
// import UserPackageQuotation from "./pages/client/UserPackageQuotation";
// import NewPassport from "./pages/client/NewPassport";
// import RenewPassport from "./pages/client/RenewPassport";
// import ApplyVisa from "./pages/client/ApplyVisa";
// import BookingProcess from "./pages/client/BookingProcess";
// import QuotationsPaymentProcess from "./pages/client/QuotationsPaymentProcess";
// import QuotationBookingProcess from "./pages/client/QuotationBookingProcess";
// import PaymentProcess from "./pages/client/PaymentProcess";
// import SuccessfulBooking from "./pages/client/SuccessfulBooking";
// import SuccessfulPaymentPassport from "./pages/client/SuccessfulPaymentPassport";
// import SuccessfulPaymentVisa from "./pages/client/SuccessfulPaymentVisa";
// import PackageDomesticQuotation from "./pages/client/PackageDomesticQuotation";
// import PackageInternationalQuotation from "./pages/client/PackageInternationalQuotation";
// import UserPreference from "./pages/client/newuser/UserPreference";
// import FAQsPage from "./pages/client/FAQsPage";
// import UserApplications from "./pages/client/UserApplications";
// import PassportApplication from "./pages/client/PassportApplication";
// import VisaApplication from "./pages/client/VisaApplication";

// // Admin and employee pages
// import Logging from "./pages/admin/Logging";
// import Auditing from "./pages/admin/Auditing";
// import BookingManagement from "./pages/admin/BookingManagement";
// import UploadBookingInvoice from "./pages/admin/UploadBookingInvoice";
// import UserManagement from "./pages/admin/UserManagement";
// import PackageManagement from "./pages/admin/PackageManagement";
// import AddPackage from "./pages/admin/AddPackage";
// import AddTransaction from "./pages/admin/AddTransaction";
// import AdminDashboard from "./pages/admin/AdminDashboard";
// import TransactionManagement from "./pages/admin/TransactionManagement";
// import ReviewRatings from "./pages/admin/ReviewRatings";
// import VisaApplications from "./pages/admin/VisaApplications";
// import PassportApplications from "./pages/admin/PassportApplications";
// import AdminProfile from "./pages/admin/AdminProfile";
// import ViewPassportApplication from "./pages/admin/ViewPassportApplication";
// import ViewVisaApplication from "./pages/admin/ViewVisaApplication";
// import CancellationRequests from "./pages/admin/CancellationRequests";
// import QuotationManagement from "./pages/admin/QuotationManagement";
// import QuotationRequest from "./pages/admin/QuotationRequest";
// import VisaServices from "./pages/admin/VisaServices";
// import AddService from "./pages/admin/AddService";

// function App() {
//   return (
//     <QuotationBookingProvider>
//       <BookingProvider>
//         <Routes>
//           <Route
//             path="/"
//             element={<Navigate to="/home" replace />}
//           />

//           {/* Guest and user-accessible routes */}
//           <Route element={<GuestsUsersRoute />}>
//             <Route element={<Layout />}>
//               <Route
//                 path="/reset-password"
//                 element={<ResetPassword />}
//               />

//               <Route
//                 path="/home"
//                 element={<LandingPage />}
//               />

//               <Route
//                 path="/destinations-packages"
//                 element={<DestinationsPackages />}
//               />

//               <Route
//                 path="/passandvisa-service"
//                 element={<PassAndVisaService />}
//               />

//               <Route
//                 path="/apply-visa"
//                 element={<ApplyVisa />}
//               />

//               <Route
//                 path="/new-passport"
//                 element={<NewPassport />}
//               />

//               <Route
//                 path="/renew-passport"
//                 element={<RenewPassport />}
//               />

//               <Route
//                 path="/package"
//                 element={<PackagePage />}
//               />

//               <Route
//                 path="/general-faq"
//                 element={<FAQsPage />}
//               />
//             </Route>
//           </Route>

//           {/* Public-only routes */}
//           <Route element={<PublicRoute />}>
//             <Route
//               path="/reset-password"
//               element={<ResetPassword />}
//             />

//             <Route
//               path="/new-password"
//               element={<NewPassword />}
//             />

//             <Route
//               path="/verify-email"
//               element={<VerifyEmail />}
//             />
//           </Route>

//           {/* Admin routes */}
//           <Route element={<AdminRoute />}>
//             <Route element={<AdminLayout />}>
//               <Route
//                 index
//                 element={<Navigate to="/dashboard" replace />}
//               />

//               <Route
//                 path="dashboard"
//                 element={<AdminDashboard />}
//               />

//               <Route
//                 path="bookings"
//                 element={<BookingManagement />}
//               />

//               <Route
//                 path="bookings/invoice"
//                 element={<UploadBookingInvoice />}
//               />

//               <Route
//                 path="users"
//                 element={<UserManagement />}
//               />

//               <Route
//                 path="transactions"
//                 element={<TransactionManagement />}
//               />

//               <Route
//                 path="transactions/add"
//                 element={<AddTransaction />}
//               />

//               <Route
//                 path="packages"
//                 element={<PackageManagement />}
//               />

//               <Route
//                 path="packages/add"
//                 element={<AddPackage />}
//               />

//               <Route
//                 path="/packages/edit"
//                 element={<AddPackage />}
//               />

//               <Route
//                 path="ratings"
//                 element={<ReviewRatings />}
//               />

//               <Route
//                 path="visa-applications"
//                 element={<VisaApplications />}
//               />

//               <Route
//                 path="visa-services"
//                 element={<VisaServices />}
//               />

//               <Route
//                 path="visa-services/add"
//                 element={<AddService />}
//               />

//               <Route
//                 path="visa-services/edit"
//                 element={<AddService />}
//               />

//               <Route
//                 path="passport-applications"
//                 element={<PassportApplications />}
//               />

//               <Route
//                 path="passport-applications/view"
//                 element={<ViewPassportApplication />}
//               />

//               <Route
//                 path="visa-applications/view"
//                 element={<ViewVisaApplication />}
//               />

//               <Route
//                 path="cancellation-requests"
//                 element={<CancellationRequests />}
//               />

//               <Route
//                 path="adminprofile"
//                 element={<AdminProfile />}
//               />

//               <Route
//                 path="package-quotation"
//                 element={<QuotationManagement />}
//               />

//               <Route
//                 path="quotation"
//                 element={<QuotationRequest />}
//               />

//               <Route
//                 path="logging"
//                 element={<Logging />}
//               />

//               <Route
//                 path="auditing"
//                 element={<Auditing />}
//               />
//             </Route>
//           </Route>

//           {/* Employee routes */}
//           <Route element={<EmployeeRoute />}>
//             <Route
//               path="/employee"
//               element={<EmployeeLayout />}
//             >
//               <Route
//                 index
//                 element={<Navigate to="dashboard" replace />}
//               />

//               <Route
//                 path="dashboard"
//                 element={<AdminDashboard />}
//               />

//               <Route
//                 path="bookings"
//                 element={<BookingManagement />}
//               />

//               <Route
//                 path="bookings/invoice"
//                 element={<UploadBookingInvoice />}
//               />

//               <Route
//                 path="transactions"
//                 element={<TransactionManagement />}
//               />

//               <Route
//                 path="packages"
//                 element={<PackageManagement />}
//               />

//               <Route
//                 path="packages/add"
//                 element={<AddPackage />}
//               />

//               <Route
//                 path="packages/edit"
//                 element={<AddPackage />}
//               />

//               <Route
//                 path="ratings"
//                 element={<ReviewRatings />}
//               />

//               <Route
//                 path="package-quotation"
//                 element={<QuotationManagement />}
//               />

//               <Route
//                 path="quotation"
//                 element={<QuotationRequest />}
//               />

//               <Route
//                 path="adminprofile"
//                 element={<AdminProfile />}
//               />

//               <Route
//                 path="visa-services"
//                 element={<VisaServices />}
//               />

//               <Route
//                 path="visa-services/add"
//                 element={<AddService />}
//               />

//               <Route
//                 path="visa-services/edit"
//                 element={<AddService />}
//               />

//               <Route
//                 path="visa-applications"
//                 element={<VisaApplications />}
//               />

//               <Route
//                 path="passport-applications"
//                 element={<PassportApplications />}
//               />

//               <Route
//                 path="passport-applications/view"
//                 element={<ViewPassportApplication />}
//               />

//               <Route
//                 path="visa-applications/view"
//                 element={<ViewVisaApplication />}
//               />

//               <Route
//                 path="cancellation-requests"
//                 element={<CancellationRequests />}
//               />
//             </Route>
//           </Route>

//           {/* Authenticated user routes */}
//           <Route element={<ProtectedRoute />}>
//             <Route
//               path="/user-preferences"
//               element={<UserPreference />}
//             />

//             <Route
//               path="/booking-payment/success"
//               element={<SuccessfulBooking />}
//             />

//             <Route
//               path="/user-applications/success/passport"
//               element={<SuccessfulPaymentPassport />}
//             />

//             <Route
//               path="/user-applications/success/visa"
//               element={<SuccessfulPaymentVisa />}
//             />

//             <Route element={<Layout />}>
//               <Route
//                 path="/profile"
//                 element={<ProfilePage />}
//               />

//               <Route
//                 path="/user-bookings"
//                 element={<UserBookings />}
//               />

//               <Route
//                 path="/user-transactions"
//                 element={<UserTransactions />}
//               />

//               <Route
//                 path="/wishlist"
//                 element={<Wishlist />}
//               />

//               <Route
//                 path="/user-package-quotation"
//                 element={<UserPackageQuotation />}
//               />

//               <Route
//                 path="/user-booking-invoice"
//                 element={<UserBookingInvoice />}
//               />

//               <Route
//                 path="/user-quotation-request"
//                 element={<UserQuotationRequest />}
//               />

//               <Route
//                 path="/booking-process"
//                 element={<BookingProcess />}
//               />

//               <Route
//                 path="/quotation-booking-process"
//                 element={<QuotationBookingProcess />}
//               />

//               <Route
//                 path="/quotation-payment-process"
//                 element={<QuotationsPaymentProcess />}
//               />

//               <Route
//                 path="/booking-payment"
//                 element={<PaymentProcess />}
//               />

//               <Route
//                 path="/domestic-quotation"
//                 element={<PackageDomesticQuotation />}
//               />

//               <Route
//                 path="/international-quotation"
//                 element={<PackageInternationalQuotation />}
//               />

//               <Route
//                 path="/user-applications"
//                 element={<UserApplications />}
//               />

//               <Route
//                 path="/passport-application"
//                 element={<PassportApplication />}
//               />

//               <Route
//                 path="/visa-application"
//                 element={<VisaApplication />}
//               />
//             </Route>
//           </Route>

//           <Route
//             path="*"
//             element={<Navigate to="/home" replace />}
//           />
//         </Routes>
//       </BookingProvider>
//     </QuotationBookingProvider>
//   );
// }

// export default App;