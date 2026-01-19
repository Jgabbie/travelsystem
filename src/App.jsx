import logo from './logo.svg';
import { Routes, Route, BrowserRouter } from "react-router-dom";
import './App.css';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import LandingPage from './components/LandingPage';
import EmailVerify from './components/EmailVerify';
import ResetPassword from './components/ResetPassword';
import ResetPasswordOTP from './components/ResetPasswordOTP';
import SetNewPassword from './components/SetNewPassword';


function App() {
  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path='/home' element={<LandingPage />} />
          <Route path='/login' element={<LoginPage />} />
          <Route path='/signup' element={<SignupPage />} />
          <Route path='/email-verify' element={<EmailVerify />} />
          <Route path='/reset-password' element={<ResetPassword />} />
          <Route path='/reset-password-otp' element={<ResetPasswordOTP />} />
          <Route path='/set-newpassword' element={<SetNewPassword />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
