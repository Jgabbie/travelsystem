import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import SignupPage from './components/SignupPage';
import LandingPage from './pages/LandingPage';
import PackagePage from './pages/PackagePage';
import EmailVerify from './components/EmailVerify';
import ResetPassword from './components/ResetPassword';
import ResetPasswordOTP from './components/ResetPasswordOTP';
import SetNewPassword from './components/SetNewPassword';
import ProtectedRoute from './components/ProtectedRoute';
import Logging from './components/Logging';
import AdminLayout from "./components/AdminLayout";
import BookingManagement from "./pages/BookingManagement";
import UserManagement from "./pages/UserManagement";
import PackageManagement from "./pages/PackageManagement";
import AddPackage from "./pages/AddPackage";
import "antd/dist/reset.css";


function App() {
  const [isVerified, setIsVerified] = useState(false)
  const [isAuth, setIsAuth] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  //CheckAuth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/auth/is-auth', {
          method: "POST",
          credentials: "include"
        })
        // if (response.status === 403) {
        //   setIsAuth(true)
        //   setIsVerified(false)
        // } else
        if (response.ok) {
          setIsAuth(true)
        } else {
          setIsAuth(false)
        }
      } catch (err) {
        setIsAuth(false)
        const errorMsg = err.response?.data?.message || "Verification failed"
        console.error("Error: ", errorMsg)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  if (isLoading) return <div> Loading ...</div>

  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path='/login' element={<LoginPage />} />
          <Route path='/signup' element={<SignupPage />} />

          <Route path='/email-verify' element={<EmailVerify />} />
          <Route path='/reset-password' element={<ResetPassword />} />
          <Route path='/reset-password-otp' element={<ResetPasswordOTP />} />
          <Route path='/set-newpassword' element={<SetNewPassword />} />
          <Route path='/home' element={<LandingPage />} />
          <Route path='/package' element={<PackagePage />} />

          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/bookings" />} />
            <Route path="/bookings" element={<BookingManagement />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/packages" element={<PackageManagement />} />
            <Route path="/packages/add" element={<AddPackage />} />
          </Route>


          <Route element={<ProtectedRoute getIsAuthenticated={isAuth} />}>
            {/* ADMIN ROUTING SIR */}

          </Route>

          <Route path='*' element={<Navigate to="/login" replace />} />
          <Route path='/logging' element={<Logging />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
